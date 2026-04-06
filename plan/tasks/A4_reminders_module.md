# A4: Reminders CRUD 模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | A4 |
| Phase | A — 补齐后台核心 CRUD |
| 前置依赖 | A3 (DocumentItems) |
| 后续解锁 | C1 (Reminder Job Handler) |
| 预估工时 | 0.5 天 |

## 目标

为 Reminder 提供 CRUD + 到期查询 API，供 Worker 轮询使用。

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/reminders/reminders.service.ts`
- `packages/server/src/modules/core/reminders/reminders.controller.ts`
- `packages/server/src/modules/core/reminders/reminders.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/server/src/infra/db/migrations/`
- `packages/mobile/`

## 数据模型来源

DB 表：`reminders`（见 `001_init.sql` L81-91）

```sql
reminders (
  id uuid PK,
  org_id uuid NOT NULL,
  entity_type text NOT NULL,   -- "case" | "document_item"
  entity_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL,        -- "pending" | "sent" | "cancelled"
  payload jsonb,
  created_at, updated_at
)
```

需要在 `coreEntities.ts` 中追加 `Reminder` 类型导出（当前只有 DB 表，无 TS 类型）。

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/reminders` | staff+ | 创建提醒 |
| GET | `/reminders/:id` | viewer+ | 查看提醒 |
| GET | `/reminders` | viewer+ | 列表（支持 status / entityType 筛选） |
| PATCH | `/reminders/:id` | staff+ | 更新提醒 |
| DELETE | `/reminders/:id` | manager+ | 取消提醒（status → cancelled） |
| GET | `/reminders/due` | 内部/manager+ | 查询已到期未发送的 reminders |

## 实现规范

1. Service 注入 `Pool` + `TimelineService`
2. `due` 查询：`scheduled_at <= now() AND status = 'pending'`，供 Worker 使用
3. 写操作写 Timeline
4. 追加 `Reminder` 类型到 `coreEntities.ts`（仅追加类型，不修改已有类型）

## 额外变更

- `packages/server/src/modules/core/model/coreEntities.ts` — 追加 `Reminder` 类型 + `TimelineEntityType` 追加 `"reminder"`
- `isTimelineEntityType` 函数追加 `"reminder"` 分支

## 测试要求

- mock `Pool` / `TimelineService`
- 覆盖 CRUD + due 查询
- 验证 delete 实际是状态变更（cancelled）而非物理删除

## 是否涉及异步任务

否（本模块提供数据，C1 Job 消费）

## 注册到 AppModule

- controllers: `RemindersController`
- providers: `RemindersService`

## DoD

- [ ] 6 个 API 端点可调通
- [ ] Reminder 类型已追加到 coreEntities.ts
- [ ] due 查询逻辑正确
- [ ] delete 是软取消不是硬删
- [ ] 所有写操作写 Timeline
- [ ] org_id 隔离
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=reminders
npx jest --testPathPattern=coreEntities
npm run guard
```
