# Shikshakalay — solo build plan (Mon 26 Oct → Sun 1 Nov 2026)

One coding agent (Claude Code in VS Code, on Akshat's Mac) builds everything. You, the **operator**, bring the
accounts, keys, recordings and phone tests. This file says what happens when, what the agent does, what you do,
and how we know each step worked.

**Analogy — a film shoot.** `AGENTS.md` is the script. The agent is the crew: it builds every scene. You are the
producer: you get the permits (accounts and keys), bring the actors (your voice, real teachers) and watch the
"rushes" at the end of each day (the gates). The crew never films without the script, and never spends the
budget without asking.

---

## 1. The week at a glance

| When (IST) | Phase | Gate = how we know it worked | Your time |
|---|---|---|---|
| **Mon 26, tonight** | 0 Setup · 1 Walking skeleton | **G0** CI green, `main` protected · **G1** the fake lesson plays on the live Render link | ~45 min |
| **Tue 27** | 2 Real engine (typed) | **G2** a typed lesson on the real engine, live | ~25 min |
| **Wed 28** | 3 Voice + coach + card | **G3** a spoken Hindi lesson on your phone; the card quotes your real words | ~45 min |
| **Thu 29** | 4 Judge-ready MVP · 5 WhatsApp | **G4** demo logins + 5 samples + dashboards live (we could submit this) · **G5** a full lesson inside WhatsApp | ~60 min + pilot invites |
| **Fri 30** | 6 Evals, hardening, docs | **G6** eval numbers live, README, audit, secret scan, Playwright in CI · **feature freeze** at night | ~60 min |
| **Sat 31** | 7 Bug bash + freeze | **G7** tag `v1.0-submission`, every role smoke-tested, video + deck material ready | ~3 h (video, deck) |
| **Sun 1 Nov** | Buffer | Submit by **6 pm** (hard deadline 11:59 pm, no commits after) | ~30 min |

If a day slips, the next phase starts later — never skip a gate. Cut features instead (section 6).

---

## 2. Before you start (tonight, ~15 minutes)

1. **VS Code** (1.94 or newer) → Extensions → install **Claude Code** (publisher: Anthropic).
2. **Sign in.** Open the Claude panel (the Spark icon, top right of an open file, or "✻ Claude Code" in the
   status bar) → **Sign in** → pick the **Claude Console** account that holds the $500 credits. No API key needed.
   This is the best way.
   - Only have an API key, no Console login? Don't `export ANTHROPIC_API_KEY` in your shell — the app's own
     scripts and dev server would then use that key instead of the one in `.env.local` (the shell's value wins).
     Instead, save the key in a file only you can read and point Claude Code at it:
     `mkdir -p ~/.claude && pbpaste > ~/.claude/coding-key && chmod 600 ~/.claude/coding-key` (copy the key first),
     then add `"apiKeyHelper": "cat ~/.claude/coding-key"` to `~/.claude/settings.json` and reload VS Code.
   - Check it worked: type `/usage` in the panel. With Console/API billing it shows the session's cost.
     If it shows plan bars, you signed in with a Pro/Max plan instead — sign out (type `/logout`, or use the
     account menu in the panel) and sign in again with the Console account.
3. **Spend limits** in the Claude Console (platform.claude.com → workspaces → the workspace → limits):
   - Workspace **"Claude Code"** (made automatically on your first sign-in): limit **$350**.
   - Make a workspace **"shikshakalay-app"**, create the **app's** API key there, limit **$75**.
   - Together $425 — under the $500, with room to spare. (If the organisers' org doesn't let you make workspaces,
     use one key and check `/usage` daily; the app has its own daily budget guard too.)
4. **Model.** Click the model name at the bottom of the Claude panel (or type `/model`):
   **Opus** for Phases 0–3 and 5 (engine, AI, voice, WhatsApp — where bugs cost the most);
   **Sonnet** for Phases 4, 6 and 7 (screens, docs, polish) unless something is hard. Leave effort on medium.
   Switch at the start of a new conversation, not halfway: after a switch, the whole conversation is read again
   at full price.
5. **Terminal checks:** `node -v` (must be 22.x — if not: `brew install node@22`), `git --version`,
   `brew install gh` then `gh auth login` (lets the agent open and merge pull requests).
6. **Optional, saves money:** `npm install -g typescript-language-server typescript`, then in the Claude panel
   install the **typescript-lsp** plugin from the official marketplace. Claude then sees type errors right after
   each edit instead of finding them later.
7. **Start:** make an empty folder (e.g. `~/akkib/SWE/shikshakalay`), open it in VS Code (File → Open Folder),
   open the Claude panel, paste the master prompt, press Enter. The prompt is `Shikshakalay-MASTER_PROMPT.md` in
   your "AI for Foundational Learning" folder (the same text is `docs/solo/MASTER_PROMPT.md` inside
   `shikshakalay-agent-kit.zip`, which sits in that folder too — leave the zip there; the agent unpacks it).

---

## 3. What only you can do — the operator checklist

The agent asks for each item at the right time (in the "NEED YOUR HELP" format) and tells you exactly where
to click. You can also do them early. **Keys never go into the chat** — they go into `.env.local` (and Render).
`npm run env:check` shows what is still missing without showing any value.

| # | When | What (≈ time) | Where the result goes |
|---|---|---|---|
| H0.1 | Phase 0 | **GitHub repo you control** (5 min). Best: Sourin transfers `sourin-git/shikshakalay` to you (repo → Settings → General → Danger Zone → Transfer) or to a free GitHub organisation you create (e.g. `team-blue-screen`). Or create a new repo under your account and add the other two as collaborators. Why: Render must connect to a repo you control, and the agent pushes from your account. | Reply with the repo URL |
| H0.2 | Phase 0 | `gh auth login` (2 min) | — |
| H0.3 | Phase 0, after the first push | **GitHub settings** (5 min, the agent lists the clicks): ruleset for `main` (require a pull request, 0 approvals; require status check `check`; block force pushes) · Pull Requests: squash merge only, auto-delete branches · Code security: Dependabot alerts and secret scanning push protection, if offered | — |
| H0.4 | Phase 0 (default-OK) | Licence: MIT with the three names, unless you say otherwise | — |
| H1.1 | Phase 1 (after the first push to `main`) | **Render** (10 min): sign up with GitHub → New → Web Service → the repo → region **Singapore** → instance **Free** → build `npm ci && npm run build` → start `npm start` → health check path `/api/healthz` → environment variables (the agent prints the list; copy values from `.env.local`). Don't set `NODE_ENV`. Build filters → ignored paths `docs/**`, `**/*.md` (docs-only merges then don't rebuild). | Reply with the `https://….onrender.com` URL |
| H1.2 | Phase 1 | **UptimeRobot** (5 min): free account → HTTP monitor → `https://<app>.onrender.com/api/healthz` every 5 minutes → email alerts. (Phase 5 switches it to the sweep URL.) | — |
| H2.1 | Phase 2 | **Neon** (10 min): neon.tech → new project `shikshakalay`, region **AWS Singapore** → the default branch `main` is production → create branch `dev` → for each branch copy the **pooled** connection string (Connect → pooled; the host contains `-pooler`). | `.env.local`: `DATABASE_URL` = dev, `DATABASE_URL_PROD` = main · Render: `DATABASE_URL` = main |
| H2.2 | Phase 2 | **App API key** from the "shikshakalay-app" workspace (2 min) | `.env.local` + Render: `ANTHROPIC_API_KEY` |
| H2.3 | Phase 2, at the end | Render → Environment → `USE_MOCKS=0` (when the agent says the real engine is ready) | Render |
| H3.1 | Phase 3 | **Sarvam** (5 min): dashboard.sarvam.ai → sign up (₹100 free credit) → API key | `.env.local` + Render: `SARVAM_API_KEY` |
| H3.2 | Phase 3 | **Azure Speech** (10 min): portal.azure.com → Create → "Speech" → pricing tier **Free F0** → region Central India (or the nearest offered) → Keys and Endpoint → KEY 1 + region. (No Azure account yet? "Azure for Students" with your college email may skip the card step.) | `.env.local` + Render: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` |
| H3.3 | Phase 3 | **5 test recordings** (10 min): Voice Memos or QuickTime, ~10 s each, lines the agent gives you (Hindi, English, Hinglish) | `private/recordings/` in the project (never committed) |
| H3.4 | Phase 3 (default-OK) | **Pick voices** (5 min): listen to `private/voice-samples/`, reply with picks — or "your picks are fine" | Reply |
| H3.5 | Phase 3 | **Phone test** (10 min): open the live link on your phone → log in as `teacher_demo` → speak a Hindi turn → tell the agent what happened | Reply |
| H4.1 | Phase 4 | **Sample 5 voice note** (3 min): record "सना, तुम क्या सोचती हो? आराम से बताओ।" | `public/samples/sana-hi.m4a` |
| H4.2 | Phase 4 | **Hindi check** (20–30 min): read `docs/solo/hindi-review.md` and mark anything that sounds unnatural. Even better: a Hindi-speaking teacher friend | Edit the file or reply |
| H4.3 | Phase 4 | **Contact email** for the footer and privacy page (1 min) — one the team actually reads | Reply |
| H4.4 | From Thu | **Pilot**: forward the live link + the 1-page guide (`docs/pilot/guide.md`, plus a ready WhatsApp message the agent writes) to 5–15 primary teachers you know. Ask for 1 lesson today, 1 tomorrow, and the in-app feedback. Names and numbers stay out of the repo | — |
| H5.1 | Phase 5 | **Twilio** (15 min): twilio.com free trial → Messaging → Try it out → Send a WhatsApp message → join the sandbox from your phone (send `join <code>` to +1 415 523 8886) → Sandbox settings → "When a message comes in" = `https://<app>.onrender.com/api/whatsapp/webhook`, method POST | `.env.local` + Render: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SANDBOX_JOIN_CODE` |
| H5.2 | Before anyone else uses WhatsApp | **Upgrade Twilio** and add ~$20 (your card). The trial only reaches verified numbers and has ~100 free WhatsApp messages | — |
| H5.3 | Phase 5 | UptimeRobot: change the monitor URL to `https://<app>.onrender.com/api/cron/sweep?key=<CRON_SECRET>` (value from `.env.local`) | — |
| H5.4 | Phase 5 | **WhatsApp phone test** (10 min) | Reply |
| H6.1 | Phase 6 | **Eval labels** (30–45 min): `docs/solo/label-review.md` — pick the right label for each disagreement (one line each) and check 40 random lines | Edit the file |
| H6.2 | Phase 6 (optional) | **2 expert raters** for the coach (20 lessons, a Google Form, 1–5 per Teach element). If nobody is free, we report "not done" | Reply |
| H6.3 | Phase 6 | OK to `brew install gitleaks` (secret scan) | Reply |
| H6.4 | Phase 6, after a clean scan | Give the Tech4Dev evaluators read access (or make the repo public) | — |
| H6.5 | Phase 6 (optional) | Try a Render rollback once: Render → Events → previous deploy → Rollback, then redeploy the latest | — |
| H7.1 | Sat | Neon → Branches → create `backup-sat31` from `main` (1 min) | — |
| H7.2 | Sat, after the tag is live | Render → Settings → Auto-Deploy → **Off** | — |
| H7.3 | Sat | **Record the 3-minute video** from `docs/submission/video-script.md` (screen + your voice) → YouTube, **Public** | Video link |
| H7.4 | Sat | **Deck**: update the Canva deck with `docs/submission/deck-numbers.md` (Claude in the chat app can do this with the Canva connector) | — |
| H7.5 | Sun, by 6 pm | **Submit** on Hack2Skill (text ready in `docs/submission/form-answers.md`) | — |

---

## 4. The phases, task by task

Task ids: `P1-T7` = task 7 in `docs/agents/P1-ai-backend.md` (same for P2, P3). `S…` = solo additions,
`E…` = evals. The agent reads the full task text from those files; this plan only orders them and adds the
solo changes. **Every task ends with `npm run verify` green and a merged PR.**

### Phase 0 — Setup (Mon night)

Goal: a protected, green repo with the kit inside, ready for work.

- **S0.1 Tools** — `node -v` (22.x), `npm -v`, `git --version`, `gh auth status`, `code --version`. Install the
  VS Code extensions in `.vscode/extensions.json` with `code --install-extension <id>` (after the kit is in).
  Also check that `ANTHROPIC_API_KEY` is **not** set in the shell (print only "set"/"not set":
  `[ -n "$ANTHROPIC_API_KEY" ] && echo set || echo "not set"`). If it is set, warn the operator (§2 step 2):
  Node and Next.js would use it instead of the app key in `.env.local`.
- **S0.2 Repo** — ask H0.1 first (batched with H1.1/H1.2). Then get the code into the open folder:
  `git clone <url> .` — if that fails because the folder isn't empty (e.g. `.DS_Store`), use
  `git init -b main && git remote add origin <url> && git fetch && git checkout -t origin/main` (or skip the
  checkout if the remote is empty). If the repo already has the Next.js app (the team did the kickoff), jump to S0.4.
- **S0.3 Kickoff steps 2–8** from `docs/agents/00-KICKOFF.md`, with these solo changes:
  1. Make the Next.js app in a temp folder so nothing in the open folder gets in the way, then move it in:
     `npx create-next-app@latest /tmp/shk-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --yes --no-agent-feedback --skip-install`
     → `rsync -a /tmp/shk-app/ ./` → `npm install`. (Check `--help` if a flag is rejected.)
  2. shadcn: `npx shadcn@latest init -t next -b radix` without prompts (find the `-y`/`-d` style flags with
     `--help`), then `npx shadcn@latest add button card input dialog tabs chart badge sonner -y`. If it ends up on
     Base UI, write that in PROGRESS.md → Decisions (`asChild` becomes the `render` prop).
  3. Packages: the Step 4 lists **plus** `prettier` (dev).
  4. Copy the kit: `unzip -o "<kit zip>" -d /tmp/shk-kit && rsync -a /tmp/shk-kit/shikshakalay-agent-kit/ ./`
     (the zip has a top folder — copy its **contents**). Our `.gitignore`, `AGENTS.md` and `CLAUDE.md` replace
     the generated ones.
  5. `next.config.ts`: remove `cacheComponents: true` and `partialPrefetching: true` if present.
  6. Scripts — run once:
     ```bash
     npm pkg set scripts.lint="eslint ." scripts.typecheck="next typegen && tsc --noEmit" scripts.test="vitest run" scripts.e2e="playwright test" \
       scripts.format="prettier --write --no-error-on-unmatched-pattern src tests scripts evals" \
       scripts.format:check="prettier --check --no-error-on-unmatched-pattern src tests scripts evals" \
       scripts.verify="npm run format:check && npm run lint && npm run typecheck && npm test" \
       scripts.env:init="tsx scripts/env-tools.ts init" scripts.env:check="tsx scripts/env-tools.ts check" \
       "scripts.db:push=drizzle-kit push" "scripts.db:push:prod=DB_TARGET=prod drizzle-kit push" \
       "scripts.db:seed=tsx --env-file-if-exists=.env.local scripts/seed.ts" \
       "scripts.db:seed:prod=DB_TARGET=prod tsx --env-file-if-exists=.env.local scripts/seed.ts" \
       scripts.evals="tsx --env-file-if-exists=.env.local evals/run.ts" \
       "scripts.gen:lessons=tsx --env-file-if-exists=.env.local evals/generate.ts" engines.node=">=22"
     ```
  7. `npm run env:init` (makes `.env.local` in mock mode and fills `SESSION_SECRET` and `CRON_SECRET`), then
     `npm run env:check`.
  8. `npm run format` once, then `npm run verify && npm run build`. Fix anything red.
  9. `LICENSE` (MIT, "Akshat Verma, Pratyush Kumar, Sourin Nandy", 2026) unless the operator says otherwise.
     `.github/CODEOWNERS`: put the operator's GitHub username on every line (ask for it in the H0.1 message).
  10. First commit straight to `main` (the only direct push): `chore: Next.js 16 + shadcn skeleton, shared
      contracts, mock lesson, DB schema starters, solo kit`. Then ask for H0.3.
- **S0.4 Prove CI** — a tiny PR (e.g. `chore: add npm scripts doc to README`), wait for `check` to pass,
  squash-merge. Install the VS Code extensions now.

**Gate G0:** `npm run verify && npm run build` green locally · CI `check` green on a PR · `main` protected ·
`npm run env:check` says mock mode.

### Phase 1 — Walking skeleton, live (Mon night → Tue morning)

Goal: the fake lesson works on the real internet. Deploying on day one finds hosting problems while they are cheap.

- **P1-T0** Mock-backed API — plus:
  - **S1.1** `src/lib/log.ts`: one JSON line per event (`evt`, `requestId`, `user` code, `ms`…). Each route gets a
    request id (from `x-request-id` or `crypto.randomUUID()`). `apiError()` puts `requestId` in the body (the
    field is in `contracts.ts`). A small `withRoute()` wrapper catches unknown errors → logs the full detail →
    returns `500 internal` with the id. No stack traces in responses.
  - **S1.2** `src/lib/env.ts`: a Zod schema for server env vars. Real mode with a missing key throws one clear
    message that lists the missing names. Mock mode needs only `SESSION_SECRET` and `DEMO_PIN`. Check at server
    start (`src/instrumentation.ts` → `register()`) and at the top of scripts — never at import time, or
    `next build` in CI (which has no keys) would fail.
  - **S1.3** `GET /api/version` → `{ commit }` from `RENDER_GIT_COMMIT` (first 7 characters).
- **P2-T1** App shell + i18n (colour and spacing tokens defined once in `globals.css`; Noto fonts).
- **P2-T2** Practice room on the mock lesson + `src/lib/api.ts` — the only place the browser calls `fetch`.
- **P1-T4** Render deploy in mock mode (H1.1) + UptimeRobot on `/api/healthz` (H1.2).
- **S1.4** `scripts/smoke-live.ts` + `npm run smoke:live`: healthz → version → log in as `teacher_demo` →
  start a lesson → typed turn "What is 52 minus 27?" → expect Ravi 35. Reads `PUBLIC_BASE_URL`/`DEMO_PIN`
  (or a `--url` flag); prints no secrets. `--full` also ends the lesson and checks the card.

**Gate G1:** `https://<app>.onrender.com/api/healthz` → `ok` · the mock lesson plays in a browser on the live
link (Ravi 35, Arjun 35, Meena 26) · `npm run smoke:live -- --url https://<app>.onrender.com` green · the
operator opened it on a phone once.

### Phase 2 — The real engine, typed (Tue 27)

Goal: the puppet show works for real: rules decide, Claude speaks.

1. **P1-T1** Neon (H2.1): review `schema/*.ts` against AGENTS.md §10; add an index on every foreign key and on
   columns used in `WHERE`/`ORDER BY` (e.g. `sessions.userId`, `turns.sessionId`, `ai_calls.createdAt`,
   `jobs(status, runAt)`); `npm run db:push` (dev); `scripts/db-ping.ts`; **`GET /api/readyz`** (`select 1`,
   2-second timeout, 503 on failure, no details).
2. **P1-T2** `bugs.ts` + tests.
3. **P1-T3** `mindState.ts`, `speakers.ts` + tests, including Ravi's 7-turn table.
4. **P2-T3** Logins (PIN hash, cookie session, users, `getUser`/`requireUser`, `proxy.ts`, `/login`, `/consent`).
   Test: a teacher cannot read another teacher's lesson (403).
5. **P1-T5** `askJson` + `ai_calls` logging + `pricing.ts` — plus **S2.1**:
   - Anthropic client with `timeout` (Director/Children 15 s, Coach 45 s) and `maxRetries: 1`.
   - Treat `stop_reason: "refusal"` or `"max_tokens"` as a failed call → the normal fallback path.
   - Never send `temperature`, `top_p` or `top_k` (the 5.5 models reject them).
   - `fast: true` = `thinking: { type: "disabled" }` + effort `low` — valid on Haiku 5.5 (keep it). Sonnet 5.5
     rejects `"disabled"`: for the Coach leave thinking at its default.
   - Prices (per million tokens; **re-check https://platform.claude.com/docs/en/about-claude/pricing before
     trusting them**): Haiku 5.5 $0.10 input · $0.50 output · $0.125 cache write (5 min) · $0.01 cache read
     (prompts up to 100k tokens); Sonnet 5.5 $2 · $10 · $2.50 · $0.10; Opus 5.5 $4 · $20 · $5 · $0.20.
     Batch API = half price.
   - **Daily budget guard**: before a turn's Claude calls, if today's `sum(ai_calls.costUsd)` ≥
     `AI_DAILY_BUDGET_USD` → `429 rate_limited` ("let's take a break") with `Retry-After`.
6. **P3-T8** `tests/fixtures/teacher_lines.json` — the agent writes the 30 lines (needed for P1-T7).
7. **P1-T6** Scenario loader + **P3-T2** finish the lesson file (more `sampleLines`; every Hindi line also goes
   on the review list for H4.2). Never change number logic in the YAML.
8. **P1-T7** Director, Children, guardrails.
9. **P1-T8** `core.ts` `step()` + `orchestrator.ts` + real routes. Save a turn (`turns` + `child_lines` + new
   state) in **one transaction**; never hold a transaction open across a Claude/Sarvam/Azure call.
10. **P2-T5** Practice room on the real API (with `USE_MOCKS=0` locally against the dev branch).
11. **S2.2** Production database: ask, then `npm run db:push:prod` and `npm run db:seed:prod` with only the
    three demo users for now (the full seed comes in Phase 4). Then ask for H2.2 + H2.3.

**Gate G2:** on the live link in real mode: log in as `teacher_demo` → "What is 52 minus 27?" → Ravi 35, Arjun 35,
Meena 26 → "No, it is 25. Everyone say 25." → they say 25 → "Now 43 minus 18?" → Ravi and Arjun say 35 again ·
`ai_calls` rows have tokens and cost · `cacheReadTokens > 0` from the second turn · the 403 test passes ·
`npm run smoke:live` green in real mode.

### Phase 3 — Voice, coach and card (Wed 28)

Goal: a teacher speaks Hindi and gets kind, specific coaching that quotes her own words.

1. **P3-T1** Voice smoke script (needs H3.1, H3.2, H3.3): Sarvam on the 5 recordings; Azure voice list; candidate
   clips into `private/voice-samples/` for H3.4. Save real response bodies (no personal data) as test fixtures.
   (The WhatsApp test in P3-T1 moves to Phase 5.)
2. **P3-T3** `voices.ts` (sensible defaults if H3.4 hasn't come back), `stt.ts`, `tts.ts` + tests with a fake
   `fetch`. Timeouts: Sarvam 15 s, Azure 10 s.
3. **P3-T4** Media store + `GET /api/media/[token]`.
4. **P3-T6** Fixed clips (hello, "say again"; mp3 + ogg) — committed.
5. **P1-T9** Coach + quote check. The card shows a small note: "Written by AI from your lesson — check what
   matters to you." If the Coach fails twice, build a simple card from her own words (never a blank screen).
6. **P1-T10** Voice into the turn.
7. **P2-T4** Recorder (the operator tests it on a real phone in H3.5).
8. **P2-T6** Replies + friendly errors (show the reference id on errors).
9. **P2-T7** Card + history (history shows the last 50, newest first).
10. **P2-T8** Hindi/English switch + **P3-T5** i18n key-parity test + write `docs/solo/hindi-review.md` (all Hindi
    screen text, lesson lines and 20 real children's lines, each with its English meaning) for H4.2.
11. **P1-T11** Speed: p50/p90 of `turns.ms` into PROGRESS.md; start the Children call as soon as the engine is
    done; keep lines short.
12. **E1** `evals/generate.ts` (P3-T13). Ask first (≈ $5), then submit the Batch at the end of the day so the
    100 lessons are ready by Friday.

**Gate G3:** on the operator's phone, live: a spoken Hindi turn works (transcript shows, children answer in
different voices, text appears before audio) · End → the card quotes the operator's real words · p50/p90 reply
time in PROGRESS.md · eval batch submitted.

### Phase 4 — Judge-ready MVP (Thu 29, morning)

Goal: everything a judge touches works. After this gate we could submit.

1. **P1-T12** Seed: demo users + 8 synthetic teachers `T01–T08` (`isDemo: true`) with fake-Claude lessons and
   cards — dev first, then prod (ask).
2. **P1-T13** Sana end to end.
3. **P2-T9** Trainer dashboard (numbers from fewer than 5 teachers stay hidden).
4. **P2-T10** Admin: AI trace + evals pages (lists capped, newest first).
5. **P2-T11** `/try` with the 5 samples (sample 5 uses H4.1; until it exists, send the Hindi line as text).
6. **P3-T14** `evals/redteam.json` (20 cases).
7. **P2-T12** PWA + offline queue.
8. **S4.1** Production polish:
   - Security headers in `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
     strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: microphone=(self),
     camera=(), geolocation=()`, `Strict-Transport-Security: max-age=86400`.
   - `not-found.tsx`, `error.tsx`, `global-error.tsx` in our design, with a way home and the reference id.
   - A title per page (`Page — Shikshakalay`), Open Graph tags with an **absolute** image URL.
   - Footer: team name, contact email (H4.3), GitHub link. `/privacy` and `/terms` — short and true (what we
     keep, why, how long, which outside services see data — Anthropic, Sarvam, Azure, Twilio/Meta, Neon, Render —
     and how to get data deleted).
9. **S4.2** `docs/pilot/guide.md`, `docs/pilot/consent.md` (EN + HI) and a ready-to-forward WhatsApp message for H4.4.

**Gate G4 (MVP):** live: all three demo logins work · the 5 samples play · trainer dashboard and AI trace show
seeded data · a teacher can't open `/trainer` · second visit opens offline · `npm run smoke:live -- --full`
green. → The operator starts the pilot (H4.4).

### Phase 5 — The WhatsApp door (Thu 29, afternoon and evening)

Goal: a teacher can practise from WhatsApp with voice notes. (Ask for H5.1 at the start of Phase 4.)

1. **P3-T10** Jobs + webhook (signature check, dedupe on `MessageSid`, reply at once, work in `after()`).
2. **P3-T11** The full conversation + `twilio.ts` (10-second timeouts; ~3.1 s between messages; `STOP`;
   check-in job; rejoin tip).
3. **P3-T12** Sweep + switch UptimeRobot to it (H5.3).
4. H5.4 phone test; remind the operator about H5.2 before anyone else uses it.

**Gate G5:** from the operator's phone: consent → language → menu → hello voice note → 3 voice turns → `END` →
card + "say tomorrow" audio · `STOP` stops everything · a job left stuck gets retried by the sweep · no phone
number in any log line.
**Plan B** (if G5 isn't green by Fri noon): WhatsApp appears only in the video (recorded from the operator's
phone); the pilot uses the web link. Say so honestly in the README.

### Phase 6 — Evals, hardening, docs (Fri 30) — feature freeze tonight

1. **E2** Labels: `evals/label-check.ts` — Sonnet 5.5 (Batch, ≈ $2) labels every teacher line **without seeing**
   the proposed label → agreements get `labelSource: "agreed"` → disagreements + 40 random agreed lines go to
   `docs/solo/label-review.md` (H6.1) → apply the operator's picks (`"human"`) → `reviewed: true`.
2. **P1-T14** Eval runner + report. Ask before the full run (≈ $3–5). Save the `eval_runs` row to prod
   (`DB_TARGET=prod`) so `/admin/evals` shows it. Run `evals/redteam.json` too.
3. Fix the top 3 failures (usually Director mix-ups → add examples → bump the prompt version) → re-run the
   failing ones, then the full set.
4. **P2 (Wed task)** Playwright E2E in mock mode (login → start → typed turn → sees 35 → End → card; trainer and
   admin load; teacher blocked from `/trainer`) + an axe accessibility check on 3 pages
   (`@axe-core/playwright`). Turn on the `e2e` job in `ci.yml`.
5. **S6.1** Security and quality pass — record each result in `PRODUCTION-AUDIT.md`: two-account access test on
   live · cookie flags on live · force an error on live (friendly page, no stack trace) · search the build output
   (`.next/static`) for key prefixes like `sk-ant-` · `npm audit` · `npx license-checker --summary` (look for
   GPL/AGPL) · remove unused code · count DB queries on `/trainer` and `/admin/trace` (no N+1) · `EXPLAIN
   ANALYZE` on the dashboard query · `scripts/delete-user.ts --code T07` (deletes one user's data everywhere).
6. **S6.2** Docs: README (value proposition in one line, screenshot, live link + video link, demo logins + the 5
   samples, how it works, **every AI service + model + key**, setup + run locally — tested from a clean clone in
   a temp folder, tests, evals with honest numbers and how labels were checked, privacy, RPO/RTO, the changes
   from the Ideate deck, known limitations) ·
   `docs/ARCHITECTURE.md` (Mermaid: a web turn, a WhatsApp turn with failure branches, the ER diagram; an
   "if this service is slow / down" table) · `docs/INFRASTRUCTURE.md` (every outside service, settings we
   changed, which secret lives where, how to rotate each key in under 10 minutes) · `CHANGELOG.md` ·
   `docs/pilot/changes.md` ("you said, we changed", teacher codes only).
7. **S6.3** Secret scan: `gitleaks git` over the full history (H6.3) → fix → rotate any leaked key → H6.4.

**Gate G6:** `/admin/evals` shows real numbers · the README steps work from a clean clone · gitleaks clean · CI
`check` + `e2e` green · `PRODUCTION-AUDIT.md` filled · "feature freeze" written in PROGRESS.md.

### Phase 7 — Bug bash, freeze, submission pack (Sat 31 → Sun 1)

1. Bug bash: `KNOWN-ISSUES.md` + pilot feedback, worst first. Every fix starts with a failing test.
2. Screenshots and short clips with Playwright at 360×640 and 1280×800 → `docs/media/`; README screenshot.
3. `docs/submission/video-script.md` — 3 minutes: the problem (20 s) → a teacher practises, weak move resisted,
   strong move works (70 s) → coaching card (30 s) → under the hood: AI trace, guardrails, eval numbers (40 s) →
   WhatsApp + weak network (20 s) → roadmap (10 s). Plus `docs/submission/deck-numbers.md` (eval + pilot numbers
   with dates) and `docs/submission/form-answers.md` (links, test logins, the 5 sample inputs).
4. Final eval run if any prompt changed after G6; pilot summary only if ≥ 5 teachers took part.
5. `PRODUCTION-AUDIT.md` final pass (every row: done / skipped-deliberately / unknown, with evidence).
6. **Code freeze (Sat evening):** README shows the commit hash → tag `v1.0-submission` → H7.1 backup branch →
   H7.2 auto-deploy off → deploy the tag → `npm run smoke:live -- --full` for every role.
7. **Sun:** no code changes unless the live link is broken (then: fix → test → tag `v1.0.1-submission`).
   The operator submits by 6 pm. No commits after 11:59 pm.

**Gate G7:** every box in section 9 is ticked.

---

## 5. How the agent and you work together

- The agent works task after task on its own. It stops only (a) at a gate, (b) when it needs you, (c) when it is
  stuck on something that blocks the gate.
- When it needs you, it writes **"🛑 NEED YOUR HELP"** (it can't go on without it) or **"🟡 DEFAULT-OK"** (it will
  use its default at a stated time unless you say otherwise). Each one says why, the exact clicks, where the result
  goes, and what it does meanwhile. At the start of each phase it lists everything the **next** phase needs,
  so you can do it ahead.
- **One conversation per phase.** When a gate passes, start a new conversation and paste the RESUME message from
  the end of `MASTER_PROMPT.md`. Long conversations cost more on every message.
- Your daily 5-minute check: read `docs/solo/PROGRESS.md` (top part), type `/usage` in the Claude panel, open the
  live link on your phone.

---

## 6. If we fall behind — cut in this order

1. Offline recording queue (keep the PWA shell and "text first")
2. WhatsApp (Plan B: in the video only)
3. Sana (but she is cheap — the engine already supports a child with no bug)
4. Trainer dashboard charts → a simple table

**Never cut:** the live link with demo logins, the coaching card with the quote check, the evals, real teachers
trying it, the video.

---

## 7. Money — a rough estimate

| What | Estimate | Paid by |
|---|---|---|
| Claude Code building the app (~6 working days, Opus most of the time) | **$150–250** (up to ~$300 with a lot of re-work) | $500 credits |
| The app's own Claude calls — your tests, the pilot, the judges (~300 lessons × ~$0.07) | ~$20–30 | credits |
| Evals: make 100 lessons (Opus, Batch, ≈ $5) + label check (≈ $2) + 2–3 full runs (≈ $3 each) | ~$10–20 | credits |
| **Claude total** | **~$180–300 of the $500** | |
| Twilio WhatsApp | $0 for the trial's ~100 free WhatsApp messages; after that about $0.005–0.009 per message (≈ $0.15–0.25 per WhatsApp lesson). Add ~$20 when you upgrade so judges and teachers can use it | your card |
| Sarvam speech-to-text | ₹100 free ≈ 3.4 hours of speech ≈ 100 voice lessons; then ₹0.49 per minute | free / tiny |
| Azure voices | Free F0 tier (0.5 M characters a month ≈ several hundred lessons) | free |
| Neon, Render, UptimeRobot, GitHub | Free plans | free |

**One 12-turn practice lesson** ≈ 24 small Haiku calls (about 1 cent) + one Sonnet coaching card (about 5 cents)
≈ **$0.06–0.10**.

**Guardrails:** workspace limits ($350 coding, $75 app) · the app's `AI_DAILY_BUDGET_USD=10` · 40 turns per user
per hour · `max_tokens` on every call · prompt caching · eval runs and prod database scripts need your OK ·
check `/usage` once a day.

---

## 8. What stays human (the agent can't do these)

- Accounts, keys, billing, GitHub ownership; clicks in Render, Neon, Twilio, UptimeRobot, Azure.
- Real-phone tests (Android Chrome; iPhone Safari if anyone has one).
- Judging whether the Hindi sounds natural.
- Real teachers (the pilot) and expert raters.
- Your voice: 5 test lines, sample 5, the video voice-over.
- The deck and the final submission.

---

## 9. Submission checklist (Sun 1 Nov)

- [ ] Live link up; UptimeRobot green for the last 24 hours
- [ ] Test logins for teacher, trainer and admin + the 5 sample inputs — in the README and the form
- [ ] Repo: README (setup, run locally, `.env.example`, every AI service + model + where keys go); gitleaks clean; no personal data
- [ ] Evaluators have read access
- [ ] 3-minute video on YouTube, **Public**
- [ ] Deck (PDF/PPTX): AI in layers, guardrails, weak-network use, user testing, roadmap
- [ ] Tag `v1.0-submission` live; auto-deploy off
- [ ] Submitted before 6 pm
