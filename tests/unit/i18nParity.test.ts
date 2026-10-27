/**
 * en.json and hi.json must stay in step: same keys, same {placeholders}, nothing empty, Hindi actually in Hindi.
 * Keys starting with "_" are notes for people (e.g. "_todo") and are ignored.
 */
import { describe, expect, it } from "vitest";
import en from "../../content/i18n/en.json";
import hi from "../../content/i18n/hi.json";

const real = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith("_")));
const EN = real(en);
const HI = real(hi as Record<string, string>);
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

// Same in both languages on purpose: language names, the product name in English, codes.
const SAME_OK = new Set(["lang.en", "lang.hi"]);

describe("i18n key parity", () => {
  it("has exactly the same keys", () => {
    expect(Object.keys(HI).sort()).toEqual(Object.keys(EN).sort());
  });

  it("uses the same {placeholders} in both languages", () => {
    for (const k of Object.keys(EN)) expect(vars(HI[k] ?? ""), k).toEqual(vars(EN[k]!));
  });

  it("has no empty text, and Hindi text is written in Devanagari", () => {
    for (const [k, v] of Object.entries(HI)) {
      expect(v.trim(), k).not.toBe("");
      if (!SAME_OK.has(k)) expect(/[ऀ-ॿ]/.test(v), `${k} should be Hindi: "${v}"`).toBe(true);
    }
  });
});
