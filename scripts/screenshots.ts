/**
 * Screenshots of pages at phone (360×640) and laptop (1280×800) size, in English and Hindi.
 *
 *   npx tsx scripts/screenshots.ts --url http://localhost:3000 --out private/screens / /practice/abc
 *
 * Used to check screens by eye during the build and for docs/media at the end. Never runs in CI.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const SIZES = [
  { name: "phone", width: 360, height: 640 },
  { name: "laptop", width: 1280, height: 800 },
];

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const base = arg("url", "http://localhost:3000");
  const out = arg("out", "private/screens");
  const flags = new Set(["--url", "--out", base, out]);
  const paths = process.argv.slice(2).filter((a) => !flags.has(a));
  mkdirSync(out, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const lang of ["en", "hi"]) {
      for (const size of SIZES) {
        const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
        await context.addCookies([{ name: "sk_lang", value: lang, url: base }]);
        const page = await context.newPage();
        for (const path of paths.length ? paths : ["/"]) {
          await page.goto(base + path, { waitUntil: "networkidle" });
          const file = `${out}/${(path.replace(/\W+/g, "_") || "_").replace(/^_|_$/g, "") || "home"}-${lang}-${size.name}.png`;
          await page.screenshot({ path: file, fullPage: true });
          console.log(file);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
