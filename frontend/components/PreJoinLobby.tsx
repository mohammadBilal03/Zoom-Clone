"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Loader2, Clock } from "lucide-react";
import { MeetingOut } from "@/lib/api";

const EARLY_JOIN_GRACE_MS = 5 * 60 * 1000;

function getStartsInMs(meeting: MeetingOut): number {
  if (meeting.status !== "scheduled" || !meeting.scheduled_time) return 0;
  const startsAt = new Date(meeting.scheduled_time).getTime() - EARLY_JOIN_GRACE_MS;
  return Math.max(0, startsAt - Date.now());
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function PreJoinLobby({
  meeting,
  defaultName,
  requiresPassword,
  onJoin,
  joining,
  error,
}: {
  meeting: MeetingOut;
  defaultName: string;
  requiresPassword: boolean;
  onJoin: (name: string, password: string, stream: MediaStream | null, micOn: boolean, videoOn: boolean) => void;
  joining: boolean;
  error: string;
}) {
  const [name, setName] = useState(defaultName);
  const [password, setPassword] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [startsInMs, setStartsInMs] = useState(() => getStartsInMs(meeting));
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (startsInMs <= 0) return;
    const interval = setInterval(() => setStartsInMs(getStartsInMs(meeting)), 1000);
    return () => clearInterval(interval);
  }, [meeting, startsInMs]);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!active) return;
        setStream(s);
      })
      .catch(() => {
        // camera/mic unavailable or denied - user can still join audio/video off
        setMicOn(false);
        setVideoOn(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn, stream]);

  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = videoOn));
  }, [videoOn, stream]);

  const notStartedYet = startsInMs > 0;

  return (
    <div className="min-h-screen bg-zoom-navy flex items-center justify-center px-4">
      <div className="bg-zoom-panel rounded-xl overflow-hidden max-w-3xl w-full grid md:grid-cols-2 shadow-2xl">
        <div className="relative bg-black aspect-video md:aspect-auto flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover scale-x-[-1] ${
              stream && videoOn ? "block" : "hidden"
            }`}
          />
          {(!stream || !videoOn) && (
            <div className="w-20 h-20 rounded-full bg-zoom-blue flex items-center justify-center text-white text-3xl font-semibold">
              {(name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
            <button
              onClick={() => setMicOn((v) => !v)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                micOn ? "bg-white/15 hover:bg-white/25" : "bg-zoom-red"
              } text-white`}
            >
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              onClick={() => setVideoOn((v) => !v)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                videoOn ? "bg-white/15 hover:bg-white/25" : "bg-zoom-red"
              } text-white`}
            >
              {videoOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
          </div>
        </div>

        <div className="p-8 flex flex-col justify-center">
          <h1 className="text-white text-lg font-semibold mb-1">{meeting.title}</h1>
          <p className="text-white/50 text-xs mb-6">Meeting ID: {meeting.meeting_code}</p>

          {notStartedYet ? (
            <div className="bg-white/5 border border-white/10 rounded-md p-4 mb-3 flex items-start gap-3">
              <Clock size={18} className="text-zoom-blue flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">
                  This meeting hasn&apos;t started yet
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  Scheduled for{" "}
                  {meeting.scheduled_time &&
                    new Date(meeting.scheduled_time).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  . You can join in{" "}
                  <span className="text-white font-medium">{formatCountdown(startsInMs)}</span>.
                </p>
              </div>
            </div>
          ) : (
            <>
              <label className="text-xs font-medium text-white/70 mb-1">Your Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-white/10 text-white placeholder-white/40 rounded-md px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-zoom-blue"
              />

              {requiresPassword && (
                <>
                  <label className="text-xs font-medium text-white/70 mb-1">
                    Meeting Passcode
                  </label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter passcode"
                    className="w-full bg-white/10 text-white placeholder-white/40 rounded-md px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-zoom-blue"
                  />
                </>
              )}
            </>
          )}

          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

          <button
            disabled={!name.trim() || joining || notStartedYet}
            onClick={() => onJoin(name.trim(), password, stream, micOn, videoOn)}
            className="btn-primary w-full justify-center py-2.5"
          >
            {joining ? <Loader2 size={16} className="animate-spin" /> : null}
            {joining ? "Joining..." : notStartedYet ? "Not started yet" : "Join Meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}
