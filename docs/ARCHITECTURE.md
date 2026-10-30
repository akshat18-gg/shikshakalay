# Architecture

One Next.js 16 app (App Router, Node.js runtime) on Render, one Neon Postgres database, three outside services
(Anthropic, Sarvam, Twilio). No queue server, no cache server: background work is a Postgres `jobs` table plus
Next.js `after()` and a 5-minute sweep.

```mermaid
flowchart LR
  T[Teacher<br/>web or WhatsApp] -->|voice / text| APP
  subgraph APP[Next.js app on Render]
    R[Routes<br/>src/app/api] --> O[orchestrator.ts]
    O --> S["step() — pure<br/>engine/core.ts"]
    S --> D[Director<br/>Claude Haiku 5.5]
    S --> M[Mind-state engine<br/>plain TypeScript]
    S --> C[Children<br/>Claude Haiku 5.5]
    S --> G[Line check]
    O --> K[Coach + quote check<br/>Claude Sonnet 5.5]
  end
  O <--> DB[(Neon Postgres)]
  O <--> SV[Sarvam<br/>Saaras STT · Bulbul TTS]
  W[Twilio WhatsApp] <--> R
  U[UptimeRobot] -->|healthz · sweep| R
```

**Where a child's answer is decided:** `engine/mindState.ts` (beliefs) and `engine/speakers.ts` (who speaks, what
number). Claude only writes words (`engine/children.ts`), and `engine/guardrails.ts` rejects any line that doesn't
carry the engine's number.

## A web turn

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant API as POST /api/sessions/[id]/turns
  participant STT as Sarvam Saaras
  participant E as step() (engine)
  participant CL as Claude Haiku 5.5
  participant DB as Postgres
  B->>API: audio (≤ 30 s) or text + idempotencyKey
  API->>DB: same key seen? → return the stored turn
  API->>DB: lesson over / rate limit / daily budget?
  alt audio
    API->>STT: transcribe (saaras:v4, keyterms)
    STT-->>API: transcript (audio dropped, never stored)
    Note over API,STT: STT fails → 502 stt_failed → the text box is offered
  end
  API->>E: step(state, teacherText)
  E->>CL: Director: which move? (JSON, Zod)
  Note over E,CL: call fails or low confidence → move = other
  E->>E: mind-state rules → speakers + the exact number each must say
  E->>CL: Children: lines (JSON, Zod)
  E->>E: line check → one retry for failing children → backup line
  Note over E,CL: Children call fails → backup lines at once
  API->>DB: one transaction: turn, child lines, new state (ai_calls logged per call)
  API-->>B: TurnResult — text first, audioUrl = /api/sessions/[id]/turns/[n]/audio
  B->>API: GET audio (made by Sarvam Bulbul on first request, cached)
  Note over B,API: TTS fails → no audio, the text stays
```

## A WhatsApp turn (with failure branches)

```mermaid
sequenceDiagram
  autonumber
  participant WA as Twilio (WhatsApp)
  participant H as POST /api/whatsapp/webhook
  participant DB as Postgres (jobs)
  participant J as job (after())
  participant E as engine (runTurn)
  participant SW as /api/cron/sweep (every 5 min)
  WA->>H: voice note / text (signed)
  H->>H: X-Twilio-Signature valid? (no → 403)
  H->>DB: insert job (dedupeKey = MessageSid; duplicate → ignored)
  H-->>WA: empty TwiML reply at once
  H->>J: after(): run the job
  J->>DB: contact step (consent → language → menu → lesson)
  J->>WA: download the voice note (Twilio auth, ≤ 2 MB)
  J->>E: runTurn(sessionId, audio | text, idempotencyKey = MessageSid)
  Note over J,E: another message mid-turn → busy → "one moment"
  E-->>J: lines + Ogg/Opus voice note (Sarvam WAV → opusscript)
  J->>WA: voice note, then ~3 s later the "who said what" text
  Note over J,WA: TTS fails → text only · send fails → job retried (3 tries, 1 min apart)
  J->>DB: job done (payload cleared — number and words not kept)
  SW->>DB: due or stuck jobs (FOR UPDATE SKIP LOCKED) → run again; delete expired audio
