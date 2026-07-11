"use client";

import { useState } from "react";
import Modal from "./Modal";
import { api } from "@/lib/api";
import { CalendarPlus, Loader2 } from "lucide-react";

export default function ScheduleMeetingModal({
  onClose,
  onScheduled,
}: {
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSchedule = async () => {
    if (!title.trim() || !date || !time) {
      setError("Please fill in title, date, and time.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const scheduled_time = new Date(`${date}T${time}`).toISOString();
      await api.schedule({
        title,
        description,
        scheduled_time,
        duration_minutes: duration,
        password: password || undefined,
      });
      onScheduled();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to schedule meeting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Schedule a Meeting" onClose={onClose} width="max-w-lg">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Topic</label>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Weekly Team Sync"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
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
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Duration (minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
            >
              {[15, 30, 45, 60, 90, 120].map((d) => (
                <option key={d} value={d}>
                  {d} min
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={handleSchedule} disabled={loading} className="btn-primary w-full mt-1">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
          {loading ? "Scheduling..." : "Schedule"}
        </button>
      </div>
    </Modal>
  );
}
