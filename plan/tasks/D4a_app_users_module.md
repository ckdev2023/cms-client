# D4a: AppUsers CRUD 模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D4a |
| Phase | D — Portal Modules |
| 前置依赖 | D1 (Migration)、D2 (RLS)、D3 (类型) |
| 后续解锁 | D4b (Leads)、D5 (AppUser Auth) |
| 预估工时 | 0.5 天 |

## 目标

为 AppUser 提供 CRUD API（用户端账号管理）。

## 范围

### 需要创建的文件

- `packages/server/src/modules/portal/app-users/appUsers.service.ts`
- `packages/server/src/modules/portal/app-users/appUsers.controller.ts`
- `packages/server/src/modules/portal/app-users/appUsers.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/`
- `packages/mobile/`

## 特殊说明

- AppUser **不走 org_id 隔离**（独立账号体系）
- 不使用 TenantDb，直接使用 Pool 查询
- 不需要后台 RBAC 角色校验（这是用户端接口）

## API 设计

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| POST | `/app-users` | 公开（注册） | 创建用户 |
| GET | `/app-users/:id` | AppUser 本人 | 查看个人信息 |
| PATCH | `/app-users/:id` | AppUser 本人 | 更新个人信息（name/language/contact） |

## 实现规范

1. Service 注入 `Pool`（不走 TenantDb）
2. 列表查询暂不提供（用户端不需要浏览其他用户）
3. 更新操作限定本人（`id === ctx.appUserId`）
4. 使用 `mapAppUserRow` 映射

## 测试要求

- mock `Pool`
- 覆盖 create / get / update
- 验证只能操作本人数据

## DoD

- [ ] 3 个 API 端点可调通
- [ ] 不走 TenantDb / org_id
- [ ] 更新限定本人
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=appUsers
npm run guard
```
