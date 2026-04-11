---
name: prototype-module-split
description: >-
  Split prototype modules into sections/scripts/data and generate P0-CONTRACT,
  SPLIT-ARCHITECTURE, MIGRATION-MAPPING, split-manifest.json.
  Supports monolithic IIFE scripts via script-first audit → boundary → review pipeline.
---

# Prototype Module Split

## Purpose

把单文件或高耦合原型模块拆成一组可持续维护的实现工件，为后续真实代码落地做准备。

对于巨型单文件（500+ 行 IIFE、高耦合详情页脚本），本 skill 采用 **script-first** 策略：先通过脚手架和门禁脚本建立骨架并校验，再允许 AI 做边界判断。AI 在任何阶段都不得跳过脚本门禁直接生成工件。

默认目标不是"只拆文件"，而是同时产出：

1. 当前原型的边界说明
2. 回归验收基线
3. 原型到生产代码的映射
4. 可复用的 `sections` / `scripts` / `data` 结构
5. 机器可读的拆分清单

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户要求拆分一个原型模块（从单文件或高耦合状态拆为 sections / scripts / data 结构）
- 用户要求拆分超大原型脚本（500+ 行 IIFE、单文件高耦合详情页）
- 用户要求先做边界标注和审计，再执行拆分（audit-first / boundary-first 场景）
- 用户要求为原型模块生成 P0-CONTRACT.md / SPLIT-ARCHITECTURE.md / MIGRATION-MAPPING.md
- 用户要求标注原型模块的共享候选项和 demo-only 能力
- 用户要求为原型模块创建 split-manifest.json
- 用户要求为一个已有 split-manifest 的模块补拆子页面脚本（如详情页 Tab 页的巨型脚本）

示例请求：
- 帮我拆分 billing 原型到标准目录结构
- 为案件模块生成 P0-CONTRACT 和 SPLIT-ARCHITECTURE
- 标注 documents 模块的共享层候选和 demo-only 能力
- 给 settings 模块做原型拆分和 manifest
- 把 leads-message 单文件原型拆成 sections + scripts + data
- 把 case-detail 的 500 行 IIFE 脚本做审计和边界标注
- 帮案件详情页做 audit-manifest 和 boundary-map
- case 的主 split-manifest 已有，帮我补拆详情页子模块脚本

## Required Inputs

### Tier 1 — Pipeline artifacts（优先读取）

当目标模块已存在以下工件时，必须先读取它们以确认当前阶段：

- `<module-dir>/split-manifest[-suffix].json` — 模块拆分清单（init 阶段产出）
- `<module-dir>/audit-manifest[-suffix].json` — 全局状态审计清单（audit 阶段产出）
- `<module-dir>/boundary-map[-suffix].json` — 符号归属与依赖边界（boundary 阶段产出）
- `<module-dir>/index.html` 或指定入口 — 模块入口 HTML
- 目标模块的主源码脚本（尤其是巨型 IIFE 单文件）

### Tier 2 — 金样本（首次拆分时参照）

首次拆分新模块且无 Tier 1 工件时，读取金样本作为结构参照：

- `packages/prototype/admin/customers/split-manifest.json` — 金样本机器可读清单
- `packages/prototype/admin/customers/P0-CONTRACT.md` — 金样本 P0 约束清单
- `.cursor/skills/prototype-module-split/data/customers-annotated-example.json` — 客户模块标注样例

### Tier 3 — 补充上下文（按需读取）

- `.cursor/skills/prototype-module-split/references/split-rules.md` — 拆分判断细则
- `.cursor/skills/prototype-module-split/references/gold-sample-patterns.md` — 金样本目录模式与生产映射示例
- `AGENTS.md` — 仓库分层与门禁规则

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. `P0-CONTRACT.md` — 当前原型的 P0 约束清单
2. `SPLIT-ARCHITECTURE.md` — 拆分架构和目录职责定义
3. `MIGRATION-MAPPING.md` — 原型到生产代码的逐层映射
4. `split-manifest.json` — 机器可读的拆分清单
5. 模块目录下的 `sections/`、`scripts/`、`data/` 实体文件

