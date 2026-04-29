/**
 * DTO smoke registry — 每个 service 的核心 SELECT 直接复用生产 SQL 常量。
 *
 * 测试会对每条 `buildSql()` 执行 `EXPLAIN (costs off)` 验证不含已漂移的列名。
 * 只需能通过 PG 语法校验即可；不需要真数据。
 *
 * 收录原则：只放「含 JOIN 或含跨表别名的 SELECT」——纯单表 SELECT 由
 * assertCriticalSchemaColumns 覆盖即可；JOIN 引用最容易漂移。
 *
 * 与生产 SQL 同源——import 而非拷贝——杜绝「改了 service 忘了改测试」的漂移。
 */

import {
  CASE_COLS_PREFIXED,
  SUMMARY_JOINS,
  SUMMARY_EXTRA_COLS,
} from "../../src/modules/core/cases/cases.service";
import {
  BILLING_PLAN_LIST_COLS,
  BILLING_PLAN_LIST_FROM,
} from "../../src/modules/core/billing/billingPlans.service";
import {
  PAYMENT_RECORD_LIST_COLS,
  PAYMENT_RECORD_LIST_FROM,
} from "../../src/modules/core/billing/paymentRecordHelpers";
import {
  GD_DTO_SELECT,
  GD_DTO_JOINS,
} from "../../src/modules/core/generated-documents/generatedDocuments.service";

const DUMMY_ORG = "'00000000-0000-0000-0000-000000000000'";

export type DtoSmokeEntry = {
  label: string;
  buildSql: () => string;
};

