// ── Test Ownership ──────────────────────────────────────────────
// Owner: fixture data invariants — shape, coverage, helper functions.
// Does NOT test: mock repository behaviour (→ repository.test.ts),
//   adapters, builders, or composable logic.
// ────────────────────────────────────────────────────────────────

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
import type { CaseListItem } from "./types";
import { resolveTemplateLabel } from "./types-create";
import type { I18nLabel } from "./types-create";

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

    it("each card has key, variant, value, label and i18nKey", () => {
      for (const card of SAMPLE_SUMMARY_CARDS) {
        expect(card.key).toBeTruthy();
        expect(card.variant).toBeTruthy();
        expect(typeof card.value).toBe("number");
        expect(card.label).toBeTruthy();
        expect(card.i18nKey).toBeTruthy();
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

    it("SAMPLE_CREATE_TEMPLATES contains base + BMV + ENG/INTRA + company_setup templates", () => {
      expect(SAMPLE_CREATE_TEMPLATES.length).toBeGreaterThanOrEqual(10);
      const ids = SAMPLE_CREATE_TEMPLATES.map((t) => t.id);
      expect(ids).toContain("family");
      expect(ids).toContain("work");
      expect(ids).toContain("bmv");
      expect(ids).toContain("biz_mgmt_cert_4m");
      expect(ids).toContain("biz_mgmt_cert_1y");
      expect(ids).toContain("biz_mgmt_renewal");
      expect(ids).toContain("company_setup");
      expect(ids).toContain("eng_humanities_intl_cert");
      expect(ids).toContain("eng_humanities_intl_renewal");
      expect(ids).toContain("intra_company_transfer");
    });

    it("each template has sections with I18nLabel titles and items", () => {
      for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
        expect(tmpl.sections.length).toBeGreaterThan(0);
        for (const section of tmpl.sections) {
          expect(typeof section.title).toBe("object");
          expect(section.title.zh).toBeTruthy();
          expect(section.title.en).toBeTruthy();
          expect(section.title.ja).toBeTruthy();
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

  // ─── Template item-count invariants (T-10a) ──────────────────

  function totalItems(tmplId: string): number {
    const tmpl = SAMPLE_CREATE_TEMPLATES.find((t) => t.id === tmplId);
    if (!tmpl) return 0;
    return tmpl.sections.reduce((sum, s) => sum + s.items.length, 0);
  }

  describe("template item-count lower bounds", () => {
    it("biz_mgmt_cert_4m has >= 18 items", () => {
      expect(totalItems("biz_mgmt_cert_4m")).toBeGreaterThanOrEqual(18);
    });

    it("biz_mgmt_cert_1y has >= 25 items", () => {
      expect(totalItems("biz_mgmt_cert_1y")).toBeGreaterThanOrEqual(25);
    });

    it("biz_mgmt_renewal has >= 12 items", () => {
      expect(totalItems("biz_mgmt_renewal")).toBeGreaterThanOrEqual(12);
    });

    it("family template has conditional-tagged items", () => {
      const family = SAMPLE_CREATE_TEMPLATES.find((t) => t.id === "family")!;
      const allItems = family.sections.flatMap((s) => s.items);
      const conditional = allItems.filter((i) => i.conditionalTag);
      expect(conditional.length).toBeGreaterThanOrEqual(2);
      const tags = conditional.map((i) => i.conditionalTag);
      expect(tags).toContain("仅配偶");
      expect(tags).toContain("仅子女");
    });

    it("eng_humanities_intl_cert has >= 23 items (19 required + 4 conditional)", () => {
      expect(totalItems("eng_humanities_intl_cert")).toBeGreaterThanOrEqual(23);
      const tmpl = SAMPLE_CREATE_TEMPLATES.find(
        (t) => t.id === "eng_humanities_intl_cert",
      )!;
      const allItems = tmpl.sections.flatMap((s) => s.items);
      const required = allItems.filter((i) => i.required);
      const conditional = allItems.filter((i) => !i.required);
      expect(required.length).toBe(19);
      expect(conditional.length).toBe(4);
    });

    it("eng_humanities_intl_renewal has exactly 13 items", () => {
      expect(totalItems("eng_humanities_intl_renewal")).toBe(13);
    });

    it("intra_company_transfer has >= 11 items with transfer-specific docs", () => {
      expect(totalItems("intra_company_transfer")).toBeGreaterThanOrEqual(11);
      const tmpl = SAMPLE_CREATE_TEMPLATES.find(
        (t) => t.id === "intra_company_transfer",
      )!;
      const allIds = tmpl.sections.flatMap((s) => s.items.map((i) => i.id));
      expect(allIds).toContain("ict_transfer_order");
      expect(allIds).toContain("ict_transfer_contract");
      expect(allIds).toContain("ict_shareholder_list");
    });

    it("company_setup has >= 14 items with 7 company-specific required docs", () => {
      expect(totalItems("company_setup")).toBeGreaterThanOrEqual(14);
      const tmpl = SAMPLE_CREATE_TEMPLATES.find(
        (t) => t.id === "company_setup",
      )!;
      const allIds = tmpl.sections.flatMap((s) => s.items.map((i) => i.id));
      expect(allIds).toContain("cs_capital_30m");
      expect(allIds).toContain("cs_capital_source");
      expect(allIds).toContain("cs_seal_cert");
      expect(allIds).toContain("cs_juminhyo");
      expect(allIds).toContain("cs_establishment_reports");
      expect(allIds).toContain("cs_officer_resolution");
      expect(allIds).toContain("cs_business_proof");
      const allItems = tmpl.sections.flatMap((s) => s.items);
      const required = allItems.filter((i) => i.required);
      expect(required.length).toBe(14);
    });

    it("intra_company_transfer has conditionalTag notes on key items", () => {
      const tmpl = SAMPLE_CREATE_TEMPLATES.find(
        (t) => t.id === "intra_company_transfer",
      )!;
      const allItems = tmpl.sections.flatMap((s) => s.items);
      const tagged = allItems.filter((i) => i.conditionalTag);
      expect(tagged.length).toBeGreaterThanOrEqual(2);
    });

    it("every template item has I18nLabel (label + section title)", () => {
      for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
        expect(typeof tmpl.label).toBe("object");
        expect(tmpl.label.zh).toBeTruthy();
        expect(tmpl.label.en).toBeTruthy();
        expect(tmpl.label.ja).toBeTruthy();
        for (const sec of tmpl.sections) {
          for (const item of sec.items) {
            expect(typeof item.label).toBe("object");
            expect(item.label.zh).toBeTruthy();
            expect(item.label.en).toBeTruthy();
            expect(item.label.ja).toBeTruthy();
          }
        }
      }
    });

    it("no duplicate item IDs within a single template", () => {
      for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
        const ids = tmpl.sections.flatMap((s) => s.items.map((i) => i.id));
        expect(new Set(ids).size).toBe(ids.length);
      }
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
      for (const task of d.tasks) {
        expect(task.id).toBeTruthy();
        expect(task.status).toBeTruthy();
      }
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

// ─── resolveTemplateLabel — three-language switching ─────────────

describe("resolveTemplateLabel", () => {
  const label: I18nLabel = {
    zh: "经营管理",
    en: "Business Manager",
    ja: "経営・管理",
  };

  it("returns zh for zh locale", () => {
    expect(resolveTemplateLabel(label, "zh")).toBe("经营管理");
  });

  it("returns en for en locale", () => {
    expect(resolveTemplateLabel(label, "en")).toBe("Business Manager");
  });

  it("returns ja for ja locale", () => {
    expect(resolveTemplateLabel(label, "ja")).toBe("経営・管理");
  });

  it("handles full locale codes (zh-CN, en-US, ja-JP)", () => {
    expect(resolveTemplateLabel(label, "zh-CN")).toBe("经营管理");
    expect(resolveTemplateLabel(label, "en-US")).toBe("Business Manager");
    expect(resolveTemplateLabel(label, "ja-JP")).toBe("経営・管理");
  });

  it("falls back to zh for unknown locale", () => {
    expect(resolveTemplateLabel(label, "ko")).toBe("经营管理");
    expect(resolveTemplateLabel(label, "fr-FR")).toBe("经营管理");
  });

  it("defaults to zh when no locale is provided", () => {
    expect(resolveTemplateLabel(label)).toBe("经营管理");
  });

  it("resolves all template labels in all three locales", () => {
    for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
      for (const loc of ["zh-CN", "en-US", "ja-JP"] as const) {
        const resolved = resolveTemplateLabel(tmpl.label, loc);
        expect(resolved).toBeTruthy();
        expect(typeof resolved).toBe("string");
      }
      for (const sec of tmpl.sections) {
        for (const loc of ["zh-CN", "en-US", "ja-JP"] as const) {
          expect(resolveTemplateLabel(sec.title, loc)).toBeTruthy();
        }
        for (const item of sec.items) {
          for (const loc of ["zh-CN", "en-US", "ja-JP"] as const) {
            expect(resolveTemplateLabel(item.label, loc)).toBeTruthy();
          }
        }
      }
    }
  });

  it("returns distinct values for different locales on template labels", () => {
    for (const tmpl of SAMPLE_CREATE_TEMPLATES) {
      const zh = resolveTemplateLabel(tmpl.label, "zh");
      const en = resolveTemplateLabel(tmpl.label, "en");
      expect(zh).not.toBe(en);
    }
  });
});
