/**
 * Smoke test of every live module on a running site (local or live). For each module in src/lib/modules.ts marked
 * "live": log in as teacher_demo, start a lesson on its lesson file, ask the first task in natural English and check
 * that Ravi's line carries his mistake while Arjun's and Meena's lines carry the right answer. Both numbers come from
 * the engine's own functions (bugs.ts), so this script can never disagree with the engine about what "right" means.
 * Real Claude, ≈ $0.002 per module. Prints each step; exits 1 on the first failure.
 *
 *   npm run smoke:modules                                   → PUBLIC_BASE_URL from .env.local
 *   npm run smoke:modules -- --url http://localhost:3000
 *
 * Prints no secrets (the PIN and cookie never reach the output).
 */
import { StartLessonResult, TurnResult } from "../src/lib/contracts";
import { answerOf, answerWith } from "../src/lib/engine/bugs";
import { loadScenario } from "../src/lib/engine/scenario";
import { MODULES } from "../src/lib/modules";

const COLD_START_MS = 90_000; // a sleeping Render free instance can take ~1 minute to wake up
const STEP_MS = 30_000;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const base = (arg("url") ?? process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const pin = process.env.DEMO_PIN ?? "1234";
let cookie = "";

type Op = "add" | "sub" | "mul" | "div";
type Task = { text: string; op: Op; a: number; b: number };

/** How a teacher says each operation out loud. */
const SPOKEN: Record<Op, string> = { sub: "minus", add: "plus", mul: "times", div: "divided by" };
/** The signs a lesson file may use: canonical "-", "+", "x", "/" plus the look-alikes the engine also accepts. */
const SIGN_TO_OP: Record<string, Op> = {
  "-": "sub",
  "−": "sub",
  "–": "sub",
  "+": "add",
  x: "mul",
  X: "mul",
  "×": "mul",
  "*": "mul",
  "/": "div",
  "÷": "div",
  ":": "div",
};

/** Reads a lesson-file task like "52-27", "27+35", "3x4" or "12/3". */
function parseTask(text: string): Task {
  const m = /^(\d+)\s*([-−–+xX×*/÷:])\s*(\d+)$/.exec(text.trim());
  const op = m ? SIGN_TO_OP[m[2]] : undefined;
  if (!m || !op) throw new Error(`cannot read the task ${JSON.stringify(text)}`);
  return { text, op, a: Number(m[1]), b: Number(m[3]) };
}

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

/** The line must contain the number as a whole number: "5" inside "15" does not count. */
function expectSays(turn: TurnResult, child: string, number: number) {
  const line = turn.lines.find((l) => l.child === child);
  const whole = new RegExp(`(?<!\\d)${number}(?!\\d)`);
  if (!line || !whole.test(line.text))
    throw new Error(`${child} should say ${number}, said ${JSON.stringify(line?.text)}`);
}

async function logIn(code: string) {
  cookie = "";
  const res = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, pin }),
  });
  await expectOk(res);
  const set = res.headers.get("set-cookie");
  if (!set) throw new Error("no session cookie");
  cookie = set.split(";")[0];
}

async function startLesson(scenarioId: string): Promise<StartLessonResult> {
  return StartLessonResult.parse(
    await expectOk(
      await request("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId, lang: "en" }),
      }),
    ),
  );
}

async function sendTurn(sessionId: string, text: string): Promise<TurnResult> {
  const form = new FormData();
  form.append("text", text);
  form.append("idempotencyKey", crypto.randomUUID());
  return TurnResult.parse(
    await expectOk(await request(`/api/sessions/${sessionId}/turns`, { method: "POST", body: form })),
  );
}

async function main() {
  const live = MODULES.filter((m) => m.status === "live");
  console.log(`Module smoke test → ${base} (${live.length} live modules)`);

  await step("healthz says ok", async () => {
    const res = await request("/api/healthz", {}, COLD_START_MS);
    const text = await res.text();
    if (res.status !== 200 || text !== "ok") throw new Error(`HTTP ${res.status} ${text.slice(0, 80)}`);
  });

  await step("log in as teacher_demo", () => logIn("teacher_demo"));

  for (const m of live) {
    // What the engine says the children must answer on the module's first task.
    const { scenarioId, task, wrong, right } = await step(`${m.id}: lesson file and engine numbers`, async () => {
      if (!m.scenarioId) throw new Error("a live module needs a scenarioId");
      const scenario = loadScenario(m.scenarioId);
      if (!scenario) throw new Error(`content/scenarios/${m.scenarioId}.yaml is missing`);
      const task = parseTask(scenario.sums[0]);
      const ravi = scenario.children.find((c) => c.id === "ravi");
      if (!ravi?.bug) throw new Error("Ravi carries no mistake in this module");
      const wrong = answerWith(ravi.bug, task.a, task.b);
      const right = answerOf(task.op, task.a, task.b);
      if (wrong === right)
        throw new Error(`${task.text} does not show Ravi's mistake (${ravi.bug} also gives ${right})`);
      console.log(`  ${task.text}: Ravi (${ravi.bug}) → ${wrong}, correct → ${right}`);
      return { scenarioId: m.scenarioId, task, wrong, right };
    });

    const started = await step(`${m.id}: start a lesson on ${scenarioId}`, async () => {
      const result = await startLesson(scenarioId);
      // Compare the numbers, not the text: the server may print the task with a different sign (x vs ×).
      const got = parseTask(result.firstSum);
      if (got.op !== task.op || got.a !== task.a || got.b !== task.b)
        throw new Error(`the lesson started on ${result.firstSum}, the file says ${task.text}`);
      return result;
    });

    const question = `What is ${task.a} ${SPOKEN[task.op]} ${task.b}?`;
    await step(`${m.id}: "${question}" → Ravi ${wrong}, Arjun ${right}, Meena ${right}`, async () => {
      const turn = await sendTurn(started.sessionId, question);
      expectSays(turn, "ravi", wrong);
      expectSays(turn, "arjun", right);
      expectSays(turn, "meena", right);
      console.log(`  reply took ${turn.ms} ms on the server`);
    });
  }

  console.log("All good.");
}

void main();
