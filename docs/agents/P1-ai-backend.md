# P1 · AI & backend — starter prompt for your coding agent

> **SOLO MODE (from Mon 26 Oct):** this file is now a **task spec**. Use only the "Tasks" section, in the order
> given by `docs/solo/IMPLEMENTATION_PLAN.md`. Ignore "You own / Don't edit / How to work with me / First message /
> Daily restart" and the dates — `docs/solo/MASTER_PROMPT.md` replaces them.

> **How to use:** open your coding agent in the `shikshakalay` repo folder and paste everything below the
> line. Each morning, start a fresh session with the "Daily restart" message at the bottom.
> Your agent must read `AGENTS.md` first (Claude Code does this through `CLAUDE.md`).

---

You are the coding agent for **P1 — AI & backend** on **Shikshakalay**, a hackathon project (deadline Sun
1 Nov 2026, we submit by 6 pm IST). Today is Sat 24 Oct 2026. Before anything else, read `AGENTS.md` in the
repo root completely — it is the shared context for all three people's agents. Then read
`src/lib/contracts.ts`, `src/lib/mocks/lesson.ts`, `src/lib/ai/claude.ts`, `src/lib/db/schema/*.ts` and
`content/scenarios/sub_2digit.yaml`.

## Your job in one line

Make the lesson "think": the mind-state engine, the Director, the Children, the Coach, the guardrails, the
database, the lesson API, the eval runner and the Render deploy. **The engine decides every child's answer
in plain TypeScript; Claude only writes the words.** Never break that.

## You own (edit freely)

`src/lib/engine/`, `src/lib/ai/`, `src/lib/mocks/lesson.ts`, `src/lib/db/client.ts`,
`src/lib/db/schema/core.ts`, `src/lib/http.ts`, `src/app/api/sessions/`, `src/app/api/scenarios/`,
`src/app/api/healthz/`, `tests/unit/` (engine, guardrails, API tests), `evals/run.ts`, `evals/report.ts`,
`evals/results/`, `scripts/seed.ts`, `drizzle.config.ts`, `vitest.config.mts`, the README (Fri), Render.

## Don't edit (ask your human to ask the owner)

P2: `src/app/` pages, `src/components/`, `src/lib/auth/`, `src/lib/db/schema/auth.ts`, `src/lib/db/queries/`,
`src/proxy.ts`, `.github/`. P3: `content/`, `src/lib/voice/`, `src/lib/media/`, `src/lib/channels/`,
`src/lib/jobs/`, `src/lib/db/schema/whatsapp.ts`, `src/app/api/{whatsapp,media,cron}/`, `evals/generate.ts`,
`evals/lessons/`. Shared: `src/lib/contracts.ts` (only via a PR all three approve), `package.json` (packages
in their own small PR).

## What others need from you, and when

| Thing | Who needs it | By |
|---|---|---|
| Mock-backed API routes + `@/lib/engine` switch | P2 (screens), P3 (WhatsApp) | **Sat 24, within 1–2 hours** |
| Live Render URL (`/api/healthz` → ok) | everyone | Sat 24 night (H1) |
| Real `runTurn()` on typed text | P2, P3 | Sun 25 night (H2) |
| Real voice in `runTurn()` + coaching card | P2, P3 | Mon 26 night (H3) |
| Seeded demo data (dashboards look full) | P2 | Tue 27 |
| Eval numbers | team (deck) | Wed 28 first, Fri 30 final |

## How to work with me (your human)

- Work **one task at a time**, in order. Before starting a task: say in 2–3 lines what you'll do and which
  files you'll touch. Then do it.
- Branch per task: `p1/<short-name>`. Small commits. Before you say "done": run
  `npm run lint && npm run typecheck && npm test` and show me the result. Suggest a PR title and body.
- Never call paid APIs in unit tests (fake Claude/Sarvam/Azure). Real calls only in scripts I run myself.
- If something in AGENTS.md seems wrong or blocks you, stop and tell me — don't silently work around it.
- When you finish a task, stop and wait for me.

