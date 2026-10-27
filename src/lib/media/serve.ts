/**
 * Sends audio bytes, honouring a single HTTP Range request — iPhone Safari won't play audio from a server that
 * can't answer "Range: bytes=0-1" with 206.
 */
export function audioResponse(
  data: Buffer,
  mime: string,
  range: string | null,
  cache = "private, max-age=3600",
): Response {
  const total = data.length;
  const base = { "content-type": mime, "accept-ranges": "bytes", "cache-control": cache };
  const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (!m || (m[1] === "" && m[2] === "")) {
    return new Response(new Uint8Array(data), { headers: { ...base, "content-length": String(total) } });
  }
  let start = m[1] === "" ? total - Number(m[2]) : Number(m[1]);
  let end = m[1] === "" || m[2] === "" ? total - 1 : Number(m[2]);
  start = Math.max(0, start);
  end = Math.min(end, total - 1);
  if (start > end || start >= total) {
    return new Response(null, { status: 416, headers: { ...base, "content-range": `bytes */${total}` } });
  }
  return new Response(new Uint8Array(data.subarray(start, end + 1)), {
    status: 206,
    headers: { ...base, "content-length": String(end - start + 1), "content-range": `bytes ${start}-${end}/${total}` },
  });
}
