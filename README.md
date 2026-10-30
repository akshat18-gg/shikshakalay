# Shikshakalay

Teachers practise a short maths lesson on AI children who make real, consistent mistakes — by voice, in Hindi or
English — then get a private coaching card that quotes their own words.

Team Blue Screen (SRMIST Kattankulathur) · AI for Foundational Learning Hackathon · Challenge 3: Teacher Support.

**Live demo:** https://shikshakalay.onrender.com · **Code:** https://github.com/akshat18-gg/shikshakalay

**Voice:** Sarvam Saaras turns the teacher's speech into text; Sarvam Bulbul gives each child (and the coach) a voice.
Claude (Haiku 5.5 for the children and the move classifier, Sonnet 5.5 for the coach) only writes words — a plain
TypeScript engine decides what each child believes and the exact number they say.

**WhatsApp (trial):** send `join twilio-trial` to **+1 737 250 8034** on WhatsApp. Twilio's free trial allows one
active recipient at a time, 100 messages and up to 5 verified testers, so WhatsApp is shown in the video; teachers and
judges use the web link.

> Work in progress. The full README (live link, demo logins, how it works, setup, evals) lands in Phase 6.

## Run it locally (mock mode, no keys)

```bash
npm ci
npm run env:init   # makes .env.local in mock mode (USE_MOCKS=1) with random secrets
npm run dev        # http://localhost:3000
```

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Local app. `USE_MOCKS=1` runs with no keys |
| `npm run verify` | Format check + lint + typecheck + unit tests (CI runs the same, plus `build`) |
| `npm run format` | Prettier on `src`, `tests`, `scripts`, `evals` |
| `npm run env:init` / `env:check` | Make `.env.local` / list which keys are missing — never prints a value |
| `npm run e2e` | Playwright end-to-end tests (mock mode) |
| `npm run db:push` | Schema → Neon **dev** branch |
| `npm run db:seed` | Demo users and synthetic teachers → dev branch |
| `npm run evals` | Eval run — real Claude calls, costs credits |

Licence: [MIT](LICENSE).
