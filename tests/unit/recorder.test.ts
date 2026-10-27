import { describe, expect, it } from "vitest";
import { fileNameFor, pickMimeType, releaseAction, retryDelayMs, ringProgress } from "@/lib/recorder";

describe("recorder helpers", () => {
  it("picks webm on Chrome, mp4 on iPhone Safari, nothing when neither works", () => {
    expect(pickMimeType((t) => t.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
    expect(pickMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickMimeType(() => false)).toBe("");
  });

  it("fills the ring over 30 seconds", () => {
    expect(ringProgress(15_000)).toBe(0.5);
    expect(ringProgress(45_000)).toBe(1);
    expect(ringProgress(-1)).toBe(0);
  });

  it("a short press is a tap (keep recording), a long press sends on release", () => {
    expect(releaseAction(150)).toBe("keep_recording");
    expect(releaseAction(1200)).toBe("send");
  });

  it("backs off 1 s then 3 s, and names the upload by type", () => {
    expect([retryDelayMs(1), retryDelayMs(2)]).toEqual([1000, 3000]);
    expect(fileNameFor("audio/mp4")).toBe("turn.m4a");
    expect(fileNameFor("audio/webm;codecs=opus")).toBe("turn.webm");
  });
});
