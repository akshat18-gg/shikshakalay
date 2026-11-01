/**
 * The rules: what a teaching move does to each child's mind, and what each child believes and says.
 * Pure functions, no Claude (AGENTS.md 7.4). A good doctor first finds out what is wrong (reveal), then treats it
 * (fix). Treating without checking only half-works (WOBBLY). Telling the answer makes a child repeat it once,
 * but the mistake stays.
 */
import type { ChildId, ChildState, DirectorOutput, Move } from "@/lib/contracts";
import { type Operation, answerOf, answerWith, parseTask } from "./bugs";
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
  const op = state.operation ?? "sub"; // lessons stored before the field existed are take-away
  let currentSum = state.currentSum;
  let parrots = state.parrots;

  // A task this lesson can't play (another operation, numbers too big, or one its operation can't do — sub: a
  // bigger number from a smaller one; div: not exact or by 0) changes nothing at all: one child answers without a
  // number (speakers.ts) and the lesson stays on its sum.
  const task = parseTask(director.newTask, state.currentSum, op);
  if (task.kind === "impossible" || task.kind === "unsupported") return state;
  if (task.kind === "sum") {
    // A told answer is "for this sum only": asking the same sum again keeps it, a different sum clears it
    // (so "No, it's 19." → "So what is 23 − 4?" still gets 19; the mistake comes back on the next sum).
    if (!sameSum(task.sum, state.currentSum)) parrots = {};
    currentSum = task.sum;
  }

  const targets = new Set(targetsOf(state, director));
  const children = state.children.map((c) => (targets.has(c.id) ? changeChild(c, move, currentSum, effects) : c));

  if (move === "tell_answer") {
    const told: Parrot = { sum: currentSum, answer: answerOf(op, currentSum[0], currentSum[1]) };
    parrots = { ...parrots };
    for (const id of targets) parrots[id] = told;
  }

  return { ...state, currentSum, parrots, children };
}

/**
 * What the child really thinks the answer is. WOBBLY is right only on the sum worked on with the teacher.
 * `op` is the lesson's operation (every grown signature defaults to take-away, so older callers stay correct).
 */
export function beliefAnswer(child: ChildState, [a, b]: Sum, op: Operation = "sub"): number {
  if (child.bug === null || child.state === "GOT_IT") return answerOf(op, a, b);
  if (child.state === "WOBBLY" && sameSum(child.workedSum, [a, b])) return answerOf(op, a, b);
  return answerWith(child.bug, a, b, op);
}

/** What the child says out loud: a told answer for this sum, otherwise what it believes. */
export function spokenAnswer(
  child: ChildState,
  sum: Sum,
  parrots: EngineState["parrots"],
  op: Operation = "sub",
): number {
  const parrot = parrots[child.id];
  return parrot && sameSum(parrot.sum, sum) ? parrot.answer : beliefAnswer(child, sum, op);
}

/** Does the child's belief come from its mistake (true) or from the right method (false)? */
export function believesMistake(child: ChildState, sum: Sum, op: Operation = "sub"): boolean {
  return child.bug !== null && beliefAnswer(child, sum, op) !== answerOf(op, sum[0], sum[1]);
}
