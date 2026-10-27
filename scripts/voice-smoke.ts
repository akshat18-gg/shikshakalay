/**
 * Real Sarvam check (a few rupees; run by hand): children's lines → one joined MP3, the coach line, and
 * speech-to-text on the five test lines (from private/recordings/ when they exist, otherwise spoken by a Bulbul
 * voice). Files go to private/voice-samples/. Run: npm run voice:smoke
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { loadScenario } from "../src/lib/engine/scenario";
import { transcribeWith } from "../src/lib/voice/stt";
import { sarvamBackend } from "../src/lib/voice/tts";

const apiKey = process.env.SARVAM_API_KEY ?? "";
const OUT = "private/voice-samples";

const TEST_LINES: { lang: "hi" | "en"; text: string }[] = [
  { lang: "hi", text: "रवि, तुमने 35 कैसे निकाला? मुझे बताओ।" },
  { lang: "en", text: "What is 52 minus 27? Use bundles and sticks." },
  { lang: "hi", text: "Arjun, 43 minus 18 karo. Ek bundle kholo, phir 13 mein se 8 hatao." },
  { lang: "hi", text: "सना, तुम क्या सोचती हो? आराम से बताओ।" },
  { lang: "en", text: "No, the answer is 25. Everyone say 25. Good." },
];

async function timed<T>(label: string, run: () => Promise<T>): Promise<T> {
  const s = Date.now();
  const v = await run();
  console.log(`  ${label}: ${Date.now() - s} ms`);
  return v;
}

/** A teacher-like voice reading a line, as MP3 — stands in for a real recording. */
async function spoken(text: string, lang: "hi" | "en"): Promise<Buffer> {
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "api-subscription-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      text,
      language_code: lang === "hi" ? "hi-IN" : "en-IN",
      model: "bulbul:v4-flash",
      speaker: "sanchita_hi_edtech",
      output_audio_codec: "mp3",
    }),
  });
  const body = (await res.json()) as { audios: string[] };
  return Buffer.from(body.audios[0]!, "base64");
}

async function main() {
  if (!apiKey) throw new Error("SARVAM_API_KEY is missing");
  mkdirSync(OUT, { recursive: true });
  const tts = sarvamBackend({ apiKey });

  console.log("Text → speech");
  const hi = await timed("hi turn, 3 children", () =>
    tts.speak(
      [
        { voice: "ravi", text: "35, टीचर जी! मैंने सबसे पहले किया!" },
        { voice: "arjun", text: "मेरा भी 35, टीचर जी!" },
        { voice: "meena", text: "रुकिए… उंगलियों पर गिन रही हूँ… 26।" },
      ],
      "hi",
      "mp3",
    ),
  );
  writeFileSync(`${OUT}/turn-hi.mp3`, hi);
  const en = await timed("en turn, Sana", () =>
    tts.speak([{ voice: "sana", text: "Umm… 25, Teacher? I opened one bundle." }], "en", "mp3"),
  );
  writeFileSync(`${OUT}/turn-en-sana.mp3`, en);
  const coach = await timed("coach line", () =>
    tts.speak([{ voice: "coach", text: "दोनों बताओ, तुमने कैसे निकाला?" }], "hi", "mp3"),
  );
  writeFileSync(`${OUT}/coach-hi.mp3`, coach);
  console.log(`  sizes: hi turn ${hi.length} B · sana ${en.length} B · coach ${coach.length} B`);

  console.log("Speech → text");
  const keyterms = loadScenario("sub_2digit")!.keyterms;
  const recordings = existsSync("private/recordings")
    ? readdirSync("private/recordings")
        .filter((f) => /\.(m4a|mp3|wav|webm|ogg)$/.test(f))
        .sort()
    : [];
  for (const [i, line] of TEST_LINES.entries()) {
    const file = recordings[i];
    const bytes = file ? readFileSync(`private/recordings/${file}`) : await spoken(line.text, line.lang);
    const mime = file
      ? file.endsWith(".m4a")
        ? "audio/mp4"
        : file.endsWith(".wav")
          ? "audio/wav"
          : "audio/mpeg"
      : "audio/mpeg";
    const source = file ? `recording ${file}` : "Bulbul voice";
    const v4 = await transcribeWith({ apiKey, model: "saaras:v4" }, { bytes, mime }, line.lang, keyterms);
    const v3 = await transcribeWith({ apiKey, model: "saaras:v3" }, { bytes, mime }, line.lang);
    console.log(`  [${line.lang}] said: ${line.text}  (${source})\n      v4+keyterms: ${v4}\n      v3:          ${v3}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
