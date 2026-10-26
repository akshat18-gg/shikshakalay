/**
 * Server environment check. Runs once when the server starts (src/instrumentation.ts) and at the top of scripts —
 * never at import time, because `next build` in CI has no keys.
 *
 * Mock mode (USE_MOCKS=1) needs only SESSION_SECRET and DEMO_PIN. Real mode also needs the Claude key and the
 * database. Voice and WhatsApp keys are optional: without them those features switch off (text-only, no WhatsApp).
 * A missing required key throws ONE message that lists every missing name — and never a value.
 */
import { z } from "zod";

/** An empty `KEY=` line in .env counts as missing, not as an empty string. */
const optional = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());
const required = z.preprocess((v) => (v === "" ? undefined : v), z.string());

const Shared = z.object({
  USE_MOCKS: z.enum(["0", "1"]).default("0"),
  SESSION_SECRET: required.pipe(z.string().min(32, "must be 32+ characters")),
  DEMO_PIN: required.pipe(z.string().regex(/^\d{4}$/, "must be 4 digits")),
  PUBLIC_BASE_URL: optional,
  TURNS_PER_HOUR_LIMIT: z.coerce.number().int().positive().default(40),
  AI_DAILY_BUDGET_USD: z.coerce.number().positive().default(10),
  DIRECTOR_MODEL: z.string().default("claude-haiku-5-5"),
  CHILD_MODEL: z.string().default("claude-haiku-5-5"),
  COACH_MODEL: z.string().default("claude-sonnet-5-5"),
  EVAL_GEN_MODEL: z.string().default("claude-opus-5-5"),
  ANTHROPIC_API_KEY: optional,
  DATABASE_URL: optional,
  SARVAM_API_KEY: optional,
  AZURE_SPEECH_KEY: optional,
  AZURE_SPEECH_REGION: optional,
  TWILIO_ACCOUNT_SID: optional,
  TWILIO_AUTH_TOKEN: optional,
  TWILIO_WHATSAPP_FROM: optional,
  TWILIO_SANDBOX_JOIN_CODE: optional,
  CRON_SECRET: optional,
  RENDER_GIT_COMMIT: optional,
});

const Real = Shared.extend({
  ANTHROPIC_API_KEY: required,
  // .env.example ships a placeholder URL; treat it as missing.
  DATABASE_URL: required.pipe(z.string().refine((v) => !v.includes("USER:PASSWORD@HOST"), "is still the placeholder")),
});

export type ServerEnv = z.infer<typeof Shared>;

export class EnvError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Environment check failed: ${problems.join("; ")}. Run \`npm run env:check\` to see what is missing.`);
    this.name = "EnvError";
  }
}

export function checkEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const schema = source.USE_MOCKS === "1" ? Shared : Real;
  const r = schema.safeParse(source);
  if (r.success) return r.data;
  const problems = r.error.issues.map((i) => {
    const name = String(i.path[0] ?? "?");
    return i.code === "invalid_type" ? `${name} is missing` : `${name} ${i.message}`;
  });
  throw new EnvError([...new Set(problems)]);
}

/** Which optional features are on — logged at start-up so a missing key is visible, not a silent failure. */
export function features(env: ServerEnv) {
  return {
    mode: env.USE_MOCKS === "1" ? "mock" : "real",
    voiceIn: Boolean(env.SARVAM_API_KEY),
    voiceOut: Boolean(env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION),
    whatsapp: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
  };
}
