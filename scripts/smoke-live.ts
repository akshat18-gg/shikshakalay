/**
 * End-to-end check of a running site (local or live). Prints each step; exits 1 on the first failure.
 *
 *   npm run smoke:live                                   → PUBLIC_BASE_URL from .env.local
 *   npm run smoke:live -- --url https://<app>.onrender.com
 *   npm run smoke:live -- --full                         → also ends the lesson and checks the card
 *
 * Steps: healthz → version → log in as teacher_demo → start a lesson → "What is 52 minus 27?" →
 * Ravi 35, Arjun 35, Meena 26. Prints no secrets (the PIN and cookie never reach the output).
 */
import { CoachCard, StartLessonResult, TurnResult } from "../src/lib/contracts";

const COLD_START_MS = 90_000; // a sleeping Render free instance can take ~1 minute to wake up
const STEP_MS = 30_000;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const base = (arg("url") ?? process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const full = process.argv.includes("--full");
const pin = process.env.DEMO_PIN ?? "1234";
let cookie = "";

async function step<T>(name: string, run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const value = await run();
    console.log(`✓ ${name} (${Date.now() - started} ms)`);
    return value;
  } catch (err) {
    console.log(`✗ ${name} (${Date.now() - started} ms): ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function request(path: string, init: RequestInit = {}, timeoutMs = STEP_MS): Promise<Response> {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  return fetch(base + path, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
}

async function expectOk(res: Response): Promise<unknown> {
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const ref = res.headers.get("x-request-id");
    throw new Error(`HTTP ${res.status} ${JSON.stringify(body)}${ref ? ` (request id ${ref})` : ""}`);
  }
  return body;
}

function expectSays(turn: TurnResult, child: string, number: string) {
  const line = turn.lines.find((l) => l.child === child);
  if (!line?.text.includes(number))
    throw new Error(`${child} should say ${number}, said ${JSON.stringify(line?.text)}`);
}

async function main() {
  console.log(`Smoke test → ${base}${full ? " (full)" : ""}`);

  await step("healthz says ok", async () => {
    const res = await request("/api/healthz", {}, COLD_START_MS);
    const text = await res.text();
    if (res.status !== 200 || text !== "ok") throw new Error(`HTTP ${res.status} ${text.slice(0, 80)}`);
  });

  await step("version", async () => {
    const body = (await expectOk(await request("/api/version"))) as { commit?: string };
    if (!body.commit) throw new Error("no commit in the answer");
    console.log(`  live commit: ${body.commit}`);
  });

  await step("log in as teacher_demo", async () => {
    const res = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "teacher_demo", pin }),
    });
    // Until logins exist (P2-T3) the route is missing and mock mode treats everyone as teacher_demo.
    if (res.status === 404) return console.log("  (no login route yet — mock mode, skipped)");
    await expectOk(res);
    const set = res.headers.get("set-cookie");
    if (!set) throw new Error("no session cookie");
    cookie = set.split(";")[0];
  });

  const lesson = await step("start a lesson", async () =>
    StartLessonResult.parse(
      await expectOk(
        await request("/api/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scenarioId: "sub_2digit", lang: "en" }),
        }),
      ),
    ),
  );

  await step('"What is 52 minus 27?" → Ravi 35, Arjun 35, Meena 26', async () => {
    const form = new FormData();
    form.append("text", "What is 52 minus 27?");
    form.append("idempotencyKey", crypto.randomUUID());
    const turn = TurnResult.parse(
      await expectOk(await request(`/api/sessions/${lesson.sessionId}/turns`, { method: "POST", body: form })),
    );
    expectSays(turn, "ravi", "35");
    expectSays(turn, "arjun", "35");
    expectSays(turn, "meena", "26");
    console.log(`  reply took ${turn.ms} ms on the server`);
  });

  if (full) {
    await step("end the lesson → coaching card", async () => {
      const card = CoachCard.parse(
        await expectOk(await request(`/api/sessions/${lesson.sessionId}/end`, { method: "POST" }, 60_000)),
      );
      if (!card.sayTomorrow) throw new Error("the card has no 'say tomorrow' line");
    });
    await step("card can be read again", async () => {
      CoachCard.parse(await expectOk(await request(`/api/sessions/${lesson.sessionId}/card`)));
    });
  }

  console.log("All good.");
}

void main();
