# S9: Task 任务模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S9 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S16（Migration ✅）、S15（TimelineEntityType） |
| 后续解锁 | 无 |
| 预估工时 | 0.5 天 |

## 目标

为案件推进提供任务驱动能力。对应产品文档 `06-数据模型设计 §3.9`。

## 数据库表

表 `tasks` 已在 `009_core_entities.up.sql` 创建，字段：
- id, org_id, case_id(nullable), title, description
- task_type, assignee_user_id(nullable FK), priority, due_at
- status, source_type, source_id, completed_at
- created_at, updated_at

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/tasks/tasks.service.ts`
- `packages/server/src/modules/core/tasks/tasks.controller.ts`
- `packages/server/src/modules/core/tasks/tasks.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 新增 `Task` 类型

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/tasks` | staff+ | 创建任务 |
| GET | `/tasks` | viewer+ | 列表（`?caseId=&assigneeUserId=&status=&page=&limit=`） |
| GET | `/tasks/:id` | viewer+ | 查看单个 |
| PATCH | `/tasks/:id` | staff+ | 更新 |
| POST | `/tasks/:id/complete` | staff+ | 完成任务 |
| POST | `/tasks/:id/cancel` | staff+ | 取消任务 |

## 实现规范

1. status 枚举：pending → in_progress → completed / cancelled
2. status 流转规则：
   - pending → in_progress / completed / cancelled
   - in_progress → completed / cancelled
   - completed / cancelled 为终态
3. complete 时自动填充 completed_at = now()
4. task_type 枚举：general / document_follow_up / client_contact / submission / review
5. priority 枚举：low / normal / high / urgent
6. 写操作写 Timeline（entityType = `"task"`）
7. source_type/source_id 标记任务来源（如 document_item / case）

## 测试要求

- CRUD + complete + cancel 全覆盖
- 状态流转验证（合法/非法）
- 终态不可再变更
- 按 caseId/assigneeUserId/status 过滤列表
- 多租户隔离

## DoD

- [ ] 6 个 API 端点
- [ ] 状态机 4 状态
- [ ] 自动填充 completed_at
- [ ] Timeline 写入
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
