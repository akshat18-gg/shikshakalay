# Submission form — ready answers

> For: the operator, pasting into the Hack2Skill form. Replace every `…-HERE` before submitting (search for "HERE").

## Links
- **Hosted demo:** https://shikshakalay.onrender.com
- **GitHub repo:** https://github.com/akshat18-gg/shikshakalay (public; evaluators have read access)
- **Video (YouTube, public):** VIDEO-LINK-HERE
- **Deck:** DECK-LINK-HERE

## Test logins (one per role) — PIN for all: DEMO-PIN-HERE
| Role | ID | Start here |
|---|---|---|
| Teacher | `teacher_demo` | "Start practice", or "Try a sample" for the 5 one-tap samples |
| Trainer | `trainer_demo` | Trainer dashboard (anonymised skill gaps; numbers from < 5 teachers hidden) |
| Admin | `admin_demo` | AI trace (every AI step of every lesson) and eval results |

## 5 sample inputs
1. "What is 52 minus 27?" → Ravi and Arjun say 35, Meena 26, Sana stays quiet.
2. "No, the answer is 25. Everyone say 25." then "Now 43 minus 18?" → they parrot 25, then the mistake comes back.
3. "Ravi, tell me how you got 35." → "8 minus 3 is 5, 4 minus 1 is 3…" — his mistake is revealed.
4. "Ravi, show 43 with bundles and sticks. Can you take 8 sticks from 3?" then "13 take away 8?" → Ravi changes step
   by step and gets 25.
5. Hindi voice note: "सना, तुम क्या सोचती हो? आराम से बताओ।" → shy Sana speaks for the first time, in Hindi.

(On the live site, log in as `teacher_demo` → "Try a sample" plays each one with one tap.)

## Short answers

**Project name:** Shikshakalay

**One line:** Practise a lesson on AI children who make real mistakes, then get a coaching card that quotes your own
words.

**Problem (≈ 60 words):** Primary teachers rarely get to practise how they respond to a child's mistake. Training is
mostly lectures, observation is rare and feels like inspection, and the most common move — telling the answer —
leaves the child's wrong idea in place. Teachers need a safe, quick, vernacular way to rehearse the moves that
actually change a child's thinking.

**Solution (≈ 80 words):** A 5-minute practice classroom. The teacher teaches 2-digit subtraction by voice in Hindi
or English to four AI children with real, consistent mistakes. Weak moves (telling the answer) don't fix them;
asking a child to explain and then using bundles and sticks does — step by step. At the end she gets a private
coaching card: one strength, one fix and one line for tomorrow, each quoting her own words. Works on the web (PWA)
and on WhatsApp voice notes.

**How AI is used (≈ 100 words):** Three Claude roles, each with structured (Zod-checked) output. The Director (Claude
Haiku 5.5) tags each teacher turn with one of 14 moves from the World Bank Teach tool. A plain TypeScript engine — not
the model — updates each child's belief and decides the exact number each child says. The Children (Haiku 5.5) turn
that into a 7-year-old's words; a line check rejects any drift. The Coach (Claude Sonnet 5.5) writes the card; a quote
check verifies every quote against her real words. Sarvam Saaras transcribes her voice; Sarvam Bulbul voices each
child. Every AI call is logged with tokens and cost.

**Guardrails / responsible AI:** the engine decides answers (line check + one retry + backup line); quote check on the
coach; the teacher's words are always treated as speech, never instructions (20 red-team cases); off-task input gets a
polite in-character reaction; rate limit (40 turns/user/hour) and a daily AI budget; recordings are never stored;
trainers see totals from 5+ teachers only.

**Low connectivity:** text first, audio after (≈ 16 KB/s MP3 on web, ≈ 3 KB/s Opus on WhatsApp); installable PWA that
opens offline; retries never double a turn (idempotency keys); WhatsApp voice notes for teachers without a good
browser.

**User testing:** PILOT-SUMMARY-HERE (e.g. "N teachers, Classes 1–3, Hindi and English medium, M lessons; ease 6.1/7;
what we changed: …" — only with ≥ 5 teachers; else say how many and what we learned).

**Eval results:** EVAL-SUMMARY-HERE (copy from `docs/submission/deck-numbers.md`).

**Tech stack:** Next.js 16 (TypeScript), Neon Postgres + Drizzle, Claude (Haiku 5.5, Sonnet 5.5, Opus 5.5 for test
data), Sarvam Saaras + Bulbul, Twilio WhatsApp, Render, Vitest + Playwright.

**What's next:** Tamil and more languages, more skills (letter-sound blending, place value), Glific on a verified
WhatsApp Business number, adaptive difficulty, trainer replays.
