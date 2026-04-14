import { describe, it, expect } from "vitest";
import {
  createMockCaseRepository,
  matchesCaseFilters,
  getStageInfo,
} from "./repository";
import type { CaseListItem } from "./types";
import type { CaseListQueryParams } from "./query";
import { DEFAULT_CASE_LIST_FILTERS } from "./constants";
import { SAMPLE_CASE_LIST } from "./fixtures";

function defaultParams(
  overrides: Partial<CaseListQueryParams> = {},
): CaseListQueryParams {
  return { ...DEFAULT_CASE_LIST_FILTERS, ...overrides };
}

function caseItem(
  partial: Partial<CaseListItem> & { id: string },
): CaseListItem {
  return {
    name: "",
    type: "",
    applicant: "",
    groupId: "tokyo-1",
    groupLabel: "东京一组",
    stageId: "S2",
    stageLabel: "资料收集中",
    ownerId: "suzuki",
    completionPercent: 0,
    completionLabel: "",
    validationStatus: "pending",
    validationLabel: "",
    blockerCount: 0,
    unpaidAmount: 0,
    updatedAtLabel: "",
    dueDate: "",
    dueDateLabel: "",
    riskStatus: "normal",
    riskLabel: "",
    visibleScopes: ["mine", "group", "all"],
    ...partial,
  };
}

// ─── matchesCaseFilters ─────────────────────────────────────────

describe("matchesCaseFilters", () => {
  it("passes all with default filters", () => {
    expect(matchesCaseFilters(caseItem({ id: "1" }), defaultParams())).toBe(
      true,
    );
  });

  it("filters by search text on name", () => {
    const match = caseItem({ id: "1", name: "李娜 家族滞在" });
    const noMatch = caseItem({ id: "2", name: "王浩 技人国" });
    expect(matchesCaseFilters(match, defaultParams({ search: "李娜" }))).toBe(
      true,
    );
    expect(matchesCaseFilters(noMatch, defaultParams({ search: "李娜" }))).toBe(
      false,
    );
  });

  it("filters by search text on case ID", () => {
    const match = caseItem({ id: "CAS-2026-0181" });
    expect(
      matchesCaseFilters(match, defaultParams({ search: "CAS-2026-0181" })),
    ).toBe(true);
  });

  it("filters by stage", () => {
    expect(
      matchesCaseFilters(
        caseItem({ id: "1", stageId: "S4" }),
        defaultParams({ stage: "S4" }),
      ),
    ).toBe(true);
    expect(
      matchesCaseFilters(
        caseItem({ id: "2", stageId: "S2" }),
        defaultParams({ stage: "S4" }),
      ),
    ).toBe(false);
  });

  it("filters by owner", () => {
    expect(
      matchesCaseFilters(
        caseItem({ id: "1", ownerId: "tanaka" }),
        defaultParams({ owner: "tanaka" }),
      ),
    ).toBe(true);
    expect(
      matchesCaseFilters(
        caseItem({ id: "2", ownerId: "suzuki" }),
        defaultParams({ owner: "tanaka" }),
      ),
    ).toBe(false);
  });

  it("filters by group", () => {
    expect(
      matchesCaseFilters(
        caseItem({ id: "1", groupId: "osaka" }),
        defaultParams({ group: "osaka" }),
      ),
    ).toBe(true);
    expect(
      matchesCaseFilters(
        caseItem({ id: "2", groupId: "tokyo-1" }),
        defaultParams({ group: "osaka" }),
      ),
    ).toBe(false);
  });

  it("filters by risk status", () => {
    expect(
      matchesCaseFilters(
        caseItem({ id: "1", riskStatus: "critical" }),
        defaultParams({ risk: "critical" }),
      ),
    ).toBe(true);
    expect(
      matchesCaseFilters(
        caseItem({ id: "2", riskStatus: "normal" }),
        defaultParams({ risk: "critical" }),
      ),
    ).toBe(false);
  });

  it("filters by validation status", () => {
    expect(
      matchesCaseFilters(
        caseItem({ id: "1", validationStatus: "failed" }),
        defaultParams({ validation: "failed" }),
      ),
    ).toBe(true);
    expect(
      matchesCaseFilters(
        caseItem({ id: "2", validationStatus: "passed" }),
        defaultParams({ validation: "failed" }),
      ),
    ).toBe(false);
  });

  it("filters by customerId", () => {
    const params = defaultParams({ customerId: "cust-002" });
    expect(
      matchesCaseFilters(caseItem({ id: "1", customerId: "cust-002" }), params),
    ).toBe(true);
    expect(
      matchesCaseFilters(caseItem({ id: "2", customerId: "cust-001" }), params),
    ).toBe(false);
    expect(matchesCaseFilters(caseItem({ id: "3" }), params)).toBe(false);
  });

  it("passes when customerId is undefined", () => {
    expect(matchesCaseFilters(caseItem({ id: "1" }), defaultParams())).toBe(
      true,
    );
  });
});

