# P1-003：增加生成报价动作接口

## 目标

- 提供“问卷已回收并生成报价”的正式动作入口。
- 让 `questionnaireStatus`、`quoteStatus`、`signStatus` 的联动推进由 server 统一控制。

## 依赖

- `P1-001` 已冻结 `bmvProfile` 持久化口径。

## 当前现状

- `packages/server/src/modules/core/customers/customers.service.ts` 已存在 `generateBmvQuote`。
- `packages/server/src/modules/core/customers/customers.controller.ts` 已存在 `POST :id/bmv/quote/generate`。
- `packages/admin/src/views/customers/model/CustomerRepository.ts` 已暴露 `generateBmvQuote`。

## 重点文件

- `packages/server/src/modules/core/customers/customers.service.ts`
- `packages/server/src/modules/core/customers/customers.controller.ts`
- `packages/admin/src/views/customers/model/CustomerRepository.ts`
- `packages/server/src/modules/core/customers/customers.service.update-delete.test.ts`

## 建议实施步骤

1. 固定“必须先发送问卷，且未签约”这一前置门禁。
2. 明确生成报价时如何补齐 `questionnaireReturnedAt`、`quoteGeneratedAt` 与 `signStatus=pending`。
3. 保证动作回包与详情 DTO 口径一致，前端刷新后能直接展示最新阶段。
4. 为跳步、重复生成、已签约后再生成等分支补测试。

## 完成标准

- 调用正式接口后可推进到 `quoteStatus=generated`。
- 问卷未发送时不能直接生成报价。
- 生成报价后详情页可稳定展示待签约阶段。

## 风险提示

- 若把“问卷回收”与“生成报价”拆成前端双写，会造成状态错位。
- 若时间字段由前端补写，审计时间线会失真。