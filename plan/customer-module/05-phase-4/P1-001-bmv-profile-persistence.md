# P1-001：在 server 增加 `bmvProfile` 持久化口径

## 目标

- 让 customer 详情与相关动作都以 server 中的 `bmvProfile` 为唯一真值来源。
- 冻结 `bmvProfile` 在 DB、DTO、adapter 间的字段名、空值与默认状态口径。

## 依赖

- `CM-004` 已冻结 `questionnaire / quote / sign / intake` 状态机。

## 当前现状

- `packages/server/src/modules/core/customers/customers.types.ts` 已定义 `CustomerBmvProfile`。
- `packages/server/src/modules/core/customers/customers.dto-mappers.ts` 已有 `normalizeCustomerBmvProfile`。
- `packages/admin/src/views/customers/types-bmv.ts` 与 `CustomerAdapterReaders.ts` 已能消费 `bmvProfile`。

## 重点文件

- `packages/server/src/modules/core/customers/customers.types.ts`
- `packages/server/src/modules/core/customers/customers.dto-mappers.ts`
- `packages/server/src/modules/core/customers/customers.service.ts`
- `packages/admin/src/views/customers/types-bmv.ts`
- `packages/admin/src/views/customers/model/CustomerAdapterReaders.ts`

## 建议实施步骤

1. 对齐 `base_profile.bmvProfile` 的字段清单、snake/camel 兼容和默认值策略。
2. 明确详情 DTO 返回 `bmvProfile | null` 的稳定口径，避免前端自行猜默认态。
3. 统一 service 内读取、补默认值、回写 patch 的路径，禁止散落的临时解析逻辑。
4. 为 DTO mapper / adapter 补单测，覆盖空对象、部分字段、snake_case 回退。

## 完成标准

- customer detail 可稳定返回 `bmvProfile` 或 `null`。
- server 与 admin 对状态枚举、时间字段命名完全一致。
- `bmvProfile` 缺字段时不会导致前端崩溃或状态错判。

## 风险提示

- 若顶层 DTO 与 `baseProfile` 嵌套口径再次分裂，后续动作接口会持续返工。
- 若默认状态由前端和后端各自推导，建案门禁会出现真值不一致。