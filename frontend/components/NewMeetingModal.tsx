"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { api } from "@/lib/api";
import { Video, Loader2 } from "lucide-react";

export default function NewMeetingModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const startMeeting = async () => {
    setLoading(true);
    setError("");
    try {
      const meeting = await api.createInstant(title || "Instant Meeting");
      router.push(`/meeting/${meeting.meeting_code}?host=1`);
    } catch (e: any) {
      setError(e.message || "Failed to create meeting.");
      setLoading(false);
    }
  };

  return (
    <Modal title="Start an Instant Meeting" onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-16 h-16 rounded-full bg-zoom-blue-light flex items-center justify-center">
          <Video className="text-zoom-blue" size={28} />
        </div>
        <p className="text-sm text-gray-500">
          A unique Meeting ID and invite link will be generated instantly.
        </p>
        <input
          type="text"
          placeholder="Meeting topic (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={startMeeting} disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
          {loading ? "Starting..." : "Start Meeting"}
        </button>
      </div>
    </Modal>
  );
}
