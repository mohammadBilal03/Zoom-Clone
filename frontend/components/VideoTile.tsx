"use client";

import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";

export default function VideoTile({
  stream,
  name,
  muted,
  isLocal,
  isMuted,
  isVideoOn,
  isHost,
  avatarColor,
  speaking,
}: {
  stream: MediaStream | null;
  name: string;
  muted?: boolean; // mute the <video> element's own audio (used for local preview)
  isLocal?: boolean;
  isMuted?: boolean; // participant's mic state (for the icon)
  isVideoOn?: boolean;
  isHost?: boolean;
  avatarColor?: string;
  speaking?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initial = name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div
      className={`relative bg-zoom-panel rounded-lg overflow-hidden flex items-center justify-center aspect-video ${
        speaking ? "ring-2 ring-zoom-green" : ""
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""} ${
          stream && isVideoOn !== false ? "block" : "hidden"
        }`}
      />
      {(!stream || isVideoOn === false) && (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
          style={{ backgroundColor: avatarColor || "#2D8CFF" }}
        >
          {initial}
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 rounded px-2 py-1">
        {isMuted && <MicOff size={12} className="text-red-400" />}
        <span className="text-white text-xs font-medium">
          {name} {isLocal ? "(You)" : ""}
        </span>
        {isHost && (
          <span className="text-[9px] uppercase tracking-wide text-yellow-300 font-semibold">
            Host
          </span>
        )}
      </div>
    </div>
  );
}
