# Phase 0：契约冻结与建模决策

## 阶段目标

- 在写生产代码前，冻结客户列表/详情 DTO、关系模型以及 P1 `bmvProfile` 字段口径。
- 避免 server / admin / prototype 三套模型继续分叉。

## 前置条件

- 已阅读 `plan/customer-module-p0-p1-plan.md`
- 已核对 P0 / P1 权威文档与当前 `customers`、`contact-persons`、`admin customers` 代码现状

## 原子任务

| ID | 原子任务 | 输入依据 | 产出 | 完成标准 |
|---|---|---|---|---|
| `CM-001` | 整理 P0 客户列表字段契约 | P0 页面规格、`customers.query.ts`、`types.ts` | 列表 DTO 字段清单 | 字段含义、空值口径、筛选字段全部明确 |
| `CM-002` | 整理 P0 客户详情字段契约 | P0 页面规格、`CustomerDetailView.vue`、`types.ts` | 详情 DTO 字段清单 | 顶部摘要、Tab 数据字段都有来源说明 |
| `CM-003` | 决策 CustomerRelation 服务端模型 | P0 数据模型、`contactPersons.service.ts`、前端关系 Tab | 关系模型结论 | 明确选 `customer_relations` 或复用 `contact_persons` |
| `CM-004` | 冻结 P1 `bmvProfile` 字段与状态枚举 | P1 页面规格、prototype 承接流 | `bmvProfile` 字段表 | `questionnaire / quote / sign / intake` 状态机明确 |
| `CM-005` | 定义 admin ↔ server 映射规则 | `CM-001`、`CM-002`、`CM-004` | 字段映射与 adapter 规则 | 每个前端字段都有 server 来源与 fallback |

## 建议输出物

1. 列表 DTO 表
2. 详情 DTO 表
3. 关系模型决策说明
4. `bmvProfile` 枚举与状态流转表
5. 前端 mapper 对照表

## 重点检查项

- `customerNumber` 的真值来源是否明确
- `group`、`owner`、`collaborators` 是否统一口径
- 关系模型是否支持后续批量建案
- `bmvProfile` 是否足够支撑“问卷 → 报价 → 签约 → 建案门禁”

## 交付验收

- 后续 Phase 1 / 2 / 4 无需再重新解释字段语义
- 后端和前端均可据此开始编码
- 至少形成一个可被评审的最终口径版本

## 风险提示

- 若 `CM-003` 不明确，Phase 3 会高概率返工
- 若 `CM-005` 不明确，Admin 会继续依赖 fixture adapter 临时兜底
