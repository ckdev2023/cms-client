# A1: Customers CRUD 模块 (基于测试反馈深度优化)

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | A1 |
| Phase | A — 补齐后台核心 CRUD |
| 前置依赖 | 无（core 类型 + DB 表已就绪） |
| 后续解锁 | A2 (Cases)、A5 (Permissions) |
| 预估工时 | 0.5-1 天 |

## 核心架构与边界优化说明 (New)

基于架构深度测试，已修复以下高危盲点：
1. **软删除矛盾**：因 `001_init.sql` 冻结，采用 `baseProfile._status = 'deleted'` 标识，并使用 `coalesce` 排除。
2. **级联影响**：增加前置校验，**删除 Customer 前必须校验其下是否有 cases**，如果有则拒绝删除并抛出 400（防破坏引用）。
3. **数据一致性**：引入 DTO 强校验（利用现有函数扩展），严防脏数据注入。
4. **分页契约**：明确 `GET /customers` 支持 `page`/`limit` 且返回 `{ items, total }`。
5. **Timeline规范**：Update 操作强制记录 `{"before": {...}, "after": {...}}` 以备审计。

## 目标

为 Customer 核心对象提供完整 CRUD API，所有操作强制 org_id 隔离 + 写 Timeline，保障核心数据资产安全。

## 范围

### 需要修改/创建的文件

- `packages/server/src/modules/core/customers/customers.service.ts`
- `packages/server/src/modules/core/customers/customers.controller.ts`
- `packages/server/src/modules/core/customers/customers.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/` — 类型已冻结
- `packages/server/src/infra/db/migrations/001_init.sql` — 表结构已冻结
- `packages/mobile/`

## 数据模型来源

`packages/server/src/modules/core/model/coreEntities.ts` → `Customer` 类型

```ts
type Customer = {
  id: CustomerId;
  orgId: OrganizationId;
  type: CustomerType;          // "individual" | "corporation"
  baseProfile: Record<string, unknown>; // 包含软删除标识 _status: 'deleted'
  contacts: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
};
```

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/customers` | staff+ | 创建客户 |
| GET | `/customers/:id` | viewer+ | 查看单个客户 |
| GET | `/customers` | viewer+ | 列表查询（`?page=1&limit=20`），返回 `{ items, total }` |
| PATCH | `/customers/:id` | staff+ | 更新客户信息 |
| DELETE | `/customers/:id` | manager+ | 软删除（前置校验名下无 cases 才允许） |

## DTO 与数据校验 (New)

- **CreateCustomerDto**: `type` 必须为 `individual` 或 `corporation`；`baseProfile` 为 object，`contacts` 为 array。
- **UpdateCustomerDto**: 所有字段可选。

## 实现规范

1. Service 注入 `Pool`，所有查询通过 `createTenantDb(pool, ctx.orgId, ctx.userId)`
2. Controller 从 `req.requestContext` 取 `RequestContext`，缺失则抛 `UnauthorizedException`
3. 角色校验用 `@RequireRoles()` 装饰器
4. **写操作审计**：写操作调用 `TimelineService.write()`。Update 操作必须记录 `{ before, after }`
5. **软删除实现**：注入 `baseProfile: { _status: "deleted" }`，列表查询排除该状态。
6. **删除级联保护**：`delete` 接口必须查询 `cases` 表是否有该 `customer_id` 且未软删除的记录，有则抛出 `BadRequestException('Cannot delete customer with existing cases')`

## 测试要求 (优化版)

- 验证 DTO 校验（越界数据/脏枚举被拒绝）
- 验证多租户隔离（租户 A 查不到 B，必须通过 `createTenantDb` 的 SQL 层面保障）
- 验证软删除的 Cases 级联保护（模拟名下有 case 时抛错）
- 验证 Timeline payload 是否完整记录了 before/after
- 覆盖：create / get / list / update / softDelete

## DoD（完成定义）

- [ ] 5 个 API 端点可调通，支持 DTO 强校验
- [ ] 分页列表返回结构正确
- [ ] 所有写操作按规范写 Timeline (包含 before/after)
- [ ] 所有查询通过 TenantDb（org_id 隔离）
- [ ] 角色校验正确
- [ ] 单测覆盖新增的边界条件（分页、级联校验）
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=customers
npm run guard
```
