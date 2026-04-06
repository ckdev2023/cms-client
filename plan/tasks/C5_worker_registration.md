# C5: Worker 注册所有 Handler

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | C5 |
| Phase | C — 异步任务 Handler 实装 |
| 前置依赖 | C1、C2、C3、C4 |
| 后续解锁 | Phase D (Portal 消息翻译链路) |
| 预估工时 | 0.5 天 |

## 目标

将所有 Job Handler 注册到 Worker 入口，建立完整的异步任务调度链路。

## 范围

### 需要修改的文件

- `packages/server/src/worker.ts` — 注册 handler 到队列

### 需要创建的文件

- `packages/server/src/worker.test.ts` — Worker 集成测试

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/server/src/infra/db/migrations/`
- `packages/mobile/`

## 设计

### 队列名 → Handler 映射

| 队列名 | Handler | 来源 |
|---|---|---|
| `reminder_jobs` | `handleReminderJob` | C1 |
| `notification_jobs` | `handleNotificationJob` | C2 |
| `translation_jobs` | `handleTranslationJob` | C3 |
| `export_jobs` | `handleExportJob` | C4 |

### Worker 启动流程

```ts
// worker.ts
1. loadEnv()
2. createPgPool()
3. createRedisClient()
4. createRedisQueue(redisClient)
5. 创建各 Adapter（Storage/Notification/Translation）
6. 启动并发 worker 循环：
   - queue.runWorker("reminder_jobs", job => handleReminderJob(pool, queue, job))
   - queue.runWorker("notification_jobs", job => handleNotificationJob(pool, notificationAdapter, job))
   - queue.runWorker("translation_jobs", job => handleTranslationJob(pool, translationAdapter, job))
   - queue.runWorker("export_jobs", job => handleExportJob(pool, storageAdapter, queue, job))
7. Promise.all 并发运行
```

## 实现规范

1. 每个 queue 用独立的 `runWorker` 循环（并发消费）
2. Worker 入口优雅退出：监听 `SIGTERM` / `SIGINT`，设置 `running = false`
3. 全局错误处理：单个 handler 抛异常不影响其他队列
4. 日志：Worker 启动时打印已注册队列列表

## 现有 worker.ts 参考

当前 `worker.ts` 已存在但内容需确认后追加。需保持现有逻辑不变，追加 handler 注册。

## 测试要求

- 测试 handler 注册：验证所有 4 个队列都被注册
- mock 所有依赖（Pool/Redis/Adapters）
- 验证 Worker 可正常启动 + 退出
- 不启动真实连接

## 是否涉及异步任务

是 — Worker 本体

## DoD

- [ ] worker.ts 注册全部 4 个 handler
- [ ] Worker 可启动并监听所有队列
- [ ] 优雅退出逻辑就绪
- [ ] 集成测试覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=worker
npm run guard
```
