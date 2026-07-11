"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";

export type ChatMessage = {
  from: string;
  senderName: string;
  text: string;
  ts: number;
};

export default function ChatPanel({
  messages,
  onSend,
  onClose,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-800">In-meeting Chat</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-6">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-gray-800">{m.senderName}</span>
              <span className="text-[10px] text-gray-400">
                {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-sm text-gray-700 break-words">{m.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="border-t border-gray-200 p-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zoom-blue/40"
        />
        <button type="submit" className="btn-primary px-3">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
