# Numbers for the deck and video

> For: the operator (deck + video) and the README. Every number has a date and a source. Replace a row when a newer
> run lands; never round up. Status: **draft** — eval run 1 is final for its prompts; run 2 (director@4) and the
> human-settled labels are pending.

## Evals — run 1 (Sat 31 Oct 02:31 IST · director@3, children@3, coach@2, lesson file v3)
Source: `evals/results/2026-10-30T21-01-31.json` · 100 lessons (50 weak, 50 strong; 50 English, 50 Hindi/Hinglish),
800 teacher turns, 1,614 child lines, coach on 20 lessons · Claude spend **$0.53** for the whole run.

| Metric | Target | Run 1 | Notes |
|---|---|---|---|
| Children resist weak moves | ≥ 90 % | **100 %** (50/50) | At the probe every bugged child still gave its own wrong answer |
| Children can be taught (strong lessons) | ≥ 80 % | **100 %** (50/50) | The focus child answered the fresh probe sum right |
| Director accuracy — all 800 turns, first labels | ≥ 85 % | **85.8 %** | Against the generator's labels |
| Director accuracy — 735 turns both labellers agree on | ≥ 85 % | **89.1 %** | Top confusions → director@4 (PR #37) |
| Director: who was addressed / which sum | — | 94.8 % / 99.9 % | The sum is what changes the children, and it is almost always right |
| Line check passed first try | ≥ 98 % | **97.6 %** | Just under target |
| Lines with the engine's number after retry/backup | 100 % | **100 %** | Guaranteed in code |
| Coach quotes valid, first pass / after the check | 100 % | **100 % / 100 %** | 20 cards |
| Red-team cases as expected | 20/20 | **20/20** | `evals/results/redteam-2026-10-30T21-03-06.json` ($0.003) |

## How the answer key was checked
- 100 lessons written and labelled by Claude Opus 5.5 (Batch API, ≈ $0.90).
- A second, independent model (Claude Sonnet 5.5) labelled all 800 teacher lines **without seeing** the first label:
  **735/800 agree (91.9 %)**; 50 of 100 lessons agree on every line. Cost $0.22.
- 33 of the 65 disagreements are `new_sum` vs `other` (neither changes a child's mind).
- A person settles the 65 disagreements and spot-checks 40 agreed lines: **pending (H6.1)** → "spot checks: N/40".

## Speed and cost (live)
- Reply time, spoken Hindi on the live site (28 Oct, `npm run speed:check`): text **p50 3.3 s / p90 5.1 s**; audio
  p50 5.0 s / p90 6.6 s. Target ≤ 6 s / ≤ 10 s.
- One 12-turn lesson + card ≈ **$0.017** of Claude (coach ≈ $0.014) + ≈ **₹2** of Sarvam speech.
- Prompt caching: from turn 2 the Director reads 3,265 and the Children 2,195 cached tokens per call.
- Audio: ≈ 16 KB/s MP3 (web), ≈ 3 KB/s Ogg/Opus (WhatsApp).

## Engineering
- 219 unit tests, Playwright end-to-end + axe accessibility in CI; 37 pull requests, each through green CI.
- gitleaks over the full history: clean. No GPL/AGPL dependencies.

## Pilot (real teachers) — pending
- 10 pilot logins (P01–P10) issued Sat 31 Oct. Report counts only with ≥ 5 teachers: teachers, lessons, teachers
  who came back for a 2nd lesson (target ≥ 60 %), average "does what I need" and "easy to use" (1–7), one quote
  (with OK, no name) and one change we made (`docs/pilot/changes.md`).
- Query (prod, read-only) to fill this: lessons per `P%` user from `sessions`, answers from `feedback`.

## Not measured yet (say so)
- Coach vs. expert agreement (≥ 80 % promised): needs 2 expert raters on 20 lessons — not done in this build.
