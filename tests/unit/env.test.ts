import { describe, expect, it } from "vitest";
import { EnvError, checkEnv, features } from "@/lib/env";

const SECRET = "x".repeat(40);
const mockEnv = { USE_MOCKS: "1", SESSION_SECRET: SECRET, DEMO_PIN: "1234" };

function problemsOf(env: Record<string, string>): string[] {
  try {
    checkEnv(env);
  } catch (e) {
    if (e instanceof EnvError) return e.problems;
    throw e;
  }
  return [];
}

describe("checkEnv", () => {
  it("mock mode needs only SESSION_SECRET and DEMO_PIN", () => {
    const env = checkEnv(mockEnv);
    expect(features(env)).toEqual({ mode: "mock", voiceIn: false, voiceOut: false, whatsapp: false });
    expect(env.TURNS_PER_HOUR_LIMIT).toBe(40);
  });

  it("lists every missing name at once, and an empty value counts as missing", () => {
    expect(problemsOf({ USE_MOCKS: "1", SESSION_SECRET: "", DEMO_PIN: "12" })).toEqual([
      "SESSION_SECRET is missing",
      "DEMO_PIN must be 4 digits",
    ]);
  });

  it("real mode also needs the Claude key and a real database URL", () => {
    expect(problemsOf({ ...mockEnv, USE_MOCKS: "0" })).toEqual([
      "ANTHROPIC_API_KEY is missing",
      "DATABASE_URL is missing",
    ]);
    const placeholder = "postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DB";
    expect(problemsOf({ ...mockEnv, USE_MOCKS: "0", ANTHROPIC_API_KEY: "k", DATABASE_URL: placeholder })).toEqual([
      "DATABASE_URL is still the placeholder",
    ]);
  });

  it("never puts a value in the error message", () => {
    try {
      checkEnv({ USE_MOCKS: "0", SESSION_SECRET: "short-secret-value", DEMO_PIN: "1234" });
      expect.unreachable();
    } catch (e) {
      expect(String(e)).not.toContain("short-secret-value");
      expect(String(e)).toContain("SESSION_SECRET must be 32+ characters");
    }
  });
});
