/**
 * WAV → Ogg/Opus, the only audio WhatsApp shows as a voice note (AGENTS.md 8). Sarvam Bulbul can't make opus, so we
 * ask it for WAV and encode here: opusscript (libopus compiled to WebAssembly, no native build) makes the Opus
 * packets, and the small Ogg writer below wraps them (RFC 7845: OpusHead, OpusTags, then audio pages).
 */
import OpusScript from "opusscript";

export type Pcm = { rate: number; samples: Buffer }; // 16-bit little-endian, mono

/** Reads a mono 16-bit PCM WAV file (what Sarvam returns for output_audio_codec "wav"). */
export function readWav(wav: Buffer): Pcm {
  if (wav.length < 12 || wav.toString("latin1", 0, 4) !== "RIFF" || wav.toString("latin1", 8, 12) !== "WAVE") {
    throw new Error("not a WAV file");
  }
  let rate = 0;
  let pos = 12;
  while (pos + 8 <= wav.length) {
    const id = wav.toString("latin1", pos, pos + 4);
    const size = wav.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt ") {
      const format = wav.readUInt16LE(body);
      const channels = wav.readUInt16LE(body + 2);
      const bits = wav.readUInt16LE(body + 14);
      if (format !== 1 || channels !== 1 || bits !== 16) throw new Error("WAV must be mono 16-bit PCM");
      rate = wav.readUInt32LE(body + 4);
    } else if (id === "data") {
      if (!rate) throw new Error("WAV data before fmt");
      // Some writers put 0 or a too-big size in a streamed WAV: take what is there.
      const end = size && body + size <= wav.length ? body + size : wav.length;
      return { rate, samples: wav.subarray(body, end - ((end - body) % 2)) };
    }
    pos = body + size + (size % 2);
  }
  throw new Error("WAV has no data");
}

/** Silence of the given length, to put a short pause between two children. */
export function silence(rate: number, ms: number): Buffer {
  return Buffer.alloc(Math.round((rate * ms) / 1000) * 2);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
    t[i] = r >>> 0;
  }
  return t;
})();

/** Ogg's page checksum (CRC-32, polynomial 0x04c11db7, not reflected, starts at 0). */
export function oggCrc(page: Buffer): number {
  let crc = 0;
  for (const byte of page) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ byte) & 0xff]!) >>> 0;
  return crc;
}

function page(packets: Buffer[], o: { serial: number; seq: number; granule: bigint; first: boolean; last: boolean }) {
  const lacing: number[] = [];
  for (const p of packets) {
    for (let n = p.length; ; n -= 255) {
      lacing.push(Math.min(n, 255));
      if (n < 255) break;
    }
  }
  const head = Buffer.alloc(27 + lacing.length);
  head.write("OggS", 0, "latin1");
  head[4] = 0; // version
  head[5] = (o.first ? 0x02 : 0) | (o.last ? 0x04 : 0);
  head.writeBigInt64LE(o.granule, 6);
  head.writeUInt32LE(o.serial, 14);
  head.writeUInt32LE(o.seq, 18);
  head[26] = lacing.length;
  lacing.forEach((v, i) => (head[27 + i] = v));
  const out = Buffer.concat([head, ...packets]);
  out.writeUInt32LE(oggCrc(out), 22);
  return out;
}

const FRAME_MS = 20;
const PRE_SKIP = 312; // libopus encoder delay at 48 kHz (6.5 ms), skipped by players
const PACKETS_PER_PAGE = 50; // one second of audio per page

/** Encodes PCM as an Ogg/Opus file (mono, 24 kbps — clear speech, ~3 KB per second). */
export function encodeOggOpus(pcm: Pcm, o: { bitrate?: number; serial?: number } = {}): Buffer {
  if (!OpusScript.VALID_SAMPLING_RATES.includes(pcm.rate as 24000)) throw new Error(`Opus can't use ${pcm.rate} Hz`);
  const rate = pcm.rate as 8000 | 12000 | 16000 | 24000 | 48000;
  const frameSamples = (rate * FRAME_MS) / 1000;
  const frameBytes = frameSamples * 2;
  const encoder = new OpusScript(rate, 1, OpusScript.Application.VOIP);
  const packets: Buffer[] = [];
  try {
    encoder.setBitrate(o.bitrate ?? 24_000);
    for (let at = 0; at < pcm.samples.length; at += frameBytes) {
      let frame = pcm.samples.subarray(at, at + frameBytes);
      if (frame.length < frameBytes) frame = Buffer.concat([frame, Buffer.alloc(frameBytes - frame.length)]);
      packets.push(encoder.encode(frame, frameSamples));
    }
  } finally {
    encoder.delete();
  }

  const serial = o.serial ?? 0x5348_4b4c; // any number; fixed so the same input gives the same file
  const opusHead = Buffer.alloc(19);
  opusHead.write("OpusHead", 0, "latin1");
  opusHead[8] = 1; // version
  opusHead[9] = 1; // channels
  opusHead.writeUInt16LE(PRE_SKIP, 10);
  opusHead.writeUInt32LE(rate, 12); // the original rate (players decode at 48 kHz)
  opusHead.writeInt16LE(0, 16); // gain
  opusHead[18] = 0; // channel mapping family 0 = mono/stereo
  const vendor = Buffer.from("shikshakalay", "latin1");
  const opusTags = Buffer.alloc(8 + 4 + vendor.length + 4);
  opusTags.write("OpusTags", 0, "latin1");
  opusTags.writeUInt32LE(vendor.length, 8);
  vendor.copy(opusTags, 12);
  opusTags.writeUInt32LE(0, 12 + vendor.length); // no comments

  const pages = [
    page([opusHead], { serial, seq: 0, granule: BigInt(0), first: true, last: false }),
    page([opusTags], { serial, seq: 1, granule: BigInt(0), first: false, last: false }),
  ];
  // Granule positions count 48 kHz samples, whatever the input rate.
  const per48k = BigInt((48_000 * FRAME_MS) / 1000);
  for (let i = 0, seq = 2; i < packets.length || i === 0; i += PACKETS_PER_PAGE, seq++) {
    const chunk = packets.slice(i, i + PACKETS_PER_PAGE);
    const done = BigInt(Math.min(i + PACKETS_PER_PAGE, packets.length));
    pages.push(
      page(chunk, {
        serial,
        seq,
        granule: BigInt(PRE_SKIP) + done * per48k,
        first: false,
        last: i + PACKETS_PER_PAGE >= packets.length,
      }),
    );
  }
  return Buffer.concat(pages);
}
