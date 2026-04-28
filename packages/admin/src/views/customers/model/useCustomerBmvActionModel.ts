import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { CustomerDetail } from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";
import {
  isBmvGateError,
  resolveFirstBlockerI18nKey,
} from "./CustomerBmvGateBinding";

/**
 *
 */
export type CustomerBmvActionKey = "questionnaire" | "quote" | "sign";

/**
 *
 */
export interface CustomerBmvActionItem {
  /**
   *
   */
  key: CustomerBmvActionKey;
  /**
   *
   */
  labelKey: string;
  /**
   *
   */
  hintKey: string;
  /**
   *
   */
  disabled: boolean;
  /**
   *
   */
  loading: boolean;
  /**
   *
   */
  run: () => Promise<boolean>;
}

type BmvActionRepository = Pick<
  CustomerRepository,
  "sendBmvQuestionnaire" | "generateBmvQuote" | "recordBmvSign"
>;

type UseCustomerBmvActionModelInput = {
  customer: ComputedRef<CustomerDetail | null>;
  repository: BmvActionRepository;
  refreshCustomer?: () => Promise<void>;
};

type ActionFeedbackTone = "success" | "danger";

type ActionFeedback = {
  tone: ActionFeedbackTone;
  messageKey: string;
};

type ActionAvailability = {
  hintKey: string;
  disabledReasonKey: string | null;
};

type ActionDefinition = {
  key: CustomerBmvActionKey;
  labelKey: string;
  successMessageKey: string;
  execute: (customerId: string) => Promise<unknown>;
};

type ExecuteBmvActionInput = {
  customer: CustomerDetail | null;
  key: CustomerBmvActionKey;
  execute: (customerId: string) => Promise<unknown>;
  successMessageKey: string;
  refreshCustomer?: () => Promise<void>;
  isBusy: boolean;
  activeActionKey: Ref<CustomerBmvActionKey | null>;
  feedback: Ref<ActionFeedback | null>;
};

const ACTION_KEYS = ["questionnaire", "quote", "sign"] as const;

function getDefaultHintKey(key: CustomerBmvActionKey): string {
  if (key === "questionnaire") {
    return "customers.detail.bmvIntake.actionHint.questionnaire.ready";
  }
  if (key === "quote") {
    return "customers.detail.bmvIntake.actionHint.quote.ready";
  }
  return "customers.detail.bmvIntake.actionHint.sign.ready";
}

function setFeedback(
  feedback: Ref<ActionFeedback | null>,
  tone: ActionFeedbackTone,
  messageKey: string,
): void {
  feedback.value = { tone, messageKey };
}

function resolveRunnableCustomer(
  customer: CustomerDetail | null,
  key: CustomerBmvActionKey,
  isBusy: boolean,
  feedback: Ref<ActionFeedback | null>,
): CustomerDetail | null {
  const availability = resolveAvailability(customer, key);
  if (!customer || !customer.bmvProfile || !availability || isBusy) {
    return null;
  }

  if (availability.disabledReasonKey) {
    setFeedback(feedback, "danger", availability.disabledReasonKey);
    return null;
  }

  return customer;
}

async function handleActionSuccess(
  refreshCustomer: (() => Promise<void>) | undefined,
  feedback: Ref<ActionFeedback | null>,
  successMessageKey: string,
): Promise<boolean> {
  try {
    await refreshCustomerSafely(refreshCustomer);
  } catch {
    setFeedback(
      feedback,
      "danger",
      "customers.detail.bmvIntake.actionState.refreshFailed",
    );
    return false;
  }

  setFeedback(feedback, "success", successMessageKey);
  return true;
}

async function handleActionFailure(
  error: unknown,
  refreshCustomer: (() => Promise<void>) | undefined,
  feedback: Ref<ActionFeedback | null>,
): Promise<boolean> {
  if (
    error instanceof CustomerRepositoryError &&
    error.code === "VALIDATION_ERROR"
  ) {
    await refreshCustomerSafely(refreshCustomer).catch(() => undefined);
  }

  setFeedback(feedback, "danger", mapActionError(error));
  return false;
}

