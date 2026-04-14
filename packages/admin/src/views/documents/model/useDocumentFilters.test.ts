import { describe, it, expect } from "vitest";
import type { DocumentListItem } from "../types";
import { STATUS_SORT_PRIORITY } from "../constants";
import { useDocumentFilters } from "./useDocumentFilters";

let counter = 0;

function makeItem(overrides: Partial<DocumentListItem> = {}): DocumentListItem {
  counter++;
  return {
    id: `DOC-${counter}`,
    name: `テスト資料${counter}`,
    caseId: "CAS-001",
    caseName: "テスト案件",
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

const ITEMS: DocumentListItem[] = [
  makeItem({
    name: "パスポート写し",
    caseId: "CAS-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "main_applicant",
    status: "uploaded_reviewing",
    dueDate: "2026-04-20",
  }),
  makeItem({
    name: "在留カード写し",
    caseId: "CAS-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "main_applicant",
    status: "pending",
    dueDate: "2026-04-25",
  }),
  makeItem({
    name: "雇用契約書",
    caseId: "CAS-002",
    caseName: "A2026-002 技人国更新",
    provider: "employer_org",
    status: "approved",
    dueDate: "2026-04-15",
  }),
  makeItem({
    name: "納税証明書",
    caseId: "CAS-002",
    caseName: "A2026-002 技人国更新",
    provider: "main_applicant",
    status: "rejected",
    dueDate: "2026-04-18",
  }),
  makeItem({
    name: "課税証明書",
    caseId: "CAS-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "office_internal",
    status: "expired",
    dueDate: "2026-03-31",
  }),
  makeItem({
    name: "身元保証書",
    caseId: "CAS-003",
    caseName: "A2026-003 家族滞在新規",
    provider: "dependent_guarantor",
    status: "waived",
    dueDate: null,
  }),
];

function create() {
  return useDocumentFilters();
}

// ─── Initial state ──────────────────────────────────────────────

describe("useDocumentFilters — initial state", () => {
  it("initializes with default empty values", () => {
    const f = create();
    expect(f.status.value).toBe("");
    expect(f.caseId.value).toBe("");
    expect(f.provider.value).toBe("");
    expect(f.search.value).toBe("");
  });

  it("isFilterActive is false when all filters are default", () => {
    const f = create();
    expect(f.isFilterActive.value).toBe(false);
  });
});

// ─── isFilterActive ─────────────────────────────────────────────

describe("useDocumentFilters — isFilterActive", () => {
  it("becomes true when status is set", () => {
    const f = create();
    f.status.value = "pending";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("becomes true when caseId is set", () => {
    const f = create();
    f.caseId.value = "CAS-001";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("becomes true when provider is set", () => {
    const f = create();
    f.provider.value = "main_applicant";
    expect(f.isFilterActive.value).toBe(true);
  });

  it("becomes true when search is set", () => {
    const f = create();
    f.search.value = "パスポート";
    expect(f.isFilterActive.value).toBe(true);
  });
});

// ─── resetFilters ───────────────────────────────────────────────

describe("useDocumentFilters — resetFilters", () => {
  it("clears all filter values", () => {
    const f = create();
    f.status.value = "pending";
    f.caseId.value = "CAS-001";
    f.provider.value = "main_applicant";
    f.search.value = "test";
    f.resetFilters();
    expect(f.status.value).toBe("");
    expect(f.caseId.value).toBe("");
    expect(f.provider.value).toBe("");
    expect(f.search.value).toBe("");
    expect(f.isFilterActive.value).toBe(false);
  });
});

// ─── applyFilters — no filter ───────────────────────────────────

describe("useDocumentFilters — applyFilters (no filter)", () => {
  it("returns all items when no filter is active", () => {
    const f = create();
    expect(f.applyFilters(ITEMS)).toHaveLength(ITEMS.length);
  });

  it("returns results sorted by default priority", () => {
    const f = create();
    const result = f.applyFilters(ITEMS);
    for (let i = 0; i < result.length - 1; i++) {
      const pa = STATUS_SORT_PRIORITY[result[i].status] ?? 99;
      const pb = STATUS_SORT_PRIORITY[result[i + 1].status] ?? 99;
      expect(pa).toBeLessThanOrEqual(pb);
    }
  });

  it("returns empty array for empty input", () => {
    const f = create();
    expect(f.applyFilters([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const f = create();
    const copy = [...ITEMS];
    f.applyFilters(ITEMS);
    expect(ITEMS).toEqual(copy);
  });
});

// ─── applyFilters — status filter ───────────────────────────────

describe("useDocumentFilters — applyFilters (status)", () => {
  it("filters by exact status", () => {
    const f = create();
    f.status.value = "pending";
    const result = f.applyFilters(ITEMS);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.status).toBe("pending");
    }
  });

  it("filters by uploaded_reviewing status", () => {
    const f = create();
    f.status.value = "uploaded_reviewing";
    const result = f.applyFilters(ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("uploaded_reviewing");
  });

  it("filters by approved status", () => {
    const f = create();
    f.status.value = "approved";
    const result = f.applyFilters(ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("approved");
  });

  it("filters by waived status", () => {
    const f = create();
    f.status.value = "waived";
    const result = f.applyFilters(ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("waived");
  });

  it('"missing" matches pending and rejected', () => {
    const f = create();
    f.status.value = "missing";
    const result = f.applyFilters(ITEMS);
    const pendingCount = ITEMS.filter((d) => d.status === "pending").length;
    const rejectedCount = ITEMS.filter((d) => d.status === "rejected").length;
    expect(result).toHaveLength(pendingCount + rejectedCount);
    for (const item of result) {
      expect(["pending", "rejected"]).toContain(item.status);
    }
  });
});

// ─── applyFilters — caseId filter ───────────────────────────────

describe("useDocumentFilters — applyFilters (caseId)", () => {
  it("filters by caseId", () => {
    const f = create();
    f.caseId.value = "CAS-002";
    const result = f.applyFilters(ITEMS);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.caseId).toBe("CAS-002");
    }
  });

  it("returns empty for non-existent caseId", () => {
    const f = create();
    f.caseId.value = "CAS-999";
    expect(f.applyFilters(ITEMS)).toHaveLength(0);
  });
});

// ─── applyFilters — provider filter ─────────────────────────────

describe("useDocumentFilters — applyFilters (provider)", () => {
  it("filters by provider", () => {
    const f = create();
    f.provider.value = "employer_org";
    const result = f.applyFilters(ITEMS);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.provider).toBe("employer_org");
    }
  });

  it("filters by dependent_guarantor", () => {
    const f = create();
    f.provider.value = "dependent_guarantor";
    const result = f.applyFilters(ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe("dependent_guarantor");
  });
});

// ─── applyFilters — search filter ───────────────────────────────

describe("useDocumentFilters — applyFilters (search)", () => {
  it("matches by document name", () => {
    const f = create();
    f.search.value = "パスポート";
    const result = f.applyFilters(ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].name).toContain("パスポート");
  });

  it("matches by caseId", () => {
    const f = create();
    f.search.value = "CAS-003";
    const result = f.applyFilters(ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].caseId).toBe("CAS-003");
  });

  it("matches by caseName", () => {
    const f = create();
    f.search.value = "技人国";
    const result = f.applyFilters(ITEMS);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.caseName).toContain("技人国");
    }
  });

  it("search is case-insensitive for latin chars", () => {
    const f = create();
    f.search.value = "cas-002";
    const result = f.applyFilters(ITEMS);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.caseId).toBe("CAS-002");
    }
  });

  it("returns empty when nothing matches", () => {
    const f = create();
    f.search.value = "nonexistent-xyz";
    expect(f.applyFilters(ITEMS)).toHaveLength(0);
  });
});

// ─── applyFilters — combined filters ────────────────────────────

describe("useDocumentFilters — applyFilters (combined)", () => {
  it("intersects status + caseId", () => {
    const f = create();
    f.status.value = "pending";
    f.caseId.value = "CAS-001";
    const result = f.applyFilters(ITEMS);
    for (const item of result) {
      expect(item.status).toBe("pending");
      expect(item.caseId).toBe("CAS-001");
    }
  });

  it("intersects status + provider", () => {
    const f = create();
    f.status.value = "approved";
    f.provider.value = "employer_org";
    const result = f.applyFilters(ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("approved");
    expect(result[0].provider).toBe("employer_org");
  });

  it("returns empty when combined filters have no intersection", () => {
    const f = create();
    f.status.value = "waived";
    f.caseId.value = "CAS-001";
    expect(f.applyFilters(ITEMS)).toHaveLength(0);
  });

  it("search + status combined", () => {
    const f = create();
    f.search.value = "納税";
    f.status.value = "rejected";
    const result = f.applyFilters(ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].name).toContain("納税");
    expect(result[0].status).toBe("rejected");
  });

  it("all four filters active", () => {
    const f = create();
    f.status.value = "uploaded_reviewing";
    f.caseId.value = "CAS-001";
    f.provider.value = "main_applicant";
    f.search.value = "パスポート";
    const result = f.applyFilters(ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].name).toContain("パスポート");
  });
});

