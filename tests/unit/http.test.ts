import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/contracts";
import { HttpError, apiError, requestIdFor, statusFor, withRoute } from "@/lib/http";

describe("apiError", () => {
  it("uses the shared body and the matching status", async () => {
    const res = apiError("rate_limited", "Let's take a break.", "rid-1");
    expect(res.status).toBe(429);
    expect(ApiError.parse(await res.json())).toEqual({
      error: { code: "rate_limited", message: "Let's take a break.", requestId: "rid-1" },
    });
    expect(statusFor("stt_failed")).toBe(502);
  });
});

describe("requestIdFor", () => {
  it("keeps a safe id from the caller and replaces anything odd", () => {
    const req = (id: string) => new Request("http://x", { headers: { "x-request-id": id } });
    expect(requestIdFor(req("abc-1234_5678"))).toBe("abc-1234_5678");
    expect(requestIdFor(req('bad"} {"evt":"fake"}'))).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestIdFor(new Request("http://x"))).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("withRoute", () => {
  it("turns an HttpError into its ApiError", async () => {
    const route = withRoute("t", async () => {
      throw new HttpError("forbidden", "Not yours.", { "retry-after": "60" });
    });
    const res = await route(new Request("http://x"), undefined);
    expect(res.status).toBe(403);
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("hides unknown errors behind 500 internal + the request id, with no stack trace", async () => {
    const route = withRoute("t", async () => {
      throw new Error("secret detail at /src/lib/db.ts:12");
    });
    const res = await route(new Request("http://x", { headers: { "x-request-id": "rid-abcdefgh" } }), undefined);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("secret detail");
    expect(text).not.toContain(".ts");
    expect(ApiError.parse(JSON.parse(text)).error).toMatchObject({ code: "internal", requestId: "rid-abcdefgh" });
  });
});
