import { computed, type Ref } from "vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { CustomerDetail } from "../types";
import type {
  BmvLinkedCaseSummary,
  BmvQuoteVersion,
  BmvReminderSummary,
  BmvSurveyDataSummary,
  CustomerBmvAggregate,
  CustomerBmvProfile,
} from "../types-bmv";

type LabelKey = `customers.detail.bmvIntake.${string}`;

/**
 *
 */
export interface CustomerBmvIntakeCardStatusViewModel {
  /**
   *
   */
  labelKey: LabelKey;
  /**
   *
   */
  valueKey: LabelKey;
  /**
   *
   */
  tone: ChipTone;
}

/**
 *
 */
export interface CustomerBmvIntakeCardTimelineItemViewModel {
  /**
   *
   */
  labelKey: LabelKey;
  /**
   *
   */
  value: string;
}

/**
 *
 */
export interface CustomerBmvQuoteHistoryItemViewModel {
  /**
   *
   */
  id: string;
  /**
   *
   */
  versionLabel: string;
  /**
   *
   */
  amount: string;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  isCurrent: boolean;
}

/**
 *
 */
export interface CustomerBmvSurveyDataViewModel {
  /**
   *
   */
  completedAt: string;
  /**
   *
   */
  fieldCount: number;
  /**
   *
   */
  highlightFields: {
    /**
     *
     */
    label: string; /**
     *
     */
    value: string;
  }[];
}

/**
 *
 */
export interface CustomerBmvLinkedCaseViewModel {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  caseName: string;
  /**
   *
   */
  stage: string;
  /**
   *
   */
  postApprovalStage: string | null;
  /**
   *
   */
  coeStatus: string | null;
  /**
   *
   */
  coeIssuedAt: string | null;
  /**
   *
   */
  coeExpiresAt: string | null;
}

/**
 *
 */
export interface CustomerBmvReminderItemViewModel {
  /**
   *
   */
  id: string;
  /**
   *
   */
  type: string;
  /**
   *
   */
  dueAt: string;
  /**
   *
   */
  status: string;
}

/**
 *
 */
export interface CustomerBmvIntakeCardViewModel {
  /**
   *
   */
  stage: {
    /**
     *
     */
    labelKey: LabelKey;
    /**
     *
     */
    tone: ChipTone;
  };
  /**
   *
   */
  nextStepKey: LabelKey;
  /**
   *
   */
  gateHintKey: LabelKey;
  /**
   *
   */
  stepStatuses: CustomerBmvIntakeCardStatusViewModel[];
  /**
   *
   */
  timeline: CustomerBmvIntakeCardTimelineItemViewModel[];
  /**
   *
   */
  note: string | null;
  /**
   *
   */
  quoteHistory: CustomerBmvQuoteHistoryItemViewModel[];
  /**
   *
   */
  surveyDataSummary: CustomerBmvSurveyDataViewModel | null;
  /**
   *
   */
  linkedCase: CustomerBmvLinkedCaseViewModel | null;
  /**
   *
   */
  reminders: CustomerBmvReminderItemViewModel[];
  /**
   *
   */
  canTransitionToCase: boolean;
}

type UseCustomerBmvIntakeCardModelInput = {
  customer: Ref<CustomerDetail | null>;
  aggregate?: Ref<CustomerBmvAggregate | null>;
};

/**
 * 提取需要显式展示的 UTC 时区后缀，避免卡片把 UTC 时间误认为本地时间。
 *
 * @param value 原始 ISO 时间字符串
 * @returns 若为 UTC 时间则返回 ` (UTC)`，否则返回空字符串
 */
function readUtcSuffix(value: string): string {
  return /(Z|[+-]00:00)$/i.test(value) ? " (UTC)" : "";
}

/**
 * 将 ISO 日期时间格式化为卡片可读文本；当原始值为 UTC 时显式附带时区标记。
 *
 * @param value ISO 时间字符串或 null
 * @returns 格式化后的展示文案
 */
