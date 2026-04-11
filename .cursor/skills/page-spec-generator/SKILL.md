---
name: page-spec-generator
description: >-
  Derive page specifications from business flows and prototypes: fields,
  operations, states, permissions, exceptions. Use when generating or updating
  page specs in 06-页面规格/, or deriving spec from prototype + flow docs.
---

# Page Spec Generator

## Purpose

从业务流程文档和原型页面推导页面规格——字段定义、操作列表、状态与异常态、权限边界、交互约束，产出符合现有 `06-页面规格/` 模板的结构化规格文档。

优先级：
1. 规格完整性——页面上的每个可见元素和可触发操作都有定义
2. 一致性——字段名、状态名、术语与上游文档（03/04/07/08）一致
3. 可验收性——规格中的每条规则都能转化为测试用例

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户要求为某个页面生成或更新页面规格文档
- 用户要求从原型推导页面规格
- 用户要求从流程文档推导某个页面应有的字段和操作
- **流水线触发（拆分后同步）**：`prototype-module-split` 的 execute（Phase 5）完成后、`closeout`（Phase 6）之前，拆分结果可能影响页面规格中的字段定义、操作列表、状态与异常态等章节。由 `prototype-split-orchestrator` 路由到此 skill 做增量同步——只更新受拆分影响的章节，不重写整份规格文档。

示例请求：

- 帮我为资料中心页面生成页面规格
- 从案件详情原型推导页面规格文档
- 根据核心流程文档，推导案件创建页的字段和操作规格
- 更新客户页面规格，增加详情 Tab 的规格定义
- 页面规格里缺少文书中心的异常态定义，帮我补上
- case 模块拆分完了，帮我同步受影响的页面规格章节

## Required Inputs

执行前必须读取：

- `docs/gyoseishoshi_saas_md/P0/06-页面规格/` 下至少一个已有规格文档 — 掌握模板格式和粒度标准
- `docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md` — 流程上下文，确认页面在主链路中的位置
- `docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md` — 校验规则、权限规则、状态枚举
- `AGENTS.md` — 仓库分层规则

金样本（必读）：

- `docs/gyoseishoshi_saas_md/P0/06-页面规格/客户.md` — 最完整的页面规格示例（列表+弹窗+批量+草稿+权限）
- `packages/prototype/admin/customers/P0-CONTRACT.md` — 原型拆分约束清单如何与页面规格对应

拆分后同步上下文（当由 orchestrator 路由触发时，优先读取）：

- `packages/prototype/admin/<module>/split-manifest[-suffix].json` — 拆分清单（`sections`/`scripts`/`dataFiles` 反映拆分后的文件结构，`productionMapping` 反映生产落地层级）
- `packages/prototype/admin/<module>/P0-CONTRACT.md` — 拆分后更新的 P0 约束清单（"字段与列定义""操作与交互""状态与异常态"章节可能有变动）
- `packages/prototype/admin/<module>/SPLIT-ARCHITECTURE.md` — 拆分架构（确认 sections 边界如何影响页面规格的 Tab/区块结构）

需要更多上下文时，再读取：

- `packages/prototype/admin/<module>/` — 原型拆分产物（sections / scripts / data）
- `docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md` — 数据模型中的实体和字段定义
- `docs/gyoseishoshi_saas_md/P0/08-术语表.md` — 术语一致性
- `docs/gyoseishoshi_saas_md/P0/02-版本范围与优先级.md` — P0 范围边界
- `docs/gyoseishoshi_saas_md/P0/05-信息架构与页面地图.md` — 页面在整体导航中的位置

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. `docs/gyoseishoshi_saas_md/P0/06-页面规格/<页面名>.md` — 页面规格文档

### 页面规格文档必须包含的章节

| # | 章节 | 内容 |
|---|------|------|
| 1 | 页面概述 | 页面在主链路中的位置、入口路径、核心用途 |
| 2 | 列表/主视图字段 | 字段表：列头、规格字段、控件类型、可见性（响应式）、排序 |
| 3 | 搜索与筛选 | 搜索范围、筛选维度表（维度/控件/默认值）、数据范围切换 |
| 4 | 操作列表 | 单条操作和批量操作表：操作名、控件、前置条件、副作用 |
| 5 | 表单/弹窗字段 | 表单字段表：字段名、控件类型、必填、校验规则、备注 |
| 6 | 状态与异常态 | 所有页面状态表：状态名、规格要求、当前原型状态 |
| 7 | 通知与反馈 | Toast/提示表：触发场景、标题、描述 |
| 8 | 权限与可见性 | 角色×可见范围×可编辑范围×可导出 |
| 9 | P0 明确不做 | 不纳入首版的能力，标注后置版本和原因 |
| 10 | 原型演示专属能力 | 仅为原型演示的功能，标注保留但不作为生产规格 |

