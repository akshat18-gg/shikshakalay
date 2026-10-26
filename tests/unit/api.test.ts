/**
 * The API routes in mock mode, called directly as functions (no server needed).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, CoachCard, SessionView, StartLessonResult, TurnResult } from "@/lib/contracts";
import { mockStartLesson } from "@/lib/mocks/lesson";
import { GET as healthz } from "@/app/api/healthz/route";
import { GET as version } from "@/app/api/version/route";
import { GET as scenarios } from "@/app/api/scenarios/route";
import { POST as start } from "@/app/api/sessions/route";
import { GET as getSession } from "@/app/api/sessions/[id]/route";
import { POST as turn } from "@/app/api/sessions/[id]/turns/route";
import { POST as end } from "@/app/api/sessions/[id]/end/route";
import { GET as card } from "@/app/api/sessions/[id]/card/route";

const BASE = "http://test.local";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function postJson(path: string, body: unknown) {
  return new Request(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postForm(path: string, fields: Record<string, string | Blob>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new Request(BASE + path, { method: "POST", body: form });
}

async function errorCode(res: Response) {
  return ApiError.parse(await res.json()).error.code;
}

async function startLesson(lang: "en" | "hi" = "en") {
  const res = await start(postJson("/api/sessions", { scenarioId: "sub_2digit", lang }), undefined);
  expect(res.status).toBe(201);
  return StartLessonResult.parse(await res.json());
}

function sendTurn(id: string, text: string) {
  return turn(postForm(`/api/sessions/${id}/turns`, { text, idempotencyKey: crypto.randomUUID() }), ctx(id));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("health and version", () => {
  it("healthz says ok", async () => {
    const res = healthz();
    expect(await res.text()).toBe("ok");
  });

  it("version shows the first 7 characters of the commit", async () => {
    expect(await version().json()).toEqual({ commit: "dev" });
    vi.stubEnv("RENDER_GIT_COMMIT", "abcdef1234567890");
    expect(await version().json()).toEqual({ commit: "abcdef1" });
  });
});

describe("lesson routes (mock mode)", () => {
  it("lists the scenarios", async () => {
    const res = await scenarios(new Request(BASE + "/api/scenarios"), undefined);
    const list = (await res.json()) as { id: string }[];
    expect(list.map((s) => s.id)).toEqual(["sub_2digit"]);
  });

  it("starts a Hindi lesson with the children's hello", async () => {
    const r = await startLesson("hi");
    expect(r.firstSum).toBe("52-27");
    expect(r.hello.lines[0]?.text).toContain("नमस्ते");
  });

  it("rejects unknown keys, bad JSON and unknown scenarios", async () => {
    const extra = await start(postJson("/api/sessions", { scenarioId: "sub_2digit", lang: "en", role: "admin" }), 0);
    expect(extra.status).toBe(400);
    const bad = await start(new Request(BASE + "/api/sessions", { method: "POST", body: "{nope" }), 0);
    expect(await errorCode(bad)).toBe("bad_request");
    const missing = await start(postJson("/api/sessions", { scenarioId: "nope", lang: "en" }), 0);
    expect(missing.status).toBe(404);
  });

  it("plays a turn, keeps it for reloads, ends with a card, then refuses more turns", async () => {
    const { sessionId } = await startLesson();

    const res = await sendTurn(sessionId, "What is 52 minus 27?");
    expect(res.status).toBe(200);
    const t1 = TurnResult.parse(await res.json());
    expect(t1.lines.find((l) => l.child === "ravi")?.text).toContain("35");

    const viewRes = await getSession(new Request(BASE), ctx(sessionId));
    const raw = (await viewRes.json()) as Record<string, unknown>;
    expect(raw).not.toHaveProperty("userId");
    expect(SessionView.parse(raw).turns).toHaveLength(2);

    expect((await card(new Request(BASE), ctx(sessionId))).status).toBe(404);

    const ended = await end(new Request(BASE, { method: "POST" }), ctx(sessionId));
    expect(CoachCard.parse(await ended.json()).fix.turn).toBe(2);
    expect((await card(new Request(BASE), ctx(sessionId))).status).toBe(200);
    expect((await end(new Request(BASE, { method: "POST" }), ctx(sessionId))).status).toBe(200); // idempotent

    const late = await sendTurn(sessionId, "One more?");
    expect(late.status).toBe(409);
    expect(await errorCode(late)).toBe("lesson_over");
  });

  it("answers 404 for a missing lesson and 403 for someone else's", async () => {
    expect((await getSession(new Request(BASE), ctx("does-not-exist"))).status).toBe(404);
    expect((await getSession(new Request(BASE), ctx("../../etc"))).status).toBe(404);

    const other = await mockStartLesson("another-teacher", { scenarioId: "sub_2digit", lang: "en" }, "web");
    const res = await getSession(new Request(BASE), ctx(other.sessionId));
    expect(res.status).toBe(403);
    expect(await errorCode(res)).toBe("forbidden");
    expect((await sendTurn(other.sessionId, "hello")).status).toBe(403);
    expect((await end(new Request(BASE, { method: "POST" }), ctx(other.sessionId))).status).toBe(403);
  });
});

describe("turn input", () => {
  it("needs text or audio and a real idempotency key", async () => {
    const { sessionId } = await startLesson();
    const path = `/api/sessions/${sessionId}/turns`;
    const empty = await turn(postForm(path, { idempotencyKey: crypto.randomUUID() }), ctx(sessionId));
    expect(empty.status).toBe(400);
    const shortKey = await turn(postForm(path, { text: "hi", idempotencyKey: "abc" }), ctx(sessionId));
    expect(shortKey.status).toBe(400);
    const unknown = await turn(
      postForm(path, { text: "hi", idempotencyKey: crypto.randomUUID(), userId: "x" }),
      ctx(sessionId),
    );
    expect(unknown.status).toBe(400);
    const notJson = await turn(postJson(path, { text: "hi" }), ctx(sessionId));
    expect(notJson.status).toBe(400);
  });

  it("accepts a short recording and refuses one over 2 MB or one that isn't audio", async () => {
    const { sessionId } = await startLesson();
    const path = `/api/sessions/${sessionId}/turns`;
    const ok = await turn(
      postForm(path, { audio: new Blob([new Uint8Array(1000)], { type: "audio/webm" }), idempotencyKey: "key-12345" }),
      ctx(sessionId),
    );
    expect(ok.status).toBe(200);
    const big = await turn(
      postForm(path, {
        audio: new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "audio/webm" }),
        idempotencyKey: "key-23456",
      }),
      ctx(sessionId),
    );
    expect(big.status).toBe(413);
    expect(await errorCode(big)).toBe("audio_too_long");
    const notAudio = await turn(
      postForm(path, { audio: new Blob(["<html>"], { type: "text/html" }), idempotencyKey: "key-34567" }),
      ctx(sessionId),
    );
    expect(notAudio.status).toBe(400);
  });
});

describe("real mode before logins exist", () => {
  it("answers 401 with a request id in the body and the header", async () => {
    vi.stubEnv("USE_MOCKS", "0");
    const res = await scenarios(
      new Request(BASE + "/api/scenarios", { headers: { "x-request-id": "req-12345678" } }),
      0,
    );
    expect(res.status).toBe(401);
    const body = ApiError.parse(await res.json());
    expect(body.error.requestId).toBe("req-12345678");
    expect(res.headers.get("x-request-id")).toBe("req-12345678");
  });
});
