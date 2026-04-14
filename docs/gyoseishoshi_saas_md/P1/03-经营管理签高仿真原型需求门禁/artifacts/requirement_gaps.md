# Requirement Gaps

## Explicit Facts
- 原始流程文档要求经营管理签覆盖 Step 1–20，并给出完整状态枚举、核心字段、业务规则与提醒机制。
- 现有 P1 文档已经冻结“双层状态模型”：P0 管理层阶段继续使用 `S1–S9`，经管签专属步骤进入 P1 子步骤。
- 现有分析已确认高仿真原型主要承载在 `packages/prototype/admin/leads-message/`、`customers/`、`case/`。
- 原始流程明确要求补正可循环、尾款先于 COE、在留期间记录先于成功结案、提醒失败不得自动成功结案。

## Inferred Assumptions
- 高仿真原型阶段允许使用 mock 数据和本地交互，不要求真实网络或真实文件能力。
- 问卷、文书、提交包、提醒任务、审计记录在原型中以可见状态与交互反馈承载，不要求真实后台执行。
- 高仿真原型优先延续现有 prototype 信息架构，以降低后续迁移到真实页面规格的返工成本。

## Missing Decisions
无。当前需要冻结的是“高仿真原型可演示范围”，而不是生产实现细节；未决技术项已显式排除。

## Conflicts
- 原始流程文档使用 `CONSULTING / APPROVED / COE_SENT / CLOSED_SUCCESS` 等业务状态；P0 文档使用 `Case.stage = S1–S9`。该冲突已在 P1 文档中冻结为“双层状态模型”，当前无未解决冲突。

## Blockers
无