```

`STOP` stops all messages. The next-evening check-in ("did you try the line?") is a job with a future `runAt`,
skipped if WhatsApp's 24-hour window has closed.

## Data model

```mermaid
erDiagram
  users ||--o{ sessions : "practises"
  users ||--o{ consents : "agrees"
  users ||--o{ feedback : "answers"
  users |o--o| wa_contacts : "WhatsApp number (only place it lives)"
  sessions ||--o{ turns : "has"
  turns ||--o{ child_lines : "has"
  sessions ||--o| coach_cards : "ends with"
  sessions ||--o{ checkins : "followed by"
  sessions |o--o{ ai_calls : "logs (link cleared on delete)"
  users {
    uuid id
    text code "T07, W02"
    text role
    text lang
    text pinHash
    bool isDemo
  }
  sessions {
    uuid id
    text scenarioId
    int scenarioVersion
    text lang
    text channel
    text status
    jsonb state
    int turnCount
  }
  turns {
    uuid id
    int turn
    text idempotencyKey
    text teacherText
    jsonb director
    jsonb statesBefore
    jsonb statesAfter
    jsonb result
    int ms
  }
  child_lines {
    uuid id
    text child
    text text
    int expectedAnswer
    bool passed
    int retries
    bool usedBackup
  }
  coach_cards {
    uuid id
    jsonb card
    bool quotesVerified
    int droppedPoints
    text lang
  }
  ai_calls {
    uuid id
    text purpose
    text provider
    text model
    text promptVersion
    int inputTokens
    int outputTokens
    int cacheReadTokens
    int ms
    numeric costUsd
    bool ok
  }
  wa_contacts {
    uuid id
    text phone
    text step
    uuid activeSessionId
  }
  jobs {
    uuid id
    text type
    jsonb payload
    text status
    int attempts
    text dedupeKey
  }
  media {
    text token
    text mime
    bytea bytes
    timestamptz expiresAt
  }
  eval_runs {
    uuid id
    jsonb promptVersions
    jsonb metrics
    jsonb details
  }
```

Uniques: `users.code`, `(session_id, turn)`, `(session_id, idempotency_key)`, `coach_cards.session_id`,
`jobs.dedupe_key`, `wa_contacts.phone`. Every foreign key and filter column is indexed (13 `*_idx`).

## If a service is slow or down

| Service | Slow | Down |
|---|---|---|
| **Anthropic (Claude)** | Per-call timeouts (Director/Children 15 s, Coach 45 s); the turn waits | Director → `other` (no state change); Children → fixed backup lines with the engine's number; Coach → a plain card built from her own words. The lesson never stops |
| **Sarvam Saaras (speech → text)** | Timeout, then as "down" | `502 stt_failed`: "please type" — the text box always works |
| **Sarvam Bulbul (text → speech)** | Text is already on screen; audio comes later | No audio; text only (web and WhatsApp) |
| **Twilio** | Messages go out ~3 s apart anyway | Job fails → retried 3 times (1 min apart) by `after()` and the sweep; the web app is unaffected |
| **Neon Postgres** | First query after ~5 idle minutes takes ~2 s (wake-up) | `/api/readyz` → 503; routes answer `500` with a reference id; mock mode is unaffected |
| **Render** | Free instance sleeps after ~15 idle minutes (UptimeRobot pings `/api/healthz` every 5) | Site down — redeploy or roll back from the Render dashboard (`docs/INFRASTRUCTURE.md`) |

## Why this shape

- **Monolith on purpose:** one deploy, one log stream, no network hops between "services" — right for one week
  and one server. Routes are thin (parse → auth → one `src/lib` call → JSON); no SQL in route files.
- **`step()` is pure:** it takes the state, her words and the two Claude callers, and returns the new state. Unit
  tests and the eval runner use it with no database or HTTP.
- **Text first:** a turn returns as soon as the children's lines exist; audio is fetched separately, so a slow
  voice provider never delays what she reads.
