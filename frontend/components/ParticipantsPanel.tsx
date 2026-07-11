"use client";

import { MicOff, Mic, VideoOff, MoreVertical, UserX, X, Crown } from "lucide-react";
import { useState } from "react";
import { ParticipantOut } from "@/lib/api";

export default function ParticipantsPanel({
  participants,
  currentParticipantId,
  isHost,
  onClose,
  onMuteAll,
  onRemove,
  onMuteParticipant,
  onTurnOffParticipantVideo,
}: {
  participants: ParticipantOut[];
  currentParticipantId: number | null;
  isHost: boolean;
  onClose: () => void;
  onMuteAll: () => void;
  onRemove: (participantId: number) => void;
  onMuteParticipant: (participantId: number) => void;
  onTurnOffParticipantVideo: (participantId: number) => void;
}) {
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const active = participants.filter((p) => !p.left_at);

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-800">
          Participants ({active.length})
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {active.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-zoom-blue flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {p.display_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-800 truncate">
                {p.display_name}
                {p.id === currentParticipantId && " (You)"}
              </span>
              {p.is_host && <Crown size={13} className="text-yellow-500 flex-shrink-0" />}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {p.is_muted ? (
                <MicOff size={15} className="text-red-500" />
              ) : (
                <Mic size={15} className="text-gray-400" />
              )}
              {!p.is_video_on && <VideoOff size={15} className="text-gray-400" />}

              {isHost && p.id !== currentParticipantId && (
                <div className="relative">
                  <button
                    onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
                    className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuFor === p.id && (
                    <div className="absolute right-0 top-6 z-10 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-48">
                      {!p.is_muted && (
                        <button
                          onClick={() => {
                            onMuteParticipant(p.id);
                            setMenuFor(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <MicOff size={14} />
                          Mute
                        </button>
                      )}
                      {p.is_video_on && (
                        <button
                          onClick={() => {
                            onTurnOffParticipantVideo(p.id);
                            setMenuFor(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <VideoOff size={14} />
                          Turn off video
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onRemove(p.id);
                          setMenuFor(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <UserX size={14} />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isHost && (
        <div className="border-t border-gray-200 p-3 flex gap-2">
          <button onClick={onMuteAll} className="btn-secondary flex-1 justify-center">
            Mute All
          </button>
        </div>
      )}
    </div>
  );
}
