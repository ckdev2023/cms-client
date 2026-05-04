// ────────────────────────────────────────────────────────────────
// P1 Leads 契约扩展 — 冻结接口边界
//
// 明确 leads 模块在经营管理签（BMV）流程中的职责：
//   - 标记咨询来源为经营管理签
//   - 固化 Lead → Customer → Case 承接字段
//   - Lead 转化前的门禁条件
//
// 权威来源：
//   - P1/01 §2 Step 1（咨询/线索）
//   - p1-sv-000-01 §2（签约前承接 Customer BMV Profile）
//   - P1/02 §3.1（portal/leads）
// ────────────────────────────────────────────────────────────────
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "assigned",
  "converted",
  "closed",
];
export const LEAD_SOURCES = [
  "web",
  "referral",
  "phone",
  "walk_in",
  "partner",
  "other",
];
/**
 * 检查 lead 是否可以转化（纯逻辑，不访问 DB）。
 *
 * @param input 门禁检查输入
 * @param input.leadStatus 当前 lead 状态
 * @param input.assignedOrgId 分配的组织 ID
 * @param input.isBmv 是否为 BMV 类型
 * @param input.bmvSignStatus BMV 签约状态
 * @param input.bmvIntakeStatus BMV intake 状态
 * @returns 门禁检查结果（含阻断原因列表）
 */
export function checkLeadConvertGate(input) {
  const blockers = [];
  if (input.leadStatus === "converted") {
    blockers.push({
      code: "LEAD_ALREADY_CONVERTED",
      message: "Lead already converted",
    });
  }
  if (!input.assignedOrgId) {
    blockers.push({
      code: "LEAD_NOT_ASSIGNED",
      message: "Lead must be assigned to an organization before conversion",
    });
  }
  if (input.isBmv) {
    if (input.bmvSignStatus !== "signed") {
      blockers.push({
        code: "BMV_NOT_SIGNED",
        message: "BMV customer must be signed before case creation",
      });
    }
    if (input.bmvIntakeStatus !== "ready_for_case_creation") {
      if (!input.bmvSignStatus || input.bmvSignStatus === "not_started") {
        blockers.push({
          code: "BMV_QUESTIONNAIRE_INCOMPLETE",
          message: "BMV questionnaire must be completed before case creation",
        });
      } else if (input.bmvIntakeStatus === "quote_pending") {
        blockers.push({
          code: "BMV_QUOTE_NOT_CONFIRMED",
          message: "BMV quote must be confirmed before case creation",
        });
      }
    }
  }
  return { canConvert: blockers.length === 0, blockers };
}
/**
 * 从 lead 状态与 Customer.bmvProfile 评估 BMV 就绪度。
 *
 * 纯逻辑，不访问 DB。供 admin UI 调用以展示 lead 详情页的引导信息。
 * @param input - BMV 就绪度评估输入。
 * @param input.assignedOrgId - 当前线索所属机构 ID。
 * @param input.bmvQuestionnaireStatus - BMV 问卷状态。
 * @param input.bmvQuoteStatus - BMV 报价状态。
 * @param input.bmvSignStatus - BMV 签约状态。
 * @param input.bmvIntakeStatus - BMV 承接状态。
 * @returns BMV 建案就绪度快照。
 */
export function assessLeadBmvReadiness(input) {
  const isAssigned = Boolean(input.assignedOrgId);
  const questionnaireSent =
    input.bmvQuestionnaireStatus === "sent" ||
    input.bmvQuestionnaireStatus === "returned";
  const questionnaireReturned = input.bmvQuestionnaireStatus === "returned";
  const quoteGenerated =
    input.bmvQuoteStatus === "generated" ||
    input.bmvQuoteStatus === "confirmed";
  const quoteConfirmed = input.bmvQuoteStatus === "confirmed";
  const signed = input.bmvSignStatus === "signed";
  const intakeReady = input.bmvIntakeStatus === "ready_for_case_creation";
  const canConvert =
    isAssigned &&
    questionnaireReturned &&
    quoteConfirmed &&
    signed &&
    intakeReady;
  return {
    isAssigned,
    questionnaireSent,
    questionnaireReturned,
    quoteGenerated,
    quoteConfirmed,
    signed,
    intakeReady,
    canConvert,
  };
}
//# sourceMappingURL=leads.types.js.map
