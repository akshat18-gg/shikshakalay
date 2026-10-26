# P2 · Frontend — starter prompt for your coding agent

> **SOLO MODE (from Mon 26 Oct):** this file is now a **task spec**. Use only the "Design brief" and "Tasks"
> sections, in the order given by `docs/solo/IMPLEMENTATION_PLAN.md`. Ignore "You own / Don't edit / How to work
> with me / First message / Daily restart" and the dates — `docs/solo/MASTER_PROMPT.md` replaces them.

> **How to use:** open your coding agent in the `shikshakalay` repo folder and paste everything below the
> line. Each morning, start a fresh session with the "Daily restart" message at the bottom.
> Your agent must read `AGENTS.md` first (Claude Code does this through `CLAUDE.md`).
> The repo setup itself is in `docs/agents/00-KICKOFF.md` — do that with your team first (you drive it).

---

You are the coding agent for **P2 — Frontend** on **Shikshakalay**, a hackathon project (deadline Sun 1 Nov
2026, we submit by 6 pm IST). Today is Sat 24 Oct 2026. Before anything else, read `AGENTS.md` in the repo root
completely — it is the shared context for all three people's agents. Then read `src/lib/contracts.ts`,
`src/lib/mocks/lesson.ts`, `src/lib/auth/index.ts`, `src/lib/db/schema/auth.ts`, `content/i18n/en.json`,
`content/i18n/hi.json` and the shadcn components in `src/components/ui/`.

## Your job in one line

Make it usable for a nervous primary teacher on a cheap phone with a weak network: every screen, the voice
recorder, logins, the coaching card, dashboards, offline mode, Playwright tests, and the repo/CI setup.

## You own (edit freely)

`src/app/` (all pages, layouts, `globals.css`, `manifest.ts`) **except** `src/app/api/sessions/`,
`api/scenarios/`, `api/healthz/` (P1) and `api/whatsapp/`, `api/media/`, `api/cron/` (P3).
Also: `src/app/api/auth/`, `src/app/api/checkins/`, `src/app/api/feedback/`, `src/components/`, `src/lib/auth/`,
`src/lib/db/schema/auth.ts`, `src/lib/db/queries/`, `src/lib/i18n.ts`, `src/lib/api.ts` (browser fetch helpers),
`src/lib/mocks/dashboard.ts`, `src/proxy.ts`, `public/sw.js` + icons, `playwright.config.ts`, `tests/e2e/`, `.github/`.

## Don't edit (ask your human to ask the owner)

P1: `src/lib/engine/`, `src/lib/ai/`, `src/lib/mocks/lesson.ts`, `src/lib/db/client.ts`, `src/lib/db/schema/core.ts`,
`src/lib/http.ts`, P1's API folders. P3: `content/` (you *read* the i18n files; P3 owns the words), `src/lib/voice/`,
`src/lib/media/`, `src/lib/channels/`, `src/lib/jobs/`, `src/lib/db/schema/whatsapp.ts`, P3's API folders.
Shared: `src/lib/contracts.ts` (only via a PR all three approve), `package.json` (packages in their own small PR).
Need a new i18n key? Add it to **both** `en.json` and `hi.json` in your PR (English text + your best Hindi) and
tag P3 to check the wording — that's the one exception.

## What others need from you, and when

| Thing | Who needs it | By |
|---|---|---|
| Repo, CI, branch protection, CODEOWNERS, issues, board | everyone | Sat 24 (kickoff) |
| Practice room on the mock lesson | team demo, P1 testing | Sat 24 night (H1) |
| Real logins + `getUser()` / `requireUser()` + `hashPin()` | P1 (routes, seed), P3 | Sun 25 |
| Practice room on the real API, with voice | team | Sun 25 (typed, H2) · Mon 26 (voice, H3) |
| Trainer, AI trace, eval pages | judges | Tue 27 (H4) |
| Screenshots + screen recordings | P3 (video) | Fri 30 |

## How to work with me (your human)

