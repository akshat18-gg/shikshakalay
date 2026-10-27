/**
 * Who sounds like whom. Sarvam Bulbul for now (Azure, AGENTS.md 8, can replace it when a key arrives).
 * Picked from private/voice-samples/ on 27 Oct by measured pitch: the girls are high "kids" voices, the boys are the
 * most child-like male voices Bulbul has (none is a real boy's pitch). Each voice works for hi-IN and en-IN.
 * Bulbul v3 / v4-flash have no pitch control; pace (0.5–2.0) adds character.
 */
import type { ChildId } from "@/lib/contracts";

export type SarvamVoice = { speaker: string; model: "bulbul:v4-flash" | "bulbul:v3"; pace: number };

export const SARVAM_VOICES: { children: Record<ChildId, SarvamVoice>; coach: SarvamVoice } = {
  children: {
    ravi: { speaker: "shubh_hi_stories_dramatic", model: "bulbul:v4-flash", pace: 1.1 }, // quick, loud (178–230 Hz)
    arjun: { speaker: "kunal_hi_kids", model: "bulbul:v4-flash", pace: 1.05 }, // the copycat (135–159 Hz)
    meena: { speaker: "chhavi_hi_kids", model: "bulbul:v4-flash", pace: 0.95 }, // careful, slow (300–320 Hz)
    sana: { speaker: "ritu_hi_kids", model: "bulbul:v4-flash", pace: 0.9 }, // very shy (340–380 Hz)
  },
  coach: { speaker: "ishita_hi_edtech", model: "bulbul:v4-flash", pace: 1 }, // adult (225 Hz)
};
