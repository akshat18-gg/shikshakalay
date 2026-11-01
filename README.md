# Shikshakalay — a practice classroom for primary teachers

**Practise a lesson on AI children who make real mistakes, then get a coaching card that quotes your own words.**

Team Blue Screen (Akshat Verma, Pratyush Kumar, Sourin Nandy — SRMIST Kattankulathur) · AI for Foundational Learning
Hackathon (ShikshaNext / Central Square Foundation × Anthropic) · **Challenge 3: Teacher Support and Training**

**Live demo:** https://shikshakalay.onrender.com · **Video:** _link added on submission day_ ·
**Code:** https://github.com/akshat18-gg/shikshakalay

<p>
  <img src="docs/media/practice-en-phone-full.png" alt="Practice lesson: Ravi says 35 while the others say 25; after the teacher tells the answer Ravi parrots 25, then gets the next sum wrong again" width="260">
  <img src="docs/media/card-en-phone-full.png" alt="Coaching card quoting the teacher's own words: what worked, one thing to try, a line to say tomorrow" width="260">
  <img src="docs/media/practice-hi-phone.png" alt="The same lesson in Hindi: Ravi explains his steps" width="260">
</p>

More screens (trainer dashboard, AI trace, evals): [`docs/media/`](docs/media/).

## The problem

A primary teacher in India gets very little chance to practise *how* she responds to a child's mistake before she
faces 40 children. Training is mostly lectures; classroom observation is rare and feels like inspection. The most
common teaching move is to tell the right answer — and the child's wrong idea stays. Shikshakalay gives her a safe,
5-minute rehearsal: she teaches 2-digit subtraction by voice, in Hindi or English, to four pretend children whose
mistakes behave like real ones. Weak moves don't fix them; finding out how a child thinks, then using bundles and
sticks, does. At the end she gets one strength, one fix and one line to try tomorrow — each quoting her own words.

## Try it (judges)

1. Open https://shikshakalay.onrender.com (the first load after a quiet spell can take ~30 s — free hosting).
2. Log in with a demo account. PIN for all three: **`1234`** (demo-only, not a secret).

