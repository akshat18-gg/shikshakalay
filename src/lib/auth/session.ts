/**
 * The login cookie `sk_session`: a jose HS256 token signed with SESSION_SECRET, valid 7 days.
 * Claims = the SessionUser + whether the person has agreed to the consent text (so the proxy can send them to
 * /consent without a database call).
 */
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { Lang, Role, type SessionUser } from "@/lib/contracts";

export const SESSION_COOKIE = "sk_session";
const MAX_AGE_S = 7 * 24 * 60 * 60;

export type SessionClaims = SessionUser & { consent: boolean };

const Payload = z.object({ sub: z.string(), code: z.string(), role: Role, lang: Lang, consent: z.boolean() });

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(secret);
}

export async function signSession(c: SessionClaims): Promise<string> {
  return new SignJWT({ code: c.code, role: c.role, lang: c.lang, consent: c.consent })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(c.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(key());
}

/** The claims, or null for a missing, tampered, expired or malformed token. */
export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const p = Payload.parse(payload);
    return { id: p.sub, code: p.code, role: p.role, lang: p.lang, consent: p.consent };
  } catch {
    return null;
  }
}

function attrs(maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; ${attrs(MAX_AGE_S)}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${attrs(0)}`;
}

/** Reads one cookie from a Cookie header ("a=1; sk_session=…"). */
export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}
