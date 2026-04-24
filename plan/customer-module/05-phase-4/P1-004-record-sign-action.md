# P1-004：增加确认签约动作接口

## 目标

- 提供正式的签约确认动作，作为建案放行的前置真值。
- 让签约动作统一推进 `quoteStatus=confirmed`、`signStatus=signed`。

## 依赖

- `P1-001` 已冻结 `bmvProfile` 持久化口径。

## 当前现状

- `packages/server/src/modules/core/customers/customers.service.ts` 已存在 `recordBmvSign`。
- `packages/server/src/modules/core/customers/customers.controller.ts` 已存在 `POST :id/bmv/sign/record`。
- `packages/admin/src/views/customers/model/CustomerRepository.ts` 已暴露 `recordBmvSign`。

## 重点文件

- `packages/server/src/modules/core/customers/customers.service.ts`
- `packages/server/src/modules/core/customers/customers.controller.ts`
- `packages/admin/src/views/customers/model/CustomerRepository.ts`
- `packages/server/src/modules/core/customers/customers.service.update-delete.test.ts`
- `packages/server/src/modules/core/customers/customers.controller.test.ts`

## 建议实施步骤

1. 固定签约动作只能在报价已生成/确认后执行。
2. 明确签约时 `quoteConfirmedAt`、`signedAt` 的补写规则与幂等语义。
3. 将“建案已放行”的判断建立在 server 返回的签约真值之上。
4. 为重复签约、越级签约、无权限签约补测试。

## 完成标准

- 可通过正式接口推进到 `signStatus=signed`。
- 报价未完成时不能直接签约。
- 签约完成后下游可稳定读取“允许建案”的真值状态。

## 风险提示

- 若签约动作只更新 UI 不更新 server 真值，建案门禁会被绕过。
- 若幂等语义不清，重复点击会导致日志与时间字段污染。