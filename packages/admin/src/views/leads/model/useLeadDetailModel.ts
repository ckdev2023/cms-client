import {
  ref,
  computed,
  reactive,
  watch,
  type Ref,
  type ComputedRef,
} from "vue";
import type { LocationQuery } from "vue-router";
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
import type { LeadRepository } from "./LeadRepository";
import { createLeadRepository, LeadRepositoryError } from "./LeadRepository";
import type {
  LeadFollowupInput,
  LeadDedupResult,
  LeadConvertCustomerInput,
  LeadConvertCaseInput,
} from "./LeadAdapter";
import { buildConvertDedupParams } from "./convertDedupParams";
import { useLeadMutationActions } from "./useLeadMutationActions";
import {
  toConvertCaseFailure,
  type LeadConvertCaseFailure,
} from "./LeadConvertCaseFailure";
import { createLeadDetailActiveTab } from "./leadDetailActiveTab";

export type { LeadMutationFailure } from "./useLeadMutationActions";

/** 跟进表单字段。 */
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
  /**
   *
   */
  routeQuery?: Ref<LocationQuery> | ComputedRef<LocationQuery>;
  /**
   *
   */
  replaceQuery?: (query: Record<string, string | undefined>) => void;
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

async function checkDedupForConvert(refs: ConvertRefs): Promise<boolean> {
  const detail = refs.lead.value;
  if (!detail) return false;
  const params = buildConvertDedupParams(refs.leadId, detail);
  if (!params) return true;
  const state = refs.dedupState;
  state.loading.value = true;
  try {
    const r = await refs.repo.dedup(params);
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

function writeBackCustomerResult(refs: ConvertRefs, customerId: string): void {
  if (!refs.lead.value) return;
  refs.lead.value = {
    ...refs.lead.value,
    buttons: "convertedCustomer",
    banner: null,
    conversion: {
      ...refs.lead.value.conversion,
      convertedCustomer: {
        id: customerId,
        name: "",
        group: "",
        convertedAt: new Date().toISOString(),
        convertedBy: "",
      },
    },
  };
}

async function doConvertCustomer(
  refs: ConvertRefs,
  input: LeadConvertCustomerInput = {},
): Promise<void> {
  const id = refs.leadId.value?.trim();
  if (!id || refs.convertSubmitting.value) return;
  refs.pendingCustomerInput.value = input;
  if (!refs.convertDedupConfirmed.value) {
    if (!(await checkDedupForConvert(refs))) return;
  }
  refs.convertSubmitting.value = true;
  try {
    const payload: LeadConvertCustomerInput = {
      ...refs.pendingCustomerInput.value,
      ...(refs.convertDedupConfirmed.value ? { confirmDedup: true } : {}),
    };
    const result = await refs.repo.convertCustomer(id, payload);
    refs.showConvertDedupPrompt.value = false;
    refs.convertDedupConfirmed.value = false;
    refs.convertDedupResult.value = null;
    refs.pendingCustomerInput.value = {};
    if (result.customerId) writeBackCustomerResult(refs, result.customerId);
    await refs.fetchDetail();
  } finally {
    refs.convertSubmitting.value = false;
  }
}

export type { LeadConvertCaseFailure } from "./LeadConvertCaseFailure";

async function ensureCustomerConverted(
  refs: ConvertRefs,
  id: string,
): Promise<void> {
  const lead = refs.lead.value;
  if (
    !lead ||
    lead.status !== "signed" ||
    lead.conversion.convertedCustomer != null
  )
    return;
  try {
    await refs.repo.convertCustomer(id, {});
    await refs.fetchDetail();
  } catch (err) {
    if (
      err instanceof LeadRepositoryError &&
      err.serverErrorCode === "CUSTOMER_ALREADY_CONVERTED"
    ) {
      return;
    }
    throw err;
  }
}

function writeBackCaseResult(
  refs: ConvertRefs,
  caseId: string,
  caseTypeCode: string,
): void {
  if (!refs.lead.value) return;
  refs.lead.value = {
    ...refs.lead.value,
    buttons: "convertedCase",
    banner: null,
    conversion: {
      ...refs.lead.value.conversion,
      convertedCase: {
        id: caseId,
        title: "",
        type: caseTypeCode,
        group: "",
        convertedAt: new Date().toISOString(),
        convertedBy: "",
      },
    },
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
    await ensureCustomerConverted(refs, id);
    const result = await refs.repo.convertCase(id, input);
    if (result.caseId)
      writeBackCaseResult(refs, result.caseId, input.caseTypeCode);
    await refs.fetchDetail();
    return null;
  } catch (error) {
    await refs.fetchDetail().catch(() => {});
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
 * @param leadId - 路由传入的线索 ID（响应式）
 * @param deps - 可选依赖注入
 * @returns 详情页状态
 */
export function useLeadDetailModel(
  leadId: Ref<string>,
  deps: UseLeadDetailModelDeps = {},
) {
  const repo = deps.repo ?? createLeadRepository();
  const activeTab = createLeadDetailActiveTab(deps.routeQuery);
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
    deps.replaceQuery?.({ tab: tab === "info" ? undefined : tab });
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
