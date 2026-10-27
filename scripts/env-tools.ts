/**
 * Small helper for .env.local that NEVER prints secret values.
 *
 *   npm run env:init   → creates .env.local from .env.example (if missing) and fills
 *                        SESSION_SECRET and CRON_SECRET with random values (if empty)
 *   npm run env:check  → lists every key from .env.example as set / missing, with simple checks
 *
 * Why: the coding agent is not allowed to read .env.local (see .claude/settings.json).
 * This script lets it check what is missing without ever seeing a key.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const EXAMPLE = ".env.example";
const LOCAL = ".env.local";

/** Keys whose values are not secret, so we may show them. Everything else stays hidden. */
const SHOW_VALUE = new Set([
  "USE_MOCKS",
  "PUBLIC_BASE_URL",
  "TURNS_PER_HOUR_LIMIT",
  "AI_DAILY_BUDGET_USD",
  "DIRECTOR_MODEL",
  "CHILD_MODEL",
  "COACH_MODEL",
  "EVAL_GEN_MODEL",
  "AZURE_SPEECH_REGION",
  "TWILIO_WHATSAPP_FROM",
]);

/** Keys nothing needs today (shown as "optional", not counted as missing). Azure: only if a key ever arrives. */
const OPTIONAL: Record<string, string> = {
  AZURE_SPEECH_KEY: "only if we switch voices to Azure (Sarvam Bulbul is used)",
  AZURE_SPEECH_REGION: "only with AZURE_SPEECH_KEY",
};

/** What each key is needed for (shown when it is missing). */
const NEEDED_FOR: Record<string, string> = {
  ANTHROPIC_API_KEY: "real engine (USE_MOCKS=0)",
  DATABASE_URL: "real engine — Neon DEV branch, pooled URL",
  DATABASE_URL_PROD: "db:push:prod / db:seed:prod — Neon MAIN branch, pooled URL (local only)",
  SESSION_SECRET: "logins (run npm run env:init)",
  SARVAM_API_KEY: "voice: speech-to-text (Saaras) and every voice (Bulbul)",
  TWILIO_ACCOUNT_SID: "WhatsApp",
  TWILIO_AUTH_TOKEN: "WhatsApp",
  TWILIO_SANDBOX_JOIN_CODE: "WhatsApp messages",
  CRON_SECRET: "background sweep (run npm run env:init)",
};

type Line = { key: string | null; value: string; comment: string; raw: string };

/** Splits "KEY=value   # comment" into parts. Quoted values keep their # characters. */
function parse(text: string): Line[] {
  return text.split("\n").map((raw) => {
    const m = raw.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
    if (!m) return { key: null, value: "", comment: "", raw };
    const rest = m[2];
    let value = rest;
    let comment = "";
    const trimmed = rest.trim();
    if (!trimmed.startsWith('"') && !trimmed.startsWith("'")) {
      const hash = rest.search(/(^|\s)#/);
      if (hash >= 0) {
        value = rest.slice(0, hash);
        comment = rest.slice(hash).trim();
      }
    }
    return { key: m[1], value: value.trim().replace(/^["']|["']$/g, ""), comment, raw };
  });
}

function toMap(lines: Line[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const l of lines) if (l.key) map.set(l.key, l.value);
  return map;
}

function looksLikePlaceholder(key: string, value: string): boolean {
  return /USER:PASSWORD|your-code-here|<|>/.test(value) || (key === "DATABASE_URL" && value.includes("HOST-pooler"));
}

/** Simple, value-free checks for a few keys. Returns a short note. */
function note(key: string, value: string, all: Map<string, string>): string {
  if (key.startsWith("DATABASE_URL")) {
    const parts: string[] = [];
    parts.push(value.includes("-pooler") ? "pooled ✓" : "NOT pooled ✗ (use the -pooler host)");
    parts.push(value.includes("sslmode=require") ? "ssl ✓" : "add ?sslmode=require ✗");
    if (key === "DATABASE_URL" && all.get("DATABASE_URL_PROD") === value)
      parts.push("SAME as prod ✗ (use the dev branch)");
    return parts.join(", ");
  }
  if (key === "ANTHROPIC_API_KEY") return value.startsWith("sk-ant-") ? "format ✓" : "does not start with sk-ant- ✗";
  if (key === "TWILIO_ACCOUNT_SID") return value.startsWith("AC") ? "format ✓" : "should start with AC ✗";
  if (key === "PUBLIC_BASE_URL") return value.endsWith("/") ? "remove the trailing slash ✗" : "";
  if (key === "SESSION_SECRET" || key === "CRON_SECRET")
    return value.length >= 32 ? "long enough ✓" : "too short ✗ (32+ chars)";
  return "";
}

function init() {
  if (!existsSync(EXAMPLE)) throw new Error(`${EXAMPLE} not found — run this from the repo root.`);
  if (!existsSync(LOCAL)) {
    writeFileSync(LOCAL, readFileSync(EXAMPLE, "utf8"));
    console.log(`created ${LOCAL} from ${EXAMPLE}`);
  }
  const lines = parse(readFileSync(LOCAL, "utf8"));
  let filled = 0;
  const out = lines.map((l) => {
    if ((l.key === "SESSION_SECRET" || l.key === "CRON_SECRET") && l.value === "") {
      filled++;
      console.log(`filled ${l.key} with a random value (hidden)`);
      return `${l.key}=${randomBytes(32).toString("hex")}${l.comment ? `   ${l.comment}` : ""}`;
    }
    return l.raw;
  });
  if (filled > 0) writeFileSync(LOCAL, out.join("\n"));
  console.log(filled > 0 ? "done" : "nothing to fill — existing values were kept");
}

function check() {
  if (!existsSync(LOCAL)) {
    console.log(`${LOCAL} is missing — run: npm run env:init`);
    process.exitCode = 1;
    return;
  }
  const example = parse(readFileSync(EXAMPLE, "utf8")).filter((l) => l.key);
  const local = toMap(parse(readFileSync(LOCAL, "utf8")));
  const mocks = local.get("USE_MOCKS") === "1";
  console.log(`${LOCAL} check — values are never shown. Mode: ${mocks ? "MOCK (no keys needed)" : "REAL"}\n`);
  let missing = 0;
  for (const { key } of example) {
    if (!key) continue;
    const value = local.get(key) ?? "";
    let status: string;
    if ((value === "" || looksLikePlaceholder(key, value)) && OPTIONAL[key]) {
      status = `optional  ${OPTIONAL[key]}`;
    } else if (value === "" || looksLikePlaceholder(key, value)) {
      status = `MISSING   needed for: ${NEEDED_FOR[key] ?? "—"}`;
      missing++;
    } else if (SHOW_VALUE.has(key)) {
      status = `set = ${value} ${note(key, value, local)}`.trim();
    } else {
      status = `set ${note(key, value, local)}`.trim();
    }
    console.log(`  ${key.padEnd(26)} ${status}`);
  }
  const extra = [...local.keys()].filter((k) => !example.some((l) => l.key === k));
  if (extra.length)
    console.log(`\n  In ${LOCAL} but not in ${EXAMPLE}: ${extra.join(", ")} — add the NAME to ${EXAMPLE}.`);
  console.log(`\n${missing} missing. ${mocks ? "Fine for mock mode." : "Fill the ones the current phase needs."}`);
}

const cmd = process.argv[2];
if (cmd === "init") init();
else if (cmd === "check") check();
else {
  console.log("usage: tsx scripts/env-tools.ts init|check");
  process.exitCode = 1;
}