function formatDateTime(value: string | null): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "—";
  const base = normalized
    .replace("T", " ")
    .replace(/(Z|[+-][0-9]{2}:[0-9]{2})$/, "")
    .slice(0, 16);
  return `${base}${readUtcSuffix(normalized)}`;
}

function intakeStageTone(profile: CustomerBmvProfile): ChipTone {
  switch (profile.intakeStatus) {
    case "ready_for_case_creation":
      return "success";
    case "sign_pending":
    case "quote_pending":
      return "warning";
    case "questionnaire_pending":
      return "primary";
    case "not_started":
    default:
      return "neutral";
  }
}

function questionnaireTone(profile: CustomerBmvProfile): ChipTone {
  if (profile.questionnaireStatus === "returned") return "success";
  if (profile.questionnaireStatus === "sent") return "primary";
  return "neutral";
}

function quoteTone(profile: CustomerBmvProfile): ChipTone {
  if (profile.quoteStatus === "confirmed") return "success";
  if (profile.quoteStatus === "generated") return "primary";
  return "neutral";
}

function signTone(profile: CustomerBmvProfile): ChipTone {
  if (profile.signStatus === "signed") return "success";
  if (profile.signStatus === "pending") return "warning";
  return "neutral";
}

function resolveNextStepKey(profile: CustomerBmvProfile): LabelKey {
  if (profile.signStatus === "signed") {
    return "customers.detail.bmvIntake.nextStepValue.ready_for_case_creation";
  }
  if (
    profile.quoteStatus === "generated" ||
    profile.quoteStatus === "confirmed" ||
    profile.signStatus === "pending"
  ) {
    return "customers.detail.bmvIntake.nextStepValue.sign_pending";
  }
  if (profile.questionnaireStatus === "returned") {
    return "customers.detail.bmvIntake.nextStepValue.quote_pending";
  }
  if (profile.questionnaireStatus === "sent") {
    return "customers.detail.bmvIntake.nextStepValue.questionnaire_pending_sent";
  }
  return "customers.detail.bmvIntake.nextStepValue.not_started";
}

function resolveGateHintKey(profile: CustomerBmvProfile): LabelKey {
  return profile.signStatus === "signed"
    ? "customers.detail.bmvIntake.gateHintValue.ready"
    : "customers.detail.bmvIntake.gateHintValue.locked";
}

function buildQuoteHistoryItems(
  history: BmvQuoteVersion[],
): CustomerBmvQuoteHistoryItemViewModel[] {
  return history.map((v) => ({
    id: v.id,
    versionLabel: `v${v.version}`,
    amount: v.amount,
    createdAt: formatDateTime(v.createdAt),
    isCurrent: v.isCurrent,
  }));
}

function buildSurveyDataViewModel(
  summary: BmvSurveyDataSummary | null,
): CustomerBmvSurveyDataViewModel | null {
  if (!summary) return null;
  return {
    completedAt: formatDateTime(summary.completedAt),
    fieldCount: summary.fieldCount,
    highlightFields: summary.highlightFields,
  };
}

function buildLinkedCaseViewModel(
  linked: BmvLinkedCaseSummary | null,
): CustomerBmvLinkedCaseViewModel | null {
  if (!linked) return null;
  return {
    caseId: linked.caseId,
    caseName: linked.caseName,
    stage: linked.stage,
    postApprovalStage: linked.postApprovalStage,
    coeStatus: linked.coeStatus,
    coeIssuedAt: linked.coeIssuedAt ? formatDateTime(linked.coeIssuedAt) : null,
    coeExpiresAt: linked.coeExpiresAt
      ? formatDateTime(linked.coeExpiresAt)
      : null,
  };
}

function buildReminderItems(
  reminders: BmvReminderSummary[],
): CustomerBmvReminderItemViewModel[] {
  return reminders.map((r) => ({
    id: r.id,
    type: r.type,
    dueAt: formatDateTime(r.dueAt),
    status: r.status,
  }));
}

