# Phase 2：Admin 接入 P0 真实数据流

## 阶段目标

- 让 `packages/admin/src/views/customers` 从 fixture 切到 repository + api + model 驱动。
- 完成列表、详情、批量动作、建档和去重的真实闭环。

## 前置条件

- `SV-001 ~ SV-005` 至少已可提供列表、详情和基础动作接口
- `CM-005` 映射规则已冻结

## 原子任务

| ID | 原子任务 | 主要改动点 | 依赖 |
|---|---|---|---|
| `FE-001` | 新建 customers API / repository 层 | api client、repository、DTO adapter | `CM-005`、`SV-001`、`SV-002` |
| `FE-002` | 将客户列表切到真实接口 | `CustomerListView.vue`、list model | `FE-001` |
| `FE-003` | 将客户详情切到真实接口 | `CustomerDetailView.vue`、detail model | `FE-001` |
| `FE-004` | 接通建档提交与去重检查 | create form model / modal | `FE-001` |
| `FE-005` | 接通批量改负责人 | list bulk action | `FE-001` |
| `FE-006` | 接通批量改分组 | list bulk action | `FE-001` |
| `FE-010` | 接通详情页保存动作 | basic info model / save action | `FE-003` |
| `FE-013` | 为 list/detail/model 接入补单测 | vitest + mock api | `FE-001 ~ FE-010` |

## 建议实施顺序

1. `FE-001`
2. `FE-002` 与 `FE-003`
3. `FE-004 ~ FE-006`
4. `FE-010`
5. `FE-013`

## 重点文件

- `packages/admin/src/views/customers/CustomerListView.vue`
- `packages/admin/src/views/customers/CustomerDetailView.vue`
- `packages/admin/src/views/customers/model/*`
- `packages/admin/src/views/customers/types.ts`
- 新增的 customers repository / api / adapter 文件

## 阶段验收

- 页面不再直接依赖 `fixtures.ts` 作为真值来源
- 列表支持真实搜索、筛选、分页和批量动作
- 建档流程可真实触发去重检查
- 详情页可读取和保存真实数据
- 单测中无真实网络请求

## 风险提示

- 若先在组件里直接写请求逻辑，会破坏现有 model 分层
- 若不先抽 adapter，前端类型会直接耦合 server 响应结构