## Tasks, in order (each line = one PR unless noted)

### Sat 24 Oct — right after the kickoff

**Task 0 · Mock-backed API so P2 and P3 can start (do this first, ~1 hour)**
- `src/lib/http.ts`: `json(data, status=200)` and `apiError(code: ApiErrorCode, message: string, status: number)`
  returning `Response` with the `ApiError` body. A small `statusFor(code)` map is fine.
- `src/lib/engine/index.ts`: export `startLesson`, `runTurn`, `endLesson`, `getSession` of the contract types. If
  `process.env.USE_MOCKS === "1"` → the mock functions from `src/lib/mocks/lesson.ts`; otherwise the real
  ones from `orchestrator.ts` (for now a stub that throws `new Error("engine not built yet")`).
  Choose at call time (read the env var inside the function), not at import time.
- Routes (Next.js 16: `params` is a Promise; use `Request`/`Response`):
  - `GET /api/healthz` → `ok` (no DB).
  - `GET /api/scenarios` → `ScenarioSummary[]` (hard-code sub_2digit for now; later read the YAML).
  - `POST /api/sessions` → parse `StartLessonBody` → `startLesson(user.id, body, "web")`.
  - `GET /api/sessions/[id]` → `getSession(id)` → `SessionView` (drop `userId` from the response; 403 if it isn't
    the user's lesson and the user isn't admin; the mock already remembers turns).
  - `POST /api/sessions/[id]/turns` → multipart: `text?`, `audio?` (File), `idempotencyKey` (validate with
    `TurnFields`) → `runTurn(id, { text, audio, idempotencyKey }, "web")`. Audio: `Buffer.from(await file.arrayBuffer())`,
    mime = `file.type`; reject files over 2 MB with `413 audio_too_long`.
  - `POST /api/sessions/[id]/end` → `endLesson(id)` → `CoachCard`. `GET /api/sessions/[id]/card` → same card.
- Auth: call `getUser()` from `@/lib/auth` (P2's file; a stub that returns `teacher_demo` in mock mode is
  already there). No user → `401 unauthorized`.
- Test: a Vitest test that calls the route handlers directly with `new Request(...)` in mock mode.
- Done when: with `USE_MOCKS=1`, `curl -X POST localhost:3000/api/sessions -H 'content-type: application/json' -d '{"scenarioId":"sub_2digit","lang":"hi"}'` returns the Hindi hello. Tell P2 and P3 it's merged.

**Task 1 · Database on Neon**
- Create the Neon project (free; pick Singapore or the closest region). Use the **pooled** connection string in
  `.env.local` as `DATABASE_URL`.
- Review `src/lib/db/schema/core.ts` (starter) against AGENTS.md section 10; adjust if needed. Run
  `npm run db:push` (only you run it on the shared database). Check the 13 tables in the Neon console.
- Done when: tables exist; `db/client.ts` connects (a tiny `scripts/db-ping.ts` that runs `select 1` is enough).

**Task 2 · The children's mistakes: `src/lib/engine/bugs.ts` + `tests/unit/bugs.test.ts`**
- `smallerFromLarger`, `borrowNoDecrement`, `countBackOffByOne` (code in AGENTS.md 7.2) and a registry
  `BUGS: Record<string, (a, b) => number>`.
- `explainSteps(bug: string | null, a, b): string[]` — the child's wrong steps (or correct steps when bug is null).
- `parseSum("43-18") → [43, 18] | null` (two 2-digit numbers, `a > b`; accept `-`, `−`, spaces).
- Tests: each bug on 10 sums worked out by hand (52−27, 43−18, 61−24, 70−35, 84−59, 92−46, …).
- Done when: Vitest green — 52−27 gives Ravi 35, Arjun 35, Meena 26; 61−24 gives 43, 47, 38.

