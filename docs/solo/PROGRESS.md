# PROGRESS — Shikshakalay solo build

> The agent updates this file in every PR (the last commit before merging). CLAUDE.md loads it into every
> conversation, so keep it short (under ~150 lines): when a phase is done, collapse its task list into one line
> in the "Done log".

## Now
- **Phase:** 1 — Walking skeleton (all tasks merged; G1 waits only on the operator's phone check) → Phase 2 started
- **Next task:** Phase 2 — P1-T8 part b: orchestrator + real routes (core.ts step merged)
- **Live URL:** https://shikshakalay.onrender.com
- **Render mode:** `USE_MOCKS=1` (until gate G2)
- **Last gate passed:** —

## Waiting on the operator
| # | What | 🛑/🟡 | Asked (IST) | Status |
|---|---|---|---|---|
| H0.1 | Repo the operator controls | 🛑 | Tue 27 Oct 03:58 | done — new repo `akshat18-gg/shikshakalay` (no transfer) |
| H0.3 | GitHub settings: ruleset on `main`, squash only, auto-delete branches | 🛑 | Tue 27 Oct 04:05 | done (checked via API) |
| H0.4 | Licence MIT, three names | 🟡 | Tue 27 Oct 03:58 | used default |
| H1.1 | Render web service | 🛑 | Tue 27 Oct 03:58 | done — https://shikshakalay.onrender.com |
| H1.2 | UptimeRobot on `/api/healthz` | 🛑 | Tue 27 Oct 03:58 | done |
| H-render | Render deploys from `akshat18-gg/shikshakalay` (auto-deploy on commit) | 🛑 | Tue 27 Oct 17:45 | done (live 23ac4ac) |
| G1-phone | Open the live link on a phone once, play "What is 52 minus 27?" | 🛑 | Tue 27 Oct 17:00 | done |

## Gates
| Gate | Status | Proof (what was run and seen) | When |
|---|---|---|---|
| G0 Setup | ✅ | verify + build green locally; CI `check` green on PRs (#1–#5 old repo, #1 new repo); ruleset `main` active, squash only, auto-delete (gh api); env:check = MOCK mode | Tue 27 Oct 17:05 |
| G1 Live skeleton | ✅ | `smoke:live --full` green on https://shikshakalay.onrender.com at 23ac4ac (login, Ravi 35 / Arjun 35 / Meena 26, card); readyz 200; UptimeRobot on; operator phone check ok | Tue 27 Oct 18:08 |
| G2 Real engine (typed) | ⬜ | | |
| G3 Voice + card | ⬜ | | |
| G4 MVP | ⬜ | | |
| G5 WhatsApp | ⬜ | | |
| G6 Evals + docs + freeze | ⬜ | | |
| G7 Submission ready | ⬜ | | |

## Tasks (tick when merged · estimate → actual minutes)
**Phase 0** — [x] S0.1 tools (5) · [x] S0.2 repo (2) · [x] S0.3 kickoff (app, shadcn, packages, kit, scripts, env, format, licence) (10) · [x] S0.4 first PR + CI (5)
**Phase 1** — [x] P1-T0 + S1.1 logs/request ids + S1.2 env check + S1.3 /api/version (60 → 25) · [x] P2-T1 shell + i18n (45 → 20) · [x] P2-T2 practice room (mock) (90 → 30) · [x] P1-T4 Render + UptimeRobot (operator, 0 agent minutes) · [x] S1.4 smoke:live (30 → 10)
**Phase 2** — [x] P1-T1 Neon + readyz (40 → 20) · [x] P1-T2 bugs (30 → 10) · [x] P1-T3 mind-state + speakers (60 → 15) · [x] P2-T3 logins (90 → 45) · [x] P1-T5 askJson + S2.1 (60 → 30) · [x] P3-T8 teacher lines (20 → 10) · [x] P1-T6 + P3-T2 lesson file (45 → 20) · [x] P1-T7 Director/Children/guardrails (120 → 50) · [ ] P1-T8 step + orchestrator · [ ] P2-T5 real API · [ ] S2.2 prod DB + real mode
**Phase 3** — [ ] P3-T1 voice smoke · [ ] P3-T3 stt/tts · [ ] P3-T4 media · [ ] P3-T6 fixed clips · [ ] P1-T9 coach · [ ] P1-T10 voice in turn · [ ] P2-T4 recorder · [ ] P2-T6 replies · [ ] P2-T7 card + history · [ ] P2-T8 + P3-T5 languages · [ ] P1-T11 speed · [ ] E1 eval batch
**Phase 4** — [ ] P1-T12 seed · [ ] P1-T13 Sana · [ ] P2-T9 trainer · [ ] P2-T10 admin · [ ] P2-T11 /try · [ ] P3-T14 red team · [ ] P2-T12 PWA + offline · [ ] S4.1 polish · [ ] S4.2 pilot pack
**Phase 5** — [ ] P3-T10 jobs + webhook · [ ] P3-T11 conversation · [ ] P3-T12 sweep
**Phase 6** — [ ] E2 labels · [ ] P1-T14 evals · [ ] top-3 fixes · [ ] Playwright + axe · [ ] S6.1 security pass · [ ] S6.2 docs · [ ] S6.3 secret scan
**Phase 7** — [ ] bug bash · [ ] screenshots · [ ] video script + deck numbers + form answers · [ ] final evals · [ ] audit final · [ ] freeze + tag

## Decisions (date — decision — why)
- 26 Oct — Solo build mode: one coding agent builds everything; the operator pre-approved squash-merging green PRs.
- 26 Oct — No AI listed as contributor: attribution off in `.claude/settings.json`, CI blocks co-author lines.
- 26 Oct — Neon dev branch for local work, main branch for Render; prod scripts need the operator's OK.
- 27 Oct — Local Node is 26 (plan says 22); `engines >=22` accepts it. `.node-version` pins 22 for Render; CI uses 22.
- 27 Oct — shadcn init worked on **Radix** (style `radix-nova`), so `asChild` stays. It adds runtime deps `radix-ui`, `cn` (shadcn's own clsx + tailwind-merge replacement), `lucide-react`, `next-themes`, `recharts`, `sonner`, `tw-animate-css`, `shadcn` (its Tailwind CSS import).
- 27 Oct — CODEOWNERS is one line `* @akshat18-gg` (solo mode).
- 27 Oct — Repo moved to the operator's own `akshat18-gg/shikshakalay` (no transfer; same history). PRs #1–#5 were merged on the old repo.
- 27 Oct — Indexes on every FK and filter/sort column (13 named `*_idx`); pushed to the Neon dev branch (13 tables). `npm run db:ping` added.
- 27 Oct — Neon free compute sleeps after ~5 min idle: the first query after that takes ~2.5 s (from the Mac), so `/api/readyz` (2 s limit) can say 503 once, then ok. Not the Render health check (that is `/api/healthz`).
- 27 Oct — `parseSum` = format + a > b; `parseLessonSum` also needs borrowing (AGENTS 7.2: invalid `newTask` is ignored). Non-borrowing sums are ignored by the engine.
- 27 Oct — Reveal moves put every speaking target in `explain` mode (also a whole-class `compare_methods`: "tell me how you each got it"). Naming all four children is not "whole class" (no 3-speaker cap).
- 27 Oct — Move groups come from the lesson file (`MoveEffects`); `DEFAULT_MOVE_EFFECTS` = AGENTS 7.3 = sub_2digit.yaml.
- 27 Oct — Consent lives in the signed session cookie (`consent` claim) so `src/proxy.ts` sends people to `/consent` with no DB call; `POST /api/auth/consent` (new route) saves it and re-signs. Mock mode keeps consent in memory.
- 27 Oct — Login, consent and logout end with a full page load (`window.location.assign`): the client router had cached a pre-login prefetch of `/` (a redirect to /login), so `router.replace` stayed on /login.
- 27 Oct — Mock mode now needs a login too (demo users in memory); API tests log in through the real route. Vitest aliases `server-only` to an empty module.
- 27 Oct — Prices from the live pricing page (27 Oct): Haiku 5.5 $0.10/$0.50, write $0.125, read $0.01 (≤100K prompt; $0.50/$2.50 above); Sonnet 5.5 $2/$10, write $2.50, read **$0.10**; Opus 5.5 $4/$20, write $5, read $0.20; Batch ½. (The skill's cached table said Sonnet read $0.20 — the live page wins.)
- 27 Oct — `askJson`: refusal / max_tokens / no JSON / API error → `ClaudeCallError(reason)` after an `ok=false` ai_calls row; recording failures are logged, never break a turn. Daily budget resets at midnight IST.
- 27 Oct — Not adding server-side refusal `fallbacks` for the Coach yet: it needs the beta namespace, and the Coach already falls back to a card built from her own words (P1-T9). Revisit if refusals show up in ai_calls.
- 27 Oct — sub_2digit.yaml v2: 3 more sample lines per child per language (number-free style lines). New Hindi lines go on the H4.2 review list. Loader: strict Zod schema, clear `file: path: problem` errors, in-memory cache, `startState()` + `backupLine()` helpers.
- 27 Oct — director@2: newTask only for a whole 2-digit sum to solve (director@1 put steps like "13-8" there: 24/30 → 30/30).
- 27 Oct — Children: Claude call failure → backup lines at once (no retry), so a slow call never doubles the wait; only line-check failures get the one retry. `passed` = first generated line passed.
- 27 Oct — Line check: when the right answer equals the sum's second number (70 − 35 = 35), one 35 is allowed if the line also names 70.
- 27 Oct — npm `overrides`: `@esbuild-kit/core-utils` → esbuild ^0.25 (Dependabot #1: drizzle-kit 0.31.11, the latest, still pins esbuild 0.18). drizzle-kit `generate` output is identical before/after; `npm audit` 0.
- 27 Oct — contracts.ts (additive): `GetCard` type for `GET /api/sessions/[id]/card`.
- 27 Oct — Mock lessons live on `globalThis` so every route module sees the same lessons.
- 27 Oct — Env check failing in real mode: Next logs `env_check_failed` (names only) and answers 500 on every route, so Render's health check fails and the old deploy stays live.
- 27 Oct — `requireUser(req, roles)` takes the Request so route tests run without Next's `cookies()`; P2-T3 keeps that signature.
- 27 Oct — Screen language = `sk_lang` cookie (set by `POST /api/auth/lang`, works before login) → user's saved lang → English. P2-T3 adds the user re-sign to that route.
- 27 Oct — Colour `teal-strong` #2E7479 for white-on-teal (plain deck teal is 3.8:1, below AA). Buttons/inputs raised to 44 px.
- 27 Oct — `scripts/screenshots.ts` (Playwright, 360×640 + 1280×800, en + hi) → `private/screens/` (git-ignored).
- 27 Oct — Practice and card pages load the lesson on the server (engine + owner check), so reloads work with no loading flash; the browser still only fetches through `src/lib/api.ts`. Someone else's lesson shows 404 (we don't confirm it exists).
- 27 Oct — A first `/card/[id]` page landed with P2-T2 so End never leads to a 404 on the live link; P2-T7 completes it.
- 27 Oct — "{name} looks down and stays quiet" also shows for whole-class questions, so the shy child is visible from sample 1.
- 27 Oct — CI actions bumped to `checkout@v5` / `setup-node@v5` (v4 runs on deprecated Node 20).

## Numbers
- Reply time p50 / p90: —
- App AI spend so far (from `ai_calls`): ~$0.01 (dev: smoke + 2 Director checks + 1 Children check, 27 Oct)
- Coding spend (operator reads `/usage` at each gate): $14 (Tue 27 Oct 18:00, G1)
- Eval results: — (tuning only so far: Director 30/30 move, children, sum on the fixture after director@2; Children 39/39 lines with the engine's number, 38 first try, 1 retry, 0 backup)

## Later (ideas nobody asked for — not in scope)
-

## Done log (one line per finished phase)
-
