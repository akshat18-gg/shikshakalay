/**
 * Page guard (Next.js 16 "proxy", formerly middleware). Pages only — API routes check login themselves.
 * The rules live in src/lib/auth/access.ts (unit-tested).
 */
import { type NextRequest, NextResponse } from "next/server";
import { redirectFor } from "@/lib/auth/access";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const claims = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = request.nextUrl;
  const target = redirectFor(pathname + search, claims);
  return target ? NextResponse.redirect(new URL(target, request.url)) : NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|audio|samples|login|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|svg|ico|jpg|webp|mp3|ogg|txt|xml)$).*)",
  ],
};
