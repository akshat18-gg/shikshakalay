import { describe, expect, it, vi } from "vitest";
import { audioResponse } from "@/lib/media/serve";
import { loadMedia } from "@/lib/media/store";
import { trackedSpeakLines, trackedTranscribe } from "@/lib/voice/tracked";
import type { AiCallRow } from "@/lib/db/queries/aiCalls";

vi.mock("@/lib/voice/tts", () => ({
  speakLines: vi.fn(async (lines: { text: string }[]) => {
    if (lines[0]?.text === "fail") throw new Error("Sarvam TTS HTTP 500");
    return Buffer.from("mp3");
  }),
  speakText: vi.fn(async () => Buffer.from("mp3")),
}));
vi.mock("@/lib/voice/stt", () => ({ transcribe: vi.fn(async () => "रवि, कैसे?") }));

const data = Buffer.from("0123456789");

describe("audioResponse", () => {
  it("sends the whole clip without a Range header", async () => {
    const res = audioResponse(data, "audio/mpeg", null);
    expect(res.status).toBe(200);
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-length")).toBe("10");
    expect(await res.text()).toBe("0123456789");
  });

  it("answers Safari's byte-range requests with 206", async () => {
    const first = audioResponse(data, "audio/mpeg", "bytes=0-1");
    expect(first.status).toBe(206);
    expect(first.headers.get("content-range")).toBe("bytes 0-1/10");
    expect(await first.text()).toBe("01");
    expect(await audioResponse(data, "audio/mpeg", "bytes=7-").text()).toBe("789");
    expect(await audioResponse(data, "audio/mpeg", "bytes=-3").text()).toBe("789");
    expect(audioResponse(data, "audio/mpeg", "bytes=20-30").status).toBe(416);
  });
});

describe("media tokens", () => {
  it("refuses anything that isn't a 32-character hex token, without asking the database", async () => {
    for (const bad of ["", "abc", "../../etc/passwd", "Z".repeat(32)]) expect(await loadMedia(bad)).toBeNull();
  });
});

describe("tracked voice calls", () => {
  it("records each Sarvam call with time, success and an approximate cost", async () => {
    const rows: AiCallRow[] = [];
    const ctx = { sessionId: "s1", turn: 2, record: async (r: AiCallRow) => void rows.push(r) };
    expect(await trackedTranscribe({ bytes: Buffer.alloc(24_000), mime: "audio/webm" }, "hi", [], ctx)).toBe(
      "रवि, कैसे?",
    );
    await trackedSpeakLines([{ child: "ravi", text: "35, Teacher!" }], "en", "mp3", ctx);
    await expect(trackedSpeakLines([{ child: "ravi", text: "fail" }], "en", "mp3", ctx)).rejects.toThrow(/500/);
    expect(rows.map((r) => [r.purpose, r.provider, r.ok])).toEqual([
      ["stt", "sarvam", true],
      ["tts", "sarvam", true],
      ["tts", "sarvam", false],
    ]);
    expect(rows[0]?.costUsd).toBeCloseTo(((6 / 60) * 0.49) / 88, 8); // 24 KB ≈ 6 s
    expect(rows[2]).toMatchObject({ costUsd: 0, error: "Sarvam TTS HTTP 500", turn: 2 });
  });
});
