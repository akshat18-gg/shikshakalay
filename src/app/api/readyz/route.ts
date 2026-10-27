import { sql } from "@/lib/db/client";
import { dbReady } from "@/lib/db/health";
import { log } from "@/lib/log";

const HEADERS = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };

/** Readiness: the server AND the database answer. No details in the body — the reason goes to the log. */
export async function GET() {
  const started = Date.now();
  if (await dbReady(() => sql`select 1`)) return new Response("ok", { headers: HEADERS });
  log("readyz_failed", { ms: Date.now() - started });
  return new Response("not ready", { status: 503, headers: HEADERS });
}