// ─── applyFilters — sorting ─────────────────────────────────────

describe("useDocumentFilters — applyFilters (sorting)", () => {
  it("sorts rejected before expired before pending", () => {
    const f = create();
    const result = f.applyFilters(ITEMS);
    const statuses = result.map((d) => d.status);
    const rejectedIdx = statuses.indexOf("rejected");
    const expiredIdx = statuses.indexOf("expired");
    const pendingIdx = statuses.indexOf("pending");
    if (rejectedIdx >= 0 && expiredIdx >= 0) {
      expect(rejectedIdx).toBeLessThan(expiredIdx);
    }
    if (expiredIdx >= 0 && pendingIdx >= 0) {
      expect(expiredIdx).toBeLessThan(pendingIdx);
    }
  });

  it("within same status, earlier dueDate comes first", () => {
    const items: DocumentListItem[] = [
      makeItem({ status: "pending", dueDate: "2026-05-01" }),
      makeItem({ status: "pending", dueDate: "2026-04-01" }),
    ];
    const f = create();
    const result = f.applyFilters(items);
    expect(result[0].dueDate).toBe("2026-04-01");
    expect(result[1].dueDate).toBe("2026-05-01");
  });

  it("null dueDate placed after non-null within same status", () => {
    const items: DocumentListItem[] = [
      makeItem({ status: "pending", dueDate: null }),
      makeItem({ status: "pending", dueDate: "2026-04-15" }),
    ];
    const f = create();
    const result = f.applyFilters(items);
    expect(result[0].dueDate).toBe("2026-04-15");
    expect(result[1].dueDate).toBeNull();
  });
});
