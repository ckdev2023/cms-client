import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import type {
  SearchHit,
  SearchRepository,
} from "../shared/api/searchRepository";
import { useGlobalSearch } from "./useGlobalSearch";

function createHits(): SearchHit[] {
  return [
    { type: "customer", id: "c1", title: "田中太郎", href: "/customers/c1" },
    { type: "case", id: "cs1", title: "田中 経営管理", href: "/cases/cs1" },
    { type: "lead", id: "l1", title: "Michael", href: "/leads/l1" },
    { type: "document", id: "d1", title: "パスポート", href: "/documents/d1" },
    { type: "task", id: "t1", title: "催促: 田中", href: "/tasks/t1" },
    {
      type: "conversation",
      id: "cv1",
      title: "李娜",
      href: "/conversations/cv1",
    },
  ];
}

function createRepo(
  response: { hits: SearchHit[] } = { hits: createHits() },
): SearchRepository {
  return {
    search: vi.fn(async (q: string) => ({
      query: q,
      hits: response.hits,
      truncated: false,
    })),
  };
}

function createRouter() {
  return { push: vi.fn(async () => {}) };
}

function advance(ms: number) {
  vi.advanceTimersByTime(ms);
}

describe("useGlobalSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with empty state and closed palette", () => {
    const model = useGlobalSearch({
      repo: createRepo(),
      router: createRouter(),
    });
    expect(model.query.value).toBe("");
    expect(model.hits.value).toEqual([]);
    expect(model.open.value).toBe(false);
    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBeNull();
    expect(model.highlightedIndex.value).toBe(0);
  });

  it("debounces search by 200ms", async () => {
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "田中";
    await nextTick();

    advance(100);
    await nextTick();
    expect(repo.search).not.toHaveBeenCalled();

    advance(100);
    await nextTick();
    await vi.runAllTimersAsync();
    expect(repo.search).toHaveBeenCalledWith("田中");
  });

  it("cancels previous request on new query", async () => {
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "田";
    await nextTick();
    advance(100);

    model.query.value = "田中";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    expect(repo.search).toHaveBeenCalledTimes(1);
    expect(repo.search).toHaveBeenCalledWith("田中");
  });

  it("returns empty hits for whitespace-only query", async () => {
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "   ";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    expect(repo.search).not.toHaveBeenCalled();
    expect(model.hits.value).toEqual([]);
  });

  it("groups hits by type in canonical order", async () => {
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "test";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    const groupTypes = model.groups.value.map((g) => g.type);
    expect(groupTypes).toEqual([
      "customer",
      "case",
      "lead",
      "document",
      "task",
      "conversation",
    ]);
  });

  it("sets loading=true during search and false after", async () => {
    let resolveSearch!: (v: unknown) => void;
    const repo: SearchRepository = {
      search: vi.fn(
        () =>
          new Promise((r) => {
            resolveSearch = r;
          }),
      ),
    };
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "test";
    await nextTick();
    advance(200);
    await nextTick();

    expect(model.loading.value).toBe(true);

    resolveSearch({ query: "test", hits: [], truncated: false });
    await vi.runAllTimersAsync();
    expect(model.loading.value).toBe(false);
  });

  it("sets error on search failure", async () => {
    const repo: SearchRepository = {
      search: vi.fn(async () => {
        throw new Error("network");
      }),
    };
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "fail";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    expect(model.error.value).toBe("検索に失敗しました。");
    expect(model.hits.value).toEqual([]);
  });

  it("moveHighlight cycles forward and backward", async () => {
    const repo = createRepo({ hits: createHits().slice(0, 3) });
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "x";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    expect(model.highlightedIndex.value).toBe(0);

    model.moveHighlight(1);
    expect(model.highlightedIndex.value).toBe(1);

    model.moveHighlight(1);
    expect(model.highlightedIndex.value).toBe(2);

    model.moveHighlight(1);
    expect(model.highlightedIndex.value).toBe(0);

    model.moveHighlight(-1);
    expect(model.highlightedIndex.value).toBe(2);
  });

  it("moveHighlight does nothing when no hits", () => {
    const model = useGlobalSearch({
      repo: createRepo({ hits: [] }),
      router: createRouter(),
    });
    model.moveHighlight(1);
    expect(model.highlightedIndex.value).toBe(0);
  });

  it("selectHit navigates to highlighted hit and closes", async () => {
    const router = createRouter();
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router });

    model.openPalette();
    model.query.value = "x";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    model.moveHighlight(1);
    model.selectHit();

    expect(router.push).toHaveBeenCalledWith("/cases/cs1");
    expect(model.open.value).toBe(false);
    expect(model.query.value).toBe("");
  });

  it("selectHit with explicit hit navigates to that hit", async () => {
    const router = createRouter();
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router });

    model.openPalette();
    model.query.value = "x";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    const hit = model.hits.value[2];
    model.selectHit(hit);
    expect(router.push).toHaveBeenCalledWith(hit.href);
    expect(model.open.value).toBe(false);
  });

  it("openPalette sets open=true and resets highlightedIndex", () => {
    const model = useGlobalSearch({
      repo: createRepo(),
      router: createRouter(),
    });
    model.openPalette();
    expect(model.open.value).toBe(true);
    expect(model.highlightedIndex.value).toBe(0);
  });

  it("closePalette resets all state", async () => {
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.openPalette();
    model.query.value = "test";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    model.closePalette();
    expect(model.open.value).toBe(false);
    expect(model.query.value).toBe("");
    expect(model.hits.value).toEqual([]);
    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBeNull();
  });

  it("cancels pending debounce timer when closePalette is called", async () => {
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.openPalette();
    model.query.value = "pending";
    await nextTick();
    advance(100);

    model.closePalette();
    advance(200);
    await vi.runAllTimersAsync();

    expect(repo.search).not.toHaveBeenCalled();
    expect(model.hits.value).toEqual([]);
    expect(model.loading.value).toBe(false);
  });

  it("discards stale response when new query was submitted", async () => {
    let callCount = 0;
    let resolveFirst!: (v: unknown) => void;
    const repo: SearchRepository = {
      search: vi.fn(async (q: string) => {
        callCount++;
        if (callCount === 1) {
          return new Promise((r) => {
            resolveFirst = r;
          });
        }
        return { query: q, hits: [createHits()[1]], truncated: false };
      }),
    };
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "first";
    await nextTick();
    advance(200);
    await nextTick();

    model.query.value = "second";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    resolveFirst({ query: "first", hits: [createHits()[0]], truncated: false });
    await vi.runAllTimersAsync();

    expect(model.hits.value.length).toBe(1);
    expect(model.hits.value[0].id).toBe("cs1");
  });

  it("resets highlightedIndex after new search results arrive", async () => {
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "x";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    model.moveHighlight(2);
    expect(model.highlightedIndex.value).toBe(2);

    model.query.value = "y";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    expect(model.highlightedIndex.value).toBe(0);
  });

  it("does not fire search when debounce timer is cancelled by new input", async () => {
    const repo = createRepo();
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "a";
    await nextTick();
    advance(150);

    model.query.value = "ab";
    await nextTick();
    advance(150);

    model.query.value = "abc";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    expect(repo.search).toHaveBeenCalledTimes(1);
    expect(repo.search).toHaveBeenCalledWith("abc");
  });

  it("ignores stale response from previous request", async () => {
    let callCount = 0;
    const repo: SearchRepository = {
      search: vi.fn(async (q: string) => {
        callCount++;
        if (callCount === 1) {
          await new Promise((r) => setTimeout(r, 500));
          return { query: q, hits: [createHits()[0]], truncated: false };
        }
        return {
          query: q,
          hits: [createHits()[1]],
          truncated: false,
        };
      }),
    };
    const model = useGlobalSearch({ repo, router: createRouter() });

    model.query.value = "first";
    await nextTick();
    advance(200);
    await nextTick();

    model.query.value = "second";
    await nextTick();
    advance(200);
    await vi.runAllTimersAsync();

    expect(model.hits.value.length).toBe(1);
    expect(model.hits.value[0].id).toBe("cs1");
  });
});
