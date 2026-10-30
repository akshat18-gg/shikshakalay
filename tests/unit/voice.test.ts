/**
 * Voice with a fake fetch: what we send to Sarvam, how clips are joined, and how failures surface.
 */
import { describe, expect, it } from "vitest";
import { SttError, transcribeWith } from "@/lib/voice/stt";
import { TtsError, activeBackend, sarvamBackend, stripId3 } from "@/lib/voice/tts";
import { SARVAM_VOICES } from "@/lib/voice/voices";
import { makeWav } from "./wav";

type Call = { url: string; init: RequestInit };

function fakeFetch(reply: (call: Call, n: number) => { status?: number; body: unknown } | Error) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    const r = reply(call, calls.length);
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

const b64 = (s: string) => Buffer.from(s).toString("base64");

describe("Sarvam text-to-speech", () => {
  it("sends one request per line with that child's voice, and joins the clips in order", async () => {
    const { f, calls } = fakeFetch((c) => {
      const body = JSON.parse(String(c.init.body)) as { speaker: string };
      return { body: { audios: [b64(`<${body.speaker}>`)] } };
    });
    const out = await sarvamBackend({ apiKey: "k", fetch: f }).speak(
      [
        { voice: "ravi", text: "35, Teacher!" },
        { voice: "meena", text: "26." },
      ],
      "hi",
      "mp3",
    );
    expect(out.toString()).toBe(`<${SARVAM_VOICES.children.ravi.speaker}><${SARVAM_VOICES.children.meena.speaker}>`);
    const first = JSON.parse(String(calls[0]!.init.body));
    expect(first).toMatchObject({ text: "35, Teacher!", language_code: "hi-IN", output_audio_codec: "mp3", pace: 1.1 });
    expect(new Headers(calls[0]!.init.headers).get("api-subscription-key")).toBe("k");
    expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal);
  });

  it("makes WhatsApp voice notes: asks Sarvam for 24 kHz WAV and returns one Ogg/Opus file", async () => {
    const { f, calls } = fakeFetch(() => ({ body: { audios: [makeWav(4800, 24000).toString("base64")] } }));
    const out = await sarvamBackend({ apiKey: "k", fetch: f }).speak(
      [
        { voice: "ravi", text: "35!" },
        { voice: "meena", text: "26." },
      ],
      "hi",
      "ogg",
    );
    expect(JSON.parse(String(calls[0]!.init.body))).toMatchObject({
      output_audio_codec: "wav",
      speech_sample_rate: 24000,
    });
    expect(out.toString("latin1", 0, 4)).toBe("OggS");
    expect(out.includes(Buffer.from("OpusHead"))).toBe(true);
  });

  it("reports provider errors and broken audio as TtsError", async () => {
    const notWav = fakeFetch(() => ({ body: { audios: [b64("x")] } }));
    await expect(
      sarvamBackend({ apiKey: "k", fetch: notWav.f }).speak([{ voice: "coach", text: "Hi" }], "en", "ogg"),
    ).rejects.toMatchObject({ reason: "provider_error" });
    const bad = fakeFetch(() => ({ status: 429, body: { error: { message: "rate limited" } } }));
    await expect(
      sarvamBackend({ apiKey: "k", fetch: bad.f }).speak([{ voice: "coach", text: "Hi" }], "en", "mp3"),
    ).rejects.toThrow(/429: rate limited/);
    const down = fakeFetch(() => new Error("ECONNRESET"));
    await expect(
      sarvamBackend({ apiKey: "k", fetch: down.f }).speak([{ voice: "sana", text: "25?" }], "en", "mp3"),
    ).rejects.toBeInstanceOf(TtsError);
  });

  it("strips an ID3 tag so joined MP3s play as one stream", () => {
    const tag = Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 3, 1, 2, 3]); // "ID3", size 3
    expect([...stripId3(Buffer.concat([tag, Buffer.from([0xff, 0xfb])]))]).toEqual([0xff, 0xfb]);
    expect([...stripId3(Buffer.from([0xff, 0xfb, 1]))]).toEqual([0xff, 0xfb, 1]);
  });

  it("says clearly when no TTS key is set", () => {
    expect(() => activeBackend({})).toThrow(/No text-to-speech key/);
    expect(activeBackend({ SARVAM_API_KEY: "k" }).name).toBe("sarvam");
  });
});

describe("Sarvam speech-to-text", () => {
  const audio = { bytes: Buffer.from("fake-audio"), mime: "audio/webm;codecs=opus" };

  it("sends the file, model, language and keyterms; returns the transcript", async () => {
    const { f, calls } = fakeFetch(() => ({ body: { transcript: " रवि, तुमने 35 कैसे निकाला? " } }));
    const text = await transcribeWith({ apiKey: "k", fetch: f }, audio, "hi", ["Ravi", "बंडल"]);
    expect(text).toBe("रवि, तुमने 35 कैसे निकाला?");
    const form = calls[0]!.init.body as FormData;
    expect(form.get("model")).toBe("saaras:v4");
    expect(form.get("language_code")).toBe("hi-IN");
    expect(form.get("keyterms")).toBe('["Ravi","बंडल"]');
    expect((form.get("file") as File).name).toBe("turn.webm");
  });

  it("keeps at most 50 keyterms of 64 characters", async () => {
    const { f, calls } = fakeFetch(() => ({ body: { transcript: "ok" } }));
    await transcribeWith(
      { apiKey: "k", fetch: f },
      audio,
      "en",
      Array.from({ length: 60 }, () => "x".repeat(80)),
    );
    const sent = JSON.parse(String((calls[0]!.init.body as FormData).get("keyterms"))) as string[];
    expect(sent).toHaveLength(50);
    expect(sent[0]).toHaveLength(64);
  });

  it("turns errors and timeouts into SttError", async () => {
    const bad = fakeFetch(() => ({ status: 400, body: { error: { message: "unsupported file" } } }));
    await expect(transcribeWith({ apiKey: "k", fetch: bad.f }, audio, "en")).rejects.toThrow(/400: unsupported file/);
    const slow = fakeFetch(() => new DOMException("timed out", "TimeoutError"));
    await expect(transcribeWith({ apiKey: "k", fetch: slow.f }, audio, "en")).rejects.toBeInstanceOf(SttError);
  });
});
