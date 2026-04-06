create table if not exists template_versions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  kind text not null,
  key text not null,
  version int not null,
  config jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  unique (org_id, kind, key, version)
);

create index if not exists idx_template_versions_org_kind_key_version_desc
  on template_versions(org_id, kind, key, version desc);

create table if not exists template_releases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  kind text not null,
  key text not null,
  mode text not null default 'legacy',
  current_version int,
  previous_version int,
  rollout jsonb not null default '{"type":"all"}'::jsonb,
  updated_by_user_id uuid references users(id),
  updated_at timestamptz not null default now(),
  unique (org_id, kind, key)
);

create index if not exists idx_template_releases_org_kind_key
  on template_releases(org_id, kind, key);
