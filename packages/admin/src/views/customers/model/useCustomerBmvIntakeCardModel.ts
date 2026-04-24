import { computed, type Ref } from "vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { CustomerDetail } from "../types";
import type { CustomerBmvProfile } from "../types-bmv";

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
}

type UseCustomerBmvIntakeCardModelInput = {
  customer: Ref<CustomerDetail | null>;
};

function formatDateTime(value: string | null): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "—";
  return normalized
    .replace("T", " ")
    .replace(/(Z|[+-][0-9]{2}:[0-9]{2})$/, "")
    .slice(0, 16);
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

/**
 * 根据客户详情构建 BMV 承接卡片所需的展示态数据。
 *
 * @param customer 客户详情；若不存在 BMV 档案则返回 null。
 * @returns 可直接供视图渲染的承接卡片展示态。
 */
export function buildCustomerBmvIntakeCardViewModel(
  customer: CustomerDetail | null,
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
    stepStatuses: [
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
    ],
    timeline: [
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
    ],
    note: profile.note,
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
    buildCustomerBmvIntakeCardViewModel(input.customer.value),
  );

  return { intakeCard };
}
