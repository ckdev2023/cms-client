import { computed, ref, type Ref } from "vue";
import type { DocumentListItem } from "../types";
import { SAMPLE_DOCUMENTS } from "../fixtures";
import {
  DocumentRepositoryError,
  createDocumentRepository,
  type DocumentRepository,
  type ListDocumentsParams,
} from "./DocumentRepository";

export const DEFAULT_PAGE_SIZE = 20;

/**
 * 资料中心列表加载错误码：与 UI 状态映射，避免直接暴露 HTTP 细节。
 */
export type DocumentListErrorCode =
  | "unauthorized"
  | "requestFailed"
  | "badResponse";

/**
 * 资料中心列表 Hook 依赖。
 */
export interface UseDocumentListModelDeps {
  /** 自定义资料中心仓储；省略时使用默认实现（`createDocumentRepository`）。 */
  repository?: DocumentRepository;
  /**
   * 当后端返回空数组（dev / 未灌种子数据）时是否回退到本地 `SAMPLE_DOCUMENTS`。
   * 默认 `true`；页面级使用时显式传 `false` 走纯 API 数据。
   *
   * @deprecated P1+ 移除：dev seed 脚本（`npm run db:seed-dev`）已能灌入测试数据，
   *   此 fallback 仅作过渡保留。移除时同步删除 `SAMPLE_DOCUMENTS` 导入与 `executeListFetch` 的 fallback 分支。
   */
  fallbackToFixturesWhenEmpty?: boolean;
  /** 初始过滤参数（如 `caseId`），后续可通过 `refresh(newParams)` 替换。 */
  params?: ListDocumentsParams;
}

function mapError(error: unknown): DocumentListErrorCode {
  if (!(error instanceof DocumentRepositoryError)) return "requestFailed";
  if (error.code === "UNAUTHORIZED") return "unauthorized";
  if (error.code === "BAD_RESPONSE") return "badResponse";
  return "requestFailed";
}

function stripPagination(
  p: ListDocumentsParams | undefined,
): ListDocumentsParams | undefined {
  if (!p) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { page, limit, ...rest } = p;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

interface FetchResult {
  items: DocumentListItem[];
  total: number;
  source: "api" | "fallback";
  error: DocumentListErrorCode | null;
}

async function executeListFetch(
  repo: DocumentRepository,
  filterParams: ListDocumentsParams | undefined,
  pg: number,
  lim: number,
  fallback: boolean,
): Promise<FetchResult> {
  try {
    const result = await repo.listDocuments({
      ...filterParams,
      page: pg,
      limit: lim,
    });
    if (result.items.length === 0 && fallback) {
      return {
        items: [...SAMPLE_DOCUMENTS],
        total: SAMPLE_DOCUMENTS.length,
        source: "fallback",
        error: null,
      };
    }
    return {
      items: result.items,
      total: result.total,
      source: "api",
      error: null,
    };
  } catch (e) {
    return {
      items: fallback ? [...SAMPLE_DOCUMENTS] : [],
      total: fallback ? SAMPLE_DOCUMENTS.length : 0,
      source: "fallback",
      error: mapError(e),
    };
  }
}

function createPaginationActions(
  page: Ref<number>,
  limit: Ref<number>,
  total: Ref<number>,
  refresh: () => Promise<void>,
) {
  return {
    nextPage(): void {
      if (page.value * limit.value < total.value) {
        page.value++;
        void refresh();
      }
    },
    prevPage(): void {
      if (page.value > 1) {
        page.value--;
        void refresh();
      }
    },
    goToPage(target: number): void {
      const maxPage = Math.max(1, Math.ceil(total.value / limit.value));
      const clamped = Math.max(1, Math.min(target, maxPage));
      if (clamped !== page.value) {
        page.value = clamped;
        void refresh();
      }
    },
  };
}

/**
 * 资料中心列表 ViewModel：封装真实 API 拉取 + 加载/错误状态 + 分页 + 手动刷新。
 *
 * @param deps - 可选依赖：测试可注入仓储
 * @returns 列表项、分页、加载/错误状态与操作方法
 */
export function useDocumentListModel(deps: UseDocumentListModelDeps = {}) {
  const repository = deps.repository ?? createDocumentRepository();
  const fallbackEmpty = deps.fallbackToFixturesWhenEmpty ?? true;
  let activeFilterParams = stripPagination(deps.params);

  const page = ref(deps.params?.page ?? 1);
  const limit = ref(deps.params?.limit ?? DEFAULT_PAGE_SIZE);
  const items: Ref<DocumentListItem[]> = ref(
    fallbackEmpty ? [...SAMPLE_DOCUMENTS] : [],
  );
  const total = ref(fallbackEmpty ? SAMPLE_DOCUMENTS.length : 0);
  const loading = ref(false);
  const errorCode = ref<DocumentListErrorCode | null>(null);
  const source = ref<"api" | "fallback">(fallbackEmpty ? "fallback" : "api");

  async function refresh(overrideParams?: ListDocumentsParams): Promise<void> {
    if (overrideParams !== undefined) {
      activeFilterParams = stripPagination(overrideParams);
      page.value = 1;
    }
    if (loading.value) return;
    loading.value = true;
    errorCode.value = null;
    const r = await executeListFetch(
      repository,
      activeFilterParams,
      page.value,
      limit.value,
      fallbackEmpty,
    );
    items.value = r.items;
    total.value = r.total;
    source.value = r.source;
    errorCode.value = r.error;
    loading.value = false;
  }

  const { nextPage, prevPage, goToPage } = createPaginationActions(
    page,
    limit,
    total,
    refresh,
  );

  void refresh();

  return {
    items: computed(() => items.value),
    total: computed(() => total.value),
    page: computed(() => page.value),
    limit: computed(() => limit.value),
    loading: computed(() => loading.value),
    errorCode: computed(() => errorCode.value),
    source: computed(() => source.value),
    refresh,
    nextPage,
    prevPage,
    goToPage,
  };
}
