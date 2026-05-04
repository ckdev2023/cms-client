#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const IGNORED_DIRS = new Set(["node_modules", "dist", "coverage", ".git"]);
const TS_EXTENSIONS = new Set([".ts", ".tsx"]);
const SKIP_MARKER = "i18n-skip";

const RULE1_KEYWORDS =
  /\b(?:blocking|warning|due|Due|failed|passed|status|priority|pending|normal)\b/;
const I18N_CALL_BEFORE_TEMPLATE = /(?:\bt|\$t)\s*\(\s*`/;

const RULE2_FIELD_PATTERN = /\b(?:desc|title|meta)\s*[:=]/;
const RULE2_ENUM_INTERP = /\$\{[^}]*\.(?:status|priority)\s*\}/;

function walk(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(full));
    } else if (TS_EXTENSIONS.has(path.extname(entry.name))) {
      result.push(full);
    }
  }
  return result;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function isModelFile(filePath) {
  const r = rel(filePath);
  return r.startsWith("packages/admin/") && /\/model\//.test(r);
}

function isDashboardFile(filePath) {
  const r = rel(filePath);
  return r.startsWith("packages/server/") && /\/dashboard\//.test(r);
}

function isTestFile(filePath) {
  return /\.(?:test|spec|test-support)\./.test(path.basename(filePath));
}

function hasSkip(lines, idx) {
  if (lines[idx].includes(SKIP_MARKER)) return true;
  return (
    idx > 0 &&
    /^\s*\/\//.test(lines[idx - 1]) &&
    lines[idx - 1].includes(SKIP_MARKER)
  );
}

function extractTemplateContents(line) {
  const contents = [];
  let inTemplate = false;
  let content = "";
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inTemplate) {
      if (ch === "\\" && i + 1 < line.length) {
        content += ch + line[i + 1];
        i++;
        continue;
      }
      if (ch === "$" && line[i + 1] === "{") {
        content += "${";
        i++;
        depth++;
        continue;
      }
      if (ch === "}" && depth > 0) {
        content += "}";
        depth--;
        continue;
      }
      if (ch === "`" && depth === 0) {
        contents.push(content);
        inTemplate = false;
        content = "";
        continue;
      }
      content += ch;
    } else if (ch === "`") {
      inTemplate = true;
      content = "";
      depth = 0;
    }
  }
  return contents;
}

function stripInterpolations(templateContent) {
  let result = "";
  let i = 0;
  while (i < templateContent.length) {
    if (
      templateContent[i] === "$" &&
      i + 1 < templateContent.length &&
      templateContent[i + 1] === "{"
    ) {
      let depth = 1;
      i += 2;
      while (i < templateContent.length && depth > 0) {
        if (templateContent[i] === "{") depth++;
        else if (templateContent[i] === "}") depth--;
        i++;
      }
      result += " ";
    } else {
      result += templateContent[i];
      i++;
    }
  }
  return result;
}

function checkRule1(filePath, source) {
  if (isTestFile(filePath)) return [];
  const violations = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (hasSkip(lines, i)) continue;
    if (!line.includes("`") || !line.includes("${")) continue;
    if (I18N_CALL_BEFORE_TEMPLATE.test(line)) continue;
    const templates = extractTemplateContents(line);
    const hit = templates.some((tpl) => {
      if (!tpl.includes("${")) return false;
      const literal = stripInterpolations(tpl);
      return RULE1_KEYWORDS.test(literal);
    });
    if (!hit) continue;
    violations.push({
      file: rel(filePath),
      line: i + 1,
      rule: "i18n/no-hardcode-model",
      message:
        "Template literal with interpolation contains i18n-sensitive keyword",
      source: line.trim(),
    });
  }
  return violations;
}

function checkRule2(filePath, source) {
  if (isTestFile(filePath)) return [];
  const violations = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (hasSkip(lines, i)) continue;
    if (!RULE2_FIELD_PATTERN.test(line)) continue;
    if (!line.includes("`")) continue;
    if (!RULE2_ENUM_INTERP.test(line)) continue;
    violations.push({
      file: rel(filePath),
      line: i + 1,
      rule: "i18n/no-raw-enum-in-desc",
      message:
        "desc/title/meta interpolates raw enum (status/priority); use descKey + descParams",
      source: line.trim(),
    });
  }
  return violations;
}

function main() {
  const violations = [];

  for (const f of walk(path.join(ROOT, "packages/admin/src"))) {
    if (isModelFile(f))
      violations.push(...checkRule1(f, fs.readFileSync(f, "utf8")));
  }

  for (const f of walk(path.join(ROOT, "packages/server/src"))) {
    if (isDashboardFile(f))
      violations.push(...checkRule2(f, fs.readFileSync(f, "utf8")));
  }

  if (violations.length > 0) {
    console.error("门禁：检测到 i18n 硬编码违规：\n");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    [${v.rule}] ${v.message}`);
      console.error(`    > ${v.source}`);
      console.error();
    }
    console.error(
      `共 ${violations.length} 处违规。添加 // ${SKIP_MARKER} 注释可豁免已知例外。`,
    );
    process.exit(1);
  }

  console.log("i18n 硬编码检查通过");
}

main();