### 巨型单文件 / IIFE 场景追加产出

对于需要 audit → boundary → review 前置的巨型脚本，追加产出：

6. `audit-manifest[-suffix].json` — 全局状态、DOM ref、session key、liveState、helpers、events、init 序列的结构化审计。结构遵循 [audit-manifest.schema.json](data/audit-manifest.schema.json)。
7. `boundary-map[-suffix].json` — 函数归属、依赖边、namespace API、加载顺序的结构化边界图。结构遵循 [boundary-map.schema.json](data/boundary-map.schema.json)。

这两个工件是 execute 之前的中间产物。每个字段的 provenance 必须遵循 [truth-sources.md](references/truth-sources.md)：extracted 字段由脚本扫描产出并绑定 SHA-256 指纹，inferred 字段由 AI 判断并附 reason，无法分类项进入 unknowns[]。

如果页面存在可复用壳层或样式，还要补齐共享层拆分建议：

- `shared/styles/*`
- `shared/shell/*`
- `shared/scripts/*`

### P0-CONTRACT.md 必须章节

1. 入口与导航
2. 字段与列定义
3. 操作与交互
4. 状态与异常态
5. Demo 能力标注
6. 拆分回归清单

### SPLIT-ARCHITECTURE.md 必须章节

1. 模块概述
2. 目标目录结构
3. 各层职责定义（shared / sections / scripts / data）
4. 拆分边界
5. 拆分顺序

### MIGRATION-MAPPING.md 必须章节

1. Domain 层映射
2. Data 层映射
3. Features/model 层映射
4. Features/ui 层映射
5. Shared 层映射
6. 完整文件树
7. 迁移顺序建议
8. 原型 → 生产差异备忘

### split-manifest.json 最小结构

```json
{
  "module": "{module-name}",
  "entryFile": "index.html",
  "sections": ["sections/*.html"],
  "dataFiles": ["data/*.js"],
  "scripts": ["scripts/*.js"],
  "sharedCandidates": [],
  "referenceDocs": [
    "P0-CONTRACT.md",
    "SPLIT-ARCHITECTURE.md",
    "MIGRATION-MAPPING.md"
  ],
  "productionMapping": {
    "domain": [],
    "data": [],
    "model": [],
    "ui": [],
    "shared": []
  },
  "regressionChecklist": []
}
```

每次拆分都要在清单中显式回答：

- 原型入口文件是什么
- section 边界如何划分
- 哪些配置应进入 `data/`
- 哪些交互应进入 `scripts/`
- 哪些样式、导航、脚本应提升到 `shared/`
- 哪些能力只是 demo 演示
- 未来生产代码分别落到哪个层级和文件族

## Workflow

Pipeline: `init → audit → boundary → review → execute → closeout`

**Script-first 原则**：每个阶段必须先调用 gate 脚本确认前置条件，脚本通过后才允许 AI 继续。AI 不得在脚本失败的情况下跳过门禁或直接生成下游工件。

详细命令参数和量化 stop conditions 见 [command-surface.md](references/command-surface.md)。

### Phase 1 — init

1. 运行 `scaffold-split.mjs` 创建目录骨架和最小 `split-manifest.json`。
2. 运行 `validate-manifest.mjs` 确认骨架通过 schema 校验。
3. 找出模块入口文件、规格文档、相关原型页。
4. **Gate 检查点**：`sections/`、`scripts/`、`data/` 目录存在，manifest schema 校验通过，`sections`/`dataFiles`/`scripts` 数组为空（纯骨架）。

### Phase 2 — audit

1. 运行 `phase-gate.mjs --target-phase audit` 确认 init 工件齐全。**gate 失败时停止，不得继续。**
2. 静态扫描源码脚本，提取全局变量、DOM ref、session key、liveState、helpers、events、init 序列。
3. 对每个提取字段标记 `provenance: "extracted"` 并绑定 `sourceInputs` 指纹（参见 [truth-sources.md](references/truth-sources.md)）。
4. AI 可回填亲和标签、分类等 inferred 字段，但必须附 `reason`。
5. 无法分类的项进入 `unknowns[]`，不得静默忽略。
6. 运行 `validate-manifest.mjs` 和 `anti-cheat-check.mjs` 确认工件合规。**校验失败时修复后重跑，不得跳过。**

