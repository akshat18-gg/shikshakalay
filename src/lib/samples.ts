/**
 * The 5 one-tap samples for judges (AGENTS.md 13.2). Each starts a fresh lesson and sends its turns in order.
 * Sample 4 first moves to 43 − 18 and asks Ravi how he thinks, so "13 take away 8" is a step of the sum and the
 * full reveal → fix → fix arc shows (a fresh lesson starts on 52 − 27).
 * Sample 5 sends the recorded Hindi voice note when public/samples/sana-hi.m4a exists, else the same words as text.
 */
import type { Lang } from "@/lib/contracts";
import type { MessageKey } from "@/lib/i18n";

export const SANA_AUDIO_PATH = "/samples/sana-hi.m4a";
export const SANA_LINE = "सना, तुम क्या सोचती हो? आराम से बताओ।";

export type Sample = { id: number; label: MessageKey; lang: Lang | "screen"; turns: string[]; voice?: boolean };

export const SAMPLES: Sample[] = [
  { id: 1, label: "try.s1", lang: "screen", turns: ["What is 52 minus 27?"] },
  { id: 2, label: "try.s2", lang: "screen", turns: ["No, the answer is 25. Everyone say 25.", "Now 43 minus 18?"] },
  { id: 3, label: "try.s3", lang: "screen", turns: ["Ravi, tell me how you got 35."] },
  {
    id: 4,
    label: "try.s4",
    lang: "screen",
    turns: [
      "Now 43 minus 18?",
      "Ravi, how did you get 35?",
      "Ravi, show 43 with bundles and sticks. Can you take 8 sticks from 3?",
      "Ravi, 13 take away 8?",
    ],
  },
  { id: 5, label: "try.s5", lang: "hi", turns: [SANA_LINE], voice: true },
];
