create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text,
  status text not null default 'queued',
  attempts int not null default 0,
  max_retries int not null default 3,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  finished_at timestamptz,
  last_error jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_org_status_run_at
  on jobs(org_id, status, run_at);

create index if not exists idx_jobs_status_run_at
  on jobs(status, run_at);

create unique index if not exists uq_jobs_idempotency
  on jobs(org_id, type, idempotency_key)
  where idempotency_key is not null;
