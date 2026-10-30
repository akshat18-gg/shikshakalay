/**
 * The trainer dashboard's numbers. Any number based on fewer than 5 teachers is hidden (null), so a trainer can
 * never spot one teacher. Mock mode uses believable numbers from mocks/dashboard.ts.
 */
import type { Move, TeachElement } from "@/lib/contracts";

export const MIN_TEACHERS = 5;

/** The value, or null when fewer than 5 teachers stand behind it. */
export function shown<T>(value: T, teachers: number): T | null {
  return teachers >= MIN_TEACHERS ? value : null;
}

export const WEAK_MOVES: Move[] = ["tell_answer", "repeat_same_way", "move_on_or_scold"];
export const STRONG_MOVES: Move[] = [
  "ask_to_explain",
  "compare_methods",
  "concrete_materials",
  "targeted_question",
  "think_aloud",
  "invite_quiet_child",
  "specific_praise",
];

export type MoveRow = { move: Move; uses: number; teachers: number };
export type ScoreRow = { element: TeachElement; avg: number; teachers: number };
export type Dashboard = {
  teachers: number;
  lessons: number;
  moves: MoveRow[];
  scores: ScoreRow[];
  /** How many teachers did 1, 2, 3, 4+ lessons. */
  lessonBuckets: { lessons: string; teachers: number }[];
  returned: number;
};

export type DashboardView = {
  teachers: number;
  lessons: number;
  weakShare: number | null;
  strongShare: number | null;
  moves: { move: Move; uses: number | null; kind: "weak" | "strong" | "other" }[];
  scores: { element: TeachElement; avg: number | null }[];
  lessonBuckets: { lessons: string; teachers: number | null }[];
  returnRate: number | null;
};

/** Applies the privacy rule and works out shares. */
export function dashboardView(d: Dashboard): DashboardView {
  const total = d.moves.reduce((n, m) => n + m.uses, 0);
  const sum = (moves: Move[]) => d.moves.filter((m) => moves.includes(m.move)).reduce((n, m) => n + m.uses, 0);
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return {
    teachers: d.teachers,
    lessons: d.lessons,
    weakShare: shown(share(sum(WEAK_MOVES)), d.teachers),
    strongShare: shown(share(sum(STRONG_MOVES)), d.teachers),
    moves: [...d.moves]
      .sort((a, b) => b.uses - a.uses)
      .map((m) => ({
        move: m.move,
        uses: shown(m.uses, m.teachers),
        kind: WEAK_MOVES.includes(m.move) ? "weak" : STRONG_MOVES.includes(m.move) ? "strong" : "other",
      })),
    scores: d.scores.map((s) => ({ element: s.element, avg: shown(Math.round(s.avg * 10) / 10, s.teachers) })),
    lessonBuckets: d.lessonBuckets.map((b) => ({ lessons: b.lessons, teachers: shown(b.teachers, d.teachers) })),
    returnRate: shown(d.teachers ? Math.round((d.returned / d.teachers) * 100) : 0, d.teachers),
  };
}
