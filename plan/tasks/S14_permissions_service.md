# S14: Permissions Service 细粒度 scope 权限

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S14 |
| Phase | S — Server 地基补全 |
| 前置依赖 | 无（独立横切关注） |
| 后续解锁 | 无 |
| 预估工时 | 0.5 天 |

## 目标

在现有 RBAC 角色等级（owner/manager/staff/viewer）基础上，增加资源级权限检查能力。对应 `plan/improvement_plan.md A-5`。

## 背景

当前权限体系：
- `@RequireRoles('staff')` — 按角色等级检查
- RLS `org_id = app_current_org_id()` — 租户隔离

缺失：
- 资源级权限：staff A 能否访问 staff B 的案件？
- 经办人检查：只有 ownerUserId / assistantUserId 可编辑案件？

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/auth/permissions.service.ts`
- `packages/server/src/modules/core/auth/permissions.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/cases/cases.controller.ts` — 在 update/delete 时调用 canEditCase
- `packages/server/src/modules/core/customers/customers.controller.ts` — 在 update/delete 时调用 canEditCustomer

## API（内部 Service，不暴露 HTTP）

```ts
class PermissionsService {
  canAccessCase(userId: string, caseRow: Case): boolean;
  canEditCase(userId: string, userRole: string, caseRow: Case): boolean;
  canAccessCustomer(userId: string, customerRow: Customer): boolean;
  canEditCustomer(userId: string, userRole: string): boolean;
}
```

## 实现规范

1. **canAccessCase**：
   - manager+ 可访问所有案件
   - staff 只能访问 ownerUserId === userId 或 assistantUserId === userId
   - viewer 同 staff
2. **canEditCase**：
   - manager+ 可编辑所有
   - staff 只能编辑 ownerUserId === userId 的案件
3. **canAccessCustomer / canEditCustomer**：
   - Phase 1 简化：所有同 org 成员均可访问/编辑
   - 预留接口签名供后续扩展
4. 权限不足抛 `ForbiddenException`
5. 在 Controller 层调用（不在 Service 层，保持 Service 纯业务逻辑）

## 测试要求

- manager 可访问/编辑所有案件
- staff 只能访问自己负责的案件
- staff 无法编辑他人案件
- viewer 只能查看自己的案件
- canEditCustomer Phase 1 全部允许

## DoD

- [ ] PermissionsService 4 个方法
- [ ] Cases Controller 集成
- [ ] Customers Controller 集成
- [ ] 单测覆盖权限矩阵
- [ ] 现有测试不受影响
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
