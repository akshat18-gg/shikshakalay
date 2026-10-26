/** Liveness for Render and UptimeRobot: the server answers. No database call (that is /api/readyz). */
export function GET() {
  return new Response("ok", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
