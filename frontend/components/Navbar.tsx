"use client";

import { Video, Settings, ChevronDown } from "lucide-react";
import { UserOut } from "@/lib/api";

export default function Navbar({ user }: { user: UserOut | null }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-zoom-blue flex items-center justify-center">
            <Video size={18} className="text-white" fill="white" />
          </div>
          <span className="text-xl font-semibold text-gray-800">zoom</span>
          <span className="ml-1 text-xs font-medium text-gray-400 border border-gray-300 rounded px-1.5 py-0.5">
            clone
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a className="text-zoom-blue border-b-2 border-zoom-blue pb-5 -mb-5">Home</a>
          <a className="hover:text-gray-900 cursor-pointer">Meetings</a>
          <a className="hover:text-gray-900 cursor-pointer">Recordings</a>
          <a className="hover:text-gray-900 cursor-pointer">Settings</a>
        </nav>

        <div className="flex items-center gap-4">
          <button
            className="text-gray-500 hover:text-gray-800"
            title="Settings (placeholder)"
          >
            <Settings size={20} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ backgroundColor: user?.avatar_color || "#2D8CFF" }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="hidden sm:block text-sm">
              <div className="font-medium text-gray-800 leading-tight">
                {user?.name || "Loading..."}
              </div>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
