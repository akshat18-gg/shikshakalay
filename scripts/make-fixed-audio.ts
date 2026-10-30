/**
 * Makes the fixed clips once (no paid call during lessons): public/audio/hello-<lang>.mp3 — every child who greets,
 * in their own voice, from the lesson file — and again-<lang>.mp3 — the most eager child's "say again" line.
 * Each in MP3 (web) and Ogg/Opus (WhatsApp voice notes). Run: npx tsx --env-file-if-exists=.env.local scripts/make-fixed-audio.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { backupLine, loadScenario, startState } from "../src/lib/engine/scenario";
import { helloSpeakers, mostEager } from "../src/lib/engine/speakers";
import { sarvamBackend } from "../src/lib/voice/tts";

async function main() {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("SARVAM_API_KEY is missing");
  const tts = sarvamBackend({ apiKey });
  const scenario = loadScenario("sub_2digit")!;
  mkdirSync("public/audio", { recursive: true });
  for (const lang of ["en", "hi"] as const) {
    const state = startState(scenario, lang, new Date().toISOString());
    const hello = helloSpeakers(state).map((c) => ({ voice: c.id, text: backupLine(scenario, lang, "hello") }));
    const first = mostEager(state)!;
    const again = [{ voice: first.id, text: backupLine(scenario, lang, "repeat") }];
    for (const format of ["mp3", "ogg"] as const) {
      writeFileSync(`public/audio/hello-${lang}.${format}`, await tts.speak(hello, lang, format));
      writeFileSync(`public/audio/again-${lang}.${format}`, await tts.speak(again, lang, format));
    }
    console.log(`✓ ${lang}: hello (${hello.map((h) => h.voice).join(", ")}), again (${first.id})`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
