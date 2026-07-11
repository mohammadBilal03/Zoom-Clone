"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, LogIn, CalendarPlus, Inbox } from "lucide-react";
import Navbar from "@/components/Navbar";
import MeetingCard from "@/components/MeetingCard";
import NewMeetingModal from "@/components/NewMeetingModal";
import JoinMeetingModal from "@/components/JoinMeetingModal";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";
import { api, MeetingOut, UserOut } from "@/lib/api";

export default function DashboardPage() {
  const [user, setUser] = useState<UserOut | null>(null);
  const [upcoming, setUpcoming] = useState<MeetingOut[]>([]);
  const [recent, setRecent] = useState<MeetingOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"new" | "join" | "schedule" | null>(null);
  const router = useRouter();

  const loadData = async () => {
    try {
      const [me, up, rec] = await Promise.all([
        api.getMe(),
        api.getUpcoming(),
        api.getRecent(),
      ]);
      setUser(me);
      setUpcoming(up);
      setRecent(rec);
    } catch (e) {
      console.error("Failed to load dashboard data. Is the backend running on :8000?", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          Good {getGreeting(now)}, {user?.name?.split(" ")[0] || ""}
        </h1>
        <p className="text-sm text-gray-500 mb-6">{formatFullDate(now)}</p>

        {/* Primary actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <ActionButton
            icon={<Video size={22} />}
            label="New Meeting"
            primary
            onClick={() => setModal("new")}
          />
          <ActionButton
            icon={<LogIn size={22} />}
            label="Join Meeting"
            onClick={() => setModal("join")}
          />
          <ActionButton
            icon={<CalendarPlus size={22} />}
            label="Schedule"
            onClick={() => setModal("schedule")}
          />
          <ActionButton
            icon={<Inbox size={22} />}
            label="View Recordings"
            onClick={() => alert("Recordings are not part of this demo scope.")}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Upcoming Meetings</h2>
              <span className="text-xs text-gray-400">{upcoming.length} scheduled</span>
            </div>
            <div className="flex flex-col gap-3">
              {loading && <SkeletonList />}
              {!loading && upcoming.length === 0 && (
                <EmptyState text="No upcoming meetings. Schedule one to get started." />
              )}
              {upcoming.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          </section>

          {/* Recent */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Recent Meetings</h2>
              <span className="text-xs text-gray-400">{recent.length} recent</span>
            </div>
            <div className="flex flex-col gap-3">
              {loading && <SkeletonList />}
              {!loading && recent.length === 0 && (
                <EmptyState text="No meetings yet. Your meeting history will show up here." />
              )}
              {recent.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          </section>
        </div>
      </main>

      {modal === "new" && <NewMeetingModal onClose={() => setModal(null)} />}
      {modal === "join" && <JoinMeetingModal onClose={() => setModal(null)} />}
      {modal === "schedule" && (
        <ScheduleMeetingModal onClose={() => setModal(null)} onScheduled={loadData} />
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`card flex flex-col items-center justify-center gap-2 py-6 hover:shadow-md transition-shadow ${
        primary ? "bg-zoom-blue text-white hover:bg-zoom-blue-dark" : "text-gray-700"
      }`}
    >
      <div className={primary ? "text-white" : "text-zoom-blue"}>{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="card py-10 flex flex-col items-center justify-center text-center px-6">
      <Inbox className="text-gray-300 mb-2" size={28} />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <>
      {[1, 2].map((i) => (
        <div key={i} className="card p-4 h-[68px] animate-pulse bg-gray-50" />
      ))}
    </>
  );
}

function getGreeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
