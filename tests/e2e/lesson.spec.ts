import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

async function login(page: Page, code: string) {
  await page.goto("/login");
  await page.getByLabel("Your ID").fill(code);
  await page.getByLabel("4-digit PIN").fill("1234");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((u) => u.pathname !== "/login");
  if (new URL(page.url()).pathname === "/consent") {
    await page.getByRole("button", { name: "I agree" }).click();
    await page.waitForURL((u) => u.pathname !== "/consent");
  }
}

async function noSeriousA11yIssues(page: Page) {
  const r = await new AxeBuilder({ page }).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
}

test("a teacher practises a lesson and gets a card", async ({ page }) => {
  await login(page, "teacher_demo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("teacher_demo");
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.waitForURL(/\/practice\//);
  await page.getByLabel("Or type what you say…").fill("What is 52 minus 27?");
  await page.getByRole("button", { name: "Send" }).click();
  const log = page.getByRole("log");
  await expect(log).toContainText("35");
  await expect(log).toContainText("26");
  await noSeriousA11yIssues(page);
  await page.getByRole("button", { name: "End lesson" }).click();
  await page.waitForURL(/\/card\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your coaching card");
});

test("the login and home pages have no serious accessibility problems", async ({ page }) => {
  await page.goto("/login");
  await noSeriousA11yIssues(page);
  await login(page, "teacher_demo");
  await noSeriousA11yIssues(page);
});

test("roles: trainer and admin pages load; a teacher can't open /trainer", async ({ page, browser }) => {
  await login(page, "teacher_demo");
  await page.goto("/trainer");
  await expect(page).toHaveURL(/\/$/);

  const trainer = await (await browser.newContext()).newPage();
  await login(trainer, "trainer_demo");
  await expect(trainer).toHaveURL(/\/trainer$/);
  await expect(trainer.getByRole("heading", { level: 1 })).toHaveText("Trainer dashboard");

  const admin = await (await browser.newContext()).newPage();
  await login(admin, "admin_demo");
  await expect(admin).toHaveURL(/\/admin$/);
  await admin.goto("/admin/evals");
  await expect(admin.getByRole("heading", { level: 1 })).toHaveText("Eval results");
});

test("a judge plays sample 1 on /try", async ({ page }) => {
  await login(page, "teacher_demo");
  await page.goto("/try");
  await page.getByRole("button", { name: /52 minus 27/ }).click();
  await expect(page.getByRole("log")).toContainText("35", { timeout: 20_000 });
});
