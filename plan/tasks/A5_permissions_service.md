# A5: Permissions Service（细粒度 scope）

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | A5 |
| Phase | A — 补齐后台核心 CRUD |
| 前置依赖 | A1 (Customers)、A2 (Cases) |
| 后续解锁 | Phase D (Portal Auth) |
| 预估工时 | 0.5-1 天 |

## 目标

在现有 RBAC 角色等级基础上，增加资源级 scope 校验能力。

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/permissions/permissions.service.ts`
- `packages/server/src/modules/core/permissions/permissions.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/cases/cases.controller.ts` — 接入 scope 校验
- `packages/server/src/modules/core/customers/customers.controller.ts` — 接入 scope 校验
- `packages/server/src/app.module.ts` — 注册 PermissionsService

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/server/src/infra/db/migrations/`
- `packages/mobile/`

## 设计

### Scope 规则（Phase 1 最小版本）

| 角色 | 可访问范围 |
|---|---|
| owner / manager | 本 org 下所有资源 |
| staff | 本 org 下自己负责的 case + 关联 customer |
| viewer | 本 org 下所有资源（只读） |

### Service 接口

```ts
class PermissionsService {
  canAccessCase(ctx: RequestContext, caseId: string): Promise<boolean>;
  canAccessCustomer(ctx: RequestContext, customerId: string): Promise<boolean>;
  assertCanAccessCase(ctx: RequestContext, caseId: string): Promise<void>;
  assertCanAccessCustomer(ctx: RequestContext, customerId: string): Promise<void>;
}
```

- `assert*` 方法：不满足则 `throw ForbiddenException`
- `canAccess*` 方法：返回 boolean，用于条件判断

## 实现规范

1. Service 注入 `Pool`
2. `canAccessCase`：
   - owner/manager/viewer → 直接通过（RLS 已保障 org 隔离）
   - staff → 查 `cases` 表 `owner_user_id = ctx.userId`
3. `canAccessCustomer`：
   - owner/manager/viewer → 直接通过
   - staff → 查 `cases` 表中是否存在 `customer_id = customerId AND owner_user_id = ctx.userId`
4. 后续 Phase D 追加 `canAccessConversation` / `canAccessLead` 等

## 测试要求

- mock `Pool`
- 覆盖各角色 × 资源归属组合
- 验证 staff 只能访问自己负责的 case / customer
- 验证 assert 方法抛出 ForbiddenException

## 是否涉及异步任务

否

## DoD

- [ ] PermissionsService 已创建并注册到 AppModule
- [ ] Cases controller 在 get/update/delete/transition 中调用 assertCanAccessCase
- [ ] Customers controller 在 get/update/delete 中调用 assertCanAccessCustomer
- [ ] 单测覆盖各角色 × 归属场景
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=permissions
npm run guard
```
