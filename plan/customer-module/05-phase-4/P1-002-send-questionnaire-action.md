# P1-002：增加发送问卷动作接口

## 目标

- 提供正式的“发送经营管理签问卷”动作入口。
- 动作完成后能推进 `questionnaireStatus`，并为后续报价生成建立前置条件。

## 依赖

- `P1-001` 已冻结 `bmvProfile` 持久化与 DTO 口径。

## 当前现状

- `packages/server/src/modules/core/customers/customers.service.ts` 已存在 `sendBmvQuestionnaire`。
- `packages/server/src/modules/core/customers/customers.controller.ts` 已存在 `POST :id/bmv/questionnaire/send`。
- `packages/admin/src/views/customers/model/CustomerRepository.ts` 已暴露 `sendBmvQuestionnaire` 仓储方法。

## 重点文件

- `packages/server/src/modules/core/customers/customers.service.ts`
- `packages/server/src/modules/core/customers/customers.controller.ts`
- `packages/admin/src/views/customers/model/CustomerRepository.ts`
- `packages/server/src/modules/core/customers/customers.service.update-delete.test.ts`
- `packages/server/src/modules/core/customers/customers.controller.test.ts`

## 建议实施步骤

1. 固定发送动作允许的前置状态与幂等/重复点击错误语义。
2. 明确动作回包至少返回可刷新详情所需的 customer 标识与最新档案真值。
3. 统一错误码与错误文案，避免 admin 无法区分“已发送”和“无权限”。
4. 为 service / controller / repository 补动作成功、重复发送、越级发送测试。

## 完成标准

- 可通过正式接口推进到 `questionnaireStatus=sent`。
- 已签约或已完成问卷阶段时会被稳定阻断。
- admin 可消费统一的成功/失败反馈，不依赖 prototype 本地状态。

## 风险提示

- 若发送动作不做状态门禁，后续报价与签约链路会被跳步污染。
- 若回包不稳定，前端只能盲目刷新，体验会退化。