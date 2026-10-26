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
| A5 | Monolith on purpose, thin routes | One Next.js app; no SQL or business rules in `src/app/api/**` (grep proves it) | all | unknown | |
| A6 | Diagrams | `docs/ARCHITECTURE.md`: a web turn and a WhatsApp turn (with failure branches) + ER diagram, in Mermaid | 6 | unknown | |
| A7 | 12-factor basics | Config only from env; no files written to local disk (audio in `media` with expiry); logs to stdout; survives a restart | 1–5 | unknown | |
| A8 | Separate dev and prod data | Neon `dev` branch locally, `main` on Render; prod scripts need `DB_TARGET=prod` + the operator's OK | 2 | unknown | |

## B. Repo and code quality (stages 02–03)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| B1 | Ignore files before the first commit | `.gitignore` covers `.env*` (except the example), `.DS_Store`, `/private`, build output | 0 | unknown | |
| B2 | Env vars fail loudly | `.env.example` lists every key; `src/lib/env.ts` stops the app with the list of missing names; `npm run env:check` | 0–1 | unknown | |
| B3 | Formatter, linter, types, tests, build in CI — required | CI `check` = format check, ESLint, typecheck, Vitest, build; required on `main` | 0 | unknown | |
| B4 | Licence | `LICENSE` (MIT) with the team's names | 0 | unknown | |
| B5 | Secret scanning | GitHub push protection on (if offered) + `gitleaks` over the full history before sharing | 0 + 6 | unknown | |
| B6 | Branch per task, Conventional Commits, `main` always deployable | Protected `main`; PR history shows it | all | unknown | |
| B7 | Outside services behind one small function | `ai/claude.ts`, `voice/stt.ts`, `voice/tts.ts`, `channels/twilio.ts`; the browser's only `fetch` is in `src/lib/api.ts` (grep proves it) | all | unknown | |
| B8 | Dependencies passed in | Claude client, fetch, clock and random are injectable; `step()` is pure and tested without DB/HTTP | 2–3 | unknown | |
| B9 | Errors: catch where you can act; two faces | One wrapper logs full detail with a request id and returns `ApiError` with the same id; error pages show it; no stack traces in production | 1 + 4 | unknown | |
| B10 | Shortcuts written down; no dead code | KNOWN-ISSUES.md "Shortcuts" + README "Known limitations"; unused code and duplicate libraries removed before sharing | 6 | unknown | |

## C. Database (stage 04)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| C1 | Constraints in the database | NOT NULL where needed; UNIQUE on `users.code`, `(sessionId, turn)`, `(sessionId, idempotencyKey)`, `coach_cards.sessionId`, `jobs.dedupeKey` | 2 | unknown | |
| C2 | Indexes | Every foreign key + every filter/sort column indexed; `EXPLAIN ANALYZE` run once on the trainer dashboard query | 2 + 6 | unknown | |
| C3 | Transactions | Saving a turn = one transaction; WhatsApp steps run under `pg_advisory_xact_lock`; no network call inside a transaction | 2 + 5 | unknown | |
| C4 | No N+1 | Query count on `/trainer` and `/admin/trace` checked and small | 6 | unknown | |
| C5 | Pooling | Neon pooled URL, `prepare: false`, pool max 5, connect timeout 10 s | 2 | unknown | |
| C6 | Rebuild from empty | `npm run db:push` + `db:seed` on a fresh Neon branch gives a working app | 7 | unknown | |
| C7 | Deleting a person's data | `scripts/delete-user.ts --code T07` removes their rows everywhere; the steps are in `/privacy` | 6 | unknown | |
| C8 | Migration files | — | — | skipped-deliberately | `drizzle-kit push` from schema files in git is enough for one week; C6 proves the rebuild |
| C9 | Object storage | — | — | skipped-deliberately | Only short-lived synthetic audio (60-minute expiry in Postgres); teacher recordings are never stored |
| C10 | Row-level security | — | — | skipped-deliberately | The browser never talks to the database; every query runs on the server with ownership checks |

