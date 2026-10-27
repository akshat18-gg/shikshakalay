/**
 * Logins: PIN hashing, the signed cookie, the lockout, page access rules and the auth routes (mock mode).
 */
import { describe, expect, it } from "vitest";
import { POST as consent } from "@/app/api/auth/consent/route";
import { POST as setLang } from "@/app/api/auth/lang/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { getClaims } from "@/lib/auth";
import { redirectFor, safeNext } from "@/lib/auth/access";
import { createLockout } from "@/lib/auth/lockout";
import { hashPin, verifyPin } from "@/lib/auth/pin";
import { type SessionClaims, readCookie, sessionCookie, signSession, verifySession } from "@/lib/auth/session";

const teacher: SessionClaims = { id: "u1", code: "T07", role: "teacher", lang: "hi", consent: true };

function post(body: unknown, cookie = "") {
  return new Request("http://x/api", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

const cookiesOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]);
const sessionOf = (res: Response) => cookiesOf(res).find((c) => c.startsWith("sk_session=")) ?? "";

describe("PIN hashing", () => {
  it("stores scrypt$salt$hash, verifies the right PIN only, and salts every hash", async () => {
    const h = await hashPin("4821");
    expect(h).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(await verifyPin("4821", h)).toBe(true);
    expect(await verifyPin("4822", h)).toBe(false);
    expect(await hashPin("4821")).not.toBe(h);
    expect(await verifyPin("4821", "plain-text")).toBe(false);
  });
});

describe("session cookie", () => {
  it("round-trips the claims", async () => {
    expect(await verifySession(await signSession(teacher))).toEqual(teacher);
  });

  it("rejects a tampered, foreign or missing token", async () => {
    const token = await signSession(teacher);
    const [h, , s] = token.split(".");
    const forged = `${h}.${Buffer.from(JSON.stringify({ sub: "u1", code: "T07", role: "admin", lang: "en", consent: true })).toString("base64url")}.${s}`;
    expect(await verifySession(forged)).toBeNull();
    expect(await verifySession("not-a-token")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });

  it("is httpOnly, SameSite=Lax, 7 days", () => {
    expect(sessionCookie("abc")).toBe("sk_session=abc; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax");
    expect(readCookie("a=1; sk_session=x.y=z; b=2", "sk_session")).toBe("x.y=z");
  });
});

describe("lockout", () => {
  it("locks an ID for 15 minutes after 5 wrong PINs, then lets it try again", () => {
    let now = 0;
    const lock = createLockout(() => now);
    for (let i = 0; i < 4; i++) lock.fail("t07");
    expect(lock.lockedFor("t07")).toBe(0);
    lock.fail("t07");
    expect(lock.lockedFor("t07")).toBe(15 * 60 * 1000);
    expect(lock.lockedFor("t08")).toBe(0);
    now += 15 * 60 * 1000;
    expect(lock.lockedFor("t07")).toBe(0);
    lock.fail("t07");
    expect(lock.lockedFor("t07")).toBe(0); // a fresh count after the lock ran out
  });
});

describe("page access", () => {
  it("sends strangers to /login with the page they wanted", () => {
    expect(redirectFor("/practice/abc?x=1", null)).toBe("/login?next=%2Fpractice%2Fabc%3Fx%3D1");
    expect(redirectFor("/login", null)).toBeNull();
  });

  it("sends people who haven't agreed yet to /consent", () => {
    expect(redirectFor("/", { ...teacher, consent: false })).toBe("/consent?next=%2F");
    expect(redirectFor("/consent", { ...teacher, consent: false })).toBeNull();
  });

  it("keeps teachers out of /trainer and /admin, and trainers out of /admin", () => {
    expect(redirectFor("/trainer", teacher)).toBe("/");
    expect(redirectFor("/admin/trace", teacher)).toBe("/");
    expect(redirectFor("/admin", { ...teacher, role: "trainer" })).toBe("/trainer");
    expect(redirectFor("/trainer", { ...teacher, role: "admin" })).toBeNull();
    expect(redirectFor("/trainers-guide", teacher)).toBeNull(); // only the real /trainer section
  });

  it("only follows same-site next links", () => {
    expect(safeNext("/practice/1")).toBe("/practice/1");
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "", null]) expect(safeNext(bad)).toBe("/");
  });
});

describe("auth routes (mock mode)", () => {
  it("logs in with a case-insensitive ID and sets the cookie; consent is asked first", async () => {
    const res = await login(post({ code: " Teacher_Demo ", pin: "1234" }), undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      user: { id: "mock-teacher", code: "teacher_demo", role: "teacher", lang: "en" },
    });
    const claims = await getClaims(new Request("http://x", { headers: { cookie: sessionOf(res) } }));
    expect(claims?.consent).toBe(false);
  });

  it("refuses a wrong PIN and an unknown ID the same way, then locks after 5 tries", async () => {
    const wrong = await login(post({ code: "trainer_demo", pin: "0000" }), undefined);
    const unknown = await login(post({ code: "nobody", pin: "1234" }), undefined);
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    for (let i = 0; i < 4; i++) await login(post({ code: "trainer_demo", pin: "0000" }), undefined);
    const locked = await login(post({ code: "trainer_demo", pin: "1234" }), undefined);
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("rejects malformed bodies", async () => {
    expect((await login(post({ code: "teacher_demo", pin: "12" }), undefined)).status).toBe(400);
    expect((await login(post({ code: "teacher_demo", pin: "1234", role: "admin" }), undefined)).status).toBe(400);
  });

  it("consent re-signs the cookie, and logging in again remembers it", async () => {
    const first = sessionOf(await login(post({ code: "admin_demo", pin: "1234" }), undefined));
    const agreed = await consent(post({}, first), undefined);
    expect(agreed.status).toBe(200);
    const after = await getClaims(new Request("http://x", { headers: { cookie: sessionOf(agreed) } }));
    expect(after?.consent).toBe(true);
    const again = sessionOf(await login(post({ code: "admin_demo", pin: "1234" }), undefined));
    expect((await getClaims(new Request("http://x", { headers: { cookie: again } })))?.consent).toBe(true);
    expect((await consent(post({}), undefined)).status).toBe(401);
  });

  it("the language switch also re-signs a logged-in cookie", async () => {
    const cookie = sessionOf(await login(post({ code: "teacher_demo", pin: "1234" }), undefined));
    const res = await setLang(post({ lang: "hi" }, cookie), undefined);
    expect(cookiesOf(res)[0]).toBe("sk_lang=hi");
    const claims = await getClaims(new Request("http://x", { headers: { cookie: sessionOf(res) } }));
    expect(claims?.lang).toBe("hi");
  });

  it("logout clears the cookie", async () => {
    const res = await logout(post({}), undefined);
    expect(res.headers.get("set-cookie")).toMatch(/^sk_session=; Path=\/; Max-Age=0; HttpOnly/);
  });
});
