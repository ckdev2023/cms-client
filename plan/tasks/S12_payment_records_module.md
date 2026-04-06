# S12: PaymentRecord 回款记录模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S12 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S11（BillingRecord） |
| 后续解锁 | 无 |
| 预估工时 | 0.3 天 |

## 目标

为收费条目记录实际回款（多笔回款对应一个 BillingRecord）。对应产品文档 `06-数据模型设计 §3.14`。

## 数据库表

表 `payment_records` 已在 `009_core_entities.up.sql` 创建，字段：
- id, org_id, billing_record_id(FK), case_id(FK)
- amount_received, received_at, payment_method
- receipt_file_url, recorded_by(FK users), created_at

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/billing/paymentRecords.service.ts`
- `packages/server/src/modules/core/billing/paymentRecords.controller.ts`
- `packages/server/src/modules/core/billing/paymentRecords.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 新增 `PaymentRecord` 类型

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/payment-records` | staff+ | 登记回款 |
| GET | `/payment-records` | viewer+ | 按 billingRecordId / caseId 列表 |
| GET | `/payment-records/:id` | viewer+ | 查看单个 |
| DELETE | `/payment-records/:id` | manager+ | 删除（仅限 manager） |

## 实现规范

1. 创建回款时：
   - 校验 billing_record_id 存在且属于同 org
   - amount_received > 0
   - 自动判断 BillingRecord 状态：
     - 累计回款 >= amount_due → 更新为 settled
     - 累计回款 > 0 but < amount_due → 更新为 partial_paid
2. payment_method 枚举：bank_transfer / cash / credit_card / other
3. receipt_file_url 可选（上传凭证链接）
4. 删除回款后需重新计算 BillingRecord 状态
5. 写操作写 Timeline（entityType = `"payment_record"`）

## 测试要求

- create + list + get + delete 全覆盖
- 回款后自动更新 BillingRecord 状态
- 删除回款后状态回退
- amount_received <= 0 拒绝
- billing_record_id 跨租户拒绝
- 多租户隔离

## DoD

- [ ] 4 个 API 端点
- [ ] 自动联动 BillingRecord 状态
- [ ] 金额校验
- [ ] Timeline 写入
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
