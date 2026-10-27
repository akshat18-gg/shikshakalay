/**
 * Checks that the database answers: `npx tsx --env-file-if-exists=.env.local scripts/db-ping.ts`
 * (add DB_TARGET=prod for the main branch). Prints the server version and the time taken — never the URL.
 */
import { sql } from "../src/lib/db/client";

async function main() {
  const started = Date.now();
  const rows = await sql<{ version: string }[]>`select version()`;
  const target = process.env.DB_TARGET === "prod" ? "MAIN (prod)" : "DEV";
  console.log(`✓ ${target} database answered in ${Date.now() - started} ms — ${rows[0]?.version.split(",")[0]}`);
  await sql.end();
}

main().catch(async (err: unknown) => {
  console.error(`✗ database ping failed: ${err instanceof Error ? err.message : String(err)}`);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
