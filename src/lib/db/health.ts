/**
 * Is the database answering? `select 1` with a hard 2-second limit, for /api/readyz and scripts/db-ping.ts.
 * The query is passed in so tests can fake a slow or broken database.
 */
export type Ping = () => Promise<unknown>;

export async function dbReady(ping: Ping, timeoutMs = 2000): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    return await Promise.race([ping().then(() => true as const), timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
