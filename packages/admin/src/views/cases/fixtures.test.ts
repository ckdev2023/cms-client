import { describe, expect, it } from "vitest";
import { CASE_SAMPLE_KEYS } from "./constants";
import {
  deriveCaseSummaryCards,
  FAMILY_SCENARIO,
  filterByScope,
  findOwnerOption,
  SAMPLE_CASE_LIST,
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  SAMPLE_KEY_TO_CASE_ID,
  SAMPLE_SUMMARY_CARDS,
} from "./fixtures";
import { CASE_DETAIL_SAMPLES } from "./fixtures-detail";
import { createMockCaseRepository } from "./repository";
import type { CaseListItem } from "./types";

describe("cases/fixtures", () => {
  describe("SAMPLE_CASE_LIST (list)", () => {
    it("provides at least 7 sample cases", () => {
      expect(SAMPLE_CASE_LIST.length).toBeGreaterThanOrEqual(7);
    });

    it("each case has required fields", () => {
      for (const c of SAMPLE_CASE_LIST) {
        expect(c.id).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(c.type).toBeTruthy();
        expect(c.applicant).toBeTruthy();
        expect(c.stageId).toBeTruthy();
        expect(c.ownerId).toBeTruthy();
        expect(c.visibleScopes.length).toBeGreaterThan(0);
      }
    });

    it("covers multiple stage IDs", () => {
      const stages = new Set(SAMPLE_CASE_LIST.map((c) => c.stageId));
      expect(stages.size).toBeGreaterThanOrEqual(4);
    });

    it("covers all three risk statuses", () => {
      const risks = new Set(SAMPLE_CASE_LIST.map((c) => c.riskStatus));
      expect(risks).toContain("normal");
      expect(risks).toContain("attention");
      expect(risks).toContain("critical");
    });

    it("covers all three validation statuses", () => {
      const vals = new Set(SAMPLE_CASE_LIST.map((c) => c.validationStatus));
      expect(vals).toContain("passed");
      expect(vals).toContain("pending");
      expect(vals).toContain("failed");
    });

    it("has at least one item with customerId", () => {
      const withCustomer = SAMPLE_CASE_LIST.filter((c) => c.customerId);
      expect(withCustomer.length).toBeGreaterThan(0);
    });

    it("has at least one archived case (S9)", () => {
      const archived = SAMPLE_CASE_LIST.filter((c) => c.stageId === "S9");
      expect(archived.length).toBeGreaterThan(0);
    });

    it("has at least one family-batch case with batchLabel", () => {
      const batch = SAMPLE_CASE_LIST.filter((c) => c.batchLabel);
      expect(batch.length).toBeGreaterThan(0);
      for (const b of batch) {
        expect(b.casePartySummary).toBeTruthy();
      }
    });

    it("has sampleKey entries for all 6 required sample keys", () => {
      const keys = new Set(
        SAMPLE_CASE_LIST.filter((c) => c.sampleKey).map((c) => c.sampleKey),
      );
      for (const expected of CASE_SAMPLE_KEYS) {
        expect(keys).toContain(expected);
      }
    });
  });

  describe("SAMPLE_SUMMARY_CARDS", () => {
    it("provides 4 summary cards", () => {
      expect(SAMPLE_SUMMARY_CARDS).toHaveLength(4);
    });

    it("each card has key, variant, value, label", () => {
      for (const card of SAMPLE_SUMMARY_CARDS) {
        expect(card.key).toBeTruthy();
        expect(card.variant).toBeTruthy();
        expect(typeof card.value).toBe("number");
        expect(card.label).toBeTruthy();
      }
    });
  });

  describe("Create config", () => {
    it("SAMPLE_CREATE_CUSTOMERS has at least 3 entries", () => {
      expect(SAMPLE_CREATE_CUSTOMERS.length).toBeGreaterThanOrEqual(3);
      for (const cust of SAMPLE_CREATE_CUSTOMERS) {
        expect(cust.id).toBeTruthy();
        expect(cust.name).toBeTruthy();
        expect(cust.group).toBeTruthy();
      }
    });

    it("SAMPLE_CREATE_TEMPLATES has family and work templates", () => {
      expect(SAMPLE_CREATE_TEMPLATES).toHaveLength(2);
      const ids = SAMPLE_CREATE_TEMPLATES.map((t) => t.id);
      expect(ids).toContain("family");
      expect(ids).toContain("work");
    });

    it("each template has sections with items", () => {
      for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
        expect(tmpl.sections.length).toBeGreaterThan(0);
        for (const section of tmpl.sections) {
          expect(section.title).toBeTruthy();
          expect(section.items.length).toBeGreaterThan(0);
        }
      }
    });

    it("FAMILY_SCENARIO has draft parties and gate checks", () => {
      expect(FAMILY_SCENARIO.defaultDraftParties.length).toBeGreaterThan(0);
      expect(FAMILY_SCENARIO.gateChecks.length).toBeGreaterThan(0);
      expect(FAMILY_SCENARIO.reuseNotes.length).toBeGreaterThan(0);
    });
  });
});

