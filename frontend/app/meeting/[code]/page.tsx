"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle, Grid3x3 } from "lucide-react";
import {
  api,
  MeetingOut,
  ParticipantOut,
} from "@/lib/api";
import { MeetingConnection, getLocalMedia } from "@/lib/webrtc";
import PreJoinLobby from "@/components/PreJoinLobby";
import VideoTile from "@/components/VideoTile";
import MeetingControls from "@/components/MeetingControls";
import ParticipantsPanel from "@/components/ParticipantsPanel";
import ChatPanel, { ChatMessage } from "@/components/ChatPanel";

type MediaState = { micOn: boolean; videoOn: boolean };

export default function MeetingRoomPage() {
  const { code } = useParams<{ code: string }>();
  const params = useSearchParams();
  const router = useRouter();

  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [meeting, setMeeting] = useState<MeetingOut | null>(null);
  const [participants, setParticipants] = useState<ParticipantOut[]>([]);

  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [myParticipant, setMyParticipant] = useState<ParticipantOut | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteMediaState, setRemoteMediaState] = useState<Record<string, MediaState>>({});

  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [banner, setBanner] = useState<string>("");
  const [layout, setLayout] = useState<"grid" | "speaker">("grid");

  const connRef = useRef<MeetingConnection | null>(null);
  const micOnRef = useRef(true);
  const videoOnRef = useRef(true);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);
  useEffect(() => {
    videoOnRef.current = videoOn;
  }, [videoOn]);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // 1. Load + validate the meeting on mount
  useEffect(() => {
    (async () => {
      try {
        const m = await api.getMeeting(code);
        setMeeting(m);
        setParticipants(m.participants);
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoadingMeeting(false);
      }
    })();
  }, [code]);

  const refreshRoster = useCallback(async () => {
    try {
      const m = await api.getMeeting(code);
      setMeeting(m);
      setParticipants(m.participants);
      if (m.status === "ended") {
        setBanner("The host has ended this meeting.");
        setTimeout(() => router.push("/"), 2500);
      }
    } catch {
      // ignore transient errors
    }
  }, [code, router]);

  // Fallback polling to keep the roster fresh
  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(refreshRoster, 6000);
    return () => clearInterval(interval);
  }, [joined, refreshRoster]);

  const handleJoin = async (
    name: string,
    password: string,
    stream: MediaStream | null,
    initialMic: boolean,
    initialVideo: boolean
  ) => {
    setJoining(true);
    setJoinError("");
    try {
      const result = await api.joinMeeting(code, name, password || undefined);
      setMyParticipant(result.participant);
      setMeeting(result.meeting);
      setLocalStream(stream);
      setMicOn(initialMic);
      setVideoOn(initialVideo);

      const conn = new MeetingConnection(code, String(result.participant.id));
      connRef.current = conn;

      conn.onRemoteStream = (peerId, remoteStream) => {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          if (remoteStream) next[peerId] = remoteStream;
          else delete next[peerId];
          return next;
        });
      };

      conn.onRoomEvent = (event) => {
        if (event.type === "peer-joined" || event.type === "peer-left") {
          refreshRoster();
        }
        if (event.type === "media-state") {
          setRemoteMediaState((prev) => ({
            ...prev,
            [event.from]: { micOn: event.micOn, videoOn: event.videoOn },
          }));
        }
        if (event.type === "chat") {
          setMessages((prev) => [
            ...prev,
            { from: event.from, senderName: event.senderName, text: event.text, ts: event.ts },
          ]);
        }
        if (event.type === "mute-all" || event.type === "force-mute") {
          setMicOn(false);
          const s = localStreamRef.current;
          s?.getAudioTracks().forEach((t) => (t.enabled = false));
          connRef.current?.send({ type: "media-state", micOn: false, videoOn: videoOnRef.current });
          api.reportOwnState(code, result.participant.id, { is_muted: true }).catch(() => {});
        }
        if (event.type === "force-video-off") {
          setVideoOn(false);
          const s = localStreamRef.current;
          s?.getVideoTracks().forEach((t) => (t.enabled = false));
          connRef.current?.send({ type: "media-state", micOn: micOnRef.current, videoOn: false });
        }
        if (event.type === "participant-removed") {
          if (event.participantId === result.participant.id) {
            setBanner("You were removed from the meeting by the host.");
            cleanup();
            setTimeout(() => router.push("/"), 2000);
          } else {
            refreshRoster();
          }
        }
        if (event.type === "meeting-ended") {
          setBanner("The host has ended this meeting.");
          cleanup();
          setTimeout(() => router.push("/"), 2000);
        }
      };

      await conn.start(stream);
      setJoined(true);
      refreshRoster();
    } catch (e: any) {
      setJoinError(e.message || "Could not join this meeting.");
    } finally {
      setJoining(false);
    }
  };

  const cleanup = () => {
    connRef.current?.disconnect();
    localStream?.getTracks().forEach((t) => t.stop());
  };

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = async () => {
    if (!localStream) {
      // no media device was granted at join time; try to acquire now
      const stream = await getLocalMedia(videoOn, true);
      if (stream) {
        setLocalStream(stream);
        setMicOn(true);
        connRef.current?.replaceLocalStream(stream);
        connRef.current?.send({ type: "media-state", micOn: true, videoOn });
        if (myParticipant) api.reportOwnState(code, myParticipant.id, { is_muted: false }).catch(() => {});
      }
      return;
    }
    const next = !micOn;
    setMicOn(next);
    localStream.getAudioTracks().forEach((t) => (t.enabled = next));
    connRef.current?.send({ type: "media-state", micOn: next, videoOn });
    if (myParticipant) api.reportOwnState(code, myParticipant.id, { is_muted: !next }).catch(() => {});
  };

  const toggleVideo = async () => {
    if (!localStream) {
      // no media device was granted at join time; try to acquire now
      const stream = await getLocalMedia(true, micOn);
      if (stream) {
        setLocalStream(stream);
        setVideoOn(true);
        connRef.current?.replaceLocalStream(stream);
        connRef.current?.send({ type: "media-state", micOn, videoOn: true });
        if (myParticipant) api.reportOwnState(code, myParticipant.id, { is_video_on: true }).catch(() => {});
      }
      return;
    }
    const next = !videoOn;
    setVideoOn(next);
    localStream.getVideoTracks().forEach((t) => (t.enabled = next));
    connRef.current?.send({ type: "media-state", micOn, videoOn: next });
    if (myParticipant) api.reportOwnState(code, myParticipant.id, { is_video_on: next }).catch(() => {});
  };

  const sendChat = (text: string) => {
    const msg: ChatMessage = {
      from: String(myParticipant?.id),
      senderName: myParticipant?.display_name || "You",
      text,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    connRef.current?.send({ type: "chat", senderName: msg.senderName, text, ts: msg.ts });
  };

  const handleLeaveOrEnd = async () => {
    try {
      if (myParticipant?.is_host) {
        await api.endMeeting(code, myParticipant.id);
      } else if (myParticipant) {
        await api.removeParticipant(code, myParticipant.id, myParticipant.id);
      }
    } catch (e) {
      // Even if this fails, we still want to disconnect the user's own
      // browser below - but log it so a real failure isn't invisible.
      console.error("Failed to end/leave meeting on the server:", e);
    }
    cleanup();
    router.push("/");
  };

  const handleRemove = async (participantId: number) => {
    if (!myParticipant) return;
    try {
      await api.removeParticipant(code, participantId, myParticipant.id);
      refreshRoster();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMuteAll = async () => {
    if (!myParticipant) return;
    try {
      await api.muteAll(code, myParticipant.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMuteParticipant = async (participantId: number) => {
    if (!myParticipant) return;
    try {
      await api.muteParticipant(code, participantId, myParticipant.id);
      refreshRoster();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTurnOffParticipantVideo = async (participantId: number) => {
    if (!myParticipant) return;
    try {
      await api.turnOffParticipantVideo(code, participantId, myParticipant.id);
      refreshRoster();
    } catch (e) {
      console.error(e);
    }
  };

  // ---------- render states ----------

  if (loadingMeeting) {
    return (
      <div className="min-h-screen bg-zoom-navy flex items-center justify-center">
        <Loader2 className="text-white animate-spin" size={32} />
      </div>
    );
  }

  if (notFound || !meeting) {
    return (
      <div className="min-h-screen bg-zoom-navy flex items-center justify-center px-4">
        <div className="bg-zoom-panel rounded-xl p-8 max-w-sm w-full text-center">
          <AlertTriangle className="text-yellow-400 mx-auto mb-3" size={32} />
          <h1 className="text-white font-semibold mb-1">Meeting Not Found</h1>
          <p className="text-white/50 text-sm mb-5">
            We couldn&apos;t find a meeting with ID{" "}
            <span className="text-white/80">{code}</span>. Check the Meeting ID and try again.
          </p>
          <button onClick={() => router.push("/")} className="btn-primary w-full justify-center">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <PreJoinLobby
        meeting={meeting}
        defaultName={params.get("name") || ""}
        requiresPassword={false}
        onJoin={handleJoin}
        joining={joining}
        error={joinError}
      />
    );
  }

  const activeParticipants = participants.filter((p) => !p.left_at);
  const tileCount = Math.max(activeParticipants.length, 1);

  // Merge in live WebSocket state so the participants panel reflects reality
  // immediately, rather than only whatever the last 6s poll happened to see.
  const liveParticipants: ParticipantOut[] = participants.map((p) => {
    if (p.id === myParticipant?.id) {
      return { ...p, is_muted: !micOn, is_video_on: videoOn };
    }
    const media = remoteMediaState[String(p.id)];
    if (media) {
      return { ...p, is_muted: !media.micOn, is_video_on: media.videoOn };
    }
    return p;
  });

  return (
    <div className="h-screen bg-zoom-navy flex flex-col">
      {banner && (
        <div className="bg-yellow-500 text-black text-sm text-center py-1.5 font-medium">
          {banner}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white/70 text-sm">
              <span className="font-medium text-white">{meeting.title}</span>
              <span className="mx-2">·</span>
              {meeting.meeting_code}
            </div>
            <button
              onClick={() => setLayout(layout === "grid" ? "speaker" : "grid")}
              className="text-white/60 hover:text-white flex items-center gap-1.5 text-xs"
              title="Toggle layout"
            >
              <Grid3x3 size={14} />
              {layout === "grid" ? "Grid" : "Speaker"}
            </button>
          </div>

          <div
            className={`flex-1 grid gap-3 auto-rows-fr overflow-y-auto ${gridClass(tileCount)}`}
          >
            <VideoTile
              stream={localStream}
              name={myParticipant?.display_name || "You"}
              muted
              isLocal
              isMuted={!micOn}
              isVideoOn={videoOn}
              isHost={myParticipant?.is_host}
              avatarColor="#2D8CFF"
            />
            {liveParticipants
              .filter((p) => !p.left_at && p.id !== myParticipant?.id)
              .map((p) => (
                <VideoTile
                  key={p.id}
                  stream={remoteStreams[String(p.id)] || null}
                  name={p.display_name}
                  isMuted={p.is_muted}
                  isVideoOn={p.is_video_on}
                  isHost={p.is_host}
                  avatarColor="#8930F2"
                />
              ))}
          </div>
        </div>

        {showParticipants && (
          <ParticipantsPanel
            participants={liveParticipants}
            currentParticipantId={myParticipant?.id || null}
            isHost={!!myParticipant?.is_host}
            onClose={() => setShowParticipants(false)}
            onMuteAll={handleMuteAll}
            onRemove={handleRemove}
            onMuteParticipant={handleMuteParticipant}
            onTurnOffParticipantVideo={handleTurnOffParticipantVideo}
          />
        )}
        {showChat && (
          <ChatPanel messages={messages} onSend={sendChat} onClose={() => setShowChat(false)} />
        )}
      </div>

      <MeetingControls
        micOn={micOn}
        videoOn={videoOn}
        onToggleMic={toggleMic}
        onToggleVideo={toggleVideo}
        onToggleParticipants={() => {
          setShowParticipants((v) => !v);
          setShowChat(false);
        }}
        onToggleChat={() => {
          setShowChat((v) => !v);
          setShowParticipants(false);
        }}
        onLeave={handleLeaveOrEnd}
        participantCount={activeParticipants.length}
        isHost={!!myParticipant?.is_host}
      />
    </div>
  );
}

function gridClass(count: number) {
  if (count <= 1) return "grid-cols-1 place-items-center max-w-3xl mx-auto w-full";
  if (count === 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-3";
  return "grid-cols-4";
}
