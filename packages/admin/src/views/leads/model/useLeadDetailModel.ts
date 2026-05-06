import {
  ref,
  computed,
  reactive,
  watch,
  type Ref,
  type ComputedRef,
} from "vue";
import type {
  BannerPresetKey,
  FollowupChannel,
  HeaderButtonStates,
  LeadConversionInfo,
  LeadDetail,
  LeadDetailTab,
  LeadLogCategory,
  LeadLogEntry,
} from "../types";
import { HEADER_BUTTON_PRESETS, LEAD_DETAIL_TABS } from "../types";
import type { LeadRepository, ServerBlocker } from "./LeadRepository";
import { createLeadRepository, LeadRepositoryError } from "./LeadRepository";
import type {
  LeadFollowupInput,
  LeadDedupResult,
  LeadConvertCustomerInput,
  LeadConvertCaseInput,
} from "./LeadAdapter";
import { isLeadBmvGateError } from "./LeadBmvGateBinding";
import { useLeadMutationActions } from "./useLeadMutationActions";

export type { LeadMutationFailure } from "./useLeadMutationActions";

/**
 *
 */
export interface FollowupFormFields {
  /**
   *
   */
  channel: FollowupChannel | "";
  /**
   *
   */
  summary: string;
  /**
   *
   */
  conclusion: string;
  /**
   *
   */
  nextAction: string;
  /**
   *
   */
  nextFollowUp: string;
}

const BLANK_FOLLOWUP: FollowupFormFields = {
  channel: "",
  summary: "",
  conclusion: "",
  nextAction: "",
  nextFollowUp: "",
};

const EMPTY_CONVERSION: LeadConversionInfo = {
  dedupResult: null,
  convertedCustomer: null,
  convertedCase: null,
  conversions: [],
};

/**
 *
 */
export interface UseLeadDetailModelDeps {
  /**
   *
   */
  repo?: LeadRepository;
}

function useFollowupForm(
  leadId: Ref<string>,
  isReadonly: ComputedRef<boolean>,
  submitting: Ref<boolean>,
  repo: LeadRepository,
  fetchDetail: () => Promise<void>,
) {
  const followupForm = reactive<FollowupFormFields>({ ...BLANK_FOLLOWUP });

  const canSubmitFollowup = computed(
    () =>
      followupForm.channel !== "" &&
      followupForm.summary.trim() !== "" &&
      !isReadonly.value &&
      !submitting.value,
  );

  function resetFollowupForm(): void {
    Object.assign(followupForm, { ...BLANK_FOLLOWUP });
  }

  async function submitFollowup(): Promise<FollowupFormFields | null> {
    if (!canSubmitFollowup.value) return null;
    const snapshot = { ...followupForm };

    const normalizedId = leadId.value?.trim();
    if (!normalizedId) return null;

    const input: LeadFollowupInput = {
      channel: snapshot.channel as FollowupChannel,
      summary: snapshot.summary,
      conclusion: snapshot.conclusion || undefined,
      nextAction: snapshot.nextAction || undefined,
      nextFollowUp: snapshot.nextFollowUp || undefined,
    };

    submitting.value = true;
    try {
      await repo.addFollowup(normalizedId, input);
      resetFollowupForm();
      await fetchDetail();
      return snapshot;
    } catch {
      return null;
    } finally {
      submitting.value = false;
    }
  }

  return { followupForm, canSubmitFollowup, resetFollowupForm, submitFollowup };
}

function useLogFilter(rawLog: ComputedRef<LeadLogEntry[]>) {
  const logCategory = ref<LeadLogCategory>("all");

  const filteredLog = computed<LeadLogEntry[]>(() => {
    if (logCategory.value === "all") return rawLog.value;
    return rawLog.value.filter((e) => e.type === logCategory.value);
  });

  function setLogCategory(cat: LeadLogCategory): void {
    logCategory.value = cat;
  }

  return { logCategory, filteredLog, setLogCategory };
}

function useLeadFetch(leadId: Ref<string>, repo: LeadRepository) {
  const lead = ref<LeadDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let fetchGeneration = 0;

  async function fetchDetail(): Promise<void> {
    const gen = ++fetchGeneration;
    const normalizedId = leadId.value?.trim();
    if (!normalizedId) {
      lead.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await repo.getDetail(normalizedId);
      if (gen !== fetchGeneration) return;
      lead.value = result?.detail ?? null;
    } catch (e) {
      if (gen !== fetchGeneration) return;
      error.value = e instanceof Error ? e.message : String(e);
      lead.value = null;
    } finally {
      if (gen === fetchGeneration) loading.value = false;
    }
  }

  watch(leadId, () => {
    void fetchDetail();
  });
  void fetchDetail();

  return { lead, loading, error, fetchDetail };
}

