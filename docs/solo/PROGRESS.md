# PROGRESS — Shikshakalay solo build

> The agent updates this file in every PR (the last commit before merging). CLAUDE.md loads it into every
> conversation, so keep it short (under ~150 lines): when a phase is done, collapse its task list into one line
> in the "Done log".

## Now
- **Phase:** 7 — Freeze and submission (Sun 1 Nov; G6 evals + docs done today)
- **Next task:** deploy the glass theme (`v1.0.2-submission`) → smoke every role → debugging with the operator · waiting: recordings, pilot numbers, video/deck links (see the table)
- **Live URL:** https://shikshakalay.onrender.com
- **Render mode:** `USE_MOCKS=0` — real engine on the Neon main branch
- **Last gate passed:** G4 (Sat 31 Oct)

## Waiting on the operator
| # | What | 🛑/🟡 | Asked (IST) | Status |
|---|---|---|---|---|
| H0.1 | Repo the operator controls | 🛑 | Tue 27 Oct 03:58 | done — new repo `akshat18-gg/shikshakalay` (no transfer) |
| H0.3 | GitHub settings: ruleset on `main`, squash only, auto-delete branches | 🛑 | Tue 27 Oct 04:05 | done (checked via API) |
| H0.4 | Licence MIT, three names | 🟡 | Tue 27 Oct 03:58 | used default |
| H1.1 | Render web service | 🛑 | Tue 27 Oct 03:58 | done — https://shikshakalay.onrender.com |
| H1.2 | UptimeRobot on `/api/healthz` | 🛑 | Tue 27 Oct 03:58 | done |
| H-render | Render deploys from `akshat18-gg/shikshakalay` (auto-deploy on commit) | 🛑 | Tue 27 Oct 17:45 | done (live 23ac4ac) |
| S2.2 | OK for db:push:prod + db:seed:prod; Render USE_MOCKS=0 | 🛑 | Tue 27 Oct 19:00 | done |
| H3.1 | Sarvam API key → .env.local + Render `SARVAM_API_KEY` | 🛑 | Tue 27 Oct 17:00 | done (both, confirmed 28 Oct) |
| H3.2 | Azure Speech key | 🛑 | Tue 27 Oct 17:00 | replaced: Sarvam Bulbul for all voices (operator, 27 Oct) |
| H3.4 | Voice picks | 🟡 | Tue 27 Oct 20:40 | done — keep defaults (operator, 28 Oct) |
| H4.2 | Hindi check | 🟡 | Wed 28 Oct 01:20 | done by a model pass (#42, Sun 1 Nov); a native speaker's read is still welcome |
| S4-seed | OK to run `npm run db:seed:prod` (8 synthetic teachers, adds rows only) | 🛑 | Fri 30 Oct 09:55 | done (Sat 31 Oct 01:09) |
| H6.1 | Label review | 🟡 | Sat 31 Oct 01:25 | settled by a third model pass (#41, `arbiter`); operator may confirm the picks in `docs/solo/label-review.md` |
| H-usage | `/usage` total (coding spend) — last message had "$<amount>" | 🟡 | Sat 31 Oct 02:15 | open |
| H-pin | DEMO_PIN value for README/form | 🛑 G7 | Sat 31 Oct 03:40 | done — `1234` (operator, Sun 1 Nov; checked on the live login) |
| H-pilot | Forward `private/pilot-messages.md` to teachers | 🟡 | Sat 31 Oct 02:15 | open |
| H5 | Twilio | 🟡 | Sat 31 Oct 02:00 | Plan B (default after the 2 pm deadline): WhatsApp = roadmap; README/video script say so |
| E-run2 | Eval run 2 with director@4 | 🛑 | Sat 31 Oct 03:40 | done Sun 1 Nov ($0.54, < $1 pre-approved): Director 89.1 % vs 84.1 %; #37 merged |
| H7 | Phase 7: Neon branch `backup-submission`, Render auto-deploy off after the tag, GitHub push protection on? | 🛑 | Sat 31 Oct 03:40 | later |
| H-prodsave | Run 2 on the live `/admin/evals` + pilot counts | 🛑 | Sun 1 Nov 17:30 | done 17:18 — over Neon's HTTPS SQL endpoint (port 5432 is blocked here); live page shows director@4 89.1 %; pilot: 0 of 10 logins used |
| H3.3 | 5 test recordings → `private/recordings/r1..r5.m4a` | 🟡 | Tue 27 Oct 17:00 | later (operator); STT tested with Bulbul-spoken lines meanwhile |
| G1-phone | Open the live link on a phone once, play "What is 52 minus 27?" | 🛑 | Tue 27 Oct 17:00 | done |

## Gates
| Gate | Status | Proof (what was run and seen) | When |
|---|---|---|---|
| G0 Setup | ✅ | verify + build green locally; CI `check` green on PRs (#1–#5 old repo, #1 new repo); ruleset `main` active, squash only, auto-delete (gh api); env:check = MOCK mode | Tue 27 Oct 17:05 |
| G1 Live skeleton | ✅ | `smoke:live --full` green on https://shikshakalay.onrender.com at 23ac4ac (login, Ravi 35 / Arjun 35 / Meena 26, card); readyz 200; UptimeRobot on; operator phone check ok | Tue 27 Oct 18:08 |
| G2 Real engine (typed) | ✅ | Live, real mode, commit 03e0510: `smoke:live --lesson --full` green — 35/35/26 → "Say 25" → all 25 → "43 − 18?" → Ravi 35, Arjun 35; same-key retry = same turn; card stored. Prod ai_calls: 6 rows with tokens + cost ($0.0012), cache reads from turn 2 (3,265 / 2,195). 403 test passes (`api.test.ts`). Prod DB: 13 tables, 13 indexes, 3 demo users. | Tue 27 Oct 19:15 |
| G3 Voice + card | ✅ | Operator's phone test on the live link (real mode, c7c861c): spoken Hindi turns → transcript shows, children answer in different Bulbul voices, text before audio; End → the card quotes their real words ("phone ok"). Live speed (spoken Hindi, `npm run speed:check`): text p50 3.3 s / p90 5.1 s, audio p50 5.0 s / p90 6.6 s. E1 batch submitted and collected (100/100 lessons, #23). KI-001 (out-of-lesson sums) fixed and replayed live before the test. | Wed 28 Oct |
| G4 MVP | ✅ | Prod seeded (11 users, 50 lessons). Live at 2021589: `smoke:live --full` green (35/35/26, card); teacher_demo/trainer_demo/admin_demo log in; teacher → /trainer redirected to /; /trainer shows 9 teachers · 51 lessons with small numbers hidden; /admin/trace lists 100 lessons; /try 200; offline shell checked in Phase 4. 10 pilot logins P01–P10 on prod (PINs only in `private/pilot-logins.txt`). | Sat 31 Oct 01:12 |
| G5 WhatsApp | ⬜ | | |
| G6 Evals + docs + freeze | ✅ | Run 2 (director@4) on the arbiter key: resist 100 %, teachable 100 %, Director 89.1 %, lines 100 % final, quotes 100 %, red team 20/20; audit final pass (#43); CI check + e2e green on #41–#43; feature freeze = this PR | Sun 1 Nov |
| G7 Submission ready | ⬜ | | |

## Tasks (tick when merged · estimate → actual minutes)
**Phase 4** — [x] P1-T12 seed (60 → 40; dev seeded; prod waits on the operator's OK) · [x] P1-T13 Sana (EN + HI speak when invited; trace shows engagement 0 → 1) · [x] P2-T9 trainer (60 → 30) · [x] P2-T10 admin (60 → 30) · [x] P2-T11 /try (45 → 25) · [x] P3-T14 red team (evals/redteam.json, 20 cases; sample-5 recording later) · [x] P2-T12 PWA + offline (shell + pages offline; recording queue cut, KNOWN-ISSUES) · [x] S4.1 polish (headers, 404/error/global-error, OG image, footer, /privacy, /terms) · [x] S4.2 pilot pack (guide, consent EN+HI, WhatsApp forward message, changes log, scripts/create-pilot-users.ts)
**Phase 5** — [x] P3-T10 jobs + webhook · [x] P3-T11 conversation (real Ogg/Opus voice notes since 31 Oct) · [x] P3-T12 sweep · [ ] H5 webhook + UptimeRobot + phone test
**Phase 6** — [x] E2 labels (arbiter pass, #41) · [x] P1-T14 evals (run 1: 100 lessons $0.53; red team 20/20 $0.003) · [x] top-3 fixes (director@4, run 2: 89.1 %, #37) · [x] Playwright + axe (4 e2e tests in mock mode, axe on login/home/practice, CI job on) · [x] S6.1 security pass (audit 55 rows filled) · [x] S6.2 docs (README with TODO markers for eval numbers + demo PIN, ARCHITECTURE, INFRASTRUCTURE, CHANGELOG; clean-clone test ok) · [x] S6.3 secret scan (gitleaks clean)
**Phase 7** — [~] bug bash (favicon fixed; the debugging phase with the operator comes next) · [x] screenshots (docs/media, scripts/media-shots.mts) · [~] video script + deck numbers + form answers (drafts; TODO markers: demo PIN, video/deck links, pilot, spot checks) · [x] final evals (run 2 + red team) · [x] audit final (#43) · [x] freeze + tag (`v1.0-submission` = 23a2db8, live, smoke `--full --lesson --roles` green Sun 1 Nov 17:00)

## Decisions (date — decision — why)
- 1 Nov — Dark glass theme (operator: "glassy and transparent, black"): tokens only + `.glass`/`.glass-teal` panels; `text-navy` → `text-heading`/`text-mint` (links), `bg-white`/`bg-pale` → glass, `bg-navy` → mint; child colours lightened (≥ 7:1 on the base); deck teal/mint stay the accents, square corners and Noto stay. Checked: axe in e2e (contrast = serious) 4/4, screenshots at 360/1280 EN+HI.
- 1 Nov — UI polish after the tag (operator's request, `docs/…/SKILL.md` = Apple "fluid interfaces" notes): visual + motion only, no logic. `.press` = feedback on pointer-down (3 % scale, 100 ms); top bar and composer are translucent materials with a soft scroll edge; chat lines arrive with `@starting-style` fade-up; smooth 30 s ring + recording halo; typing dots; size-specific tracking/leading (Devanagari looser); `prefers-reduced-motion/-transparency/-contrast` fallbacks. Square corners, deck colours, Noto fonts kept (AGENTS §13). Playwright needed `npx playwright install chromium` on this PC; `media-shots.mts --out` for before/after shots in `private/screens/`.- 1 Nov — Work moved to a Windows PC: `node_modules` reinstalled (`npm ci`, the Mac's esbuild binary can't run); npm scripts with `VAR=1 cmd` need Git Bash; Neon's port 5432 times out from this network, so prod DB steps go to the operator.
- 1 Nov — contracts.ts (additive): `labelSource: "arbiter"`. A third model pass settled the 65 label disagreements (`label-check --apply --source arbiter`); the README/deck never call it human labelling. `--apply` is not idempotent (spot-check fixes look like new disagreements): apply once, from the pre-#41 lessons.
- 1 Nov — D044/D057 picked as `repeat_same_way` (she repeats what she already told them); both runs scored on the same key: director@3 84.1 %, director@4 89.1 % → #37 merged.
- 1 Nov — Hindi model review: hi.json 11 strings, lesson file v4 (5 Hindi sample lines), coach@3 ("सवाल", not "सम"). Consent text left at v1 (pilot teachers agreed to it).
- 1 Nov — Twilio Plan B by default (the 2 pm decision time passed with no upgrade).
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
- 27 Oct — contracts.ts (additive): ApiErrorCode `busy` (409) — two different turns of one lesson at once; the loser gets `busy` (a same-key retry gets the stored turn). i18n `errors.busy`.
- 27 Oct — Until the Coach exists (P1-T9), `endLesson` stores the plain card built from her own words (`simpleCard`, i18n EN/HI); the Coach will run first and fall back to it.
- 27 Oct — Hello `audioUrl` stays null until the fixed clips exist (P3-T6). A recording without text → 502 `stt_failed` until voice lands (P1-T10).
- 27 Oct — `logError` never prints a failed query's parameters (DrizzleQueryError repeats them — teacher words, PIN hashes); only the DB reason and code.
- 27 Oct — `scripts/seed.ts` = the three demo users for now (idempotent); dev seeded. `smoke:live -- --lesson` runs the G2 sequence + a same-key retry.
- 27 Oct — Prompt caching confirmed: from turn 2 the Director reads 3,265 and the Children 2,195 cached tokens; a turn after the first costs ≈ $0.00017.
- 27 Oct — Coach (coach@2, Sonnet 5.5, default thinking, 4000 max tokens): call → one retry if the call fails → else plain card. Quote check (NFKC, lower case, no \p{P}, ≥ 90% window match) → one rewrite call with her real words → bad scores dropped, strength/fix quotes replaced by her first ≤ 12 words. `quotesVerified` = no bad quote after Claude's attempts; `droppedPoints` = what code had to repair. Over the daily budget → plain card, no Claude.
- 27 Oct — coach@2: Hindi cards must not assume the teacher's gender (coach@1 wrote "मैं बताऊँगी").
- 27 Oct — History: last 50 lessons, newest first, IST dates, the card's "try instead". Home: last card + the check-in when the last finished lesson ended 12+ h ago and has no answer (`POST /api/checkins`, one per lesson). Top bar wraps to two rows on phones (History, Log out on row 2).
- 27 Oct — TTS = Sarvam Bulbul (operator: Azure unavailable). `tts.ts` backend interface (Sarvam now, Azure later). One request per line, parallel, MP3 joined (ID3 stripped); 22050 Hz. Voices picked by measured pitch (scripts/voice-samples.ts). STT = saaras:v4 + keyterms (digits, unlike v3). AGENTS §8 updated.
- 28 Oct — Voice is Sarvam only (operator): Azure keys are "optional" in env:check, AGENTS §2/§4/§8/§15 + README say Sarvam Bulbul; `tts.ts` stays swappable.
- 28 Oct — Sarvam cost per voice lesson ≈ ₹2 (STT ₹0.49/min × ~1.2 min + Bulbul v4-flash ₹1/1K chars × ~1.3K); up to ₹7 if each request bills a full minute. Top up ₹500 before the pilot.
- 30 Oct — Eval runner: real step() per lesson, probe "Everyone, what is {finalSum}?" bypasses the Director and makes every child answer; resist/teachable from the engine's probe answers; Director accuracy = move (addressedTo, newTask reported too; "" ≡ current sum); line fidelity from records; coach on a sample (quote first pass + after repair); empty metrics = n/a. --redteam checks each case automatically.
- 30 Oct — Playwright e2e (mock mode, phone size): lesson → 35 → card, roles, /try, axe (serious/critical = fail). axe caught list items inside `<ol role="log">` (the role removed the list) — fixed by moving the log role to a wrapper div. @axe-core/playwright added (dev dependency).
- 30 Oct — WhatsApp: webhook checks the Twilio signature → job (dedupe MessageSid) → TwiML at once → after() runs it; step machine in channels/whatsapp.ts (pure, tested with fakes); no transaction held during Claude — overlapping messages get the engine's `busy` → "one moment". WhatsApp audio is made at once (Twilio needs a public media URL), mp3 for now. Check-in next evening ~6:30 pm IST capped at 23 h after her last message. Sweep: due + stuck jobs (FOR UPDATE SKIP LOCKED), 3 attempts, deletes expired media.
- 30 Oct — PWA: manifest + icons + OG image made by Playwright from HTML (scripts/make-images.mts); hand-written sw.js (cache-first static/audio/icons, precache fixed clips, network-first pages with the cached copy offline, never /api); registered in production. Bug found and fixed: cloning a response after returning it cached nothing. Offline recording queue cut. Twilio docs: +1 737 250 8034, `join twilio-trial`, 1 recipient / 100 messages / 5 testers — WhatsApp = operator test + video; one audio + one text per turn.
- 30 Oct — /try: 5 samples, each a fresh lesson. Sample 4 = "Now 43 minus 18?" → "Ravi, how did you get 35?" → "Ravi, show 43 with bundles…" → "Ravi, 13 take away 8?" (a fresh lesson starts on 52 − 27, so the arc needs the sum and the reveal first) → Ravi GOT_IT. Sample 5 sends public/samples/sana-hi.m4a as audio when the file exists (checked per request), else the Hindi line as text.
- 30 Oct — Seed: T01–T08 (isDemo, no PIN) with 1–4 lessons each played through the real step() with a fake Claude (backup lines), cards with Teach scores from the moves, ai_calls rows tagged `demo-seed` (exclude from real spend). Re-running replaces only these teachers' rows. Trainer dashboard: CSS bars (plan's cut for charts), privacy rule = hide any number from < 5 teachers. Admin trace: her words → Director JSON → minds before/after (changes highlighted) → lines + check → calls, time, cost. Trainers/admins are sent from / to their pages.
- 31 Oct — Eval run 1 saved to prod (`--rescore … --unreviewed --save`, no Claude cost; operator OK'd saving eval rows to prod): live /admin/evals shows it. Bug found and fixed there (#39): the confusion table printed raw JSON (the row stores {counts, confusion}) → a real table; metric names via i18n.
- 31 Oct — Twilio: the classic Sandbox (shared +1 415 523 8886, own `join <code>`, "When a message comes in" under Sandbox settings) is a legacy-Console feature; the new-console trial only has "Try out WhatsApp" without an inbound webhook → G5 parked, Plan B wording in README/video script/form answers (no fake WhatsApp footage).
- 31 Oct — Security pass: live cross-account 403s, cookie flags, headers, friendly errors; no secrets in `.next/static`; gitleaks 78 commits → 2 false positives (fake MessageSid) in `.gitleaksignore`; licences OK (no GPL/AGPL); npm audit 3 low (shadcn CLI). Fixes: `logError` masks phone numbers/emails (Twilio errors repeat the number), finished/failed jobs drop their payload, `poweredByHeader: false`, /try's fetch moved to api.ts, unused shadcn files + recharts/sonner/next-themes/idb-keyval removed. `scripts/delete-user.ts` (dry run default) tested on dev.
- 31 Oct — Feedback (AGENTS §12 route that was missing; the pilot guide promised it): contracts.ts (additive) `FeedbackBody` (two 1–7 UMUX-Lite answers + optional `change`, strict); `POST /api/feedback` (user from the cookie); form under the card for teachers (7-column scale fits 360 px). Pilot messages for P01–P10 filled into `private/pilot-messages.md` (git-ignored).
- 31 Oct — WhatsApp voice notes (operator OK'd opusscript, MIT, no install scripts): Sarvam WAV 24 kHz → opusscript (WASM libopus, VOIP, 24 kbps, 20 ms frames) → our own Ogg writer (OpusHead/OpusTags, CRC, granules). A real Bulbul clip: Chromium decodes it (1.45 s, same loudness); ~3 KB/s vs MP3's 16 KB/s. WhatsApp turns, hello/again fixed clips (.ogg next to .mp3) and the card's say-tomorrow line use it; web stays MP3. `serverExternalPackages: ["opusscript"]` so the .wasm loads from node_modules.
- 31 Oct — E2 label check: Sonnet 5.5 (Batch, $0.22) labels all 800 lines blind with the generator's own tag definitions (shared `MOVE_MEANINGS`); 735/800 agree (91.9%), 50/100 lessons fully agreed → `agreed` + reviewed; 65 disagreements (33 are new_sum ↔ other, which change no child) + 40 seeded spot checks → `docs/solo/label-review.md`; `--apply` reads the picks (`human`). Eval runner: per-turn numbers + `--rescore <file>` scores a saved run against today's labels at no cost.
- 28 Oct — E1: 100/100 lessons valid (50 weak / 50 strong, 50 en / 50 hi, focus ravi 17 · arjun 17 · meena 16; 800 teacher turns, all 11 moves present; 46 romanised-Hinglish turns), output 78,827 tokens ≈ $0.90. labelSource "generator", reviewed false until E2. For P1-T14: a newTask equal to the current sum and "" mean the same — compare them as equal.
- 28 Oct — KI-001 (operator's live test): any a − b ≤ 99 plays through the mistakes; b > a → one child `cannot`; +/×/÷/3-digit → one child `not_today`; both numbers from the current sum's digits = a step, not a task (engine decides — protects sample 4); a react never parrots; line check: no-number lines only her numbers + the sum, parrots only the told answer; digits count for "too short"; director@3 (36/36 sums, 36/36 children, 35/36 moves on the 36 lines); children@3; lesson file v3 (`cannot`, `notToday` backups). AGENTS §7.2/7.4/7.5/7.10 updated.
- 28 Oct — E1 generator: Opus 5.5, structured output, 100 specs (50 weak / 50 strong, half Hindi/Hinglish, 10 teacher styles, focus child rotates ravi/arjun/meena, a fresh borrowing final sum each), each lesson checked (weak = only weak moves; strong = reveal → ≥ 2 fixes on the focus child; valid sums). Sample cost says the batch is ≈ $1, not $5.
- 28 Oct — Recorder: hold to talk (release sends, slide off cancels) or tap/tap (also keyboard); 30 s ring + auto-stop; webm/opus → mp4 → ogg at 24 kbps; one idempotency key per turn, retried twice on network errors (1 s, 3 s); audio unlocked on the first tap (silent WAV), replies auto-play, ▶ Play button if the phone blocks it and on every turn. Tested with Chrome's fake mic (a Bulbul-spoken WAV) against real mode: transcript → children → voices.
- 28 Oct — Speed: children@2 (answer ≤ 12 words, parrot ≤ 8, explain ≤ 25 with only its own steps; mean 7.8 words, was ~20) and text first — web turns return as soon as the lines exist; `audioUrl` = `/api/sessions/[id]/turns/[n]/audio`, made by Bulbul on first request (deduped, cached 1 h).
- 28 Oct — Voice in the turn: typed text wins, else Saaras (502 stt_failed on failure); Bulbul clip → media (60 min) → audioUrl; TTS failure → audioUrl null. "Say again" and hello use committed fixed clips (public/audio, mp3). Card audio: coach voice, cached 24 h. `/api/media/[token]` and card audio honour Range (iPhone Safari). Sarvam calls in ai_calls with approximate USD (₹ price / 88).
- 28 Oct — Seen in the first real voice turn: 9–12 s server time from the Mac, and Ravi explained (with Arjun's steps!) in answer mode → 26 s of audio. Fix in P1-T11: shorter answer-mode lines (children@2) and audio fetched after the text.
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
- Reply time p50 / p90 (live, spoken Hindi, 28 Oct 00:55, `npm run speed:check`): text 3.3 s / 5.1 s · audio 5.0 s / 6.6 s · server 3.1 s / 4.9 s
- App AI spend so far (from `ai_calls`): dev ~$0.03 · prod $0.0012 (27 Oct). One full lesson + coach card ≈ $0.017 (coach $0.014).
- Coding spend (operator reads `/usage` at each gate): $70.80 total (Fri 30 Oct 08:00) · $66.85 at G3 (Wed 28 Oct) · $41.47 mid-Phase 3 · $26.39 at G2 · $14 at G1 · $5.21 after Phase 0
- Eval run 2 (1 Nov, director@4, final key): resist 100 % · teachable 100 % · Director 89.1 % · addressedTo 95.0 % · newTask 99.8 % · lines first try 96.9 % / final 100 % · quotes 100 % · red team 20/20 · $0.54 (+ $0.003).
- Eval run 1 (31 Oct, director@3; 84.1 % on the final key): resist 100 % · teachable 100 % · Director 89.1 % on agreed lines (85.8 % all) · addressedTo 94.8 % · newTask 99.9 % · lines first try 97.6 % / final 100 % · quotes 100 % · red team 20/20 · $0.53. App AI spend this session ≈ $0.80 (labels $0.22, run 1 $0.53, red team, fixture checks, screenshots).
- Eval results before: (tuning only: Director 30/30 move, children, sum on the fixture after director@2; Children 39/39 lines with the engine's number, 38 first try, 1 retry, 0 backup)

## Later (ideas nobody asked for — not in scope)
-

## Done log (one line per finished phase)
- Phase 0 (Tue 27 Oct 04:10): Next.js 16 + shadcn (Radix) + kit, scripts, env, MIT licence, CI; repo moved to akshat18-gg/shikshakalay; ruleset on main.
- Phase 1 (Tue 27 Oct 18:08): mock API with request ids/logs/env check/version, app shell + i18n, practice room, smoke:live; Render + UptimeRobot live; G1 on the phone.
- Phase 3 (Wed 28 Oct): coach + quote check, history + check-in, Sarvam voice (Saaras in, Bulbul out, swappable TTS), media store, fixed clips, voice in the turn (text first), recorder, Hindi/English parity + hindi-review sheet, speed (text p50 3.3 s), KI-001 any-sum fix, E1 100 eval lessons; G3 on the phone.
- Phase 2 (Tue 27 Oct 19:15): Neon + indexes + readyz, bugs, mind-state + speakers (Ravi's table), logins + consent + proxy, askJson + ai_calls + pricing + budget, teacher lines, lesson loader, Director/Children/line check, step() + orchestrator, real mode live; G2.