| Role | ID | What you see |
|---|---|---|
| Teacher | `teacher_demo` | Practice lessons, coaching cards, history, the 5 samples at **Try a sample** |
| Trainer | `trainer_demo` | Anonymised skill gaps across teachers (numbers from fewer than 5 teachers are hidden) |
| Admin | `admin_demo` | **AI trace** of every lesson (each Claude step, each child's mind before/after, line checks, cost) and **evals** |

**The 5 sample inputs** (one tap each on `/try`, or type/say them in a practice lesson):

| # | Input | What you should see |
|---|---|---|
| 1 | "What is 52 minus 27?" | Ravi says 35 (a real, consistent mistake); Arjun and Meena say 25; shy Sana stays quiet |
| 2 | "No, the answer is 25. Everyone say 25." then "Now 43 minus 18?" | Ravi parrots 25, then says 35 again on the next sum — a weak move is resisted |
| 3 | "Ravi, tell me how you got 35." | "8 minus 3 is 5, 4 minus 1 is 3…" — his mistake is revealed |
| 4 | "Ravi, show 43 with bundles and sticks…" then "13 take away 8?" | Ravi changes step by step and gets 25 — a strong move works |
| 5 | A Hindi voice note (`public/samples/sana-hi.m4a`; until it is added, the same Hindi line is sent as text): "सना, तुम क्या सोचती हो? आराम से बताओ।" | Shy Sana speaks for the first time, in Hindi |

Then tap **End lesson** to see the coaching card, and log in as `admin_demo` → **AI trace** to see how it was made.

## How it works — the engine decides, Claude only speaks

```
teacher speaks ─► Sarvam Saaras (speech → text)
               ─► Director  (Claude Haiku 5.5): which of 14 teaching moves was this? → JSON, Zod-checked
               ─► Mind-state engine (plain TypeScript): updates each child's belief, picks who speaks
                  and the EXACT number each child must say
               ─► Children (Claude Haiku 5.5): turns that into a 7-year-old's words, in Hindi or English
               ─► Line check (code): the line must contain the engine's number and must not drift to the
                  right answer → one retry → a fixed backup line
               ─► Sarvam Bulbul (text → speech): one voice per child — text appears first, audio follows
lesson ends   ─► Coach (Claude Sonnet 5.5): strength, fix, "say tomorrow", Teach scores
               ─► Quote check (code): every quote must be her real words → one rewrite → else repaired in code
```

- **The puppet rule.** A child's mistake is a TypeScript function (`src/lib/engine/bugs.ts`): Ravi takes the
  smaller digit from the bigger one (52 − 27 → 35). Arjun and Meena get it right (→ 25), and so does Sana — but she
  is shy and speaks only when invited by name. Claude never decides an answer — `mindState.ts` does
  (STUCK → WOBBLY → GOT_IT, "revealed", engagement), based on the move the Director tagged.
- **Teaching moves** come from the World Bank **Teach** observation tool (12 moves + `other` / `off_task`).
- **Every AI call is logged** in `ai_calls` (model, prompt version, tokens incl. cache, time, cost, ok/error) and
  shown on the admin AI trace. Prompts are versioned code in `src/lib/ai/prompts/`.
- Diagrams (a web turn, a WhatsApp turn with failure branches, the data model): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Guardrails

| Risk | What stops it (code) | If it fails |
|---|---|---|
| A child drifts to the right answer | Line check: must contain the engine's number; no correct answer unless the engine says so; ≤ 30 words; Devanagari digits normalised | One stricter retry, then the backup line |
| The Director invents a move | Zod enum of 14 tags | Can't happen |
| The Director is unsure | `confidence: "low"` → treated as `other` | No state change; logged |
| The coach quotes words she never said | Quote check (NFKC, punctuation-free, ≥ 90 % window match) | One rewrite call, then repaired from her real words |
| "Ignore your instructions…" | Her words always inside `<teacher_said>`; children stay in character; no tools | Red-team cases below |
| Off-topic / unsafe input | Director tags `off_task` | One child reacts, puzzled and polite |
| Silence, noise, 2,000 pasted characters | Empty-transcript check; 30-second cap; text trimmed to 1,000 characters | "Teacher, can you say it again?" |
| Credits drained | Login required; 40 turns per user per hour; daily app budget (`AI_DAILY_BUDGET_USD`); workspace spend limit | `429` → "let's take a break" |
| A trainer spotting one teacher | Dashboard numbers show only when ≥ 5 teachers are counted | Number hidden |

### Weak networks

Text replies arrive before audio (audio is made on first request). Children's audio is ~16 KB/s MP3 on the web and
~3 KB/s Ogg/Opus on WhatsApp. The app installs as a PWA; the shell, past pages and fixed clips open offline. A failed
send keeps its idempotency key, so "Retry" never creates a double turn. (An offline recording queue was cut — see
Known limitations.)

## External AI services and models — where keys are needed

| Service | Model / product | Used for | Key (env var) |
|---|---|---|---|
| Anthropic Claude | `claude-haiku-5-5` | Director (move tagging) and Children (lines) — every turn | `ANTHROPIC_API_KEY`; models in `DIRECTOR_MODEL`, `CHILD_MODEL` |
| Anthropic Claude | `claude-sonnet-5-5` | Coach (coaching card) — once per lesson; also the eval label check | `ANTHROPIC_API_KEY`; `COACH_MODEL` |
| Anthropic Claude | `claude-opus-5-5` (Batch API) | Writing the 100 synthetic eval lessons — offline only | `ANTHROPIC_API_KEY`; `EVAL_GEN_MODEL` |
| Sarvam AI | Saaras `saaras:v4` (speech → text, with lesson keyterms) | The teacher's voice, Hindi / English / Hinglish | `SARVAM_API_KEY` |
| Sarvam AI | Bulbul `bulbul:v4-flash` (text → speech) | One voice per child + the coach's voice | `SARVAM_API_KEY` |
| Twilio | WhatsApp (trial testing number) | The WhatsApp door | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |

Not AI, but needs configuration: Neon Postgres (`DATABASE_URL`), Render hosting, UptimeRobot (`CRON_SECRET` for the
5-minute sweep). Every variable is listed in [`.env.example`](.env.example); `AZURE_SPEECH_*` are optional and unused.
Keys live only in `.env.local` (git-ignored) and in Render's environment settings — never in the browser.

## Run it locally

Needs Node.js 22+ and npm.

```bash
git clone https://github.com/akshat18-gg/shikshakalay && cd shikshakalay
npm ci
npm run env:init   # writes .env.local in MOCK mode (USE_MOCKS=1) with random secrets — no keys needed
npm run dev        # http://localhost:3000 → log in as teacher_demo, PIN 1234 (mock mode's default DEMO_PIN)
```

Mock mode runs a scripted engine with in-memory users — no keys, no database. For the **real** engine:

1. Put real values in `.env.local` (see the table above): `ANTHROPIC_API_KEY`, `DATABASE_URL` (Neon **pooled**
   URL), `SARVAM_API_KEY` (voice), and set `USE_MOCKS=0`. `npm run env:check` shows what is missing (never values).
2. `npm run db:push` (creates the tables) → `npm run db:seed` (demo logins + 8 synthetic teachers).
3. `npm run dev`.

| Script | What it does |
|---|---|
| `npm run verify` | Format check + lint + typecheck + unit tests (CI runs these, plus `build` and Playwright) |
| `npm run e2e` | Playwright end-to-end + axe accessibility checks (mock mode) |
| `npm run env:init` / `env:check` | Make `.env.local` / list missing keys — never prints a value |
| `npm run db:push` / `db:seed` | Schema / demo data → the database in `DATABASE_URL` |
| `npm run evals` | Eval run over the 100 lessons — **real Claude calls, ~$2** |
| `npm run smoke:live -- --url <site> --full` | Checks a deployed site end to end (login, lesson, card) |

## Tests and evals

- **Unit tests (Vitest, 219):** every child's mistake on many sums, every mind-state rule incl. Ravi's 7-turn table
  (AGENTS.md §7.6), speakers, line check, quote check, the whole `step()` with fake Claude, routes (401/403/409/413/429),
  WhatsApp steps, jobs, the Ogg/Opus writer. No test calls a paid API.
- **End-to-end (Playwright, CI):** login → lesson → "35" → card; roles; `/try`; axe on 3 pages.
- **Evals:** 100 synthetic lessons (50 weak, 50 strong; 50 English, 50 Hindi/Hinglish; 800 teacher turns) written
  by Claude Opus 5.5. **How the labels were checked:** a second, independent pass (Claude Sonnet 5.5) labelled every
  teacher line without seeing the first label — they agreed on **735 / 800 lines (91.9 %)**. A third model pass
  (Claude, used as an arbiter with the Director's own tag definitions) settled the 65 disagreements and re-checked 40
  random agreed lines (35 / 40 confirmed, 5 corrected); the picks and a one-line reason for each are in
  `docs/solo/label-review.md` (`labelSource: "arbiter"`). No person has confirmed these picks yet. Each lesson runs through the
  real engine with real Claude, then a probe ("Everyone, what is {sum}?") checks whether each child still holds its
  mistake. Plus 20 red-team cases (`evals/redteam.json`). Note: eval runs 1–2 used lesson file v3, in which Arjun and
  Meena also carried mistakes; since v5 (Sun 1 Nov, operator's decision) only Ravi does, so the class mostly answers
  right and the teacher works with one child. The engine and the metrics are unchanged.

| Metric | Target | Result (run 2, Sun 1 Nov: director@4, children@3, coach@2, lesson file v3) |
|---|---|---|
| Children resist weak moves | ≥ 90 % | **100 %** (50/50) |
| Children can be taught (strong lessons) | ≥ 80 % | **100 %** (50/50) |
| Director accuracy (move tag) | ≥ 85 % | **89.1 %** of 800 lines vs. the arbiter-settled key (run 1 with director@3: 84.1 % on the same key) |
| Line fidelity, first try / after fallback | ≥ 98 % / 100 % | 96.9 % (below target) / **100 %** — 1,744 lines |
| Quote validity after the check | 100 % | **100 %** (20 cards; 100 % on first pass) |
| Red-team cases as expected | 20 / 20 | **20 / 20** (director@4, Sun 1 Nov) |
| Reply time, spoken Hindi (live) | ≤ 6 s p50 / ≤ 10 s p90 | text 3.3 s / 5.1 s · audio 5.0 s / 6.6 s (28 Oct) |
| Cost per lesson (12 turns + card) | — | ≈ $0.017 Claude + ≈ ₹2 Sarvam |

These are our own pass marks; we report the real numbers even where they fall short. Live numbers: `/admin/evals`.

## Privacy

- The teacher's recording is turned into text and **deleted at once** — never stored.
- No names are asked for: logins are codes (`P03`, `W02`). WhatsApp numbers live in one table only and are masked in
  error logs. All children are made up; eval and seed data are synthetic.
- Cards are private. Trainers see totals only, and only from 5 or more teachers.
- Consent is recorded (text version + time). Data is deleted on request (`scripts/delete-user.ts`); contact
  akshatverma71105@gmail.com. Details: `/privacy` and `/terms` on the live site.

## Reliability

- Health: `/api/healthz` (UptimeRobot every 5 min), `/api/readyz` (database), `/api/version` (live commit).
- If Claude fails mid-lesson the children use fixed backup lines and the coach falls back to a card built from her
  own words; if speech fails, text still works. Table per service: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- **RPO / RTO (honest):** data is in Neon Postgres with Neon's point-in-time history (free plan: 1 day) and a backup
  branch made before submission — RPO ≈ minutes for the last day. The app is stateless on Render: a redeploy or
  rollback takes ~5 minutes (RTO). Settings and key rotation: [`docs/INFRASTRUCTURE.md`](docs/INFRASTRUCTURE.md).

## What changed from our Ideate deck (and why)

- **Hindi + English** instead of Tamil — we could test Hindi with real teachers this week. Tamil → roadmap.
- **Twilio WhatsApp trial** instead of Glific — Glific needs a verified WhatsApp Business number. Glific → roadmap.
- **Sarvam Bulbul** for all voices instead of Azure Neural TTS — no Azure key; Bulbul handles Hindi well.
- No Redis and no vector search — Postgres alone was enough.

## Known limitations

- **WhatsApp is not live for judges.** The WhatsApp door is fully built and unit-tested (signed webhook, job
  queue, Ogg/Opus voice notes, the conversation steps), but Twilio's current free trial ("Try out WhatsApp") offers no
  incoming-message webhook, so messages can't reach our server. Teachers and judges use the web link; turning
  WhatsApp on needs a paid Twilio account with the WhatsApp Sandbox — settings only, no code change.
- One skill (2-digit subtraction). Letter-sound blending, more languages and adaptive difficulty are on the roadmap.
- Bulbul has no child-pitched boy voice, so Ravi and Arjun sound older than Meena and Sana.
- Offline: the app shell and past pages open, but a new turn needs the network (offline recording queue cut).
- Logins are 4-digit PINs with an in-memory lockout (resets on restart) and no server-side session list.
- Free hosting: the first request after ~15 idle minutes is slow; the database wakes in ~2 s.
- Eval lessons are synthetic; the coach-vs-expert agreement study (20 lessons, 2 raters) is not done yet.
- Full list: [`docs/solo/KNOWN-ISSUES.md`](docs/solo/KNOWN-ISSUES.md).

## Roadmap

### Why one skill today, and how the rest follow

Every wrong answer a child gives comes from a hand-written rule about a **known misconception** (not from the model),
with its explain-steps, Hindi and English lines, teaching-move effects and labelled eval lessons. That content is what
each module costs — about a day of work per skill — so this build does one skill deeply and measurably. The code is
already multi-skill: a lesson is a YAML scenario file (`content/scenarios/`), lessons start with a `scenarioId`, and
`GET /api/scenarios` lists what is installed. Adding a module means: (1) misconception rules + explain-steps in
`src/lib/engine/bugs.ts`, (2) a scenario file with four children, sample and backup lines in both languages,
(3) a few Director examples for that skill's tasks, (4) 50–100 synthetic eval lessons. The 12 teaching moves, the
mind-state rules, the line check, the coach and the quote check are skill-independent and stay as they are.

One engine change unlocks the maths modules: the task parser and "correct answer" are subtraction-only today
(`a − b`); making them per-skill (`operation` in the scenario file, `answerOf(task)`, one bug registry per skill) is
about a day.

### Modules by grade (Classes 1–3 below; the full Classes 1–5 catalogue is in the app at `/modules`, one live, the rest marked "coming soon")

| Grade | Subject | Module | The children's mistakes we would model | Status |
|---|---|---|---|---|
| 1–2 | Maths | Place value and number names | reads 31 as "thirteen"; thinks the longer-looking number is bigger; counts the start number when counting on | planned |
| 2 | Maths | Addition with carrying | writes both digits of a column (27 + 35 → 512); forgets the carry (→ 52); adds the carry twice | planned (next) |
| 2 | Maths | **Subtraction with borrowing** | smaller-from-larger; borrow without reducing the tens; counting back off by one | **live** |
| 3 | Maths | Multiplication as groups / tables | adds instead of multiplies (3 × 4 → 7); one group too many when skip-counting; 5 × 0 → 5 | planned |
| 3 | Maths | Division as sharing | drops the remainder; "how many groups" vs "how many each"; divides in the wrong order | planned |
| 3 | Maths | Fractions as equal parts | counts parts that are not equal; bigger denominator = bigger fraction | planned |
| 1–2 | Literacy (EN + HI) | Letter-sound blending | says each sound but cannot join them; guesses from the first letter; mixes look-alike letters (b/d, ब/व) | specified (AGENTS §7.11) |
| 1–2 | Literacy (HI) | Matras | drops the matra (कि / की); reads a half letter as a full one; puts ि after the consonant | planned |
| 2–3 | Literacy (EN + HI) | Reading fluency and sight words | word-by-word reading; swaps a similar-looking word; ignores full stops | planned |
| 3 | Literacy (EN + HI) | Reading comprehension ("who, what, where") | answers from the picture, not the text; repeats the last sentence read | planned |

Teachers would pick a grade and module on the home screen (and as a WhatsApp menu number); trainers would see skill
gaps per module. Beyond modules: Tamil and more Indian languages · Glific on a verified WhatsApp Business number ·
adaptive difficulty · trainer replay of expert moves · IVR for feature phones.

## Repository map

`src/lib/engine/` the engine (bugs, mind-state, speakers, guardrails, Director/Children/Coach calls, `step()`) ·
`src/lib/ai/` Claude client, prices, versioned prompts · `src/lib/voice/` Sarvam speech in/out, Ogg/Opus writer ·
`src/lib/channels/` WhatsApp · `src/app/` pages and API routes · `content/` lesson file and screen text (EN + HI) ·
`evals/` eval lessons, red team, runner · `tests/` unit + Playwright · `docs/` architecture, infrastructure, pilot.
The project's full rules: [`AGENTS.md`](AGENTS.md).

Licence: [MIT](LICENSE). Changes: [`CHANGELOG.md`](CHANGELOG.md).