## D. API, auth and security (stages 05–07)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| D1 | Validation + one error shape | Zod on every input (strict objects); every error is `ApiError` with the right status (400, 401, 403, 404, 409, 413, 429 + `Retry-After`, 502, 500) | 1–2 | unknown | |
| D2 | No mass assignment | Role, owner and ids never taken from a request body | all | unknown | |
| D3 | Rate limits and budget | Login: 5 tries → 15 min; 40 turns per user per hour; `AI_DAILY_BUDGET_USD` for the whole app; no AI endpoint without login | 2 | unknown | |
| D4 | Idempotency | Turn retries with the same key return the stored result; `endLesson` is idempotent; WhatsApp dedupes on `MessageSid` | 2 + 5 | unknown | |
| D5 | Webhook done right | Twilio signature checked, event saved as a job first, `200` at once, duplicates ignored | 5 | unknown | |
| D6 | Ownership on every record | Lessons, cards and trace are owner-or-admin; **two-account test on the live site** passes | 2 + 6 | unknown | |
| D7 | PINs and cookies | PINs hashed with scrypt + `timingSafeEqual`, never logged; cookie `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` — checked in devtools on live | 2 + 6 | unknown | |
| D8 | No secret in the browser | No `NEXT_PUBLIC_` secrets; the built JS searched for `sk-ant-` and other key prefixes | 6 | unknown | |
| D9 | Injection and XSS | SQL only via Drizzle / `sql` templates; no `dangerouslySetInnerHTML`; model output shown as text; SSML text escaped | all | unknown | |
| D10 | Security headers | nosniff, Referrer-Policy, X-Frame-Options DENY, Permissions-Policy (mic = self), short HSTS; checked once on securityheaders.com | 4 + 6 | unknown | |
| D11 | Secrets map and rotation | `docs/INFRASTRUCTURE.md`: every secret, where it lives, how to rotate it in < 10 min; the app's Claude key is separate from the coding agent's | 6 | unknown | |
| D12 | OWASP Top 10, one line each | Written in this file's notes, naming our weakest area honestly | 6 | unknown | |
| D13 | Live error check | Forcing an error on the live site shows our page + a reference id, no stack trace | 6 | unknown | |
| D14 | API versioning (`/v1`) | — | — | skipped-deliberately | One client, deployed together with the server |
| D15 | Content-Security-Policy | — | — | skipped-deliberately | Next.js inline scripts need nonces; not worth the risk this week. Other headers are on |
| D16 | Server-side logout / session list | — | — | skipped-deliberately | Demo logins only; tokens expire in 7 days (see KNOWN-ISSUES) |

## E. Screens and users (stage 09)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| E1 | Works on a real phone | 360 px wide, no sideways scrolling, tested on a real Android (and iPhone if possible) | 3–4 | unknown | |
| E2 | Four states per screen | Loading, empty, error (with retry) and success on every data screen | 1–4 | unknown | |
| E3 | Forms | Real labels, errors next to the field, input kept on error, button disabled while sending | 2 | unknown | |
| E4 | 404 and 500 pages | In our design, with a way home and the reference id | 4 | unknown | |
| E5 | Accessibility | Keyboard-only lesson works, focus visible, contrast OK, alt text; axe passes on 3 pages in Playwright | 6 | unknown | |
| E6 | Icons, PWA, titles, link preview | Manifest + icons; a title per page; Open Graph image with an absolute URL — checked by pasting the link into WhatsApp | 4 + 6 | unknown | |
| E7 | No dead links, no template leftovers | Every link clicked; no "Create Next App" title, favicon or README text | 6 | unknown | |
| E8 | Real screenshots, demo logins up front | README: screenshot, short clip, live link, demo logins + the 5 samples | 7 | unknown | |
| E9 | Honest numbers | Eval numbers from real runs; pilot numbers only with ≥ 5 teachers; nothing invented | all | unknown | |
| E10 | Analytics + cookie banner | — | — | skipped-deliberately | No third-party analytics or tracking cookies, so no banner; we count lessons in our own database |

