import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logError, maskPersonal } from "@/lib/log";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logError", () => {
  it("never writes a failed query's parameters (teacher words) to the log", () => {
    vi.stubEnv("LOG_SILENT", "0");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = Object.assign(new Error("duplicate key value"), { code: "23505" });
    logError("x", new DrizzleQueryError("insert into turns values ($1)", ["Ravi, my number is 98765 43210"], cause));
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).not.toContain("98765");
    expect(JSON.parse(line)).toMatchObject({
      evt: "x",
      error: "database query failed: duplicate key value",
      dbCode: "23505",
    });
  });

  it("masks phone numbers and emails that an outside service repeats in its error", () => {
    vi.stubEnv("LOG_SILENT", "0");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError(
      "wa_send_failed",
      new Error("Twilio HTTP 400 21211 The 'To' number whatsapp:+91 98765 43210 is not valid"),
    );
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).not.toMatch(/98765|43210/);
    expect(line).toContain("[phone]");
  });
});

describe("maskPersonal", () => {
  it("masks numbers and emails but keeps request ids, dates and small numbers", () => {
    expect(maskPersonal("call +919876543210 or 98765-43210, mail a.b@x.co.in")).toBe(
      "call [phone] or [phone], mail [email]",
    );
    const id = "8ad2f358-d61c-4b69-91d4-c5d41cc195ff";
    expect(maskPersonal(`${id} 2026-10-30 took 1234 ms, 52 - 27 = 35`)).toBe(
      `${id} 2026-10-30 took 1234 ms, 52 - 27 = 35`,
    );
  });
});
