# PROGRESS — Shikshakalay solo build

> The agent updates this file in every PR (the last commit before merging). CLAUDE.md loads it into every
> conversation, so keep it short (under ~150 lines): when a phase is done, collapse its task list into one line
> in the "Done log".

## Now
- **Phase:** 0 — Setup (S0.1–S0.4 merged; waiting on H0.1 transfer + H0.3 GitHub settings for G0)
- **Next task:** Phase 1 — P2-T1 app shell + i18n
- **Live URL:** — (Render not set up yet)
- **Render mode:** — (`USE_MOCKS=1` until gate G2)
- **Last gate passed:** —

## Waiting on the operator
| # | What | 🛑/🟡 | Asked (IST) | Status |
|---|---|---|---|---|
| H0.1 | Transfer `sourin-git/shikshakalay` to the operator (needed for main protection + Render) | 🛑 | Tue 27 Oct 03:58 | open |
| H0.3 | GitHub settings: ruleset on `main`, squash only, auto-delete branches (needs admin → after H0.1) | 🛑 | Tue 27 Oct 04:05 | open |
| H0.4 | Licence MIT, three names | 🟡 | Tue 27 Oct 03:58 | used default |
| H1.1 | Render web service (after H0.1) | 🛑 | Tue 27 Oct 03:58 | open |
| H1.2 | UptimeRobot on `/api/healthz` (after H1.1) | 🛑 | Tue 27 Oct 03:58 | open |

## Gates
| Gate | Status | Proof (what was run and seen) | When |
|---|---|---|---|
| G0 Setup | ⬜ | | |
| G1 Live skeleton | ⬜ | | |
| G2 Real engine (typed) | ⬜ | | |
| G3 Voice + card | ⬜ | | |
| G4 MVP | ⬜ | | |
| G5 WhatsApp | ⬜ | | |
| G6 Evals + docs + freeze | ⬜ | | |
| G7 Submission ready | ⬜ | | |

## Tasks (tick when merged · estimate → actual minutes)
**Phase 0** — [x] S0.1 tools (5) · [x] S0.2 repo (2) · [x] S0.3 kickoff (app, shadcn, packages, kit, scripts, env, format, licence) (10) · [x] S0.4 first PR + CI (5)
**Phase 1** — [x] P1-T0 + S1.1 logs/request ids + S1.2 env check + S1.3 /api/version (60 → 25) · [ ] P2-T1 shell + i18n · [ ] P2-T2 practice room (mock) · [ ] P1-T4 Render + UptimeRobot · [ ] S1.4 smoke:live
**Phase 2** — [ ] P1-T1 Neon + readyz · [ ] P1-T2 bugs · [ ] P1-T3 mind-state + speakers · [ ] P2-T3 logins · [ ] P1-T5 askJson + S2.1 · [ ] P3-T8 teacher lines · [ ] P1-T6 + P3-T2 lesson file · [ ] P1-T7 Director/Children/guardrails · [ ] P1-T8 step + orchestrator · [ ] P2-T5 real API · [ ] S2.2 prod DB + real mode
**Phase 3** — [ ] P3-T1 voice smoke · [ ] P3-T3 stt/tts · [ ] P3-T4 media · [ ] P3-T6 fixed clips · [ ] P1-T9 coach · [ ] P1-T10 voice in turn · [ ] P2-T4 recorder · [ ] P2-T6 replies · [ ] P2-T7 card + history · [ ] P2-T8 + P3-T5 languages · [ ] P1-T11 speed · [ ] E1 eval batch
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
- 27 Oct — First push went to `sourin-git/shikshakalay` (write access) before the transfer; a transfer keeps history.
- 27 Oct — contracts.ts (additive): `GetCard` type for `GET /api/sessions/[id]/card`.
- 27 Oct — Mock lessons live on `globalThis` so every route module sees the same lessons.
- 27 Oct — Env check failing in real mode: Next logs `env_check_failed` (names only) and answers 500 on every route, so Render's health check fails and the old deploy stays live.
- 27 Oct — `requireUser(req, roles)` takes the Request so route tests run without Next's `cookies()`; P2-T3 keeps that signature.
- 27 Oct — CI actions bumped to `checkout@v5` / `setup-node@v5` (v4 runs on deprecated Node 20).

## Numbers
- Reply time p50 / p90: —
- App AI spend so far (from `ai_calls`): —
- Coding spend (operator reads `/usage` at each gate): —
- Eval results: —

## Later (ideas nobody asked for — not in scope)
-

## Done log (one line per finished phase)
-
