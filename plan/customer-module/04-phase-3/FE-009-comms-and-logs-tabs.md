# FE-009：将沟通记录 / 日志 Tab 切到真实数据

## 目标

- 让 comms / logs 两个 Tab 全部切到真实数据。
- 统一时间线来源，避免“记录存在但详情页没有”的双写问题。

## 依赖

- `SV-007` 已提供沟通记录查询能力。
- `SV-008` 已提供操作日志 / 时间线查询能力。
- `FE-003` 已让详情页读取真实 customer detail。

## 当前现状

- `packages/admin/src/views/customers/model/useCustomerCommsModel.ts` 仍读取 `SAMPLE_COMMS_BY_CUSTOMER`。
- `packages/admin/src/views/customers/model/useCustomerLogsModel.ts` 仍读取 `SAMPLE_LOGS_BY_CUSTOMER`。
- `CustomerCommsTab.vue` 与 `CustomerLogsTab.vue` 的筛选/分页能力已具备，但数据源仍是前端样例。

## 重点文件

- `packages/admin/src/views/customers/model/useCustomerCommsModel.ts`
- `packages/admin/src/views/customers/model/useCustomerLogsModel.ts`
- `packages/admin/src/views/customers/components/CustomerCommsTab.vue`
- `packages/admin/src/views/customers/components/CustomerLogsTab.vue`
- `packages/admin/src/views/customers/model/CustomerRepository.ts`

## 建议实施步骤

1. 先确认 comms 与 logs 是否走统一 timeline DTO，避免前端做两套近似 adapter。
2. 为 repository 增加 comms / logs 查询能力，必要时抽统一 timeline mapper。
3. 将 comms model 替换为真实查询，保留内部/客户可见筛选与统计。
4. 将 logs model 替换为真实查询，保留类型筛选与分页。
5. 为 adapter、筛选逻辑、分页逻辑补单测。

## 完成标准

- comms / logs tab 不再依赖 sample fixture。
- comms 统计数与列表内容来自同一真实来源。
- logs 分页与筛选在真数据下保持稳定。
- 至少在前端层面做到统一时间线口径，不出现重复映射与双维护。

## 风险提示

- 若 comms / logs 数据模型相似却分头实现，后续新增 timeline 类型会继续双改。
- 若只接列表不校验统计/分页口径，UI 很容易出现数字与内容不一致。