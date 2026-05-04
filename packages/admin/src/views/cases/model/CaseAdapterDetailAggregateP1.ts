import type { CaseStageId } from "../types";
import type {
  FailureCloseoutInfo,
  PreSignBlocker,
  PreSignGateInfo,
  SurveyQuoteStatus,
  SurveyQuoteStatusKey,
  WorkflowStepSummary,
} from "../types-detail";
import { buildFinalPaymentGate } from "./CaseAdapterFinalPaymentGate";
import {
  buildResidencePeriodPanel,
  buildReminderSchedulePanel,
  buildSuccessCloseoutInfo,
} from "./CaseAdapterResidenceReminder";
import {
  buildSupplementRoundInfo,
  buildReminderFailureInfo,
} from "./CaseAdapterSupplementReminder";
import {
  asRecord,
  formatDate,
  readNullableString,
  readNumber,
  resolveStageId,
  resolveStageLabel,
} from "./CaseAdapterShared";

/** P1 聚合派生所需的 aggregate slice 子集。 */
export interface P1AggregateSlices {
  /** tab counts 统计。 */
  counts: Record<string, unknown> | null;
  /** 当前在留期间与续签提醒上下文。 */
  currentResidencePeriod: Record<string, unknown> | null;
  /** 成功关案检查结果。 */
  successCloseoutCheck: Record<string, unknown> | null;
}

/** P1 业务字段派生前置数值。 */
export interface P1DerivedMetrics {
  /** 报价金额。 */
  quotePrice: number;
  /** 尾款是否已支付。 */
  finalPaymentPaid: boolean;
  /** 未收金额。 */
  unpaidAmount: number;
  /** 是否已进行欠款风险确认。 */
  billingRiskAck: boolean;
}

const BMV_STEP_BLUEPRINT: ReadonlyArray<{
  stepCode: string;
  label: string;
  parentStage: string;
  sortOrder: number;
}> = [
  {
    stepCode: "WAITING_MATERIAL",
    label: "等待资料",
    parentStage: "S2",
    sortOrder: 1,
  },
  {
    stepCode: "MATERIAL_PREPARING",
    label: "资料准备中",
    parentStage: "S3",
    sortOrder: 2,
  },
  { stepCode: "REVIEWING", label: "内部审核", parentStage: "S4", sortOrder: 3 },
  { stepCode: "APPLYING", label: "申请提交", parentStage: "S5", sortOrder: 4 },
  {
    stepCode: "UNDER_REVIEW",
    label: "审查中",
    parentStage: "S5",
    sortOrder: 5,
  },
  {
    stepCode: "NEED_SUPPLEMENT",
    label: "需要补正",
    parentStage: "S5",
    sortOrder: 6,
  },
  {
    stepCode: "SUPPLEMENT_PROCESSING",
    label: "补正处理中",
    parentStage: "S5",
    sortOrder: 7,
  },
  { stepCode: "APPROVED", label: "已下签", parentStage: "S6", sortOrder: 8 },
  {
    stepCode: "WAITING_PAYMENT",
    label: "等待尾款",
    parentStage: "S7",
    sortOrder: 9,
  },
  {
    stepCode: "COE_SENT",
    label: "COE已发送",
    parentStage: "S7",
    sortOrder: 10,
  },
  {
    stepCode: "VISA_APPLYING",
    label: "海外返签申请中",
    parentStage: "S7",
    sortOrder: 11,
  },
  {
    stepCode: "ENTRY_SUCCESS",
    label: "入境成功",
    parentStage: "S8",
    sortOrder: 12,
  },
  {
    stepCode: "VISA_REJECTED",
    label: "签证拒否",
    parentStage: "S9",
    sortOrder: 13,
  },
  {
    stepCode: "RESIDENCE_PERIOD_RECORDED",
    label: "在留期间已录入",
    parentStage: "S8",
    sortOrder: 14,
  },
  {
    stepCode: "RENEWAL_REMINDER_SCHEDULED",
    label: "续签提醒已设置",
    parentStage: "S8",
    sortOrder: 15,
  },
];

