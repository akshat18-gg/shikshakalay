import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { sweep } from "@/lib/jobs/queue";
import { log, logError } from "@/lib/log";

function keyOk(given: string | null): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || !given || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/** UptimeRobot calls this every 5 minutes: answers "ok" at once, then runs due/stuck jobs and clears old audio. */
export async function GET(req: Request) {
  if (!keyOk(new URL(req.url).searchParams.get("key"))) return new Response("forbidden", { status: 403 });
  after(async () => {
    try {
      const n = await sweep(10);
      if (n) log("sweep", { jobs: n });
    } catch (err) {
      logError("sweep_failed", err, {});
    }
  });
  return new Response("ok", { headers: { "content-type": "text/plain", "cache-control": "no-store" } });
}
