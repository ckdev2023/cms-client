/**
 * cases SQL 列常量与片段。
 *
 * 与 `cases.service.ts` / `cases.service.row-mappers.ts` / `cases.service.detail-queries.ts`
 * 共用，集中维护避免散落各处。
 */
import { customerNameExpr } from "../../../infra/db/customerNameExpr";

/** cases 表完整列清单（与 CaseQueryRow 对齐）。 */
export const CASE_COLS = `id, org_id, customer_id, case_type_code, status, stage, group_id, owner_user_id, opened_at, due_at, metadata, case_no, case_name, case_subtype, application_type, application_flow_type, visa_plan, post_approval_stage, coe_issued_at, coe_expiry_date, coe_sent_at, close_reason, supplement_count, company_id, priority, risk_level, assistant_user_id, source_channel, signed_at, accepted_at, submission_date, result_date, residence_expiry_date, archived_at, result_outcome, quote_price, deposit_paid_cached, final_payment_paid_cached, billing_unpaid_amount_cached, billing_risk_acknowledged_by, billing_risk_acknowledged_at, billing_risk_ack_reason_code, billing_risk_ack_reason_note, billing_risk_ack_evidence_url, overseas_visa_start_at, entry_confirmed_at, jurisdiction_authority, business_phase, current_workflow_step_code, created_at, updated_at`;

/** business_phase → stage 映射 SQL（用于 phase 维度推进时同步 stage 列）。 */
export const PHASE_TO_STAGE_SQL = `case
  when $2 in ('CLOSED_SUCCESS','CLOSED_FAILED') then 'S9'
  when $2 in ('CONSULTING','CONTRACTED') then 'S1'
  when $2 = 'WAITING_MATERIAL' then 'S2'
  when $2 = 'MATERIAL_PREPARING' then 'S3'
  when $2 = 'REVIEWING' then 'S4'
  when $2 in ('APPLYING','UNDER_REVIEW','NEED_SUPPLEMENT','SUPPLEMENT_PROCESSING') then 'S5'
  when $2 in ('APPROVED','REJECTED') then 'S6'
  when $2 in ('WAITING_PAYMENT','COE_SENT','VISA_APPLYING','VISA_REJECTED') then 'S7'
  when $2 in ('SUCCESS','RESIDENCE_PERIOD_RECORDED','RENEWAL_REMINDER_SCHEDULED') then 'S8'
  else stage
end`;

/** 带 `cs.` 前缀的列清单（用于 JOIN summary 查询）。 */
export const CASE_COLS_PREFIXED = CASE_COLS.split(", ")
  .map((col) => `cs.${col}`)
  .join(", ");

const CUSTOMER_NAME_EXPR = customerNameExpr("cu");

/** summary 查询需要的 JOIN 子句。 */
export const SUMMARY_JOINS = `
  left join customers cu on cu.id = cs.customer_id
  left join groups g on g.id = cs.group_id
  left join users owner_u on owner_u.id = cs.owner_user_id
  left join users asst_u on asst_u.id = cs.assistant_user_id
`;

/** summary 查询追加的派生列。 */
export const SUMMARY_EXTRA_COLS = `
  ${CUSTOMER_NAME_EXPR} as customer_name,
  nullif(trim(cu.base_profile->>'name_cn'), '') as customer_name_zh,
  nullif(trim(cu.base_profile->>'name_jp'), '') as customer_name_ja,
  nullif(trim(cu.base_profile->>'name_en'), '') as customer_name_en,
  g.name as group_name,
  owner_u.name as owner_display_name,
  asst_u.name as assistant_display_name
`;

/** residence_periods summary 查询的列清单。 */
export const RESIDENCE_PERIOD_SUMMARY_COLS =
  "id, org_id, case_id, customer_id, visa_type, status_of_residence, period_years, period_label, valid_from, valid_until, card_number, is_current, entry_date, reminder_created, notes, created_by, created_at, updated_at";
