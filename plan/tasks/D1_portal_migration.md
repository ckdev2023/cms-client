# D1: Portal Migration

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D1 |
| Phase | D — Portal 域对象建模 |
| 前置依赖 | Phase A 全部完成 |
| 后续解锁 | D2 (Portal RLS)、D3 (Portal 类型) |
| 预估工时 | 0.5 天 |

## 目标

为用户端 Portal 域创建全部 6 张数据库表 + 索引。

## 范围

### 需要创建的文件

- `packages/server/src/infra/db/migrations/007_portal.sql`

### 不可修改的文件

- 所有已有 migration 文件（001-006）
- `packages/mobile/`

## 数据模型来源

架构指南 v3 §阶段 2 + §7

## 表设计

### app_users

```sql
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  preferred_language text not null default 'zh',
  name text not null,
  email text,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 注意：app_users 不含 org_id（独立账号体系，可跨事务所）
```

### leads

```sql
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),         -- 可为空（未分配）
  app_user_id uuid not null references app_users(id),
  source text not null default 'web',
  language text not null default 'zh',
  status text not null default 'new',
  assigned_org_id uuid references organizations(id),
  assigned_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_leads_assigned_org_status on leads(assigned_org_id, status);
create index idx_leads_language_status on leads(language, status);
create index idx_leads_created_at on leads(created_at);
```

### conversations

```sql
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  app_user_id uuid not null references app_users(id),
  org_id uuid references organizations(id),
  channel text not null default 'web',
  preferred_language text not null default 'zh',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_conversations_org_status on conversations(org_id, status);
create index idx_conversations_app_user on conversations(app_user_id, created_at);
```

### messages

```sql
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id),
  org_id uuid references organizations(id),
  sender_type text not null,           -- "app_user" | "staff"
  sender_id uuid not null,
  original_language text not null,
  original_text text not null,
  translated_text_ja text,
  translated_text_zh text,
  translated_text_en text,
  translation_status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_messages_org on messages(org_id, created_at);
```

### user_documents

```sql
create table if not exists user_documents (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references app_users(id),
  org_id uuid references organizations(id),
  lead_id uuid references leads(id),
  case_id uuid references cases(id),
  file_key text not null,
  file_name text not null,
  doc_type text not null default 'other',
  status text not null default 'uploaded',
  uploaded_at timestamptz not null default now()
);
```

### intake_forms

```sql
create table if not exists intake_forms (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references app_users(id),
  lead_id uuid references leads(id),
  case_draft_id uuid,
  form_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 关键原则

- **app_users 不含 org_id**（独立于事务所）
- **leads.org_id 可为空**（未分配时）
- **messages 必须保留 originalText + 各语言译文**
- **user_documents 与 document_items 分离**（用户上传 vs 案件资料项）

## 测试要求

- 确认 migration 可成功执行（`runMigrations` 不报错）
- 确认与现有表无冲突

## DoD

- [ ] 007_portal.sql 创建完毕
- [ ] 6 张表 + 索引
- [ ] app_users 无 org_id
- [ ] leads.org_id nullable
- [ ] messages 含原文 + 三语译文 + translationStatus
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
# 手动验证：连接 PostgreSQL 执行 migration
```