interface ConvertDedupState {
  result: Ref<LeadDedupResult | null>;
  loading: Ref<boolean>;
  prompt: Ref<boolean>;
}

async function checkDedupForConvert(
  lead: Ref<LeadDetail | null>,
  repo: LeadRepository,
  state: ConvertDedupState,
): Promise<boolean> {
  const detail = lead.value;
  if (!detail) return false;
  const phone = detail.info.phone?.trim();
  const email = detail.info.email?.trim();
  if (!phone && !email) return true;

  state.loading.value = true;
  try {
    const r = await repo.dedup({
      phone: phone || undefined,
      email: email || undefined,
    });
    state.result.value = r;
    if (r.leads.length > 0 || r.customers.length > 0) {
      state.prompt.value = true;
      return false;
    }
    return true;
  } catch {
    return true;
  } finally {
    state.loading.value = false;
  }
}

interface ConvertRefs {
  leadId: Ref<string>;
  lead: Ref<LeadDetail | null>;
  convertSubmitting: Ref<boolean>;
  convertDedupConfirmed: Ref<boolean>;
  showConvertDedupPrompt: Ref<boolean>;
  convertDedupResult: Ref<LeadDedupResult | null>;
  pendingCustomerInput: Ref<LeadConvertCustomerInput>;
  repo: LeadRepository;
  fetchDetail: () => Promise<void>;
  dedupState: ConvertDedupState;
}

async function doConvertCustomer(
  refs: ConvertRefs,
  input: LeadConvertCustomerInput = {},
): Promise<void> {
  const id = refs.leadId.value?.trim();
  if (!id || refs.convertSubmitting.value) return;
  refs.pendingCustomerInput.value = input;
  if (!refs.convertDedupConfirmed.value) {
    if (!(await checkDedupForConvert(refs.lead, refs.repo, refs.dedupState)))
      return;
  }
  refs.convertSubmitting.value = true;
  try {
    const payload: LeadConvertCustomerInput = {
      ...refs.pendingCustomerInput.value,
      ...(refs.convertDedupConfirmed.value ? { confirmDedup: true } : {}),
    };
    await refs.repo.convertCustomer(id, payload);
    refs.showConvertDedupPrompt.value = false;
    refs.convertDedupConfirmed.value = false;
    refs.convertDedupResult.value = null;
    refs.pendingCustomerInput.value = {};
    await refs.fetchDetail();
  } finally {
    refs.convertSubmitting.value = false;
  }
}

/**
 * 转案件失败时返回的结构化错误。
 *
 * - `kind = "bmvGate"` 表示服务端 `CASE_BMV_GATE_BLOCKED` 闸口阻断，
 *   `blockers` 为原始 blocker 列表（按 server 顺序）。
 * - `kind = "generic"` 表示其他类型的失败（网络、未授权、表单非法等），
 *   `messageKey` 为 i18n fallback key，`fallbackMessage` 为 server 原文。
 */
export type LeadConvertCaseFailure =
  | {
      /**
       *
       */
      kind: "bmvGate";
      /**
       *
       */
      serverErrorCode: string;
      /**
       *
       */
      blockers: ServerBlocker[];
    }
  | {
      /**
       *
       */
      kind: "generic";
      /**
       *
       */
      messageKey: string;
      /**
       *
       */
      fallbackMessage?: string;
    };

const GENERIC_CONVERT_CASE_MESSAGE_KEY = "leads.errors.convertCaseFailed";

function toConvertCaseFailure(error: unknown): LeadConvertCaseFailure {
  if (error instanceof LeadRepositoryError) {
    const serverErrorCode = error.serverErrorCode;
    const blockers = error.serverBlockers;
    if (
      serverErrorCode !== undefined &&
      isLeadBmvGateError(serverErrorCode) &&
      blockers &&
      blockers.length > 0
    ) {
      return {
        kind: "bmvGate",
        serverErrorCode,
        blockers,
      };
    }
    return {
      kind: "generic",
      messageKey: GENERIC_CONVERT_CASE_MESSAGE_KEY,
      fallbackMessage: error.message,
    };
  }
  return {
    kind: "generic",
    messageKey: GENERIC_CONVERT_CASE_MESSAGE_KEY,
    fallbackMessage:
      error instanceof Error && error.message ? error.message : undefined,
  };
}

