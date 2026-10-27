/**
 * Voice candidates for the children and the coach (Sarvam Bulbul). For each speaker and language it saves a WAV to
 * private/voice-samples/ (for the operator to listen to) and estimates the median pitch, so we can pick voices that
 * sound young and clearly different. Costs a few rupees of Sarvam credit. Run: npx tsx --env-file-if-exists=.env.local scripts/voice-samples.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";

type Candidate = { speaker: string; model: "bulbul:v4-flash" | "bulbul:v3" };

const CANDIDATES: Candidate[] = [
  ...[
    "kunal_hi_kids",
    "chhavi_hi_kids",
    "ritu_hi_kids",
    "nupur_en_kids",
    "shubh_hi_stories_dramatic",
    "aditi_en_stories",
    "ishita_en_stories",
  ].map((speaker) => ({ speaker, model: "bulbul:v4-flash" as const })),
  ...[
    "ishita_hi_edtech",
    "shruti_hi_edtech",
    "sanchita_hi_edtech",
    "kalpit_en_edtech",
    "aparna_en_edtech",
    "shubh_en_narration_gentle",
  ].map((speaker) => ({ speaker, model: "bulbul:v4-flash" as const })),
  ...[
    "aayan",
    "kabir",
    "rehan",
    "soham",
    "dev",
    "advait",
    "kavya",
    "suhani",
    "shreya",
    "ishita",
    "simran",
    "tanya",
  ].map((speaker) => ({
    speaker,
    model: "bulbul:v3" as const,
  })),
];

const LINES = { "hi-IN": "35, टीचर जी! मैंने सबसे पहले किया!", "en-IN": "35, Teacher! I did it first!" } as const;

/** Median fundamental frequency (Hz) of 16-bit mono PCM, by autocorrelation on 40 ms frames. */
function medianPitch(pcm: Int16Array, rate: number): number | null {
  const frame = Math.floor(rate * 0.04);
  const minLag = Math.floor(rate / 450);
  const maxLag = Math.floor(rate / 80);
  const pitches: number[] = [];
  for (let start = 0; start + frame + maxLag < pcm.length; start += frame) {
    let energy = 0;
    for (let i = 0; i < frame; i++) energy += pcm[start + i]! ** 2;
    if (energy / frame < 500_000) continue; // silence
    let best = 0;
    let bestLag = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < frame; i++) sum += pcm[start + i]! * pcm[start + i + lag]!;
      if (sum > best) [best, bestLag] = [sum, lag];
    }
    if (bestLag && best / energy > 0.5) pitches.push(rate / bestLag);
  }
  if (pitches.length < 3) return null;
  pitches.sort((a, b) => a - b);
  return Math.round(pitches[Math.floor(pitches.length / 2)]!);
}

/** The PCM samples and rate inside a WAV file (finds the "data" chunk). */
function readWav(buf: Buffer): { pcm: Int16Array; rate: number } {
  const rate = buf.readUInt32LE(24);
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "data") {
      const data = buf.subarray(off + 8, off + 8 + Math.min(size, buf.length - off - 8));
      return { pcm: new Int16Array(data.buffer, data.byteOffset, Math.floor(data.length / 2)), rate };
    }
    off += 8 + size;
  }
  throw new Error("no data chunk");
}

async function synth(c: Candidate, lang: keyof typeof LINES): Promise<Buffer> {
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "api-subscription-key": process.env.SARVAM_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      text: LINES[lang],
      language_code: lang,
      model: c.model,
      speaker: c.speaker,
      output_audio_codec: "wav",
      speech_sample_rate: 22050,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json()) as { audios?: string[]; error?: { message?: string } };
  if (!res.ok || !body.audios?.[0]) throw new Error(`HTTP ${res.status} ${body.error?.message ?? ""}`.trim());
  return Buffer.from(body.audios[0], "base64");
}

async function main() {
  if (!process.env.SARVAM_API_KEY) throw new Error("SARVAM_API_KEY is missing (npm run env:check)");
  mkdirSync("private/voice-samples", { recursive: true });
  for (const c of CANDIDATES) {
    const cells: string[] = [];
    for (const lang of Object.keys(LINES) as (keyof typeof LINES)[]) {
      try {
        const wav = await synth(c, lang);
        writeFileSync(`private/voice-samples/${c.speaker}-${lang}.wav`, wav);
        const { pcm, rate } = readWav(wav);
        cells.push(`${lang} ${medianPitch(pcm, rate) ?? "?"} Hz ${(pcm.length / rate).toFixed(1)} s`);
      } catch (err) {
        cells.push(`${lang} ✗ ${err instanceof Error ? err.message.slice(0, 60) : String(err)}`);
      }
    }
    console.log(`${c.speaker.padEnd(28)} ${c.model.padEnd(16)} ${cells.join(" · ")}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
