# C1: Reminder Job Handler

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | C1 |
| Phase | C — 异步任务 Handler 实装 |
| 前置依赖 | A4 (Reminders)、B2 (Notification Adapter) |
| 后续解锁 | C5 (Worker 注册) |
| 预估工时 | 0.5 天 |

## 目标

实现 Reminder Job Handler：轮询到期 reminders → 为每条入队 notification_job → 更新 reminder 状态。

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/jobs/handlers/reminderJobHandler.ts`
- `packages/server/src/modules/core/jobs/handlers/reminderJobHandler.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/server/src/infra/db/migrations/`
- `packages/mobile/`

## 设计

### Job 类型

- 队列名：`reminder_jobs`
- Job payload：`{ orgId: string }` （扫描该 org 下到期 reminders）

### 处理流程

```
1. 从 reminder_jobs 队列取出 job
2. 查询 reminders 表：scheduled_at <= now() AND status = 'pending' AND org_id = payload.orgId
3. 对每条 reminder：
   a. 入队一条 notification_job（队列名：notification_jobs）
   b. 更新 reminder.status = 'sent'
   c. 写 Timeline
4. 如无到期 reminder，正常结束
```

### Handler 签名

```ts
export async function handleReminderJob(
  pool: Pool,
  queue: RedisQueue,
  job: QueueJob<{ orgId: string }>,
): Promise<void>;
```

## 实现规范

1. 使用 `createTenantDb` 做 org 隔离查询
2. 批量处理：一次最多处理 100 条，避免单次 job 过长
3. 错误处理：单条 reminder 失败不影响其余，记录错误日志
4. 幂等：已 sent 的 reminder 跳过

## 测试要求

- mock `Pool` / `RedisQueue`
- 验证到期 reminder 被正确入队 notification_job
- 验证 reminder 状态更新为 sent
- 验证无到期 reminder 时正常结束
- 验证已 sent reminder 被跳过

## 是否涉及异步任务

是 — 本身是 Job Handler，且会入队 notification_job

## DoD

- [ ] handleReminderJob 函数已实现
- [ ] 到期 reminder → notification_job 链路跑通
- [ ] reminder 状态正确更新
- [ ] 错误隔离（单条失败不影响批次）
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=reminderJobHandler
npm run guard
```
