import { computed, ref, type ComputedRef } from "vue";
import { SESSION_KEY_RESUME_CASE_CREATE_HASH } from "../../../shared/navigation/sessionResumeKeys";

function readCustomerIdFromCaseCreateResumeHash(hash: string): string | null {
  const q = hash.indexOf("?");
  if (q < 0) return null;
  const id = new URLSearchParams(hash.slice(q + 1)).get("customerId");
  const trimmed = id?.trim();
  return trimmed || null;
}

/**
 * 客户详情：若用户从案件新建向导带 hash 跳入，可提供返回向导横幅。
 *
 * @param customerId - 路由上的客户 ID
 * @returns 横幅可见性与恢复/忽略操作
 */
export function useResumeCaseCreateBanner(customerId: ComputedRef<string>) {
  const resumeCaseCreateHashStored = ref<string | null>(null);

  function refreshResumeCaseCreateHash(): void {
    try {
      resumeCaseCreateHashStored.value = sessionStorage.getItem(
        SESSION_KEY_RESUME_CASE_CREATE_HASH,
      );
    } catch {
      resumeCaseCreateHashStored.value = null;
    }
  }

  const showResumeCaseCreateBanner = computed(() => {
    const h = resumeCaseCreateHashStored.value;
    if (!h?.trim()) return false;
    const cidRoute = customerId.value.trim();
    if (!cidRoute) return false;
    const fromHash = readCustomerIdFromCaseCreateResumeHash(h);
    if (!fromHash) return false;
    return fromHash === cidRoute;
  });

  function continueResumeCaseCreate(): void {
    const h = resumeCaseCreateHashStored.value;
    if (!h?.trim()) return;
    try {
      sessionStorage.removeItem(SESSION_KEY_RESUME_CASE_CREATE_HASH);
    } catch {
      /* noop */
    }
    resumeCaseCreateHashStored.value = null;
    window.location.hash = h.startsWith("#") ? h : `#${h}`;
  }

  function dismissResumeCaseCreate(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY_RESUME_CASE_CREATE_HASH);
    } catch {
      /* noop */
    }
    resumeCaseCreateHashStored.value = null;
  }

  return {
    refreshResumeCaseCreateHash,
    showResumeCaseCreateBanner,
    continueResumeCaseCreate,
    dismissResumeCaseCreate,
  };
}
