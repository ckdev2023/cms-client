# C2: Notification Job Handler

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | C2 |
| Phase | C — 异步任务 Handler 实装 |
| 前置依赖 | B2 (Notification Adapter) |
| 后续解锁 | C5 (Worker 注册) |
| 预估工时 | 0.5 天 |

## 目标

实现 Notification Job Handler：从队列取出通知任务 → 调用 NotificationAdapter 发送 → 写 Timeline。

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/jobs/handlers/notificationJobHandler.ts`
- `packages/server/src/modules/core/jobs/handlers/notificationJobHandler.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/server/src/infra/db/migrations/`
- `packages/mobile/`

## 设计

### Job 类型

- 队列名：`notification_jobs`
- Job payload：

```ts
{
  orgId: string;
  channel: "email" | "push" | "in_app";
  to: string;
  subject?: string;
  body: string;
  entityType?: string;   // 用于 Timeline
  entityId?: string;     // 用于 Timeline
  metadata?: Record<string, unknown>;
}
```

### Handler 签名

```ts
export async function handleNotificationJob(
  pool: Pool,
  notificationAdapter: NotificationAdapter,
  job: QueueJob<NotificationJobPayload>,
): Promise<void>;
```

### 处理流程

```
1. 从 notification_jobs 队列取出 job
2. 调用 notificationAdapter.send(payload)
3. 如有 entityType + entityId，写 Timeline（action: "notification_sent"）
4. 发送失败：抛异常（由 Worker 框架处理 retry）
```

## 实现规范

1. 不在 handler 内做 retry 逻辑（由 Worker 或 Job 框架负责）
2. 发送前记录 info 日志，发送后记录 success 日志
3. Timeline 写入用 `createTenantDb`

## 测试要求

- mock `NotificationAdapter` / `Pool`
- 验证 adapter.send 被正确调用
- 验证 Timeline 写入
- 验证发送失败时抛异常

## 是否涉及异步任务

是 — 本身是 Job Handler

## DoD

- [ ] handleNotificationJob 函数已实现
- [ ] 调用 NotificationAdapter.send 正确
- [ ] Timeline 写入正确（有 entityType/entityId 时）
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=notificationJobHandler
npm run guard
```
