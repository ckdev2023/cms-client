import {
  BMV_CASE_TYPE,
  BMV_REMINDER_SCHEDULE_BLUEPRINT,
} from "../cases/cases.template-bmv";
/**
 * 从源线索读取 group_id 与 owner_user_id 以便案件继承。
 * @param tenantDb - 多租户数据库连接。
 * @param sourceLeadId - 源线索 ID。
 * @returns 线索继承字段；线索不存在时返回 null。
 */
export async function fetchLeadInheritance(tenantDb, sourceLeadId) {
  const result = await tenantDb.query(
    `select group_id, owner_user_id from leads where id = $1`,
    [sourceLeadId],
  );
  const row = result.rows.at(0);
  if (!row) return null;
  return { groupId: row.group_id, ownerUserId: row.owner_user_id };
}
/**
 * 从 intake_forms 取当前报价版本的 form_data.amount。
 * @param tenantDb - 多租户数据库连接。
 * @param currentQuoteFormId - 当前报价表单 ID。
 * @returns 报价金额；取不到时返回 null。
 */
export async function fetchQuoteAmountFromForm(tenantDb, currentQuoteFormId) {
  const result = await tenantDb.query(
    `select form_data from intake_forms where id = $1`,
    [currentQuoteFormId],
  );
  const row = result.rows.at(0);
  if (!row?.form_data || typeof row.form_data !== "object") return null;
  const fd = row.form_data;
  const amount = fd.amount;
  if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  return null;
}
/**
 * 从 intake_forms 取 BMV 问卷 form_data 作为 survey_data 源。
 * @param tenantDb - 多租户数据库连接。
 * @param sourceLeadId - 源线索 ID（关联 intake_forms.lead_id）。
 * @returns 问卷 form_data；无数据时返回 null。
 */
export async function fetchSurveyDataFromQuestionnaire(tenantDb, sourceLeadId) {
  const result = await tenantDb.query(
    `select form_data from intake_forms
     where form_kind = 'bmv_questionnaire' and lead_id = $1
     order by updated_at desc limit 1`,
    [sourceLeadId],
  );
  const row = result.rows.at(0);
  if (!row?.form_data || typeof row.form_data !== "object") return null;
  return row.form_data;
}
export const RESIDENCE_PERIOD_PLACEHOLDER_DATE = "1970-01-01";
/**
 * 插入 residence_periods 占位行（日期待 COE 后回填）。
 * @param tenantDb - 多租户数据库连接。
 * @param orgId - 组织 ID。
 * @param caseId - 案件 ID。
 * @param customerId - 客户 ID。
 */
export async function insertResidencePeriodPlaceholder(
  tenantDb,
  orgId,
  caseId,
  customerId,
) {
  await tenantDb.query(
    `insert into residence_periods (
       org_id, case_id, customer_id, visa_type, status_of_residence,
       valid_from, valid_until, is_current, reminder_created, notes
     ) values ($1, $2, $3, $4, 'pending', $5, $5, false, false, $6)`,
    [
      orgId,
      caseId,
      customerId,
      BMV_CASE_TYPE,
      RESIDENCE_PERIOD_PLACEHOLDER_DATE,
      "BMV transition placeholder — dates to be filled after COE",
    ],
  );
}
const REMINDER_PLACEHOLDER_REMIND_AT = "9999-12-31T00:00:00.000Z";
/**
 * 按 BMV_REMINDER_SCHEDULE_BLUEPRINT 插入续签提醒占位行。
 * remind_at 使用占位值，待 COE 后由 case-module 计算回填。
 * @param tenantDb - 多租户数据库连接。
 * @param orgId - 组织 ID。
 * @param caseId - 案件 ID。
 * @param ownerUserId - 负责人 ID（提醒接收方）。
 */
export async function scheduleRenewalReminderPlaceholders(
  tenantDb,
  orgId,
  caseId,
  ownerUserId,
) {
  for (const item of BMV_REMINDER_SCHEDULE_BLUEPRINT) {
    const dedupeKey = `bmv_renewal_${caseId}_${String(item.daysBefore)}d`;
    await tenantDb.query(
      `insert into reminders (
         org_id, case_id, target_type, target_id, remind_at,
         recipient_type, recipient_id, channel, dedupe_key, send_status,
         payload_snapshot
       ) values ($1, $2, 'case', $3, $4, $5, $6, $7, $8, 'pending', $9::jsonb)`,
      [
        orgId,
        caseId,
        caseId,
        REMINDER_PLACEHOLDER_REMIND_AT,
        item.recipientType,
        ownerUserId,
        item.channel,
        dedupeKey,
        JSON.stringify({
          blueprintDaysBefore: item.daysBefore,
          label: item.label,
          pendingCoeDate: true,
        }),
      ],
    );
  }
}
//# sourceMappingURL=customers.bmv-transition-helpers.js.map