**Task 3 · The rules: `engine/types.ts`, `engine/mindState.ts`, `engine/speakers.ts` + tests**
- `EngineState` (AGENTS.md 7.8). Pure functions: `applyMove(state, director) → state` (steps 1–4 of 7.4),
  `beliefAnswer(child, sum)`, `spokenAnswer(child, sum, parrots)`, `pickSpeakers(state, director) → { child, mode, mustSay }[]` (7.5).
- Tests: every rule in 7.4 (e.g. `tell_answer` never changes a mistake; a fix without a reveal stops at WOBBLY;
  `think_aloud` never reaches GOT_IT; engagement never goes below 0 or above 3; Sana at engagement 0 stays
  silent until `invite_quiet_child`), and **Ravi's 7-turn table** (beliefs 35, 35, 35, 35, 25, 25, 37; spoken
  35, 25, 35, 35, 25, 25, 37) using hand-made `DirectorOutput`s.
- Done when: all green, no Claude involved.

**Task 4 · Render (H1)**
- Render → New → Web Service → this GitHub repo, branch `main`, region **Singapore**, instance **Free**.
  Build `npm ci && npm run build`, start `npm start`, health check path `/api/healthz`.
  Env vars: `USE_MOCKS=1`, `SESSION_SECRET`, `DEMO_PIN`, `PUBLIC_BASE_URL` (the onrender URL). Node 22 comes
  from `engines` in package.json. **Don't set `NODE_ENV`** (npm would skip dev dependencies and the build fails).
- If the free instance runs out of memory, add `output: "standalone"` to `next.config.ts` and change start to
  `node .next/standalone/server.js` (copy `public` and `.next/static` as the Next docs say) — only if needed.
- Ask P3 to point UptimeRobot at `/api/cron/sweep?key=…` once that route exists; until then `/api/healthz`.
- Done when: the live URL answers `ok` and the mock lesson works through the live API. **H1.**

### Sun 25 Oct — the lesson brain (goal H2: a typed lesson on the real engine)

**Task 5 · Claude helper with logging: `ai/claude.ts`, `ai/pricing.ts`**
- Finish the starter: insert one `ai_calls` row per call (purpose, provider "anthropic", model, promptVersion,
  tokens incl. cache read/write, ms, costUsd, ok/error, sessionId, turn). Log failures too, then rethrow.
- `pricing.ts`: per-model prices in one object (look them up on the Anthropic pricing page; cache reads and
  writes are priced differently from normal input — include them).
- Make the Claude client injectable (e.g. `askJson` takes an optional `client`) so tests can fake it.
- Done when: a script (`scripts/claude-smoke.ts`, run by me) gets a valid `DirectorOutput` from Haiku 5.5 and a row
  appears in `ai_calls`.

**Task 6 · Load the lesson file: `engine/scenario.ts`**
- Read `content/scenarios/<id>.yaml` with `yaml` + `fs` (`path.join(process.cwd(), "content", "scenarios", …)`),
  validate with a Zod schema that matches AGENTS.md 7.1 (both languages complete, every `bug` exists in `BUGS`,
  every sum valid and needs borrowing). Cache it in memory.
- `GET /api/scenarios` now reads real files.
- Done when: `sub_2digit.yaml` loads; a test proves a broken file (missing Hindi backup line) throws a clear error.

**Task 7 · Director, Children, guardrails**
- Prompts in `src/lib/ai/prompts/director.ts`, `children.ts` — each exports `version` and a function that builds
  the `system` text (rules + lesson pack; make it long enough to be cached) and the `user` text
  (`<recent_turns>`, `<current_sum>`, `<speakers>`, `<teacher_said>…</teacher_said>`). Follow AGENTS.md 7.9 exactly.
