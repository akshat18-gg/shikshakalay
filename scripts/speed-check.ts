/**
 * Times a spoken lesson on a running site: the teacher's lines are spoken by a Bulbul voice and sent as recordings.
 * Prints time to text and time to audio per turn, then p50/p90. Costs a few rupees + cents. npm run speed:check -- --url …
 */
const i = process.argv.indexOf("--url");
const base = (i > 0 ? process.argv[i + 1] : (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"))!.replace(
  /\/$/,
  "",
);
const LINES = [
  "बावन में से सत्ताईस कितना होगा?",
  "नहीं, जवाब पच्चीस है। सब बोलो पच्चीस।",
  "अब तैंतालीस में से अठारह?",
  "रवि, तुमने 35 कैसे निकाला? मुझे बताओ।",
  "रवि, तैंतालीस को बंडल और तीलियों से दिखाओ।",
  "सना, तुम क्या सोचती हो? आराम से बताओ।",
];

async function spoken(text: string): Promise<Buffer> {
  const r = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "api-subscription-key": process.env.SARVAM_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      text,
      language_code: "hi-IN",
      model: "bulbul:v4-flash",
      speaker: "sanchita_hi_edtech",
      output_audio_codec: "mp3",
    }),
  });
  return Buffer.from(((await r.json()) as { audios: string[] }).audios[0]!, "base64");
}

const pct = (xs: number[], p: number) =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))]!;

async function main() {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "teacher_demo", pin: process.env.DEMO_PIN ?? "1234" }),
  });
  const h = { cookie: (login.headers.get("set-cookie") ?? "").split(";")[0]! };
  const start = (await (
    await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { ...h, "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "sub_2digit", lang: "hi" }),
    })
  ).json()) as { sessionId: string };
  const recordings = await Promise.all(LINES.map(spoken));
  const toText: number[] = [];
  const toAudio: number[] = [];
  const server: number[] = [];
  for (const [n, audio] of recordings.entries()) {
    const f = new FormData();
    f.append("audio", new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }), "turn.mp3");
    f.append("idempotencyKey", crypto.randomUUID());
    const t0 = Date.now();
    const t = (await (
      await fetch(`${base}/api/sessions/${start.sessionId}/turns`, { method: "POST", headers: h, body: f })
    ).json()) as { ms: number; transcript: string; audioUrl: string | null; lines: { child: string; text: string }[] };
    const textAt = Date.now() - t0;
    const a = t.audioUrl ? await fetch(base + t.audioUrl, { headers: h }) : null;
    const audioAt = Date.now() - t0;
    await a?.arrayBuffer();
    toText.push(textAt);
    toAudio.push(audioAt);
    server.push(t.ms);
    console.log(
      `T${n + 1} text ${textAt} ms (server ${t.ms}) · audio ${audioAt} ms ${a?.status ?? "-"} · "${t.transcript}" → ${t.lines.map((l) => `${l.child}: ${l.text}`).join(" | ")}`,
    );
  }
  console.log(`\ntime to text   p50 ${pct(toText, 50)} ms · p90 ${pct(toText, 90)} ms`);
  console.log(`time to audio  p50 ${pct(toAudio, 50)} ms · p90 ${pct(toAudio, 90)} ms`);
  console.log(`server (turns.ms) p50 ${pct(server, 50)} ms · p90 ${pct(server, 90)} ms`);
}
void main();
