---
name: workflow-state-modeler
description: >-
  Model workflow states, events, guard conditions, and invariants for approval,
  rollback, risk confirmation, and document processing flows. Use when defining
  state machines, gate rules, or stage transitions for business processes.
---

# Workflow State Modeler

## Purpose

面向审批、回退、风险确认、文书处理等业务流程，输出结构化的状态机定义——包括状态枚举、事件、守卫条件（Gate）、不变量（Invariant）、和异常路径。

优先级：
1. 正确性——状态转移规则必须与权威流程文档一致
2. 完备性——每个状态都有明确的进入条件、允许事件、和退出路径
3. 可实现性——产出物可直接转化为代码中的状态机定义

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户要求为某个业务流程建模状态机（状态、事件、转移、守卫）
- 用户要求梳理或校验某个流程的 Gate 规则和阻断/放行条件
- 用户要求定义某个业务对象的状态枚举和转移图

示例请求：

- 帮我梳理案件从 S1 到 S9 的完整状态机
- 定义资料项的状态转移和守卫条件
- 帮我建模经营管理签下签后的子阶段流程
- Gate-A/B/C 的触发条件和通过后动作是什么，帮我整理成结构化定义
- 补正循环的状态机是什么样的

## Required Inputs

执行前必须读取：

- `docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md` — 主链路流程定义（S1-S9、Gate-A/B/C）
- `docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md` — 状态枚举、Gate 规则、校验门槛
- `AGENTS.md` — 仓库分层规则（domain 层放纯 TypeScript 状态定义）

需要更多上下文时，再读取：

- `docs/gyoseishoshi_saas_md/P0/06-页面规格/<相关页面>.md` — 确认状态在页面上的呈现方式
- `docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md` — 确认状态枚举在数据模型中的字段定义
- `docs/gyoseishoshi_saas_md/P0/08-术语表.md` — 确认术语一致性
- `docs/gyoseishoshi_saas_md/P0/02-版本范围与优先级.md` — 确认 P0 范围边界

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. **状态机定义文档**（Markdown）— 包含状态枚举、转移表、守卫条件、不变量
2. **状态转移图**（Mermaid stateDiagram）— 可视化状态流转

如果用户要求代码产出，额外产出：

3. **TypeScript 状态定义**（`domain/<module>/` 下）— 状态枚举类型、事件类型、守卫函数签名

### 状态机定义文档必须包含的章节

| # | 章节 | 内容 |
|---|------|------|
| 1 | 状态枚举 | 所有状态的代号、名称、说明 |
| 2 | 事件枚举 | 所有触发状态转移的事件 |
| 3 | 转移表 | 当前状态 × 事件 → 目标状态 + 守卫条件 + 副作用 |
| 4 | 守卫条件（Gate） | 每个 Gate 的触发点、校验内容、通过/失败后动作 |
| 5 | 不变量 | 任何状态下都必须成立的业务约束 |
| 6 | 异常路径 | 回退、撤回、中止等非正常流转 |
| 7 | P0 明确不做 | 不纳入当前版本的状态和转移 |

### 转移表条目最小结构

| 字段 | 说明 |
|------|------|
| from | 当前状态 |
| event | 触发事件 |
| guard | 守卫条件（为空表示无条件） |
| to | 目标状态 |
| effects | 转移成功后的副作用（生成任务、发送通知等） |

### Mermaid 状态图要求

- 使用 `stateDiagram-v2` 语法
- 每个转移标注事件名
- 有守卫条件的转移用 `[guard]` 标注
- 并行/嵌套状态用 `state` 块表示

## Workflow