如果页面有详情视图（如 Tab 结构），额外包含：

| # | 章节 | 内容 |
|---|------|------|
| 11 | 详情 Tab 结构 | Tab 列表、每个 Tab 的字段和操作 |

### 字段表最小结构

| 列 | 说明 |
|----|------|
| # | 序号 |
| 字段/列头 | 显示名称 |
| 规格字段 | 数据模型中的字段名 |
| 控件类型 | 文本/选择/日期/文件等 |
| 必填 | 是/否/条件必填 |
| 可见性 | 始终可见 / md+ / lg+ |
| 备注 | 校验规则、条件、说明 |

### 操作表最小结构

| 列 | 说明 |
|----|------|
| # | 序号 |
| 操作名 | 动作名称 |
| 控件 | 按钮/链接/select+应用 |
| 前置条件 | 触发操作的前提（选中N条、字段有值等） |
| 副作用 | 操作成功后的效果（状态变更、Toast、导航等） |
| 约束 | 业务规则约束（需留痕、需确认等） |

## Workflow

1. 确认目标页面和规格范围（全新 or 更新某章节）。
2. 读取至少一个已有页面规格（优先 `客户.md`），掌握模板格式。
3. 读取 `04-核心流程与状态流转.md`，确认页面在主链路中的位置和关联阶段。
4. 读取 `03-业务规则与不变量.md`，提取页面相关的规则、状态枚举、权限定义。
5. 如有原型，读取原型拆分产物（`P0-CONTRACT.md`、sections、data config），盘点原型已实现的字段和交互。
6. 推导列表/主视图字段表——从数据模型和原型表格列推导。
7. 推导搜索和筛选——从原型筛选栏和业务规则推导。
8. 推导操作列表——从原型按钮/动作和流程步骤推导。
9. 推导表单/弹窗字段——从原型弹窗和数据模型推导。
10. 推导状态与异常态——从流程文档中的状态枚举推导，对照原型现状。
11. 推导通知与反馈——从原型 Toast 和操作副作用推导。
12. 推导权限与可见性——从 `03` 的权限规则推导。
13. 列出 P0 明确不做项——从 `02-版本范围` 和页面上下文推导。
14. 标注原型演示专属能力——区分 demo-only 和生产规格。
15. 校验：字段名与 `07-数据模型` 一致；术语与 `08-术语表` 一致；状态枚举与 `03` 一致；P0 范围与 `02` 一致。

## Rules

### 拆分后同步规则

- 拆分后同步只更新受影响的章节，不重写整份规格文档。典型受影响章节：字段表（拆分可能细化 data config 字段）、操作列表（拆分可能拆解复合操作）、状态与异常态（P0-CONTRACT 更新后可能有新增或修正）、详情 Tab 结构（sections 边界变化）。
- 同步时以 `split-manifest.json` 中的 `dataFiles` 和 `scripts` 为结构化真相源（这些字段标记为 `extracted`，已绑定源码指纹），不凭记忆推测拆分后的文件结构。
- `split-manifest.json` 中的 `productionMapping` 是 AI 推断的生产落地建议（标记为 `inferred`），页面规格引用这些映射时应标注为"预期生产结构"而非确定事实。
- 同步完成后，由 `prototype-split-orchestrator` 路由到 `prototype-regression-checklist` 建立回归门槛。

### 通用规则

- 页面规格文档必须遵循 `06-页面规格/` 目录下已有文档的格式和章节结构——不自造新模板。
- 字段名必须与 `07-数据模型设计.md` 中的实体字段名一致——发现不一致时优先以数据模型为准，标注差异。
- 状态枚举必须与 `03-业务规则与不变量.md` 中的定义一致——不创造新状态。
- 权限定义必须引用 `03` 中的角色与可见性规则——不凭空增减角色。
- P0 明确不做项必须与 `02-版本范围与优先级.md` 对齐——禁止把 P0 排除项偷偷引入规格。
- 原型演示专属能力必须显式标注——不让 demo-only 行为被误认为生产规格。
- 每条操作的"前置条件"和"副作用"必须可转化为测试用例断言。
- 条件必填字段必须说明条件逻辑（如"电话/邮箱至少填一项"）。
- 双入口页面（如资料中心同时有跨案件列表和案件详情 Tab 入口）统一在一个规格文件中分章节描述——不拆成两个文件。

