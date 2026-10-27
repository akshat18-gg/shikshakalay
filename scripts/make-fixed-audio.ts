/**
 * Makes the fixed clips once (no paid call during lessons): public/audio/hello-<lang>.mp3 — every child who greets,
 * in their own voice, from the lesson file — and again-<lang>.mp3 — the most eager child's "say again" line.
 * MP3 only: Bulbul can't make ogg/opus (WhatsApp, Phase 5). Run: npx tsx --env-file-if-exists=.env.local scripts/make-fixed-audio.ts
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
    writeFileSync(`public/audio/hello-${lang}.mp3`, await tts.speak(hello, lang, "mp3"));
    const first = mostEager(state)!;
    const again = await tts.speak([{ voice: first.id, text: backupLine(scenario, lang, "repeat") }], lang, "mp3");
    writeFileSync(`public/audio/again-${lang}.mp3`, again);
    console.log(`✓ ${lang}: hello (${hello.map((h) => h.voice).join(", ")}), again (${first.id})`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
