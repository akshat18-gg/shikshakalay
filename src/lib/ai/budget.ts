/**
 * The daily AI budget guard: once today's recorded Claude spend reaches AI_DAILY_BUDGET_USD, turns get
 * 429 "let's take a break" until midnight IST. Protects the credits during judging.
 */
import { HttpError } from "@/lib/http";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight IST at the start of the day `now` falls in, as a UTC Date. */
export function startOfIstDay(now: Date): Date {
  const ist = now.getTime() + IST_OFFSET_MS;
  return new Date(ist - (ist % DAY_MS) - IST_OFFSET_MS);
}

export async function assertWithinBudget(deps: {
  limitUsd: number;
  spendSince: (since: Date) => Promise<number>;
  now?: Date;
}): Promise<void> {
  const now = deps.now ?? new Date();
  const dayStart = startOfIstDay(now);
  if ((await deps.spendSince(dayStart)) < deps.limitUsd) return;
  const retryAfterS = Math.ceil((dayStart.getTime() + DAY_MS - now.getTime()) / 1000);
  throw new HttpError("rate_limited", "Daily practice budget reached.", { "retry-after": String(retryAfterS) });
}
