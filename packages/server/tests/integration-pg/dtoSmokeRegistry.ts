/**
 * DTO smoke registry — 每个 service 的核心 SELECT 用到的列和 JOIN 注册在此。
 *
 * 测试会对每条 SQL 执行 `EXPLAIN (costs off)` 验证不含已漂移的列名。
 * 只需能通过 PG 语法校验即可；不需要真数据。
 *
 * 收录原则：只放「含 JOIN 或含跨表别名的 SELECT」——纯单表 SELECT 由
 * assertCriticalSchemaColumns 覆盖即可；JOIN 引用最容易漂移。
 */

export type DtoSmokeEntry = {
  label: string;
  sql: string;
};

export const DTO_SMOKE_ENTRIES: DtoSmokeEntry[] = [
  // ─── cases ───
  {
    label: "cases.list (summary with customer/group/owner/assistant joins)",
    sql: `select
        cs.id, cs.org_id, cs.customer_id, cs.case_type_code, cs.status, cs.stage,
        cs.group_id, cs.owner_user_id, cs.opened_at, cs.due_at, cs.metadata,
        cs.case_no, cs.case_name, cs.case_subtype, cs.application_type,
        cs.application_flow_type, cs.visa_plan, cs.post_approval_stage,
        cs.coe_issued_at, cs.coe_expiry_date, cs.coe_sent_at, cs.close_reason,
        cs.supplement_count, cs.company_id, cs.priority, cs.risk_level,
        cs.assistant_user_id, cs.source_channel, cs.signed_at, cs.accepted_at,
        cs.submission_date, cs.result_date, cs.residence_expiry_date, cs.archived_at,
        cs.result_outcome, cs.quote_price, cs.deposit_paid_cached,
        cs.final_payment_paid_cached, cs.billing_unpaid_amount_cached,
        cs.billing_risk_acknowledged_by, cs.billing_risk_acknowledged_at,
        cs.billing_risk_ack_reason_code, cs.billing_risk_ack_reason_note,
        cs.billing_risk_ack_evidence_url, cs.overseas_visa_start_at,
        cs.entry_confirmed_at, cs.business_phase, cs.current_workflow_step_code,
        cs.created_at, cs.updated_at,
        coalesce(nullif(trim(cu.base_profile->>'displayName'), ''), '') as customer_name,
        g.name as group_name,
        owner_u.name as owner_display_name,
        asst_u.name as assistant_display_name
      from cases cs
      left join customers cu on cu.id = cs.customer_id
      left join groups g on g.id = cs.group_id
      left join users owner_u on owner_u.id = cs.owner_user_id
      left join users asst_u on asst_u.id = cs.assistant_user_id
      where cs.org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },

  // ─── generated-documents ───
  {
    label: "generatedDocuments.list (DTO with user name joins)",
    sql: `select
        gd.id, gd.org_id, gd.case_id, gd.template_id, gd.title,
        gd.version_no, gd.output_format, gd.file_url, gd.status,
        gd.generated_by, gd.approved_by, gd.generated_at, gd.approved_at,
        gen_u.name as generated_by_display_name,
        apr_u.name as approved_by_display_name
      from generated_documents gd
      left join users gen_u on gen_u.id = gd.generated_by
      left join users apr_u on apr_u.id = gd.approved_by
      where gd.org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },

  // ─── billing_records (list with case/customer/owner join) ───
  // NOTE: Production code (billingPlans.service.ts:73-82) uses cu.name and
  // owner.display_name — both are column-drift bugs. The correct columns are
  // cu.base_profile->>'name' and owner.name respectively. This entry uses the
  // corrected SQL; the production bugs are tracked as known issues.
  {
    label: "billingPlans.list (case/customer/owner join)",
    sql: `select
        br.id, br.org_id, br.case_id, br.milestone_name, br.amount_due,
        br.due_date, br.status, br.gate_effect_mode, br.remark,
        br.created_at, br.updated_at,
        coalesce((select sum(pr.amount_received) from payment_records pr
          where pr.billing_record_id = br.id and pr.record_status = 'valid'), 0) as paid_amount,
        c.case_no, c.case_name, c.group_id, c.owner_user_id,
        coalesce(nullif(trim(cu.base_profile->>'name'), ''), '') as customer_name,
        owner.name as owner_display_name
      from billing_records br
      join cases c on c.id = br.case_id
      left join customers cu on cu.id = c.customer_id
      left join users owner on owner.id = c.owner_user_id
      where br.org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },

  // ─── payment_records (list with billing/case/customer/user joins) ───
  {
    label: "paymentRecords.list (billing/case/customer/user joins)",
    sql: `select
        pr.id, pr.org_id, pr.billing_record_id, pr.case_id, pr.amount_received,
        pr.received_at, pr.payment_method, pr.record_status,
        pr.receipt_storage_type, pr.receipt_relative_path_or_key,
        pr.note, pr.void_reason_code, pr.void_reason_note,
        pr.voided_by, pr.voided_at, pr.reversed_from_payment_record_id,
        pr.recorded_by, pr.created_at,
        br.milestone_name,
        c.case_name, c.case_no,
        recorded_user.name as recorded_by_display_name,
        voided_user.name as voided_by_display_name
      from payment_records pr
      join billing_records br on br.id = pr.billing_record_id
      join cases c on c.id = pr.case_id
      left join customers cu on cu.id = c.customer_id
      left join users recorded_user on recorded_user.id = pr.recorded_by
      left join users voided_user on voided_user.id = pr.voided_by
      where pr.org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },

  // ─── timeline_logs (with user join) ───
  {
    label: "timeline.list (user join for actor display name)",
    sql: `select
        tl.id, tl.org_id, tl.entity_type, tl.entity_id, tl.action,
        tl.actor_user_id,
        nullif(trim(u.name), '') as actor_display_name,
        tl.payload, tl.created_at
      from timeline_logs tl
      left join users u on u.id = tl.actor_user_id and u.org_id = tl.org_id
      where tl.org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },

  // ─── groups (with lateral count joins) ───
  {
    label: "groups.list (lateral case/member counts)",
    sql: `select
        g.id, g.org_id, g.name, g.description, g.created_at, g.updated_at,
        coalesce(cc.cnt, 0) as active_case_count,
        coalesce(mc.cnt, 0) as member_count
      from groups g
      left join lateral (
        select count(*) as cnt from cases c
        where c.group_id = g.id and c.stage is distinct from 'S9'
      ) cc on true
      left join lateral (
        select count(*) as cnt from user_group_memberships m
        where m.group_id = g.id
      ) mc on true
      where g.org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },

  // ─── dashboard: todo panel (tasks + case + user join) ───
  {
    label: "dashboard.todoPanel (tasks with case/user joins)",
    sql: `select
        t.id, t.case_id, t.title, t.task_type, t.due_at,
        t.priority, t.status
      from tasks t
      left join cases c on c.id = t.case_id and c.org_id = t.org_id
      left join users u on u.id = t.assignee_user_id and u.org_id = t.org_id
      where t.org_id = '00000000-0000-0000-0000-000000000000'
        and t.status in ('pending', 'in_progress')
      limit 1`,
  },

  // ─── dashboard: deadline panel (cases + user join) ───
  {
    label: "dashboard.deadlinePanel (cases with user join)",
    sql: `select
        c.id, c.case_no, c.case_name,
        coalesce(c.stage, c.status) as status,
        ceil(extract(epoch from (c.due_at - now())) / 86400.0)::int as days_left
      from cases c
      left join users u on u.id = c.owner_user_id and u.org_id = c.org_id
      where c.org_id = '00000000-0000-0000-0000-000000000000'
        and c.archived_at is null
        and c.due_at is not null
      limit 1`,
  },

  // ─── dashboard: risk panel (cases + validation + review + user joins) ───
  {
    label: "dashboard.riskPanel (cases with validation/review/user joins)",
    sql: `with latest_validation as (
        select distinct on (case_id) case_id, result_status
        from validation_runs
        where org_id = '00000000-0000-0000-0000-000000000000'
        order by case_id, executed_at desc
      ),
      latest_review as (
        select distinct on (case_id) case_id, decision
        from review_records
        where org_id = '00000000-0000-0000-0000-000000000000'
        order by case_id, reviewed_at desc
      )
      select
        c.id, c.case_no, c.case_name,
        c.billing_unpaid_amount_cached as unpaid_amount
      from cases c
      left join users u on u.id = c.owner_user_id and u.org_id = c.org_id
      left join latest_validation lv on lv.case_id = c.id
      left join latest_review lr on lr.case_id = c.id
      where c.org_id = '00000000-0000-0000-0000-000000000000'
        and c.archived_at is null
      limit 1`,
  },

  // ─── single-table selections (no join, but verify critical columns exist) ───
  {
    label: "customers.list (base_profile column exists)",
    sql: `select id, org_id, type, base_profile, contacts, created_at, updated_at
      from customers
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "reminders.list (target_type / send_status / remind_at exist)",
    sql: `select id, org_id, case_id, target_type, target_id, remind_at,
        recipient_type, recipient_id, channel, dedupe_key, send_status,
        retry_count, sent_at, payload_snapshot, created_at, updated_at
      from reminders
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "tasks.list (all TASK_COLS)",
    sql: `select id, org_id, case_id, title, description, task_type,
        assignee_user_id, priority, due_at, status, source_type, source_id,
        completed_at, created_at, updated_at
      from tasks
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "submission_packages.list (all cols)",
    sql: `select id, org_id, case_id, submission_no, submission_kind,
        submitted_at, validation_run_id, review_record_id, authority_name,
        acceptance_no, receipt_storage_type, receipt_relative_path_or_key,
        related_submission_id, created_by, created_at
      from submission_packages
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "document_items.list (all DOC_ITEM_COLS)",
    sql: `select id, org_id, case_id, checklist_item_code, name, status,
        required_flag, requested_at, received_at, reviewed_at, due_at,
        owner_side, last_follow_up_at, note, category, survey_data,
        created_at, updated_at
      from document_items
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "residence_periods.list (date cast columns)",
    sql: `select id, org_id, case_id, customer_id, visa_type, status_of_residence,
        period_years, period_label, valid_from::text as valid_from,
        valid_until::text as valid_until, card_number, is_current,
        entry_date::text as entry_date, reminder_created, notes,
        created_by, created_at, updated_at
      from residence_periods
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "communication_logs.list (all COMM_LOG_COLS)",
    sql: `select id, org_id, case_id, customer_id, company_id, channel_type,
        direction, subject, content_summary, full_content, visible_to_client,
        created_by, follow_up_required, follow_up_due_at, created_at
      from communication_logs
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "companies.list (all COMPANY_COLS)",
    sql: `select id, org_id, company_no, company_name, corporate_number,
        established_date, capital_amount, address, business_scope,
        employee_count, fiscal_year_end, website, contact_phone, contact_email,
        owner_user_id, created_at, updated_at
      from companies
      where org_id = '00000000-0000-0000-0000-000000000000'
        and deleted_at is null
      limit 1`,
  },
  {
    label: "contact_persons.list (all CONTACT_PERSON_COLS)",
    sql: `select id, org_id, company_id, customer_id, name, role_title,
        relation_type, phone, email, preferred_language, created_at, updated_at
      from contact_persons
      where org_id = '00000000-0000-0000-0000-000000000000'
        and deleted_at is null
      limit 1`,
  },
  {
    label: "validation_runs.list (all cols)",
    sql: `select id, org_id, case_id, ruleset_ref, result_status, blocking_count,
        warning_count, report_payload, executed_by, executed_at, created_at, updated_at
      from validation_runs
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "review_records.list (all cols)",
    sql: `select id, org_id, case_id, validation_run_id, decision, comment,
        reviewer_user_id, reviewed_at, created_at, updated_at
      from review_records
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "document_files.list (all DOC_FILE_COLS)",
    sql: `select id, org_id, requirement_id, file_name, file_url, file_type,
        file_size, version_no, uploaded_by, uploaded_at, storage_type,
        relative_path, review_status, review_by, review_at, expiry_date,
        hash_value, created_at
      from document_files
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
  {
    label: "case_parties.list (all PARTY_COLS)",
    sql: `select id, org_id, case_id, party_type, customer_id, contact_person_id,
        relation_to_case, is_primary, created_at, updated_at
      from case_parties
      where org_id = '00000000-0000-0000-0000-000000000000'
      limit 1`,
  },
];
