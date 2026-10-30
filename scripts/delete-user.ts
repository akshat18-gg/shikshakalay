/**
 * Deletes one person's data everywhere (the promise on /privacy). Without --yes it only counts what would go.
 *   npx tsx --env-file-if-exists=.env.local scripts/delete-user.ts --code T07           (dev, dry run)
 *   DB_TARGET=prod npx tsx --env-file-if-exists=.env.local scripts/delete-user.ts --code W02 --yes   (ask first)
 * Removed: the user row, which cascades to lessons, turns, child lines, cards, check-ins, consents and feedback;
 * their WhatsApp contact (the only place a phone number lives) and that contact's queued jobs. ai_calls rows stay
 * with the lesson link cleared: they hold model, tokens and cost only.
 */
import { eq, or, sql as dsql } from "drizzle-orm";
import { db, sql } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema/auth";
import { sessions } from "../src/lib/db/schema/core";
import { jobs, waContacts } from "../src/lib/db/schema/whatsapp";

async function main() {
  const at = process.argv.indexOf("--code");
  const code = at > 0 ? process.argv[at + 1] : undefined;
  if (!code) throw new Error("usage: delete-user.ts --code <T07|W02|P03> [--yes]");
  const really = process.argv.includes("--yes");
  const target = process.env.DB_TARGET === "prod" ? "MAIN (prod)" : "DEV";

  const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.code, code));
  if (!user) throw new Error(`${target}: no user with code ${code}`);
  if (user.role !== "teacher") throw new Error(`${code} is a ${user.role} — only teacher data is deleted this way`);
  const [contact] = await db
    .select({ id: waContacts.id, phone: waContacts.phone })
    .from(waContacts)
    .where(eq(waContacts.userId, user.id));
  const lessons = await db.$count(sessions, eq(sessions.userId, user.id));
  // A WhatsApp job carries the number (inbound messages) or the contact id (check-ins).
  const contactJobs = contact
    ? or(dsql`${jobs.payload}->>'From' = ${contact.phone}`, dsql`${jobs.payload}->>'contactId' = ${contact.id}`)
    : undefined;
  const jobCount = contactJobs ? await db.$count(jobs, contactJobs) : 0;
  console.log(
    `${target}: ${code} — ${lessons} lessons (with their turns and cards), ${contact ? "a WhatsApp contact" : "no WhatsApp contact"}, ${jobCount} jobs`,
  );
  if (!really) {
    console.log("Dry run. Add --yes to delete.");
    return;
  }
  await db.transaction(async (tx) => {
    if (contactJobs) await tx.delete(jobs).where(contactJobs);
    if (contact) await tx.delete(waContacts).where(eq(waContacts.id, contact.id));
    await tx.delete(users).where(eq(users.id, user.id));
  });
  console.log(`✓ deleted ${code}`);
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => sql.end({ timeout: 1 }));