const BMV_STEP_MAP = new Map(BMV_STEP_BLUEPRINT.map((s) => [s.stepCode, s]));
const FAILURE_STEP_CODES: ReadonlySet<string> = new Set(["VISA_REJECTED"]);

const STATUS_TONE_MAP: Record<
  SurveyQuoteStatusKey,
  "muted" | "warning" | "success"
> = {
  not_started: "muted",
  in_progress: "warning",
  completed: "success",
};

export const EMPTY_LISTS = {
  timeline: [] as never[],
  team: [] as never[],
  relatedParties: [] as never[],
  deadlines: [] as never[],
  submissionPackages: [] as never[],
  correctionPackage: null,
  doubleReview: [] as never[],
  reviewEnabled: false,
  documents: [] as never[],
  forms: { templates: [] as never[], generated: [] as never[] },
  tasks: [] as never[],
  logEntries: [] as never[],
  messages: [] as never[],
};

function buildWorkflowStepSummary(
  stepCode: string | null,
): WorkflowStepSummary | null {
  if (!stepCode) return null;
  const bp = BMV_STEP_MAP.get(stepCode);
  if (!bp) return null;
  const parentStageId = resolveStageId(bp.parentStage);
  return {
    stepCode: bp.stepCode,
    stepLabel: bp.label,
    parentStage: bp.parentStage,
    parentStageLabel: resolveStageLabel(parentStageId),
    sortOrder: bp.sortOrder,
    isFailureStep: FAILURE_STEP_CODES.has(bp.stepCode),
  };
}

function buildFailureCloseoutInfo(
  failureCloseoutCheck: Record<string, unknown> | null,
): FailureCloseoutInfo | null {
  if (!failureCloseoutCheck || failureCloseoutCheck.isFailurePath !== true) {
    return null;
  }

  const attribution = asRecord(failureCloseoutCheck.attribution);
  return {
    isFailurePath: true,
    reasonCode: attribution
      ? readNullableString(attribution, "reasonCode")
      : null,
    reasonLabel: attribution
      ? readNullableString(attribution, "reasonLabel")
      : null,
    canDirectClose: attribution ? attribution.canDirectClose === true : false,
    closeReasonRequired: attribution
      ? attribution.closeReasonRequired === true
      : false,
  };
}

function buildBmvFields(caseRecord: Record<string, unknown>) {
  const stepCode = readNullableString(caseRecord, "currentWorkflowStepCode");
  return {
    workflowStep: buildWorkflowStepSummary(stepCode),
    visaPlan: readNullableString(caseRecord, "visaPlan"),
    supplementCount: readNumber(caseRecord, "supplementCount"),
    resultOutcome: readNullableString(caseRecord, "resultOutcome"),
    postApprovalStage: readNullableString(caseRecord, "postApprovalStage"),
    coeIssuedDate: formatDate(readNullableString(caseRecord, "coeIssuedAt")),
    coeExpiryDate: formatDate(readNullableString(caseRecord, "coeExpiryDate")),
    overseasVisaStartDate: formatDate(
      readNullableString(caseRecord, "overseasVisaStartAt"),
    ),
    entryConfirmedDate: formatDate(
      readNullableString(caseRecord, "entryConfirmedAt"),
    ),
  };
}

function deriveSurveyQuoteStatusKey(
  done: number,
  total: number,
): SurveyQuoteStatusKey {
  if (done <= 0) return "not_started";
  if (done >= total) return "completed";
  return "in_progress";
}

function buildSurveyStatus(
  questionnaireTotal: number,
  questionnaireDone: number,
  isBmv: boolean,
): SurveyQuoteStatus | null {
  if (!isBmv || questionnaireTotal <= 0) return null;
  const statusKey = deriveSurveyQuoteStatusKey(
    questionnaireDone,
    questionnaireTotal,
  );
  return {
    statusKey,
    statusLabel: statusKey,
    tone: STATUS_TONE_MAP[statusKey],
    progressLabel: `${questionnaireDone}/${questionnaireTotal}`,
  };
}

