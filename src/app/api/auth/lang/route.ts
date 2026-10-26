import { z } from "zod";
import { Lang } from "@/lib/contracts";
import { json, parseOr400, readJson, withRoute } from "@/lib/http";
import { langCookie } from "@/lib/langCookie";

const Body = z.object({ lang: Lang }).strict();

/** The language toggle. Works before login too (the login page has the same choice). */
export const POST = withRoute("auth.lang", async (req) => {
  const { lang } = parseOr400(Body, await readJson(req), "language");
  return json({ lang }, 200, { "set-cookie": langCookie(lang) });
});