export const DTO_SMOKE_ENTRIES: DtoSmokeEntry[] = [
  // ─── cases ───
  {
    label: "cases.list (summary with customer/group/owner/assistant joins)",
    buildSql: () =>
      `select ${CASE_COLS_PREFIXED}, ${SUMMARY_EXTRA_COLS}
       from cases cs ${SUMMARY_JOINS}
       where cs.org_id = ${DUMMY_ORG} limit 1`,
  },

  // ─── generated-documents ───
  {
    label: "generatedDocuments.list (DTO with user name joins)",
    buildSql: () =>
      `select ${GD_DTO_SELECT} ${GD_DTO_JOINS}
       where gd.org_id = ${DUMMY_ORG} limit 1`,
  },

  // ─── billing_records (list with case/customer/owner join) ───
  {
    label: "billingPlans.list (case/customer/owner join)",
    buildSql: () =>
      `select ${BILLING_PLAN_LIST_COLS}
       from ${BILLING_PLAN_LIST_FROM}
       where br.org_id = ${DUMMY_ORG} limit 1`,
  },

  // ─── payment_records (list with billing/case/customer/user joins) ───
  {
    label: "paymentRecords.list (billing/case/customer/user joins)",
    buildSql: () =>
      `select ${PAYMENT_RECORD_LIST_COLS}
       from ${PAYMENT_RECORD_LIST_FROM}
       where pr.org_id = ${DUMMY_ORG} limit 1`,
  },

  // ─── timeline_logs (with user join) ───
  {
    label: "timeline.list (user join for actor display name)",
    buildSql: () =>
      `select
        tl.id, tl.org_id, tl.entity_type, tl.entity_id, tl.action,
        tl.actor_user_id,
        nullif(trim(u.name), '') as actor_display_name,
        tl.payload, tl.created_at
      from timeline_logs tl
      left join users u on u.id = tl.actor_user_id and u.org_id = tl.org_id
      where tl.org_id = ${DUMMY_ORG} limit 1`,
  },

  // ─── groups (with lateral count joins) ───
  {
    label: "groups.list (lateral case/member counts)",
    buildSql: () =>
      `select
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
      where g.org_id = ${DUMMY_ORG} limit 1`,
  },

  // ─── dashboard: todo panel (tasks + case + user join) ───
  {
    label: "dashboard.todoPanel (tasks with case/user joins)",
    buildSql: () =>
      `select
        t.id, t.case_id, t.title, t.task_type, t.due_at,
        t.priority, t.status
      from tasks t
      left join cases c on c.id = t.case_id and c.org_id = t.org_id
      left join users u on u.id = t.assignee_user_id and u.org_id = t.org_id
      where t.org_id = ${DUMMY_ORG}
        and t.status in ('pending', 'in_progress')
      limit 1`,
  },

  // ─── dashboard: deadline panel (cases + user join) ───
  {
    label: "dashboard.deadlinePanel (cases with user join)",
    buildSql: () =>
      `select
        c.id, c.case_no, c.case_name,
        coalesce(c.stage, c.status) as status,
        ceil(extract(epoch from (c.due_at - now())) / 86400.0)::int as days_left
      from cases c
      left join users u on u.id = c.owner_user_id and u.org_id = c.org_id
      where c.org_id = ${DUMMY_ORG}
        and c.archived_at is null
        and c.due_at is not null
      limit 1`,
  },

  // ─── dashboard: risk panel (cases + validation + review + user joins) ───
  {
    label: "dashboard.riskPanel (cases with validation/review/user joins)",
    buildSql: () =>
      `with latest_validation as (
        select distinct on (case_id) case_id, result_status
        from validation_runs
        where org_id = ${DUMMY_ORG}
        order by case_id, executed_at desc
      ),
      latest_review as (
        select distinct on (case_id) case_id, decision
        from review_records
        where org_id = ${DUMMY_ORG}
        order by case_id, reviewed_at desc
      )
      select
        c.id, c.case_no, c.case_name,
        c.billing_unpaid_amount_cached as unpaid_amount
      from cases c
      left join users u on u.id = c.owner_user_id and u.org_id = c.org_id
      left join latest_validation lv on lv.case_id = c.id
      left join latest_review lr on lr.case_id = c.id
      where c.org_id = ${DUMMY_ORG}
        and c.archived_at is null
      limit 1`,
  },

  // ─── single-table selections (no join, but verify critical columns exist) ───
  {
    label: "customers.list (base_profile column exists)",
    buildSql: () =>
      `select id, org_id, type, base_profile, contacts, created_at, updated_at
      from customers
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "reminders.list (target_type / send_status / remind_at exist)",
    buildSql: () =>
      `select id, org_id, case_id, target_type, target_id, remind_at,
        recipient_type, recipient_id, channel, dedupe_key, send_status,
        retry_count, sent_at, payload_snapshot, created_at, updated_at
      from reminders
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "tasks.list (all TASK_COLS)",
    buildSql: () =>
      `select id, org_id, case_id, title, description, task_type,
        assignee_user_id, priority, due_at, status, source_type, source_id,
        completed_at, created_at, updated_at
      from tasks
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "submission_packages.list (all cols)",
    buildSql: () =>
      `select id, org_id, case_id, submission_no, submission_kind,
        submitted_at, validation_run_id, review_record_id, authority_name,
        acceptance_no, receipt_storage_type, receipt_relative_path_or_key,
        related_submission_id, created_by, created_at
      from submission_packages
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "document_items.list (all DOC_ITEM_COLS)",
    buildSql: () =>
      `select id, org_id, case_id, checklist_item_code, name, status,
        required_flag, requested_at, received_at, reviewed_at, due_at,
        owner_side, last_follow_up_at, note, category, survey_data,
        created_at, updated_at
      from document_items
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "residence_periods.list (date cast columns)",
    buildSql: () =>
      `select id, org_id, case_id, customer_id, visa_type, status_of_residence,
        period_years, period_label, valid_from::text as valid_from,
        valid_until::text as valid_until, card_number, is_current,
        entry_date::text as entry_date, reminder_created, notes,
        created_by, created_at, updated_at
      from residence_periods
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "communication_logs.list (all COMM_LOG_COLS)",
    buildSql: () =>
      `select id, org_id, case_id, customer_id, company_id, channel_type,
        direction, subject, content_summary, full_content, visible_to_client,
        created_by, follow_up_required, follow_up_due_at, created_at
      from communication_logs
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "companies.list (all COMPANY_COLS)",
    buildSql: () =>
      `select id, org_id, company_no, company_name, corporate_number,
        established_date, capital_amount, address, business_scope,
        employee_count, fiscal_year_end, website, contact_phone, contact_email,
        owner_user_id, created_at, updated_at
      from companies
      where org_id = ${DUMMY_ORG}
        and deleted_at is null
      limit 1`,
  },
  {
    label: "contact_persons.list (all CONTACT_PERSON_COLS)",
    buildSql: () =>
      `select id, org_id, company_id, customer_id, name, role_title,
        relation_type, phone, email, preferred_language, created_at, updated_at
      from contact_persons
      where org_id = ${DUMMY_ORG}
        and deleted_at is null
      limit 1`,
  },
  {
    label: "validation_runs.list (all cols)",
    buildSql: () =>
      `select id, org_id, case_id, ruleset_ref, result_status, blocking_count,
        warning_count, report_payload, executed_by, executed_at, created_at, updated_at
      from validation_runs
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "review_records.list (all cols)",
    buildSql: () =>
      `select id, org_id, case_id, validation_run_id, decision, comment,
        reviewer_user_id, reviewed_at, created_at, updated_at
      from review_records
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "document_files.list (all DOC_FILE_COLS)",
    buildSql: () =>
      `select id, org_id, requirement_id, file_name, file_url, file_type,
        file_size, version_no, uploaded_by, uploaded_at, storage_type,
        relative_path, review_status, review_by, review_at, expiry_date,
        hash_value, created_at
      from document_files
      where org_id = ${DUMMY_ORG} limit 1`,
  },
  {
    label: "case_parties.list (all PARTY_COLS)",
    buildSql: () =>
      `select id, org_id, case_id, party_type, customer_id, contact_person_id,
        relation_to_case, is_primary, created_at, updated_at
      from case_parties
      where org_id = ${DUMMY_ORG} limit 1`,
  },
];

/**
 * 生产 service 源文件路径（相对 packages/server/）。
 * 用于 drift detection 测试读取源码扫描漂移 token。
 */
export const PRODUCTION_SQL_SOURCE_FILES = [
  "src/modules/core/cases/cases.service.ts",
  "src/modules/core/billing/billingPlans.service.ts",
  "src/modules/core/billing/paymentRecordHelpers.ts",
  "src/modules/core/billing/billingSummary.service.ts",
  "src/modules/core/generated-documents/generatedDocuments.service.ts",
];

/**
 * 已知高漂移 SQL token — 曾在生产中引发 500 的列引用。
 * 每条包含一条正则和一段说明，drift detection 测试遍历源文件扫描。
 */
export const DRIFT_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    pattern: /\b\w+\.display_name\b/,
    description: "users.display_name 已重命名为 users.name (BUG-108/122)",
  },
  {
    pattern: /\bcu\.name\b/,
    description: "customers 表无 name 列，应使用 customerNameExpr() (BUG-108)",
  },
];
