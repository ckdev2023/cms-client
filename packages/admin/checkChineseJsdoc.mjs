/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SOURCE_ROOT = path.join(__dirname, "src");
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".vue"]);
const IGNORED_DIRECTORIES = new Set(["node_modules", "dist", "coverage"]);
const CJK_PATTERN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u;
const SCRIPT_SETUP_PATTERN =
  /<script\b(?=[^>]*\bsetup\b)[^>]*>([\s\S]*?)<\/script>/g;
const VUE_COMPONENT_ENTRY_PATTERN =
  /\b(?:defineProps|defineEmits|defineModel|defineOptions|withDefaults)\b|(?:^|\n)\s*(?:const|let|var)\b|(?:^|\n)\s*function\s+[A-Za-z_$][\w$]*\s*\(/m;
const VUE_NAMED_FUNCTION_PATTERN =
  /(?:^|\n)\s*function\s+([A-Za-z_$][\w$]*)\s*\(/g;
const TAGS_REQUIRING_CHINESE = new Set([
  "@description",
  "@internal",
  "@param",
  "@property",
  "@prop",
  "@returns",
  "@return",
  "@throws",
  "@remarks",
  "@remark",
  "@summary",
]);
const TAGS_IGNORED = new Set(["@example"]);

/**
 * 提取注释文本中的中文校验违规项。
 *
 * @param source 待检查的源码文本
 * @returns 违规项列表
 */
export function findJsdocLanguageViolations(source) {
  const violations = [];
  const blockPattern = /\/\*\*[\s\S]*?\*\//g;

  for (const match of source.matchAll(blockPattern)) {
    const startLine = source.slice(0, match.index).split("\n").length;
    const lines = normalizeJsdocLines(match[0]);
    violations.push(...collectBlockViolations(lines, startLine));
  }

  return violations;
}

/**
 * 检查 Vue `script setup` 是否具备组件级中文 JSDoc 与函数 JSDoc。
 *
 * @param source Vue 单文件组件源码
 * @returns 违规项列表
 */
export function findVueDocumentationViolations(source) {
  const violations = [];

  for (const match of source.matchAll(SCRIPT_SETUP_PATTERN)) {
    const scriptContent = match[1] ?? "";
    const scriptStart = match.index + match[0].indexOf(scriptContent);

    violations.push(
      ...findVueComponentDocViolations(source, scriptContent, scriptStart),
    );
    violations.push(
      ...findVueNamedFunctionDocViolations(source, scriptContent, scriptStart),
    );
  }

  return violations;
}

/**
 * 遍历目录并返回待检查文件。
 *
 * @param rootDir 根目录
 * @returns 需要检查的文件路径列表
 */
export function collectTargetFiles(rootDir) {
  const files = [];

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTargetFiles(entryPath));
      continue;
    }

    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function normalizeJsdocLines(block) {
  return block
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim());
}

