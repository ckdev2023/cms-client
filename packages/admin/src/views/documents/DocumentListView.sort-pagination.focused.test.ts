import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { useDocumentFilters } from "./model/useDocumentFilters";
import {
  useDocumentListModel,
  DEFAULT_PAGE_SIZE,
} from "./model/useDocumentListModel";
import type {
  DocumentRepository,
  PaginatedListResult,
} from "./model/DocumentRepository";
import type { DocumentListItem } from "./types";
import { STATUS_SORT_PRIORITY } from "./constants";

function makeItem(
  overrides: Partial<DocumentListItem> & { id: string },
): DocumentListItem {
  return {
    name: `Doc ${overrides.id}`,
    caseId: "c1",
    caseName: "Case 1",
    provider: "main_applicant",
    status: "pending",
    dueDate: null,
    dueDateLabel: "—",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 0,
    ...overrides,
  };
}

const API_ROWS: DocumentListItem[] = [
  makeItem({
    id: "doc-api-1",
    name: "パスポート写し",
    caseId: "case-1",
    caseName: "A2026-001",
    status: "uploaded_reviewing",
    dueDate: "2026-04-20",
    dueDateLabel: "2026-04-20",
    referenceCount: 1,
  }),
  makeItem({
    id: "doc-api-2",
    name: "在留カード写し",
    caseId: "case-1",
    caseName: "A2026-001",
    status: "pending",
    dueDate: "2026-04-25",
    dueDateLabel: "2026-04-25",
    referenceCount: 1,
  }),
  makeItem({
    id: "doc-api-3",
    name: "雇用契約書",
    caseId: "case-2",
    caseName: "A2026-002",
    provider: "employer_org",
    status: "approved",
    dueDate: "2026-04-15",
    dueDateLabel: "2026-04-15",
    referenceCount: 1,
  }),
];

function makeRepository(
  result?: DocumentListItem[] | (() => Promise<PaginatedListResult>),
): DocumentRepository {
  const items = result ?? API_ROWS;
  return {
    listDocuments: vi.fn(async () => {
      if (typeof items === "function") return items();
      return { items, total: items.length };
    }),
    transition: vi.fn(),
    followUp: vi.fn(),
    waive: vi.fn(),
    uploadLocalArchive: vi.fn(),
    listFiles: vi.fn(),
    getCompletionRate: vi.fn(),
    createItem: vi.fn(),
  } satisfies DocumentRepository;
}

// ─── Client-side search + sort ──────────────────────────────────

describe("DocumentListView wiring — client-side search + sort", () => {
  it("applySearchAndSort applies search on model items", async () => {
    const filters = useDocumentFilters();
    const repo = makeRepository();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    filters.search.value = "パスポート";
    const result = filters.applySearchAndSort(model.items.value);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("doc-api-1");
  });

  it("applySearchAndSort sorts by STATUS_SORT_PRIORITY then dueDate", async () => {
    const filters = useDocumentFilters();
    const repo = makeRepository();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    const result = filters.applySearchAndSort(model.items.value);
    for (let i = 0; i < result.length - 1; i++) {
      const pa = STATUS_SORT_PRIORITY[result[i].status] ?? 99;
      const pb = STATUS_SORT_PRIORITY[result[i + 1].status] ?? 99;
      expect(pa).toBeLessThanOrEqual(pb);
    }
  });
});

// ─── B4: Sort order locking ─────────────────────────────────────

const SORT_FIXTURE: DocumentListItem[] = [
  makeItem({ id: "s1", status: "approved", dueDate: "2026-04-10" }),
  makeItem({ id: "s2", status: "pending", dueDate: "2026-05-01" }),
  makeItem({ id: "s3", status: "rejected", dueDate: "2026-04-05" }),
  makeItem({ id: "s4", status: "pending", dueDate: "2026-04-15" }),
  makeItem({ id: "s5", status: "pending", dueDate: null }),
  makeItem({ id: "s6", status: "expired", dueDate: "2026-03-01" }),
  makeItem({ id: "s7", status: "waived", dueDate: null }),
  makeItem({ id: "s8", status: "uploaded_reviewing", dueDate: "2026-04-28" }),
  makeItem({ id: "s9", status: "uploaded_reviewing", dueDate: "2026-04-20" }),
];