- `engine/director.ts`: `tagMove(state, teacherText, recentTurns) → DirectorOutput` via `askJson(fast: true)`.
- `engine/children.ts`: `writeLines(state, speakers, teacherText, recentTurns) → ChildLine[]` — **one call for all
  speakers**; keep only lines for the listed speakers; a missing speaker gets a backup line.
- `engine/guardrails.ts`: `checkLine(line, mustSay, correct, state)` (AGENTS.md 7.10 — Devanagari digits,
  whole-number match, no drift to the correct answer, ≤ 30 words) and `fillBackup(lang, state, answer)`.
  Retry once for failing children only, with a stricter instruction ("Your line MUST contain 35 as digits. Do
  NOT say 25."), then the backup line. Record `passed`, `retries`, `usedBackup` per line.
- Use P3's `tests/fixtures/teacher_lines.json` (arrives Mon) to tune the Director; until then write 10 of your own.
- Done when: 20 real runs (script) → every final child line contains the engine's number; unit tests (with a fake
  Claude) cover pass, retry and backup.

**Task 8 · The turn: `engine/core.ts` + `engine/orchestrator.ts` + real routes (H2)**
- `core.ts`: pure `step(state, teacherText, deps) → { state, result }` — order of operations: end command →
  empty text → Director → low confidence = other → new sum → apply move → speakers → children → guardrails →
  turn count / lesson over. No DB, no HTTP inside. Unit-test it with fake `deps`.
- `orchestrator.ts`: `startLesson` (create session row with EngineState, hello turn from backup lines,
  `audioUrl` = `/audio/hello-<lang>.mp3`), `runTurn` (load session → check owner, status, rate limit
  `TURNS_PER_HOUR_LIMIT` → idempotency: same key → return the stored `turns.result` → text first:
  typed text, or `transcribe()` later → `step()` → save `turns` + `child_lines` + new state, bytes → return
  `TurnResult`), `endLesson` (Task 9).
- Trim teacher text to 1,000 characters. Mask phone numbers/emails before any console log.
- `GET /api/sessions/[id]` returns `SessionView` from the DB.
- Done when: with `USE_MOCKS=0`, P2's practice room plays "52 − 27?" → Ravi 35; "Say 25" → parrot; "43 − 18?" →
  35 again. **H2.**

### Mon 26 Oct — coach and voice (goal H3: a spoken Hindi lesson + card on the live link)

**Task 9 · Coach + quote check: `ai/prompts/coach.ts`, `engine/coach.ts`**
- Input: every turn with number, her exact words, move, states before/after, child lines; the 5 Teach elements;
  lang. Output `CoachCard` via `askJson` with `COACH_MODEL` (not fast).
- Quote check (AGENTS.md 7.10): normalise (NFKC, lower-case, strip punctuation `\p{P}`, collapse spaces); the quote
  must be inside her words of that turn, or ≥ 90% similar to a same-length window (small Levenshtein helper).
  One rewrite call listing the bad quotes with her real words; then drop failing `teachScores`; for strength/fix
  use her first ≤ 12 real words of that turn. Clamp scores to 1–5. Save `quotesVerified`, `droppedPoints`.
- `endLesson` is idempotent. Routes: `POST /end`, `GET /card`, `GET /card/audio` (P3's `speakText`, cache in `media`).
- Done when: a unit test proves a made-up quote never reaches the card; a full lesson ends with a card.

**Task 10 · Voice into the turn (pair with P3 for an hour)**
- In `runTurn`: audio → P3's `transcribe(audio, lang, scenario.keyterms)` (empty → "say again" path; error →
  `502 stt_failed`; too long → `413`). After `step()`: P3's `speakLines(lines, lang, channel === "whatsapp" ? "ogg" : "mp3")`
  → P3's `saveMedia()` → `audioUrl`. TTS failure → `audioUrl: null`, never fail the turn. Never store the teacher's audio.
- Log STT/TTS calls in `ai_calls` too (provider sarvam/azure, ms, ok).
- Done when: a spoken Hindi lesson works on the live link. **H3.**

