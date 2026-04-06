-- 007_portal: Portal 域 6 张表 + 索引

-- app_users: 独立账号体系，不含 org_id，可跨事务所
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

-- leads: 线索，org_id 可为空（未分配时）
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  app_user_id uuid not null references app_users(id),
  source text not null default 'web',
  language text not null default 'zh',
  status text not null default 'new',
  assigned_org_id uuid references organizations(id),
  assigned_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_leads_assigned_org_status on leads(assigned_org_id, status);
create index if not exists idx_leads_language_status on leads(language, status);
create index if not exists idx_leads_created_at on leads(created_at);

-- conversations: 会话
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
create index if not exists idx_conversations_org_status on conversations(org_id, status);
create index if not exists idx_conversations_app_user on conversations(app_user_id, created_at);

-- messages: 消息，保留原文 + 三语译文 + translationStatus
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id),
  org_id uuid references organizations(id),
  sender_type text not null,
  sender_id uuid not null,
  original_language text not null,
  original_text text not null,
  translated_text_ja text,
  translated_text_zh text,
  translated_text_en text,
  translation_status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_messages_org on messages(org_id, created_at);

-- user_documents: 用户上传文件（与 document_items 分离）
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

-- intake_forms: 进件表单
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
