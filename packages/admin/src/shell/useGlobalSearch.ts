import { computed, ref, watch } from "vue";
import type { Router } from "vue-router";
import type {
  SearchHit,
  SearchHitType,
  SearchRepository,
} from "../shared/api/searchRepository";

const DEBOUNCE_MS = 200;

const TYPE_ORDER: readonly SearchHitType[] = [
  "customer",
  "case",
  "lead",
  "document",
  "task",
  "conversation",
];

/**
 *
 */
export interface SearchGroup {
  /**
   *
   */
  type: SearchHitType;
  /**
   *
   */
  hits: readonly SearchHit[];
}

/**
 *
 */
export interface GlobalSearchModelDeps {
  /**
   *
   */
  repo: SearchRepository;
  /**
   *
   */
  router: Pick<Router, "push">;
}

function createSearchState() {
  return {
    query: ref(""),
    hits: ref<readonly SearchHit[]>([]),
    loading: ref(false),
    error: ref<string | null>(null),
    open: ref(false),
    highlightedIndex: ref(0),
  };
}

type SearchState = ReturnType<typeof createSearchState>;

function buildFlatHits(state: SearchState) {
  return computed<readonly SearchHit[]>(() => {
    const grouped: SearchHit[][] = TYPE_ORDER.map(() => []);
    for (const hit of state.hits.value) {
      const idx = TYPE_ORDER.indexOf(hit.type);
      if (idx >= 0) grouped[idx].push(hit);
    }
    return grouped.flat();
  });
}

function buildGroups(flatHits: ReturnType<typeof buildFlatHits>) {
  return computed<readonly SearchGroup[]>(() => {
    const map = new Map<SearchHitType, SearchHit[]>();
    for (const hit of flatHits.value) {
      const bucket = map.get(hit.type) ?? [];
      bucket.push(hit);
      map.set(hit.type, bucket);
    }
    return Array.from(map.entries()).map(([type, items]) => ({
      type,
      hits: items,
    }));
  });
}

function createSearchExecutor(state: SearchState, repo: SearchRepository) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;
  let lastRequestId = 0;

  function cancelPending() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  async function execute(term: string, requestId: number) {
    state.loading.value = true;
    state.error.value = null;
    abortController = new AbortController();

    try {
      const result = await repo.search(term);
      if (requestId !== lastRequestId) return;
      state.hits.value = result.hits;
      state.highlightedIndex.value = 0;
    } catch (e: unknown) {
      if (requestId !== lastRequestId) return;
      if (e instanceof DOMException && e.name === "AbortError") return;
      state.error.value = "検索に失敗しました。";
    } finally {
      if (requestId === lastRequestId) {
        state.loading.value = false;
      }
    }
  }

  function scheduleSearch(trimmed: string) {
    debounceTimer = setTimeout(() => {
      lastRequestId++;
      void execute(trimmed, lastRequestId);
    }, DEBOUNCE_MS);
  }

  return { cancelPending, scheduleSearch };
}

function resetState(state: SearchState) {
  state.query.value = "";
  state.hits.value = [];
  state.loading.value = false;
  state.error.value = null;
  state.highlightedIndex.value = 0;
}

/**
 * グローバル検索パレットのビューモデル。debounce・abort・キーボード操作を管理する。
 *
 * @param deps - 検索仓储とルーター
 * @returns 検索パレットに必要な状態と操作
 */
export function useGlobalSearch(deps: GlobalSearchModelDeps) {
  const { repo, router } = deps;
  const state = createSearchState();
  const flatHits = buildFlatHits(state);
  const groups = buildGroups(flatHits);
  const { cancelPending, scheduleSearch } = createSearchExecutor(state, repo);

  watch(state.query, (value) => {
    cancelPending();
    const trimmed = value.trim();
    if (!trimmed) {
      state.hits.value = [];
      state.loading.value = false;
      state.error.value = null;
      state.highlightedIndex.value = 0;
      return;
    }
    scheduleSearch(trimmed);
  });

  function openPalette() {
    state.open.value = true;
    state.highlightedIndex.value = 0;
  }

  function closePalette() {
    state.open.value = false;
    cancelPending();
    resetState(state);
  }

  function moveHighlight(delta: number) {
    const count = flatHits.value.length;
    if (count === 0) return;
    state.highlightedIndex.value =
      (state.highlightedIndex.value + delta + count) % count;
  }

  function selectHit(hit?: SearchHit) {
    const target = hit ?? flatHits.value[state.highlightedIndex.value];
    if (!target) return;
    void router.push(target.href);
    closePalette();
  }

  return {
    query: state.query,
    hits: flatHits,
    groups,
    loading: state.loading,
    error: state.error,
    open: state.open,
    highlightedIndex: state.highlightedIndex,
    openPalette,
    closePalette,
    moveHighlight,
    selectHit,
  };
}
