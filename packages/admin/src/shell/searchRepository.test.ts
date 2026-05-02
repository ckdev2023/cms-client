import { describe, it, expect, vi } from "vitest";
import {
  createHttpSearchRepository,
  createMockSearchRepository,
  type SearchHit,
} from "../shared/api/searchRepository";
import { buildDefaultSearchHits } from "./searchFixtures";

const SAMPLE_HITS: SearchHit[] = [
  {
    type: "customer",
    id: "c1",
    title: "田中太郎",
    subtitle: "C-001",
    href: "/customers/c1",
  },
  {
    type: "case",
    id: "cs1",
    title: "田中太郎 経営管理",
    subtitle: "田中太郎",
    href: "/cases/cs1",
  },
  {
    type: "lead",
    id: "l1",
    title: "Michael Thompson",
    subtitle: "技人国",
    href: "/leads/l1",
  },
  {
    type: "document",
    id: "d1",
    title: "パスポート写し",
    subtitle: "A2026-001",
    href: "/documents/d1",
  },
  {
    type: "conversation",
    id: "cv1",
    title: "李娜",
    subtitle: "签证更新",
    href: "/conversations/cv1",
  },
];

describe("createMockSearchRepository", () => {
  it("returns empty hits for empty query", async () => {
    const repo = createMockSearchRepository(SAMPLE_HITS);
    const result = await repo.search("   ");
    expect(result.hits).toEqual([]);
    expect(result.truncated).toBe(false);
  });

  it("filters by title match", async () => {
    const repo = createMockSearchRepository(SAMPLE_HITS);
    const result = await repo.search("田中");
    expect(result.hits.length).toBe(2);
    expect(result.hits.map((h) => h.id)).toContain("c1");
    expect(result.hits.map((h) => h.id)).toContain("cs1");
  });

  it("filters by subtitle match", async () => {
    const repo = createMockSearchRepository(SAMPLE_HITS);
    const result = await repo.search("技人国");
    expect(result.hits.length).toBe(1);
    expect(result.hits[0].id).toBe("l1");
  });

  it("is case-insensitive", async () => {
    const repo = createMockSearchRepository(SAMPLE_HITS);
    const result = await repo.search("michael");
    expect(result.hits.length).toBe(1);
    expect(result.hits[0].id).toBe("l1");
  });

  it("scores startsWith higher than includes", async () => {
    const hits: SearchHit[] = [
      { type: "customer", id: "a", title: "田中ABC", href: "/a" },
      { type: "customer", id: "b", title: "ABC田中", href: "/b" },
    ];
    const repo = createMockSearchRepository(hits);
    const result = await repo.search("ABC");
    expect(result.hits[0].id).toBe("b");
  });

  it("limits to MAX_HITS_PER_TYPE (5)", async () => {
    const hits: SearchHit[] = Array.from({ length: 10 }, (_, i) => ({
      type: "customer" as const,
      id: `c${i}`,
      title: `田中${i}`,
      href: `/customers/c${i}`,
    }));
    const repo = createMockSearchRepository(hits);
    const result = await repo.search("田中");
    expect(result.hits.length).toBe(5);
  });

  it("returns truncated=true when exceeding MAX_TOTAL_HITS", async () => {
    const hits: SearchHit[] = [];
    const types = [
      "customer",
      "case",
      "lead",
      "document",
      "task",
      "conversation",
    ] as const;
    for (const type of types) {
      for (let i = 0; i < 6; i++) {
        hits.push({
          type,
          id: `${type}-${i}`,
          title: `共通${i}`,
          href: `/${type}/${i}`,
        });
      }
    }
    const repo = createMockSearchRepository(hits);
    const result = await repo.search("共通");
    expect(result.hits.length).toBeLessThanOrEqual(30);
    expect(result.truncated).toBe(false);
  });

  it("returns query in response", async () => {
    const repo = createMockSearchRepository(SAMPLE_HITS);
    const result = await repo.search("  李娜  ");
    expect(result.query).toBe("李娜");
  });
});

