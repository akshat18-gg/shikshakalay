/**
 * Past lessons for the history page and home, plus the check-in. Mock mode reads the in-memory mock lessons.
 */
import type { CoachCard, FeedbackBody } from "@/lib/contracts";
import { mockHistory } from "@/lib/mocks/lesson";

export const HISTORY_LIMIT = 50;
/** Ask "did you try the line?" once the lesson ended this long ago (she has had a class since). */
export const CHECKIN_AFTER_MS = 12 * 60 * 60 * 1000;

export type HistoryRow = {
  sessionId: string;
  startedAt: Date;
  endedAt: Date | null;
  turnCount: number;
  card: CoachCard | null;
  hasCheckin: boolean;
};

const mock = () => process.env.USE_MOCKS === "1";

export async function getHistory(userId: string): Promise<HistoryRow[]> {
  if (mock()) return mockHistory(userId).slice(0, HISTORY_LIMIT);
  return (await import("@/lib/db/queries/history")).dbHistory(userId, HISTORY_LIMIT);
}

/** The lesson to ask about: her latest finished lesson, ended over 12 hours ago, not answered yet. */
export function checkinDue(rows: HistoryRow[], now: Date): HistoryRow | null {
  const last = rows.find((r) => r.card !== null);
  if (!last?.endedAt || last.hasCheckin) return null;
  return now.getTime() - last.endedAt.getTime() >= CHECKIN_AFTER_MS ? last : null;
}

/** The teacher's answers to the two ease questions (one row per answer; the newest counts). */
export async function saveFeedback(userId: string, body: FeedbackBody): Promise<void> {
  if (mock()) return;
  const openAnswers: Record<string, string> = body.openAnswers.change ? { change: body.openAnswers.change } : {};
  await (await import("@/lib/db/queries/history")).dbSaveFeedback(userId, { ...body, openAnswers });
}

export async function saveCheckin(sessionId: string, triedInClass: boolean): Promise<void> {
  if (mock()) return;
  await (await import("@/lib/db/queries/history")).dbSaveCheckin(sessionId, triedInClass);
}

export function formatIst(d: Date, lang: "en" | "hi"): string {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
