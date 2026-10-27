/**
 * Small pure helpers for the recorder (browser-safe, unit-tested).
 */

/** Each turn is at most 30 seconds (speech-to-text limit); the recorder stops itself there. */
export const MAX_RECORD_MS = 30_000;
/** A press shorter than this is a tap (tap-to-start / tap-to-stop mode); longer is hold-to-talk. */
export const TAP_MS = 400;

const TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];

/** The first recording format this browser supports (Chrome: webm, iPhone Safari: mp4), or "" for the default. */
export function pickMimeType(isSupported: (t: string) => boolean): string {
  return TYPES.find((t) => isSupported(t)) ?? "";
}

/** 0 → 1 as the 30 seconds fill. */
export function ringProgress(elapsedMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / MAX_RECORD_MS));
}

/** Released after a short press → keep recording until the next tap; after a long press → send now. */
export function releaseAction(pressedMs: number): "keep_recording" | "send" {
  return pressedMs < TAP_MS ? "keep_recording" : "send";
}

/** Wait before retry n (1, 2, …) after a network error: 1 s, then 3 s. */
export function retryDelayMs(attempt: number): number {
  return attempt <= 1 ? 1000 : 3000;
}

/** A recording's file name for the upload, from its mime type. */
export function fileNameFor(mime: string): string {
  return mime.includes("mp4") ? "turn.m4a" : mime.includes("ogg") ? "turn.ogg" : "turn.webm";
}
