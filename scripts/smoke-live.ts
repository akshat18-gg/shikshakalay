/**
 * End-to-end check of a running site (local or live). Prints each step; exits 1 on the first failure.
 *
 *   npm run smoke:live                                   → PUBLIC_BASE_URL from .env.local
 *   npm run smoke:live -- --url https://<app>.onrender.com
 *   npm run smoke:live -- --full                         → also ends the lesson and checks the card
 *   npm run smoke:live -- --lesson                       → also "Say 25" (they parrot) → "43 − 18?" (35 again) + a retry
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
const lesson = process.argv.includes("--lesson");
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
    await expectOk(res);
    const set = res.headers.get("set-cookie");
    if (!set) throw new Error("no session cookie");
    cookie = set.split(";")[0];
  });

  const started = await step("start a lesson", async () =>
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

  const sendTurn = async (text: string, key = crypto.randomUUID()) => {
    const form = new FormData();
    form.append("text", text);
    form.append("idempotencyKey", key);
    return TurnResult.parse(
      await expectOk(await request(`/api/sessions/${started.sessionId}/turns`, { method: "POST", body: form })),
    );
  };

  await step('"What is 52 minus 27?" → Ravi 35, Arjun 35, Meena 26', async () => {
    const turn = await sendTurn("What is 52 minus 27?");
    expectSays(turn, "ravi", "35");
    expectSays(turn, "arjun", "35");
    expectSays(turn, "meena", "26");
    console.log(`  reply took ${turn.ms} ms on the server`);
  });

  if (lesson) {
    await step('"No, it is 25. Everyone say 25." → they say 25', async () => {
      const turn = await sendTurn("No, it is 25. Everyone say 25.");
      for (const child of ["ravi", "arjun", "meena"]) expectSays(turn, child, "25");
    });
    await step('"Now 43 minus 18?" → Ravi and Arjun say 35 again', async () => {
      const key = crypto.randomUUID();
      const turn = await sendTurn("Now 43 minus 18?", key);
      expectSays(turn, "ravi", "35");
      expectSays(turn, "arjun", "35");
      const again = await sendTurn("Now 43 minus 18?", key);
      if (again.turn !== turn.turn || JSON.stringify(again.lines) !== JSON.stringify(turn.lines)) {
        throw new Error("a retry with the same key gave a different answer");
      }
      console.log("  (a retry with the same key returned the same turn)");
    });
  }

  if (full) {
    await step("end the lesson → coaching card", async () => {
      const card = CoachCard.parse(
        await expectOk(await request(`/api/sessions/${started.sessionId}/end`, { method: "POST" }, 60_000)),
      );
      if (!card.sayTomorrow) throw new Error("the card has no 'say tomorrow' line");
    });
    await step("card can be read again", async () => {
      CoachCard.parse(await expectOk(await request(`/api/sessions/${started.sessionId}/card`)));
    });
  }

  console.log("All good.");
}

void main();
