/**
 * Login-related queries (real mode). Every query has a limit; codes are matched case-insensitively.
 */
import { eq, sql } from "drizzle-orm";
import type { Lang, SessionUser } from "@/lib/contracts";
import { db } from "@/lib/db/client";
import { consents, users } from "@/lib/db/schema/auth";

export type UserWithPin = { user: SessionUser; pinHash: string | null };

export async function dbFindUserByCode(code: string): Promise<UserWithPin | null> {
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.code}) = lower(${code})`)
    .limit(1);
  const u = rows[0];
  return u ? { user: { id: u.id, code: u.code, role: u.role, lang: u.lang }, pinHash: u.pinHash } : null;
}

export async function dbHasConsent(userId: string): Promise<boolean> {
  const rows = await db.select({ id: consents.id }).from(consents).where(eq(consents.userId, userId)).limit(1);
  return rows.length > 0;
}

export async function dbSaveConsent(userId: string, textVersion: string): Promise<void> {
  await db.insert(consents).values({ userId, textVersion, channel: "web" });
}

export async function dbSetUserLang(userId: string, lang: Lang): Promise<void> {
  await db.update(users).set({ lang }).where(eq(users.id, userId));
}
