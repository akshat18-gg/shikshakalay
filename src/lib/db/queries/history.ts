/**
 * A teacher's past lessons with their cards, newest first (history page, home). Every list has a limit.
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { checkins, coachCards, feedback, sessions } from "@/lib/db/schema/core";

export async function dbHistory(userId: string, limit: number) {
  const rows = await db
    .select({
      sessionId: sessions.id,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      turnCount: sessions.turnCount,
      card: coachCards.card,
      checkinId: checkins.id,
    })
    .from(sessions)
    .leftJoin(coachCards, eq(coachCards.sessionId, sessions.id))
    .leftJoin(checkins, eq(checkins.sessionId, sessions.id))
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.startedAt))
    .limit(limit);
  return rows.map(({ checkinId, ...r }) => ({ ...r, hasCheckin: checkinId !== null }));
}

/** One "did you try the line?" answer per lesson: a second answer is ignored. */
export async function dbSaveFeedback(
  userId: string,
  f: { doesWhatINeed: number; easyToUse: number; openAnswers: Record<string, string> },
): Promise<void> {
  await db.insert(feedback).values({ userId, ...f });
}

export async function dbSaveCheckin(sessionId: string, triedInClass: boolean): Promise<void> {
  const [existing] = await db
    .select({ id: checkins.id })
    .from(checkins)
    .where(eq(checkins.sessionId, sessionId))
    .limit(1);
  if (!existing) await db.insert(checkins).values({ sessionId, triedInClass });
}