// ─── createMockCaseRepository ───────────────────────────────────

describe("createMockCaseRepository", () => {
  const repo = createMockCaseRepository();

  it("listCases with scope=all returns all items", () => {
    const all = repo.listCases(defaultParams({ scope: "all" }));
    expect(all.length).toBe(SAMPLE_CASE_LIST.length);
  });

  it("listCases with scope=mine returns subset", () => {
    const mine = repo.listCases(defaultParams({ scope: "mine" }));
    expect(mine.length).toBeLessThan(SAMPLE_CASE_LIST.length);
    expect(mine.length).toBeGreaterThan(0);
  });

  it("listCases filters by search text", () => {
    const result = repo.listCases(
      defaultParams({ scope: "all", search: "李娜" }),
    );
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].applicant).toBe("李娜");
  });

  it("listCases filters by stage", () => {
    const result = repo.listCases(defaultParams({ scope: "all", stage: "S9" }));
    for (const c of result) {
      expect(c.stageId).toBe("S9");
    }
  });

  it("listCases filters by risk status", () => {
    const result = repo.listCases(
      defaultParams({ scope: "all", risk: "critical" }),
    );
    for (const c of result) {
      expect(c.riskStatus).toBe("critical");
    }
  });

  it("listCases filters by customerId", () => {
    const filtered = repo.listCases(
      defaultParams({ scope: "all", customerId: "cust-002" }),
    );
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((c) => c.customerId === "cust-002")).toBe(true);
  });

  it("getCaseById returns the correct case", () => {
    const found = repo.getCaseById("CAS-2026-0181");
    expect(found).toBeDefined();
    expect(found!.id).toBe("CAS-2026-0181");
  });

  it("getCaseById returns undefined for unknown id", () => {
    expect(repo.getCaseById("UNKNOWN")).toBeUndefined();
  });

  it("getCaseBySampleKey returns mapped case", () => {
    const found = repo.getCaseBySampleKey("work");
    expect(found).toBeDefined();
    expect(found!.sampleKey).toBe("work");
  });

  it("getSummaryCards without params returns static cards", () => {
    const cards = repo.getSummaryCards();
    expect(cards).toHaveLength(4);
  });

  it("getSummaryCards with items derives dynamically", () => {
    const items = repo.listCases(defaultParams({ scope: "all" }));
    const cards = repo.getSummaryCards(items);
    expect(cards).toHaveLength(4);
  });

  it("getOwnerOptions returns non-empty array", () => {
    expect(repo.getOwnerOptions().length).toBeGreaterThan(0);
  });

  it("getGroupOptions returns non-empty array", () => {
    expect(repo.getGroupOptions().length).toBeGreaterThan(0);
  });

  it("getOwnerById returns correct owner", () => {
    const owner = repo.getOwnerById("suzuki");
    expect(owner).toBeDefined();
    expect(owner!.label).toBe("Suzuki");
  });

  it("getTemplates returns family and work", () => {
    const tpls = repo.getTemplates();
    expect(tpls.length).toBeGreaterThanOrEqual(2);
    expect(tpls.map((t) => t.id)).toContain("family");
    expect(tpls.map((t) => t.id)).toContain("work");
  });

  it("getCreateCustomers returns customer options", () => {
    expect(repo.getCreateCustomers().length).toBeGreaterThanOrEqual(2);
  });

  it("getCreateTemplates returns templates", () => {
    expect(repo.getCreateTemplates().length).toBe(2);
  });

  it("getFamilyScenario returns scenario with draft parties", () => {
    const scenario = repo.getFamilyScenario();
    expect(scenario.defaultDraftParties.length).toBeGreaterThan(0);
  });

  it("getViewer returns the mock viewer", () => {
    const viewer = repo.getViewer();
    expect(viewer.ownerId).toBeTruthy();
    expect(viewer.groupId).toBeTruthy();
  });
});

// ─── getStageInfo ───────────────────────────────────────────────

describe("getStageInfo", () => {
  it("returns stage for valid id", () => {
    const info = getStageInfo("S1");
    expect(info).toBeDefined();
    expect(info!.label).toBeTruthy();
  });

  it("returns undefined for unknown id", () => {
    expect(getStageInfo("INVALID")).toBeUndefined();
  });
});
