# PROGRESS — Shikshakalay solo build

> The agent updates this file in every PR (the last commit before merging). CLAUDE.md loads it into every
> conversation, so keep it short (under ~150 lines): when a phase is done, collapse its task list into one line
> in the "Done log".

## Now
- **Phase:** 3 — Voice, coach and card (G2 passed Tue 27 Oct 19:15)
- **Next task:** Phase 3 — P1-T11 speed (text first, audio fetched after) + children@2 shorter lines, then P2-T4 recorder
- **Live URL:** https://shikshakalay.onrender.com
- **Render mode:** `USE_MOCKS=0` — real engine on the Neon main branch
- **Last gate passed:** G2 (Tue 27 Oct 19:15)

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
| H3.3 | 5 test recordings → `private/recordings/r1..r5.m4a` | 🟡 | Tue 27 Oct 17:00 | later (operator); STT tested with Bulbul-spoken lines meanwhile |
| G1-phone | Open the live link on a phone once, play "What is 52 minus 27?" | 🛑 | Tue 27 Oct 17:00 | done |

## Gates
| Gate | Status | Proof (what was run and seen) | When |
|---|---|---|---|
| G0 Setup | ✅ | verify + build green locally; CI `check` green on PRs (#1–#5 old repo, #1 new repo); ruleset `main` active, squash only, auto-delete (gh api); env:check = MOCK mode | Tue 27 Oct 17:05 |
| G1 Live skeleton | ✅ | `smoke:live --full` green on https://shikshakalay.onrender.com at 23ac4ac (login, Ravi 35 / Arjun 35 / Meena 26, card); readyz 200; UptimeRobot on; operator phone check ok | Tue 27 Oct 18:08 |
| G2 Real engine (typed) | ✅ | Live, real mode, commit 03e0510: `smoke:live --lesson --full` green — 35/35/26 → "Say 25" → all 25 → "43 − 18?" → Ravi 35, Arjun 35; same-key retry = same turn; card stored. Prod ai_calls: 6 rows with tokens + cost ($0.0012), cache reads from turn 2 (3,265 / 2,195). 403 test passes (`api.test.ts`). Prod DB: 13 tables, 13 indexes, 3 demo users. | Tue 27 Oct 19:15 |
| G3 Voice + card | ⬜ | | |
| G4 MVP | ⬜ | | |
| G5 WhatsApp | ⬜ | | |
| G6 Evals + docs + freeze | ⬜ | | |
| G7 Submission ready | ⬜ | | |

## Tasks (tick when merged · estimate → actual minutes)
**Phase 3** — [~] P3-T1 voice smoke (Sarvam TTS + STT checked with Bulbul-spoken lines; re-run on the operator's recordings) · [x] P3-T3 stt/tts (60 → 45, Sarvam Bulbul instead of Azure) · [x] P3-T4 media (30 → 20) · [x] P3-T6 fixed clips (20 → 10, mp3 only) · [x] P1-T9 coach (90 → 45; card audio route moves to P1-T10 with the voice code) · [x] P1-T10 voice in turn (60 → 35) · [ ] P2-T4 recorder · [x] P2-T6 replies (already in the practice room; audio playback lands with voice) · [x] P2-T7 card + history (60 → 30; card play button lands with voice) · [ ] P2-T8 + P3-T5 languages · [ ] P1-T11 speed · [ ] E1 eval batch
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
- Reply time p50 / p90: — (live G2 turns: 4.2 s, 3.1 s, 3.3 s server time; Director then Children in sequence; P1-T11)
- App AI spend so far (from `ai_calls`): dev ~$0.03 · prod $0.0012 (27 Oct). One full lesson + coach card ≈ $0.017 (coach $0.014).
- Coding spend (operator reads `/usage` at each gate): $41.47 total (Wed 28 Oct 00:20) · $26.39 at G2 · $14 at G1 · $5.21 after Phase 0
- Eval results: — (tuning only so far: Director 30/30 move, children, sum on the fixture after director@2; Children 39/39 lines with the engine's number, 38 first try, 1 retry, 0 backup)

## Later (ideas nobody asked for — not in scope)
-

## Done log (one line per finished phase)
- Phase 0 (Tue 27 Oct 04:10): Next.js 16 + shadcn (Radix) + kit, scripts, env, MIT licence, CI; repo moved to akshat18-gg/shikshakalay; ruleset on main.
- Phase 1 (Tue 27 Oct 18:08): mock API with request ids/logs/env check/version, app shell + i18n, practice room, smoke:live; Render + UptimeRobot live; G1 on the phone.
- Phase 2 (Tue 27 Oct 19:15): Neon + indexes + readyz, bugs, mind-state + speakers (Ravi's table), logins + consent + proxy, askJson + ai_calls + pricing + budget, teacher lines, lesson loader, Director/Children/line check, step() + orchestrator, real mode live; G2.
