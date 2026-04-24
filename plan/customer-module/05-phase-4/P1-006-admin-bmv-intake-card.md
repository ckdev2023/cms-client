# P1-006：将 prototype 承接卡片迁移到 admin 正式详情页

## 目标

- 把 prototype 中的经营管理签承接卡片迁移到正式 admin 客户详情页。
- 在不破坏分层的前提下展示 P1 状态、下一步与关键信息。

## 依赖

- `FE-003` 已让详情页读取真实 customer detail。
- `P1-001` 已冻结 `bmvProfile` DTO 口径。

## 当前现状

- prototype 中已有 `packages/prototype/admin/customers/scripts/customer-detail-basic.js` 的承接卡片交互。
- 正式 admin 的 `packages/admin/src/views/customers/components/CustomerBasicInfoTab.vue` 目前只覆盖基础信息编辑。
- `packages/admin/src/views/customers/types-bmv.ts` 已具备正式页面可用的状态类型与推导函数。

## 重点文件

- `packages/prototype/admin/customers/scripts/customer-detail-basic.js`
- `packages/admin/src/views/customers/components/CustomerBasicInfoTab.vue`
- `packages/admin/src/views/customers/CustomerDetailView.vue`
- `packages/admin/src/views/customers/types-bmv.ts`
- `packages/admin/src/views/customers/model/useCustomerDetailModel.ts`

## 建议实施步骤

1. 从 prototype 提炼最小必要展示字段：阶段状态、关键时间、下一步、门禁提示。
2. 在 customers feature 的 `model` 层封装展示态，避免把状态判断堆进 Vue 组件。
3. 将承接卡片放入正式详情页基础信息区域，并处理空态、非 BMV 客户隐藏态。
4. 为 card 展示与状态标签补组件/模型测试。

## 完成标准

- 正式详情页可展示 `bmvProfile` 的当前阶段与关键信息。
- 非经营管理签客户不会看到误导性的空卡片。
- 组件不直接依赖 prototype 实现或 localStorage 状态。

## 风险提示

- 若直接复制 prototype 逻辑到组件中，会违反 feature/model 分层约束。
- 若卡片展示字段超出 server 真值，后续会再次引入前端伪状态。