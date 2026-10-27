/**
 * The ai_calls table: one row per Claude / Sarvam / Azure call (the AI trace page and the cost numbers read it).
 */
import { gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiCalls } from "@/lib/db/schema/core";

export type AiCallRow = typeof aiCalls.$inferInsert;

export async function insertAiCall(row: AiCallRow): Promise<void> {
  await db.insert(aiCalls).values(row);
}

/** Total recorded cost since `since` (USD). */
export async function spendSince(since: Date): Promise<number> {
  const rows = await db
    .select({ total: sql<string | null>`sum(${aiCalls.costUsd})` })
    .from(aiCalls)
    .where(gte(aiCalls.createdAt, since));
  return Number(rows[0]?.total ?? 0);
}