- Work **one task at a time**, in order. Before starting: say in 2–3 lines what you'll do and which files you'll
  touch. Then do it.
- Branch per task: `p2/<short-name>`. Small commits. Before "done": run
  `npm run lint && npm run typecheck && npm test` and show me. For UI tasks, also tell me exactly what to click
  to check it on my phone. Suggest a PR title and body.
- Use only data shapes from `src/lib/contracts.ts`. Parse API responses with them (`TurnResult.parse(...)`).
- Every word on screen comes from `content/i18n/*.json` via `t()`. No hard-coded UI text.
- If something in AGENTS.md seems wrong or blocks you, stop and tell me.
- When you finish a task, stop and wait for me.

## Design brief

- **Users:** primary teachers (Classes 1–3) in Hindi- or English-medium schools, often on a 5-inch Android phone,
  sometimes on 2G. Many are not confident with apps. Judges will also open it on laptops.
- **Feel:** like WhatsApp — familiar, calm, friendly. Big tap targets (≥ 44 px), one main action per screen, short
  words, no jargon, no typing needed to finish a lesson.
- **Look:** square corners (`--radius: 0`), plain colours from our deck — navy `#0B2850` (headers, primary
  buttons), teal `#3A8E93` (accents, the teacher's bubbles), mint `#8FD3CD` (highlights), ink `#1B2833` (text),
  pale `#E5F2F1` (backgrounds), card `#F2F6F7`, red `#A23F37` (errors only). Map these onto the shadcn CSS variables
  in `globals.css`. Fonts: Noto Sans + Noto Sans Devanagari via `next/font/google` (replace Geist).
- **Each child has a colour and an initial avatar** (Ravi, Arjun, Meena, Sana). Captions under every audio.
- **Always text first, audio second.** If audio fails or is slow, the text is already there.

## Tasks, in order (each line = one PR unless noted)

### Sat 24 Oct — kickoff and the app shell (goal H1)

**Task 0 · Drive the kickoff** — follow `docs/agents/00-KICKOFF.md` with the team (the humans run the
interactive commands; you can do steps 4–7 and fix any lint/type errors). Done when CI shows the `check` job on a
test PR.

**Task 1 · App shell**
- `globals.css` theme (colours above, radius 0), fonts, root layout with `<html lang>` from the user's language,
  a simple top bar (app name, language toggle, log out), bottom-safe spacing for phones.
- `src/lib/i18n.ts`: `t(key, lang, vars?)` — reads both JSON files, replaces `{vars}`, falls back to English, and
  in development warns about missing keys. A small client `LangProvider` + `useT()` hook for client components.
- Done when: the home page looks right at 360×640 and on a laptop, in English and Hindi.

**Task 2 · Practice room on the mock lesson (`/practice/[sessionId]`)**
- Home (`/`) has "Start practice" → `POST /api/sessions` `{ scenarioId: "sub_2digit", lang }` → go to
  `/practice/<id>`. The page loads the lesson with `GET /api/sessions/[id]` (`SessionView`), so a reload works.
- Chat bubbles: teacher (right, teal) and each child (left, own colour + name). Children's names at the top
  (dimmed when silent). If an addressed child stays quiet (engagement 0), show `practice.silent`.
- Text box + Send for now (the recorder comes in Task 4). "Children are thinking…" while waiting. Disable sending
  while a turn is in flight. 5-minute countdown from `startedAt`; End button → `POST /end` → `/card/<id>`.
- `src/lib/api.ts`: `startLesson`, `getSession`, `sendTurn(sessionId, { text?, audio?, idempotencyKey })` (multipart
  `FormData`), `endLesson`, `getCard` — each parses the contract schema and turns `ApiError` bodies into a typed error.
- Needs P1's mock routes (merged within ~1 hour of the kickoff). Until then, build against the shapes.
- Done when: with `USE_MOCKS=1` the 52 − 27 lesson plays: type "What is 52 minus 27?" → Ravi 35, Arjun 35,
  Meena 26. **H1.**

### Sun 25 Oct — logins and the recorder (goal H2)

**Task 3 · Logins**
- `src/lib/auth/pin.ts`: `hashPin(pin)` / `verifyPin(pin, hash)` with `node:crypto` scrypt, 16-byte random salt,
  format `scrypt$<saltHex>$<hashHex>`, `timingSafeEqual`. (P1's seed script imports `hashPin`.)
- `src/lib/auth/session.ts`: sign/verify the `sk_session` cookie with jose HS256 (`SESSION_SECRET`), payload
  `{ sub, code, role, lang }`, 7 days, `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`.
- `src/lib/auth/users.ts`: `findUserByCode(code)` — mock mode: in-memory `teacher_demo` / `trainer_demo` /
  `admin_demo` with PIN `DEMO_PIN` (default `1234`); real mode: the `users` table.
- `src/lib/auth/index.ts`: replace the stub — `getUser()` reads and verifies the cookie (`await cookies()`),
  `requireUser(roles?)` for route handlers (returns a 401/403 `ApiError` response) and `requirePageUser(roles?)` for
  pages (redirects to `/login`). Keep `getUser()`'s signature — P1's routes already call it. Use `import "server-only"` here.
- Routes: `POST /api/auth/login` (`{ code, pin }`, case-insensitive code, 5 wrong tries → 15-minute lock in memory),
  `POST /api/auth/logout`, `POST /api/auth/lang` (re-sign the cookie; update `users.lang` in real mode).
- Pages: `/login` (ID, PIN with a numeric keypad `inputMode="numeric"`, language choice, judge note), `/consent`
  (first login; save to `consents`; mock mode: a cookie flag).
- `src/proxy.ts` (Next 16's middleware): teacher pages need any role; `/trainer` needs trainer or admin; `/admin`
  needs admin. Redirect to `/login?next=…`. Matcher skips `/api`, `/_next`, `/audio`, `/samples`, static files,
  `/manifest.webmanifest`, `/sw.js`, `/login`. Read `node_modules/next/dist/docs/` for the exact proxy API.
- Done when: `teacher_demo` can log in and practise; a teacher gets redirected away from `/trainer`; a Vitest test
  covers `hashPin`/`verifyPin` and the cookie round trip.

**Task 4 · The recorder**
- Hold-to-talk button (pointer events: down = start, up = stop & send, leave/cancel = discard) plus tap-to-start /
  tap-to-stop for accessibility. A ring that fills over **30 s**; auto-stop at 30 s.
- `getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })`. Pick the first
  supported type of `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg;codecs=opus`; `audioBitsPerSecond: 24000`.
- Upload as `FormData` (`audio` file + `idempotencyKey` = `crypto.randomUUID()` made **once per turn** and reused on
  every retry). Retry with backoff on network errors (not on 4xx). Mic blocked → `practice.micDenied` and keep the text box.
- Audio playback on phones: "unlock" one `HTMLAudioElement` on the first tap (play a tiny silent clip), then reuse it
  for replies; if `play()` is rejected, show a play button.
- Done when: records and sends on Android Chrome and iPhone Safari (test on real phones).

**Task 5 · Switch to the real API** — run with `USE_MOCKS=0` once P1 says the engine is merged. Fix any shape issues
together with P1 (the contract wins). **H2:** a typed lesson works on the real engine.

### Mon 26 Oct — voice, card, history (goal H3)

**Task 6 · Replies** — show the lines immediately, then play `audioUrl` (if any). Captions under every audio. Friendly
error messages from `errors.<code>` (rate_limited, lesson_over, audio_too_long, stt_failed…). `lesson_over` → show
`practice.lessonOver` + "See my coaching card". Works on Slow 3G (DevTools).

**Task 7 · Coaching card + History**
- `/card/[sessionId]`: "What worked" (quote + why, "Turn n"), "One thing to try" (quote, what happened, try instead),
  "Say this in class tomorrow" with a play button (`GET /api/sessions/[id]/card/audio`). `card.private` note. While the
  card is being written: `card.loading` (the coach takes ~10–20 s).
- `/history`: past lessons (date in IST, number of turns, the card's "one thing to try"), newest first. Server
  component reading through `src/lib/db/queries/history.ts` (mock mode: one row with `mockCard`).
- Home: last card + the "Did you try the line?" check-in (if the last lesson ended over ~12 h ago and has no check-in)
  → `POST /api/checkins`.

**Task 8 · Hindi / English switch** everywhere, using P3's `hi.json`. **H3:** a spoken Hindi lesson works in the browser.

### Tue 27 Oct — dashboards and MVP (goal H4)

**Task 9 · Trainer dashboard `/trainer`** (server component + shadcn charts)
- Queries in `src/lib/db/queries/trainer.ts` over P1's tables: weak vs strong moves (from `turns.director.move`),
  average Teach score per element (from `coach_cards.card.teachScores`), lessons per teacher, share who came back for
  a second lesson. **Any number based on fewer than 5 teachers is replaced by `trainer.hidden`** (helper + unit test).
- Mock mode: `src/lib/mocks/dashboard.ts` with believable numbers for ≥ 5 teachers.

**Task 10 · Admin pages** — `/admin` (links), `/admin/trace` (recent lessons), `/admin/trace/[sessionId]`: for each turn
show transcript → Director JSON (move, addressed to, confidence) → each child's state before/after (highlight
changes) → lines with their check (passed / retries / backup) → ms and cost from `ai_calls`. A judge must be able to
follow one turn step by step. `/admin/evals`: latest `eval_runs` metrics vs targets (AGENTS.md 18), prompt versions,
the Director confusion table.

**Task 11 · Try a sample `/try`** — the 5 one-tap samples (AGENTS.md 13.2). Each starts a fresh lesson and sends its
inputs in order (sample 5 uploads `public/samples/sana-hi.webm` from P3 as audio). Show the results like the practice room.

**Task 12 · PWA + offline**
- `src/app/manifest.ts` (name, short name, navy theme colour, `display: "standalone"`, icons 192/512).
- `public/sw.js` (hand-written, small): cache-first for `/_next/static/*`, `/audio/*` and icons; network-first for
  pages with a cached fallback; **never cache `/api/*`**. Register only in production.
- Offline queue: if a turn can't be sent, save `{ sessionId, idempotencyKey, text?, audioBlob?, createdAt }` with
  `idb-keyval`; show `practice.offline`; resend on the `online` event and on page load, in order.
- Done when: second visit opens offline; a recording made offline sends itself when back online. **H4: MVP.**

### Wed 28 – Fri 30 Oct — test, polish, show

- **Wed:** Playwright (`playwright.config.ts`, `tests/e2e/`, mock mode, `webServer` = `npm run start` after build in CI,
  `npm run dev` locally): login → start → typed turn → sees "35" → End → card; trainer and admin pages load; a
  teacher can't open `/trainer`. Turn on the `e2e` job in `.github/workflows/ci.yml`. Run the network tests by hand:
  Slow 3G full lesson; offline mid-lesson; a real budget Android on 2G; second visit < 5 s.
- **Thu:** fixes from pilot feedback (P3 brings them); a skill picker only if skill 2 is built. **Feature freeze tonight.**
- **Fri:** screenshots and screen recordings for the video (practice room, card, AI trace, offline) at phone size;
  deck charts from the eval and pilot numbers. Hand them to P3.

## First message

Read AGENTS.md and the files listed at the top. Then tell me in 5 bullet points what the practice room must do, and
start **Task 1** on a branch `p2/app-shell` (Task 0 is the kickoff, done with the team).

## Daily restart (paste each morning)

> Today is <day, date>. Pull `main`. Re-read AGENTS.md sections 0, 11–14 and 20 and `docs/agents/P2-frontend.md`.
> Tell me which P2 tasks look done in the code and which is next, then start the next one on a new branch.
