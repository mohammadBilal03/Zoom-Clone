"""
Minimal WebRTC signaling relay + live room event bus, built on FastAPI
WebSockets. This is NOT a media server: video/audio streams flow
peer-to-peer directly between browsers (mesh topology). This channel only
relays the small JSON messages needed to set up those peer connections
(SDP offers/answers, ICE candidates) and broadcasts room-state events like
"mute all" or "participant removed".

Message shape (client <-> server), all JSON:
{
  "type": "join" | "offer" | "answer" | "ice-candidate" | "leave"
          | "chat" | "media-state" ,
  "to": <participantId>,       // required for offer/answer/ice-candidate
  "from": <participantId>,     // set by server on relay
  ...payload
}
"""
import json
from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..database import SessionLocal
from .. import crud

router = APIRouter()


class RoomManager:
    def __init__(self):
        # meeting_code -> { participant_id(str) -> WebSocket }
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, code: str, participant_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(code, {})[participant_id] = ws

    def disconnect(self, code: str, participant_id: str):
        room = self.rooms.get(code)
        if room and participant_id in room:
            del room[participant_id]
        if room is not None and not room:
            self.rooms.pop(code, None)

    def peers(self, code: str, exclude: str = None):
        room = self.rooms.get(code, {})
        return {pid: ws for pid, ws in room.items() if pid != exclude}

    async def send_to(self, code: str, participant_id: str, message: dict):
        ws = self.rooms.get(code, {}).get(participant_id)
        if ws:
            await ws.send_json(message)

    async def broadcast(self, code: str, message: dict, exclude: str = None):
        for pid, ws in self.peers(code, exclude).items():
            await ws.send_json(message)


manager = RoomManager()


async def broadcast_room_event(code: str, message: dict):
    """Called from REST endpoints (e.g. mute-all, remove participant) to
    push a live event to everyone currently connected to the room."""
    await manager.broadcast(code, message)


async def send_room_event_to(code: str, participant_id: str, message: dict):
    """Push an event to one specific participant's socket (e.g. a host
    forcing that one person to mute)."""
    await manager.send_to(code, participant_id, message)


@router.websocket("/ws/signaling/{code}/{participant_id}")
async def signaling_endpoint(websocket: WebSocket, code: str, participant_id: str):
    await manager.connect(code, participant_id, websocket)

    # Tell existing peers a new participant joined, and tell the new
    # participant who is already in the room so it can initiate offers.
    existing_ids = list(manager.peers(code, exclude=participant_id).keys())
    await websocket.send_json({"type": "room-state", "peers": existing_ids})
    await manager.broadcast(code, {"type": "peer-joined", "from": participant_id}, exclude=participant_id)

    try:
        while True:
            data = await websocket.receive_json()
            data["from"] = participant_id
            target = data.get("to")
            if target:
                await manager.send_to(code, target, data)
            else:
                await manager.broadcast(code, data, exclude=participant_id)
    except WebSocketDisconnect:
        manager.disconnect(code, participant_id)
        await manager.broadcast(code, {"type": "peer-left", "from": participant_id})
        # The browser is gone (back button, tab close, refresh, network
        # drop, etc.) - mark them as left in the DB too, not just the live
        # WS room. Without this, their old participant row lingers forever
        # ("left_at" stays null), so rejoining later creates a duplicate
        # "ghost" entry that never goes away.
        try:
            pid = int(participant_id)
        except ValueError:
            pid = None
        if pid is not None:
            db = SessionLocal()
            try:
                crud.remove_participant(db, pid)
            finally:
                db.close()
