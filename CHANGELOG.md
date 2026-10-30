# Changelog

All dates are 2026, IST. Each line links to the pull request number on GitHub.

## v1.0-submission — Sun 1 Nov (tag planned Sat 31 Oct night)

### Sat 31 Oct — evals, WhatsApp voice notes, hardening, docs
- Label check: a blind second labelling pass (Claude Sonnet 5.5) over all 800 eval teacher lines, a review sheet for
  a person, and re-scoring saved runs against the final labels (#32).
- WhatsApp sends real voice notes: Sarvam WAV encoded to Ogg/Opus in the app with opusscript (#33).
- Two-question feedback (1–7) under the coaching card; `POST /api/feedback` (#34).
- Security pass: phone numbers and emails masked in error logs, finished jobs keep no message data, a script that
  deletes one person's data, unused code removed; production audit and OWASP notes (#35).
- README, architecture and infrastructure docs, this changelog.

### Fri 30 Oct — judge-ready and WhatsApp
- Demo seed (8 synthetic teachers), trainer dashboard with the 5-teacher privacy rule, admin AI trace and evals
  pages (#25); `/try` with the 5 one-tap samples, 20 red-team cases (#26).
- Installable PWA that opens offline, security headers, 404/500 pages, privacy and terms in English and Hindi (#27).
- Pilot pack: guide, consent, forward message, pilot logins (#28).
- WhatsApp: signed webhook, job queue, the lesson conversation, the 5-minute sweep (#29).
- Playwright end-to-end and axe accessibility checks in CI (#30); the eval runner with a probe turn and red-team
  mode (#31).

### Wed 28 Oct — voice and coaching card
- Voice in the turn: Sarvam Saaras listens, Sarvam Bulbul speaks (one voice per child), text first (#17, #18).
- Hold-to-talk recorder with a 30-second ring and network retries (#19); Hindi/English key-parity test (#20).
- 100 synthetic eval lessons written with Claude Opus 5.5 (Batch API) (#21, #23).
- Fix: any subtraction the teacher asks now plays through the children's mistakes; impossible and unsupported sums
  get one puzzled child and no number (#22).

### Tue 27 Oct — the real engine
- The three children's mistakes, mind-state rules and speaker picking with Ravi's 7-turn table (#3, #4).
- PIN logins, signed cookie, consent, page guard (#5); Claude client with `ai_calls` logging, prices and a daily
  budget (#6); 30 teacher lines with Director answers (#7); strict lesson-file loader (#8).
- Director and Children prompts with the line check, one retry and backup lines (#9); `step()` as a pure function
  (#10); real orchestrator with idempotent turns (#11); the Coach with the quote check (#13); history and check-in
  (#14).

### Mon 26 – Tue 27 Oct — skeleton
- Next.js 16 + shadcn skeleton, shared contracts, mock lesson, database schema starters; CI; live on Render with
  the mock lesson, smoke test, practice room and first card page.