function buildQuoteStatus(
  quotePrice: number,
  isBmv: boolean,
): SurveyQuoteStatus | null {
  if (!isBmv) return null;
  const statusKey: SurveyQuoteStatusKey =
    quotePrice > 0 ? "completed" : "not_started";
  return {
    statusKey,
    statusLabel: statusKey,
    tone: STATUS_TONE_MAP[statusKey],
    progressLabel: quotePrice > 0 ? `¥${quotePrice.toLocaleString()}` : "—",
  };
}

function buildPreSignGate(
  survey: SurveyQuoteStatus | null,
  quote: SurveyQuoteStatus | null,
  isBmv: boolean,
): PreSignGateInfo | null {
  if (!isBmv) return null;
  const blockers: PreSignBlocker[] = [];
  if (!survey || survey.statusKey !== "completed") {
    blockers.push({ code: "survey_incomplete", label: "survey_incomplete" });
  }
  if (!quote || quote.statusKey !== "completed") {
    blockers.push({ code: "quote_unconfirmed", label: "quote_unconfirmed" });
  }
  return { passed: blockers.length === 0, blockers };
}

/**
 * 基于 aggregate 主链数据补充 P1/BMV 专属字段。
 *
 * @param caseRecord - 原始案件 DTO
 * @param slices - P1 相关 aggregate slice
 * @param metrics - 计费与问卷派生数值
 * @param failureCloseoutCheck - 失败关案检查结果
 * @param stageId - 当前阶段 ID
 * @returns 可直接 merge 到 detail 模型的 P1 字段
 */
export function buildP1Fields(
  caseRecord: Record<string, unknown>,
  slices: P1AggregateSlices,
  metrics: P1DerivedMetrics,
  failureCloseoutCheck: Record<string, unknown> | null,
  stageId: CaseStageId,
) {
  const bmv = buildBmvFields(caseRecord);
  const isBmv = bmv.workflowStep != null || bmv.visaPlan != null;
  const isReadonly = stageId === "S9";
  const questionnaireTotal = slices.counts
    ? readNumber(slices.counts, "questionnaireItemsTotal")
    : 0;
  const questionnaireDone = slices.counts
    ? readNumber(slices.counts, "questionnaireItemsDone")
    : 0;
  const surveyStatus = buildSurveyStatus(
    questionnaireTotal,
    questionnaireDone,
    isBmv,
  );
  const quoteStatus = buildQuoteStatus(metrics.quotePrice, isBmv);

  return {
    ...bmv,
    quotePriceRaw: metrics.quotePrice,
    quotePriceLabel:
      metrics.quotePrice > 0 ? `¥${metrics.quotePrice.toLocaleString()}` : "",
    surveyStatus,
    quoteStatus,
    preSignGate: buildPreSignGate(surveyStatus, quoteStatus, isBmv),
    failureCloseout: buildFailureCloseoutInfo(failureCloseoutCheck),
    finalPaymentGate: buildFinalPaymentGate(
      readNullableString(caseRecord, "currentWorkflowStepCode"),
      isBmv,
      {
        finalPaymentPaid: metrics.finalPaymentPaid,
        unpaidAmount: metrics.unpaidAmount,
        billingRiskAck: metrics.billingRiskAck,
      },
    ),
    residencePeriod: buildResidencePeriodPanel(slices.currentResidencePeriod),
    reminderSchedule: buildReminderSchedulePanel(slices.currentResidencePeriod),
    successCloseout: buildSuccessCloseoutInfo(slices.successCloseoutCheck),
    supplementRound: isBmv
      ? buildSupplementRoundInfo(caseRecord, isReadonly)
      : null,
    reminderFailure: isBmv
      ? buildReminderFailureInfo(slices.currentResidencePeriod, isReadonly)
      : null,
  };
}
