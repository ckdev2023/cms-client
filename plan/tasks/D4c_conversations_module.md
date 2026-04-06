# D4c: Conversations CRUD 模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D4c |
| Phase | D — Portal Modules |
| 前置依赖 | D4b (Leads) |
| 后续解锁 | D4d (Messages) |
| 预估工时 | 0.5 天 |

## 目标

为 Conversation 提供 CRUD + 状态管理 API（会话线程）。

## 范围

### 需要创建的文件

- `packages/server/src/modules/portal/conversations/conversations.service.ts`
- `packages/server/src/modules/portal/conversations/conversations.controller.ts`
- `packages/server/src/modules/portal/conversations/conversations.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/mobile/`

## API 设计

| 方法 | 路径 | 角色/认证 | 说明 |
|---|---|---|---|
| POST | `/conversations` | AppUser / staff+ | 创建会话（关联 lead + appUser） |
| GET | `/conversations/:id` | AppUser 本人 / staff+ | 查看会话 |
| GET | `/conversations` | staff+ / AppUser 本人 | 列表查询 |
| PATCH | `/conversations/:id/close` | staff+ | 关闭会话 |

## 实现规范

1. 创建时必须传 appUserId，可选传 leadId
2. 创建时自动设置 preferredLanguage（来自 AppUser.preferredLanguage）
3. 事务所后台查询通过 TenantDb（org_id 隔离）
4. AppUser 查询按 app_user_id 过滤
5. 关闭会话：status → "closed" + 写 Timeline

## 测试要求

- mock `Pool` / `TimelineService`
- 覆盖 create / get / list / close
- 验证 preferredLanguage 自动填充

## DoD

- [ ] 4 个 API 端点可调通
- [ ] 关联 lead + appUser 正确
- [ ] org_id 隔离正确
- [ ] Timeline 写入
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=conversations
npm run guard
```
