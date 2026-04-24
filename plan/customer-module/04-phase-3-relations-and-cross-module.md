# Phase 3：关系与跨模块联动

## 阶段目标

- 完成客户详情各 Tab 的真数据接入。
- 打通关联人/家族签与建案入口之间的跨模块联动。

## 前置条件

- `SV-006 ~ SV-011` 至少已具备可用接口
- `FE-003` 已让详情页切到真实 customer detail

## 子任务文件

| ID | 文件 | 聚焦范围 |
|---|---|---|
| `FE-007` | `plan/customer-module/04-phase-3/FE-007-related-cases-tab.md` | 关联案件 Tab 真数据、筛选与案件详情跳转 |
| `FE-008` | `plan/customer-module/04-phase-3/FE-008-relations-tab.md` | 关联人 Tab 真数据、查询、新增/编辑与回写 |
| `FE-009` | `plan/customer-module/04-phase-3/FE-009-comms-and-logs-tabs.md` | 沟通记录 / 日志 Tab 真数据与统一时间线来源 |
| `FE-011` | `plan/customer-module/04-phase-3/FE-011-single-create-case-entry.md` | 客户详情页一键建案入口与 `customerId` 透传 |
| `FE-012` | `plan/customer-module/04-phase-3/FE-012-batch-create-case-entry.md` | 关系场景批量建案入口与家族签上下文透传 |

## 建议执行顺序

1. `FE-007`：先把案件 Tab 真数据接通，确认详情页子 Tab 的数据装配路径可复用。
2. `FE-008`：再打通关系查询与回写，为后续批量建案提供真实关系上下文。
3. `FE-009`：随后统一 comms / logs 的真实时间线来源，避免双写与口径分裂。
4. `FE-011`：先稳定单客户建案入口，冻结 `customers -> cases/create` 的接参方式。
5. `FE-012`：最后在单建案入口之上扩展批量建案与家族签上下文。

## 原子任务

| ID | 原子任务 | 主要改动点 | 依赖 |
|---|---|---|---|
| `FE-007` | 将关联案件 Tab 切到真实数据 | cases tab model / detail page | `SV-006`、`FE-003` |
| `FE-008` | 将关联人 Tab 切到真实数据 | contacts/relations model & UI | `SV-009`、`SV-010`、`FE-003` |
| `FE-009` | 将沟通记录 / 日志 Tab 切到真实数据 | comms/logs model & UI | `SV-007`、`SV-008`、`FE-003` |
| `FE-011` | 接通一键建案入口 | customers → cases create 跳转 | `FE-003` |
| `FE-012` | 接通批量建案入口 | relations/family scenario → case create | `FE-008` |

## 实施说明

1. 关联案件优先实现只读稳定展示与跳转。
2. 关联人先保证“查询 + 新增/编辑 + 回写”，再考虑高级筛选。
3. 沟通记录与日志应复用统一时间线来源，避免双写。
4. 建案入口要与 `packages/admin/src/views/cases` 的接参方式完全对齐。

## 阶段验收

- 详情页各 Tab 不再读取 fixture
- 一键建案能带入 `customerId`
- 批量建案能带入关联客户上下文
- 关系数据变更后可在 UI 中回写并可追踪

## 风险提示

- 若 relations 模型和 case create 接参不统一，批量建案会变成二次返工点
- 若 comms/logs 数据源不统一，用户会看到“记录存在但详情页没有”的问题
