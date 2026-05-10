// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-qa-001-01 — cases list/repository focused tests.
// Covers: loading lifecycle, query params → HTTP serialization,
//   repository-level pagination, error normalization hierarchy,
//   sort preservation through full stack.
// Does NOT duplicate: per-filter model tests (→ useCaseListModel.focused),
//   per-adapter mapping (→ CaseAdapterMappers.*),
//   per-builder serialization (→ CaseAdapterWriteBuilders.*),
//   orchestration matrix (→ CaseRepository.focused).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import type { LocationQuery } from "vue-router";
import { useCaseListModel } from "./useCaseListModel";
import { createCaseRepository, CaseRepositoryError } from "./CaseRepository";
import type { CaseListParams, CaseListResult } from "./CaseAdapterTypes";
import type { CaseRepository } from "./CaseRepository";
import type { CaseListItem } from "../types";
import { SAMPLE_CASE_LIST } from "../fixtures";

// ─── Helpers ────────────────────────────────────────────────────

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

function stubItem(overrides: Partial<CaseListItem> = {}): CaseListItem {
  return { ...SAMPLE_CASE_LIST[0], ...overrides };
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createMockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input, init),
  ) as unknown as typeof fetch;
}

const LIST_DTO_ROW = {
  id: "case-001",
  orgId: "org-1",
  customerId: "cust-001",
  caseTypeCode: "visa",
  stage: "S3",
  groupId: "group-1",
  ownerUserId: "user-1",
  dueAt: "2026-06-01",
  caseNo: "CASE-001",
  caseName: "テスト",
  priority: "normal",
  riskLevel: "low",
  billingUnpaidAmountCached: 0,
  updatedAt: "2026-04-10T00:00:00.000Z",
  customerName: "TestUser",
  groupName: "Group-A",
  ownerDisplayName: "Owner",
  assistantDisplayName: null,
};

function makeListResponse(total: number, count: number) {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      ...LIST_DTO_ROW,
      id: `case-${i + 1}`,
    })),
    total,
  };
}

// ─── 1. Loading State Lifecycle ─────────────────────────────────

