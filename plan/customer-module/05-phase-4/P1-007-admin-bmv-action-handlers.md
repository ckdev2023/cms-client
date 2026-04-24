# P1-007：将问卷 / 报价 / 签约按钮接真实接口

## 目标

- 让 admin 承接卡片上的三个主动作调用正式接口，而不是 prototype 本地推进。
- 形成“点击动作 → 调接口 → 刷新详情 / 更新视图”的稳定交互闭环。

## 依赖

- `P1-002 ~ P1-004` 已提供稳定动作接口。
- `P1-006` 已在正式详情页放置承接卡片。

## 当前现状

- `packages/admin/src/views/customers/model/CustomerRepository.ts` 已有三个 BMV action 方法。
- `packages/admin/src/views/customers/CustomerDetailView.vue` 当前主要接通了详情加载与建案跳转。
- 正式 admin 尚未看到专门承载 BMV 动作状态编排的 model。

## 重点文件

- `packages/admin/src/views/customers/model/CustomerRepository.ts`
- `packages/admin/src/views/customers/CustomerDetailView.vue`
- `packages/admin/src/views/customers/components/CustomerBasicInfoTab.vue`
- `packages/admin/src/views/customers/model/useCustomerDetailModel.ts`
- `packages/admin/src/views/customers/model/CustomerRepository.test.ts`

## 建议实施步骤

1. 在 `model` 层封装 BMV action 状态：loading、错误、成功提示、刷新时机。
2. 将问卷 / 报价 / 签约按钮接到 repository，并在成功后刷新 customer detail 真值。
3. 明确每个按钮的可点条件、禁用态、错误提示，不允许 UI 本地跳步。
4. 为 action model、repository error 映射与组件交互补测试。

## 完成标准

- 三个按钮都调用正式接口并能刷新到最新状态。
- 重复点击、越级点击、请求失败都有稳定反馈。
- 页面不再依赖 prototype 的本地状态推进逻辑。

## 风险提示

- 若把动作可用性判断写死在组件模板中，后续状态机变更会高频返工。
- 若成功后不刷新详情，卡片显示会与 server 真值短暂分裂。