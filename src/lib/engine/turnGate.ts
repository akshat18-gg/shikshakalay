/**
 * May this turn be played? Pure checks the orchestrator runs before calling Claude.
 */
import type { TurnResult } from "@/lib/contracts";
import { HttpError } from "@/lib/http";
import { LESSON_MS } from "./core";

/** A turn that left before the 5 minutes ran out may still arrive a little late. */
const LATE_GRACE_MS = 60 * 1000;

export function assertLessonOpen(o: {
  status: "active" | "ended";
  last: TurnResult | undefined;
  startedAt: Date;
  now: Date;
}) {
  const late = o.now.getTime() - o.startedAt.getTime() > LESSON_MS + LATE_GRACE_MS;
  if (o.status === "ended" || o.last?.lessonOver || late) throw new HttpError("lesson_over", "This lesson has ended.");
}

export function assertUnderTurnLimit(turnsLastHour: number, limit: number) {
  if (turnsLastHour >= limit) {
    throw new HttpError("rate_limited", "Too many turns this hour.", { "retry-after": "600" });
  }
}
