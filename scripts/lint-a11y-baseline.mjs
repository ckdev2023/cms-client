#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const IGNORED_DIRS = new Set(["node_modules", "dist", "coverage", ".git"]);
const SKIP_MARKER = "a11y-skip";

const BASELINE_PATH = path.join(ROOT, "scripts", "a11y-baseline.json");

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

function walk(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(full));
    } else if (entry.name.endsWith(".vue")) {
      result.push(full);
    }
  }
  return result;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

// ---------------------------------------------------------------------------
// Template extraction — return the <template> block from a .vue SFC
// ---------------------------------------------------------------------------

function extractTemplate(source) {
  const openTag = /<template\b[^>]*>/i;
  const closeTag = /<\/template\s*>/i;
  const openMatch = openTag.exec(source);
  if (!openMatch) return "";
  const startContent = openMatch.index + openMatch[0].length;
  const closeMatch = closeTag.exec(source.slice(startContent));
  if (!closeMatch) return source.slice(startContent);
  return source.slice(startContent, startContent + closeMatch.index);
}

// ---------------------------------------------------------------------------
// Rule 1 — <input> / <select> must have id or name (or :id / :name)
// ---------------------------------------------------------------------------

function hasAttr(tag, ...names) {
  for (const n of names) {
    const pattern = new RegExp(`(?:\\s|^)(?::)?${n}\\s*=`);
    if (pattern.test(tag)) return true;
  }
  return false;
}

function checkInputIdName(filePath, source) {
  const template = extractTemplate(source);
  if (!template) return [];
  const violations = [];
  const lines = template.split("\n");
  const templateOffset = source.indexOf(template);
  const baseLineNumber =
    source.slice(0, templateOffset).split("\n").length - 1;

  const tagRe = /<(input|select)\b([^>]*?)(?:\/>|>)/gi;
  let match;
  while ((match = tagRe.exec(template)) !== null) {
    const fullTag = match[0];
    const attrs = match[2];

    const linesBefore = template.slice(0, match.index).split("\n");
    const lineNum = baseLineNumber + linesBefore.length;
    const lineContent = lines[linesBefore.length - 1] || fullTag;

    if (lineContent.includes(SKIP_MARKER)) continue;
    if (
      linesBefore.length >= 2 &&
      (lines[linesBefore.length - 2] || "").includes(SKIP_MARKER)
    )
      continue;

    if (hasAttr(attrs, "id", "name")) continue;

    violations.push({
      file: rel(filePath),
      line: lineNum,
      rule: "a11y/input-id-name",
      message: `<${match[1]}> missing id or name attribute`,
      source: fullTag.trim().slice(0, 120),
    });
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Rule 2 — subnav buttons and role="tab" elements need aria-current or
//           aria-selected bindings
// ---------------------------------------------------------------------------

function checkSubnavTabAria(filePath, source) {
  const template = extractTemplate(source);
  if (!template) return [];
  const violations = [];
  const lines = template.split("\n");
  const templateOffset = source.indexOf(template);
  const baseLineNumber =
    source.slice(0, templateOffset).split("\n").length - 1;

  const tagRe = /<(button|a|div|span)\b([^>]*?)(?:\/>|>)/gi;
  let match;
  while ((match = tagRe.exec(template)) !== null) {
    const attrs = match[2];
    const isSubnavBtn = /subnav-btn/.test(attrs) || /subnav-btn/.test(match[0]);
    const isTabRole = /role\s*=\s*["']tab["']/.test(attrs);

    if (!isSubnavBtn && !isTabRole) continue;

    const linesBefore = template.slice(0, match.index).split("\n");
    const lineNum = baseLineNumber + linesBefore.length;
    const lineContent = lines[linesBefore.length - 1] || match[0];

    if (lineContent.includes(SKIP_MARKER)) continue;
    if (
      linesBefore.length >= 2 &&
      (lines[linesBefore.length - 2] || "").includes(SKIP_MARKER)
    )
      continue;

    const hasAriaCurrent = /(?::)?aria-current\s*=/.test(attrs);
    const hasAriaSelected = /(?::)?aria-selected\s*=/.test(attrs);

    if (hasAriaCurrent || hasAriaSelected) continue;

    violations.push({
      file: rel(filePath),
      line: lineNum,
      rule: "a11y/subnav-tab-aria",
      message: `${isSubnavBtn ? "subnav button" : 'role="tab" element'} missing aria-current or aria-selected`,
      source: match[0].trim().slice(0, 120),
    });
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Baseline management
// ---------------------------------------------------------------------------

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function violationKey(v) {
  return `${v.file}::${v.rule}::${v.line}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const updateBaseline = process.argv.includes("--update-baseline");
  const allViolations = [];

  for (const f of walk(
    path.join(ROOT, "packages/admin/src"),
  )) {
    const source = fs.readFileSync(f, "utf8");
    allViolations.push(...checkInputIdName(f, source));
    allViolations.push(...checkSubnavTabAria(f, source));
  }

  if (updateBaseline) {
    const keys = allViolations.map(violationKey).sort();
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(keys, null, 2) + "\n");
    console.log(
      `a11y baseline 已更新：${keys.length} 项写入 ${path.relative(ROOT, BASELINE_PATH)}`,
    );
    return;
  }

  const baseline = loadBaseline();
  const newViolations = allViolations.filter(
    (v) => !baseline.has(violationKey(v)),
  );

  if (baseline.size > 0) {
    const baselinedCount = allViolations.length - newViolations.length;
    if (baselinedCount > 0) {
      console.log(
        `a11y: ${baselinedCount} 项存量违规已记录在 baseline 中（允许通过）`,
      );
    }
  }

  if (newViolations.length > 0) {
    console.error("门禁：检测到 a11y 新增违规：\n");
    for (const v of newViolations) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    [${v.rule}] ${v.message}`);
      console.error(`    > ${v.source}`);
      console.error();
    }
    console.error(
      `共 ${newViolations.length} 处新增违规。` +
        `添加 // ${SKIP_MARKER} 注释可豁免已知例外。` +
        (baseline.size === 0
          ? ` 运行 node scripts/lint-a11y-baseline.mjs --update-baseline 可生成初始 baseline。`
          : ""),
    );
    process.exit(1);
  }

  console.log("a11y baseline 检查通过");
}

main();
