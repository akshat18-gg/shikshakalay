/**
 * Structured logs: one JSON line per event, so Render's log search can find every line of one request by its id.
 *
 *   log("turn", { requestId, user: "T07", sessionId, ms: 812 })
 *   → {"ts":"2026-10-27T…","level":"info","evt":"turn","requestId":"…","user":"T07","sessionId":"…","ms":812}
 *
 * Never log phone numbers, PINs, keys, audio or full transcripts — pass codes and ids only.
 */

export type LogFields = Record<string, unknown>;

/** Tests set LOG_SILENT=1 (vitest.config.mts) so the output stays readable. */
function silent(): boolean {
  return process.env.LOG_SILENT === "1";
}

export function log(evt: string, fields: LogFields = {}): void {
  if (silent()) return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", evt, ...fields }));
}

/** Errors keep their message and stack in the log — never in an HTTP response. */
export function logError(evt: string, err: unknown, fields: LogFields = {}): void {
  if (silent()) return;
  const detail =
    err instanceof Error ? { error: err.message, errorName: err.name, stack: err.stack } : { error: String(err) };
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", evt, ...fields, ...detail }));
}