// ─── findOwnerOption ────────────────────────────────────────────

describe("findOwnerOption", () => {
  it("returns the correct owner for known IDs", () => {
    const suzuki = findOwnerOption("suzuki");
    expect(suzuki).toBeDefined();
    expect(suzuki!.label).toBe("Suzuki");
    expect(suzuki!.initials).toBeTruthy();
  });

  it("returns undefined for unknown ID", () => {
    expect(findOwnerOption("nonexistent")).toBeUndefined();
  });
});

// ─── filterByScope ──────────────────────────────────────────────

describe("filterByScope", () => {
  it("scope=all returns all items", () => {
    const result = filterByScope(SAMPLE_CASE_LIST, "all");
    expect(result.length).toBe(SAMPLE_CASE_LIST.length);
  });

  it("scope=mine returns only items with 'mine' in visibleScopes", () => {
    const result = filterByScope(SAMPLE_CASE_LIST, "mine");
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(SAMPLE_CASE_LIST.length);
    for (const c of result) {
      expect(c.visibleScopes).toContain("mine");
    }
  });

  it("scope=group returns items with 'group' in visibleScopes", () => {
    const result = filterByScope(SAMPLE_CASE_LIST, "group");
    for (const c of result) {
      expect(c.visibleScopes).toContain("group");
    }
  });

  it("returns empty array when no items match", () => {
    const items: CaseListItem[] = [
      {
        ...SAMPLE_CASE_LIST[0],
        visibleScopes: ["all"],
      },
    ];
    expect(filterByScope(items, "mine")).toHaveLength(0);
  });
});

// ─── deriveCaseSummaryCards ─────────────────────────────────────

describe("deriveCaseSummaryCards", () => {
  it("returns 4 cards", () => {
    const cards = deriveCaseSummaryCards(SAMPLE_CASE_LIST);
    expect(cards).toHaveLength(4);
  });

  it("activeCases excludes archived (S9)", () => {
    const cards = deriveCaseSummaryCards(SAMPLE_CASE_LIST);
    const active = cards.find((c) => c.key === "activeCases")!;
    const archivedCount = SAMPLE_CASE_LIST.filter(
      (c) => c.stageId === "S9",
    ).length;
    expect(active.value).toBe(SAMPLE_CASE_LIST.length - archivedCount);
  });

  it("failedValidations counts validation=failed items", () => {
    const cards = deriveCaseSummaryCards(SAMPLE_CASE_LIST);
    const failed = cards.find((c) => c.key === "failedValidations")!;
    const expected = SAMPLE_CASE_LIST.filter(
      (c) => c.validationStatus === "failed",
    ).length;
    expect(failed.value).toBe(expected);
  });

  it("unpaidTotal sums unpaidAmount of non-archived items", () => {
    const cards = deriveCaseSummaryCards(SAMPLE_CASE_LIST);
    const unpaid = cards.find((c) => c.key === "unpaidTotal")!;
    const expected = SAMPLE_CASE_LIST.filter((c) => c.stageId !== "S9").reduce(
      (sum, c) => sum + c.unpaidAmount,
      0,
    );
    expect(unpaid.value).toBe(expected);
  });

  it("returns zeroes for empty list", () => {
    const cards = deriveCaseSummaryCards([]);
    expect(cards.find((c) => c.key === "activeCases")!.value).toBe(0);
    expect(cards.find((c) => c.key === "failedValidations")!.value).toBe(0);
    expect(cards.find((c) => c.key === "unpaidTotal")!.value).toBe(0);
  });
});

// ─── SAMPLE_KEY_TO_CASE_ID ──────────────────────────────────────

describe("SAMPLE_KEY_TO_CASE_ID", () => {
  it("covers all 6 sample keys", () => {
    for (const key of CASE_SAMPLE_KEYS) {
      expect(SAMPLE_KEY_TO_CASE_ID[key]).toBeTruthy();
    }
  });

  it("maps to IDs that exist in SAMPLE_CASE_LIST", () => {
    const ids = new Set(SAMPLE_CASE_LIST.map((c) => c.id));
    for (const caseId of Object.values(SAMPLE_KEY_TO_CASE_ID)) {
      expect(ids).toContain(caseId);
    }
  });
});