function buildStepStatuses(
  profile: CustomerBmvProfile,
): CustomerBmvIntakeCardStatusViewModel[] {
  return [
    {
      labelKey: "customers.detail.bmvIntake.steps.questionnaire",
      valueKey: `customers.detail.bmvIntake.questionnaireStatus.${profile.questionnaireStatus}`,
      tone: questionnaireTone(profile),
    },
    {
      labelKey: "customers.detail.bmvIntake.steps.quote",
      valueKey: `customers.detail.bmvIntake.quoteStatus.${profile.quoteStatus}`,
      tone: quoteTone(profile),
    },
    {
      labelKey: "customers.detail.bmvIntake.steps.sign",
      valueKey: `customers.detail.bmvIntake.signStatus.${profile.signStatus}`,
      tone: signTone(profile),
    },
  ];
}

function buildTimelineItems(
  profile: CustomerBmvProfile,
): CustomerBmvIntakeCardTimelineItemViewModel[] {
  return [
    {
      labelKey: "customers.detail.bmvIntake.timeline.questionnaireSentAt",
      value: formatDateTime(profile.questionnaireSentAt),
    },
    {
      labelKey: "customers.detail.bmvIntake.timeline.questionnaireReturnedAt",
      value: formatDateTime(profile.questionnaireReturnedAt),
    },
    {
      labelKey: "customers.detail.bmvIntake.timeline.quoteGeneratedAt",
      value: formatDateTime(profile.quoteGeneratedAt),
    },
    {
      labelKey: "customers.detail.bmvIntake.timeline.quoteConfirmedAt",
      value: formatDateTime(profile.quoteConfirmedAt),
    },
    {
      labelKey: "customers.detail.bmvIntake.timeline.signedAt",
      value: formatDateTime(profile.signedAt),
    },
  ];
}

/**
 * 根据客户详情构建 BMV 承接卡片所需的展示态数据。
 *
 * @param customer 客户详情；若不存在 BMV 档案则返回 null。
 * @param aggregate 可选的 BMV 聚合数据（来自 GET /admin/customers/:id/bmv）。
 * @returns 可直接供视图渲染的承接卡片展示态。
 */
export function buildCustomerBmvIntakeCardViewModel(
  customer: CustomerDetail | null,
  aggregate?: CustomerBmvAggregate | null,
): CustomerBmvIntakeCardViewModel | null {
  const profile = customer?.bmvProfile;
  if (!profile) return null;

  return {
    stage: {
      labelKey: `customers.detail.bmvIntake.stage.${profile.intakeStatus}`,
      tone: intakeStageTone(profile),
    },
    nextStepKey: resolveNextStepKey(profile),
    gateHintKey: resolveGateHintKey(profile),
    stepStatuses: buildStepStatuses(profile),
    timeline: buildTimelineItems(profile),
    note: profile.note,
    quoteHistory: buildQuoteHistoryItems(aggregate?.quoteHistory ?? []),
    surveyDataSummary: buildSurveyDataViewModel(
      aggregate?.surveyDataSummary ?? null,
    ),
    linkedCase: buildLinkedCaseViewModel(aggregate?.linkedCase ?? null),
    reminders: buildReminderItems(aggregate?.reminders ?? []),
    canTransitionToCase:
      profile.signStatus === "signed" &&
      profile.intakeStatus === "ready_for_case_creation",
  };
}

/**
 * 为客户详情页提供响应式的 BMV 承接卡片展示态。
 *
 * @param input 包含客户详情引用的输入参数。
 * @returns 暴露承接卡片 computed 数据的模型对象。
 */
export function useCustomerBmvIntakeCardModel(
  input: UseCustomerBmvIntakeCardModelInput,
) {
  const intakeCard = computed(() =>
    buildCustomerBmvIntakeCardViewModel(
      input.customer.value,
      input.aggregate?.value,
    ),
  );

  return { intakeCard };
}
