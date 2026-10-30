# Production audit — what "done properly" means for Shikshakalay

> Picked from Akshat's production notes (`Studio/Production`, 20 stages): only the items that matter for a
> one-week, one-server hackathon app with real teachers and paid AI calls. Each row: what "done" looks like
> **here**, the phase that builds it, and a status — **done** (with evidence: a file, PR, test or command
> output), **skipped-deliberately** (with the reason), or **unknown** (not checked yet).
> The agent builds to these bars as it goes and does the final pass in Phase 7 (gate G7). Honest beats complete.

## A. Plan and architecture (stages 00–01)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| A1 | Problem + value proposition | README opens with a 3–5 sentence problem statement and a one-line value proposition (< 20 words) | 6 | unknown | |
| A2 | Users, requirements, honest limits | README lists the 4 user types (teacher, trainer, admin, judge), the main features, and real targets: reply ≤ 6 s p50, ≤ 1 MB per lesson, cost caps | 6 | unknown | |
| A3 | Out of scope, with reasons | README "Not in this build" = AGENTS.md §19 Won't + why | 6 | unknown | |
| A4 | Stack with reasons + the trade-off | README table: each part, why, what we gave up | 6 | unknown | |
| A5 | Monolith on purpose, thin routes | One Next.js app; no SQL or business rules in `src/app/api/**` (grep proves it) | all | done | No DB import or SQL in `src/app/api/**` (grep 31 Oct); the only query is readyz's `select 1` health ping |
| A6 | Diagrams | `docs/ARCHITECTURE.md`: a web turn and a WhatsApp turn (with failure branches) + ER diagram, in Mermaid | 6 | unknown | |
| A7 | 12-factor basics | Config only from env; no files written to local disk (audio in `media` with expiry); logs to stdout; survives a restart | 1–5 | done | Config only via `src/lib/env.ts`; audio in `media` with expiry, nothing on local disk; JSON logs to stdout; survives every Render redeploy |
| A8 | Separate dev and prod data | Neon `dev` branch locally, `main` on Render; prod scripts need `DB_TARGET=prod` + the operator's OK | 2 | done | Neon `dev` locally, `main` on Render; `*:prod` scripts set `DB_TARGET=prod` and are on the ask-list in `.claude/settings.json` |

