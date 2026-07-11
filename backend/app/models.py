"""
Database schema.

Entities
--------
User        -> a person using the app (we seed one default "logged in" user,
               but the schema supports many, and hosts/participants both
               reference it via foreign keys).
Meeting     -> an instant or scheduled meeting. Owned by a host (User).
Participant -> a join record: links a Meeting to a User (or a guest name)
               with per-session state (muted, video on, host flag, joined/left
               timestamps). This is what lets us show "who attended" history
               and drive live in-room state.

Relationships
-------------
User (1) ---- (N) Meeting        [host_id]
Meeting (1) ---- (N) Participant [meeting_id]
User (1) ---- (N) Participant    [user_id, nullable for guests]
"""
import enum
import secrets
import string
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship

from .database import Base


class MeetingType(str, enum.Enum):
    INSTANT = "instant"
    SCHEDULED = "scheduled"


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    ENDED = "ended"


def generate_meeting_code() -> str:
    """Zoom-style 'xxx-xxxx-xxxx' numeric meeting ID."""
    digits = "".join(secrets.choice(string.digits) for _ in range(10))
    return f"{digits[0:3]}-{digits[3:7]}-{digits[7:10]}{secrets.choice(string.digits)}"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    avatar_color = Column(String(20), default="#2D8CFF")  # zoom blue default
    created_at = Column(DateTime, default=datetime.utcnow)

    meetings_hosted = relationship("Meeting", back_populates="host")
    participations = relationship("Participant", back_populates="user")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    meeting_code = Column(String(20), unique=True, index=True,
                           default=generate_meeting_code, nullable=False)
    title = Column(String(255), nullable=False, default="New Meeting")
    description = Column(Text, nullable=True)

    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    type = Column(Enum(MeetingType), default=MeetingType.INSTANT, nullable=False)
    status = Column(Enum(MeetingStatus), default=MeetingStatus.SCHEDULED, nullable=False)

    scheduled_time = Column(DateTime, nullable=True)  # only for scheduled meetings
    duration_minutes = Column(Integer, default=30)

    password = Column(String(20), nullable=True)  # optional meeting passcode

    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    host = relationship("User", back_populates="meetings_hosted")
    participants = relationship(
        "Participant", back_populates="meeting", cascade="all, delete-orphan"
    )

    @property
    def invite_link(self) -> str:
        return f"/meeting/{self.meeting_code}"


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = guest

    display_name = Column(String(120), nullable=False)
    is_host = Column(Boolean, default=False)
    is_muted = Column(Boolean, default=False)
    is_video_on = Column(Boolean, default=True)

    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)

    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User", back_populates="participations")
