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
] as const;

/** Lead 状态枚举值。 */
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "web",
  "referral",
  "phone",
  "walk_in",
  "partner",
  "other",
] as const;

/** Lead 来源枚举值。 */
export type LeadSource = (typeof LEAD_SOURCES)[number];

/**
 * P1 扩展：Lead 转化（convert）前的门禁检查结果。
 *
 * 经营管理签 lead 在转化为 Case 前，需确认：
 *   1. Lead 已分配至事务所（assignedOrgId 非空）
 *   2. Customer 已创建且 bmvProfile.signStatus === "signed"
 *   3. Customer 的 intakeStatus === "ready_for_case_creation"
 *
 * 通用 lead（非 BMV）仅需条件 1。
 */
export type LeadConvertGateResult = {
  canConvert: boolean;
  blockers: LeadConvertBlocker[];
};

/** Lead 转化阻断原因。 */
export type LeadConvertBlocker =
  | { code: "LEAD_NOT_ASSIGNED"; message: string }
  | { code: "LEAD_ALREADY_CONVERTED"; message: string }
  | { code: "CUSTOMER_NOT_FOUND"; message: string }
  | { code: "BMV_QUESTIONNAIRE_INCOMPLETE"; message: string }
  | { code: "BMV_QUOTE_NOT_CONFIRMED"; message: string }
  | { code: "BMV_NOT_SIGNED"; message: string };

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
export function checkLeadConvertGate(input: {
  leadStatus: string;
  assignedOrgId: string | null;
  isBmv: boolean;
  bmvSignStatus?: string | null;
  bmvIntakeStatus?: string | null;
}): LeadConvertGateResult {
  const blockers: LeadConvertBlocker[] = [];

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
 * P1 扩展：Lead 转化时传递给 cases.create 的 BMV 相关上下文。
 *
 * 从 Customer.bmvProfile 提取，用于建案时初始化 visaPlan / quotePrice。
 */
export type LeadBmvConvertContext = {
  customerId: string;
  caseTypeCode: string;
  visaPlan?: string | null;
  quotePrice?: number | null;
};

// ────────────────────────────────────────────────────────────────
// P1 扩展：问卷就绪度评估
//
// 为 admin UI 提供 lead → case 转化前的详细就绪度快照，
// 支持页面显示"还缺哪些步骤"的引导信息。
//
// 权威来源：
//   - P1/01 §2 Step 1–5（咨询 → 签约完整链路）
//   - p1-sv-000-01 §2.4（签约前限制）
// ────────────────────────────────────────────────────────────────

/** BMV lead 转化前的各阶段就绪状态快照。 */
export type LeadBmvReadinessSnapshot = {
  /** Lead 已分配到事务所。 */
  isAssigned: boolean;
  /** 问卷已发送。 */
  questionnaireSent: boolean;
  /** 问卷已回收。 */
  questionnaireReturned: boolean;
  /** 报价已生成。 */
  quoteGenerated: boolean;
  /** 报价已确认。 */
  quoteConfirmed: boolean;
  /** 客户已签约。 */
  signed: boolean;
  /** 整体承接就绪。 */
  intakeReady: boolean;
  /** 是否全部满足、可进入建案。 */
  canConvert: boolean;
};

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
export function assessLeadBmvReadiness(input: {
  assignedOrgId: string | null;
  bmvQuestionnaireStatus?: string | null;
  bmvQuoteStatus?: string | null;
  bmvSignStatus?: string | null;
  bmvIntakeStatus?: string | null;
}): LeadBmvReadinessSnapshot {
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

// ────────────────────────────────────────────────────────────────
// Lead → Case 转化路径契约
//
// 当前 LeadsService.convert 直接 INSERT INTO cases，
// P1 应改为调用 CasesService.create 以触发 BMV 门禁。
//
// 完整转化路径：
//   1. checkLeadConvertGate（lead 层面预检，快速拒绝）
//   2. CasesService.create（触发 checkBmvCaseCreationGate + 全部建案逻辑）
//   3. 标记 lead.status = "converted"
//
// 前两步的门禁条件有重叠但职责不同：
//   - checkLeadConvertGate：面向 lead UI，检查 lead 自身状态（已分配、未转化）
//     + BMV 签约前提的高层摘要
//   - checkBmvCaseCreationGate：面向 cases service，检查 Customer.bmvProfile
//     的精确状态（四前提全部满足）
// ────────────────────────────────────────────────────────────────

/**
 * Lead 转化时应传递给 CasesService.create 的完整输入。
 *
 * 在 LeadConvertInput 基础上追加 BMV 上下文与来源追踪。
 */
export type LeadConvertToCasePayload = {
  customerId: string;
  caseTypeCode: string;
  ownerUserId: string;
  orgId: string;
  visaPlan?: string | null;
  quotePrice?: number | null;
  sourceChannel: "lead_convert";
  leadId: string;
};
