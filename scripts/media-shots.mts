/**
 * Screenshots for the README, video and deck (docs/media/), taken on a running site with the demo logins:
 * a short English lesson (weak move resisted, then a reveal), its card, a Hindi lesson, /try, the trainer
 * dashboard, and the admin AI trace + evals — at phone (360×640) and laptop (1280×800) size.
 * Real mode costs ≈ $0.04 of Claude (two short lessons + one card). Never runs in CI.
 *
 *   npx tsx --env-file-if-exists=.env.local scripts/media-shots.mts --url https://shikshakalay.onrender.com
 */
import { mkdirSync } from "node:fs";
import { type Browser, type Page, chromium } from "@playwright/test";

const i = process.argv.indexOf("--url");
const BASE = i > 0 ? process.argv[i + 1]! : "http://localhost:3000";
const OUT = "docs/media";
const PHONE = { width: 360, height: 640 };
const LAPTOP = { width: 1280, height: 800 };

async function loggedIn(browser: Browser, code: string, viewport: typeof PHONE, lang: "en" | "hi" = "en") {
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/login`);
  await page.locator("#code, [name=code]").first().fill(code);
  await page
    .locator("input[type=password], [name=pin]")
    .first()
    .fill(process.env.DEMO_PIN ?? "1234");
  await page.locator("form button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
  if (page.url().includes("/consent")) {
    await page.locator("main button").first().click();
    await page.waitForURL((u) => !u.pathname.startsWith("/consent"));
  }
  // After login the account's saved language wins; the toggle saves the one we want (and re-signs the cookie).
  const toggle = page.getByRole("button", { name: lang === "hi" ? "हिन्दी" : "English" });
  if ((await toggle.getAttribute("aria-pressed")) !== "true") {
    await toggle.click();
    await page.waitForLoadState("networkidle");
    await page.reload();
  }
  return page;
}

async function say(page: Page, text: string) {
  const done = "[role=log] li:not([aria-busy])";
  const before = await page.locator(done).count();
  await page.locator("#turn-text").fill(text);
  await page.locator("#turn-text ~ button[type=submit]").click();
  // Her line plus at least one child's line, and no "Children are thinking…" left.
  await page.waitForFunction(
    ([sel, n]) => document.querySelectorAll(sel).length > n + 1 && !document.querySelector("[role=log] [aria-busy]"),
    [done, before] as const,
    { timeout: 45_000 },
  );
  await page.waitForTimeout(800);
}

async function shot(page: Page, name: string, fullPage = false) {
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log(`✓ ${name}`);
}

async function lesson(browser: Browser, viewport: typeof PHONE, lang: "en" | "hi", turns: string[]) {
  const page = await loggedIn(browser, "teacher_demo", viewport, lang);
  await page
    .locator("main form button, main button")
    .filter({ hasText: /Start practice|अभ्यास शुरू करें/ })
    .click();
  await page.waitForURL(/\/practice\//, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  for (const t of turns) await say(page, t);
  return page;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const login = await browser.newPage({ viewport: PHONE });
    await login.goto(`${BASE}/login`);
    await shot(login, "login-phone");

    const en = await lesson(browser, PHONE, "en", [
      "What is 52 minus 27?",
      "No, the answer is 25. Everyone say 25.",
      "Now 43 minus 18?",
      "Ravi, tell me how you got 35.",
    ]);
    const sessionId = en.url().split("/practice/")[1]!.split(/[?#]/)[0]!;
    await shot(en, "practice-en-phone");
    await shot(en, "practice-en-phone-full", true);
    await en.setViewportSize(LAPTOP);
    await shot(en, "practice-en-laptop");
    await en.setViewportSize(PHONE);
    await en.getByRole("button", { name: "End lesson" }).click();
    await en.waitForURL(/\/card\//, { timeout: 90_000 });
    await en.waitForTimeout(1000);
    await shot(en, "card-en-phone-full", true);
    await en.setViewportSize(LAPTOP);
    await shot(en, "card-en-laptop", true);

    const hi = await lesson(browser, PHONE, "hi", ["बावन में से सत्ताईस कितना होगा?", "रवि, तुमने 35 कैसे निकाला?"]);
    await shot(hi, "practice-hi-phone");

    const tryPage = await loggedIn(browser, "teacher_demo", PHONE);
    await tryPage.goto(`${BASE}/try`);
    await shot(tryPage, "try-phone");

    const trainer = await loggedIn(browser, "trainer_demo", LAPTOP);
    await trainer.goto(`${BASE}/trainer`);
    await shot(trainer, "trainer-laptop", true);
    await trainer.setViewportSize(PHONE);
    await shot(trainer, "trainer-phone");

    const admin = await loggedIn(browser, "admin_demo", LAPTOP);
    await admin.goto(`${BASE}/admin/trace/${sessionId}`);
    await shot(admin, "trace-laptop");
    await shot(admin, "trace-laptop-full", true);
    await admin.goto(`${BASE}/admin/evals`);
    await shot(admin, "evals-laptop", true);
  } finally {
    await browser.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
