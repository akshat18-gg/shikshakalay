/**
 * WhatsApp contacts and the job queue. The phone number lives only in wa_contacts.phone.
 */
import { and, eq, lt, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/auth";
import { checkins } from "@/lib/db/schema/core";
import { jobs, media, waContacts } from "@/lib/db/schema/whatsapp";
import type { Contact, Step } from "@/lib/channels/whatsapp";

export async function findOrCreateContact(phone: string): Promise<Contact & { phone: string }> {
  await db.insert(waContacts).values({ phone }).onConflictDoNothing({ target: waContacts.phone });
  await db.update(waContacts).set({ lastInboundAt: new Date() }).where(eq(waContacts.phone, phone));
  const [c] = await db
    .select({
      id: waContacts.id,
      phone: waContacts.phone,
      step: waContacts.step,
      userId: waContacts.userId,
      userCode: users.code,
      lang: users.lang,
      activeSessionId: waContacts.activeSessionId,
      lastRejoinTipAt: waContacts.lastRejoinTipAt,
    })
    .from(waContacts)
    .leftJoin(users, eq(users.id, waContacts.userId))
    .where(eq(waContacts.phone, phone))
    .limit(1);
  return { ...c!, step: c!.step as Step, lang: c!.lang ?? "hi" };
}

export async function contactById(id: string) {
  const [c] = await db.select().from(waContacts).where(eq(waContacts.id, id)).limit(1);
  return c ?? null;
}

export async function userLang(userId: string): Promise<"en" | "hi"> {
  const [u] = await db.select({ lang: users.lang }).from(users).where(eq(users.id, userId)).limit(1);
  return u?.lang ?? "hi";
}

export async function updateContact(id: string, patch: Partial<typeof waContacts.$inferInsert>): Promise<void> {
  await db.update(waContacts).set(patch).where(eq(waContacts.id, id));
}

/** New WhatsApp teacher: W01, W02, … (no PIN, no name). */
export async function createWhatsAppUser(lang: "en" | "hi"): Promise<{ id: string; code: string }> {
  const [{ n }] = (await db.execute<{ n: number }>(
    sql`select count(*)::int as n from users where code like 'W%'`,
  )) as unknown as [{ n: number }];
  for (let i = n + 1; i < n + 50; i++) {
    const code = `W${String(i).padStart(2, "0")}`;
    const [u] = await db
      .insert(users)
      .values({ code, role: "teacher", lang, isDemo: false })
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (u) return { id: u.id, code };
  }
  throw new Error("could not create a WhatsApp user code");
}

export async function saveWaCheckin(sessionId: string, tried: boolean): Promise<void> {
  const [existing] = await db
    .select({ id: checkins.id })
    .from(checkins)
    .where(eq(checkins.sessionId, sessionId))
    .limit(1);
  if (!existing) await db.insert(checkins).values({ sessionId, triedInClass: tried });
}

/* ---------- jobs ---------- */

export type JobRow = typeof jobs.$inferSelect;

export async function insertJob(
  type: string,
  payload: unknown,
  opts: { dedupeKey?: string; runAt?: Date } = {},
): Promise<string> {
  const [row] = await db
    .insert(jobs)
    .values({ type, payload, dedupeKey: opts.dedupeKey, runAt: opts.runAt ?? new Date() })
    .onConflictDoNothing({ target: jobs.dedupeKey })
    .returning({ id: jobs.id });
  if (row) return row.id;
  const [existing] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.dedupeKey, opts.dedupeKey!)).limit(1);
  return existing!.id;
}

/** Atomically takes one pending job (so a webhook and the sweep never run it twice). */
export async function claimJob(id: string): Promise<JobRow | null> {
  const [row] = await db
    .update(jobs)
    .set({ status: "running", lockedAt: new Date(), attempts: sql`${jobs.attempts} + 1` })
    .where(and(eq(jobs.id, id), eq(jobs.status, "pending"), lte(jobs.runAt, new Date())))
    .returning();
  return row ?? null;
}

/** Due jobs (pending and runAt ≤ now) and stuck ones (running > 2 min, < 3 attempts), claimed with SKIP LOCKED. */
export async function claimDueJobs(limit: number): Promise<JobRow[]> {
  const rows = await db.execute<JobRow>(sql`
    update jobs set status = 'running', locked_at = now(), attempts = attempts + 1
    where id in (
      select id from jobs
      where (status = 'pending' and run_at <= now())
         or (status = 'running' and locked_at < now() - interval '2 minutes' and attempts < 3)
      order by run_at
      limit ${limit}
      for update skip locked
    )
    returning id, type, payload, status, attempts, run_at as "runAt", locked_at as "lockedAt", last_error as "lastError", dedupe_key as "dedupeKey", created_at as "createdAt"`);
  return [...rows];
}

/** Done jobs keep only their dedupe key: the payload (her number, her words) is cleared. */
export async function finishJob(id: string): Promise<void> {
  await db.update(jobs).set({ status: "done", lastError: null, payload: {} }).where(eq(jobs.id, id));
}

/** Retry in a minute, up to 3 attempts; then failed (and the payload is cleared, as for done jobs). */
export async function failJob(id: string, attempts: number, error: string): Promise<void> {
  const done = attempts >= 3;
  await db
    .update(jobs)
    .set({
      status: done ? "failed" : "pending",
      runAt: new Date(Date.now() + 60_000),
      lastError: error.slice(0, 300),
      ...(done ? { payload: {} } : {}),
    })
    .where(eq(jobs.id, id));
}

export async function deleteExpiredMedia(): Promise<void> {
  await db.delete(media).where(lt(media.expiresAt, new Date()));
}