## F. Testing (stage 10)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| F1 | Unit tests where logic branches | bugs, mind-state (incl. Ravi's 7 turns), speakers, guardrails, quote check, `step()`, WhatsApp steps, jobs | 2–5 | unknown | |
| F2 | Route tests | Start / turn / end / card in mock mode, incl. 401, 403 (someone else's lesson), 409, 413, 429 | 1–2 | unknown | |
| F3 | One end-to-end test in CI | Playwright: login → start → typed turn → sees 35 → End → card | 6 | unknown | |
| F4 | Fakes copied from real responses | Sarvam, Azure, Twilio test fixtures saved from the smoke scripts (scrubbed) | 3 | unknown | |
| F5 | Bug fixes start with a failing test | Bug-bash PRs show the test first | 7 | unknown | |
| F6 | AI evals | 100 labelled lessons + 20 red-team cases; run before and after every prompt change; numbers on `/admin/evals` | 6 | unknown | |
| F7 | Load test | — | — | skipped-deliberately | Free tier, and every turn costs money; one server is enough for judging |
| F8 | Scanner / pen test | — | — | skipped-deliberately | Replaced by the manual access-control test (D6), `npm audit` and gitleaks |

## G. Deploy, monitoring, reliability (stages 11–13)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| G1 | Every change through a green PR | Protected `main`; the agent reads its own diff before merging | all | unknown | |
| G2 | Auto-deploy + know what's live | Render deploys `main`; `/api/version` shows the commit; auto-deploy off after the tag | 1 + 7 | unknown | |
| G3 | Rollback known | The Render rollback path written in `docs/INFRASTRUCTURE.md` and tried once | 6 | unknown | |
| G4 | Health and uptime | `/api/healthz` (no DB) + `/api/readyz` (DB, 2 s timeout); UptimeRobot every 5 min with email alerts | 1–2 | unknown | |
| G5 | Logs | One JSON line per event with the request id; never keys, phone numbers, PINs, audio or full transcripts | 1 | unknown | |
| G6 | Spend alerts and caps | Console workspace limits ($350 coding, $75 app) + the app's daily budget guard | 0 + 2 | unknown | |
| G7 | Timeouts everywhere | Claude 15 s (Director/Children) / 45 s (Coach), Sarvam 15 s, Azure 10 s, Twilio 10 s, DB connect 10 s | 2–5 | unknown | |
| G8 | Retries only where safe | Jobs: 3 tries with backoff; user-facing calls: at most 1 retry | 2 + 5 | unknown | |
| G9 | Graceful failure | Children fail → backup lines; TTS fails → text only; STT fails → text box; Coach fails → simple card from her words | 2–3 | unknown | |
| G10 | "If this service is down" table | `docs/ARCHITECTURE.md`: Anthropic, Sarvam, Azure, Twilio, Neon, Render — slow → ?, down → ? | 6 | unknown | |
| G11 | Backups, RPO and RTO | Neon history + a backup branch before the freeze; README states RPO and RTO honestly | 7 | unknown | |
| G12 | Infrastructure as code | — | — | skipped-deliberately | `docs/INFRASTRUCTURE.md` lists every service and every changed setting instead |
| G13 | Error-tracking service | — | — | skipped-deliberately | `ai_calls` errors + JSON logs with request ids + the admin trace + UptimeRobot cover it this week |

## H. Privacy and law (stage 14 — India's DPDP basics)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| H1 | Notice and consent | Consent screen (web) and consent step (WhatsApp); saved with text version and time | 2 + 5 | unknown | |
| H2 | Privacy and terms pages | `/privacy`: what we keep, why, how long, which services see it, how to get it deleted. `/terms`: non-commercial demo, no warranty | 4 | unknown | |
| H3 | Keep the minimum | Audio never stored; media deleted after 60 min by the sweep; phone numbers only in `wa_contacts`; pilot data never in git | 3–5 | unknown | |
| H4 | Contact / grievance route | A real, read email in the footer and `/privacy` | 4 | unknown | |
| H5 | Licences of what we use | `npx license-checker --summary` checked for GPL/AGPL | 6 | unknown | |

## I. Maintenance, cost and AI (stages 15, 16, 18, 19)

| # | Item | Done looks like here | Phase | Status | Evidence |
|---|---|---|---|---|---|
| I1 | Lock file + Dependabot | `package-lock.json` committed; Dependabot alerts on | 0 | unknown | |
| I2 | Version + changelog | Tag `v1.0-submission`; `CHANGELOG.md` | 7 | unknown | |
| I3 | Docs set | README, `docs/ARCHITECTURE.md`, `docs/INFRASTRUCTURE.md`, `LICENSE`, `CHANGELOG.md`; README steps tested from a clean clone | 6 | unknown | |
| I4 | Cost per lesson known | From `ai_calls`: average $ per lesson in the README and on `/admin/evals` | 6 | unknown | |
| I5 | Could two copies run? | Yes, except the in-memory login lockout and lesson-file cache (written down) | 6 | unknown | |
| I6 | LLM basics | Keys on the server only; `max_tokens`, timeout, tokens and cost logged on every call; prompt caching confirmed (`cacheReadTokens > 0`) | 2 | unknown | |
| I7 | Prompts are code | `src/lib/ai/prompts/*.ts` with a `version`; the version is saved with every call; tuned for the model ids in `.env.example` | 2 | unknown | |
| I8 | Structured output, checked | `messages.parse` + Zod; parse failures, refusals and `max_tokens` stops go to the fallback path | 2 | unknown | |
| I9 | Prompt-injection defence | Teacher text inside `<teacher_said>`; no tools; model output never executed or rendered as HTML; red-team cases pass | 2 + 6 | unknown | |
| I10 | Hallucination guard | The engine decides every number; line check + quote check; the card says it was written by AI | 2–3 | unknown | |
| I11 | Outside APIs pinned and listed | README lists Claude model ids, Sarvam `saaras:v4`, Azure voice names, the Twilio sandbox — and which key each needs | 6 | unknown | |
| I12 | Incident notes | If the live site breaks: 5 lines in `docs/incidents/` (what, impact, why, fix, how we'd notice sooner) | as needed | unknown | |

## OWASP Top 10 notes (fill in during Phase 6)
- A01 Broken access control: …
- A02 Cryptographic failures: …
- A03 Injection: …
- A04 Insecure design: …
- A05 Security misconfiguration: …
- A06 Vulnerable components: …
- A07 Identification and authentication failures: …
- A08 Software and data integrity failures: …
- A09 Logging and monitoring failures: …
- A10 Server-side request forgery: …
- **Our weakest area, honestly:** …

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
