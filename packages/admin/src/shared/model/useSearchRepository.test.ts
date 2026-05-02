import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initSearchRepository,
  useSearchRepository,
  resetSearchRepository,
} from "./useSearchRepository";

beforeEach(() => {
  resetSearchRepository();
});

describe("initSearchRepository / useSearchRepository singleton", () => {
  it("throws when useSearchRepository called before init", () => {
    expect(() => useSearchRepository()).toThrow(
      "useSearchRepository() called before",
    );
  });

  it("returns singleton after init", () => {
    const stubFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ query: "a", hits: [], truncated: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const repo = initSearchRepository({
      request: stubFetch,
      getToken: () => "tok",
    });
    expect(repo).toBeDefined();
    expect(typeof repo.search).toBe("function");

    const same = useSearchRepository();
    expect(same).toBe(repo);
  });

  it("resetSearchRepository clears singleton", () => {
    initSearchRepository({
      request: vi.fn(),
      getToken: () => "tok",
    });
    resetSearchRepository();
    expect(() => useSearchRepository()).toThrow();
  });

  it("re-init replaces the singleton", () => {
    const first = initSearchRepository({
      request: vi.fn(),
      getToken: () => "a",
    });
    const second = initSearchRepository({
      request: vi.fn(),
      getToken: () => "b",
    });
    expect(first).not.toBe(second);
    expect(useSearchRepository()).toBe(second);
  });
});
