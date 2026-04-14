import { ref, computed, reactive, type Ref, type ComputedRef } from "vue";
import type {
  BannerPresetKey,
  FollowupChannel,
  HeaderButtonStates,
  LeadDetail,
  LeadDetailTab,
  LeadLogCategory,
  LeadLogEntry,
} from "../types";
import { HEADER_BUTTON_PRESETS, LEAD_DETAIL_TABS } from "../types";
import { LEAD_DETAIL_SAMPLES } from "../fixtures";

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

function useFollowupForm(isReadonly: ComputedRef<boolean>) {
  const followupForm = reactive<FollowupFormFields>({ ...BLANK_FOLLOWUP });

  const canSubmitFollowup = computed(
    () =>
      followupForm.channel !== "" &&
      followupForm.summary.trim() !== "" &&
      !isReadonly.value,
  );

  function resetFollowupForm(): void {
    Object.assign(followupForm, { ...BLANK_FOLLOWUP });
  }

  function submitFollowup(): FollowupFormFields | null {
    if (!canSubmitFollowup.value) return null;
    const snapshot = { ...followupForm };
    resetFollowupForm();
    return snapshot;
  }

  return { followupForm, canSubmitFollowup, resetFollowupForm, submitFollowup };
}

function useLogFilter(log: ComputedRef<LeadLogEntry[]>) {
  const logCategory = ref<LeadLogCategory>("all");

  const filteredLog = computed<LeadLogEntry[]>(() => {
    if (logCategory.value === "all") return log.value;
    return log.value.filter((e) => e.type === logCategory.value);
  });

  function setLogCategory(cat: LeadLogCategory): void {
    logCategory.value = cat;
  }

  return { logCategory, filteredLog, setLogCategory };
}

/**
 * 线索详情页整体状态编排。
 *
 * @param leadId 路由传入的线索 ID 或场景 key（响应式）
 * @returns 详情页状态：线索数据、tab、banner、按钮矩阵、跟进表单、日志筛选等
 */
export function useLeadDetailModel(leadId: Ref<string>) {
  const activeTab = ref<LeadDetailTab>("info");
  const lead = computed<LeadDetail | null>(
    () => LEAD_DETAIL_SAMPLES[leadId.value] ?? null,
  );
  const notFound = computed(() => lead.value === null);
  const isReadonly = computed(() => lead.value?.readonly ?? false);
  const banner = computed<BannerPresetKey>(() => lead.value?.banner ?? null);
  const buttonStates = computed<HeaderButtonStates>(() => {
    const key = lead.value?.buttons ?? "normal";
    return HEADER_BUTTON_PRESETS[key];
  });
  const avatarInitials = computed(() => {
    if (!lead.value) return "?";
    return lead.value.name.slice(0, 1);
  });

  function switchTab(tab: LeadDetailTab): void {
    activeTab.value = tab;
  }

  const rawLog = computed(() => lead.value?.log ?? []);
  const followup = useFollowupForm(isReadonly);
  const logFilter = useLogFilter(rawLog);

  return {
    activeTab,
    tabs: LEAD_DETAIL_TABS,
    lead,
    notFound,
    isReadonly,
    banner,
    buttonStates,
    avatarInitials,
    switchTab,
    ...followup,
    ...logFilter,
  };
}