describe("DocumentListView wiring — sort order locking (B4)", () => {
  it("primary sort: STATUS_SORT_PRIORITY ascending; secondary: dueDate ascending, null last", async () => {
    const repo = makeRepository(SORT_FIXTURE);
    const filters = useDocumentFilters();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    const sorted = filters.applySearchAndSort(model.items.value);
    expect(sorted.map((d) => d.id)).toEqual([
      "s3", // rejected(0)
      "s6", // expired(1)
      "s4", // pending(2) — 2026-04-15
      "s2", // pending(2) — 2026-05-01
      "s5", // pending(2) — null (last in group)
      "s9", // uploaded_reviewing(3) — 2026-04-20
      "s8", // uploaded_reviewing(3) — 2026-04-28
      "s1", // approved(4) — 2026-04-10
      "s7", // waived(5) — null
    ]);
  });

  it("within same status, dueDate ascending with null after non-null", async () => {
    const items: DocumentListItem[] = [
      makeItem({ id: "a", status: "pending", dueDate: null }),
      makeItem({ id: "b", status: "pending", dueDate: "2026-06-01" }),
      makeItem({ id: "c", status: "pending", dueDate: "2026-01-01" }),
      makeItem({ id: "d", status: "pending", dueDate: "2026-03-15" }),
    ];
    const repo = makeRepository(items);
    const filters = useDocumentFilters();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    const sorted = filters.applySearchAndSort(model.items.value);
    expect(sorted.map((d) => d.id)).toEqual(["c", "d", "b", "a"]);
  });

  it("equal status + equal dueDate preserves relative order", async () => {
    const items: DocumentListItem[] = [
      makeItem({ id: "x", status: "approved", dueDate: "2026-04-01" }),
      makeItem({ id: "y", status: "approved", dueDate: "2026-04-01" }),
    ];
    const repo = makeRepository(items);
    const filters = useDocumentFilters();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    const sorted = filters.applySearchAndSort(model.items.value);
    expect(sorted.map((d) => d.id)).toEqual(["x", "y"]);
  });

  it("sort is client-side only — no sort/orderBy param sent to API", async () => {
    const repo = makeRepository(SORT_FIXTURE);
    useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    const callArg = vi.mocked(repo.listDocuments).mock.calls[0][0];
    expect(callArg).not.toHaveProperty("sort");
    expect(callArg).not.toHaveProperty("orderBy");
    expect(callArg).not.toHaveProperty("sortBy");
  });

  it("pagination total from API is independent of client-side sorted count", async () => {
    const repo = makeRepository(() =>
      Promise.resolve({
        items: SORT_FIXTURE.slice(0, 3),
        total: 120,
      }),
    );
    const filters = useDocumentFilters();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    expect(model.total.value).toBe(120);
    const display = filters.applySearchAndSort(model.items.value);
    expect(display).toHaveLength(3);
  });
});

// ─── Pagination ─────────────────────────────────────────────────

describe("DocumentListView wiring — pagination total from API", () => {
  it("total reflects API total, not displayItems length", async () => {
    const repo = makeRepository();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    expect(model.total.value).toBe(API_ROWS.length);
  });
});

describe("DocumentListView wiring — pagination controls", () => {
  it("model exposes page/limit for DocumentPagination binding", async () => {
    const repo = makeRepository();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(model.page.value).toBe(1);
    expect(model.limit.value).toBe(DEFAULT_PAGE_SIZE);
    expect(model.total.value).toBe(API_ROWS.length);
  });

  it("filter change resets page to 1 via refresh(overrideParams)", async () => {
    const repo = makeRepository(() =>
      Promise.resolve({ items: API_ROWS, total: 100 }),
    );
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
      params: { page: 3 },
    });
    await flushPromises();
    expect(model.page.value).toBe(3);

    const filters = useDocumentFilters();
    filters.status.value = "missing";
    await model.refresh(filters.apiParams.value);
    expect(model.page.value).toBe(1);
  });

  it("nextPage/prevPage navigate and trigger refresh", async () => {
    const repo = makeRepository(() =>
      Promise.resolve({ items: API_ROWS, total: 100 }),
    );
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    vi.mocked(repo.listDocuments).mockClear();

    model.nextPage();
    await flushPromises();
    expect(model.page.value).toBe(2);
    expect(repo.listDocuments).toHaveBeenCalledTimes(1);
    expect(repo.listDocuments).toHaveBeenLastCalledWith({
      page: 2,
      limit: DEFAULT_PAGE_SIZE,
    });

    model.prevPage();
    await flushPromises();
    expect(model.page.value).toBe(1);
    expect(repo.listDocuments).toHaveBeenCalledTimes(2);
  });

  it("nextPage retains active filter params in API call", async () => {
    const repo = makeRepository(() =>
      Promise.resolve({ items: API_ROWS, total: 100 }),
    );
    const filters = useDocumentFilters();
    filters.status.value = "missing";
    filters.caseId.value = "case-1";

    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
      params: filters.apiParams.value,
    });
    await flushPromises();
    vi.mocked(repo.listDocuments).mockClear();

    model.nextPage();
    await flushPromises();
    expect(repo.listDocuments).toHaveBeenCalledWith({
      statusIn: ["pending", "waiting_upload", "revision_required"],
      caseId: "case-1",
      page: 2,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("prevPage does nothing on page 1", async () => {
    const repo = makeRepository(() =>
      Promise.resolve({ items: API_ROWS, total: 100 }),
    );
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(model.page.value).toBe(1);
    vi.mocked(repo.listDocuments).mockClear();

    model.prevPage();
    await flushPromises();
    expect(model.page.value).toBe(1);
    expect(repo.listDocuments).not.toHaveBeenCalled();
  });

  it("nextPage does nothing when total fits in one page", async () => {
    const repo = makeRepository(() =>
      Promise.resolve({ items: API_ROWS, total: API_ROWS.length }),
    );
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    vi.mocked(repo.listDocuments).mockClear();

    model.nextPage();
    await flushPromises();
    expect(model.page.value).toBe(1);
    expect(repo.listDocuments).not.toHaveBeenCalled();
  });
});
