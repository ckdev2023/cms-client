# D4b: Leads CRUD 模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D4b |
| Phase | D — Portal Modules |
| 前置依赖 | D4a (AppUsers) |
| 后续解锁 | D4c (Conversations) |
| 预估工时 | 0.5-1 天 |

## 目标

为 Lead 提供 CRUD + 状态变更 + 分配 API。

## 范围

### 需要创建的文件

- `packages/server/src/modules/portal/leads/leads.service.ts`
- `packages/server/src/modules/portal/leads/leads.controller.ts`
- `packages/server/src/modules/portal/leads/leads.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/mobile/`

## API 设计

| 方法 | 路径 | 角色/认证 | 说明 |
|---|---|---|---|
| POST | `/leads` | AppUser | 用户发起咨询（创建 lead） |
| GET | `/leads/:id` | staff+ / AppUser 本人 | 查看 lead 详情 |
| GET | `/leads` | staff+ | 列表（事务所后台筛选） |
| PATCH | `/leads/:id` | staff+ | 更新 lead |
| POST | `/leads/:id/assign` | manager+ | 分配给事务所/人员 |
| POST | `/leads/:id/convert` | staff+ | 转化为 Case（创建 Case + 关联） |

## 实现规范

1. 创建 lead：AppUser 调用，初始 org_id 为空（未分配）
2. 分配：设置 assigned_org_id + assigned_user_id + 写 Timeline
3. 转化为 Case：
   - 调用 CasesService.create()（A2 已实现）
   - 更新 lead.status = "converted"
   - 写 Timeline
4. 事务所后台查询通过 TenantDb（RLS 按 assigned_org_id）
5. AppUser 查询直接按 app_user_id

## 关键原则

- **Lead 与 Case 分离**（架构指南：咨询、会话、案件三层不混）
- Lead 是咨询入口对象，Case 是正式受理对象
- 转化后 Lead 不删除，保留完整链路

## 测试要求

- mock `Pool` / `TimelineService` / `CasesService`
- 覆盖：create / get / list / update / assign / convert
- 验证未分配 lead 的 org_id 为空
- 验证 convert 时 Case 被正确创建

## DoD

- [ ] 6 个 API 端点可调通
- [ ] Lead 创建时 org_id 可为空
- [ ] 分配 + 转化链路跑通
- [ ] Timeline 写入正确
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=leads
npm run guard
```
