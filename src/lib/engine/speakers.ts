/**
 * Who speaks this turn and the exact number each line must contain (AGENTS.md 7.5). Claude only writes the words.
 */
import type { ChildState, DirectorOutput } from "@/lib/contracts";
import { explainSteps, parseTask } from "./bugs";
import { DEFAULT_MOVE_EFFECTS, type EngineState, type MoveEffects, type Speaker } from "./types";
import { believesMistake, beliefAnswer, effectiveMove, spokenAnswer, targetsOf } from "./mindState";

const MAX_WHOLE_CLASS_SPEAKERS = 3;

/** Highest engagement first; ties keep the lesson file's order (Array.sort is stable). */
function byEagerness(children: ChildState[]): ChildState[] {
  return [...children].sort((x, y) => y.engagement - x.engagement);
}

/** The child who answers first: the most eager one who is not withdrawn. */
export function mostEager(state: EngineState): ChildState | undefined {
  return byEagerness(state.children).find((c) => c.engagement >= 1);
}

/** Turn 0: every child who is not withdrawn says hello (no Claude call). */
export function helloSpeakers(state: EngineState): ChildState[] {
  return state.children.filter((c) => c.engagement >= 1);
}

/**
 * Speakers for a normal turn. `state` is the state AFTER applyMove (so an invited child can already speak).
 * A withdrawn child (engagement 0) stays silent even when named.
 */
export function pickSpeakers(
  state: EngineState,
  director: DirectorOutput,
  effects: MoveEffects = DEFAULT_MOVE_EFFECTS,
): Speaker[] {
  const move = effectiveMove(director);
  const sum = state.currentSum;

  // A task the engine can't compute: exactly one child answers, in character, with no number.
  const task = parseTask(director.newTask, state.currentSum);
  if (task.kind === "impossible" || task.kind === "unsupported") {
    const to = director.addressedTo as string[];
    const wholeClass = to.length === 0 || to.includes("whole_class");
    const named = wholeClass ? undefined : state.children.find((c) => to.includes(c.id) && c.engagement >= 1);
    const first = named ?? mostEager(state);
    return first ? [{ child: first.id, mode: task.kind === "impossible" ? "cannot" : "not_today", mustSay: null }] : [];
  }

  if (move === "off_task") {
    const first = mostEager(state);
    return first ? [{ child: first.id, mode: "puzzled", mustSay: null }] : [];
  }

  const targetIds = new Set(targetsOf(state, director));
  let speakers = state.children.filter((c) => targetIds.has(c.id) && c.engagement >= 1);
  const wholeClass = director.addressedTo.length === 0 || director.addressedTo.includes("whole_class");
  if (wholeClass && speakers.length > MAX_WHOLE_CLASS_SPEAKERS) {
    speakers = byEagerness(speakers).slice(0, MAX_WHOLE_CLASS_SPEAKERS);
  }

  return speakers.map((c): Speaker => {
    if (effects.reveal.includes(move)) {
      const steps = explainSteps(believesMistake(c, sum) ? c.bug : null, sum[0], sum[1]);
      return { child: c.id, mode: "explain", mustSay: beliefAnswer(c, sum), steps };
    }
    // A plain reaction ("Good morning", "sit down") never repeats a told answer.
    if (move === "other") return { child: c.id, mode: "react", mustSay: null };
    const parrot = state.parrots[c.id];
    if (parrot && parrot.sum[0] === sum[0] && parrot.sum[1] === sum[1]) {
      return { child: c.id, mode: "parrot", mustSay: parrot.answer };
    }
    return { child: c.id, mode: "answer", mustSay: spokenAnswer(c, sum, state.parrots) };
  });
}