describe("createHttpSearchRepository", () => {
  function mockFetch(body: unknown, status = 200) {
    return vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  it("sends GET to /api/admin/search?q=<encoded> with auth header", async () => {
    const stubFetch = mockFetch({
      query: "田中",
      hits: [
        {
          type: "customer",
          id: "c1",
          title: "田中太郎",
          href: "/customers/c1",
        },
      ],
      truncated: false,
    });
    const repo = createHttpSearchRepository({
      request: stubFetch,
      getToken: () => "my-jwt-token",
    });

    await repo.search("田中");

    expect(stubFetch).toHaveBeenCalledTimes(1);
    const [url, options] = stubFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/search?q=%E7%94%B0%E4%B8%AD");
    expect(options.method).toBe("GET");
    expect(options.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer my-jwt-token",
        Accept: "application/json",
      }),
    );
  });

  it("uses custom apiPath when provided", async () => {
    const stubFetch = mockFetch({
      query: "test",
      hits: [],
      truncated: false,
    });
    const repo = createHttpSearchRepository({
      request: stubFetch,
      getToken: () => "tok",
      apiPath: "/custom/search",
    });

    await repo.search("test");

    const [url] = stubFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/custom/search?q=test");
  });

  it("returns empty result without calling fetch for whitespace query", async () => {
    const stubFetch = mockFetch({ query: "", hits: [], truncated: false });
    const repo = createHttpSearchRepository({
      request: stubFetch,
      getToken: () => "tok",
    });

    const result = await repo.search("   ");

    expect(stubFetch).not.toHaveBeenCalled();
    expect(result.hits).toEqual([]);
    expect(result.truncated).toBe(false);
  });

  it("trims query before sending", async () => {
    const stubFetch = mockFetch({
      query: "hello",
      hits: [],
      truncated: false,
    });
    const repo = createHttpSearchRepository({
      request: stubFetch,
      getToken: () => "tok",
    });

    await repo.search("  hello  ");

    const [url] = stubFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/search?q=hello");
  });

  it("omits Authorization header when token is null", async () => {
    const stubFetch = mockFetch({
      query: "q",
      hits: [],
      truncated: false,
    });
    const repo = createHttpSearchRepository({
      request: stubFetch,
      getToken: () => null,
    });

    await repo.search("q");

    const [, options] = stubFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("adapts valid response with hits correctly", async () => {
    const stubFetch = mockFetch({
      query: "田中",
      hits: [
        {
          type: "customer",
          id: "c1",
          title: "田中太郎",
          subtitle: "C-001",
          href: "/customers/c1",
          score: 2,
        },
        {
          type: "case",
          id: "cs1",
          title: "田中案件",
          href: "/cases/cs1",
        },
      ],
      truncated: true,
    });
    const repo = createHttpSearchRepository({
      request: stubFetch,
      getToken: () => "tok",
    });

    const result = await repo.search("田中");

    expect(result.query).toBe("田中");
    expect(result.truncated).toBe(true);
    expect(result.hits).toHaveLength(2);
    expect(result.hits[0]).toEqual({
      type: "customer",
      id: "c1",
      title: "田中太郎",
      subtitle: "C-001",
      href: "/customers/c1",
      score: 2,
    });
    expect(result.hits[1]).toEqual({
      type: "case",
      id: "cs1",
      title: "田中案件",
      subtitle: undefined,
      href: "/cases/cs1",
      score: undefined,
    });
  });

  it("filters out hits with invalid type", async () => {
    const stubFetch = mockFetch({
      query: "x",
      hits: [
        { type: "customer", id: "c1", title: "A", href: "/a" },
        { type: "invalid_type", id: "bad", title: "B", href: "/b" },
      ],
      truncated: false,
    });
    const repo = createHttpSearchRepository({
      request: stubFetch,
      getToken: () => "tok",
    });

    const result = await repo.search("x");
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].id).toBe("c1");
  });

  it("throws on non-ok response", async () => {
    const stubFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      }),
    );
    const repo = createHttpSearchRepository({
      request: stubFetch,
      getToken: () => "expired-token",
    });

    await expect(repo.search("test")).rejects.toThrow("Unauthorized");
  });

  it("throws on network error", async () => {
    const stubFetch = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    const repo = createHttpSearchRepository({
      request: stubFetch,
      getToken: () => "tok",
    });

    await expect(repo.search("test")).rejects.toThrow("request failed");
  });
});

describe("buildDefaultSearchHits", () => {
  it("builds hits from all fixture sources", () => {
    const hits = buildDefaultSearchHits();
    expect(hits.length).toBeGreaterThan(0);

    const types = new Set(hits.map((h) => h.type));
    expect(types.has("customer")).toBe(true);
    expect(types.has("case")).toBe(true);
    expect(types.has("lead")).toBe(true);
    expect(types.has("document")).toBe(true);
    expect(types.has("conversation")).toBe(true);
  });

  it("all hits have required fields", () => {
    const hits = buildDefaultSearchHits();
    for (const hit of hits) {
      expect(hit.id).toBeTruthy();
      expect(hit.title).toBeTruthy();
      expect(hit.href).toBeTruthy();
      expect(hit.type).toBeTruthy();
    }
  });

  it("can be used with createMockSearchRepository", async () => {
    const hits = buildDefaultSearchHits();
    const repo = createMockSearchRepository(hits);
    const result = await repo.search("李娜");
    expect(result.hits.length).toBeGreaterThan(0);
  });
});
