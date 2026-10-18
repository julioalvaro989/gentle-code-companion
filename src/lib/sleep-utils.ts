export type SleepSession = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  quality_rating: number | null;
  wake_feeling: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function formatSleepDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}min` : `${minutes}min`;
}

export function getSleepDurationSeconds(session: SleepSession, now = Date.now()): number | null {
  if (session.duration_seconds != null && session.ended_at) return Math.max(0, session.duration_seconds);
  if (!session.ended_at) return Math.max(0, Math.floor((now - new Date(session.started_at).getTime()) / 1000));
  return null;
}

export function getLastSevenNightAverage(sessions: SleepSession[], now = new Date()): number | null {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const valid = sessions.filter((session) => {
    if (!session.ended_at || session.duration_seconds == null) return false;
    const ended = new Date(session.ended_at);
    return ended >= start && ended <= now && session.duration_seconds > 0 && session.duration_seconds <= 18 * 3600;
  });
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, item) => sum + (item.duration_seconds ?? 0), 0) / valid.length);
}

export function formatSleepDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
