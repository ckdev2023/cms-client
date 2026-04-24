# P1-005：为 P1 动作补沟通记录 / 日志留痕

## 目标

- 让问卷、报价、签约三个动作都能在客户详情的时间线中追踪。
- 保证沟通记录与操作日志能回溯 P1 承接流关键节点。

## 依赖

- `P1-002 ~ P1-004` 已具备稳定动作接口与状态推进。

## 当前现状

- `packages/server/src/modules/core/customers/customers.service.ts` 的 BMV 动作已调用 `timelineService.write`。
- 客户详情页已有 `CustomerCommsTab.vue`、`CustomerLogsTab.vue` 与对应 model/repository。
- 本任务重点在于固定留痕动作名、payload 字段与 comms/logs 展示口径。

## 重点文件

- `packages/server/src/modules/core/customers/customers.service.ts`
- `packages/admin/src/views/customers/components/CustomerCommsTab.vue`
- `packages/admin/src/views/customers/components/CustomerLogsTab.vue`
- `packages/admin/src/views/customers/model/useCustomerCommsModel.ts`
- `packages/admin/src/views/customers/model/useCustomerLogsModel.ts`

## 建议实施步骤

1. 冻结三个动作的 timeline action 命名与 payload 字段清单。
2. 明确哪些动作进入操作日志，哪些需要补充到沟通记录视图。
3. 校验 comms / logs 查询接口是否能稳定返回 P1 留痕，不依赖 prototype 拼接。
4. 为动作后时间线可见性补测试或回归清单。

## 完成标准

- 发送问卷、生成报价、确认签约后都能看到可审计留痕。
- 留痕内容能表达前后状态变化与关键时间点。
- comms / logs 不出现“动作成功但详情页无记录”的双写分裂。

## 风险提示

- 若只写 timeline 不校验详情页展示路径，用户会误以为动作未生效。
- 若 action 名和 payload 未冻结，后续筛选与文案会反复返工。