async function doConvertCase(
  refs: ConvertRefs,
  input: LeadConvertCaseInput,
): Promise<LeadConvertCaseFailure | null> {
  const id = refs.leadId.value?.trim();
  if (!id || refs.convertSubmitting.value) return null;
  refs.convertSubmitting.value = true;
  try {
    await refs.repo.convertCase(id, input);
    await refs.fetchDetail();
    return null;
  } catch (error) {
    return toConvertCaseFailure(error);
  } finally {
    refs.convertSubmitting.value = false;
  }
}

function useConvertActions(
  leadId: Ref<string>,
  lead: Ref<LeadDetail | null>,
  repo: LeadRepository,
  fetchDetail: () => Promise<void>,
) {
  const convertDedupResult = ref<LeadDedupResult | null>(null);
  const convertDedupLoading = ref(false);
  const convertSubmitting = ref(false);
  const convertDedupConfirmed = ref(false);
  const showConvertDedupPrompt = ref(false);
  const pendingCustomerInput = ref<LeadConvertCustomerInput>({});

  const refs: ConvertRefs = {
    leadId,
    lead,
    convertSubmitting,
    convertDedupConfirmed,
    showConvertDedupPrompt,
    convertDedupResult,
    pendingCustomerInput,
    repo,
    fetchDetail,
    dedupState: {
      result: convertDedupResult,
      loading: convertDedupLoading,
      prompt: showConvertDedupPrompt,
    },
  };

  return {
    convertDedupResult,
    convertDedupLoading,
    convertSubmitting,
    showConvertDedupPrompt,
    convertCustomer: (input?: LeadConvertCustomerInput) =>
      doConvertCustomer(refs, input),
    convertCase: (input: LeadConvertCaseInput) => doConvertCase(refs, input),
    confirmConvertDedup(): void {
      convertDedupConfirmed.value = true;
      showConvertDedupPrompt.value = false;
      void doConvertCustomer(refs, pendingCustomerInput.value);
    },
    dismissConvertDedup(): void {
      showConvertDedupPrompt.value = false;
      convertDedupResult.value = null;
      convertDedupConfirmed.value = false;
      pendingCustomerInput.value = {};
    },
  };
}

function useConversionInfo(lead: Ref<LeadDetail | null>) {
  const conversion = computed<LeadConversionInfo>(
    () => lead.value?.conversion ?? EMPTY_CONVERSION,
  );

  const conversionCustomerHref = computed<string | null>(() => {
    const cust = conversion.value.convertedCustomer;
    return cust ? `#/customers/${cust.id}` : null;
  });

  const conversionCaseHref = computed<string | null>(() => {
    const cas = conversion.value.convertedCase;
    return cas ? `#/cases/${cas.id}` : null;
  });

  return { conversion, conversionCustomerHref, conversionCaseHref };
}

/**
 * 线索详情页整体状态编排。
 *
 * 依赖注入 LeadRepository（默认 `createLeadRepository()`），
 * 通过 `getDetail` 异步加载线索详情。
 *
 * @param leadId 路由传入的线索 ID（响应式）
 * @param deps 可选依赖注入
 * @returns 详情页状态
 */
export function useLeadDetailModel(
  leadId: Ref<string>,
  deps: UseLeadDetailModelDeps = {},
) {
  const repo = deps.repo ?? createLeadRepository();
  const activeTab = ref<LeadDetailTab>("info");
  const submitting = ref(false);

  const { lead, loading, error, fetchDetail } = useLeadFetch(leadId, repo);

  const notFound = computed(() => !loading.value && lead.value === null);
  const isReadonly = computed(() => lead.value?.readonly ?? false);
  const banner = computed<BannerPresetKey>(() => lead.value?.banner ?? null);
  const buttonStates = computed<HeaderButtonStates>(
    () => HEADER_BUTTON_PRESETS[lead.value?.buttons ?? "normal"],
  );
  const avatarInitials = computed(() =>
    lead.value ? lead.value.name.slice(0, 1) : "?",
  );

  function switchTab(tab: LeadDetailTab): void {
    activeTab.value = tab;
  }

  const rawLog = computed(() => lead.value?.log ?? []);

  return {
    activeTab,
    tabs: LEAD_DETAIL_TABS,
    lead,
    notFound,
    isReadonly,
    banner,
    buttonStates,
    avatarInitials,
    loading,
    error,
    submitting,
    switchTab,
    refetch: fetchDetail,
    ...useFollowupForm(leadId, isReadonly, submitting, repo, fetchDetail),
    ...useLogFilter(rawLog),
    ...useConversionInfo(lead),
    ...useConvertActions(leadId, lead, repo, fetchDetail),
    ...useLeadMutationActions(leadId, repo, fetchDetail),
  };
}
