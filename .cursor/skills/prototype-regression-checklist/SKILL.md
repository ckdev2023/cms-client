---
name: prototype-regression-checklist
description: >-
  Generate REGRESSION-GATE.md with scenario-based gates and per-item verification.
  Use when building regression checklists for prototype splits or refactors.
---

# Prototype Regression Checklist

## Purpose

为已拆分的原型模块生成基于场景的回归验收门槛文档（`REGRESSION-GATE.md`），把 P0-CONTRACT 中的状态与异常态拆解为可逐项打勾的 Gate，每个 Gate 聚焦一个关键风险场景。

优先级：
1. Gate 覆盖完备——所有 P0-CONTRACT 中列出的状态与异常态都有对应 Gate
2. 验收项可操作——每项有明确的通过/失败判定标准
3. 标记分类准确——`[原型]` / `[生产约束]` / `[跨模块]` 分类与实际可验证性一致

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户要求为一个原型模块创建 `REGRESSION-GATE.md`
- 用户要求从 P0-CONTRACT 推导回归验收门槛
- 用户要求梳理某个模块的关键风险场景和验收用例
- 用户要求对已有 REGRESSION-GATE.md 做补全或更新
- **流水线触发**：`prototype-module-split` 的 execute（Phase 5）完成且 `page-spec-generator` 已完成 spec sync 后，由 `prototype-split-orchestrator` 路由到此 skill

示例请求：

- 帮 settings 模块写回归验收门槛
- 从 billing 的 P0-CONTRACT 推导 REGRESSION-GATE
- 梳理案件模块的关键风险场景
- 补全 documents 的 REGRESSION-GATE 缺失的 Gate
- 为客户模块创建回归验收清单
- case 模块拆分和规格同步都做完了，帮我建回归门槛

## Required Inputs

执行前必须读取：

- `packages/prototype/admin/{module}/P0-CONTRACT.md` — 当前模块的 P0 约束清单（状态与异常态为核心输入）
- `packages/prototype/admin/{module}/split-manifest[-suffix].json` — 拆分清单（确认 execute 已完成，`regressionChecklist` 部分只保留 id/ref）
- `docs/gyoseishoshi_saas_md/P0/06-页面规格/{module}.md` — 页面规格（字段、操作、权限、异常态）
- `AGENTS.md` — 仓库门禁规则（最终验收需 fix + guard）

流水线上下文（当由 orchestrator 路由触发时，优先读取）：

- `packages/prototype/admin/{module}/split-manifest[-suffix].json` — 机器可读拆分清单（`regressionChecklist` 部分为本 skill 的结构化输入）
- `packages/prototype/admin/{module}/audit-manifest[-suffix].json` — 全局状态审计（Gate 场景来源之一，`extracted` 字段为源码真相）
- `packages/prototype/admin/{module}/boundary-map[-suffix].json` — 边界图（确认拆分后模块划分，`inferred` 字段需人工复查）

金样本（必读）：

- `packages/prototype/admin/billing/REGRESSION-GATE.md` — 收费模块回归门槛（6 Gate，含跨模块和并发场景）
- `packages/prototype/admin/documents/REGRESSION-GATE.md` — 资料中心回归门槛（7 Gate，含共享版本联动）

需要更多上下文时，再读取：

- `packages/prototype/admin/{module}/SPLIT-ARCHITECTURE.md` — 拆分架构（确认模块边界）
- `packages/prototype/admin/{module}/MIGRATION-MAPPING.md` — 生产映射（`[生产约束]` 项的实现指引）
- `docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md` — 业务规则（守卫条件、权限规则）
- `docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md` — 状态转移（异常路径来源）

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. `REGRESSION-GATE.md` — 场景化回归验收门槛文档
2. `regression-checklist.json` — 机器可读回归清单
3. `split-manifest.json` 更新 — 只同步 `regressionChecklist` 的 id/ref

### REGRESSION-GATE.md 结构

骨架模板见 [regression-gate-template.md](references/regression-gate-template.md)（可直接复制填充）。必须包含 5 个章节：文档头、Gate 1..N、验收流程、Gate 失败处理、与现有文档的关系。

### 标记分类规则

- `[原型]` — 原型中可直接视觉/交互验证，每轮提交前验证
- `[生产约束]` — 生产代码阶段满足，原型仅文档记录
- `[跨模块]` — 涉及其他模块一致性，联调时验证

分类判断流程详见 [gate-design-guide.md](references/gate-design-guide.md)。

### 机器可读回归清单