async function executeBmvAction(
  input: ExecuteBmvActionInput,
): Promise<boolean> {
  const customer = resolveRunnableCustomer(
    input.customer,
    input.key,
    input.isBusy,
    input.feedback,
  );
  if (!customer) return false;

  input.activeActionKey.value = input.key;
  input.feedback.value = null;

  try {
    await input.execute(customer.id);
    return await handleActionSuccess(
      input.refreshCustomer,
      input.feedback,
      input.successMessageKey,
    );
  } catch (error) {
    return await handleActionFailure(
      error,
      input.refreshCustomer,
      input.feedback,
    );
  } finally {
    input.activeActionKey.value = null;
  }
}

function createActionDefinition(
  repository: BmvActionRepository,
  key: CustomerBmvActionKey,
): ActionDefinition {
  if (key === "questionnaire") {
    return {
      key,
      labelKey: "customers.detail.bmvIntake.actions.questionnaire",
      successMessageKey:
        "customers.detail.bmvIntake.actionState.questionnaireSuccess",
      execute: repository.sendBmvQuestionnaire,
    };
  }

  if (key === "quote") {
    return {
      key,
      labelKey: "customers.detail.bmvIntake.actions.quote",
      successMessageKey: "customers.detail.bmvIntake.actionState.quoteSuccess",
      execute: repository.generateBmvQuote,
    };
  }

  return {
    key,
    labelKey: "customers.detail.bmvIntake.actions.sign",
    successMessageKey: "customers.detail.bmvIntake.actionState.signSuccess",
    execute: repository.recordBmvSign,
  };
}

function createActionItem(
  definition: ActionDefinition,
  customer: CustomerDetail,
  isBusy: boolean,
  activeActionKey: CustomerBmvActionKey | null,
  runAction: (definition: ActionDefinition) => Promise<boolean>,
): CustomerBmvActionItem {
  const availability = resolveAvailability(customer, definition.key);

  return {
    key: definition.key,
    labelKey: definition.labelKey,
    hintKey: availability?.hintKey ?? getDefaultHintKey(definition.key),
    disabled: isBusy || Boolean(availability?.disabledReasonKey),
    loading: activeActionKey === definition.key,
    run: () => runAction(definition),
  };
}

function resolveQuestionnaireAvailability(
  customer: CustomerDetail | null,
): ActionAvailability | null {
  const profile = customer?.bmvProfile;
  if (!customer || !profile) return null;

  if (profile.signStatus === "signed") {
    return {
      hintKey: "customers.detail.bmvIntake.actionHint.questionnaire.signed",
      disabledReasonKey:
        "customers.detail.bmvIntake.actionHint.questionnaire.signed",
    };
  }

  if (profile.questionnaireStatus === "sent") {
    return {
      hintKey:
        "customers.detail.bmvIntake.actionHint.questionnaire.alreadySent",
      disabledReasonKey:
        "customers.detail.bmvIntake.actionHint.questionnaire.alreadySent",
    };
  }

  if (
    profile.questionnaireStatus === "returned" ||
    profile.quoteStatus !== "not_started" ||
    profile.signStatus === "pending"
  ) {
    return {
      hintKey:
        "customers.detail.bmvIntake.actionHint.questionnaire.stageCompleted",
      disabledReasonKey:
        "customers.detail.bmvIntake.actionHint.questionnaire.stageCompleted",
    };
  }

  return {
    hintKey: "customers.detail.bmvIntake.actionHint.questionnaire.ready",
    disabledReasonKey: null,
  };
}

function resolveQuoteAvailability(
  customer: CustomerDetail | null,
): ActionAvailability | null {
  const profile = customer?.bmvProfile;
  if (!customer || !profile) return null;

  if (profile.signStatus === "signed") {
    return {
      hintKey: "customers.detail.bmvIntake.actionHint.quote.signed",
      disabledReasonKey: "customers.detail.bmvIntake.actionHint.quote.signed",
    };
  }

  if (profile.questionnaireStatus === "not_started") {
    return {
      hintKey: "customers.detail.bmvIntake.actionHint.quote.needsQuestionnaire",
      disabledReasonKey:
        "customers.detail.bmvIntake.actionHint.quote.needsQuestionnaire",
    };
  }

  if (
    profile.quoteStatus === "generated" ||
    profile.quoteStatus === "confirmed" ||
    profile.signStatus === "pending"
  ) {
    return {
      hintKey: "customers.detail.bmvIntake.actionHint.quote.stageCompleted",
      disabledReasonKey:
        "customers.detail.bmvIntake.actionHint.quote.stageCompleted",
    };
  }

  return {
    hintKey: "customers.detail.bmvIntake.actionHint.quote.ready",
    disabledReasonKey: null,
  };
}

