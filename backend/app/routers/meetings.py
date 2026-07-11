from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas, models
from ..database import get_db
from .signaling import broadcast_room_event, send_room_event_to

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

EARLY_JOIN_GRACE = timedelta(minutes=5)


@router.post("/instant", response_model=schemas.MeetingOut)
def create_instant_meeting(payload: schemas.InstantMeetingRequest, db: Session = Depends(get_db)):
    host = crud.get_default_user(db)
    meeting = crud.create_instant_meeting(db, host, payload.title)
    return meeting


@router.post("/schedule", response_model=schemas.MeetingOut)
def schedule_meeting(payload: schemas.ScheduleMeetingRequest, db: Session = Depends(get_db)):
    host = crud.get_default_user(db)
    meeting = crud.create_scheduled_meeting(db, host, payload)
    return meeting


@router.get("/upcoming", response_model=list[schemas.MeetingOut])
def upcoming_meetings(db: Session = Depends(get_db)):
    host = crud.get_default_user(db)
    return crud.get_upcoming_meetings(db, host.id)


@router.get("/recent", response_model=list[schemas.MeetingOut])
def recent_meetings(db: Session = Depends(get_db)):
    host = crud.get_default_user(db)
    return crud.get_recent_meetings(db, host.id)


@router.get("/{code}", response_model=schemas.MeetingDetailOut)
def get_meeting(code: str, db: Session = Depends(get_db)):
    meeting = crud.get_meeting_by_code(db, code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found. Check the Meeting ID and try again.")
    return meeting


@router.post("/{code}/join", response_model=schemas.MeetingJoinedOut)
def join_meeting(code: str, payload: schemas.JoinMeetingRequest, db: Session = Depends(get_db)):
    meeting = crud.get_meeting_by_code(db, code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found. Check the Meeting ID and try again.")
    if meeting.status == models.MeetingStatus.ENDED:
        raise HTTPException(status_code=410, detail="This meeting has ended.")
    if meeting.password and payload.password != meeting.password:
        raise HTTPException(status_code=403, detail="Incorrect meeting passcode.")

    # A scheduled meeting can't be started/joined before its time (with a
    # small grace window, same as real Zoom lets a host start a few minutes
    # early). This is what was letting meetings be "attended" long before
    # their scheduled time and then show up in Recent as if they'd happened.
    if (
        meeting.type == models.MeetingType.SCHEDULED
        and meeting.status == models.MeetingStatus.SCHEDULED
        and meeting.scheduled_time is not None
        and datetime.utcnow() < meeting.scheduled_time - EARLY_JOIN_GRACE
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "This meeting hasn't started yet. It's scheduled for "
                f"{meeting.scheduled_time.strftime('%b %d, %Y at %H:%M UTC')}."
            ),
        )

    host = crud.get_default_user(db)
    # First participant of an instant/just-started meeting created by the default
    # user is treated as host; everyone else joins as a regular participant.
    is_host = meeting.host_id == host.id and not any(
        p.is_host and p.left_at is None for p in meeting.participants
    )
    participant = crud.add_participant(
        db, meeting, payload.display_name, user_id=host.id if is_host else None, is_host=is_host
    )
    return schemas.MeetingJoinedOut(meeting=meeting, participant=participant)


@router.post("/{code}/end", response_model=schemas.MeetingOut)
async def end_meeting(code: str, requester_id: int, db: Session = Depends(get_db)):
    meeting = crud.get_meeting_by_code(db, code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    requester = crud.get_active_participant(db, meeting, requester_id)
    if not requester or not requester.is_host:
        raise HTTPException(status_code=403, detail="Only the host can end this meeting for everyone.")
    meeting = crud.end_meeting(db, meeting)
    await broadcast_room_event(code, {"type": "meeting-ended"})
    return meeting


@router.delete("/{code}/participants/{participant_id}")
async def remove_participant(code: str, participant_id: int, requester_id: int, db: Session = Depends(get_db)):
    meeting = crud.get_meeting_by_code(db, code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    requester = crud.get_active_participant(db, meeting, requester_id)
    is_self_leave = requester_id == participant_id
    if not requester or not (is_self_leave or requester.is_host):
        raise HTTPException(status_code=403, detail="Only the host can remove other participants.")
    participant = crud.remove_participant(db, participant_id)
    await broadcast_room_event(code, {"type": "participant-removed", "participantId": participant_id})
    return {"ok": True, "participant_id": participant.id if participant else participant_id}


@router.post("/{code}/mute-all")
async def mute_all(code: str, requester_id: int, db: Session = Depends(get_db)):
    meeting = crud.get_meeting_by_code(db, code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    requester = crud.get_active_participant(db, meeting, requester_id)
    if not requester or not requester.is_host:
        raise HTTPException(status_code=403, detail="Only the host can mute all participants.")
    for p in meeting.participants:
        if p.left_at is None and not p.is_host:
            p.is_muted = True
    db.commit()
    await broadcast_room_event(code, {"type": "mute-all"})
    return {"ok": True}


@router.post("/{code}/participants/{participant_id}/mute")
async def mute_participant(code: str, participant_id: int, requester_id: int, db: Session = Depends(get_db)):
    """Host forcibly mutes one participant, regardless of their current
    state (this is what lets a host re-mute someone who unmuted themselves)."""
    meeting = crud.get_meeting_by_code(db, code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    requester = crud.get_active_participant(db, meeting, requester_id)
    if not requester or not requester.is_host:
        raise HTTPException(status_code=403, detail="Only the host can mute a participant.")
    target = crud.get_active_participant(db, meeting, participant_id)
    if not target:
        raise HTTPException(status_code=404, detail="Participant not found in this meeting.")
    crud.set_participant_state(db, participant_id, is_muted=True)
    # Push a live command to that participant's browser to actually mute
    # their mic, not just flip a flag in the DB.
    await send_room_event_to(code, str(participant_id), {"type": "force-mute"})
    return {"ok": True}


@router.post("/{code}/participants/{participant_id}/video-off")
async def turn_off_participant_video(code: str, participant_id: int, requester_id: int, db: Session = Depends(get_db)):
    """Host forcibly turns off one participant's camera."""
    meeting = crud.get_meeting_by_code(db, code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    requester = crud.get_active_participant(db, meeting, requester_id)
    if not requester or not requester.is_host:
        raise HTTPException(status_code=403, detail="Only the host can turn off a participant's video.")
    target = crud.get_active_participant(db, meeting, participant_id)
    if not target:
        raise HTTPException(status_code=404, detail="Participant not found in this meeting.")
    crud.set_participant_state(db, participant_id, is_video_on=False)
    await send_room_event_to(code, str(participant_id), {"type": "force-video-off"})
    return {"ok": True}


@router.patch("/{code}/participants/{participant_id}/state")
def report_participant_state(
    code: str, participant_id: int, payload: schemas.ParticipantStateUpdate,
    requester_id: int, db: Session = Depends(get_db)
):
    """Lets a participant persist their own mic/video toggle so the roster
    (e.g. the host's participants panel) reflects reality even between
    live WebSocket updates. Only the participant themselves may report
    their own state."""
    meeting = crud.get_meeting_by_code(db, code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    if requester_id != participant_id:
        raise HTTPException(status_code=403, detail="You can only update your own state.")
    p = crud.set_participant_state(db, participant_id, payload.is_muted, payload.is_video_on)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found.")
    return {"ok": True}
