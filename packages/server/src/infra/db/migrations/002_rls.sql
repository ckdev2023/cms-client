create or replace function app_current_org_id() returns uuid
language plpgsql
stable
as $$
declare
  v text;
begin
  v := current_setting('app.org_id', true);
  if v is null or v = '' then
    raise exception 'missing app.org_id';
  end if;
  return v::uuid;
end;
$$;

alter table users enable row level security;
drop policy if exists org_isolation on users;
create policy org_isolation on users
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table customers enable row level security;
drop policy if exists org_isolation on customers;
create policy org_isolation on customers
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table cases enable row level security;
drop policy if exists org_isolation on cases;
create policy org_isolation on cases
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table document_items enable row level security;
drop policy if exists org_isolation on document_items;
create policy org_isolation on document_items
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table reminders enable row level security;
drop policy if exists org_isolation on reminders;
create policy org_isolation on reminders
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table timeline_logs enable row level security;
drop policy if exists org_isolation on timeline_logs;
create policy org_isolation on timeline_logs
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table feature_flags enable row level security;
drop policy if exists org_isolation on feature_flags;
create policy org_isolation on feature_flags
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());
