import { ref } from "vue";
import type { CustomerCreateFormFields, CustomerDraft } from "../types";

export const DRAFTS_STORAGE_KEY = "gyosei_os_customer_drafts_v1";

/**
 * 可注入的 Storage 接口，便于测试。
 */
export interface DraftStorageLike {
  /**
   *
   */
  getItem(key: string): string | null;
  /**
   *
   */
  setItem(key: string, value: string): void;
}

/**
 *
 */
export interface UseCustomerDraftsDeps {
  /**
   *
   */
  storage: DraftStorageLike;
  /**
   *
   */
  now?: () => number;
}

function generateDraftId(now: number): string {
  return `draft-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

function readFromStorage(storage: DraftStorageLike): CustomerDraft[] {
  try {
    const raw = storage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerDraft[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(storage: DraftStorageLike, items: CustomerDraft[]) {
  try {
    storage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* 存储失败时保持静默 */
  }
}

/**
 * 客户草稿管理：保存、载入、移除，底层使用 localStorage。
 *
 * @param deps - 注入 storage 实现与可选的 now 函数
 * @returns 草稿列表与操作方法
 */
export function useCustomerDrafts(deps: UseCustomerDraftsDeps) {
  const { storage, now = Date.now } = deps;
  const drafts = ref<CustomerDraft[]>(readFromStorage(storage));

  function refresh() {
    drafts.value = readFromStorage(storage);
  }

  function saveDraft(fields: CustomerCreateFormFields): CustomerDraft {
    const draft: CustomerDraft = {
      id: generateDraftId(now()),
      fields: { ...fields },
      savedAt: now(),
    };
    const all = readFromStorage(storage);
    all.unshift(draft);
    writeToStorage(storage, all);
    drafts.value = all;
    return draft;
  }

  function removeDraft(draftId: string) {
    const all = readFromStorage(storage).filter((d) => d.id !== draftId);
    writeToStorage(storage, all);
    drafts.value = all;
  }

  function getDraft(draftId: string): CustomerDraft | undefined {
    return readFromStorage(storage).find((d) => d.id === draftId);
  }

  return { drafts, saveDraft, removeDraft, getDraft, refresh };
}
