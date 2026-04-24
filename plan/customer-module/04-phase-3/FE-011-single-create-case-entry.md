# FE-011：接通一键建案入口

## 目标

- 让客户详情页能够直接跳到案件新建页。
- 保证 `customerId` 能透传到 `cases/create` 并自动带入主申请人上下文。

## 依赖

- `FE-003` 已让客户详情拿到真实 customer detail。
- `packages/admin/src/views/cases/CaseCreateView.vue` 已存在可消费来源上下文的创建页。

## 当前现状

- `packages/admin/src/views/customers/CustomerDetailView.vue` 中 `@create-case` 仍是空实现。
- `packages/admin/src/views/customers/components/CustomerDetailHeader.vue` 已发出 `createCase` 事件，但未落到路由跳转。
- `packages/admin/src/views/cases/query.ts` 已支持读取 `customerId`，`CaseCreateView.vue` 已会将其转成 source context。

## 重点文件

- `packages/admin/src/views/customers/CustomerDetailView.vue`
- `packages/admin/src/views/customers/components/CustomerDetailHeader.vue`
- `packages/admin/src/views/customers/components/CustomerCasesTab.vue`
- `packages/admin/src/views/cases/query.ts`
- `packages/admin/src/views/cases/CaseCreateView.vue`

## 建议实施步骤

1. 在 customers 详情页集中封装“跳转到案件新建页”的路由参数构造。
2. 先接通头部“一键建案”按钮，传入 `customerId`。
3. 视页面一致性需要，再接通 cases tab 内的单建案入口。
4. 为 query 解析与来源上下文展示补测试，确保刷新页面后仍可复原。

## 完成标准

- 从客户详情点击“一键建案”可进入 `#/cases/create?customerId=...`。
- 案件新建页能识别来源客户并自动带入主申请人/默认承接组。
- 刷新创建页后来源上下文仍然存在，不依赖内存态。

## 风险提示

- 若 customers 侧自行拼接 URL 且未与 cases/query.ts 对齐，后续 `FE-012` 会再次返工。
- 若只带 `customerId` 不校验创建页行为，用户可能进入页面却没有主申请人上下文。