function resolveSignAvailability(
  customer: CustomerDetail | null,
): ActionAvailability | null {
  const profile = customer?.bmvProfile;
  if (!customer || !profile) return null;

  if (profile.signStatus === "signed") {
    return {
      hintKey: "customers.detail.bmvIntake.actionHint.sign.signed",
      disabledReasonKey: "customers.detail.bmvIntake.actionHint.sign.signed",
    };
  }

  if (
    profile.quoteStatus !== "generated" &&
    profile.quoteStatus !== "confirmed"
  ) {
    return {
      hintKey: "customers.detail.bmvIntake.actionHint.sign.needsQuote",
      disabledReasonKey:
        "customers.detail.bmvIntake.actionHint.sign.needsQuote",
    };
  }

  return {
    hintKey: "customers.detail.bmvIntake.actionHint.sign.ready",
    disabledReasonKey: null,
  };
}

function resolveAvailability(
  customer: CustomerDetail | null,
  key: CustomerBmvActionKey,
): ActionAvailability | null {
  if (key === "questionnaire")
    return resolveQuestionnaireAvailability(customer);
  if (key === "quote") return resolveQuoteAvailability(customer);
  return resolveSignAvailability(customer);
}

function mapActionError(error: unknown): string {
  if (!(error instanceof CustomerRepositoryError)) {
    return "customers.detail.bmvIntake.actionState.requestFailed";
  }

  if (error.code === "UNAUTHORIZED") {
    return "customers.detail.bmvIntake.actionState.unauthorized";
  }

  if (
    error.code === "VALIDATION_ERROR" &&
    isBmvGateError(error.serverErrorCode)
  ) {
    return resolveFirstBlockerI18nKey(error.serverBlockers);
  }

  if (error.code === "VALIDATION_ERROR") {
    return "customers.detail.bmvIntake.actionState.validationError";
  }

  return "customers.detail.bmvIntake.actionState.requestFailed";
}

async function refreshCustomerSafely(
  refreshCustomer?: () => Promise<void>,
): Promise<void> {
  if (!refreshCustomer) return;
  await refreshCustomer();
}

/**
 * 经营管理签动作状态模型：统一封装三个按钮的门禁、请求态、反馈文案与详情刷新。
 * @param input 模型依赖，包含当前客户、BMV 仓储能力与可选的详情刷新回调。
 * @returns 提供动作列表、当前反馈文案与正在执行的动作标识。
 */
export function useCustomerBmvActionModel(
  input: UseCustomerBmvActionModelInput,
) {
  const activeActionKey = ref<CustomerBmvActionKey | null>(null);
  const feedback = ref<ActionFeedback | null>(null);
  const isBusy = computed(() => activeActionKey.value !== null);

  async function runAction(definition: ActionDefinition): Promise<boolean> {
    return executeBmvAction({
      customer: input.customer.value,
      key: definition.key,
      execute: definition.execute,
      successMessageKey: definition.successMessageKey,
      refreshCustomer: input.refreshCustomer,
      isBusy: isBusy.value,
      activeActionKey,
      feedback,
    });
  }

  const actions = computed<CustomerBmvActionItem[] | null>(() => {
    const customer = input.customer.value;
    if (!customer?.bmvProfile) return null;

    return ACTION_KEYS.map((key) =>
      createActionItem(
        createActionDefinition(input.repository, key),
        customer,
        isBusy.value,
        activeActionKey.value,
        runAction,
      ),
    );
  });

  return {
    actions,
    feedbackTone: computed(() => feedback.value?.tone ?? null),
    feedbackMessageKey: computed(() => feedback.value?.messageKey ?? null),
    activeActionKey: computed(() => activeActionKey.value),
  };
}
