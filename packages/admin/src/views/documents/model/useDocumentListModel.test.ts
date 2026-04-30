import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import {
  useDocumentListModel,
  DEFAULT_PAGE_SIZE,
} from "./useDocumentListModel";
import {
  DocumentRepositoryError,
  type DocumentRepository,
  type PaginatedListResult,
} from "./DocumentRepository";
import type { DocumentListItem } from "../types";

const API_ROW: DocumentListItem = {
  id: "doc-api-1",
  name: "API 行（live data）",
  caseId: "case-api-1",
  caseName: "経管签新規",
  provider: "main_applicant",
  status: "uploaded_reviewing",
  dueDate: "2026-05-10",
  dueDateLabel: "2026-05-10",
  lastReminderAt: null,
  lastReminderAtLabel: "—",
  relativePath: null,
  sharedExpiryRisk: false,
  referenceCount: 1,
};

function makeRepository(
  result: DocumentListItem[] | (() => Promise<PaginatedListResult>),
): DocumentRepository {
  const stub = {
    listDocuments: vi.fn(async () => {
      if (typeof result === "function") return result();
      return { items: result, total: result.length };
    }),
    transition: vi.fn(),
    followUp: vi.fn(),
    waive: vi.fn(),
    uploadLocalArchive: vi.fn(),
    listFiles: vi.fn(),
    getCompletionRate: vi.fn(),
    createItem: vi.fn(),
  } satisfies DocumentRepository;
  return stub;
}

const PG1 = { page: 1, limit: DEFAULT_PAGE_SIZE };

describe("useDocumentListModel (BUG-079)", () => {
  it("loads items from repository on mount", async () => {
    const repository = makeRepository([API_ROW]);
    const m = useDocumentListModel({ repository });
    await flushPromises();
    expect(repository.listDocuments).toHaveBeenCalledTimes(1);
    expect(m.items.value).toEqual([API_ROW]);
    expect(m.total.value).toBe(1);
    expect(m.source.value).toBe("api");
    expect(m.errorCode.value).toBeNull();
  });

  it("falls back to fixtures when API returns empty", async () => {
    const repository = makeRepository([]);
    const m = useDocumentListModel({ repository });
    await flushPromises();
    expect(m.source.value).toBe("fallback");
    expect(m.items.value.length).toBeGreaterThan(0);
  });

  it("does not fall back when fallbackToFixturesWhenEmpty=false", async () => {
    const repository = makeRepository([]);
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(m.source.value).toBe("api");
    expect(m.items.value).toEqual([]);
    expect(m.total.value).toBe(0);
  });

  it("maps UNAUTHORIZED into errorCode and keeps fixtures visible", async () => {
    const repository = makeRepository(async () => {
      throw new DocumentRepositoryError({
        code: "UNAUTHORIZED",
        message: "denied",
        status: 401,
      });
    });
    const m = useDocumentListModel({ repository });
    await flushPromises();
    expect(m.errorCode.value).toBe("unauthorized");
    expect(m.items.value.length).toBeGreaterThan(0);
    expect(m.source.value).toBe("fallback");
  });

  it("refresh re-runs the request", async () => {
    const repository = makeRepository([API_ROW]);
    const m = useDocumentListModel({ repository });
    await flushPromises();
    await m.refresh();
    expect(repository.listDocuments).toHaveBeenCalledTimes(2);
  });

  it("passes params to repository.listDocuments", async () => {
    const repository = makeRepository([API_ROW]);
    const m = useDocumentListModel({
      repository,
      params: { caseId: "case-99", limit: 50 },
    });
    await flushPromises();
    expect(repository.listDocuments).toHaveBeenCalledWith({
      caseId: "case-99",
      page: 1,
      limit: 50,
    });
    expect(m.items.value).toEqual([API_ROW]);
  });

  it("refresh(overrideParams) replaces active params", async () => {
    const repository = makeRepository([API_ROW]);
    const m = useDocumentListModel({
      repository,
      params: { caseId: "case-1" },
    });
    await flushPromises();
    expect(repository.listDocuments).toHaveBeenLastCalledWith({
      caseId: "case-1",
      ...PG1,
    });

    await m.refresh({ statusIn: ["pending", "revision_required"] });
    expect(repository.listDocuments).toHaveBeenLastCalledWith({
      statusIn: ["pending", "revision_required"],
      ...PG1,
    });
    expect(repository.listDocuments).toHaveBeenCalledTimes(2);
  });

  it("refresh() without args re-uses last params", async () => {
    const repository = makeRepository([API_ROW]);
    const m = useDocumentListModel({
      repository,
      params: { caseId: "case-1" },
    });
    await flushPromises();

    await m.refresh({ ownerSide: "applicant" });
    await m.refresh();
    expect(repository.listDocuments).toHaveBeenLastCalledWith({
      ownerSide: "applicant",
      ...PG1,
    });
    expect(repository.listDocuments).toHaveBeenCalledTimes(3);
  });

  it("fallbackToFixturesWhenEmpty=false starts with empty items", () => {
    const repository = makeRepository([]);
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
    });
    expect(m.items.value).toEqual([]);
    expect(m.total.value).toBe(0);
  });

  it("fallbackToFixturesWhenEmpty=false keeps empty items on error", async () => {
    const repository = makeRepository(async () => {
      throw new DocumentRepositoryError({
        code: "BAD_RESPONSE",
        message: "bad",
        status: 500,
      });
    });
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(m.errorCode.value).toBe("badResponse");
    expect(m.items.value).toEqual([]);
    expect(m.source.value).toBe("fallback");
  });
});

