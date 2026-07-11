export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export type UserOut = {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
};

export type MeetingOut = {
  id: number;
  meeting_code: string;
  title: string;
  description: string | null;
  type: "instant" | "scheduled";
  status: "scheduled" | "active" | "ended";
  scheduled_time: string | null;
  duration_minutes: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  host: UserOut;
  invite_link: string;
};

export type ParticipantOut = {
  id: number;
  display_name: string;
  is_host: boolean;
  is_muted: boolean;
  is_video_on: boolean;
  joined_at: string;
  left_at: string | null;
};

export type MeetingDetailOut = MeetingOut & { participants: ParticipantOut[] };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = "Something went wrong.";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  getMe: () => request<UserOut>("/api/users/me"),

  getUpcoming: () => request<MeetingOut[]>("/api/meetings/upcoming"),
  getRecent: () => request<MeetingOut[]>("/api/meetings/recent"),

  createInstant: (title?: string) =>
    request<MeetingOut>("/api/meetings/instant", {
      method: "POST",
      body: JSON.stringify({ title: title || "Instant Meeting" }),
    }),

  schedule: (data: {
    title: string;
    description?: string;
    scheduled_time: string;
    duration_minutes: number;
    password?: string;
  }) =>
    request<MeetingOut>("/api/meetings/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMeeting: (code: string) => request<MeetingDetailOut>(`/api/meetings/${code}`),

  joinMeeting: (code: string, display_name: string, password?: string) =>
    request<{ meeting: MeetingOut; participant: ParticipantOut }>(
      `/api/meetings/${code}/join`,
      { method: "POST", body: JSON.stringify({ display_name, password }) }
    ),

  endMeeting: (code: string, requesterId: number) =>
    request<MeetingOut>(`/api/meetings/${code}/end?requester_id=${requesterId}`, {
      method: "POST",
    }),

  removeParticipant: (code: string, participantId: number, requesterId: number) =>
    request(`/api/meetings/${code}/participants/${participantId}?requester_id=${requesterId}`, {
      method: "DELETE",
    }),

  muteAll: (code: string, requesterId: number) =>
    request(`/api/meetings/${code}/mute-all?requester_id=${requesterId}`, { method: "POST" }),

  muteParticipant: (code: string, participantId: number, requesterId: number) =>
    request(
      `/api/meetings/${code}/participants/${participantId}/mute?requester_id=${requesterId}`,
      { method: "POST" }
    ),

  turnOffParticipantVideo: (code: string, participantId: number, requesterId: number) =>
    request(
      `/api/meetings/${code}/participants/${participantId}/video-off?requester_id=${requesterId}`,
      { method: "POST" }
    ),

  reportOwnState: (
    code: string,
    participantId: number,
    state: { is_muted?: boolean; is_video_on?: boolean }
  ) =>
    request(
      `/api/meetings/${code}/participants/${participantId}/state?requester_id=${participantId}`,
      { method: "PATCH", body: JSON.stringify(state) }
    ),
};

/** Extracts a meeting code whether the user pasted a raw code or a full invite link/URL. */
export function extractMeetingCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/([0-9]{3}-[0-9]{4}-[0-9]{4})/);
  if (match) return match[1];
  return trimmed;
}
