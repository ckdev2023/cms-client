#!/usr/bin/env node
/**
 * 把 output/manual.html 用 Playwright 打印为 output/manual.pdf。
 *
 * 通过 `file://` 加载，等待 mermaid 渲染完成（监听 window.__mermaidReady），
 * 然后生成 A4 纵向 PDF，保留 background。
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "output");
const HTML_FILE = path.join(OUT_DIR, "manual.html");
const PDF_FILE = path.join(OUT_DIR, "manual.pdf");

async function main() {
  await fs.access(HTML_FILE);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", (err) => console.warn("[print-pdf] pageerror:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.warn("[print-pdf] browser error:", msg.text());
  });

  const url = `file://${HTML_FILE}`;
  console.log(`[print-pdf] loading ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

  console.log(`[print-pdf] waiting for mermaid to finish rendering...`);
  await page.waitForFunction(() => window.__mermaidReady === true, null, { timeout: 30000 })
    .catch(() => console.warn("[print-pdf] mermaid did not signal ready; continuing anyway"));
  await page.waitForTimeout(800);

  console.log(`[print-pdf] rendering to ${path.relative(ROOT, PDF_FILE)}`);
  await page.pdf({
    path: PDF_FILE,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: "16mm", right: "16mm", bottom: "20mm", left: "16mm" },
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:8pt;color:#9ca3af;width:100%;text-align:center;">Gyosei OS · Admin 运营使用手册</div>',
    footerTemplate:
      '<div style="font-size:8pt;color:#9ca3af;width:100%;display:flex;justify-content:space-between;padding:0 16mm;">' +
      '<span>P0 首版 · 自动生成</span>' +
      '<span>第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页</span>' +
      "</div>",
  });

  await browser.close();
  const stat = await fs.stat(PDF_FILE);
  console.log(`[print-pdf] done — ${path.relative(ROOT, PDF_FILE)} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
