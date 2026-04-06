const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");
const featuresRoot = path.join(srcRoot, "features");

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listFeatureNames() {
  if (!isDirectory(featuresRoot)) return [];
  return fs
    .readdirSync(featuresRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function isCodeFile(filePath) {
  return (
    filePath.endsWith(".ts") ||
    filePath.endsWith(".tsx") ||
    filePath.endsWith(".js") ||
    filePath.endsWith(".jsx")
  );
}

function listFilesRecursive(dirPath) {
  /** @type {string[]} */
  const files = [];
  /** @type {string[]} */
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && isCodeFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function getFeatureNameByFile(filePath) {
  const relative = path.relative(featuresRoot, filePath);
  const segments = relative.split(path.sep);
  const name = segments[0];
  if (!name || name === "." || name === "..") return null;
  return name;
}

function extractModuleSpecifiers(sourceFile) {
  /** @type {Array<{ text: string, pos: { line: number, column: number } }>} */
  const specs = [];

  /**
   * @param {import('typescript').Node} node
   */
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const text = node.moduleSpecifier.text;
        const loc = sourceFile.getLineAndCharacterOfPosition(
          node.moduleSpecifier.getStart(sourceFile) + 1,
        );
        specs.push({
          text,
          pos: { line: loc.line + 1, column: loc.character + 1 },
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specs;
}

function tryResolveRelativeImport(fromFilePath, specifier) {
  const fromDir = path.dirname(fromFilePath);
  const base = path.resolve(fromDir, specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
  ];

  for (const p of candidates) {
    try {
      if (fs.statSync(p).isFile()) return p;
    } catch {
      continue;
    }
  }
  return null;
}

function getTargetFeatureFromSpecifier(fromFilePath, specifier) {
  if (specifier.startsWith("@features/")) {
    const parts = specifier.split("/");
    const name = parts[1];
    if (!name) return null;
    return { featureName: name, resolvedPath: null, kind: "alias" };
  }

  if (specifier.startsWith(".")) {
    const resolved = tryResolveRelativeImport(fromFilePath, specifier);
    if (!resolved) return null;
    const relative = path.relative(featuresRoot, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative) === false) {
      return null;
    }
    const featureName = getFeatureNameByFile(resolved);
    if (!featureName) return null;
    return { featureName, resolvedPath: resolved, kind: "relative" };
  }

  return null;
}

function isPublicApiImport(targetFeatureName, specifier, resolvedPath) {
  if (specifier.startsWith(`@features/${targetFeatureName}/public`))
    return true;
  if (!resolvedPath) return false;
  const publicRoot = path.join(featuresRoot, targetFeatureName, "public");
  return (
    resolvedPath === publicRoot ||
    resolvedPath.startsWith(publicRoot + path.sep)
  );
}

function run() {
  const featureNames = listFeatureNames();
  if (featureNames.length === 0) return;

  const files = listFilesRecursive(featuresRoot);
  /** @type {Array<{ from: string, line: number, column: number, specifier: string, fromFeature: string, toFeature: string }>} */
  const violations = [];

  for (const filePath of files) {
    const fromFeature = getFeatureNameByFile(filePath);
    if (!fromFeature) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.ESNext,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const specs = extractModuleSpecifiers(sourceFile);
    for (const { text: specifier, pos } of specs) {
      const target = getTargetFeatureFromSpecifier(filePath, specifier);
      if (!target) continue;

      const toFeature = target.featureName;
      if (!featureNames.includes(toFeature)) continue;
      if (toFeature === fromFeature) continue;
      if (isPublicApiImport(toFeature, specifier, target.resolvedPath))
        continue;

      violations.push({
        from: filePath,
        line: pos.line,
        column: pos.column,
        specifier,
        fromFeature,
        toFeature,
      });
    }
  }

  if (violations.length === 0) return;

  console.error("门禁：发现跨 feature 依赖（禁止 features/* 互相直接依赖）");
  for (const v of violations) {
    const rel = path.relative(projectRoot, v.from);
    console.error(
      `- ${rel}:${v.line}:${v.column}  ${v.fromFeature} -> ${v.toFeature}  import "${v.specifier}"`,
    );
  }
  console.error(
    "修复建议：抽到 @shared 或 @domain；或由被依赖 feature 提供 @features/<name>/public 出口。",
  );
  process.exit(1);
}

run();
