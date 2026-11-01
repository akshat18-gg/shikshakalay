/**
 * The module catalogue shown on /modules: Classes 1–5 × Maths, Hindi, English, EVS (EVS from Class 3, as in the
 * NCERT syllabus). The live modules are the arithmetic ones, each backed by a lesson file in `content/scenarios/`
 * whose children's answers come from rules in code. Every other entry is honestly marked "coming soon": each needs
 * its own misconception rules (code), two-language lines and eval lessons before it can go live (README → Roadmap).
 * Names come from the i18n files.
 */
import type { MessageKey } from "@/lib/i18n";

export type Grade = 1 | 2 | 3 | 4 | 5;
export type Subject = "maths" | "hindi" | "english" | "evs";
export type Module = {
  id: string;
  grade: Grade;
  subject: Subject;
  name: MessageKey;
  status: "live" | "soon";
  /** The lesson file that plays this module (live modules only). */
  scenarioId?: string;
};

export const GRADES: Grade[] = [1, 2, 3, 4, 5];
export const SUBJECTS: Subject[] = ["maths", "hindi", "english", "evs"];

const soon = (id: string, grade: Grade, subject: Subject): Module => ({
  id,
  grade,
  subject,
  name: `modules.${id}` as MessageKey,
  status: "soon",
});

const live = (id: string, grade: Grade, subject: Subject, scenarioId: string): Module => ({
  id,
  grade,
  subject,
  name: `modules.${id}` as MessageKey,
  status: "live",
  scenarioId,
});

export const MODULES: Module[] = [
  // Class 1
  soon("c1-math-count", 1, "maths"),
  soon("c1-math-shapes", 1, "maths"),
  live("c1-math-addsub9", 1, "maths", "add_to_9"),
  soon("c1-hi-varn", 1, "hindi"),
  soon("c1-hi-words", 1, "hindi"),
  soon("c1-en-blend", 1, "english"),
  soon("c1-en-sight", 1, "english"),
  // Class 2
  soon("c2-math-place", 2, "maths"),
  live("c2-math-carry", 2, "maths", "add_2digit_carry"),
  live("c2-math-borrow", 2, "maths", "sub_2digit"),
  soon("c2-math-time", 2, "maths"),
  soon("c2-hi-matra", 2, "hindi"),
  soon("c2-hi-sent", 2, "hindi"),
  soon("c2-en-families", 2, "english"),
  soon("c2-en-sent", 2, "english"),
  // Class 3
  live("c3-math-mult", 3, "maths", "mul_groups"),
  live("c3-math-div", 3, "maths", "div_sharing"),
  soon("c3-math-frac", 3, "maths"),
  soon("c3-math-money", 3, "maths"),
  soon("c3-hi-fluency", 3, "hindi"),
  soon("c3-hi-wh", 3, "hindi"),
  soon("c3-en-fluency", 3, "english"),
  soon("c3-en-story", 3, "english"),
  soon("c3-evs-plants", 3, "evs"),
  soon("c3-evs-water", 3, "evs"),
  // Class 4
  live("c4-math-tables", 4, "maths", "mul_2x1_carry"),
  soon("c4-math-rem", 4, "maths"),
  soon("c4-math-fraccmp", 4, "maths"),
  soon("c4-math-perim", 4, "maths"),
  soon("c4-hi-para", 4, "hindi"),
  soon("c4-hi-write", 4, "hindi"),
  soon("c4-en-grammar", 4, "english"),
  soon("c4-en-para", 4, "english"),
  soon("c4-evs-body", 4, "evs"),
  soon("c4-evs-maps", 4, "evs"),
  // Class 5
  soon("c5-math-decimal", 5, "maths"),
  soon("c5-math-fracops", 5, "maths"),
  soon("c5-math-large", 5, "maths"),
  soon("c5-math-angles", 5, "maths"),
  soon("c5-hi-summary", 5, "hindi"),
  soon("c5-hi-letter", 5, "hindi"),
  soon("c5-en-tenses", 5, "english"),
  soon("c5-en-infer", 5, "english"),
  soon("c5-evs-pollution", 5, "evs"),
  soon("c5-evs-food", 5, "evs"),
];

export const liveModules = () => MODULES.filter((m) => m.status === "live");
