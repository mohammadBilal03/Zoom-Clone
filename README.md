# Zoom Clone — Video Conferencing Web App

A functional clone of the Zoom web app: instant meetings, scheduled meetings,
join-by-ID/link, a Zoom-styled dashboard, and a real peer-to-peer video
meeting room (camera/mic, mute-all, remove participant, in-meeting chat).

## Tech Stack

| Layer     | Choice                                                   |
|-----------|-----------------------------------------------------------|
| Frontend  | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend   | Python, FastAPI, SQLAlchemy, native FastAPI WebSockets   |
| Database  | SQLite                                                   |
| Video     | WebRTC (browser-native), mesh peer-to-peer, FastAPI WebSocket as the signaling relay |

No external video SDK is used — camera/mic capture, peer connections, and
media transport are all standard `RTCPeerConnection`/`getUserMedia` APIs. The
backend only relays small JSON signaling messages (SDP offers/answers, ICE
candidates); it never touches actual audio/video bytes.

## Project Structure

```
zoom-clone/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app, CORS, startup seeding
│   │   ├── database.py        SQLAlchemy engine/session (SQLite)
│   │   ├── models.py          ORM models: User, Meeting, Participant
│   │   ├── schemas.py         Pydantic request/response models
│   │   ├── crud.py            DB query helpers
│   │   ├── seed.py            Seeds a default user + sample meetings
│   │   └── routers/
│   │       ├── users.py       GET /api/users/me
│   │       ├── meetings.py    Meeting CRUD, join/end, host controls
│   │       └── signaling.py   WebSocket relay for WebRTC + live room events
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx                 Dashboard
    │   ├── join/page.tsx            Join-by-ID page
    │   ├── schedule/page.tsx        Schedule meeting page
    │   └── meeting/[code]/page.tsx  Meeting room (lobby + live call)
    ├── components/                  Navbar, modals, VideoTile, controls, panels...
    └── lib/
        ├── api.ts                   REST client
        └── webrtc.ts                 WebRTC connection manager
```

## Database Schema

Three tables, designed around "who can join what, and what happened when":

**`users`** — `id, name, email, avatar_color, created_at`
No auth in this build (see Assumptions), so one row is seeded and treated as
"the logged-in user" everywhere a host is needed.

**`meetings`** — `id, meeting_code (unique), title, description, host_id (FK → users), type (instant/scheduled), status (scheduled/active/ended), scheduled_time, duration_minutes, password, created_at, started_at, ended_at`
`meeting_code` is the Zoom-style `123-4567-8901` ID used for joining.
`type` distinguishes instant vs. scheduled meetings; `status` drives the
Upcoming vs. Recent dashboard sections.

**`participants`** — `id, meeting_id (FK → meetings), user_id (FK → users, nullable), display_name, is_host, is_muted, is_video_on, joined_at, left_at`
A row per join, not per user — this is what lets the room show live
mute/video state and gives you an attendance history (`left_at`) for free.
`user_id` is nullable because guests can join with just a display name.

Relationships: `User 1—N Meeting` (host), `Meeting 1—N Participant`,
`User 1—N Participant` (nullable, for guests).

## How the video call actually works

1. Joining a meeting hits `POST /api/meetings/{code}/join`, which creates a
   `Participant` row and returns its id.
2. The browser opens `ws://.../ws/signaling/{code}/{participantId}`.
3. The server tells the new peer who else is already in the room
   (`room-state`), and tells existing peers someone joined (`peer-joined`).
4. Each browser creates one `RTCPeerConnection` per other participant,
   exchanges SDP offer/answer and ICE candidates through the WebSocket, and
   then streams audio/video **directly** peer-to-peer (mesh topology — fine
   for small meetings; a real SFU would be the next step for larger calls).
5. Host actions (mute all, remove participant, end meeting) are REST calls
   that also broadcast an event over the same WebSocket so connected
   clients react immediately, with a 6s poll as a fallback safety net.

## Setup Instructions

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

The SQLite file (`zoom_clone.db`) and sample data are created automatically
on first run — no manual migration step needed. API docs: `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # defaults already point at localhost:8000
npm run dev
```

Visit `http://localhost:3000`.

Run backend and frontend in two terminals; both are required for the app to
work (the frontend is a pure SPA client of the FastAPI backend).

## Assumptions

- **No authentication.** Per the assignment brief, a single default user
  ("Mohammad Bilal") is treated as always logged in. The schema supports real
  multi-user auth (`users` table, hashed-password-ready) — adding it would
  mean adding a login endpoint + JWT/session middleware and swapping
  `get_default_user()` for a real "current user" dependency.
- **Host = meeting creator.** The first person from the default user's
  session to join a given meeting is flagged `is_host`; everyone else joins
  as a regular participant. This is a simplification of "whoever scheduled
  it is the host."
- **Mesh WebRTC**, not an SFU/MCU — appropriate for small meetings (roughly
  up to 6-8 participants) as required by this assignment; a production Zoom
  clone would route media through a dedicated media server for larger calls.
- **No recordings/screen share/breakout rooms** — explicitly out of scope
  ("Recordings" and "Share" are visible but disabled in the UI to show
  where they'd go).
- **Passcode is optional** and checked server-side on join; it's not
  encrypted at rest since it's a demo feature, not a security boundary.

## Bonus Features Implemented

- Fully responsive layout (dashboard, lobby, and meeting grid all adapt
  down to mobile widths).
- Host controls: mute all participants, remove a specific participant
  (with a live "you were removed" notice for the removed user).
- In-meeting chat (relayed over the same WebSocket).
- Pre-join lobby with camera/mic preview and toggles before entering the
  call.
- Shareable invite links (`/meeting/{code}`) that validate the meeting
  exists and handle "meeting has ended" / "not found" states.
