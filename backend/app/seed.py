"""Seed the database with a default user and sample meetings."""
from datetime import datetime, timedelta

from .database import SessionLocal, engine, Base
from . import models


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(models.User).first()
        if not user:
            user = models.User(name="Mohammad Bilal", email="bill@example.com", avatar_color="#2D8CFF")
            db.add(user)
            db.commit()
            db.refresh(user)

        other_users = [
            models.User(name="Priya Sharma", email="priya@example.com", avatar_color="#8930F2"),
            models.User(name="Marco Diaz", email="marco@example.com", avatar_color="#00A5A8"),
        ]
        for u in other_users:
            if not db.query(models.User).filter_by(email=u.email).first():
                db.add(u)
        db.commit()

        if db.query(models.Meeting).count() > 0:
            print("Database already seeded.")
            return

        now = datetime.utcnow()

        upcoming = [
            models.Meeting(
                title="Weekly Product Sync",
                description="Review sprint progress and blockers.",
                host_id=user.id,
                type=models.MeetingType.SCHEDULED,
                status=models.MeetingStatus.SCHEDULED,
                scheduled_time=now + timedelta(hours=3),
                duration_minutes=30,
            ),
            models.Meeting(
                title="Design Review: Onboarding Flow",
                description="Walk through new user onboarding mockups.",
                host_id=user.id,
                type=models.MeetingType.SCHEDULED,
                status=models.MeetingStatus.SCHEDULED,
                scheduled_time=now + timedelta(days=1, hours=1),
                duration_minutes=45,
            ),
            models.Meeting(
                title="Q3 Planning Kickoff",
                description="Align on quarterly goals across teams.",
                host_id=user.id,
                type=models.MeetingType.SCHEDULED,
                status=models.MeetingStatus.SCHEDULED,
                scheduled_time=now + timedelta(days=3, hours=5),
                duration_minutes=60,
                password="1234",
            ),
        ]

        recent = [
            models.Meeting(
                title="1:1 with Priya",
                host_id=user.id,
                type=models.MeetingType.INSTANT,
                status=models.MeetingStatus.ENDED,
                created_at=now - timedelta(days=1),
                started_at=now - timedelta(days=1),
                ended_at=now - timedelta(days=1) + timedelta(minutes=25),
            ),
            models.Meeting(
                title="All Hands - July",
                host_id=user.id,
                type=models.MeetingType.SCHEDULED,
                status=models.MeetingStatus.ENDED,
                created_at=now - timedelta(days=4),
                started_at=now - timedelta(days=4),
                ended_at=now - timedelta(days=4) + timedelta(minutes=50),
            ),
        ]

        db.add_all(upcoming + recent)
        db.commit()
        print(f"Seeded {len(upcoming)} upcoming and {len(recent)} recent meetings for {user.name}.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
