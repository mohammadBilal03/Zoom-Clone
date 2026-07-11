from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_serializer

from .models import MeetingType, MeetingStatus


def _utc_iso(value: Optional[datetime]) -> Optional[str]:
    """All datetimes are stored naive-but-UTC (see crud.py); this marks them
    explicitly as UTC on the way out so JS `new Date(...)` on the frontend
    doesn't reinterpret them as local time (which was silently shifting
    every scheduled time by the server/client's UTC offset)."""
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


# ---------- User ----------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    avatar_color: str


# ---------- Participant ----------
class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    display_name: str
    is_host: bool
    is_muted: bool
    is_video_on: bool
    joined_at: datetime
    left_at: Optional[datetime] = None

    @field_serializer("joined_at", "left_at")
    def serialize_dt(self, value):
        return _utc_iso(value)


class JoinMeetingRequest(BaseModel):
    display_name: str
    password: Optional[str] = None


class ParticipantStateUpdate(BaseModel):
    is_muted: Optional[bool] = None
    is_video_on: Optional[bool] = None


# ---------- Meeting ----------
class InstantMeetingRequest(BaseModel):
    title: Optional[str] = "Instant Meeting"


class ScheduleMeetingRequest(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_time: datetime
    duration_minutes: int = 30
    password: Optional[str] = None


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    meeting_code: str
    title: str
    description: Optional[str] = None
    type: MeetingType
    status: MeetingStatus
    scheduled_time: Optional[datetime] = None
    duration_minutes: int
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    host: UserOut
    invite_link: str

    @field_serializer("type", "status")
    def serialize_enum(self, value):
        return value.value if hasattr(value, "value") else value

    @field_serializer("scheduled_time", "created_at", "started_at", "ended_at")
    def serialize_dt(self, value):
        return _utc_iso(value)


class MeetingDetailOut(MeetingOut):
    participants: List[ParticipantOut] = []


class MeetingJoinedOut(BaseModel):
    meeting: MeetingOut
    participant: ParticipantOut