### Phase 3 — boundary

1. 运行 `phase-gate.mjs --target-phase boundary` 确认 audit 工件齐全。**gate 失败时停止。**
2. 基于 audit-manifest 将每个符号分配到目标文件，定义依赖边和加载顺序。
3. 运行 `validate-manifest.mjs` 和 `anti-cheat-check.mjs` 确认工件合规。
4. 此阶段不设 `reviewApproval` — 留给 Phase 4。

### Phase 4 — review

1. 运行 `phase-gate.mjs --target-phase review` 确认 boundary 工件齐全。
2. 向人工审阅者展示：目标文件结构、函数归属、unknowns/waivers、加载顺序。
3. 获取显式确认后，在 `boundary-map.phase.reviewApproval` 中记录 `approved`、`approvedBy`、`approvedAt`。
4. **未经审批不得进入 Phase 5。**

### Phase 5 — execute

1. 运行 `phase-gate.mjs --target-phase execute` 确认 review 已通过。**approval 缺失时停止。**
2. 按 boundary-map 创建 `sections/*.html`、`scripts/*.js`、`data/*.js`。
3. 同步更新 `split-manifest.json`、`P0-CONTRACT.md`、`SPLIT-ARCHITECTURE.md`、`MIGRATION-MAPPING.md`。
4. 运行 `validate-manifest.mjs`、`drift-check.mjs`、`anti-cheat-check.mjs` 确认文件与 manifest 一致。

### Phase 6 — closeout

1. 运行 `phase-gate.mjs --target-phase closeout` 确认 execute 工件齐全。
2. 产出 `regression-checklist.json`，从 P0-CONTRACT 和页面规格推导 gate items。
3. 确认 must 级回归项有 verdict，closeout schema 校验通过。
4. 运行 `npm run fix` 和 `npm run guard`（如产生代码改动）。

## Monolithic Script / IIFE Handling

当目标源码是 500+ 行的 IIFE 或高耦合单文件脚本时，以下约束生效。

### 识别条件

- 源码包含顶层 IIFE 包裹（`(function() { ... })()` 或 `(() => { ... })()`）
- 源码行数超过 200 行
- 文件内存在 >10 个 helper functions 或 >5 个 DOM refs
- 文件内定义和消费的全局状态变量 >3 个

### Script-first 强制顺序

1. **init 必须先完成**：运行 `scaffold-split.mjs`，确保骨架和空 manifest 存在。
2. **audit 是关键阶段**：对于巨型单文件，audit 的静态扫描结果是所有后续阶段的输入基础。AI 必须先完成提取（extracted 字段），再做分类判断（inferred 字段）。禁止在 audit 阶段直接输出文件拆分结果。
3. **boundary 依赖 audit**：`phase-gate.mjs --target-phase boundary` 会检查 audit-manifest 的 `sourceInputs` 和 `affinityTags` 是否齐全。缺失时拒绝进入。
4. **review 不可跳过**：巨型文件的函数归属和依赖边判断复杂度高，inferred 字段多，必须经人工审阅确认。
5. **execute 严格依赖 approval**：无 `boundary-map.phase.reviewApproval.approved === true` 则 gate 失败。

### IIFE 审计要点

对 IIFE 内部结构的扫描至少覆盖：

| 提取目标 | 归属字段 | 示例 |
|---|---|---|
| IIFE 内 `const`/`let`/`var` 声明 | `iifeConstants[]` | `const MODAL_ID = 'createModal'` |
| IIFE 外全局变量 | `externalGlobals[]` | `window.caseDetailState` |
| DOM refs (`getElementById`, `querySelector`) | `domReferences[]` | `document.getElementById('case-form')` |
| 事件绑定 | `eventListeners[]` | `btn.addEventListener('click', handler)` |
| Helper 函数声明 | `helperFunctions[]` | `function renderCaseRow(data) {...}` |
| SessionStorage / URL params 读写 | `sessionStorage.keys[]`, `sessionStorage.urlParams[]` | `sessionStorage.getItem('caseId')` |
| 初始化调用链 | `initSequence[]` | `DOMContentLoaded → initPage → loadData` |
| 可变状态对象 | `liveState.fields[]` | `state.filters`, `state.selectedRows` |