describe("cases/fixtures-detail (CASE_DETAIL_SAMPLES)", () => {
  const samples = Object.values(CASE_DETAIL_SAMPLES);

  it("provides 6 detail samples matching CASE_SAMPLE_KEYS", () => {
    expect(Object.keys(CASE_DETAIL_SAMPLES).sort()).toEqual(
      [...CASE_SAMPLE_KEYS].sort(),
    );
  });

  it("each detail has required scalar fields", () => {
    for (const d of samples) {
      expect(d.id).toBeTruthy();
      expect(d.title).toBeTruthy();
      expect(d.client).toBeTruthy();
      expect(d.owner).toBeTruthy();
      expect(typeof d.readonly).toBe("boolean");
      expect(typeof d.progressPercent).toBe("number");
    }
  });

  it("archived sample is readonly", () => {
    expect(CASE_DETAIL_SAMPLES.archived.readonly).toBe(true);
  });

  it("non-archived samples are not readonly", () => {
    for (const key of CASE_SAMPLE_KEYS) {
      if (key === "archived") continue;
      expect(CASE_DETAIL_SAMPLES[key].readonly).toBe(false);
    }
  });
});

describe("cases/repository (mock)", () => {
  const repo = createMockCaseRepository();

  describe("listCases", () => {
    it("returns items for scope=all", () => {
      const result = repo.listCases({
        scope: "all",
        search: "",
        stage: "",
        owner: "",
        group: "",
        risk: "",
        validation: "",
      });
      expect(result.length).toBeGreaterThan(0);
    });

    it("filters by customerId", () => {
      const custId = SAMPLE_CASE_LIST.find((c) => c.customerId)!.customerId!;
      const result = repo.listCases({
        scope: "all",
        search: "",
        stage: "",
        owner: "",
        group: "",
        risk: "",
        validation: "",
        customerId: custId,
      });
      expect(result.length).toBeGreaterThan(0);
      for (const c of result) {
        expect(c.customerId).toBe(custId);
      }
    });

    it("filters by search text", () => {
      const result = repo.listCases({
        scope: "all",
        search: "李娜",
        stage: "",
        owner: "",
        group: "",
        risk: "",
        validation: "",
      });
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].applicant).toBe("李娜");
    });

    it("filters by stage", () => {
      const result = repo.listCases({
        scope: "all",
        search: "",
        stage: "S9",
        owner: "",
        group: "",
        risk: "",
        validation: "",
      });
      for (const c of result) {
        expect(c.stageId).toBe("S9");
      }
    });

    it("filters by risk status", () => {
      const result = repo.listCases({
        scope: "all",
        search: "",
        stage: "",
        owner: "",
        group: "",
        risk: "critical",
        validation: "",
      });
      expect(result.length).toBeGreaterThan(0);
      for (const c of result) {
        expect(c.riskStatus).toBe("critical");
      }
    });
  });

  describe("getDetail", () => {
    it("returns detail for a list item with sampleKey", () => {
      const workCase = SAMPLE_CASE_LIST.find((c) => c.sampleKey === "work")!;
      const detail = repo.getDetail(workCase.id);
      expect(detail).toBeDefined();
      expect(detail!.id).toBe(workCase.id);
      expect(detail!.title).toBeTruthy();
    });

    it("returns detail for archived list item (readonly)", () => {
      const archived = SAMPLE_CASE_LIST.find(
        (c) => c.sampleKey === "archived",
      )!;
      const detail = repo.getDetail(archived.id);
      expect(detail).toBeDefined();
      expect(detail!.readonly).toBe(true);
    });

    it("all list items have a sampleKey that resolves to a detail", () => {
      for (const item of SAMPLE_CASE_LIST) {
        expect(item.sampleKey).toBeDefined();
        expect(repo.getDetail(item.id)).toBeDefined();
      }
    });

    it("returns undefined for unknown ID", () => {
      expect(repo.getDetail("NONEXISTENT")).toBeUndefined();
    });

    it("returns all 6 details via sampleKey-bearing list items", () => {
      for (const key of CASE_SAMPLE_KEYS) {
        const listItem = SAMPLE_CASE_LIST.find((c) => c.sampleKey === key);
        expect(listItem).toBeDefined();
        const detail = repo.getDetail(listItem!.id);
        expect(detail).toBeDefined();
      }
    });
  });

  describe("getSummaryCards", () => {
    it("returns 4 cards", () => {
      expect(repo.getSummaryCards()).toHaveLength(4);
    });

    it("derives cards from items when passed", () => {
      const items = repo.listCases({
        scope: "all",
        search: "",
        stage: "",
        owner: "",
        group: "",
        risk: "",
        validation: "",
      });
      const cards = repo.getSummaryCards(items);
      expect(cards).toHaveLength(4);
      expect(cards[0].key).toBe("activeCases");
    });
  });

  describe("getCreateCustomers", () => {
    it("returns at least 3 customers", () => {
      expect(repo.getCreateCustomers().length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getCreateTemplates", () => {
    it("returns family and work templates", () => {
      const templates = repo.getCreateTemplates();
      expect(templates).toHaveLength(2);
    });
  });

  describe("getFamilyScenario", () => {
    it("returns scenario with draft parties", () => {
      const scenario = repo.getFamilyScenario();
      expect(scenario.defaultDraftParties.length).toBeGreaterThan(0);
    });
  });
});
