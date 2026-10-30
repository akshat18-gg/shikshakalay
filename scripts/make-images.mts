/**
 * Makes the app icons and the Open Graph image from tiny HTML designs (Playwright screenshots), so no image tools
 * are needed. Run once: npx tsx scripts/make-images.mts — the PNGs are committed.
 */
import { chromium } from "@playwright/test";

const icon = (
  size: number,
  pad: number,
) => `<html><body style="margin:0"><div style="width:${size}px;height:${size}px;background:#0b2850;display:grid;place-items:center">
<div style="width:${size - 2 * pad}px;height:${size - 2 * pad}px;display:grid;place-items:center;color:#8fd3cd;font:700 ${Math.round((size - 2 * pad) * 0.62)}px/1 'Noto Sans Devanagari','Kohinoor Devanagari',sans-serif">श</div></div></body></html>`;

const og = `<html><body style="margin:0"><div style="width:1200px;height:630px;background:#0b2850;color:#fff;font-family:'Noto Sans','Helvetica Neue',sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box">
<div style="font-size:84px;font-weight:700">Shikshakalay <span style="color:#8fd3cd">शिक्षकालय</span></div>
<div style="font-size:40px;margin-top:28px;max-width:960px;line-height:1.3">Teachers practise a maths lesson on AI children who make real mistakes — by voice, in Hindi or English — and get kind, specific coaching.</div>
<div style="font-size:28px;margin-top:40px;color:#8fd3cd">Team Blue Screen · AI for Foundational Learning</div></div></body></html>`;

const b = await chromium.launch();
const p = await b.newPage();
for (const [file, html, w, h] of [
  ["public/icons/icon-192.png", icon(192, 0), 192, 192],
  ["public/icons/icon-512.png", icon(512, 0), 512, 512],
  ["public/icons/icon-maskable-512.png", icon(512, 80), 512, 512],
  ["public/icons/apple-touch-icon.png", icon(180, 0), 180, 180],
  ["public/og.png", og, 1200, 630],
] as const) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(html);
  await p.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } });
  console.log("✓", file);
}
await b.close();