### IIFE 边界标注要点

boundary-map 对 IIFE 拆分时需要额外注意：

- **闭包捕获**：IIFE 内的函数可能隐式共享闭包变量。标注时必须确认每个函数对闭包变量的读写依赖，并在 `callsOutbound` / `calledByInbound` 中体现。
- **命名空间导出**：拆分后原 IIFE 不再存在，需要通过 `namespaceApi` 定义模块间的公开接口。
- **加载顺序**：IIFE 内部的函数声明被提升，但拆分到多文件后加载顺序变为显式依赖。`loadOrder` 必须可拓扑排序。
- **状态共享**：共享可变状态（如 `liveState`）必须归属到一个文件，其他文件通过命名空间 API 读写。

## Rules

### Script-first 门禁

- 未通过脚本 gate 的阶段禁止进入下一步。gate 脚本失败时，AI 必须先修复工件再重新运行 gate，不得绕过。
- 脚本全绿不等于语义正确；边界归属、shared 抽取和回归 gate 设计仍需人工 review。
- 每个阶段至少调用一次 gate 或 validate 脚本。没有脚本调用记录的阶段产出视为无效。
- 巨型 IIFE 源码必须走完 audit + boundary + review 三阶段才能进入 execute。禁止对 200+ 行源码跳过 audit 直接创建拆分文件。

### 文件职责

- `shared/` 不承载业务概念，不出现"客户""案件""线索"等模块词。（来源：AGENTS.md）
- `sections/*.html` 只承载结构分块，不放业务脚本。
- `scripts/*.js` 按能力拆分，一个文件只负责一种行为域。
- `data/*.js` 放声明式配置、静态演示数据、label map、schema，不放 DOM 编排逻辑。
- reference 文档负责说明"为什么这样拆"和"未来怎么落地"，不把说明塞进 section 文件。
- 所有 demo-only 行为必须单独标注，不能伪装成生产规格。
- 所有未来生产映射必须遵守仓库分层：`domain → data → features/{model,ui} → shared`。（来源：AGENTS.md）

### Manifest 完整性

- `split-manifest.json` 中至少覆盖：`sections`、`dataFiles`、`scripts`、`sharedCandidates`、`referenceDocs`、`productionMapping`、`regressionChecklist`。
- 每个 manifest 字段的 `provenance` 必须遵循 [truth-sources.md](references/truth-sources.md) 和 [field-provenance-registry.json](data/field-provenance-registry.json)：`extracted` 字段绑定 `sourceInputs` 指纹，`inferred` 字段附 `reason`，`human` 字段不得由 AI 填充，无法分类项进入 `unknowns[]`。`validate-manifest.mjs` 始终加载 registry 强制 provenance 等级，`anti-cheat-check.mjs` 对比源码验证 extracted 声明并检查 derived 字段一致性。

### IIFE 特有

- IIFE 内闭包变量的读写关系必须在 audit-manifest 中记录（`iifeConstants[]` 或 `liveState.fields[]`），不得遗漏。
- 拆分后不再有 IIFE 包裹，原闭包变量必须通过 `namespaceApi` 显式导出或转为模块级变量，不得隐式共享。
- 当 IIFE 源码 >200 行且 `unknowns` + `waivers` 为零时，`anti-cheat-check.mjs` 会发出警告——对此类模块零 unknowns 是可疑的，需要复查。

## Anti-Patterns

