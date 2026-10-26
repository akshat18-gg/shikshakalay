# Shikshakalay

Teachers practise a short maths lesson on AI children who make real, consistent mistakes — by voice, in Hindi or
English — then get a private coaching card that quotes their own words.

Team Blue Screen (SRMIST Kattankulathur) · AI for Foundational Learning Hackathon · Challenge 3: Teacher Support.

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
