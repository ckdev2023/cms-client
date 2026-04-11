# T01 Baseline Audit — 现有 Skill 结构盘点

> 生成时间：2026-04-10
>
> 目的：从现有两个 skill、AGENTS.md 和 customers 金样本中提炼共性，发现差异，为统一 skill 模板提供依据。

---

## 1. 盘点范围

| 来源 | 路径 | 类型 |
|------|------|------|
| prototype-module-split | `.cursor/skills/prototype-module-split/` | 已有 skill |
| cursor-task-orchestrator | `.cursor/skills/cursor-task-orchestrator/` | 已有 skill |
| AGENTS.md | `AGENTS.md` | 仓库级门禁与规则 |
| customers 金样本 | `packages/prototype/admin/customers/` | skill 产出实例 |

---

## 2. 目录结构对比

### prototype-module-split

```
prototype-module-split/
├── SKILL.md              ← 主文档（frontmatter + 正文）
├── reference.md          ← 拆分判断规则（补充细则）
├── examples.md           ← 金样本目录模式与生产映射示例
├── data/
│   ├── customers-annotated-example.json   ← 真实标注样例
│   └── module-split-blueprint.json        ← 通用 schema / 蓝图
└── scripts/
    ├── scaffold-split.mjs                 ← 骨架创建脚本
    └── validate-manifest.mjs              ← manifest 校验脚本
```

### cursor-task-orchestrator

```
cursor-task-orchestrator/
├── SKILL.md              ← 主文档（frontmatter + 正文）
├── references/
│   ├── ai-traps.md
│   ├── task-template.md
│   ├── task-splitting-checklist.md
│   ├── merge-review-template.md
│   ├── manifest-template.json
│   ├── result-schema-template.json
│   └── runbook-template.md
├── scripts/
│   ├── run_tasks.py
│   ├── validate_manifest.py
│   └── merge_review.py
└── agents/
    └── openai.yaml
```

---

## 3. SKILL.md 章节对比

| 统一概念 | prototype-module-split | cursor-task-orchestrator | 备注 |
|---------|----------------------|------------------------|------|
| Frontmatter | `name` + `description` | `name` + `description` | 一致 |
| 概述 | **Purpose** | **Overview** + **Core stance** | 命名不同；orchestrator 额外有优先级声明 |
| 金样本 / 关键输入 | **Gold Reference** | 隐含在 References 节 | prototype-split 显式列出必读文件 |
| 产出物 | **Required Deliverables** | **What to produce** | 命名不同；内容模式相同 |
| 工作流 | **Mandatory Workflow** | **Mandatory workflow** | 命名几乎一致 |
| 边界规则 | **Boundary Rules** | **Hard rules for atomic tasks** + **Dependency-first planning rules** | prototype-split 合为一节；orchestrator 分两节 |
| 辅助文件使用 | **Script, Data, Reference Usage** | **Script generation guidance** + **References** | 结构不同 |
| 输出规则 | **Output Rules** | **Required output files** + **Task document rules** + **Output behavior for task docs** + **Validation protocol rules** | orchestrator 更细分 |
| 反模式 | **Anti-Patterns** | **AI traps to actively prevent** | 命名不同；orchestrator 带编号和说明 |
| 完成验证 | **Completion** | **Quality gate** + **Merge and review stage** | prototype-split 合为一节 |
| 意图路由 | — | **Decision tree** | prototype-split 缺失 |
| 触发词 | frontmatter description | **Example triggers** | prototype-split 只在 frontmatter 描述；orchestrator 有独立节 |

---

## 4. 共性模式

1. **YAML Frontmatter**：两个 skill 都用 `---` 包裹的 `name` + `description`。
2. **一个主文档 + 多个辅助文件**：SKILL.md 是唯一入口，参考规则、模板、数据、脚本分文件存放。
3. **强制工作流**：都有步骤编号的必须执行序列。
4. **产出物清单**：都明确列出最终交付物及其最小字段/结构。
5. **反模式清单**：都有"不要做什么"的负面规则。
6. **完成检查**：都有收尾验证点。
7. **机器可读产出**：都要求 JSON manifest（`split-manifest.json` / `manifest.json`）。
8. **辅助脚本**：都提供校验或脚手架脚本。

