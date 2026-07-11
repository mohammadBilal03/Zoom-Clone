"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video } from "lucide-react";
import { extractMeetingCode } from "@/lib/api";

export default function JoinPage() {
  const [codeOrLink, setCodeOrLink] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeOrLink.trim()) return;
    const code = extractMeetingCode(codeOrLink);
    const params = new URLSearchParams();
    if (name.trim()) params.set("name", name.trim());
    router.push(`/meeting/${code}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-zoom-blue flex items-center justify-center mb-3">
            <Video className="text-white" fill="white" size={26} />
          </div>
          <h1 className="text-lg font-semibold text-gray-800">Join a Meeting</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter a Meeting ID or paste an invite link to join.
          </p>
        </div>
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Meeting ID or invite link"
            value={codeOrLink}
            onChange={(e) => setCodeOrLink(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
          />
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
          />
          <button type="submit" className="btn-primary w-full mt-1">
            Join
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-secondary w-full"
          >
            Back to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
