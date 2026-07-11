"use client";

import { Calendar, Clock, Lock, Copy, Video } from "lucide-react";
import { MeetingOut } from "@/lib/api";
import { format } from "date-fns";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MeetingCard({ meeting }: { meeting: MeetingOut }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}${meeting.invite_link}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const isUpcoming = meeting.status === "scheduled";

  return (
    <div
      onClick={() => router.push(`/meeting/${meeting.meeting_code}`)}
      className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isUpcoming ? "bg-zoom-blue-light text-zoom-blue" : "bg-gray-100 text-gray-400"
          }`}
        >
          <Video size={18} />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-gray-800 truncate">{meeting.title}</div>
          <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {meeting.scheduled_time
                ? format(new Date(meeting.scheduled_time), "MMM d, yyyy")
                : format(new Date(meeting.created_at), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {meeting.scheduled_time
                ? format(new Date(meeting.scheduled_time), "h:mm a")
                : format(new Date(meeting.created_at), "h:mm a")}
              {" · "}
              {meeting.duration_minutes} min
            </span>
            <span className="font-mono text-gray-400">{meeting.meeting_code}</span>
            {meeting.status === "ended" && (
              <span className="text-gray-400">· Ended</span>
            )}
            {meeting.status === "active" && (
              <span className="text-zoom-green font-medium">· In Progress</span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={copyLink}
        className="btn-secondary shrink-0 text-xs px-3 py-1.5"
        title="Copy invite link"
      >
        <Copy size={13} />
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
