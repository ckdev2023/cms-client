-- 030_intake_form_kind: intake_forms 加 form_kind 列
-- 权威来源: v2 计划 Phase D1

-- 新增 form_kind 列，三种合法值：general（通用信息采集）、bmv_questionnaire（BMV 问卷）、bmv_quote（BMV 报价）
alter table intake_forms
  add column if not exists form_kind text not null default 'general';

alter table intake_forms
  add constraint intake_forms_form_kind_chk
  check (form_kind in ('general', 'bmv_questionnaire', 'bmv_quote'));

-- 老数据回填 'general'（default 已处理新行；此 UPDATE 确保任何 NULL 行被修正）
update intake_forms set form_kind = 'general' where form_kind is null;

-- 索引：按 form_kind 过滤是 BMV 承接常用路径
create index if not exists idx_intake_forms_form_kind on intake_forms (form_kind);
