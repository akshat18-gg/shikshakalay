/**
 * The rules: what a teaching move does to each child's mind, and what each child believes and says.
 * Pure functions, no Claude (AGENTS.md 7.4). A good doctor first finds out what is wrong (reveal), then treats it
 * (fix). Treating without checking only half-works (WOBBLY). Telling the answer makes a child repeat it once,
 * but the mistake stays.
 */
import type { ChildId, ChildState, DirectorOutput, Move } from "@/lib/contracts";
import { answerWith, parseTask } from "./bugs";
import { DEFAULT_MOVE_EFFECTS, type EngineState, type MoveEffects, type Parrot, type Sum } from "./types";

const sameSum = (x: Sum | null, y: Sum) => x !== null && x[0] === y[0] && x[1] === y[1];

/** Step 1: a move the Director is unsure about changes nothing. */
export function effectiveMove(director: DirectorOutput): Move {
  return director.confidence === "low" ? "other" : director.move;
}

/** Step 3: the children named, or everyone for "whole_class" (or nobody named). */
export function targetsOf(state: EngineState, director: DirectorOutput): ChildId[] {
  const all = state.children.map((c) => c.id);
  const to = director.addressedTo;
  if (to.length === 0 || to.includes("whole_class")) return all;
  return all.filter((id) => (to as string[]).includes(id));
}

function changeChild(child: ChildState, move: Move, sum: Sum, effects: MoveEffects): ChildState {
  const c = { ...child };
  if (effects.reveal.includes(move)) c.revealed = true;

  // A child with no mistake is always right: her state never moves.
  if (c.bug !== null) {
    if (effects.fix.includes(move)) {
      if (c.state === "STUCK") {
        c.state = "WOBBLY";
        c.workedSum = sum;
      } else if (c.state === "WOBBLY" && c.revealed) {
        c.state = "GOT_IT";
      } else if (c.state === "WOBBLY") {
        c.workedSum = sum;
      }
    } else if (effects.halfFix.includes(move)) {
      if (c.state === "STUCK") c.state = "WOBBLY";
      if (c.state === "WOBBLY") c.workedSum = sum; // never to GOT_IT
    }
  }

  if (effects.engagementUp.includes(move)) c.engagement = Math.min(3, c.engagement + 1);
  if (effects.engagementDown.includes(move)) c.engagement = Math.max(0, c.engagement - 1);
  return c;
}

/**
 * Steps 1–4 of AGENTS.md 7.4: apply one Director decision to the state. Returns a new state.
 * (Turn counting and the lesson clock live in core.ts.)
 */
export function applyMove(
  state: EngineState,
  director: DirectorOutput,
  effects: MoveEffects = DEFAULT_MOVE_EFFECTS,
): EngineState {
  const move = effectiveMove(director);
  let currentSum = state.currentSum;
  let parrots = state.parrots;

  // A task the engine can't play (bigger from smaller, addition, ×, 3 digits) changes nothing at all:
  // one child answers without a number (speakers.ts) and the lesson stays on its sum.
  const task = parseTask(director.newTask, state.currentSum);
  if (task.kind === "impossible" || task.kind === "unsupported") return state;
  if (task.kind === "sum") {
    currentSum = task.sum;
    parrots = {};
  }

  const targets = new Set(targetsOf(state, director));
  const children = state.children.map((c) => (targets.has(c.id) ? changeChild(c, move, currentSum, effects) : c));

  if (move === "tell_answer") {
    const told: Parrot = { sum: currentSum, answer: currentSum[0] - currentSum[1] };
    parrots = { ...parrots };
    for (const id of targets) parrots[id] = told;
  }

  return { ...state, currentSum, parrots, children };
}

/** What the child really thinks the answer is. WOBBLY is right only on the sum worked on with the teacher. */
export function beliefAnswer(child: ChildState, [a, b]: Sum): number {
  if (child.bug === null || child.state === "GOT_IT") return a - b;
  if (child.state === "WOBBLY" && sameSum(child.workedSum, [a, b])) return a - b;
  return answerWith(child.bug, a, b);
}

/** What the child says out loud: a told answer for this sum, otherwise what it believes. */
export function spokenAnswer(child: ChildState, sum: Sum, parrots: EngineState["parrots"]): number {
  const parrot = parrots[child.id];
  return parrot && sameSum(parrot.sum, sum) ? parrot.answer : beliefAnswer(child, sum);
}

/** Does the child's belief come from its mistake (true) or from the right method (false)? */
export function believesMistake(child: ChildState, sum: Sum): boolean {
  return child.bug !== null && beliefAnswer(child, sum) !== sum[0] - sum[1];
}
