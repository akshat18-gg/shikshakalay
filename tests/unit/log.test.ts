import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logError } from "@/lib/log";

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
});
