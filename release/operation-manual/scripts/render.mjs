#!/usr/bin/env node
/**
 * 渲染 content.mjs + screenshots/ → 单文件 HTML（output/manual.html）。
 *
 * 输出特性：
 *   - 自包含：所有截图以 base64 data URI 内嵌
 *   - mermaid 流程图通过 CDN 加载并在浏览器渲染
 *   - 列表 / 表格 / 代码用 markdown-it 渲染
 *   - 章节按 chapters 顺序拼接，每章 page-break-before
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import { COVER, CHAPTERS } from "./content.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "output");
const SCREENSHOT_DIR = path.join(ROOT, "screenshots");

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function readScreenshotAsDataUri(id) {
  const file = path.join(SCREENSHOT_DIR, `${id}.png`);
  const buf = await fs.readFile(file);
  const b64 = buf.toString("base64");
  return `data:image/png;base64,${b64}`;
}

async function renderScreenshotBlock(screenshotId, caption) {
  if (!screenshotId) return "";
  const dataUri = await readScreenshotAsDataUri(screenshotId);
  return `
    <figure class="screenshot">
      <img src="${dataUri}" alt="${escapeHtml(caption ?? screenshotId)}" />
      ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
    </figure>
  `;
}

function renderMermaidBlock(source) {
  const trimmed = source.trim();
  return `<div class="mermaid">${escapeHtml(trimmed)}</div>`;
}

async function renderSection(section) {
  const parts = [];
  parts.push(
    `<section class="sec" id="${escapeHtml(section.id)}">`,
    `<h3>${escapeHtml(section.heading)}</h3>`,
  );
  if (section.mermaid) parts.push(renderMermaidBlock(section.mermaid));
  if (Array.isArray(section.screenshots)) {
    for (const s of section.screenshots) {
      parts.push(await renderScreenshotBlock(s.id, s.caption));
    }
  } else if (section.screenshot) {
    parts.push(await renderScreenshotBlock(section.screenshot, section.screenshotCaption));
  }
  if (section.markdown) {
    parts.push(`<div class="prose">${md.render(section.markdown.trim())}</div>`);
  }
  parts.push(`</section>`);
  return parts.join("\n");
}

async function renderChapter(chapter) {
  const parts = [];
  parts.push(
    `<article class="chapter" id="${escapeHtml(chapter.id)}">`,
    `<h2>${escapeHtml(chapter.title)}</h2>`,
  );
  if (chapter.summary) {
    parts.push(`<p class="chapter-summary">${escapeHtml(chapter.summary)}</p>`);
  }
  for (const section of chapter.sections ?? []) {
    parts.push(await renderSection(section));
  }
  parts.push(`</article>`);
  return parts.join("\n");
}

function renderToc() {
  const items = CHAPTERS.map((chapter) => {
    const subs = (chapter.sections ?? [])
      .map((s) => `<li><a href="#${s.id}">${escapeHtml(s.heading)}</a></li>`)
      .join("");
    return `
      <li>
        <a href="#${escapeHtml(chapter.id)}"><strong>${escapeHtml(chapter.title)}</strong></a>
        <ul>${subs}</ul>
      </li>
    `;
  }).join("\n");
  return `<nav class="toc"><h2>目 录</h2><ol>${items}</ol></nav>`;
}

function renderCover() {
  return `
    <section class="cover">
      <div class="cover-tag">${escapeHtml(COVER.edition)}</div>
      <h1 class="cover-title">${escapeHtml(COVER.manualTitle)}</h1>
      <div class="cover-product">${escapeHtml(COVER.productName)}</div>
      <dl class="cover-meta">
        <dt>读者</dt><dd>${escapeHtml(COVER.audience)}</dd>
        <dt>生成日期</dt><dd>${escapeHtml(COVER.generatedAt)}</dd>
      </dl>
      <div class="cover-foot">本手册由系统自动生成 · 截图取自本地 dev 环境（admin@local.test）</div>
    </section>
  `;
}

const STYLE = `
:root {
  --c-bg: #ffffff;
  --c-fg: #1f2937;
  --c-muted: #6b7280;
  --c-accent: #2563eb;
  --c-accent-soft: #dbeafe;
  --c-border: #e5e7eb;
  --c-code-bg: #f3f4f6;
  --c-table-head: #f9fafb;
  --font-sans: "PingFang SC", "Hiragino Sans", "Noto Sans CJK SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--c-bg);
  color: var(--c-fg);
  font-family: var(--font-sans);
  font-size: 11pt;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
.page { max-width: 920px; margin: 0 auto; padding: 32px 40px 48px; }
h1, h2, h3, h4 { color: #111827; line-height: 1.35; }
h2 { font-size: 22pt; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 3px solid var(--c-accent); }
h3 { font-size: 14pt; margin: 28px 0 10px; color: #1f2937; }
p { margin: 8px 0 12px; }
a { color: var(--c-accent); text-decoration: none; }
a:hover { text-decoration: underline; }
strong { color: #111827; }
ul, ol { padding-left: 22px; }
li { margin: 4px 0; }

/* Cover */
.cover {
  height: 100vh;
  min-height: 920px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  background:
    radial-gradient(ellipse at top right, rgba(56, 189, 248, 0.35) 0%, transparent 55%),
    radial-gradient(ellipse at bottom left, rgba(124, 58, 237, 0.35) 0%, transparent 60%),
    linear-gradient(160deg, #0f172a 0%, #1e293b 35%, #1e3a8a 100%);
  color: #fff;
  padding: 96px 72px 72px;
  page-break-after: always;
  position: relative;
  overflow: hidden;
}
.cover::before {
  content: "GYOSEI OS";
  position: absolute;
  right: -20px;
  bottom: 60px;
  font-size: 100pt;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.04);
  letter-spacing: 8px;
  pointer-events: none;
}
.cover-tag {
  display: inline-block;
  padding: 6px 16px;
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 999px;
  font-size: 11pt;
  letter-spacing: 2px;
  margin-bottom: 32px;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(4px);
}
.cover-title { font-size: 44pt; line-height: 1.18; margin: 0 0 18px; font-weight: 800; color: #ffffff; max-width: 720px; }
.cover-product { font-size: 18pt; opacity: 0.85; margin-bottom: 56px; color: #fff; font-weight: 300; }
.cover-meta { display: grid; grid-template-columns: 100px 1fr; gap: 8px 24px; margin: 0 0 24px; color: rgba(255, 255, 255, 0.92); font-size: 11pt; }
.cover-meta dt { opacity: 0.6; font-weight: 400; }
.cover-meta dd { margin: 0; font-weight: 500; }
.cover-foot { margin-top: auto; opacity: 0.55; font-size: 9.5pt; color: #fff; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.18); width: 100%; }

/* TOC */
.toc { page-break-after: always; padding: 40px 0; }
.toc h2 { font-size: 22pt; border-bottom: 3px solid var(--c-accent); padding-bottom: 8px; }
.toc ol { list-style: none; padding-left: 0; }
.toc > ol > li { margin: 16px 0 12px; }
.toc > ol > li > a { font-size: 13pt; }
.toc ul { list-style: none; padding-left: 24px; margin: 6px 0; }
.toc ul li { margin: 2px 0; }
.toc ul a { color: var(--c-muted); font-size: 10.5pt; }

/* Chapter */
.chapter { page-break-before: always; }
.chapter-summary {
  background: var(--c-accent-soft);
  border-left: 4px solid var(--c-accent);
  padding: 12px 16px;
  border-radius: 0 6px 6px 0;
  margin: 0 0 24px;
  color: #1e3a8a;
}
.sec { margin: 24px 0 32px; }

/* Tables */
.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0 16px;
  font-size: 10.5pt;
  break-inside: avoid;
}
.prose th, .prose td {
  border: 1px solid var(--c-border);
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}
.prose th { background: var(--c-table-head); font-weight: 600; color: #111827; }

/* Code */
.prose code {
  background: var(--c-code-bg);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.92em;
  color: #b91c1c;
}
.prose pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 14px 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 10pt;
  line-height: 1.55;
  break-inside: avoid;
}
.prose pre code { background: none; color: inherit; padding: 0; }

/* Blockquote */
.prose blockquote {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 4px solid #f59e0b;
  background: #fffbeb;
  color: #78350f;
  border-radius: 0 6px 6px 0;
}

/* Screenshots */
.screenshot {
  margin: 16px 0 20px;
  break-inside: avoid;
  text-align: center;
}
.screenshot img {
  max-width: 100%;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}
.screenshot figcaption {
  margin-top: 8px;
  font-size: 10pt;
  color: var(--c-muted);
  font-style: italic;
}

/* Mermaid */
.mermaid {
  margin: 16px 0 20px;
  text-align: center;
  background: #f9fafb;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 16px;
  break-inside: avoid;
}

/* Print rules */
@media print {
  .page { max-width: none; padding: 18mm 18mm 24mm; }
  .chapter { page-break-before: always; }
  h2 { break-after: avoid; }
  h3 { break-after: avoid; }
  .screenshot, .mermaid, .prose pre { break-inside: avoid; }
  .prose table { break-inside: auto; }
  .prose tr { break-inside: avoid; }
}
`;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const renderedChapters = [];
  for (const chapter of CHAPTERS) {
    renderedChapters.push(await renderChapter(chapter));
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(COVER.manualTitle)}</title>
<meta name="generator" content="cms-client/operation-manual" />
<style>${STYLE}</style>
</head>
<body>
${renderCover()}
<main class="page">
  ${renderToc()}
  ${renderedChapters.join("\n")}
</main>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  mermaid.initialize({ startOnLoad: true, theme: "neutral", flowchart: { htmlLabels: true } });
  // expose readiness signal for headless PDF print step
  window.__mermaidReady = false;
  await mermaid.run();
  window.__mermaidReady = true;
</script>
</body>
</html>
`;

  const file = path.join(OUT_DIR, "manual.html");
  await fs.writeFile(file, html, "utf8");
  console.log(`[render] wrote ${path.relative(ROOT, file)} (${html.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
