"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Copy, Check, ArrowLeft } from "lucide-react";
import { api, MeetingOut, API_URL } from "@/lib/api";

export default function SchedulePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<MeetingOut | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) {
      setError("Please fill in topic, date, and time.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const scheduled_time = new Date(`${date}T${time}`).toISOString();
      const meeting = await api.schedule({
        title,
        description,
        scheduled_time,
        duration_minutes: duration,
        password: password || undefined,
      });
      setCreated(meeting);
    } catch (err: any) {
      setError(err.message || "Failed to schedule meeting.");
    } finally {
      setLoading(false);
    }
  };

  const inviteUrl = created ? `${window.location.origin}${created.invite_link}` : "";

  // Mirrors the backend's 5-minute early-join grace window, so we don't
  // show a "Start Now" button that the server will just reject anyway.
  const canStartNow =
    !created?.scheduled_time ||
    new Date(created.scheduled_time).getTime() - Date.now() <= 5 * 60 * 1000;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (created) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <Check className="text-zoom-green" size={28} />
          </div>
          <h1 className="text-lg font-semibold text-gray-800 mb-1">Meeting Scheduled</h1>
          <p className="text-sm text-gray-500 mb-5">
            {created.title} is set for{" "}
            {created.scheduled_time &&
              new Date(created.scheduled_time).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            .
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-left mb-2">
            <p className="text-[11px] text-gray-400 mb-1">Meeting ID</p>
            <p className="text-sm font-mono text-gray-800">{created.meeting_code}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-left mb-5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 mb-1">Invite Link</p>
              <p className="text-sm text-gray-800 truncate">{inviteUrl}</p>
            </div>
            <button
              onClick={copyLink}
              className="flex-shrink-0 text-zoom-blue hover:text-zoom-blue-dark"
              title="Copy link"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => router.push("/")} className="btn-secondary flex-1 justify-center">
              Back to Dashboard
            </button>
            {canStartNow && (
              <button
                onClick={() => router.push(`/meeting/${created.meeting_code}?host=1`)}
                className="btn-primary flex-1 justify-center"
              >
                Start Now
              </button>
            )}
          </div>
          {!canStartNow && (
            <p className="text-xs text-gray-400 mt-3">
              This meeting can be started up to 5 minutes before its scheduled time.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-lg p-8">
        <button
          onClick={() => router.push("/")}
          className="text-gray-400 hover:text-gray-700 flex items-center gap-1 text-xs mb-4"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-lg bg-zoom-blue-light flex items-center justify-center">
            <CalendarPlus className="text-zoom-blue" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Schedule a Meeting</h1>
            <p className="text-xs text-gray-500">
              Set up a meeting in advance and share the invite.
            </p>
          </div>
        </div>

        <form onSubmit={handleSchedule} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Topic</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Weekly Team Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Description (optional)
            </label>
            <textarea
              placeholder="What's this meeting about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
              >
                {[15, 30, 45, 60, 90, 120].map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Passcode (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 1234"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
            {loading ? "Scheduling..." : "Schedule Meeting"}
          </button>
        </form>
      </div>
    </div>
  );
}
