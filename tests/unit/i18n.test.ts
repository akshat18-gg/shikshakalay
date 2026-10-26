import { describe, expect, it } from "vitest";
import { POST as setLang } from "@/app/api/auth/lang/route";
import { type MessageKey, isLang, t } from "@/lib/i18n";

describe("t()", () => {
  it("picks the language and fills {vars}", () => {
    expect(t("home.greeting", "en", { code: "T07" })).toBe("Hello, T07");
    expect(t("home.greeting", "hi", { code: "T07" })).toBe("नमस्ते, T07");
  });

  it("leaves an unknown {var} as it is and falls back to the key when nothing matches", () => {
    expect(t("home.greeting", "en", { other: 1 })).toBe("Hello, {code}");
    expect(t("no.such.key" as MessageKey, "hi")).toBe("no.such.key");
  });

  it("knows the two languages", () => {
    expect(isLang("hi")).toBe(true);
    expect(isLang("fr")).toBe(false);
  });
});

describe("POST /api/auth/lang", () => {
  const post = (body: unknown) =>
    setLang(
      new Request("http://x/api/auth/lang", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      undefined,
    );

  it("saves the choice in an httpOnly cookie", async () => {
    const res = await post({ lang: "hi" });
    expect(await res.json()).toEqual({ lang: "hi" });
    expect(res.headers.get("set-cookie")).toMatch(/^sk_lang=hi; Path=\/; Max-Age=\d+; HttpOnly; SameSite=Lax/);
  });

  it("refuses other languages and extra keys", async () => {
    expect((await post({ lang: "fr" })).status).toBe(400);
    expect((await post({ lang: "en", admin: true })).status).toBe(400);
  });
});