describe("useDocumentListModel — pagination", () => {
  it("exposes page=1 and limit=DEFAULT_PAGE_SIZE by default", () => {
    const repository = makeRepository([]);
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
    });
    expect(m.page.value).toBe(1);
    expect(m.limit.value).toBe(DEFAULT_PAGE_SIZE);
  });

  it("honours initial page/limit from params", async () => {
    const repository = makeRepository([API_ROW]);
    const m = useDocumentListModel({
      repository,
      params: { page: 3, limit: 10 },
    });
    await flushPromises();
    expect(m.page.value).toBe(3);
    expect(m.limit.value).toBe(10);
    expect(repository.listDocuments).toHaveBeenCalledWith({
      page: 3,
      limit: 10,
    });
  });

  it("nextPage increments page and re-fetches", async () => {
    const repository = makeRepository(() =>
      Promise.resolve({ items: [API_ROW], total: 50 }),
    );
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(m.page.value).toBe(1);

    m.nextPage();
    await flushPromises();
    expect(m.page.value).toBe(2);
    expect(repository.listDocuments).toHaveBeenLastCalledWith({
      page: 2,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("nextPage does nothing when already on last page", async () => {
    const repository = makeRepository(() =>
      Promise.resolve({ items: [API_ROW], total: 5 }),
    );
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
      params: { limit: 10 },
    });
    await flushPromises();
    expect(m.page.value).toBe(1);

    m.nextPage();
    await flushPromises();
    expect(m.page.value).toBe(1);
    expect(repository.listDocuments).toHaveBeenCalledTimes(1);
  });

  it("prevPage decrements page and re-fetches", async () => {
    const repository = makeRepository(() =>
      Promise.resolve({ items: [API_ROW], total: 50 }),
    );
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
      params: { page: 3 },
    });
    await flushPromises();
    expect(m.page.value).toBe(3);

    m.prevPage();
    await flushPromises();
    expect(m.page.value).toBe(2);
    expect(repository.listDocuments).toHaveBeenLastCalledWith({
      page: 2,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("prevPage does nothing when on page 1", async () => {
    const repository = makeRepository(() =>
      Promise.resolve({ items: [API_ROW], total: 50 }),
    );
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    m.prevPage();
    await flushPromises();
    expect(m.page.value).toBe(1);
    expect(repository.listDocuments).toHaveBeenCalledTimes(1);
  });

  it("goToPage clamps to valid range", async () => {
    const repository = makeRepository(() =>
      Promise.resolve({ items: [API_ROW], total: 50 }),
    );
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
      params: { limit: 10 },
    });
    await flushPromises();

    m.goToPage(999);
    await flushPromises();
    expect(m.page.value).toBe(5);

    m.goToPage(0);
    await flushPromises();
    expect(m.page.value).toBe(1);
  });

  it("refresh(overrideParams) resets page to 1", async () => {
    const repository = makeRepository(() =>
      Promise.resolve({ items: [API_ROW], total: 50 }),
    );
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
      params: { page: 3 },
    });
    await flushPromises();
    expect(m.page.value).toBe(3);

    await m.refresh({ caseId: "case-new" });
    expect(m.page.value).toBe(1);
    expect(repository.listDocuments).toHaveBeenLastCalledWith({
      caseId: "case-new",
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("sends page and limit in every API call", async () => {
    const repository = makeRepository([API_ROW]);
    useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(repository.listDocuments).toHaveBeenCalledWith({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });
});