## Anti-Patterns

- 只列字段名不定义控件类型和校验规则——无法指导 UI 开发和测试
- 从原型反推规格而不校验流程文档——原型可能遗漏或偏离业务规则
- 写"权限另定"而不给出具体角色矩阵——推迟权限定义会导致实现时全开或全关
- 把异常态留白为"待定义"——异常态（空状态、错误态、无权限态）是高频 bug 来源
- 把操作的前置条件和副作用合并写为一句话——前置条件和副作用是不同的关注点
- 忽略原型演示标注——导致开发团队实现了 demo-only 行为
- 把多个页面的规格写在同一个文件中——每个页面独立文件，避免耦合

## References

- [06-页面规格/客户.md (金样本)](../../docs/gyoseishoshi_saas_md/P0/06-页面规格/客户.md) — 页面规格格式和粒度标准
- [P0-CONTRACT.md (customers 金样本)](../../packages/prototype/admin/customers/P0-CONTRACT.md) — 原型约束清单如何对应页面规格
- [04-核心流程与状态流转.md](../../docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md) — 流程上下文
- [03-业务规则与不变量.md](../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md) — 校验规则和权限
- [07-数据模型设计.md](../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md) — 数据模型字段定义
- [08-术语表.md](../../docs/gyoseishoshi_saas_md/P0/08-术语表.md) — 术语一致性
- [AGENTS.md](../../AGENTS.md) — 仓库分层规则
- [example-walkthrough.md](references/example-walkthrough.md) — 客户页面规格生成逐步演练
- [prototype-split-orchestrator SKILL.md](../prototype-split-orchestrator/SKILL.md) — 流水线编排 skill（拆分 execute 后、closeout 前路由到本 skill 做规格同步）
- [prototype-module-split SKILL.md](../prototype-module-split/SKILL.md) — 拆分 skill（产出 split-manifest 和 P0-CONTRACT，是同步场景的结构化输入）
- [prototype-regression-checklist SKILL.md](../prototype-regression-checklist/SKILL.md) — 回归验收 skill（spec sync 完成后，orchestrator 路由到此 skill 建立回归门槛；回归项引用本 skill 输出的字段和状态定义）
- [split-manifest.schema.json](../prototype-module-split/data/split-manifest.schema.json) — split-manifest 权威 JSON Schema（`dataFiles`/`scripts` 为 `extracted`，`productionMapping` 为 `inferred`）
- [truth-sources.md](../prototype-module-split/references/truth-sources.md) — 字段 provenance 分类（extracted/inferred/human），判断上游字段可信度
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Pipeline Position

本 skill 位于拆分流水线的 `spec sync` 阶段（在 `execute` 之后、`regression` 之前、`closeout` 之前）。

- **上游依赖**：`prototype-module-split`（execute 完成，split-manifest / P0-CONTRACT / SPLIT-ARCHITECTURE 已产出）
- **下游消费者**：`prototype-regression-checklist`（回归项引用页面规格的字段和状态定义）
- **同步范围**：只更新受拆分影响的规格章节（如新增的 sections 影响详情 Tab 结构、新拆分的 scripts 影响操作列表），不重写整份规格文档
- **字段来源**：`split-manifest.json` 中 `sections[].purpose`（inferred）和 `dataFiles[].exports`（extracted）均可作为规格推导的参照——extracted 字段优先于 inferred 字段

## Completion

完成后逐项确认：

1. 规格文档包含全部 10 个必须章节（+详情 Tab 如适用）
2. 每个字段都有控件类型和可见性定义
3. 每条操作都有前置条件和副作用
4. 状态与异常态已覆盖（包括空状态、错误态）
5. 权限矩阵已覆盖所有角色
6. P0 明确不做项已列出
7. 原型演示专属能力已标注
8. 字段名与 `07-数据模型设计.md` 一致
9. 术语与 `08-术语表.md` 一致
10. 状态枚举与 `03-业务规则与不变量.md` 一致