人类可读的 `REGRESSION-GATE.md` 与机器可读的 `regression-checklist.json` 互补。后者的权威结构定义见 [regression-checklist.schema.json](../prototype-module-split/data/regression-checklist.schema.json)，由本 skill 产出；`prototype-module-split` 的 closeout 只负责校验它与其他工件对齐。`split-manifest.json` 中的 `regressionChecklist` 只保留 id/ref，不双写完整内容。

## Workflow

1. 确认目标模块和已有拆分产物（P0-CONTRACT / SPLIT-ARCHITECTURE / split-manifest）。
2. 读取金样本 `billing/REGRESSION-GATE.md` 和 `documents/REGRESSION-GATE.md`，掌握 Gate 结构和粒度。
3. 读取目标模块的 `P0-CONTRACT.md`，提取"状态与异常态"章节的全部状态。
4. 读取目标模块的页面规格（`06-页面规格/{module}.md`），补充权限、操作、反馈相关的验收维度。
5. 将每种关键状态/异常态映射为一个 Gate：
   - **空状态** → Gate（无数据时的引导与占位）
   - **全部完成/结清** → Gate（终态的状态标识与交互禁用）
   - **逾期/过期/异常** → Gate（视觉强调、升级入口、排序规则）
   - **权限不足** → Gate（角色×操作的可见性与可用性）
   - **并发修改** → Gate（乐观锁/冲突处理）
   - **返回规则** → Gate（入口×返回的上下文保持）
   - 如有模块特有风险场景（如共享版本联动），追加专属 Gate。
6. 为每个 Gate 编写验收项：
   - 每项必须是可判定的（视觉可见 / 交互可触发 / 配置可检查）。
   - 每项标注 `[原型]` / `[生产约束]` / `[跨模块]`。
   - 每项引用 P0-CONTRACT 的具体章节和条目编号。
7. 编写 Gate 通过标准（区分原型项和生产约束项）。
8. 编写验收流程章节（每轮提交前 + 最终验收 + Gate 失败处理）。
9. 编写"与现有文档的关系"对照表。
10. 生成 `regression-checklist.json`，写入 Gate、items、contractRef、closeoutStatus 初始结构。
11. 校验 `split-manifest.json` 的 `regressionChecklist`，确保与 `regression-checklist.json` / `REGRESSION-GATE.md` 的 Gate ID 一致。
12. 对照金样本检查：Gate 数量是否合理（通常 5–8 个）；标记分类是否准确；P0-CONTRACT 引用是否完整。

## Rules

### 结构化工件与真相源

- 回归项的场景来源优先从结构化工件（`split-manifest.json`、`audit-manifest.json`）提取，而非仅从 Markdown 文档人工概括。
- `audit-manifest` 中标记为 `extracted` 的字段（如全局状态、DOM ref、session key）已绑定源码指纹，可直接作为 Gate 场景依据。
- `audit-manifest` / `boundary-map` 中标记为 `inferred` 的字段（如亲和标签、归属判断）是 AI 辅助判断，Gate 引用这些字段时应标注"需人工确认"。
- `regression-checklist.json` 是回归项的机器可读权威清单；`REGRESSION-GATE.md` 是人类可读的场景化验收文档；`split-manifest.regressionChecklist` 只保存 id/ref。三者互补，不得双写完整正文。

### 通用规则

- 每个 Gate 必须聚焦一个风险场景——不合并不相关的验收维度。
- 验收项必须引用 P0-CONTRACT 的具体章节编号——不凭记忆概括。
- `[原型]` 标记仅用于可在原型中直接视觉/交互验证的项——不把生产约束标为原型项。
- `[生产约束]` 项必须在 MIGRATION-MAPPING.md 中有对应的实现说明——不能只标 deferred 无去处。
- `[跨模块]` 项必须注明依赖的模块名——不写"涉及其他模块"这种模糊描述。
- Gate 通过标准必须区分"必须通过"和"可延迟"两级——不一刀切全部要求。
- REGRESSION-GATE.md 按**场景**组织验收项；P0-CONTRACT 拆分回归清单按**功能区域**组织——两者互补不重复。
- 最终验收必须包含 `npm run fix` + `npm run guard` 通过。（来源：AGENTS.md）
- demo-only 行为的验收项必须明确标注为"原型演示验证"——不混入生产规格验收。

## Anti-Patterns