function collectJsdocBlocks(source) {
  const blocks = [];
  const blockPattern = /\/\*\*[\s\S]*?\*\//g;

  for (const match of source.matchAll(blockPattern)) {
    blocks.push({
      content: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return blocks;
}

function collectBlockViolations(lines, startLine) {
  const violations = [];
  const descriptionLines = [];
  let activeTag = null;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (line.startsWith("@")) {
      activeTag = handleTagLine(line, startLine, violations);
      continue;
    }

    if (activeTag) {
      pushContinuationViolation(line, startLine, activeTag, violations);
      continue;
    }

    descriptionLines.push(line);
  }

  pushSummaryViolation(descriptionLines, startLine, violations);
  return violations;
}

function handleTagLine(line, startLine, violations) {
  const tag = line.split(/\s+/, 1)[0];
  if (TAGS_IGNORED.has(tag)) {
    return null;
  }

  const prose = extractTagProse(line, tag);
  if (TAGS_REQUIRING_CHINESE.has(tag) && prose && !containsChinese(prose)) {
    violations.push({
      line: startLine,
      message: `${tag} 描述必须使用中文`,
    });
  }

  return tag;
}

function pushContinuationViolation(line, startLine, activeTag, violations) {
  if (!containsChinese(line)) {
    violations.push({
      line: startLine,
      message: `${activeTag} 的续行描述必须使用中文`,
    });
  }
}

function pushSummaryViolation(descriptionLines, startLine, violations) {
  const description = descriptionLines.join(" ").trim();
  if (description && !containsChinese(description)) {
    violations.push({
      line: startLine,
      message: "JSDoc 摘要描述必须使用中文",
    });
  }
}

function findVueComponentDocViolations(source, scriptContent, scriptStart) {
  const blocks = collectJsdocBlocks(scriptContent);
  const componentEntry = scriptContent.match(VUE_COMPONENT_ENTRY_PATTERN);
  const componentEntryIndex = componentEntry?.index ?? 0;
  const searchLimit = componentEntry?.index ?? scriptContent.length;
  const componentLine = lineNumberAt(source, scriptStart + componentEntryIndex);
  const adjacentDoc = findAdjacentJsdocBlock(
    scriptContent,
    blocks,
    searchLimit,
  );

  if (!adjacentDoc) {
    return [
      {
        line: componentLine,
        message: "Vue 组件必须在 script setup 中提供中文 JSDoc 说明",
      },
    ];
  }

  if (!hasChineseSummary(adjacentDoc.content)) {
    return [
      {
        line: lineNumberAt(source, scriptStart + adjacentDoc.start),
        message: "Vue 组件 JSDoc 摘要必须使用中文且不能为空",
      },
    ];
  }

  return [];
}

function findVueNamedFunctionDocViolations(source, scriptContent, scriptStart) {
  const violations = [];
  const blocks = collectJsdocBlocks(scriptContent);

  for (const match of scriptContent.matchAll(VUE_NAMED_FUNCTION_PATTERN)) {
    const functionIndex =
      (match.index ?? 0) + Number(match[0].startsWith("\n"));
    const functionName = match[1];
    const adjacentDoc = findAdjacentJsdocBlock(
      scriptContent,
      blocks,
      functionIndex,
    );

    if (adjacentDoc) {
      continue;
    }

    violations.push({
      line: lineNumberAt(source, scriptStart + functionIndex),
      message: `函数 ${functionName} 必须提供中文 JSDoc 注释`,
    });
  }

  return violations;
}

function findAdjacentJsdocBlock(source, blocks, targetIndex) {
  let lastBlock = null;

  for (const block of blocks) {
    if (block.end > targetIndex) {
      break;
    }
    lastBlock = block;
  }

  if (!lastBlock) {
    return null;
  }

  return /^\s*$/.test(source.slice(lastBlock.end, targetIndex))
    ? lastBlock
    : null;
}

function hasChineseSummary(block) {
  const lines = normalizeJsdocLines(block);
  const description = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (line.startsWith("@")) {
      break;
    }

    description.push(line);
  }

  return containsChinese(description.join(" ").trim());
}

function extractTagProse(line, tag) {
  const body = line.slice(tag.length).trim();
  if (!body) {
    return "";
  }

  return getTagProseTransformer(tag)(body);
}

function containsChinese(text) {
  const normalized = text.replace(/`[^`]*`/g, "").trim();
  if (!normalized) {
    return true;
  }
  return CJK_PATTERN.test(normalized);
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function formatViolations(filePath, violations) {
  return violations.map(
    ({ line, message }) =>
      `${path.relative(__dirname, filePath)}:${line} ${message}`,
  );
}

function getTagProseTransformer(tag) {
  if (tag === "@param" || tag === "@property" || tag === "@prop") {
    return (body) =>
      body
        .replace(/^\{[^}]+\}\s*/, "")
        .replace(/^[\w$.[\]]+\s*/, "")
        .replace(/^-\s*/, "")
        .trim();
  }

  if (tag === "@returns" || tag === "@return" || tag === "@throws") {
    return (body) =>
      body
        .replace(/^\{[^}]+\}\s*/, "")
        .replace(/^-\s*/, "")
        .trim();
  }

  if (
    tag === "@description" ||
    tag === "@internal" ||
    tag === "@remarks" ||
    tag === "@remark" ||
    tag === "@summary"
  ) {
    return (body) => body.replace(/^-\s*/, "").trim();
  }

  return () => "";
}

function main() {
  const files = collectTargetFiles(SOURCE_ROOT);
  const output = [];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf8");
    const violations = findJsdocLanguageViolations(source);
    if (path.extname(filePath) === ".vue") {
      violations.push(...findVueDocumentationViolations(source));
    }
    output.push(...formatViolations(filePath, violations));
  }

  if (output.length > 0) {
    console.error("门禁：检测到非中文 JSDoc 描述，请改为中文：");
    for (const line of output) {
      console.error(`- ${line}`);
    }
    process.exit(1);
  }

  console.log("JSDoc 中文检查通过");
}

if (process.argv[1] === __filename) {
  main();
}
