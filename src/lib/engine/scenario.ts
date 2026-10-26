/**
 * Lesson files. For now the one skill is hard-coded; P1-T6 replaces this with the loader for
 * content/scenarios/*.yaml (which checks every sum and both languages before a lesson can start).
 */
import type { ScenarioSummary } from "@/lib/contracts";

const SCENARIOS: ScenarioSummary[] = [
  {
    id: "sub_2digit",
    title: { en: "2-digit subtraction with bundles and sticks", hi: "बंडल और तीलियों से दो अंकों का घटाव" },
    grade: 2,
    languages: ["en", "hi"],
  },
];

export function listScenarios(): ScenarioSummary[] {
  return SCENARIOS;
}

export function findScenario(id: string): ScenarioSummary | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