**Task 11 · Speed**
- Measure `turns.ms` and per-call ms. Check prompt caching works: `cacheReadTokens > 0` from the second turn.
- Ideas if slow: start the Children call as soon as the engine is done; keep lines short; thinking off and
  effort low on Haiku; text first (the UI already shows text before audio).
- Done when: typical reply ≈ 8 s or less on the live link (target ≤ 6 s).

### Tue 27 Oct — MVP and the eval runner (goal H4)

**Task 12 · Seed script `scripts/seed.ts` (with P2)**
- Demo users `teacher_demo`, `trainer_demo`, `admin_demo` (PIN `DEMO_PIN`, hashed with P2's `hashPin` from
  `src/lib/auth/pin.ts`). 8 synthetic teachers `T01`–`T08` (`isDemo: true`), each with 2–4 scripted lessons run
  through `step()` with a **fake** Claude (no cost), plus cards — so the trainer dashboard shows ≥ 5 teachers and
  the AI trace page has data. Safe to run twice (upsert by code).
- Done when: a fresh database + `npm run db:seed` → every page looks full.

**Task 13 · Sana and engagement end to end**
- Sana (bug null, GOT_IT, engagement 0) speaks only after `invite_quiet_child`; scolding drops a child to silence.
- Done when: "Sana, what do you think? Take your time." makes her speak (EN and HI), and the trace shows engagement 0 → 1.

**Task 14 · `evals/run.ts` + `evals/report.ts`**
- Read `evals/lessons/*.json` (validate with `EvalLesson`; only `reviewed: true` count). Run each lesson through
  `step()` with real Claude, text only, no DB writes except the final `eval_runs` row. After the last turn add a
  probe turn ("Everyone, what is {finalSum}?") that bypasses the Director and makes every child answer.
- Compute (AGENTS.md 18): resist weak moves, teachable, Director accuracy + confusion table, line fidelity (first
  try / after fallback), quote validity (coach on a 20-lesson sample to save credits). Flags: `--limit`, `--lang`, `--kind`.
- Write `evals/results/<date>.json` and an `eval_runs` row with prompt versions. `report.ts` prints a table.
- Done when: works on 10 lessons. **H4 with the team.**

### Wed 28 – Fri 30 Oct — measure, fix, document

- **Wed:** run all 100 lessons, fix the top 3 failures (usually Director confusions — add examples to its prompt,
  bump the version), run P3's `evals/redteam.json`. **H5:** numbers on the admin page.
- **Thu:** skill 2 engine rules only if H4 and H5 are green; otherwise make skill 1 stronger. Fix the Hindi lines P3
  flagged (or switch `CHILD_MODEL` to Sonnet 5.5). **Feature freeze tonight.**
- **Fri:** final eval run for the deck. README: what it is, demo link + video link, demo logins + the 5 samples,
  how it works (diagram), **every AI service and model and its key** (Anthropic: Haiku 5.5 / Sonnet 5.5 / Opus 5.5
  for offline evals → `ANTHROPIC_API_KEY`; Sarvam Saaras v4 → `SARVAM_API_KEY`; Azure Neural TTS →
  `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`; Twilio → `TWILIO_*`), setup, run locally, tests, evals, privacy, the
  changes from the Ideate deck. Secret scan (gitleaks) with the team.
- **Sat 31:** code freeze — tag `v1.0-submission`, turn off Render auto-deploy, deploy the tag, smoke-test every role,
  write the commit hash in the README.

## First message

Read AGENTS.md and the files listed at the top. Then tell me in 5 bullet points how a turn flows through the
code you will build, and start **Task 0** on a branch `p1/mock-api`.

## Daily restart (paste each morning)

> Today is <day, date>. Pull `main`. Re-read AGENTS.md sections 0, 7 and 20 and `docs/agents/P1-ai-backend.md`.
> Tell me which P1 tasks look done in the code and which is next, then start the next one on a new branch.
