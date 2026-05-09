#!/usr/bin/env node
/**
 * 运营手册截图脚本。
 *
 * 流程：
 *   1. 启动 Chromium，访问 admin 登录页（http://127.0.0.1:5173/#/login）
 *   2. 用 admin@local.test / Admin123! 登录
 *   3. 遍历 pages.mjs 中的所有页面，截图存到 screenshots/
 *
 * 用法：
 *   ADMIN_BASE_URL=http://127.0.0.1:5173 node scripts/capture.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES } from "./pages.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "screenshots");

const BASE_URL = process.env.ADMIN_BASE_URL ?? "http://127.0.0.1:5173";
const ADMIN_EMAIL = process.env.ADMIN_INIT_EMAIL ?? "admin@local.test";
const ADMIN_PASSWORD = process.env.ADMIN_INIT_PASSWORD ?? "Admin123!";

const VIEWPORT = { width: 1440, height: 900 };
const FULL_PAGE_DELAY_MS = 800;

async function ensureOutDir() {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function login(page) {
  await page.goto(`${BASE_URL}/#/login`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector("#login-email", { timeout: 20000, state: "visible" });
  await page.fill("#login-email", ADMIN_EMAIL);
  await page.fill("#login-password", ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !String(url).includes("/login"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);
}

async function captureLoginPage(page) {
  await page.goto(`${BASE_URL}/#/login`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector("#login-email", { timeout: 20000, state: "visible" });
  await page.waitForTimeout(FULL_PAGE_DELAY_MS);
}

async function capturePage(page, target) {
  const url = `${BASE_URL}/#${target.hash}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (target.waitFor) {
    await page
      .waitForSelector(target.waitFor, { timeout: 12000, state: "visible" })
      .catch(() => {});
  }
  await page.waitForTimeout(FULL_PAGE_DELAY_MS);
  if (typeof target.actions === "function") {
    await target.actions(page);
    await page.waitForTimeout(400);
  }
}

async function takeScreenshot(page, target) {
  const file = path.join(OUT_DIR, `${target.id}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.relative(ROOT, file);
}

async function main() {
  await ensureOutDir();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: "zh-CN",
  });
  const page = await context.newPage();

  const captured = [];
  let loggedIn = false;

  for (const target of PAGES) {
    try {
      if (target.requiresAuth === false) {
        await captureLoginPage(page);
      } else {
        if (!loggedIn) {
          console.log("[capture] logging in as", ADMIN_EMAIL);
          await login(page);
          loggedIn = true;
        }
        await capturePage(page, target);
      }
      const file = await takeScreenshot(page, target);
      captured.push({ ...target, file });
      console.log(`[capture] ${target.id} -> ${file}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[capture] FAILED ${target.id}: ${message}`);
      captured.push({ ...target, file: null, error: message });
    }
  }

  await fs.writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(captured, null, 2),
    "utf8",
  );

  await browser.close();
  console.log(`[capture] done — ${captured.filter((c) => c.file).length}/${captured.length} succeeded`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
