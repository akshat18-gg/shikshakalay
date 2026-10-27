import { describe, expect, it } from "vitest";
import { POST as checkin } from "@/app/api/checkins/route";
import { POST as login } from "@/app/api/auth/login/route";
import { type HistoryRow, checkinDue, formatIst } from "@/lib/history";
import { mockCard, mockStartLesson } from "@/lib/mocks/lesson";

const now = new Date("2026-10-28T10:00:00Z");
const row = (hoursAgo: number, over: Partial<HistoryRow> = {}): HistoryRow => ({
  sessionId: `s${hoursAgo}`,
  startedAt: new Date(now.getTime() - hoursAgo * 3600_000),
  endedAt: new Date(now.getTime() - hoursAgo * 3600_000),
  turnCount: 5,
  card: mockCard,
  hasCheckin: false,
  ...over,
});

describe("checkinDue", () => {
  it("asks about the latest finished lesson once it ended 12+ hours ago and wasn't answered", () => {
    expect(checkinDue([row(13)], now)?.sessionId).toBe("s13");
    expect(checkinDue([row(2)], now)).toBeNull();
    expect(checkinDue([row(13, { hasCheckin: true })], now)).toBeNull();
    expect(checkinDue([row(1, { card: null, endedAt: null }), row(20)], now)?.sessionId).toBe("s20");
    expect(checkinDue([], now)).toBeNull();
  });

  it("shows dates in IST", () => {
    expect(formatIst(new Date("2026-10-27T18:45:00Z"), "en")).toMatch(/28 Oct 2026.*12:15/);
  });
});

describe("POST /api/checkins (mock mode)", () => {
  async function cookie() {
    const res = await login(
      new Request("http://x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "teacher_demo", pin: "1234" }),
      }),
      undefined,
    );
    return (res.headers.get("set-cookie") ?? "").split(";")[0];
  }
  const post = (c: string, body: unknown) =>
    checkin(
      new Request("http://x", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: c },
        body: JSON.stringify(body),
      }),
      undefined,
    );

  it("saves for her own lesson, refuses someone else's and bad bodies", async () => {
    const c = await cookie();
    const mine = await mockStartLesson("mock-teacher", { scenarioId: "sub_2digit", lang: "en" }, "web");
    const theirs = await mockStartLesson("other", { scenarioId: "sub_2digit", lang: "en" }, "web");
    expect((await post(c, { sessionId: mine.sessionId, triedInClass: true })).status).toBe(200);
    expect((await post(c, { sessionId: theirs.sessionId, triedInClass: true })).status).toBe(403);
    expect((await post(c, { sessionId: mine.sessionId, triedInClass: "yes" })).status).toBe(400);
    expect((await post("", { sessionId: mine.sessionId, triedInClass: true })).status).toBe(401);
  });
});
