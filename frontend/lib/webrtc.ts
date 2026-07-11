"use client";

import { WS_URL } from "./api";

/**
 * Mesh WebRTC manager.
 *
 * Every participant connects to every other participant directly
 * (RTCPeerConnection per peer). A lightweight WebSocket channel on the
 * FastAPI backend (`/ws/signaling/{code}/{participantId}`) relays the
 * SDP offers/answers and ICE candidates needed to establish those
 * connections - it never sees the actual audio/video.
 *
 * This is intentionally simple (fine for small meetings) rather than an
 * SFU, which would need a dedicated media server.
 */

export type RemoteStreamHandler = (peerId: string, stream: MediaStream | null) => void;
export type PeerListHandler = (peerIds: string[]) => void;
export type RoomEventHandler = (event: any) => void;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export class MeetingConnection {
  private ws: WebSocket | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private meetingCode: string;
  private participantId: string;

  onRemoteStream: RemoteStreamHandler = () => {};
  onPeerList: PeerListHandler = () => {};
  onRoomEvent: RoomEventHandler = () => {};
  onConnected: () => void = () => {};

  constructor(meetingCode: string, participantId: string) {
    this.meetingCode = meetingCode;
    this.participantId = participantId;
  }

  async start(localStream: MediaStream | null) {
    this.localStream = localStream;
    const url = `${WS_URL}/ws/signaling/${this.meetingCode}/${this.participantId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => this.onConnected();

    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "room-state":
          this.onPeerList(data.peers);
          for (const peerId of data.peers) {
            await this.callPeer(peerId);
          }
          break;
        case "peer-joined":
          this.onRoomEvent(data);
          break;
        case "peer-left":
          this.closePeer(data.from);
          this.onRoomEvent(data);
          break;
        case "offer":
          await this.handleOffer(data.from, data.sdp);
          break;
        case "answer":
          await this.handleAnswer(data.from, data.sdp);
          break;
        case "ice-candidate":
          await this.handleIceCandidate(data.from, data.candidate);
          break;
        default:
          this.onRoomEvent(data);
      }
    };
  }

  replaceLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    for (const pc of this.peers.values()) {
      const senders = pc.getSenders();
      const videoTrack = stream?.getVideoTracks()[0] || null;
      const audioTrack = stream?.getAudioTracks()[0] || null;
      const videoSender = senders.find((s) => s.track?.kind === "video");
      const audioSender = senders.find((s) => s.track?.kind === "audio");
      if (videoSender && videoTrack) videoSender.replaceTrack(videoTrack);
      if (audioSender && audioTrack) audioSender.replaceTrack(audioTrack);
    }
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.send({ type: "ice-candidate", to: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      this.onRemoteStream(peerId, e.streams[0] || null);
    };

    pc.onconnectionstatechange = () => {
      if (["closed", "failed", "disconnected"].includes(pc.connectionState)) {
        this.onRemoteStream(peerId, null);
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  private async callPeer(peerId: string) {
    const pc = this.createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.send({ type: "offer", to: peerId, sdp: offer });
  }

  private async handleOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peers.get(peerId) || this.createPeerConnection(peerId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.send({ type: "answer", to: peerId, sdp: answer });
  }

  private async handleAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peers.get(peerId);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(peerId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Failed to add ICE candidate", err);
      }
    }
  }

  private closePeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.onRemoteStream(peerId, null);
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    for (const peerId of Array.from(this.peers.keys())) {
      this.closePeer(peerId);
    }
    this.ws?.close();
    this.ws = null;
  }
}

export async function getLocalMedia(video: boolean, audio: boolean): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio });
  } catch (err) {
    console.error("Could not access camera/microphone", err);
    return null;
  }
}
