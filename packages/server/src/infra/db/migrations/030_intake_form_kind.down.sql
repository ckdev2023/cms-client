-- 030_intake_form_kind rollback

drop index if exists idx_intake_forms_form_kind;

alter table intake_forms
  drop constraint if exists intake_forms_form_kind_chk;

alter table intake_forms
  drop column if exists form_kind;