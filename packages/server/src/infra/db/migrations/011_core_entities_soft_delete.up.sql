alter table companies
  add column if not exists deleted_at timestamptz;

alter table contact_persons
  add column if not exists deleted_at timestamptz;

drop index if exists uq_companies_org_no;

create unique index if not exists uq_companies_org_no
  on companies(org_id, company_no)
  where company_no is not null and deleted_at is null;