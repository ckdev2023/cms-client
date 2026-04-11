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

示例请求：

- 帮 settings 模块写回归验收门槛
- 从 billing 的 P0-CONTRACT 推导 REGRESSION-GATE
- 梳理案件模块的关键风险场景
- 补全 documents 的 REGRESSION-GATE 缺失的 Gate
- 为客户模块创建回归验收清单

## Required Inputs

执行前必须读取：

- `packages/prototype/admin/{module}/P0-CONTRACT.md` — 当前模块的 P0 约束清单（状态与异常态为核心输入）
- `docs/gyoseishoshi_saas_md/P0/06-页面规格/{module}.md` — 页面规格（字段、操作、权限、异常态）
- `AGENTS.md` — 仓库门禁规则（最终验收需 fix + guard）

金样本（必读）：

- `packages/prototype/admin/billing/REGRESSION-GATE.md` — 收费模块回归门槛（6 Gate，含跨模块和并发场景）
- `packages/prototype/admin/documents/REGRESSION-GATE.md` — 资料中心回归门槛（7 Gate，含共享版本联动）

需要更多上下文时，再读取：

- `packages/prototype/admin/{module}/SPLIT-ARCHITECTURE.md` — 拆分架构（确认模块边界）
- `packages/prototype/admin/{module}/split-manifest.json` — 机器可读拆分清单（`regressionChecklist` 部分）
- `packages/prototype/admin/{module}/MIGRATION-MAPPING.md` — 生产映射（`[生产约束]` 项的实现指引）
- `docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md` — 业务规则（守卫条件、权限规则）
- `docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md` — 状态转移（异常路径来源）

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. `REGRESSION-GATE.md` — 场景化回归验收门槛文档
2. `split-manifest.json` 更新 — 补全或校验 `regressionChecklist` 部分

### REGRESSION-GATE.md 必须章节

| # | 章节 | 内容 |
|---|------|------|
| 1 | 文档头 | 权威来源引用、用途说明、标记说明（`[原型]` / `[生产约束]` / `[跨模块]`） |
| 2 | Gate 1..N | 每个 Gate 一个独立章节，按风险场景组织 |
| 3 | 验收流程 | 每轮实现提交前的自检→回归→标记流程 |
| 4 | Gate 失败处理 | 原型项/生产约束/跨模块三类项的失败处理规则 |
| 5 | 与现有文档的关系 | P0-CONTRACT / split-manifest / MIGRATION-MAPPING 的职责分工 |

### 单个 Gate 最小结构

```markdown
## Gate N — <场景名称>

验收场景：<一句话描述该 Gate 聚焦的风险场景>

| # | 验收项 | 标记 | P0-CONTRACT 引用 |
|---|--------|------|-----------------|
| N.1 | <可验证的具体条件> | `[原型]` / `[生产约束]` / `[跨模块]` | §<章节> #<条目> |

**通过标准**：<哪些项必须通过，哪些可延迟>
```

### 标记分类规则

| 标记 | 含义 | 验证时机 |
|------|------|---------|
| `[原型]` | 原型中可直接视觉/交互验证 | 每轮实现提交前 |
| `[生产约束]` | 生产代码实现时需满足，原型仅在文档中记录 | 生产代码阶段 |
| `[跨模块]` | 涉及其他模块的一致性 | 跨模块联调时 |

### 验收流程最小结构

```markdown
## 验收流程

### 每轮实现提交前

1. **自检**：开发者按 Gate 1–N 逐项确认自己的实现范围
2. **回归**：至少覆盖当前实现范围涉及的所有 Gate 项
3. **标记**：已通过标 `[x]`，未通过必须修复后再提交

### 最终验收

1. 本文档全部 `[原型]` 项通过
2. `P0-CONTRACT.md` 拆分回归清单全部通过
3. `split-manifest.json` 的 `regressionChecklist` 全部通过
4. `npm run fix` + `npm run guard` 通过

### Gate 失败处理

- `[原型]` 项未通过：该轮实现不可合入
- `[生产约束]` 项可标记为 `[deferred]`，但必须在 MIGRATION-MAPPING.md 中有对应说明
- `[跨模块]` 项若对方未就绪，标记为 `[blocked: 模块名]`
```

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
10. 校验 `split-manifest.json` 的 `regressionChecklist`，确保与 REGRESSION-GATE.md 的 Gate 项一致。
11. 对照金样本检查：Gate 数量是否合理（通常 5–8 个）；标记分类是否准确；P0-CONTRACT 引用是否完整。

## Rules

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
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认：

1. REGRESSION-GATE.md 包含文档头（权威来源 + 标记说明）
2. 每个 P0-CONTRACT "状态与异常态"条目都有对应 Gate
3. 每个 Gate 有验收场景描述、验收项表、通过标准
4. 验收项标记分类正确（`[原型]` / `[生产约束]` / `[跨模块]`）
5. 每个验收项引用了 P0-CONTRACT 的具体章节编号
6. 验收流程章节完整（每轮提交前 + 最终验收 + Gate 失败处理）
7. "与现有文档的关系"对照表已编写
8. `split-manifest.json` 的 `regressionChecklist` 与 Gate 项一致
9. Gate 数量合理（5–8 个），无不相关维度的合并
10. 格式与金样本（billing / documents）一致
