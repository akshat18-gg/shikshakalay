import { loadMedia } from "@/lib/media/store";
import { audioResponse } from "@/lib/media/serve";

/** Short-lived audio by token (no login: the unguessable token is the key; WhatsApp fetches these too). */
export async function GET(req: Request, ctx: RouteContext<"/api/media/[token]">) {
  const { token } = await ctx.params;
  const found = await loadMedia(token);
  if (!found) return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
  return audioResponse(found.data, found.mime, req.headers.get("range"));
}