describe("loading state lifecycle (p0-qa-001-01)", () => {
  it("loading is true immediately after construction", async () => {
    let resolveReq: () => void;
    const listCases = vi.fn(
      () =>
        new Promise<CaseListResult>((resolve) => {
          resolveReq = () =>
            resolve({ items: [], total: 0, page: 1, limit: 20 });
        }),
    );
    const repository = { listCases } as unknown as CaseRepository;

    const model = useCaseListModel({
      repository,
      routeQuery: ref<LocationQuery>({ scope: "all" }),
      replaceQuery: vi.fn(),
    });

    await nextTick();
    expect(model.loading.value).toBe(true);

    resolveReq!();
    await flushFetch();
    expect(model.loading.value).toBe(false);
  });

  it("loading becomes true on filter change and false after fetch completes", async () => {
    let resolveReq: ((r: CaseListResult) => void) | undefined;
    const listCases = vi.fn(
      () =>
        new Promise<CaseListResult>((resolve) => {
          resolveReq = resolve;
        }),
    );
    const repository = { listCases } as unknown as CaseRepository;

    const model = useCaseListModel({
      repository,
      routeQuery: ref<LocationQuery>({ scope: "all" }),
      replaceQuery: vi.fn(),
    });

    resolveReq!({ items: [stubItem()], total: 1, page: 1, limit: 20 });
    await flushFetch();
    expect(model.loading.value).toBe(false);

    model.setSearch("trigger");
    await nextTick();
    expect(model.loading.value).toBe(true);

    resolveReq!({ items: [], total: 0, page: 1, limit: 20 });
    await flushFetch();
    expect(model.loading.value).toBe(false);
  });

  it("loading becomes false even on error", async () => {
    const listCases = vi.fn(async () => {
      throw new Error("fail");
    });
    const repository = { listCases } as unknown as CaseRepository;

    const model = useCaseListModel({
      repository,
      routeQuery: ref<LocationQuery>({ scope: "all" }),
      replaceQuery: vi.fn(),
    });

    await flushFetch();
    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBe("fail");
  });

  it("concurrent filter changes: only last fetch determines loading state", async () => {
    const resolvers: ((r: CaseListResult) => void)[] = [];
    const listCases = vi.fn(
      () =>
        new Promise<CaseListResult>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const repository = { listCases } as unknown as CaseRepository;

    const model = useCaseListModel({
      repository,
      routeQuery: ref<LocationQuery>({ scope: "all" }),
      replaceQuery: vi.fn(),
    });

    resolvers[0]({ items: [], total: 0, page: 1, limit: 20 });
    await flushFetch();

    model.setSearch("a");
    await nextTick();
    model.setSearch("ab");
    await nextTick();

    for (const resolver of resolvers.slice(1)) {
      resolver({ items: [], total: 0, page: 1, limit: 20 });
    }
    await flushFetch();

    expect(model.loading.value).toBe(false);
  });
});

// ─── 2. Query Params → HTTP URL Serialization ──────────────────

describe("query params → HTTP URL (p0-qa-001-01)", () => {
  function captureUrl(params: CaseListParams): Promise<string> {
    return new Promise<string>((resolve) => {
      const request = createMockFetch((input) => {
        resolve(String(input));
        return jsonResponse({ items: [], total: 0 });
      });
      const repo = createCaseRepository({ request, getToken: () => "t" });
      repo.listCases(params);
    });
  }

  it("serializes page and limit", async () => {
    const url = await captureUrl({ page: 3, limit: 25 });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("page")).toBe("3");
    expect(sp.get("limit")).toBe("25");
  });

  it("maps scope → scope", async () => {
    const url = await captureUrl({ scope: "group" });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("scope")).toBe("group");
  });

  it("maps search → search", async () => {
    const url = await captureUrl({ search: "テスト" });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("search")).toBe("テスト");
  });

  it("maps owner → ownerUserId", async () => {
    const url = await captureUrl({ owner: "suzuki" });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("ownerUserId")).toBe("suzuki");
  });

  it("maps group → groupId", async () => {
    const url = await captureUrl({ group: "tokyo-1" });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("groupId")).toBe("tokyo-1");
  });

  it("maps risk → riskLevel with domain → DB literal mapping", async () => {
    const url = await captureUrl({ risk: "critical" });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("riskLevel")).toBe("high");
  });

  it("maps riskBucket → riskBucket verbatim", async () => {
    const url = await captureUrl({ riskBucket: "any" });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("riskBucket")).toBe("any");
  });

  it("maps customerId → customerId", async () => {
    const url = await captureUrl({ customerId: "cust-001" });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("customerId")).toBe("cust-001");
  });

  it("always appends view=summary", async () => {
    const url = await captureUrl({});
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("view")).toBe("summary");
  });

  it("omits undefined params", async () => {
    const url = await captureUrl({ scope: "all" });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.has("stage")).toBe(false);
    expect(sp.has("search")).toBe(false);
    expect(sp.has("ownerUserId")).toBe(false);
    expect(sp.has("groupId")).toBe(false);
    expect(sp.has("riskLevel")).toBe(false);
    expect(sp.has("customerId")).toBe(false);
  });

  it("combines all params simultaneously", async () => {
    const url = await captureUrl({
      scope: "mine",
      search: "visa",
      stage: "S3",
      owner: "tanaka",
      group: "osaka",
      risk: "attention",
      riskBucket: "any",
      customerId: "cust-X",
      page: 2,
      limit: 10,
    });
    const sp = new URL(url, "http://localhost").searchParams;
    expect(sp.get("scope")).toBe("mine");
    expect(sp.get("search")).toBe("visa");
    expect(sp.get("stage")).toBe("S3");
    expect(sp.get("ownerUserId")).toBe("tanaka");
    expect(sp.get("groupId")).toBe("osaka");
    expect(sp.get("riskLevel")).toBe("medium");
    expect(sp.get("riskBucket")).toBe("any");
    expect(sp.get("customerId")).toBe("cust-X");
    expect(sp.get("page")).toBe("2");
    expect(sp.get("limit")).toBe("10");
    expect(sp.get("view")).toBe("summary");
  });
});

// ─── 3. Repository Pagination ──────────────────────────────────

