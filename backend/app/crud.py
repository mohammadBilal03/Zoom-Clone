from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from . import models, schemas


def _to_naive_utc(value: datetime) -> datetime:
    """Normalize any incoming datetime (naive or tz-aware) to naive-UTC,
    which is the convention every datetime in this DB follows (SQLite has
    no native timezone-aware type). A tz-aware input is converted; a naive
    input is assumed to already be UTC (e.g. from datetime.utcnow())."""
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def get_default_user(db: Session) -> models.User:
    """We assume a single logged-in user for this assignment (no auth)."""
    user = db.query(models.User).first()
    if not user:
        user = models.User(name="Mohammad Bilal", email="bill@example.com", avatar_color="#2D8CFF")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def create_instant_meeting(db: Session, host: models.User, title: str) -> models.Meeting:
    meeting = models.Meeting(
        title=title or "Instant Meeting",
        host_id=host.id,
        type=models.MeetingType.INSTANT,
        status=models.MeetingStatus.ACTIVE,
        started_at=datetime.utcnow(),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def create_scheduled_meeting(db: Session, host: models.User, data: schemas.ScheduleMeetingRequest) -> models.Meeting:
    meeting = models.Meeting(
        title=data.title,
        description=data.description,
        host_id=host.id,
        type=models.MeetingType.SCHEDULED,
        status=models.MeetingStatus.SCHEDULED,
        scheduled_time=_to_naive_utc(data.scheduled_time),
        duration_minutes=data.duration_minutes,
        password=data.password,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def get_meeting_by_code(db: Session, code: str) -> models.Meeting | None:
    return db.query(models.Meeting).filter(models.Meeting.meeting_code == code).first()


def get_upcoming_meetings(db: Session, host_id: int):
    now = datetime.utcnow()
    return (
        db.query(models.Meeting)
        .filter(
            models.Meeting.host_id == host_id,
            models.Meeting.type == models.MeetingType.SCHEDULED,
            models.Meeting.status == models.MeetingStatus.SCHEDULED,
            models.Meeting.scheduled_time >= now,
        )
        .order_by(models.Meeting.scheduled_time.asc())
        .all()
    )


def get_recent_meetings(db: Session, host_id: int, limit: int = 10):
    now = datetime.utcnow()
    return (
        db.query(models.Meeting)
        .filter(
            models.Meeting.host_id == host_id,
            or_(
                # Ended, or currently in progress - covers both instant and
                # scheduled meetings uniformly once someone has actually
                # joined them. (Previously "type == INSTANT" unconditionally
                # matched the moment an instant meeting was created, before
                # it was ever joined or finished; and an ACTIVE scheduled
                # meeting matched neither this list nor "upcoming", so it
                # vanished from the dashboard entirely until someone
                # explicitly clicked "End".)
                models.Meeting.status == models.MeetingStatus.ENDED,
                models.Meeting.status == models.MeetingStatus.ACTIVE,
                # Scheduled but never started, and its time has passed:
                # treat as history rather than leaving it stuck "upcoming".
                and_(
                    models.Meeting.type == models.MeetingType.SCHEDULED,
                    models.Meeting.status == models.MeetingStatus.SCHEDULED,
                    models.Meeting.scheduled_time < now,
                ),
            ),
        )
        .order_by(models.Meeting.created_at.desc())
        .limit(limit)
        .all()
    )


def add_participant(db: Session, meeting: models.Meeting, display_name: str,
                     user_id: int | None, is_host: bool) -> models.Participant:
    participant = models.Participant(
        meeting_id=meeting.id,
        user_id=user_id,
        display_name=display_name,
        is_host=is_host,
    )
    db.add(participant)
    if meeting.status == models.MeetingStatus.SCHEDULED:
        meeting.status = models.MeetingStatus.ACTIVE
        meeting.started_at = datetime.utcnow()
    db.commit()
    db.refresh(participant)
    return participant


def get_active_participant(db: Session, meeting: models.Meeting, participant_id: int) -> models.Participant | None:
    return next(
        (p for p in meeting.participants if p.id == participant_id and p.left_at is None),
        None,
    )


def remove_participant(db: Session, participant_id: int):
    p = db.query(models.Participant).get(participant_id)
    if p:
        p.left_at = datetime.utcnow()
        db.commit()
    return p


def set_participant_state(db: Session, participant_id: int, is_muted: bool | None = None, is_video_on: bool | None = None):
    p = db.query(models.Participant).get(participant_id)
    if p:
        if is_muted is not None:
            p.is_muted = is_muted
        if is_video_on is not None:
            p.is_video_on = is_video_on
        db.commit()
        db.refresh(p)
    return p


def end_meeting(db: Session, meeting: models.Meeting):
    meeting.status = models.MeetingStatus.ENDED
    meeting.ended_at = datetime.utcnow()
    for p in meeting.participants:
        if p.left_at is None:
            p.left_at = datetime.utcnow()
    db.commit()
    db.refresh(meeting)
    return meeting
