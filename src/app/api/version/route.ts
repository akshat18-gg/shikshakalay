/** Which build is live: the first 7 characters of the commit Render deployed ("dev" locally). */
export function GET() {
  const commit = (process.env.RENDER_GIT_COMMIT ?? "dev").slice(0, 7);
  return Response.json({ commit }, { headers: { "cache-control": "no-store" } });
}