describe("repository pagination (p0-qa-001-01)", () => {
  it("returns adapted items and total from server response", async () => {
    const request = createMockFetch(() =>
      jsonResponse(makeListResponse(42, 3)),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.listCases({ page: 1, limit: 3 });

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(42);
    expect(result.items[0].id).toBe("case-1");
  });

  it("empty list response returns empty items and total=0", async () => {
    const request = createMockFetch(() =>
      jsonResponse({ items: [], total: 0 }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.listCases({});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("passes page and limit to HTTP query params", async () => {
    let capturedUrl = "";
    const request = createMockFetch((input) => {
      capturedUrl = String(input);
      return jsonResponse(makeListResponse(100, 15));
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await repo.listCases({ page: 5, limit: 15 });

    const sp = new URL(capturedUrl, "http://localhost").searchParams;
    expect(sp.get("page")).toBe("5");
    expect(sp.get("limit")).toBe("15");
  });
});

// ─── 4. Error Normalization Hierarchy ──────────────────────────

describe("error normalization hierarchy (p0-qa-001-01)", () => {
  it("network failure yields NETWORK error code", async () => {
    const request = createMockFetch(() => {
      throw new TypeError("fetch failed");
    });
    const repo = createCaseRepository({ request, getToken: () => "t" });

    await expect(repo.listCases({})).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "NETWORK",
      message: "Case request failed",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("401 yields UNAUTHORIZED error code", async () => {
    const request = createMockFetch(() =>
      jsonResponse({ message: "Unauthorized" }, { status: 401 }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });

    await expect(repo.listCases({})).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "UNAUTHORIZED",
      status: 401,
    } satisfies Partial<CaseRepositoryError>);
  });

  it("400 without error code yields VALIDATION_ERROR", async () => {
    const request = createMockFetch(() =>
      jsonResponse({ message: "Bad request" }, { status: 400 }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });

    await expect(repo.listCases({})).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    } satisfies Partial<CaseRepositoryError>);
  });

  it("400 with errorCode field yields CASE_WRITE_ERROR", async () => {
    const request = createMockFetch(() =>
      jsonResponse(
        { message: "Duplicate", errorCode: "DUPLICATE_CASE" },
        { status: 400 },
      ),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });

    await expect(
      repo.createCase({
        customerId: "c1",
        caseTypeCode: "visa",
        ownerUserId: "u1",
      }),
    ).rejects.toMatchObject({
      code: "CASE_WRITE_ERROR",
      serverErrorCode: "DUPLICATE_CASE",
    } satisfies Partial<CaseRepositoryError>);
  });

  it("empty body on 500 produces readable error message with status", async () => {
    const request = createMockFetch(() => new Response("", { status: 500 }));
    const repo = createCaseRepository({ request, getToken: () => "t" });

    await expect(repo.listCases({})).rejects.toMatchObject({
      code: "BAD_RESPONSE",
      status: 500,
    } satisfies Partial<CaseRepositoryError>);

    try {
      await repo.listCases({});
    } catch (e) {
      expect((e as CaseRepositoryError).message).toContain("500");
    }
  });

  it("CaseRepositoryError has correct name, code, status, and serverErrorCode", () => {
    const err = new CaseRepositoryError({
      code: "NETWORK",
      message: "test error",
      status: 503,
      serverErrorCode: "SRV_001",
    });
    expect(err.name).toBe("RepositoryError");
    expect(err.code).toBe("NETWORK");
    expect(err.status).toBe(503);
    expect(err.serverErrorCode).toBe("SRV_001");
    expect(err.message).toBe("test error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CaseRepositoryError);
  });

  it("list model normalizes CaseRepositoryError.message into error state", async () => {
    const listCases = vi.fn(async () => {
      throw new CaseRepositoryError({
        code: "BAD_RESPONSE",
        message: "Invalid case list response",
        status: 500,
      });
    });
    const repository = { listCases } as unknown as CaseRepository;

    const model = useCaseListModel({
      repository,
      routeQuery: ref<LocationQuery>({ scope: "all" }),
      replaceQuery: vi.fn(),
    });
    await flushFetch();

    expect(model.error.value).toBe("Invalid case list response");
    expect(model.filteredCases.value).toEqual([]);
    expect(model.total.value).toBe(0);
  });
});

// ─── 5. Sort Preservation Through Full Stack ───────────────────

describe("sort preservation through full stack (p0-qa-001-01)", () => {
  it("repository returns items in server response order", async () => {
    const serverOrder = ["z-case", "a-case", "m-case"];
    const request = createMockFetch(() =>
      jsonResponse({
        items: serverOrder.map((id) => ({
          ...LIST_DTO_ROW,
          id,
          caseName: id,
          caseNo: id,
        })),
        total: 3,
      }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.listCases({});

    expect(result.items.map((i) => i.id)).toEqual(serverOrder);
  });

  it("list model preserves server order in filteredCases", async () => {
    const serverOrder = ["z-case", "a-case", "m-case"];
    const items = serverOrder.map((id) => stubItem({ id, name: id }));
    const listCases = vi.fn(async () => ({
      items,
      total: items.length,
      page: 1,
      limit: 20,
    }));
    const repository = { listCases } as unknown as CaseRepository;

    const model = useCaseListModel({
      repository,
      routeQuery: ref<LocationQuery>({ scope: "all" }),
      replaceQuery: vi.fn(),
    });
    await flushFetch();

    expect(model.filteredCases.value.map((c) => c.id)).toEqual(serverOrder);
  });
});
