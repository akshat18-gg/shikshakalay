import { describe, expect, it } from "vitest";
import { turnAudioPath } from "@/lib/engine/turnAudio";

describe("turnAudioPath", () => {
  it("points the browser at the per-turn audio route", () => {
    expect(turnAudioPath("abc", 3)).toBe("/api/sessions/abc/turns/3/audio");
  });
});
