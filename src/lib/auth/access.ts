/**
 * Which pages need which role (used by src/proxy.ts). Pure, so it is unit-tested.
 * Not logged in → /login?next=…; no consent yet → /consent; wrong role → that role's home page.
 */
import type { Role } from "@/lib/contracts";
import type { SessionClaims } from "./session";

const PUBLIC = ["/login", "/privacy", "/terms"];

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : role === "trainer" ? "/trainer" : "/";
}

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

/** Only same-site paths: "/x" yes; "//evil.com", "/\\evil.com", "https://…" no. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

/** null = let the request through; a string = redirect there. */
export function redirectFor(pathWithQuery: string, claims: SessionClaims | null): string | null {
  const path = pathWithQuery.split("?")[0];
  if (PUBLIC.some((p) => under(path, p))) return null;
  if (!claims) return `/login?next=${encodeURIComponent(pathWithQuery)}`;
  if (!claims.consent) return path === "/consent" ? null : `/consent?next=${encodeURIComponent(pathWithQuery)}`;
  const allowed: Role[] | null = under(path, "/admin")
    ? ["admin"]
    : under(path, "/trainer")
      ? ["trainer", "admin"]
      : null;
  if (allowed && !allowed.includes(claims.role)) return homeFor(claims.role);
  return null;
}
