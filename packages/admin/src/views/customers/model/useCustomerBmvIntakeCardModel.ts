import { computed, type Ref } from "vue";
import { formatDateTime } from "../../../shared/model/formatDateTime";
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
  locale: Ref<string>;
};

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

function resolveGateHintKey(
  customer: CustomerDetail,
  profile: CustomerBmvProfile,
): LabelKey {
  // 当客户已存在任意案件（活跃 or 归档）时，BMV 承接已不再是建案前置门禁，
  // 与 useCustomerCreateCaseGateModel 中 totalCases > 0 放行口径保持一致；
  // 否则继续基于 signStatus 区分 locked / ready。
  if (customer.totalCases > 0) {
    return "customers.detail.bmvIntake.gateHintValue.bypassed_existing_cases";
  }
  return profile.signStatus === "signed"
    ? "customers.detail.bmvIntake.gateHintValue.ready"
    : "customers.detail.bmvIntake.gateHintValue.locked";
}

function buildQuoteHistoryItems(
  history: BmvQuoteVersion[],
  locale: string,
): CustomerBmvQuoteHistoryItemViewModel[] {
  return history.map((v) => ({
    id: v.id,
    versionLabel: `v${v.version}`,
    amount: v.amount,
    createdAt: formatDateTime(v.createdAt, locale),
    isCurrent: v.isCurrent,
  }));
}

function buildSurveyDataViewModel(
  summary: BmvSurveyDataSummary | null,
  locale: string,
): CustomerBmvSurveyDataViewModel | null {
  if (!summary) return null;
  return {
    completedAt: formatDateTime(summary.completedAt, locale),
    fieldCount: summary.fieldCount,
    highlightFields: summary.highlightFields,
  };
}

function buildLinkedCaseViewModel(
  linked: BmvLinkedCaseSummary | null,
  locale: string,
): CustomerBmvLinkedCaseViewModel | null {
  if (!linked) return null;
  return {
    caseId: linked.caseId,
    caseName: linked.caseName,
    stage: linked.stage,
    postApprovalStage: linked.postApprovalStage,
    coeStatus: linked.coeStatus,
    coeIssuedAt: linked.coeIssuedAt
      ? formatDateTime(linked.coeIssuedAt, locale)
      : null,
    coeExpiresAt: linked.coeExpiresAt
      ? formatDateTime(linked.coeExpiresAt, locale)
      : null,
  };
}

function buildReminderItems(
  reminders: BmvReminderSummary[],
  locale: string,
): CustomerBmvReminderItemViewModel[] {
  return reminders.map((r) => ({
    id: r.id,
    type: r.type,
    dueAt: formatDateTime(r.dueAt, locale),
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
  locale: string,
): CustomerBmvIntakeCardTimelineItemViewModel[] {
  return [
    {
      labelKey: "customers.detail.bmvIntake.timeline.questionnaireSentAt",
      value: formatDateTime(profile.questionnaireSentAt, locale),
    },
    {
      labelKey: "customers.detail.bmvIntake.timeline.questionnaireReturnedAt",
      value: formatDateTime(profile.questionnaireReturnedAt, locale),
    },
    {
      labelKey: "customers.detail.bmvIntake.timeline.quoteGeneratedAt",
      value: formatDateTime(profile.quoteGeneratedAt, locale),
    },
    {
      labelKey: "customers.detail.bmvIntake.timeline.quoteConfirmedAt",
      value: formatDateTime(profile.quoteConfirmedAt, locale),
    },
    {
      labelKey: "customers.detail.bmvIntake.timeline.signedAt",
      value: formatDateTime(profile.signedAt, locale),
    },
  ];
}

const DEFAULT_NOT_STARTED_BMV_PROFILE: CustomerBmvProfile = {
  questionnaireStatus: "not_started",
  quoteStatus: "not_started",
  signStatus: "not_started",
  intakeStatus: "not_started",
  questionnaireSentAt: null,
  questionnaireReturnedAt: null,
  quoteGeneratedAt: null,
  quoteConfirmedAt: null,
  signedAt: null,
  note: null,
  sourceLeadId: null,
  leadGroupId: null,
  leadOwnerUserId: null,
};

/**
 * 根据客户详情构建 BMV 承接卡片所需的展示态数据。
 * 当客户存在但 bmvProfile 为 null 时，返回 not_started 空态视图。
 *
 * @param customer - 客户详情；为 null 时返回 null。
 * @param aggregate - 可选的 BMV 聚合数据（来自 GET /admin/customers/:id/bmv）。
 * @param locale - 当前语言区域（日期格式化用）。
 * @returns 可直接供视图渲染的承接卡片展示态；客户为 null 时返回 null。
 */
export function buildCustomerBmvIntakeCardViewModel(
  customer: CustomerDetail | null,
  aggregate?: CustomerBmvAggregate | null,
  locale: string = "ja-JP",
): CustomerBmvIntakeCardViewModel | null {
  if (!customer) return null;
  const profile = customer.bmvProfile ?? DEFAULT_NOT_STARTED_BMV_PROFILE;
  const agg = resolveAggregateSlices(aggregate);

  return {
    stage: {
      labelKey: `customers.detail.bmvIntake.stage.${profile.intakeStatus}`,
      tone: intakeStageTone(profile),
    },
    nextStepKey: resolveNextStepKey(profile),
    gateHintKey: resolveGateHintKey(customer, profile),
    stepStatuses: buildStepStatuses(profile),
    timeline: buildTimelineItems(profile, locale),
    note: profile.note,
    quoteHistory: buildQuoteHistoryItems(agg.quoteHistory, locale),
    surveyDataSummary: buildSurveyDataViewModel(agg.surveyDataSummary, locale),
    linkedCase: buildLinkedCaseViewModel(agg.linkedCase, locale),
    reminders: buildReminderItems(agg.reminders, locale),
    canTransitionToCase:
      profile.signStatus === "signed" &&
      profile.intakeStatus === "ready_for_case_creation",
  };
}

function resolveAggregateSlices(aggregate?: CustomerBmvAggregate | null) {
  return {
    quoteHistory: aggregate?.quoteHistory ?? [],
    surveyDataSummary: aggregate?.surveyDataSummary ?? null,
    linkedCase: aggregate?.linkedCase ?? null,
    reminders: aggregate?.reminders ?? [],
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
      input.locale.value,
    ),
  );

  return { intakeCard };
}
