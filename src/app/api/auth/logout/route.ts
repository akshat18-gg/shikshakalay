import { clearSessionCookie } from "@/lib/auth/session";
import { json, withRoute } from "@/lib/http";

export const POST = withRoute("auth.logout", async () =>
  json({ ok: true }, 200, { "set-cookie": clearSessionCookie() }),
);
