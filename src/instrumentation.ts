/**
 * Runs once when the Next.js server starts. A missing required key stops the server here with one clear
 * message (listing names, never values) instead of failing later inside a lesson.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnv, features } = await import("@/lib/env");
  const { log, logError } = await import("@/lib/log");
  try {
    log("server_start", features(checkEnv()));
  } catch (err) {
    logError("env_check_failed", err);
    throw err;
  }
}
