# P3 · Content, voice & pilot — starter prompt for your coding agent

> **SOLO MODE (from Mon 26 Oct):** this file is now a **task spec**. Use only the "Tasks" section, in the order
> given by `docs/solo/IMPLEMENTATION_PLAN.md`. Ignore "You own / Don't edit / How to work with me / First message /
> Daily restart" and the dates — `docs/solo/MASTER_PROMPT.md` replaces them. Things that need a person (accounts,
> recordings, phones, native-speaker checks, real teachers) become NEED YOUR HELP asks to the operator.

> **How to use:** open your coding agent in the `shikshakalay` repo folder and paste everything below the
> line. Each morning, start a fresh session with the "Daily restart" message at the bottom.
> Your agent must read `AGENTS.md` first.

---

You are the coding agent for **P3 — Content, voice & pilot** on **Shikshakalay**, a hackathon project (deadline
Sun 1 Nov 2026, we submit by 6 pm IST). Today is Sat 24 Oct 2026. Before anything else, read `AGENTS.md` in the
repo root completely — it is the shared context for all three people's agents. Then read `src/lib/contracts.ts`
(especially `Transcribe`, `SpeakLines`, `SpeakText`, `SaveMedia`, `EvalLesson`), `src/lib/mocks/lesson.ts`,
`src/lib/db/schema/whatsapp.ts`, `content/scenarios/sub_2digit.yaml` and `content/i18n/*.json`.

## Your job in one line

