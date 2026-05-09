import { ref, computed } from "vue";
import type {
  DocumentListItem,
  DocumentProviderFilter,
  DocumentProviderType,
  DocumentStatusFilter,
} from "../types";
import { sortDocumentsByDefault } from "../fixtures";
import type { ListDocumentsParams } from "./DocumentRepositoryTypes";

function matchesStatus(
  item: DocumentListItem,
  status: DocumentStatusFilter,
): boolean {
  if (!status) return true;
  if (status === "missing")
    return item.status === "pending" || item.status === "rejected";
  return item.status === status;
}

function matchesSearch(item: DocumentListItem, query: string): boolean {
  const q = query.toLowerCase();
  return (
    item.name.toLowerCase().includes(q) ||
    item.caseId.toLowerCase().includes(q) ||
    item.caseName.toLowerCase().includes(q)
  );
}

/**
 * 前端 provider → 后端 `ownerSide` 正规値のマッピング。
 *
 * DocumentAdapter の OWNER_SIDE_PROVIDER_MAP の逆引き。
 */
const PROVIDER_TO_OWNER_SIDE: Record<DocumentProviderType, string> = {
  main_applicant: "applicant",
  dependent_guarantor: "guarantor",
  employer_org: "employer",
  office_internal: "office",
};

function statusFilterToApiParams(
  s: DocumentStatusFilter,
): Pick<ListDocumentsParams, "status" | "statusIn"> {
  switch (s) {
    case "":
      return {};
    case "missing":
      return {
        statusIn: ["pending", "waiting_upload", "revision_required"],
      };
    case "pending":
      return { statusIn: ["pending", "waiting_upload"] };
    case "rejected":
      return { statusIn: ["revision_required"] };
    case "expired":
      return { statusIn: ["expired"] };
    default:
      return { status: s };
  }
}

// 客户端搜索时一次性拉取的最大条数：由后端 documentFiles.controller 的 limit 上限（200）决定。
// 后端目前不支持搜索；放大 limit 让客户端 search 能看到完整数据集，避免“当前页过滤命中 0 件，
// 但分页仍显示 共 47 条”这类错位。后续如后端支持服务端搜索，应把 search 参数下推、回收此放大。
const SEARCH_FULL_LIMIT = 200;

function buildApiParams(
  status: DocumentStatusFilter,
  caseId: string,
  provider: DocumentProviderFilter,
  search: string,
): ListDocumentsParams {
  const p: ListDocumentsParams = {
    ...statusFilterToApiParams(status),
  };
  if (caseId) p.caseId = caseId;
  if (provider) {
    p.ownerSide =
      PROVIDER_TO_OWNER_SIDE[provider as DocumentProviderType] ?? provider;
  }
  if (search) p.limit = SEARCH_FULL_LIMIT;
  return p;
}

function filterItems(
  items: readonly DocumentListItem[],
  status: DocumentStatusFilter,
  caseId: string,
  provider: DocumentProviderFilter,
  search: string,
): DocumentListItem[] {
  let result = [...items];
  if (status) result = result.filter((d) => matchesStatus(d, status));
  if (caseId) result = result.filter((d) => d.caseId === caseId);
  if (provider) result = result.filter((d) => d.provider === provider);
  if (search) result = result.filter((d) => matchesSearch(d, search));
  return sortDocumentsByDefault(result);
}

/**
 * API 取得済みアイテムにクライアントサイド検索 + デフォルトソートのみ適用。
 *
 * @param items - API 結果
 * @param search - 検索クエリ
 * @returns フィルタ・ソート済みリスト
 */
function searchAndSort(
  items: readonly DocumentListItem[],
  search: string,
): DocumentListItem[] {
  let result = [...items];
  if (search) result = result.filter((d) => matchesSearch(d, search));
  return sortDocumentsByDefault(result);
}

/**
 * 资料列表筛选/搜索/排序状态管理。
 *
 * @returns 筛选状态 refs、派生 computed、重置与过滤函数
 */
export function useDocumentFilters() {
  const status = ref<DocumentStatusFilter>("");
  const caseId = ref("");
  const provider = ref<DocumentProviderFilter>("");
  const search = ref("");

  const isFilterActive = computed(
    () =>
      status.value !== "" ||
      caseId.value !== "" ||
      provider.value !== "" ||
      search.value !== "",
  );

  const apiParams = computed<ListDocumentsParams>(() =>
    buildApiParams(status.value, caseId.value, provider.value, search.value),
  );

  return {
    status,
    caseId,
    provider,
    search,
    isFilterActive,
    apiParams,
    resetFilters() {
      status.value = "";
      caseId.value = "";
      provider.value = "";
      search.value = "";
    },
    applyFilters: (items: readonly DocumentListItem[]) =>
      filterItems(
        items,
        status.value,
        caseId.value,
        provider.value,
        search.value,
      ),
    applySearchAndSort: (items: readonly DocumentListItem[]) =>
      searchAndSort(items, search.value),
  };
}
