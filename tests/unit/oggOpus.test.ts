/**
 * The Ogg/Opus writer for WhatsApp voice notes: valid pages (checksums, flags, granule positions) and packets that
 * libopus decodes back to the same length of audio. (Chromium also decoded a real Bulbul clip; see PROGRESS 31 Oct.)
 */
import OpusScript from "opusscript";
import { describe, expect, it } from "vitest";
import { encodeOggOpus, oggCrc, readWav, silence } from "@/lib/voice/oggOpus";
import { makeWav } from "./wav";

type Page = { flags: number; granule: bigint; seq: number; packets: Buffer[] };

function readPages(ogg: Buffer): Page[] {
  const pages: Page[] = [];
  let pos = 0;
  while (pos < ogg.length) {
    expect(ogg.toString("latin1", pos, pos + 4)).toBe("OggS");
    const n = ogg[pos + 26]!;
    const lacing = [...ogg.subarray(pos + 27, pos + 27 + n)];
    const size = 27 + n + lacing.reduce((a, b) => a + b, 0);
    const raw = Buffer.from(ogg.subarray(pos, pos + size));
    const crc = raw.readUInt32LE(22);
    raw.writeUInt32LE(0, 22);
    expect(oggCrc(raw)).toBe(crc);
    const packets: Buffer[] = [];
    let at = pos + 27 + n;
    let cur: Buffer[] = [];
    for (const v of lacing) {
      cur.push(ogg.subarray(at, at + v));
      at += v;
      if (v < 255) {
        packets.push(Buffer.concat(cur));
        cur = [];
      }
    }
    pages.push({
      flags: ogg[pos + 5]!,
      granule: ogg.readBigInt64LE(pos + 6),
      seq: ogg.readUInt32LE(pos + 18),
      packets,
    });
    pos += size;
  }
  return pages;
}

describe("Ogg/Opus voice notes", () => {
  it("reads a mono 16-bit WAV and refuses anything else", () => {
    const pcm = readWav(makeWav(240, 24000));
    expect(pcm.rate).toBe(24000);
    expect(pcm.samples.length).toBe(480);
    const stereo = makeWav(10, 24000);
    stereo.writeUInt16LE(2, 22);
    expect(() => readWav(stereo)).toThrow(/mono/);
    expect(() => readWav(Buffer.from("not a wav file"))).toThrow(/not a WAV/);
  });

  it("writes OpusHead, OpusTags, then audio pages with good checksums and the right end position", () => {
    const pcm = readWav(makeWav(24000 * 3 + 100, 24000)); // a bit over 3 s → 151 frames of 20 ms
    const pages = readPages(encodeOggOpus(pcm));
    expect(pages[0]!.packets[0]!.toString("latin1", 0, 8)).toBe("OpusHead");
    expect(pages[0]!.flags & 0x02).toBe(2); // first page
    expect(pages[1]!.packets[0]!.toString("latin1", 0, 8)).toBe("OpusTags");
    const audio = pages.slice(2);
    expect(audio.map((p) => p.seq)).toEqual(audio.map((_, i) => i + 2));
    expect(audio.at(-1)!.flags & 0x04).toBe(4); // last page
    const frames = audio.reduce((n, p) => n + p.packets.length, 0);
    expect(frames).toBe(151);
    expect(audio.at(-1)!.granule).toBe(BigInt(312 + 151 * 960));

    const decoder = new OpusScript(24000, 1);
    const decoded = audio.flatMap((p) => p.packets).reduce((n, pkt) => n + decoder.decode(pkt).length / 2, 0);
    decoder.delete();
    expect(decoded).toBe(151 * 480);
  });

  it("makes silence of the asked length", () => {
    expect(silence(24000, 300).length).toBe(7200 * 2);
  });
});