Make it real: the lesson files (English + Hindi), the voices (Sarvam speech-to-text, Azure children's voices),
the WhatsApp door (Twilio sandbox + jobs + sweep), the 100 eval lessons, and the real teachers in the pilot.

## You own (edit freely)

`content/` (scenarios, i18n), `src/lib/voice/` (stt.ts, tts.ts, voices.ts), `src/lib/media/store.ts`,
`src/lib/channels/` (whatsapp.ts, twilio.ts), `src/lib/jobs/` (queue.ts, handlers.ts), `src/lib/db/schema/whatsapp.ts`,
`src/app/api/whatsapp/`, `src/app/api/media/`, `src/app/api/cron/`, `evals/generate.ts`, `evals/lessons/`,
`evals/redteam.json`, `public/audio/`, `public/samples/`, `scripts/voice-smoke.ts` and other P3 scripts,
`tests/unit/` for voice/jobs/WhatsApp, `tests/fixtures/teacher_lines.json`, `docs/pilot/`.

## Don't edit (ask your human to ask the owner)

P1: `src/lib/engine/`, `src/lib/ai/`, `src/lib/mocks/lesson.ts`, `src/lib/db/client.ts`, `schema/core.ts`,
`src/lib/http.ts`, `src/app/api/sessions/`, `evals/run.ts`. P2: pages in `src/app/`, `src/components/`,
`src/lib/auth/`, `schema/auth.ts`, `src/proxy.ts`, `.github/`. Shared: `src/lib/contracts.ts` (only via a PR all
three approve), `package.json` (packages in their own small PR). Only P1 runs `npm run db:push`.

## What others need from you, and when

| Thing | Who needs it | By |
|---|---|---|
| Lesson file `sub_2digit.yaml` finished (EN + HI) | P1 | Sun 25 (H2) |
| `transcribe()`, `speakLines()`, `speakText()`, `saveMedia()` + `/api/media/[token]` | P1 | Sun 25 night |
| Hindi screen text checked (`hi.json`) | P2 | Sun 25 |
| 30 teacher lines (`tests/fixtures/teacher_lines.json`) | P1 (Director tuning) | Mon 26 |
| Review of 30 child lines (does the Hindi sound like a 7-year-old?) | P1 | Mon 26 |
| WhatsApp lesson end to end | team | Tue 27 (H4) |
| 100 labelled eval lessons | P1 | Wed 28 |
| Sample 5 voice note `public/samples/sana-hi.webm` | P2 (`/try` page) | Tue 27 |
| Pilot feedback + "you said, we changed" log | everyone | Wed 28 → Sat 31 |

## How to work with me (your human)

- Work **one task at a time**, in order. Before starting: say in 2–3 lines what you'll do and which files you'll
  touch. Then do it.
- Branch per task: `p3/<short-name>`. Small commits. Before "done": run `npm run lint && npm run typecheck && npm test`
  and show me. Suggest a PR title and body.
- Unit tests fake `fetch` and Twilio — **never** call Sarvam, Azure, Twilio or Claude in tests. Real calls only in
  scripts I run myself (`npx tsx --env-file-if-exists=.env.local scripts/<name>.ts`).
- Never put a real phone number, teacher name, key or recording of a real person in the repo or in logs.
- If something in AGENTS.md seems wrong or blocks you, stop and tell me. When you finish a task, stop and wait for me.

## Tasks, in order (each line = one PR unless noted)

### Sat 24 Oct — accounts, ears and voices

**Task 0 · Accounts (my job, you help with the checks)** — Sarvam (free ₹100 credit), Azure Speech **Free F0**
(region Central India if offered; copy key + region), Twilio trial (join the WhatsApp sandbox from my phone; note the
join code), UptimeRobot. Keys go in `.env.local` and privately to P1 for Render. Never in git.

**Task 1 · Real-API smoke script `scripts/voice-smoke.ts`**
- Speech-to-text: send 5 recordings I make (Hindi, English, Hinglish — e.g. "Ravi, बताओ 52 में से 27 कितने?") to
  Sarvam: `POST https://api.sarvam.ai/speech-to-text`, multipart (`file`, `model=saaras:v4`, `mode=codemix`,
  `language_code=hi-IN|en-IN`, `keyterms` = JSON array), header `api-subscription-key`. Print each transcript and time.
  If the API answers differently than this, follow the real response and tell me (the docs win; update AGENTS.md
  section 8 via a PR).
- Voices: list voices with `GET https://<region>.tts.speech.microsoft.com/cognitiveservices/voices/list`
  (header `Ocp-Apim-Subscription-Key`), filter `hi-IN` and `en-IN`. Make the same child line ("35, टीचर जी! मैंने सबसे
  पहले किया!" / "35, Teacher! I did it first!") in 6 candidate voices at pitch +15%, +20%, +25%. Save mp3s in a
  git-ignored folder so the team can vote.
- Test one real WhatsApp voice reply from the Twilio trial to my phone (proves the trial allows it; if not → Plan B in
  AGENTS.md section 9).
- Done when: transcripts look right, 3–4 clearly different child voices picked (2 boys: Ravi, Arjun; 2 girls: Meena,
  Sana) plus one adult "coach" voice per language, and the WhatsApp test reached my phone.

**Task 2 · Lesson file** — finish `content/scenarios/sub_2digit.yaml`: check every Hindi line is natural, simple,
spoken Hindi a Class 2 child would say (I'll get a native speaker to read it), add 2–3 more `sampleLines` per child per
language, keep the backup-line keys exactly as they are. Don't change any number logic — numbers come from the engine.
Bump `version` on every change. Done when P1's loader accepts it (Sun).

### Sun 25 Oct — lesson file and voice code (goal H2)

**Task 3 · `src/lib/voice/voices.ts`, `stt.ts`, `tts.ts` + tests**
- `voices.ts`: `VOICES = { hi: { ravi: { name, pitch, rate }, arjun: …, meena: …, sana: … }, en: { … }, coach: { hi: {…}, en: {…} } }`
  with the team's picks.
- `stt.ts` → `export const transcribe: Transcribe` (code shape in AGENTS.md 8; file name extension from the mime:
  ogg / mp4 / webm). Mock mode with no key: return a fixed sentence. Throw a clear error on non-200 (include status).
  Return `""` for silence (P1 handles "say again").
- `tts.ts` → `export const speakLines: SpeakLines` — **one** SSML request: one `<voice>` per line, each with
  `<prosody pitch rate>` + `<break time="400ms"/>`, `xml:lang` hi-IN or en-IN, escape `& < > " '`.
  Header `X-Microsoft-OutputFormat`: `audio-24khz-48kbitrate-mono-mp3` (web) or `ogg-24khz-16bit-mono-opus`
  (WhatsApp). Also `export const speakText: SpeakText` (the adult coach voice, normal pitch).
- Tests with a fake `fetch`: form fields and headers for STT; SSML contains each child's voice name and escaped text;
  correct output-format header per format; errors surface clearly.
- Done when: the smoke script turns a 3-child Hindi exchange into **one** clip with 3 different voices.

**Task 4 · Media store + route**
- `src/lib/media/store.ts` → `export const saveMedia: SaveMedia`: token = 16 random bytes as hex, insert into `media`
  with `expiresAt = now + ttlMinutes` (default 60), return `/api/media/<token>`.
- `GET /api/media/[token]` (Next 16: `params` is a Promise): select where token matches and not expired → bytes with
  `Content-Type` = mime, `Content-Length`, `Cache-Control: private, max-age=3600`; else 404. No auth (the token is the key).
- Done when: a test (fake DB layer or a small integration script) saves and serves a clip.

**Task 5 · Screen text** — have a native speaker check `content/i18n/hi.json`; keep the keys identical to `en.json`
(add a tiny Vitest test that both files have the same keys and the same `{placeholders}`), then delete the `_todo` key.
Use gender-neutral polite forms for the teacher (आप … सकते हैं).

**Task 6 · Fixed clips** — `scripts/make-fixed-audio.ts`: make `public/audio/hello-en|hi.mp3|ogg` (the children's
hello lines from the YAML, all children who greet in one clip) and `again-en|hi.mp3|ogg` (the `repeat` line). Commit
the files (they're synthetic voices — fine to commit). Done when P1's hello turn plays them with no paid call.

### Mon 26 Oct — voice in, WhatsApp part 1 (goal H3)

**Task 7 · Pair with P1 for an hour** to put `transcribe` / `speakLines` / `saveMedia` into `runTurn`. **H3:** a spoken
Hindi lesson works on the live link.

**Task 8 · `tests/fixtures/teacher_lines.json`** — 30 realistic teacher lines (strong and weak; Hindi, English,
Hinglish; some with numbers as words, some with misspelled names) each with the right move label and `addressedTo`.

**Task 9 · Child-line review** — read 30 child lines from P1's engine (Hindi and English); list any that sound stiff,
too clever, or too long for a 7-year-old; send the list to P1 with suggested fixes. Together decide Haiku vs Sonnet for
the children.

**Task 10 · WhatsApp part 1: jobs + webhook**
- `src/lib/jobs/queue.ts`: `enqueueJob(type, payload, { dedupeKey?, runAt? })` (on a duplicate `dedupeKey`, return the
  existing id), `claimJob(id)` (atomic `UPDATE … WHERE id = $1 AND status = 'pending' RETURNING *`), `claimDueJobs(limit)`
  (the `FOR UPDATE SKIP LOCKED` query in AGENTS.md 9), `finishJob`, `failJob` (retry with `runAt = now + 1 min` until 3
  attempts, then `failed`). `processJob(id)` runs the handler from `handlers.ts` by `type`.
- `POST /api/whatsapp/webhook`: read form data → `twilio.validateRequest(TWILIO_AUTH_TOKEN, x-twilio-signature,
  `${PUBLIC_BASE_URL}/api/whatsapp/webhook`, params)` → 403 if invalid → `enqueueJob("wa_inbound", params,
  { dedupeKey: MessageSid })` → `after(() => processJob(id))` → reply `<Response></Response>` as `text/xml`.
- Handler `wa_inbound` (first version): find or create `wa_contacts` by `From`; run inside a transaction with
  `pg_advisory_xact_lock(hashtext(phone))` so one teacher's messages run in order; in mock mode call the fake engine
  through `@/lib/engine`.
- Done when: a voice note from my phone reaches the fake `runTurn` and I get one voice note + one text back.

### Tue 27 Oct — WhatsApp part 2, evals, pilot pack (goal H4)

**Task 11 · The full WhatsApp conversation (`src/lib/channels/whatsapp.ts` + `twilio.ts`)**
- Steps (`wa_contacts.step`): `new` → send `wa.consent` → `consent` (YES / हाँ → save `consents`, create a `users` row with
  code `W01`, `W02`…) → `lang` (1 English / 2 हिन्दी) → `menu` (1 = subtraction → `startLesson(userId, { scenarioId:
  "sub_2digit", lang }, "whatsapp")`, send the hello clip + `wa.howTo`) → `in_lesson` (voice note → download
  `MediaUrl0` with Basic auth `TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN` → `runTurn(sessionId, { audio, idempotencyKey:
  MessageSid }, "whatsapp")`; text → `runTurn` with text) → `END` or `lessonOver` → `endLesson` → send `wa.card` (filled
  from the `CoachCard`) + the "say tomorrow" audio (`speakText` → `saveMedia`) → enqueue a `wa_checkin` job →
  back to `menu`. `checkin` step: 1 / 2 → save to `checkins`, send `wa.checkinThanks`. `STOP` at any step → `stopped`,
  send `wa.stop`.
- Replies: one ogg clip (`mediaUrl: [PUBLIC_BASE_URL + audioUrl]`), wait ~3.1 s (sandbox limit), then one text
  "who said what" (`Ravi: 35, Teacher!` / `रवि: 35, टीचर जी!`). Every message text comes from `content/i18n` (`wa.*`).
- Check-in `runAt` = next day ~6:30 pm IST, but never later than `lastInboundAt + 23 h`; when it runs, skip if the 24-hour
  window has closed. Rejoin tip (`wa.rejoinTip`) at the end of a lesson at most every 2 days (`lastRejoinTipAt`).
- Never log the phone number — log `users.code`. Tests: the step machine with a fake engine and a fake Twilio sender.
- Done when: a whole lesson works inside WhatsApp on my phone with `USE_MOCKS=0`. **H4.**

**Task 12 · The sweep** — `GET /api/cron/sweep?key=<CRON_SECRET>`: wrong key → 403; otherwise return `ok` at once and in
`after()`: `claimDueJobs(10)` and run them one by one, delete expired `media` rows. Set up UptimeRobot (HTTP monitor,
every 5 minutes) on this URL — it also keeps the free Render server awake. Done when a job I leave stuck gets retried.

**Task 13 · `evals/generate.ts` — 100 lessons with Opus 5.5 via the Batch API (start it tonight)**
- 50 weak + 50 strong lessons for `sub_2digit`; half English, half Hindi/Hinglish; 6–10 teacher turns each; realistic
  Indian primary-teacher speech (numbers sometimes as words, names sometimes misspelled). Weak lessons use only weak
  moves plus `new_sum` / `check_whole_class` / `other`. Strong lessons work on one `focusChild` with a reveal → fix → fix
  sequence. Each turn has a proposed `label`, `addressedTo`, `newTask`; each lesson a fresh `finalSum` (a valid borrowing sum).
- `client.messages.batches.create({ requests: [{ custom_id, params: { model: EVAL_GEN_MODEL, max_tokens, system,
  messages } }] })` → poll `client.messages.batches.retrieve(id)` until `processing_status === "ended"` → read
  `client.messages.batches.results(id)` → parse each JSON with the `EvalLesson` schema (`reviewed: false`) → write
  `evals/lessons/<id>.json`. Ask for JSON in the prompt (or `output_config.format` if the SDK accepts it in batch
  params) and always validate with Zod. Save the batch id so a rerun can resume.
- Done when: 100 valid files are in `evals/lessons/` by Wed morning.

**Task 14 · Sample 5 + red team** — record `public/samples/sana-hi.webm` (a team member's voice: "सना, तुम क्या सोचती हो?
आराम से बताओ।"). Write `evals/redteam.json`: 20 inputs with the expected behaviour (AGENTS.md 18).

**Task 15 · Pilot pack (`docs/pilot/`)** — `consent.md` (EN + HI, same text as `consent.body`), `guide.md` (1 page: how to
start on the web link and on WhatsApp, what to try, how to stop), `changes.md` (the "you said, we changed" log with
teacher codes only — T03, never names). The real contact list stays in a private Google Sheet, **never in git**.
Book at least 5 onboarding calls for Wed–Fri.

### Wed 28 – Fri 30 Oct — real teachers

- **Wed:** read every teacher line in `evals/lessons/` and fix the labels by hand (this is the answer key), set
  `reviewed: true`. Onboard the first 5 teachers (10-minute call: consent → first lesson together). Start `changes.md`.
- **Thu:** `blend_letters.yaml` only if the team says skill 2 goes ahead. Onboard 5+ more teachers. Send 20 lessons to the
  2 expert raters (Google Form, Teach elements 1–5). **Feature freeze tonight.**
- **Fri:** pilot numbers summary (teachers, lessons, came back within the window, ease scores, tried-in-class %), teacher
  quotes only with their OK and without names. Record and edit the 3-minute video with P2's clips; upload as **Public**
  on YouTube.

## First message

Read AGENTS.md and the files listed at the top. Then tell me in 5 bullet points what you will build and what you need
from me (keys, recordings, phone), and start **Task 1** on a branch `p3/voice-smoke`.

## Daily restart (paste each morning)

> Today is <day, date>. Pull `main`. Re-read AGENTS.md sections 0, 8, 9, 18 and 20 and `docs/agents/P3-content-voice-pilot.md`.
> Tell me which P3 tasks look done in the code and which is next, then start the next one on a new branch.
