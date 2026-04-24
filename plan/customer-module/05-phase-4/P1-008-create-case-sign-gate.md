# P1-008：在 admin 建案入口接入签约门禁

## 目标

- 在客户详情页单建案与批量建案入口上接入“签约后才能建案”的门禁。
- 让建案入口始终依赖 `bmvProfile` 的 server 真值，而不是 UI 猜测。

## 依赖

- `P1-004` 已能给出签约真值。
- `FE-011`、`FE-012` 已接通单建案与批量建案入口。

## 当前现状

- `packages/admin/src/views/customers/CustomerDetailView.vue` 会直接处理 `createCase` / `batchCreateCase` 跳转。
- `packages/admin/src/views/customers/components/CustomerDetailHeader.vue` 已暴露两个建案按钮事件。
- prototype 中已有“签约前阻止建案”的参考逻辑与测试。

## 重点文件

- `packages/admin/src/views/customers/CustomerDetailView.vue`
- `packages/admin/src/views/customers/components/CustomerDetailHeader.vue`
- `packages/admin/src/views/customers/types-bmv.ts`
- `packages/admin/src/views/crossModuleGates.test.ts`
- `packages/prototype/admin/customers/scripts/customer-detail-basic.js`

## 建议实施步骤

1. 在 customers feature 的 `model` 层抽出建案门禁判断，复用单建案与批量建案入口。
2. 用 `bmvProfile.signStatus / intakeStatus` 判断是否允许建案，并提供阻断提示。
3. 在 UI 上体现禁用态或 toast，避免用户点击后才感知失败。
4. 为单建案、批量建案、非 BMV 客户三类场景补回归测试。

## 完成标准

- 未签约的经营管理签客户不能进入建案页。
- 已签约客户可正常进入单建案与批量建案流程。
- 非 BMV 客户不受该门禁误伤。

## 风险提示

- 若只做前端提示不统一判断入口，单建案与批量建案会出现行为不一致。
- 若不以 server 真值为准，刷新后门禁状态可能反复跳变。