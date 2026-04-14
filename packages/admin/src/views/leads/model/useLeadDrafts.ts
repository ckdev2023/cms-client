import { ref } from "vue";
import type { LeadCreateFormFields, LeadDraft } from "../types";

export const LEAD_DRAFTS_STORAGE_KEY = "gyosei_os_lead_drafts_v1";

/**
 * 可注入的 Storage 接口，便于测试。
 */
export interface DraftStorageLike {
  /** */
  getItem(key: string): string | null;
  /** */
  setItem(key: string, value: string): void;
}

/**
 *
 */
export interface UseLeadDraftsDeps {
  /** */
  storage: DraftStorageLike;
  /** */
  now?: () => number;
}

function generateDraftId(now: number): string {
  return `lead-draft-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

function readFromStorage(storage: DraftStorageLike): LeadDraft[] {
  try {
    const raw = storage.getItem(LEAD_DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LeadDraft[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(storage: DraftStorageLike, items: LeadDraft[]) {
  try {
    storage.setItem(LEAD_DRAFTS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* 存储失败时保持静默 */
  }
}

/**
 * 线索草稿管理：保存、载入、移除，底层使用 localStorage。
 *
 * @param deps - 注入 storage 实现与可选的 now 函数
 * @returns 草稿列表与操作方法
 */
export function useLeadDrafts(deps: UseLeadDraftsDeps) {
  const { storage, now = Date.now } = deps;
  const drafts = ref<LeadDraft[]>(readFromStorage(storage));

  function refresh() {
    drafts.value = readFromStorage(storage);
  }

  function saveDraft(fields: LeadCreateFormFields): LeadDraft {
    const draft: LeadDraft = {
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

  function getDraft(draftId: string): LeadDraft | undefined {
    return readFromStorage(storage).find((d) => d.id === draftId);
  }

  return { drafts, saveDraft, removeDraft, getDraft, refresh };
}
