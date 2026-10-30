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

/**
 * Masks phone numbers (10+ digits, spaces/dashes allowed) and emails. Outside services repeat them in their error
 * messages (Twilio: "The 'To' number … is not valid"), and those messages end up in our error logs.
 */
export function maskPersonal(text: string): string {
  return text.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]").replace(/\+?\d(?:[\s-]?\d){9,}/g, "[phone]");
}

/**
 * A failed database query's message repeats its parameters (a teacher's words, a PIN hash). Keep only the
 * database's own reason and code.
 */
function errorDetail(err: unknown): LogFields {
  if (!(err instanceof Error)) return { error: maskPersonal(String(err)) };
  if ("params" in err && "query" in err) {
    const cause = err.cause as { message?: string; code?: string } | undefined;
    return { error: `database query failed: ${cause?.message ?? "unknown"}`, errorName: err.name, dbCode: cause?.code };
  }
  return { error: maskPersonal(err.message), errorName: err.name, stack: err.stack && maskPersonal(err.stack) };
}

/** Errors keep their message and stack in the log — never in an HTTP response. */
export function logError(evt: string, err: unknown, fields: LogFields = {}): void {
  if (silent()) return;
  const detail = errorDetail(err);
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", evt, ...fields, ...detail }));
}
