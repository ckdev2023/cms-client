import { computed, ref, type ComputedRef } from "vue";
import {
  clearLeadCaseCreateResume,
  readLeadCaseCreateResume,
} from "../../../shared/navigation/sessionResumeKeys";

/**
 * 客户详情：用户从线索「签约并开始建档」闸口跳转补齐资料时，展示返回线索继续转案件的横幅。
 *
 * @param customerId - 当前客户详情页路由上的客户 ID
 * @returns 横幅可见性、刷新 session 与继续/忽略操作
 */
export function useResumeLeadCaseCreateBanner(customerId: ComputedRef<string>) {
  const stored = ref(null as { leadId: string; customerId: string } | null);

  function refreshResumeLeadCaseCreateHash(): void {
    stored.value = readLeadCaseCreateResume();
  }

  const showResumeLeadCaseCreateBanner = computed(() => {
    const p = stored.value;
    if (!p) return false;
    return p.customerId.trim() === customerId.value.trim();
  });

  function continueResumeLeadCaseCreate(): void {
    const p = stored.value;
    if (!p?.leadId.trim()) return;
    clearLeadCaseCreateResume();
    stored.value = null;
    const lid = encodeURIComponent(p.leadId.trim());
    window.location.hash = `#/leads/${lid}?tab=conversion&resumeConvert=1`;
  }

  function dismissResumeLeadCaseCreate(): void {
    clearLeadCaseCreateResume();
    stored.value = null;
  }

  return {
    refreshResumeLeadCaseCreateHash,
    showResumeLeadCaseCreateBanner,
    continueResumeLeadCaseCreate,
    dismissResumeLeadCaseCreate,
  };
}
