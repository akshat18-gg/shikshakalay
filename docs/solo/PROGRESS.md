# PROGRESS — Shikshakalay solo build

> The agent updates this file in every PR (the last commit before merging). CLAUDE.md loads it into every
> conversation, so keep it short (under ~150 lines): when a phase is done, collapse its task list into one line
> in the "Done log".

## Now
- **Phase:** 0 — Setup (not started)
- **Next task:** S0.1 tool checks
- **Live URL:** — (Render not set up yet)
- **Render mode:** — (`USE_MOCKS=1` until gate G2)
- **Last gate passed:** —

## Waiting on the operator
| # | What | 🛑/🟡 | Asked (IST) | Status |
|---|---|---|---|---|
| | | | | |

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
**Phase 0** — [ ] S0.1 tools · [ ] S0.2 repo · [ ] S0.3 kickoff (app, shadcn, packages, kit, scripts, env, format, licence) · [ ] S0.4 first PR + CI
**Phase 1** — [ ] P1-T0 + S1.1 logs/request ids + S1.2 env check + S1.3 /api/version · [ ] P2-T1 shell + i18n · [ ] P2-T2 practice room (mock) · [ ] P1-T4 Render + UptimeRobot · [ ] S1.4 smoke:live
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

## Numbers
- Reply time p50 / p90: —
- App AI spend so far (from `ai_calls`): —
- Coding spend (operator reads `/usage` at each gate): —
- Eval results: —

## Later (ideas nobody asked for — not in scope)
-

## Done log (one line per finished phase)
-
