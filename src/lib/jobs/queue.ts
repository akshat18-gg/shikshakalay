/**
 * Background work (AGENTS.md 9): the webhook saves a job and answers Twilio at once; the job runs right after
 * (after()), and the sweep picks up anything due or stuck. Retries: 3 attempts, a minute apart.
 */
import type { JobRow } from "@/lib/db/queries/whatsapp";
import { log, logError } from "@/lib/log";
import { HANDLERS } from "./handlers";

async function q() {
  return import("@/lib/db/queries/whatsapp");
}

export async function enqueueJob(
  type: keyof typeof HANDLERS,
  payload: unknown,
  opts: { dedupeKey?: string; runAt?: Date } = {},
) {
  return (await q()).insertJob(type, payload, opts);
}

async function run(job: JobRow): Promise<void> {
  const started = Date.now();
  const handler = HANDLERS[job.type as keyof typeof HANDLERS];
  try {
    if (!handler) throw new Error(`no handler for job type ${job.type}`);
    await handler(job.payload);
    await (await q()).finishJob(job.id);
    log("job_done", { jobId: job.id, type: job.type, ms: Date.now() - started });
  } catch (err) {
    logError("job_failed", err, { jobId: job.id, type: job.type, attempts: job.attempts });
    await (await q()).failJob(job.id, job.attempts, err instanceof Error ? err.message : String(err));
  }
}

/** Runs one job if it is still pending (the webhook calls this in after()). */
export async function processJob(id: string): Promise<void> {
  const job = await (await q()).claimJob(id);
  if (job) await run(job);
}

/** The sweep: due and stuck jobs, one by one, then expired audio. */
export async function sweep(limit = 10): Promise<number> {
  const db = await q();
  const due = await db.claimDueJobs(limit);
  for (const job of due) await run(job);
  await db.deleteExpiredMedia();
  return due.length;
}