- 按行数机械切文件，不按职责拆 → 拆出的文件职责不清，后续需要重新整理
- 把 DOM 操作塞进 `data` 文件 → data 层应只放声明式配置，不放行为逻辑
- 共享壳层留在页面入口里继续复制 → 多页面间壳子不同步，维护成本翻倍
- 只有拆分说明，没有生产映射 → 拆分结果无法指导后续代码落地
- 把 P1/P2 能力偷偷带进 P0 契约 → 违反 P0 范围约定，增加首版复杂度
- 直接复用客户模块命名，不替换为当前模块语义 → 命名不匹配模块实际内容
- 对巨型 IIFE 跳过 audit 直接创建文件 → 闭包依赖和加载顺序未厘清，拆分结果不可靠
- IIFE 内部函数当作独立模块导出却不检查闭包捕获 → 运行时引用丢失
- gate 脚本失败后继续生成后续工件 → 门禁形同虚设，错误级联到下游
- 多份 manifest 彼此一致但都错误（自洽造假）→ 必须用 `anti-cheat-check.mjs` 对比源码，而非只做 manifest 间互验

## References

- [split-rules.md](references/split-rules.md) — 拆分判断规则（属于 shared 还是模块层）
- [gold-sample-patterns.md](references/gold-sample-patterns.md) — 金样本目录模式与生产映射示例
- [example-walkthrough.md](references/example-walkthrough.md) — 客户模块拆分逐步演练
- [truth-sources.md](references/truth-sources.md) — 字段 provenance 分类（extracted/inferred/human）与反造假规则
- [command-surface.md](references/command-surface.md) — 5 条流水线命令的边界、I/O 和量化 stop conditions
- [customers-annotated-example.json](data/customers-annotated-example.json) — 客户模块标注样例
- [module-split-blueprint.json](data/module-split-blueprint.json) — 通用拆分结构蓝图
- [field-provenance-registry.json](data/field-provenance-registry.json) — 字段级 provenance 要求注册表（always-on 强制，含 verification method）
- [truth-source-registry.json](data/truth-source-registry.json) — 记录级 provenance 分类注册表（`--check-provenance` 强制）
- [command-surface.json](data/command-surface.json) — 5 条命令的参数、脚本调用序列和量化 stop conditions 机器可读定义
- [split-manifest.schema.json](data/split-manifest.schema.json) — split-manifest 权威 JSON Schema
- [audit-manifest.schema.json](data/audit-manifest.schema.json) — audit-manifest 权威 JSON Schema
- [boundary-map.schema.json](data/boundary-map.schema.json) — boundary-map 权威 JSON Schema
- [regression-checklist.schema.json](data/regression-checklist.schema.json) — regression-checklist 权威 JSON Schema
- [scaffold-split.mjs](scripts/scaffold-split.mjs) — 骨架创建脚本
- [validate-manifest.mjs](scripts/validate-manifest.mjs) — manifest 校验脚本（含 always-on provenance 强制 + `--check-provenance` 深度检查）
- [drift-check.mjs](scripts/drift-check.mjs) — manifest 与文件系统漂移检查
- [anti-cheat-check.mjs](scripts/anti-cheat-check.mjs) — 源码真相对比 + derived 字段一致性 + provenance 合规 + 零 unknowns 警告
- [phase-gate.mjs](scripts/phase-gate.mjs) — 阶段门禁（init → audit → boundary → review → execute → closeout）
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认：

1. 新文件命名一致（kebab-case，与模块语义匹配）
2. `P0-CONTRACT.md` 覆盖当前必须保留的交互和字段
3. `SPLIT-ARCHITECTURE.md` 定义了目录结构和职责边界
4. `MIGRATION-MAPPING.md` 映射到仓库四层生产架构
5. `split-manifest.json` 所有 required key 齐全
6. reference 和 data 文件能独立支撑后续模块复用
7. demo-only 能力和非范围项已标注
8. 巨型 IIFE 场景：`audit-manifest.json` 和 `boundary-map.json` 通过 `validate-manifest.mjs`、`anti-cheat-check.mjs` 校验
9. 巨型 IIFE 场景：`boundary-map.phase.reviewApproval` 已记录人工审批结果
10. 每个阶段的 gate 脚本调用记录可追溯（无跳过）

仓库门禁（适用于产生代码改动的 skill）：

1. 运行 `npm run fix`
2. 运行 `npm run guard`
3. 新增/修改逻辑已补单测（覆盖 model / domain / data）
