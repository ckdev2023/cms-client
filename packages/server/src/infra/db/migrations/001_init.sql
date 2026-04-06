create extension if not exists pgcrypto;

create table if not exists schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  name text not null,
  email text not null,
  role text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, email)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  type text not null,
  base_profile jsonb not null default '{}'::jsonb,
  contacts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  customer_id uuid not null references customers(id),
  case_type_code text not null,
  status text not null,
  owner_user_id uuid not null references users(id),
  opened_at timestamptz not null default now(),
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cases_org_status on cases(org_id, status);
create index if not exists idx_cases_org_owner on cases(org_id, owner_user_id);
create index if not exists idx_cases_org_due on cases(org_id, due_at);
create index if not exists idx_cases_org_customer on cases(org_id, customer_id);

create table if not exists document_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  case_id uuid not null references cases(id),
  checklist_item_code text not null,
  name text not null,
  status text not null,
  requested_at timestamptz,
  received_at timestamptz,
  reviewed_at timestamptz,
  due_at timestamptz,
  owner_side text not null,
  last_follow_up_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_items_case_status on document_items(case_id, status);
create index if not exists idx_document_items_org_due on document_items(org_id, due_at);
create index if not exists idx_document_items_org_follow_up on document_items(org_id, last_follow_up_at);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  entity_type text not null,
  entity_id uuid not null,
  scheduled_at timestamptz not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reminders_org_schedule_status on reminders(org_id, scheduled_at, status);

create table if not exists timeline_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_user_id uuid references users(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_timeline_logs_org_entity_created_at on timeline_logs(org_id, entity_type, entity_id, created_at desc);

create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  key text not null,
  enabled boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, key)
);
