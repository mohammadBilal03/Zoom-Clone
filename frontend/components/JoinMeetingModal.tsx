"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { extractMeetingCode } from "@/lib/api";
import { LogIn } from "lucide-react";

export default function JoinMeetingModal({ onClose }: { onClose: () => void }) {
  const [codeOrLink, setCodeOrLink] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    if (!codeOrLink.trim()) {
      setError("Please enter a Meeting ID or invite link.");
      return;
    }
    const code = extractMeetingCode(codeOrLink);
    const params = new URLSearchParams();
    if (name.trim()) params.set("name", name.trim());
    router.push(`/meeting/${code}?${params.toString()}`);
  };

  return (
    <Modal title="Join a Meeting" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Meeting ID or invite link
          </label>
          <input
            autoFocus
            type="text"
            placeholder="e.g. 123-4567-8901"
            value={codeOrLink}
            onChange={(e) => setCodeOrLink(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Your name (optional)
          </label>
          <input
            type="text"
            placeholder="Display name for this meeting"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={handleJoin} className="btn-primary w-full mt-1">
          <LogIn size={16} />
          Join
        </button>
      </div>
    </Modal>
  );
}
