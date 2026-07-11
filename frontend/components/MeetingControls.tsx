"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  MessageSquare,
  MonitorUp,
  PhoneOff,
  MoreHorizontal,
} from "lucide-react";

export default function MeetingControls({
  micOn,
  videoOn,
  onToggleMic,
  onToggleVideo,
  onToggleParticipants,
  onToggleChat,
  onLeave,
  participantCount,
  isHost,
}: {
  micOn: boolean;
  videoOn: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
  participantCount: number;
  isHost: boolean;
}) {
  return (
    <div className="bg-zoom-navy border-t border-white/10 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-1 flex-1">
        <button
          onClick={onToggleMic}
          className={`control-btn ${!micOn ? "control-btn-off" : ""}`}
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          onClick={onToggleVideo}
          className={`control-btn ${!videoOn ? "control-btn-off" : ""}`}
          title={videoOn ? "Stop Video" : "Start Video"}
        >
          {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
          {videoOn ? "Stop Video" : "Start Video"}
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggleParticipants}
          className="control-btn relative"
          title="Participants"
        >
          <Users size={20} />
          Participants
          <span className="absolute -top-1 right-1 bg-zoom-blue text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {participantCount}
          </span>
        </button>
        <button onClick={onToggleChat} className="control-btn" title="Chat">
          <MessageSquare size={20} />
          Chat
        </button>
        <button
          className="control-btn opacity-50 cursor-not-allowed"
          title="Screen share (not available in this demo)"
        >
          <MonitorUp size={20} />
          Share
        </button>
        <button className="control-btn opacity-50 cursor-not-allowed" title="More">
          <MoreHorizontal size={20} />
          More
        </button>
      </div>

      <div className="flex-1 flex justify-end">
        <button
          onClick={onLeave}
          className="btn bg-zoom-red hover:bg-red-700 text-white px-4 py-2 text-sm font-medium"
        >
          <PhoneOff size={16} />
          {isHost ? "End" : "Leave"}
        </button>
      </div>
    </div>
  );
}
