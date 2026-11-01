/**
 * The class the engine-mechanics tests were written for: Ravi, Arjun and Meena each with their own mistake (lesson
 * file v3). Since v5 (operator's decision, 1 Nov) only Ravi carries a mistake in the real lesson, so tests that
 * exercise retries, parrots and any-sum rules across three mistakes re-arm Arjun and Meena here.
 */
import type { Scenario } from "@/lib/engine/scenario";

export function withThreeMistakes(s: Scenario): Scenario {
  return {
    ...s,
    children: s.children.map((c) =>
      c.id === "arjun"
        ? { ...c, bug: "borrowNoDecrement", start: { state: "STUCK" as const, engagement: 2 } }
        : c.id === "meena"
          ? { ...c, bug: "countBackOffByOne", start: { state: "STUCK" as const, engagement: 2 } }
          : c,
    ),
  };
}
