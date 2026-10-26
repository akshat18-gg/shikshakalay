/**
 * The real lesson engine (P1-T8): Director → rules → Children → guardrails → save. Not built yet —
 * until then every function throws, and the app runs with USE_MOCKS=1.
 */
import type { EndLesson, GetCard, GetSession, RunTurn, StartLesson } from "@/lib/contracts";

function notBuilt(): never {
  throw new Error("engine not built yet — run with USE_MOCKS=1");
}

export const realStartLesson: StartLesson = async () => notBuilt();
export const realRunTurn: RunTurn = async () => notBuilt();
export const realEndLesson: EndLesson = async () => notBuilt();
export const realGetSession: GetSession = async () => notBuilt();
export const realGetCard: GetCard = async () => notBuilt();
