import { describe, expect, it } from "vitest";
import { mockDashboard } from "@/lib/mocks/dashboard";
import { type Dashboard, dashboardView, shown } from "@/lib/trainer";

describe("trainer privacy rule", () => {
  it("hides any number based on fewer than 5 teachers", () => {
    expect(shown(42, 4)).toBeNull();
    expect(shown(42, 5)).toBe(42);
  });

  it("applies it to every part of the dashboard", () => {
    const v = dashboardView(mockDashboard);
    expect(v.scores.find((s) => s.element === "critical_thinking")?.avg).toBeNull(); // 4 teachers
    expect(v.moves.find((m) => m.move === "move_on_or_scold")?.uses).toBeNull(); // 4 teachers
    expect(v.moves.find((m) => m.move === "tell_answer")).toMatchObject({ uses: 31, kind: "weak" });
    expect(v.returnRate).toBe(67); // 6 of 9 came back
  });

  it("hides everything when the whole group is under 5 teachers", () => {
    const tiny: Dashboard = { ...mockDashboard, teachers: 3, returned: 2 };
    const v = dashboardView(tiny);
    expect([v.weakShare, v.strongShare, v.returnRate]).toEqual([null, null, null]);
    expect(v.lessonBuckets.every((b) => b.teachers === null)).toBe(true);
  });

  it("works out weak and strong shares from all moves", () => {
    const v = dashboardView(mockDashboard);
    expect(v.weakShare! + v.strongShare!).toBeLessThanOrEqual(100);
    expect(v.weakShare).toBe(Math.round((50 / 163) * 100));
  });
});
