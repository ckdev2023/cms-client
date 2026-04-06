# D2: Portal RLS

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D2 |
| Phase | D — Portal 域对象建模 |
| 前置依赖 | D1 (Portal Migration) |
| 后续解锁 | D4 (Portal Modules) |
| 预估工时 | 0.5 天 |

## 目标

为 Portal 域表启用 Row Level Security，与核心表保持一致的多租户隔离策略。

## 范围

### 需要创建的文件

- `packages/server/src/infra/db/migrations/008_portal_rls.sql`

### 不可修改的文件

- 所有已有 migration 文件
- `packages/mobile/`

## 设计

### RLS 策略

| 表 | 启用 RLS | 策略 | 说明 |
|---|---|---|---|
| app_users | **否** | — | 独立账号体系，不走 org_id 隔离 |
| leads | 是 | `assigned_org_id = app_current_org_id()` | 按分配 org 隔离 |
| conversations | 是 | `org_id = app_current_org_id()` | 标准 org 隔离 |
| messages | 是 | `org_id = app_current_org_id()` | 标准 org 隔离 |
| user_documents | 是 | `org_id = app_current_org_id()` | 标准 org 隔离 |
| intake_forms | **否** | — | 用户提交阶段可能尚未分配 org |

### SQL 模板（参考 002_rls.sql）

```sql
alter table leads enable row level security;
drop policy if exists org_isolation on leads;
create policy org_isolation on leads
  using (assigned_org_id = app_current_org_id())
  with check (assigned_org_id = app_current_org_id());

-- conversations / messages / user_documents 同理，使用 org_id 列
```

### 特殊考量

- **leads**：用 `assigned_org_id` 而非 `org_id`，因为未分配前 org_id 为空
- **app_users / intake_forms**：不启用 RLS，但需在 Service 层做访问控制
- 已有 `app_current_org_id()` 函数（002_rls.sql 已定义），直接复用

## 测试要求

- 确认 migration 可成功执行
- 确认与现有 RLS 策略无冲突

## DoD

- [ ] 008_portal_rls.sql 创建完毕
- [ ] leads / conversations / messages / user_documents 启用 RLS
- [ ] app_users / intake_forms 不启用 RLS
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
