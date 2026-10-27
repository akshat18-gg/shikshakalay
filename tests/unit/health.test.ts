import { describe, expect, it } from "vitest";
import { dbReady } from "@/lib/db/health";

describe("dbReady", () => {
  it("is true when the query answers", async () => {
    expect(await dbReady(async () => [{ "?column?": 1 }])).toBe(true);
  });

  it("is false when the query fails", async () => {
    expect(await dbReady(async () => Promise.reject(new Error("connection refused")))).toBe(false);
  });

  it("is false when the query is slower than the limit", async () => {
    const slow = () => new Promise((resolve) => setTimeout(resolve, 200));
    expect(await dbReady(slow, 20)).toBe(false);
  });
});
