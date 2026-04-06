# S11: BillingRecord 收费计划模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S11 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S16（Migration ✅）、S15（TimelineEntityType） |
| 后续解锁 | S12（PaymentRecord） |
| 预估工时 | 0.5 天 |

## 目标

为案件收费管理提供 CRUD + 状态流转。对应产品文档 `06-数据模型设计 §3.13` + `03-MVP P0 §2.8`。

## 数据库表

表 `billing_records` 已在 `009_core_entities.up.sql` 创建，字段：
- id, org_id, case_id(FK), billing_type, milestone_name
- amount_due, due_date, status, invoice_status, remark
- created_at, updated_at

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/billing/billingRecords.service.ts`
- `packages/server/src/modules/core/billing/billingRecords.controller.ts`
- `packages/server/src/modules/core/billing/billingRecords.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 新增 `BillingRecord` 类型

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/billing-records` | staff+ | 创建收费条目 |
| GET | `/billing-records` | viewer+ | 按 caseId 列表 |
| GET | `/billing-records/:id` | viewer+ | 查看单个 |
| PATCH | `/billing-records/:id` | staff+ | 更新 |
| POST | `/billing-records/:id/transition` | staff+ | 状态变更 |

## 实现规范

1. status 枚举：unquoted → quoted_pending → awaiting_payment → partial_paid → settled → refunded
2. billing_type 枚举：standard / milestone / hourly / fixed
3. invoice_status 枚举：none / issued / void
4. amount_due 必须 >= 0
5. 状态流转规则：
   - unquoted → quoted_pending
   - quoted_pending → awaiting_payment / unquoted
   - awaiting_payment → partial_paid / settled
   - partial_paid → settled
   - settled → refunded（仅 manager+）
6. 写操作写 Timeline（entityType = `"billing_record"`）

## 测试要求

- CRUD + transition 全覆盖
- 状态流转合法/非法验证
- amount_due 负数拒绝
- refunded 仅 manager 允许
- 多租户隔离

## DoD

- [ ] 5 个 API 端点
- [ ] 6 状态流转
- [ ] 金额校验
- [ ] 角色分级（refunded 需 manager）
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
