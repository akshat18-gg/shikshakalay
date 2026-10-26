/**
 * The one place everyone imports the engine from. USE_MOCKS=1 → the scripted fake lesson; otherwise the real
 * engine. The choice is made on every call (not at import time), so tests and scripts can flip the env var.
 */
import type { EndLesson, GetCard, GetSession, RunTurn, StartLesson } from "@/lib/contracts";
import { mockEndLesson, mockGetCard, mockGetSession, mockRunTurn, mockStartLesson } from "@/lib/mocks/lesson";
import { realEndLesson, realGetCard, realGetSession, realRunTurn, realStartLesson } from "./orchestrator";

const mock = () => process.env.USE_MOCKS === "1";

export const startLesson: StartLesson = (...a) => (mock() ? mockStartLesson : realStartLesson)(...a);
export const runTurn: RunTurn = (...a) => (mock() ? mockRunTurn : realRunTurn)(...a);
export const endLesson: EndLesson = (...a) => (mock() ? mockEndLesson : realEndLesson)(...a);
export const getSession: GetSession = (...a) => (mock() ? mockGetSession : realGetSession)(...a);
export const getCard: GetCard = (...a) => (mock() ? mockGetCard : realGetCard)(...a);