1. 确认建模目标：哪个业务对象、哪个流程范围、P0 还是全量。
2. 读取 `04-核心流程与状态流转.md`，提取相关的阶段/状态定义。
3. 读取 `03-业务规则与不变量.md`，提取对应的状态枚举、Gate 规则、不变量。
4. 列出所有状态和状态说明。
5. 列出所有事件（用户动作、系统触发、定时触发）。
6. 构建转移表：逐一确认每个 (from, event) 组合的目标状态、守卫条件、副作用。
7. 识别不变量：梳理跨状态的硬性约束（如"提交前必须有未失效的 Gate-B 通过记录"）。
8. 识别异常路径：回退、撤回、中止、补正循环。
9. 生成 Mermaid 状态转移图。
10. 标注 P0 明确不做的状态和转移（引用 `02-版本范围与优先级.md`）。
11. 校验：转移表覆盖所有状态×事件组合；守卫条件与 `03` 文档一致；术语与 `08-术语表.md` 一致。

## Rules

- 状态枚举的代号和名称必须与 `03-业务规则与不变量.md` 中的定义完全一致——不创造新代号。
- Gate 规则必须引用 `03` 或 `04` 中的具体章节编号——不凭记忆概括。
- 转移表中每个守卫条件必须可追溯到 `03` 中的具体规则——不凭空添加限制。
- 不变量必须是可在代码中断言的命题——不放主观判断或偏好。
- P0 不做的状态和转移必须显式列出——防止实现时无意引入。
- 副作用（生成任务、发送通知等）必须与 `04` 中的"通过后动作"一致。
- 如果建模目标涉及子阶段（如 `post_approval_stage`），必须明确子阶段与主阶段的嵌套关系。
- domain 层状态定义必须是纯 TypeScript，不依赖 UI 框架。（来源：AGENTS.md）

## Anti-Patterns

- 用自然语言描述状态流转而不建表——无法转化为代码，也无法校验完备性
- 凭记忆概括 Gate 规则而不引用原文——容易遗漏条件或创造不存在的约束
- 只画正常路径不覆盖异常——回退、撤回、补正、中止等路径是高频 bug 来源
- 把 P1/P2 的状态混入 P0 定义——扩大实现范围，增加首版复杂度
- 把页面交互逻辑混入状态机定义——状态机定义属于 domain 层，UI 行为属于 features 层
- 在守卫条件中使用模糊表述（"资料基本齐全""大致通过"）——守卫条件必须是可判定的布尔表达式

## References

- [04-核心流程与状态流转.md](../../docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md) — 主链路流程定义
- [03-业务规则与不变量.md](../../docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md) — 状态枚举与 Gate 规则
- [07-数据模型设计.md](../../docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md) — 数据模型中的状态字段
- [08-术语表.md](../../docs/gyoseishoshi_saas_md/P0/08-术语表.md) — 术语一致性基线
- [AGENTS.md](../../AGENTS.md) — 分层规则
- [example-walkthrough.md](references/example-walkthrough.md) — 案件主链路 S1–S9 状态建模演练
- [prototype-split-orchestrator SKILL.md](../prototype-split-orchestrator/SKILL.md) — 流水线编排 skill（模块涉及状态流转时可按需触发本 skill）
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Pipeline Position

本 skill 不在拆分流水线的必经路径上，而是按需触发的可选步骤。

- **触发时机**：`prototype-module-split` execute 完成后、spec sync 之前最合适（由 `prototype-split-orchestrator` 判断是否需要触发）
- **触发条件**：模块涉及审批、回退、状态流转等业务流程，需要状态机定义
- **产出用途**：状态机定义（转移表 + 守卫条件 + 不变量）可作为 `page-spec-generator`（状态与异常态章节）和 `prototype-regression-checklist`（状态相关 Gate）的输入参照

## Completion

完成后逐项确认：

1. 所有状态都有明确的代号、名称、说明
2. 所有事件都已列出（用户动作 + 系统触发）
3. 转移表覆盖了所有有效的 (from, event) 组合
4. 每个守卫条件都引用了 `03` 文档的具体章节
5. 不变量都是可在代码中断言的命题
6. 异常路径（回退/撤回/中止/补正）已覆盖
7. Mermaid 状态图生成且与转移表一致
8. P0 明确不做的状态和转移已标注
9. 术语与 `08-术语表.md` 一致
10. 如有 TypeScript 产出，类型定义符合 domain 层纯 TypeScript 约束
