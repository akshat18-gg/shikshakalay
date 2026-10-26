/**
 * The ONLY place the browser calls fetch. Every response is parsed with the shared contract, and every error
 * becomes an ApiClientError with the server's code and request id (shown on error screens as a reference).
 */
import { type ZodType, z } from "zod";
import {
  ApiError,
  type ApiErrorCode,
  CoachCard,
  Lang,
  SessionView,
  type StartLessonBody,
  StartLessonResult,
  TurnResult,
} from "@/lib/contracts";

const TIMEOUT_MS = 30_000;

export class ApiClientError extends Error {
  constructor(
    public readonly code: ApiErrorCode | "network",
    public readonly requestId?: string,
    public readonly status?: number,
  ) {
    super(code);
    this.name = "ApiClientError";
  }
}

async function call<T>(path: string, init: RequestInit, schema: ZodType<T>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), credentials: "same-origin" });
  } catch {
    throw new ApiClientError("network");
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiError.safeParse(body);
    const requestId = err.success ? err.data.error.requestId : (res.headers.get("x-request-id") ?? undefined);
    throw new ApiClientError(err.success ? err.data.error.code : "internal", requestId, res.status);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiClientError("internal", res.headers.get("x-request-id") ?? undefined);
  return parsed.data;
}

function postJson<T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> {
  return call(
    path,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    schema,
  );
}

export function setLang(lang: Lang): Promise<{ lang: Lang }> {
  return postJson("/api/auth/lang", { lang }, z.object({ lang: Lang }));
}

export function startLesson(body: StartLessonBody): Promise<StartLessonResult> {
  return postJson("/api/sessions", body, StartLessonResult);
}

export function getSession(sessionId: string): Promise<SessionView> {
  return call(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: "GET" }, SessionView);
}

/** A typed or recorded turn. Retrying with the same idempotencyKey returns the same result (no double turn). */
export function sendTurn(
  sessionId: string,
  turn: { text?: string; audio?: Blob; idempotencyKey: string },
): Promise<TurnResult> {
  const form = new FormData();
  if (turn.text) form.append("text", turn.text);
  if (turn.audio) form.append("audio", turn.audio);
  form.append("idempotencyKey", turn.idempotencyKey);
  return call(`/api/sessions/${encodeURIComponent(sessionId)}/turns`, { method: "POST", body: form }, TurnResult);
}

export function endLesson(sessionId: string): Promise<CoachCard> {
  return call(`/api/sessions/${encodeURIComponent(sessionId)}/end`, { method: "POST" }, CoachCard);
}

export function getCard(sessionId: string): Promise<CoachCard> {
  return call(`/api/sessions/${encodeURIComponent(sessionId)}/card`, { method: "GET" }, CoachCard);
}
