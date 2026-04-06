# A3: DocumentItems CRUD 模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | A3 |
| Phase | A — 补齐后台核心 CRUD |
| 前置依赖 | A2 (Cases) |
| 后续解锁 | A4 (Reminders)、C1 (Reminder Job) |
| 预估工时 | 0.5-1 天 |

## 目标

为 DocumentItem 提供 CRUD + 状态变更 + 催办操作 API。

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/document-items/documentItems.service.ts`
- `packages/server/src/modules/core/document-items/documentItems.controller.ts`
- `packages/server/src/modules/core/document-items/documentItems.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/model/`
- `packages/server/src/infra/db/migrations/`
- `packages/mobile/`

## 数据模型来源

`coreEntities.ts` → `DocumentItem` 类型（L95-111）

对应 DB 表：`document_items`（见 `001_init.sql` L59-75）

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/document-items` | staff+ | 手动添加资料项（需传 caseId） |
| GET | `/document-items/:id` | viewer+ | 查看单个资料项 |
| GET | `/document-items` | viewer+ | 列表查询（支持 caseId / status 筛选） |
| PATCH | `/document-items/:id` | staff+ | 更新资料项信息 |
| POST | `/document-items/:id/transition` | staff+ | 状态变更：requested→received→reviewed/rejected |
| POST | `/document-items/:id/follow-up` | staff+ | 催办：更新 lastFollowUpAt |
| DELETE | `/document-items/:id` | manager+ | 软删除 |

## 实现规范

1. Service 注入 `Pool` + `TimelineService`
2. 催办操作：`lastFollowUpAt = now()` + 写 Timeline（action: `"document_item_follow_up"`）
3. 状态变更校验：只允许合法的状态流转
4. 所有写操作写 Timeline（entityType: `"document_item"`）

## 测试要求

- mock `Pool` / `TimelineService`
- 覆盖全部 service 方法
- 验证 follow-up 操作更新 lastFollowUpAt + 写 Timeline
- 验证非法状态变更抛异常

## 是否涉及异步任务

否（催办通知在 C1/C2 中实现）

## 注册到 AppModule

- controllers: `DocumentItemsController`
- providers: `DocumentItemsService`

## DoD

- [ ] 7 个 API 端点可调通
- [ ] 催办操作正确更新 lastFollowUpAt
- [ ] 状态变更有合法性校验
- [ ] 所有写操作写 Timeline
- [ ] org_id 隔离
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=documentItems
npm run guard
```
