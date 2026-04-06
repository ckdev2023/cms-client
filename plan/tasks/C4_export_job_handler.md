# C4: Export Job Handler

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | C4 |
| Phase | C — 异步任务 Handler 实装 |
| 前置依赖 | B1 (File Storage Adapter)、B2 (Notification Adapter) |
| 后续解锁 | C5 (Worker 注册) |
| 预估工时 | 0.5-1 天 |

## 目标

实现 Export Job Handler：从队列取导出任务 → 生成文件 → 存储 → 通知用户下载链接。

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/jobs/handlers/exportJobHandler.ts`
- `packages/server/src/modules/core/jobs/handlers/exportJobHandler.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/mobile/`

## 设计

### Job 类型

- 队列名：`export_jobs`
- Job payload：

```ts
{
  orgId: string;
  userId: string;           // 请求导出的用户
  exportType: "cases" | "customers" | "document_items";
  format: "csv" | "excel";
  filters?: Record<string, unknown>;  // 筛选条件
}
```

### Handler 签名

```ts
export async function handleExportJob(
  pool: Pool,
  storageAdapter: StorageAdapter,
  queue: RedisQueue,
  job: QueueJob<ExportJobPayload>,
): Promise<void>;
```

### 处理流程

```
1. 根据 exportType 查询数据（通过 TenantDb）
2. 根据 format 生成文件（CSV 直接拼接，Excel 可选 exceljs）
3. 调用 storageAdapter.upload() 存储文件
4. 入队 notification_job 通知用户下载链接
5. 写 Timeline（action: "export_completed"）
```

## 实现规范

1. CSV 生成：纯字符串拼接，不引入重依赖
2. Excel 生成：如需依赖，在任务中标注需先 `npm install exceljs`
3. 文件 key 格式：`exports/{orgId}/{timestamp}_{exportType}.{ext}`
4. 查询限制：单次导出最多 10000 行
5. 大文件场景留 TODO（分片/流式）

## 测试要求

- mock `Pool` / `StorageAdapter` / `RedisQueue`
- 验证 CSV 生成格式正确
- 验证 storageAdapter.upload 被正确调用
- 验证 notification_job 被正确入队

## 是否涉及异步任务

是 — 本身是 Job Handler，且入队 notification_job

## DoD

- [ ] handleExportJob 函数已实现
- [ ] CSV 导出跑通
- [ ] 文件正确上传到 StorageAdapter
- [ ] 通知正确入队
- [ ] Timeline 写入
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=exportJobHandler
npm run guard
```
