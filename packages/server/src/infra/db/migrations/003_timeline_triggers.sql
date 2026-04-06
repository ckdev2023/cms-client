create or replace function app_current_actor_user_id() returns uuid
language plpgsql
stable
as $$
declare
  v text;
begin
  v := current_setting('app.actor_user_id', true);
  if v is null or v = '' then
    return null;
  end if;
  return v::uuid;
end;
$$;

create or replace function trg_cases_status_timeline() returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
    values (
      new.org_id,
      'case',
      new.id,
      'case.status_changed',
      app_current_actor_user_id(),
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists cases_status_timeline on cases;
create trigger cases_status_timeline
after update of status on cases
for each row
execute function trg_cases_status_timeline();

create or replace function trg_document_items_status_timeline() returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
    values (
      new.org_id,
      'document_item',
      new.id,
      'document_item.status_changed',
      app_current_actor_user_id(),
      jsonb_build_object(
        'caseId', new.case_id,
        'from', old.status,
        'to', new.status
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists document_items_status_timeline on document_items;
create trigger document_items_status_timeline
after update of status on document_items
for each row
execute function trg_document_items_status_timeline();

create or replace function trg_cases_delete_timeline() returns trigger
language plpgsql
as $$
begin
  insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
  values (
    old.org_id,
    'case',
    old.id,
    'case.deleted',
    app_current_actor_user_id(),
    jsonb_build_object('status', old.status)
  );
  return old;
end;
$$;

drop trigger if exists cases_delete_timeline on cases;
create trigger cases_delete_timeline
before delete on cases
for each row
execute function trg_cases_delete_timeline();

create or replace function trg_document_items_delete_timeline() returns trigger
language plpgsql
as $$
begin
  insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
  values (
    old.org_id,
    'document_item',
    old.id,
    'document_item.deleted',
    app_current_actor_user_id(),
    jsonb_build_object(
      'caseId', old.case_id,
      'status', old.status
    )
  );
  return old;
end;
$$;

drop trigger if exists document_items_delete_timeline on document_items;
create trigger document_items_delete_timeline
before delete on document_items
for each row
execute function trg_document_items_delete_timeline();