- 把 P0-CONTRACT 的回归清单原样抄进 REGRESSION-GATE → 两份清单职责重叠，维护时必有一份过期
- 只覆盖正常路径不覆盖异常态 → 空状态、权限不足、并发冲突是高频 bug 来源
- 所有验收项都标 `[原型]` 而忽略生产约束 → 生产阶段无验收基线，约束落空
- 验收项写"功能正常"而非具体可判定条件 → 无法标准化验收，不同人理解不同
- Gate 数量过多（>10）导致验收负担过重 → 应合并同类场景，保持 5–8 个 Gate
- 不引用 P0-CONTRACT 章节编号 → 规格变更时无法追溯，REGRESSION-GATE 与 CONTRACT 脱钩
- 跳过金样本直接编写 → 格式和粒度跑偏，与已有模块不一致

## References

- [gate-design-guide.md](references/gate-design-guide.md) — Gate 设计规则、标记分类判断流程、Gate 数量指引
- [gate-scenario-catalog.md](references/gate-scenario-catalog.md) — 通用 Gate 场景目录与金样本索引
- [regression-gate-template.md](references/regression-gate-template.md) — REGRESSION-GATE.md 骨架模板（可直接复制填充）
- `packages/prototype/admin/billing/REGRESSION-GATE.md` — 金样本（收费模块，6 Gate）
- `packages/prototype/admin/documents/REGRESSION-GATE.md` — 金样本（资料中心模块，7 Gate）
- `packages/prototype/admin/customers/P0-CONTRACT.md` — 客户模块 P0 约束清单（回归清单参考）
- [example-walkthrough.md](references/example-walkthrough.md) — billing 模块 Gate 设计逐步演练
- [prototype-split-orchestrator SKILL.md](../prototype-split-orchestrator/SKILL.md) — 流水线编排 skill（本 skill 在 spec sync 之后、closeout 之前被路由触发）
- [prototype-module-split SKILL.md](../prototype-module-split/SKILL.md) — 拆分 skill（产出 split-manifest 和 P0-CONTRACT，是本 skill 的前置输入）
- [page-spec-generator SKILL.md](../page-spec-generator/SKILL.md) — 页面规格 skill（spec sync 完成后的输出是本 skill 的上游依赖——回归项中的字段名和状态枚举应与已同步规格一致）
- [delivery-guardrail SKILL.md](../delivery-guardrail/SKILL.md) — 交付门禁 skill（本 skill 完成后，orchestrator 路由到 guardrail 做最终 `fix` + `guard`）
- [regression-checklist.schema.json](../prototype-module-split/data/regression-checklist.schema.json) — regression-checklist 权威 JSON Schema（机器可读回归清单的结构定义）
- [truth-sources.md](../prototype-module-split/references/truth-sources.md) — 字段 provenance 分类（extracted/inferred/human），理解上游工件字段可信度
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Pipeline Position

本 skill 位于拆分流水线的 `regression` 阶段（在 `spec sync` 之后、`closeout` 之前、`guardrail` 之前）。

- **上游依赖**：`page-spec-generator`（spec sync 完成，页面规格中的字段和状态定义已与拆分结果对齐）
- **下游消费者**：`prototype-module-split` Phase 6 closeout（收口校验 `split-manifest` / 页面规格 / `regression-checklist` 的一致性），随后才是 `delivery-guardrail`
- **结构化工件消费**：
  - `regression-checklist.json` → Gate / items / contractRef / closeoutStatus：本 skill 的机器可读主输出
  - `split-manifest.json` → `regressionChecklist[]`：本 skill 只回写轻量 id/ref；这些引用是从 `regression-checklist.json` 派生的，不是独立权威正文
  - `audit-manifest.json` → `extracted` 字段（全局状态、DOM ref）：可直接作为 Gate 场景依据
  - `audit-manifest.json` / `boundary-map.json` → `inferred` 字段（亲和标签、归属判断）：Gate 引用时标注"需人工确认"
  - `P0-CONTRACT.md` → "状态与异常态"章节：Gate 场景的主要文本来源

## Completion

完成后逐项确认：

1. REGRESSION-GATE.md 包含文档头（权威来源 + 标记说明）
2. 每个 P0-CONTRACT "状态与异常态"条目都有对应 Gate
3. 每个 Gate 有验收场景描述、验收项表、通过标准
4. 验收项标记分类正确（`[原型]` / `[生产约束]` / `[跨模块]`）
5. 每个验收项引用了 P0-CONTRACT 的具体章节编号
6. 验收流程章节完整（每轮提交前 + 最终验收 + Gate 失败处理）
7. "与现有文档的关系"对照表已编写
8. `regression-checklist.json` 已生成，且与 `REGRESSION-GATE.md` 的 Gate ID 一致
9. `split-manifest.json` 的 `regressionChecklist` 仅保留 id/ref，并与 `regression-checklist.json` 一致
10. Gate 数量合理（5–8 个），无不相关维度的合并
11. 格式与金样本（billing / documents）一致
