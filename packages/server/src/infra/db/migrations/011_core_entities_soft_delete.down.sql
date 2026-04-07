drop index if exists uq_companies_org_no;

update contact_persons
set company_id = null,
    updated_at = now()
where company_id in (
  select id from companies where deleted_at is not null
);

delete from contact_persons where deleted_at is not null;
delete from companies where deleted_at is not null;

alter table contact_persons
  drop column if exists deleted_at;

alter table companies
  drop column if exists deleted_at;

create unique index if not exists uq_companies_org_no
  on companies(org_id, company_no)
  where company_no is not null;