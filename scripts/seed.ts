/**
 * Seeds the database. Now: the three demo logins (teacher_demo, trainer_demo, admin_demo; PIN = DEMO_PIN,
 * isDemo = true). Safe to run again: existing demo users get a fresh PIN hash, nothing else changes.
 * Phase 4 adds the synthetic teachers T01–T08. npm run db:seed (dev) · npm run db:seed:prod (ask the operator first)
 */
import { sql as dsql } from "drizzle-orm";
import { hashPin } from "../src/lib/auth/pin";
import { db, sql } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema/auth";

const DEMO = [
  { code: "teacher_demo", role: "teacher" as const },
  { code: "trainer_demo", role: "trainer" as const },
  { code: "admin_demo", role: "admin" as const },
];

async function main() {
  const pin = process.env.DEMO_PIN;
  if (!pin || !/^\d{4}$/.test(pin)) throw new Error("DEMO_PIN must be set to 4 digits (npm run env:check)");
  const target = process.env.DB_TARGET === "prod" ? "MAIN (prod)" : "DEV";
  for (const u of DEMO) {
    const pinHash = await hashPin(pin);
    await db
      .insert(users)
      .values({ ...u, lang: "en", pinHash, isDemo: true })
      .onConflictDoUpdate({ target: users.code, set: { pinHash, role: u.role, isDemo: true } });
  }
  const [n] = await db.select({ n: dsql<number>`count(*)::int` }).from(users);
  console.log(`✓ ${target}: demo users ready (${DEMO.map((u) => u.code).join(", ")}); ${n?.n} users in total`);
  await sql.end();
}

main().catch(async (err: unknown) => {
  console.error(`✗ seed failed: ${err instanceof Error ? err.message : String(err)}`);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