## B. Repo and code quality (stages 02–03)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| B1 | Ignore files before the first commit | `.gitignore` covers `.env*` (except the example), `.DS_Store`, `/private`, build output | 0 | done | `.gitignore`: `.env*` (example re-included), `.DS_Store`, `/private`, build output |
| B2 | Env vars fail loudly | `.env.example` lists every key; `src/lib/env.ts` stops the app with the list of missing names; `npm run env:check` | 0–1 | done | `.env.example` + `src/lib/env.ts` (real mode: `env_check_failed` with names only, every route 500 → old deploy stays live) + `npm run env:check` |
| B3 | Formatter, linter, types, tests, build in CI — required | CI `check` = format check, ESLint, typecheck, Vitest, build; required on `main` | 0 | done | CI `check` = Prettier, ESLint, typecheck, Vitest, build; `e2e` = Playwright + axe; ruleset on `main` requires green |
| B4 | Licence | `LICENSE` (MIT) with the team's names | 0 | done | `LICENSE` MIT, three names |
| B5 | Secret scanning | GitHub push protection on (if offered) + `gitleaks` over the full history before sharing | 0 + 6 | done | gitleaks 8.30.1 over all 78 commits (31 Oct): 2 findings, both a fake Twilio MessageSid in `tests/unit/twilioWebhook.test.ts` → `.gitleaksignore`; then "no leaks found". GitHub push protection: operator to confirm |
| B6 | Branch per task, Conventional Commits, `main` always deployable | Protected `main`; PR history shows it | all | done | Ruleset on `main` (squash only, auto-delete); every change via PR (#1–#35), Conventional Commits |
| B7 | Outside services behind one small function | `ai/claude.ts`, `voice/stt.ts`, `voice/tts.ts`, `channels/twilio.ts`; the browser's only `fetch` is in `src/lib/api.ts` (grep proves it) | all | done | `ai/claude.ts`, `voice/stt.ts`, `voice/tts.ts`, `channels/twilio.ts`; browser `fetch` only in `src/lib/api.ts` (the /try sample fetch moved there 31 Oct; grep proves it) |
| B8 | Dependencies passed in | Claude client, fetch, clock and random are injectable; `step()` is pure and tested without DB/HTTP | 2–3 | done | `step(state, text, deps)` in `engine/core.ts` is pure (`core.test.ts`, eval runner); fetch injected in stt/tts/twilio; clock/random passed in the WhatsApp step machine |
| B9 | Errors: catch where you can act; two faces | One wrapper logs full detail with a request id and returns `ApiError` with the same id; error pages show it; no stack traces in production | 1 + 4 | done | `withRoute` + `apiError` with the request id; live 31 Oct: bad JSON → 400 `bad_request` + requestId, no stack trace |
| B10 | Shortcuts written down; no dead code | KNOWN-ISSUES.md "Shortcuts" + README "Known limitations"; unused code and duplicate libraries removed before sharing | 6 | done | KNOWN-ISSUES Shortcuts; unused shadcn `chart/badge/card/dialog/input/sonner/tabs` and packages `recharts`, `sonner`, `next-themes`, `idb-keyval` removed 31 Oct. README limits: S6.2 |

## C. Database (stage 04)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| C1 | Constraints in the database | NOT NULL where needed; UNIQUE on `users.code`, `(sessionId, turn)`, `(sessionId, idempotencyKey)`, `coach_cards.sessionId`, `jobs.dedupeKey` | 2 | done | UNIQUE on `users.code`, `(session_id, turn)`, `(session_id, idempotency_key)`, `coach_cards.session_id`, `jobs.dedupe_key`; NOT NULL in `src/lib/db/schema/*.ts` |
| C2 | Indexes | Every foreign key + every filter/sort column indexed; `EXPLAIN ANALYZE` run once on the trainer dashboard query | 2 + 6 | done | 13 named `*_idx` on every FK and filter/sort column; `EXPLAIN ANALYZE` of the dashboard's moves query on prod (31 Oct): index scans on users/turns, 35.6 ms |
| C3 | Transactions | Saving a turn = one transaction; WhatsApp steps run under `pg_advisory_xact_lock`; no network call inside a transaction | 2 + 5 | done | A turn is saved in one transaction; no network call inside one. WhatsApp: instead of holding an advisory lock during Claude, a second message in the same lesson gets the engine's `busy` → "one moment" (Decisions 30 Oct) |
| C4 | No N+1 | Query count on `/trainer` and `/admin/trace` checked and small | 6 | done | `/trainer` = 3 aggregate queries in parallel; `/admin/trace/[id]` = 4 (session, turns, lines, calls), all with limits |
| C5 | Pooling | Neon pooled URL, `prepare: false`, pool max 5, connect timeout 10 s | 2 | done | `db/client.ts`: pooled URL, `prepare: false`, `max: 5`, `connect_timeout: 10` |
| C6 | Rebuild from empty | `npm run db:push` + `db:seed` on a fresh Neon branch gives a working app | 7 | unknown | |
| C7 | Deleting a person's data | `scripts/delete-user.ts --code T07` removes their rows everywhere; the steps are in `/privacy` | 6 | done | `scripts/delete-user.ts --code T07` (dry run by default, `--yes` deletes: user cascade + WhatsApp contact + its jobs; refuses non-teachers). Tested on dev 31 Oct: counted → deleted → "no user"; dev re-seeded |
| C8 | Migration files | — | — | skipped-deliberately | `drizzle-kit push` from schema files in git is enough for one week; C6 proves the rebuild |
| C9 | Object storage | — | — | skipped-deliberately | Only short-lived synthetic audio (60-minute expiry in Postgres); teacher recordings are never stored |
| C10 | Row-level security | — | — | skipped-deliberately | The browser never talks to the database; every query runs on the server with ownership checks |

## D. API, auth and security (stages 05–07)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| D1 | Validation + one error shape | Zod on every input (strict objects); every error is `ApiError` with the right status (400, 401, 403, 404, 409, 413, 429 + `Retry-After`, 502, 500) | 1–2 | done | Zod strict bodies on every route; route tests cover 400/401/403/404/409/413/429/502 (`api.test.ts`, `history.test.ts`) |
| D2 | No mass assignment | Role, owner and ids never taken from a request body | all | done | User from the signed cookie only; strict bodies reject extra keys (`history.test.ts`: feedback with `userId` → 400) |
| D3 | Rate limits and budget | Login: 5 tries → 15 min; 40 turns per user per hour; `AI_DAILY_BUDGET_USD` for the whole app; no AI endpoint without login | 2 | done | Login 5 tries → 15 min; 40 turns/user/hour; `AI_DAILY_BUDGET_USD`; every AI route needs login |
| D4 | Idempotency | Turn retries with the same key return the stored result; `endLesson` is idempotent; WhatsApp dedupes on `MessageSid` | 2 + 5 | done | Same-key turn retry returns the stored turn (smoke `--lesson`, G2); `endLesson` stores once; WhatsApp `dedupeKey = MessageSid` (`twilioWebhook.test.ts`) |
| D5 | Webhook done right | Twilio signature checked, event saved as a job first, `200` at once, duplicates ignored | 5 | done | `twilio.validateRequest` → forged → 403; job saved first, TwiML at once, `after()` runs it (`twilioWebhook.test.ts`) |
| D6 | Ownership on every record | Lessons, cards and trace are owner-or-admin; **two-account test on the live site** passes | 2 + 6 | done | Live 31 Oct: trainer_demo on teacher_demo's lesson → GET 403, POST turn 403, card 403, `/practice/[id]` 404; route test for 403 |
| D7 | PINs and cookies | PINs hashed with scrypt + `timingSafeEqual`, never logged; cookie `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` — checked in devtools on live | 2 + 6 | done | `auth/pin.ts` scrypt + `timingSafeEqual`; live Set-Cookie (31 Oct): `Path`, `Max-Age`, `HttpOnly`, `SameSite`, `Secure` |
| D8 | No secret in the browser | No `NEXT_PUBLIC_` secrets; the built JS searched for `sk-ant-` and other key prefixes | 6 | done | No `NEXT_PUBLIC_` anywhere; `.next/static` searched for `sk-ant-`, Twilio SIDs, postgres URLs with passwords, secret names: none (31 Oct) |
| D9 | Injection and XSS | SQL only via Drizzle / `sql` templates; no `dangerouslySetInnerHTML`; model output shown as text; SSML text escaped | all | done | SQL only through Drizzle / `sql` templates; the only `dangerouslySetInnerHTML` was the unused shadcn chart (deleted); model output rendered as text; no SSML (Azure unused) |
| D10 | Security headers | nosniff, Referrer-Policy, X-Frame-Options DENY, Permissions-Policy (mic = self), short HSTS; checked once on securityheaders.com | 4 + 6 | done | Live headers (31 Oct): nosniff, strict-origin-when-cross-origin, DENY, mic=(self), HSTS 86400; `x-powered-by` removed (`poweredByHeader: false`). securityheaders.com would mark CSP missing (D15) |
| D11 | Secrets map and rotation | `docs/INFRASTRUCTURE.md`: every secret, where it lives, how to rotate it in < 10 min; the app's Claude key is separate from the coding agent's | 6 | unknown | |
| D12 | OWASP Top 10, one line each | Written in this file's notes, naming our weakest area honestly | 6 | done | See OWASP notes below |
| D13 | Live error check | Forcing an error on the live site shows our page + a reference id, no stack trace | 6 | done | Live 31 Oct: bad request → friendly JSON with reference id, no stack; `error.tsx`/`global-error.tsx` show the id |
| D14 | API versioning (`/v1`) | — | — | skipped-deliberately | One client, deployed together with the server |
| D15 | Content-Security-Policy | — | — | skipped-deliberately | Next.js inline scripts need nonces; not worth the risk this week. Other headers are on |
| D16 | Server-side logout / session list | — | — | skipped-deliberately | Demo logins only; tokens expire in 7 days (see KNOWN-ISSUES) |

## E. Screens and users (stage 09)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| E1 | Works on a real phone | 360 px wide, no sideways scrolling, tested on a real Android (and iPhone if possible) | 3–4 | unknown | |
| E2 | Four states per screen | Loading, empty, error (with retry) and success on every data screen | 1–4 | unknown | |
| E3 | Forms | Real labels, errors next to the field, input kept on error, button disabled while sending | 2 | unknown | |
| E4 | 404 and 500 pages | In our design, with a way home and the reference id | 4 | done | `not-found.tsx`, `error.tsx`, `global-error.tsx` in our design (S4.1, #27) |
| E5 | Accessibility | Keyboard-only lesson works, focus visible, contrast OK, alt text; axe passes on 3 pages in Playwright | 6 | done | axe (serious/critical = fail) on login, home, practice in Playwright CI (#30); keyboard tap/tap recorder |
| E6 | Icons, PWA, titles, link preview | Manifest + icons; a title per page; Open Graph image with an absolute URL — checked by pasting the link into WhatsApp | 4 + 6 | unknown | |
| E7 | No dead links, no template leftovers | Every link clicked; no "Create Next App" title, favicon or README text | 6 | unknown | |
| E8 | Real screenshots, demo logins up front | README: screenshot, short clip, live link, demo logins + the 5 samples | 7 | unknown | |
| E9 | Honest numbers | Eval numbers from real runs; pilot numbers only with ≥ 5 teachers; nothing invented | all | done | Eval numbers only from real runs (evals/results); pilot numbers only with ≥ 5 teachers |
| E10 | Analytics + cookie banner | — | — | skipped-deliberately | No third-party analytics or tracking cookies, so no banner; we count lessons in our own database |

## F. Testing (stage 10)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| F1 | Unit tests where logic branches | bugs, mind-state (incl. Ravi's 7 turns), speakers, guardrails, quote check, `step()`, WhatsApp steps, jobs | 2–5 | done | 219 unit tests (31 Oct): bugs, mind-state incl. Ravi's 7 turns, speakers, guardrails, quote check, `step()`, WhatsApp steps, jobs, Ogg writer, label check |
| F2 | Route tests | Start / turn / end / card in mock mode, incl. 401, 403 (someone else's lesson), 409, 413, 429 | 1–2 | done | `api.test.ts`, `history.test.ts` (mock mode): 401, 403, 409, 413, 429 paths |
| F3 | One end-to-end test in CI | Playwright: login → start → typed turn → sees 35 → End → card | 6 | done | Playwright in CI: login → start → typed turn → 35 → End → card; roles; /try (#30) |
| F4 | Fakes copied from real responses | Sarvam, Azure, Twilio test fixtures saved from the smoke scripts (scrubbed) | 3 | unknown | |
| F5 | Bug fixes start with a failing test | Bug-bash PRs show the test first | 7 | unknown | |
| F6 | AI evals | 100 labelled lessons + 20 red-team cases; run before and after every prompt change; numbers on `/admin/evals` | 6 | unknown | |
| F7 | Load test | — | — | skipped-deliberately | Free tier, and every turn costs money; one server is enough for judging |
| F8 | Scanner / pen test | — | — | skipped-deliberately | Replaced by the manual access-control test (D6), `npm audit` and gitleaks |

## G. Deploy, monitoring, reliability (stages 11–13)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| G1 | Every change through a green PR | Protected `main`; the agent reads its own diff before merging | all | done | Ruleset on `main`; every merge after green `check` + `e2e` |
| G2 | Auto-deploy + know what's live | Render deploys `main`; `/api/version` shows the commit; auto-deploy off after the tag | 1 + 7 | done | Render auto-deploys `main`; `/api/version` → commit (88e606a seen live 31 Oct). Auto-deploy off: Phase 7 |
| G3 | Rollback known | The Render rollback path written in `docs/INFRASTRUCTURE.md` and tried once | 6 | unknown | |
| G4 | Health and uptime | `/api/healthz` (no DB) + `/api/readyz` (DB, 2 s timeout); UptimeRobot every 5 min with email alerts | 1–2 | done | `/api/healthz` + `/api/readyz` (2 s); UptimeRobot on healthz (H1.2) |
| G5 | Logs | One JSON line per event with the request id; never keys, phone numbers, PINs, audio or full transcripts | 1 | done | One JSON line per event with request id; `logError` masks phone numbers and emails (`maskPersonal`, 31 Oct — Twilio errors repeat the number); DB params never logged |
| G6 | Spend alerts and caps | Console workspace limits ($350 coding, $75 app) + the app's daily budget guard | 0 + 2 | unknown | |
| G7 | Timeouts everywhere | Claude 15 s (Director/Children) / 45 s (Coach), Sarvam 15 s, Azure 10 s, Twilio 10 s, DB connect 10 s | 2–5 | done | Claude per-purpose timeouts (`ai/claude.ts`), Sarvam STT/TTS `AbortSignal.timeout`, Twilio 10 s, DB connect 10 s |
| G8 | Retries only where safe | Jobs: 3 tries with backoff; user-facing calls: at most 1 retry | 2 + 5 | done | Jobs: 3 attempts a minute apart; user-facing: one retry (children line check, Coach once) |
| G9 | Graceful failure | Children fail → backup lines; TTS fails → text only; STT fails → text box; Coach fails → simple card from her words | 2–3 | done | Children → backup lines; TTS → text only; STT → 502 + text box; Coach → plain card from her words |
| G10 | "If this service is down" table | `docs/ARCHITECTURE.md`: Anthropic, Sarvam, Azure, Twilio, Neon, Render — slow → ?, down → ? | 6 | unknown | |
| G11 | Backups, RPO and RTO | Neon history + a backup branch before the freeze; README states RPO and RTO honestly | 7 | unknown | |
| G12 | Infrastructure as code | — | — | skipped-deliberately | `docs/INFRASTRUCTURE.md` lists every service and every changed setting instead |
| G13 | Error-tracking service | — | — | skipped-deliberately | `ai_calls` errors + JSON logs with request ids + the admin trace + UptimeRobot cover it this week |

## H. Privacy and law (stage 14 — India's DPDP basics)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| H1 | Notice and consent | Consent screen (web) and consent step (WhatsApp); saved with text version and time | 2 + 5 | done | Web consent screen + WhatsApp YES step; saved in `consents` with version and time |
| H2 | Privacy and terms pages | `/privacy`: what we keep, why, how long, which services see it, how to get it deleted. `/terms`: non-commercial demo, no warranty | 4 | done | `/privacy` and `/terms` in EN + HI (#27) |
| H3 | Keep the minimum | Audio never stored; media deleted after 60 min by the sweep; phone numbers only in `wa_contacts`; pilot data never in git | 3–5 | done | Audio never stored; media expires (sweep deletes); phone only in `wa_contacts`; finished/failed WhatsApp jobs now drop their payload (number + words) — 31 Oct |
| H4 | Contact / grievance route | A real, read email in the footer and `/privacy` | 4 | done | Footer + `/privacy`: akshatverma71105@gmail.com |
| H5 | Licences of what we use | `npx license-checker --summary` checked for GPL/AGPL | 6 | done | Installed production tree (31 Oct): 383 MIT, 30 ISC, 15 Apache-2.0, 13 BSD, others permissive; one LGPL-3.0 (`@img/sharp-libvips`, Next's optional image library, dynamically loaded); no GPL/AGPL |

## I. Maintenance, cost and AI (stages 15, 16, 18, 19)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| I1 | Lock file + Dependabot | `package-lock.json` committed; Dependabot alerts on | 0 | done | `package-lock.json` committed; Dependabot alerts on (one open low alert: shadcn CLI's `deepmerge`, never runs in the app) |
| I2 | Version + changelog | Tag `v1.0-submission`; `CHANGELOG.md` | 7 | unknown | |
| I3 | Docs set | README, `docs/ARCHITECTURE.md`, `docs/INFRASTRUCTURE.md`, `LICENSE`, `CHANGELOG.md`; README steps tested from a clean clone | 6 | unknown | |
| I4 | Cost per lesson known | From `ai_calls`: average $ per lesson in the README and on `/admin/evals` | 6 | unknown | |
| I5 | Could two copies run? | Yes, except the in-memory login lockout and lesson-file cache (written down) | 6 | done | Yes, except the in-memory login lockout and the lesson-file cache (KNOWN-ISSUES) |
| I6 | LLM basics | Keys on the server only; `max_tokens`, timeout, tokens and cost logged on every call; prompt caching confirmed (`cacheReadTokens > 0`) | 2 | done | Keys server-only; `max_tokens` + timeout + tokens + cost per call in `ai_calls`; cache reads 3,265 / 2,195 tokens from turn 2 (G2) |
| I7 | Prompts are code | `src/lib/ai/prompts/*.ts` with a `version`; the version is saved with every call; tuned for the model ids in `.env.example` | 2 | done | `src/lib/ai/prompts/*.ts` with `version` (director@3, children@3, coach@2) saved per call |
| I8 | Structured output, checked | `messages.parse` + Zod; parse failures, refusals and `max_tokens` stops go to the fallback path | 2 | done | `messages.parse` + Zod; refusal / max_tokens / no JSON → `ClaudeCallError` → fallbacks (`claude.test.ts`) |
| I9 | Prompt-injection defence | Teacher text inside `<teacher_said>`; no tools; model output never executed or rendered as HTML; red-team cases pass | 2 + 6 | unknown | |
| I10 | Hallucination guard | The engine decides every number; line check + quote check; the card says it was written by AI | 2–3 | done | Engine decides every number; line check + quote check; the card says it was written by AI (`card.aiNote`) |
| I11 | Outside APIs pinned and listed | README lists Claude model ids, Sarvam `saaras:v4`, Azure voice names, the Twilio sandbox — and which key each needs | 6 | unknown | |
| I12 | Incident notes | If the live site breaks: 5 lines in `docs/incidents/` (what, impact, why, fix, how we'd notice sooner) | as needed | unknown | |

## OWASP Top 10 notes (filled 31 Oct)
- A01 Broken access control: every lesson/card/trace read checks owner-or-admin on the server; live cross-account test passes (D6). Trainer pages show aggregates only.
- A02 Cryptographic failures: HTTPS only (Render + HSTS); PINs scrypt-hashed with a random salt; session = HS256 JWT with a long secret; no secrets in the browser.
- A03 Injection: Drizzle and `sql` templates only (parameterised); teacher words wrapped in `<teacher_said>` for the model; model output shown as text, never HTML.
- A04 Insecure design: the engine, not the model, decides answers; per-user and per-day spend caps; WhatsApp is signature-checked and deduped.
- A05 Security misconfiguration: security headers on; no framework banner; no stack traces in responses; env check fails loudly. No CSP (D15).
- A06 Vulnerable components: `npm audit` = 3 low, all in shadcn's CLI helper (`deepmerge`), not used at run time; Dependabot on.
- A07 Identification and authentication failures: 4-digit PINs are weak by design (teacher-friendly) — mitigated by the 5-tries/15-min lockout; cookies HttpOnly/Secure/SameSite=Lax.
- A08 Software and data integrity failures: lock file committed; CI gates every merge; Twilio webhooks verified by signature.
- A09 Logging and monitoring failures: JSON logs with request ids, `ai_calls` for every AI call, UptimeRobot; phone numbers and emails masked in error logs.
- A10 Server-side request forgery: we fetch only fixed hosts (Anthropic, Sarvam, Twilio) and Twilio's `MediaUrl0` with our Twilio credentials, only after the webhook signature check.
- **Our weakest area, honestly:** authentication — 4-digit PINs with an in-memory lockout (resets on restart) and no server-side session revocation. Fine for demo and pilot logins; a real rollout needs OTP login and a session table.

## Questions a mentor or judge may ask — and where the answer is

| Question | Where the answer is |
|---|---|
| "Show me where a child's answer is decided." | `src/lib/engine/mindState.ts` + `speakers.ts`; Claude only writes words in `children.ts`; the line check in `guardrails.ts` |
| "A teacher says 'ignore your instructions'. Why does that fail?" | `<teacher_said>` wrapping, Director tags only, children stay in character — `evals/redteam.json` results |
| "Your coach quotes words she never said?" | The quote check in `engine/coach.ts` + its unit test |
| "Someone scripts your AI endpoint all night. What's the bill?" | Login required + 40 turns/hour + `AI_DAILY_BUDGET_USD` + the $75 workspace limit |
| "The model returns broken JSON. What happens?" | `askJson` parse-failure path → backup lines (children) / `other` (Director) / retry then simple card (Coach) |
| "Logged in as teacher B, open teacher A's lesson." | 403 — route test + the live two-account test (D6) |
| "Your speech provider goes down mid-demo." | Text box fallback; TTS down → text only (G9) |
| "Where does a teacher's voice recording live?" | Nowhere — transcribed, then dropped (H3) |
| "Which version is live and what changed?" | `/api/version` + `CHANGELOG.md` + the tag |
| "How do you know the children resist weak teaching?" | 50 weak eval lessons → the "resist" metric on `/admin/evals`, with how the labels were checked |
| "What's the worst code in here, and why is it still like that?" | `docs/solo/KNOWN-ISSUES.md` → Open + Shortcuts |
