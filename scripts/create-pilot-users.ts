/**
 * Creates pilot teacher logins P01…Pnn with random 4-digit PINs (prints them once — copy them into the private
 * contact sheet, never into git). Asks nothing about the person. Run against prod only with the operator's OK:
 *   DB_TARGET=prod npx tsx --env-file-if-exists=.env.local scripts/create-pilot-users.ts 10
 */
import { randomInt } from "node:crypto";
import { hashPin } from "../src/lib/auth/pin";
import { db, sql } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema/auth";

async function main() {
  const n = Number(process.argv[2] ?? 10);
  if (!Number.isInteger(n) || n < 1 || n > 50) throw new Error("usage: create-pilot-users.ts <1–50>");
  console.log(`Target: ${process.env.DB_TARGET === "prod" ? "MAIN (prod)" : "DEV"} — PINs are shown once:`);
  for (let i = 1; i <= n; i++) {
    const code = `P${String(i).padStart(2, "0")}`;
    const pin = String(randomInt(0, 10_000)).padStart(4, "0");
    const inserted = await db
      .insert(users)
      .values({ code, role: "teacher", lang: "hi", pinHash: await hashPin(pin), isDemo: false })
      .onConflictDoNothing({ target: users.code })
      .returning({ id: users.id });
    console.log(inserted.length ? `${code}  PIN ${pin}` : `${code}  (already exists — PIN unchanged)`);
  }
  await sql.end();
}

main().catch(async (err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  await sql.end({ timeout: 1 });
  process.exit(1);
});
