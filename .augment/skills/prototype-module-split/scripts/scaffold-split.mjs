#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const blueprintPath = path.join(__dirname, "..", "data", "module-split-blueprint.json");
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, "utf8"));

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeIfNeeded(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    console.log(`skip ${filePath}`);
    return;
  }
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`${force && fs.existsSync(filePath) ? "overwrite" : "create"} ${filePath}`);
}

function buildManifest({
  workspaceRoot,
  moduleDirAbs,
  moduleId,
  moduleLabel,
  entryFileAbs,
}) {
  const moduleDir = toPosix(path.relative(workspaceRoot, moduleDirAbs));
  const entryFile = toPosix(path.relative(workspaceRoot, entryFileAbs));

  return {
    artifactVersion: blueprint.artifactVersion,
    moduleId,
    moduleLabel,
    moduleDir,
    entryFile,
    referenceDocs: [
      `${moduleDir}/P0-CONTRACT.md`,
      `${moduleDir}/SPLIT-ARCHITECTURE.md`,
      `${moduleDir}/MIGRATION-MAPPING.md`
    ],
    sharedCandidates: {
      styles: [],
      shell: [],
      scripts: []
    },
    sections: [],
    dataFiles: [],
    scripts: [],
    productionMapping: {
      domain: [],
      data: [],
      model: [],
      ui: [],
      shared: []
    },
    regressionChecklist: [],
    notes: [
      "Fill in section/data/script inventories before using this manifest as a reference.",
      "Mark demo-only behavior explicitly."
    ]
  };
}

function buildContractTemplate(moduleLabel) {
  return `# ${moduleLabel}页 P0 拆分约束清单

> 权威来源：请补充规格文档路径
>
> 用途：作为 ${moduleLabel} 模块拆分和回归的唯一基线。

---

## 1 必保留字段与区块

列出当前 P0 阶段必须保留的字段、列表列、主要区块和入口。

## 2 搜索、筛选与主要交互

列出搜索范围、筛选器、切换器、重置、主按钮、关键启用态。

## 3 批量动作或列表动作

列出表头选择、批量动作、单行动作及其约束。

## 4 弹窗、抽屉或建档入口

列出表单字段、校验规则、启用态、特殊提示。

## 5 草稿、暂存或本地状态

列出是否有草稿、本地存储、恢复、删除等行为。

## 6 状态与异常态

列出空状态、异常提示、去重、无数据等状态。

## 7 Toast / 反馈

列出所有用户可见反馈场景。

## 8 非范围项

明确当前阶段不做什么。

## 拆分回归清单

- [ ] 主要区块完整
- [ ] 关键交互完整
- [ ] 关键启用态正确
- [ ] demo-only 行为已标注
`;
}

function buildArchitectureTemplate(moduleLabel, moduleDirName) {
  return `# ${moduleLabel}页原型拆分架构说明

> 本文档定义 ${moduleLabel} 模块的目标目录结构、模块职责、共享边界与拆分顺序。

---

## 1 当前问题

说明当前入口页中耦合的 section、script、data、shared 问题。

## 2 目标目录结构

\`\`\`
${moduleDirName}/
├── index.html
├── P0-CONTRACT.md
├── SPLIT-ARCHITECTURE.md
├── MIGRATION-MAPPING.md
├── split-manifest.json
├── sections/
├── scripts/
└── data/
\`\`\`

## 3 模块职责定义

### 3.1 sections

列出每个 \`sections/*.html\` 的职责。

### 3.2 data

列出每个 \`data/*.js\` 的导出和使用方。

### 3.3 scripts

列出每个 \`scripts/*.js\` 的行为边界和依赖。

## 4 shared 与页面层边界规则

列出哪些样式、壳层、脚本应提升到 \`shared/\`。

## 5 拆分步骤

1. 先抽取 shared
2. 再拆 page sections
3. 再拆 data 与 scripts
4. 最后做回归
`;
}

function buildMappingTemplate(moduleLabel, moduleId) {
  return `# ${moduleLabel}页原型 -> 生产代码迁移映射

> 本文档定义 ${moduleLabel} 原型的 section、data、script 到真实代码的映射关系。

---

## 1 Domain 层映射

把声明式 schema、常量、类型、仓库接口映射到 \`domain/${moduleId}/\`。

## 2 Data 层映射

把 API、storage、repository 实现映射到 \`data/${moduleId}/\`。

## 3 Features / model 层映射

把 page、modal、draft、bulk 等行为映射到 ViewModel Hook。

## 4 Features / ui 层映射

把 section 映射到页面组件。

## 5 Shared 层映射

把导航、壳层、通用组件和 hooks 映射到 \`shared/\`。

## 6 迁移顺序建议

按 domain -> data -> model -> ui -> route/integration 的顺序补充。
`;
}

const args = parseArgs(process.argv.slice(2));
const workspaceRoot = process.cwd();
const moduleDirArg = args["module-dir"];
const moduleId = args["module-id"];
const moduleLabel = args["module-label"];
const entryFileArg = args["entry-file"];
const force = Boolean(args.force);

if (!moduleDirArg || !moduleId || !moduleLabel) {
  console.error(
    "Usage: node .cursor/skills/prototype-module-split/scripts/scaffold-split.mjs --module-dir packages/prototype/admin/case --module-id case --module-label 案件 [--entry-file packages/prototype/admin/case/index.html] [--force]"
  );
  process.exit(1);
}

const moduleDirAbs = path.resolve(workspaceRoot, moduleDirArg);
const entryFileAbs = entryFileArg
  ? path.resolve(workspaceRoot, entryFileArg)
  : path.join(moduleDirAbs, "index.html");

ensureDir(moduleDirAbs);
for (const directoryName of blueprint.requiredDirectories) {
  ensureDir(path.join(moduleDirAbs, directoryName));
}

const manifest = buildManifest({
  workspaceRoot,
  moduleDirAbs,
  moduleId,
  moduleLabel,
  entryFileAbs
});

writeIfNeeded(
  path.join(moduleDirAbs, "P0-CONTRACT.md"),
  buildContractTemplate(moduleLabel),
  force
);
writeIfNeeded(
  path.join(moduleDirAbs, "SPLIT-ARCHITECTURE.md"),
  buildArchitectureTemplate(moduleLabel, path.basename(moduleDirAbs)),
  force
);
writeIfNeeded(
  path.join(moduleDirAbs, "MIGRATION-MAPPING.md"),
  buildMappingTemplate(moduleLabel, moduleId),
  force
);
writeIfNeeded(
  path.join(moduleDirAbs, "split-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  force
);

console.log("done");
