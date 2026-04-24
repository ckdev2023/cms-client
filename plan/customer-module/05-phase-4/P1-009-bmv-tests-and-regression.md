# P1-009：为 P1 model / server 动作补测试

## 目标

- 为 P1 经营管理签承接流补齐可回归的 server 与 admin 测试。
- 覆盖状态推进、门禁、错误分支与 UI 刷新链路。

## 依赖

- `P1-001 ~ P1-008` 已落地或至少冻结接口与交互口径。

## 当前现状

- server 已有 `customers.controller.test.ts` 与 `customers.service.update-delete.test.ts` 覆盖部分 BMV 动作。
- admin 已有 `CustomerRepository.test.ts` 覆盖 BMV action endpoint 路径。
- 仍需补足正式详情页 action model、卡片展示与建案门禁的回归测试。

## 重点文件

- `packages/server/src/modules/core/customers/customers.controller.test.ts`
- `packages/server/src/modules/core/customers/customers.service.update-delete.test.ts`
- `packages/admin/src/views/customers/model/CustomerRepository.test.ts`
- `packages/admin/src/views/customers/model/useCustomerDetailModel.test.ts`
- `packages/admin/src/views/crossModuleGates.test.ts`

## 建议实施步骤

1. 为 server 动作补状态矩阵测试：成功、重复、跳步、无权限。
2. 为 admin repository / model 补接口失败映射、刷新时机与禁用态测试。
3. 为建案门禁补单建案、批量建案、非 BMV 客户覆盖。
4. 收尾按固定顺序执行 `npm run fix` → `npm run guard`。

## 完成标准

- P1 核心状态流转可通过测试回归。
- 测试中不发真实网络请求，全部使用 mock / stub。
- `npm run fix` 与 `npm run guard` 可作为阶段收尾门禁。

## 风险提示

- 若只测 repository 不测 model / UI，正式交互仍可能在细节上失真。
- 若状态矩阵缺少越级与重复分支，后续改动很容易破坏门禁。