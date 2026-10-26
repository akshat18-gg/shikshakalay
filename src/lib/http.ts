/**
 * Helpers every API route uses: JSON responses, the shared ApiError body, and withRoute(), which gives each
 * request an id, logs one line when it finishes and turns any thrown error into a friendly response.
 *
 * Routes stay thin: parse → check login and owner → call one function in src/lib → return json().
 * Anywhere in that chain, `throw new HttpError("forbidden", "…")` ends the request with the right status.
 */
import type { ZodType } from "zod";
import type { ApiError, ApiErrorCode } from "@/lib/contracts";
import { log, logError } from "@/lib/log";

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  lesson_over: 409,
  audio_too_long: 413,
  rate_limited: 429,
  stt_failed: 502,
  internal: 500,
};

export function statusFor(code: ApiErrorCode): number {
  return STATUS[code];
}

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  requestId?: string,
  status = statusFor(code),
  headers?: HeadersInit,
): Response {
  const body: ApiError = { error: { code, message, ...(requestId ? { requestId } : {}) } };
  return Response.json(body, { status, headers });
}

/** Thrown by route helpers to stop with a known error. withRoute() turns it into apiError(). */
export class HttpError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly headers?: HeadersInit,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Parses with a Zod schema; a failure becomes 400 bad_request (no schema details leak to the client). */
export function parseOr400<T>(schema: ZodType<T>, input: unknown, what = "request"): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new HttpError("bad_request", `The ${what} is not valid.`);
  return r.data;
}

/** Reads a JSON body; bad JSON becomes 400 instead of a crash. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError("bad_request", "The request body must be JSON.");
  }
}

const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** Reuses the caller's x-request-id when it looks safe (no log injection); otherwise makes a new one. */
export function requestIdFor(req: Request): string {
  const given = req.headers.get("x-request-id");
  return given && SAFE_ID.test(given) ? given : crypto.randomUUID();
}

/** What withRoute() hands to each handler. Set `user` once known, so the log line says who it was. */
export type RouteMeta = { requestId: string; user?: string };

/**
 * Wraps a route handler: request id → run → one log line → x-request-id header on the response.
 * Unknown errors are logged in full and answered with 500 internal + the id (never a stack trace).
 */
export function withRoute<C>(
  route: string,
  handler: (req: Request, ctx: C, meta: RouteMeta) => Promise<Response>,
): (req: Request, ctx: C) => Promise<Response> {
  return async (req, ctx) => {
    const started = Date.now();
    const meta: RouteMeta = { requestId: requestIdFor(req) };
    let res: Response;
    try {
      res = await handler(req, ctx, meta);
    } catch (err) {
      if (err instanceof HttpError) {
        res = apiError(err.code, err.message, meta.requestId, statusFor(err.code), err.headers);
      } else {
        logError("route_error", err, { route, method: req.method, requestId: meta.requestId, user: meta.user });
        res = apiError("internal", "Something went wrong on our side.", meta.requestId);
      }
    }
    res.headers.set("x-request-id", meta.requestId);
    log("request", {
      route,
      method: req.method,
      status: res.status,
      ms: Date.now() - started,
      requestId: meta.requestId,
      user: meta.user,
    });
    return res;
  };
}
