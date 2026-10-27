/**
 * The real lesson engine: database + step() + Claude. Routes and the WhatsApp door call these through
 * @/lib/engine. Order for a turn: load → same idempotency key? return the stored answer → lesson still open? →
 * turn limit → daily budget → step() (Claude calls, no transaction open) → save everything in one transaction.
 */
import { assertWithinBudget } from "@/lib/ai/budget";
import type { EndLesson, GetCard, GetSession, RunTurn, StartLesson, TurnResult } from "@/lib/contracts";
import { spendSince } from "@/lib/db/queries/aiCalls";
import {
  countUserTurnsSince,
  createSession,
  findTurnByKey,
  isUniqueViolation,
  loadCard,
  loadSession,
  loadTurns,
  saveCardAndEnd,
  saveTurn,
} from "@/lib/db/queries/lessons";
import { checkEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { log } from "@/lib/log";
import { sttAvailable } from "@/lib/voice/stt";
import { trackedTranscribe } from "@/lib/voice/tracked";
import { ttsAvailable } from "@/lib/voice/tts";
import { writeLines } from "./children";
import { writeCard } from "./coach";
import { step } from "./core";
import { tagMove } from "./director";
import { backupLine, loadScenario, startState } from "./scenario";
import { helloSpeakers } from "./speakers";
import { turnAudioPath } from "./turnAudio";
import { assertLessonOpen, assertUnderTurnLimit } from "./turnGate";

const RECENT_TURNS = 4;
const HOUR_MS = 60 * 60 * 1000;

let env: ReturnType<typeof checkEnv> | undefined;
const serverEnv = () => (env ??= checkEnv());

function scenarioOrThrow(id: string) {
  const s = loadScenario(id);
  if (!s) throw new HttpError("not_found", "That lesson doesn't exist.");
  return s;
}

export const realStartLesson: StartLesson = async (userId, body, channel) => {
  const started = Date.now();
  const scenario = scenarioOrThrow(body.scenarioId);
  const startedAt = new Date().toISOString();
  const state = startState(scenario, body.lang, startedAt);
  const hello = helloSpeakers(state).map((c) => ({ child: c.id, text: backupLine(scenario, body.lang, "hello") }));
  const helloResult = (sessionId: string): TurnResult => ({
    sessionId,
    turn: 0,
    transcript: "",
    director: null,
    lines: hello,
    statesAfter: state.children,
    audioUrl: `/audio/hello-${body.lang}.mp3`, // fixed clip, made once (scripts/make-fixed-audio.ts)
    lessonOver: false,
    ms: Date.now() - started,
  });
  const sessionId = await createSession({
    userId,
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    lang: body.lang,
    channel,
    state,
    hello: {
      turn: 0,
      idempotencyKey: "hello",
      teacherText: "",
      audioMs: null,
      director: null,
      statesBefore: state.children,
      statesAfter: state.children,
      ms: Date.now() - started,
      records: hello.map((l) => ({ ...l, expectedAnswer: null, passed: true, retries: 0, usedBackup: true })),
      result: helloResult,
    },
  });
  return {
    sessionId,
    scenarioId: scenario.id,
    lang: body.lang,
    firstSum: scenario.sums[0],
    hello: helloResult(sessionId),
  };
};

export const realRunTurn: RunTurn = async (sessionId, input) => {
  const started = Date.now();
  const session = await loadSession(sessionId);
  if (!session) throw new HttpError("not_found", "This lesson doesn't exist.");

  const stored = await findTurnByKey(sessionId, input.idempotencyKey);
  if (stored) return stored; // a retry of a turn we already answered

  const turns = await loadTurns(sessionId);
  const now = new Date();
  assertLessonOpen({ status: session.status, last: turns.at(-1)?.result, startedAt: session.startedAt, now });
  const e = serverEnv();
  assertUnderTurnLimit(
    await countUserTurnsSince(session.userId, new Date(now.getTime() - HOUR_MS)),
    e.TURNS_PER_HOUR_LIMIT,
  );
  await assertWithinBudget({ limitUsd: e.AI_DAILY_BUDGET_USD, spendSince, now });

  const scenario = scenarioOrThrow(session.scenarioId);
  const turnNo = (turns.at(-1)?.turn ?? 0) + 1;
  const voiceCtx = { sessionId, turn: turnNo };

  // Typed text wins; otherwise her recording is transcribed once and dropped (never stored).
  let teacherText = input.text;
  if (!teacherText) {
    if (!input.audio || !sttAvailable()) throw new HttpError("stt_failed", "We couldn't hear that. Please type.");
    try {
      teacherText = await trackedTranscribe(input.audio, session.lang, scenario.keyterms, voiceCtx);
    } catch {
      throw new HttpError("stt_failed", "We couldn't hear that clearly. Please try again or type.");
    }
  }
  const recent = turns
    .filter((x) => x.turn > 0)
    .slice(-RECENT_TURNS)
    .map((x) => ({ turn: x.turn, teacher: x.teacherText, lines: x.result.lines }));

  const r = await step(
    {
      scenario,
      state: session.state,
      teacherText,
      now,
      recent,
      models: { director: e.DIRECTOR_MODEL, child: e.CHILD_MODEL },
      sessionId,
      turn: turnNo,
    },
    { tagMove, writeLines },
  );

  const result: TurnResult = {
    sessionId,
    turn: turnNo,
    transcript: r.teacherText,
    director: r.director,
    lines: r.lines,
    statesAfter: r.state.children,
    audioUrl: replyAudio(r, session.lang, voiceCtx),
    lessonOver: r.lessonOver,
    ms: Date.now() - started,
  };

  try {
    await saveTurn({
      sessionId,
      state: r.state,
      bytesIn: Buffer.byteLength(r.teacherText) + (input.audio?.bytes.length ?? 0),
      bytesOut: Buffer.byteLength(JSON.stringify(result)),
      turn: {
        turn: turnNo,
        idempotencyKey: input.idempotencyKey,
        teacherText: r.teacherText,
        audioMs: null,
        director: r.director,
        statesBefore: r.statesBefore,
        statesAfter: r.state.children,
        result,
        ms: result.ms,
        records: r.records,
      },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // The same turn was saved by a parallel retry → return that one. A different turn won the race → busy.
    const winner = await findTurnByKey(sessionId, input.idempotencyKey);
    if (winner) return winner;
    throw new HttpError("busy", "Another turn of this lesson is being answered.");
  }
  return result;
};

/**
 * Where the children's voices for this turn will be: the fixed "say again" clip, or (web) a link that makes the
 * Bulbul clip when the browser asks — so the text isn't held up by speech. WhatsApp (Phase 5) will make it at once.
 */
function replyAudio(
  r: { lines: TurnResult["lines"]; counted: boolean; director: TurnResult["director"] },
  lang: "en" | "hi",
  ctx: { sessionId: string; turn: number },
): string | null {
  if (r.lines.length === 0) return null;
  if (!r.counted && r.director === null) return `/audio/again-${lang}.mp3`;
  return ttsAvailable() ? turnAudioPath(ctx.sessionId, ctx.turn) : null;
}

/**
 * Idempotent: the first card is stored; asking again returns it. The Coach writes it (quote-checked); if the Coach
 * fails twice or today's AI budget is used up, the plain card from her own words is stored instead.
 */
export const realEndLesson: EndLesson = async (sessionId) => {
  const existing = await loadCard(sessionId);
  if (existing) return existing;
  const session = await loadSession(sessionId);
  if (!session) throw new HttpError("not_found", "This lesson doesn't exist.");
  const scenario = scenarioOrThrow(session.scenarioId);
  const turns = await loadTurns(sessionId);
  const e = serverEnv();
  const allowClaude = await assertWithinBudget({ limitUsd: e.AI_DAILY_BUDGET_USD, spendSince }).then(
    () => true,
    () => false,
  );
  const outcome = await writeCard({
    scenario,
    lang: session.lang,
    model: e.COACH_MODEL,
    sessionId,
    allowClaude,
    turns: turns.map((x) => ({
      turn: x.turn,
      teacherText: x.teacherText,
      director: x.director,
      lines: x.result.lines,
      statesBefore: x.statesBefore,
      statesAfter: x.statesAfter,
    })),
  });
  log("coach_card", {
    sessionId,
    source: outcome.source,
    quotesVerified: outcome.quotesVerified,
    dropped: outcome.droppedPoints,
  });
  return saveCardAndEnd({
    sessionId,
    card: outcome.card,
    quotesVerified: outcome.quotesVerified,
    droppedPoints: outcome.droppedPoints,
    lang: session.lang,
  });
};

export const realGetSession: GetSession = async (sessionId) => {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const session = await loadSession(sessionId);
  if (!session) return null;
  const [turns, card] = await Promise.all([loadTurns(sessionId), loadCard(sessionId)]);
  return {
    sessionId,
    userId: session.userId,
    scenarioId: session.scenarioId,
    lang: session.lang,
    channel: session.channel,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    turns: turns.map((x) => x.result),
    hasCard: card !== null,
  };
};

export const realGetCard: GetCard = async (sessionId) => loadCard(sessionId);