---

## 5. 关键差异

### 5.1 命名不统一

同一概念在两个 skill 中的章节标题不同（见 §3 表格）。T02 需统一为一套固定章节名。

### 5.2 结构粒度不同

- prototype-module-split 倾向大节（6 个正文节），每节内容较紧凑。
- cursor-task-orchestrator 倾向细分（15+ 个正文节），每节更聚焦。
- 统一模板应取折中：固定 ~10 个标准节，允许通过子节扩展。

### 5.3 辅助文件组织不同

- prototype-module-split 用 `reference.md`（单数）+ `examples.md` + `data/` + `scripts/`。
- cursor-task-orchestrator 用 `references/`（复数目录）+ `scripts/` + `agents/`。
- 建议统一为：`references/` 目录 + `data/` 目录 + `scripts/` 目录。

### 5.4 缺失段落

| 段落 | prototype-module-split | cursor-task-orchestrator | 建议 |
|------|:---------------------:|:------------------------:|------|
| 触发条件（独立节） | ✗ | ✓ | 全部补上 |
| 意图路由 / 决策树 | ✗ | ✓ | 复杂 skill 可选 |
| 金样本引用 | ✓ | ✗ | 全部补上 |
| 优先级声明 | ✗ | ✓（Core stance） | 合入"概述"子节 |
| 边界与层级 | ✓ | ✓（分两节） | 统一为一节 |

### 5.5 与 AGENTS.md 的关系

两个 skill 都未显式引用 AGENTS.md 门禁。`prototype-module-split` 在 Completion 节提到 `npm run fix` + `npm run guard`，但未提测试补齐和架构边界检查。建议模板中加入 **Guardrails** 段落，固定链接到 AGENTS.md。

---

## 6. customers 金样本产出物审计

customers 模块作为 `prototype-module-split` 的金样本，其实际产出与 SKILL.md 要求的对照：

| 要求产出 | 是否存在 | 质量 |
|---------|:-------:|------|
| `P0-CONTRACT.md` | ✓ | 完整（11 节 + 回归清单） |
| `SPLIT-ARCHITECTURE.md` | ✓ | 完整（6 节 + 映射速查） |
| `MIGRATION-MAPPING.md` | ✓ | 完整（8 节 + 文件树 + 迁移顺序） |
| `split-manifest.json` | ✓ | 完整（14 个顶层 key） |
| `sections/` 目录 | ✓ | 6 个 section 文件 |
| `scripts/` 目录 | ✓ | 4 个 script 文件 |
| `data/` 目录 | ✓ | 1 个 config 文件 |

金样本产出齐全，命名一致，可以直接作为模板参考。

---

## 7. 推导出的统一骨架

基于上述盘点，提炼出以下统一 skill 结构（详见 `SKILL-TEMPLATE.md`）：

### SKILL.md 固定章节（10 节）

1. **Frontmatter** — `name`, `description`
2. **Purpose** — 用途与优先级
3. **Triggers** — 触发条件与示例请求
4. **Required Inputs** — 必读文件与上下文
5. **Deliverables** — 输出物与最小结构
6. **Workflow** — 强制执行步骤（编号）
7. **Rules** — 边界、约束、层级规则
8. **Anti-Patterns** — 禁止做的事
9. **References** — 辅助文件索引（data / scripts / references）
10. **Completion** — 完成检查清单 + 仓库门禁

### 辅助文件标准目录

```
<skill-name>/
├── SKILL.md
├── references/          ← 补充规则、模板、判断标准
│   └── *.md / *.json
├── data/                ← 蓝图、schema、标注样例、金样本
│   └── *.json
└── scripts/             ← 脚手架、校验、辅助脚本
    └── *.mjs / *.py
```

---

## 8. 给 T02 的输入

- 本审计报告（本文件）
- 统一模板草案（`SKILL-TEMPLATE.md`）
- 两个现有 skill 的完整源文件
- customers 金样本的 4 个产出物
