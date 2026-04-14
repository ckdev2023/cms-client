import { describe, it, expect } from "vitest";
import type { DocumentGroup, DocumentItem } from "../types-detail";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import {
  computeAllProviderStats,
  computeCaseDocumentCompletionRate,
  computeItemsCompletionRate,
  computeProviderStat,
  isDocumentCollected,
  isDocumentListEmpty,
  isDocumentWaived,
} from "./caseDocumentStats";

// ─── Helpers ────────────────────────────────────────────────────

function makeItem(status: string, name = "doc"): DocumentItem {
  return { name, meta: "", status, statusLabel: "" };
}

function makeGroup(
  group: string,
  items: DocumentItem[],
  count = "",
): DocumentGroup {
  return { group, count, items };
}

// ─── isDocumentCollected / isDocumentWaived ─────────────────────

describe("isDocumentCollected", () => {
  it('returns true for status "approved"', () => {
    expect(isDocumentCollected(makeItem("approved"))).toBe(true);
  });

  it("returns false for other statuses", () => {
    for (const s of [
      "waiting_upload",
      "uploaded_reviewing",
      "waived",
      "expired",
      "revision_required",
      "not_sent",
    ]) {
      expect(isDocumentCollected(makeItem(s))).toBe(false);
    }
  });
});

describe("isDocumentWaived", () => {
  it('returns true for status "waived"', () => {
    expect(isDocumentWaived(makeItem("waived"))).toBe(true);
  });

  it("returns false for other statuses", () => {
    for (const s of [
      "approved",
      "waiting_upload",
      "uploaded_reviewing",
      "expired",
    ]) {
      expect(isDocumentWaived(makeItem(s))).toBe(false);
    }
  });
});

// ─── computeItemsCompletionRate ─────────────────────────────────

describe("computeItemsCompletionRate", () => {
  it("returns 0/0 for empty array", () => {
    const rate = computeItemsCompletionRate([]);
    expect(rate).toEqual({
      collected: 0,
      total: 0,
      percent: 0,
      label: "无必需资料",
    });
  });

  it("excludes waived items from total (denominator)", () => {
    const items = [
      makeItem("approved"),
      makeItem("waived"),
      makeItem("waiting_upload"),
    ];
    const rate = computeItemsCompletionRate(items);
    expect(rate.total).toBe(2);
    expect(rate.collected).toBe(1);
    expect(rate.percent).toBe(50);
    expect(rate.label).toBe("1 / 2 完成");
  });

  it("returns 100% when all non-waived items are approved", () => {
    const items = [
      makeItem("approved"),
      makeItem("approved"),
      makeItem("waived"),
    ];
    const rate = computeItemsCompletionRate(items);
    expect(rate.total).toBe(2);
    expect(rate.collected).toBe(2);
    expect(rate.percent).toBe(100);
  });

  it("returns 0% when no items are approved", () => {
    const items = [makeItem("waiting_upload"), makeItem("uploaded_reviewing")];
    const rate = computeItemsCompletionRate(items);
    expect(rate.percent).toBe(0);
    expect(rate.collected).toBe(0);
  });

  it('returns "无必需资料" when all items are waived', () => {
    const items = [makeItem("waived"), makeItem("waived")];
    const rate = computeItemsCompletionRate(items);
    expect(rate.total).toBe(0);
    expect(rate.label).toBe("无必需资料");
  });

  it("rounds percentage correctly", () => {
    const items = [
      makeItem("approved"),
      makeItem("waiting_upload"),
      makeItem("waiting_upload"),
    ];
    const rate = computeItemsCompletionRate(items);
    expect(rate.percent).toBe(33);
  });
});

// ─── computeProviderStat ────────────────────────────────────────

describe("computeProviderStat", () => {
  it("computes stats for a single provider group", () => {
    const group = makeGroup("主申请人提供", [
      makeItem("approved"),
      makeItem("approved"),
      makeItem("waiting_upload"),
      makeItem("waived"),
    ]);
    const stat = computeProviderStat(group);
    expect(stat.group).toBe("主申请人提供");
    expect(stat.collected).toBe(2);
    expect(stat.total).toBe(3);
    expect(stat.percent).toBe(67);
  });

  it("handles empty group", () => {
    const group = makeGroup("空分组", []);
    const stat = computeProviderStat(group);
    expect(stat.total).toBe(0);
    expect(stat.label).toBe("无必需资料");
  });
});

// ─── computeAllProviderStats ────────────────────────────────────

describe("computeAllProviderStats", () => {
  it("returns stats for each group", () => {
    const groups: DocumentGroup[] = [
      makeGroup("主申请人提供", [makeItem("approved"), makeItem("approved")]),
      makeGroup("事務所内部準備", [
        makeItem("approved"),
        makeItem("waiting_upload"),
      ]),
    ];
    const stats = computeAllProviderStats(groups);
    expect(stats).toHaveLength(2);
    expect(stats[0].group).toBe("主申请人提供");
    expect(stats[0].percent).toBe(100);
    expect(stats[1].group).toBe("事務所内部準備");
    expect(stats[1].percent).toBe(50);
  });

  it("returns empty array for no groups", () => {
    expect(computeAllProviderStats([])).toEqual([]);
  });
});

// ─── computeCaseDocumentCompletionRate ───────────────────────────

describe("computeCaseDocumentCompletionRate", () => {
  it("merges all groups and excludes waived from denominator", () => {
    const groups: DocumentGroup[] = [
      makeGroup("A", [
        makeItem("approved"),
        makeItem("waived"),
        makeItem("waiting_upload"),
      ]),
      makeGroup("B", [
        makeItem("approved"),
        makeItem("approved"),
        makeItem("expired"),
      ]),
    ];
    const rate = computeCaseDocumentCompletionRate(groups);
    expect(rate.total).toBe(5);
    expect(rate.collected).toBe(3);
    expect(rate.percent).toBe(60);
  });

  it("returns 0/0 for empty groups", () => {
    const rate = computeCaseDocumentCompletionRate([]);
    expect(rate.total).toBe(0);
    expect(rate.label).toBe("无必需资料");
  });

  it("returns 0/0 when all items across groups are waived", () => {
    const groups: DocumentGroup[] = [
      makeGroup("A", [makeItem("waived")]),
      makeGroup("B", [makeItem("waived")]),
    ];
    const rate = computeCaseDocumentCompletionRate(groups);
    expect(rate.total).toBe(0);
  });
});

// ─── isDocumentListEmpty ────────────────────────────────────────

describe("isDocumentListEmpty", () => {
  it("returns true for empty array", () => {
    expect(isDocumentListEmpty([])).toBe(true);
  });

  it("returns true when all groups have no items", () => {
    expect(isDocumentListEmpty([makeGroup("A", []), makeGroup("B", [])])).toBe(
      true,
    );
  });

  it("returns false when at least one group has items", () => {
    expect(
      isDocumentListEmpty([
        makeGroup("A", []),
        makeGroup("B", [makeItem("waiting_upload")]),
      ]),
    ).toBe(false);
  });
});

// ─── Integration with fixture data ─────────────────────────────

describe("integration with CASE_DETAIL_SAMPLES", () => {
  it("work sample: waived items excluded from denominator", () => {
    const docs = CASE_DETAIL_SAMPLES.work.documents;
    const rate = computeCaseDocumentCompletionRate(docs);

    const allItems = docs.flatMap((g) => g.items);
    const waivedCount = allItems.filter((i) => i.status === "waived").length;
    const approvedCount = allItems.filter(
      (i) => i.status === "approved",
    ).length;

    expect(waivedCount).toBeGreaterThan(0);
    expect(rate.total).toBe(allItems.length - waivedCount);
    expect(rate.collected).toBe(approvedCount);
  });

  it("work sample: per-provider stats sum to overall", () => {
    const docs = CASE_DETAIL_SAMPLES.work.documents;
    const providerStats = computeAllProviderStats(docs);
    const overallRate = computeCaseDocumentCompletionRate(docs);

    const totalFromProviders = providerStats.reduce(
      (sum, s) => sum + s.total,
      0,
    );
    const collectedFromProviders = providerStats.reduce(
      (sum, s) => sum + s.collected,
      0,
    );

    expect(totalFromProviders).toBe(overallRate.total);
    expect(collectedFromProviders).toBe(overallRate.collected);
  });

  it("archived sample: all non-waived items are approved → 100%", () => {
    const docs = CASE_DETAIL_SAMPLES.archived.documents;
    const rate = computeCaseDocumentCompletionRate(docs);
    expect(rate.percent).toBe(100);
    expect(rate.collected).toBe(rate.total);
  });

  it("family sample: is not empty", () => {
    const docs = CASE_DETAIL_SAMPLES.family.documents;
    expect(isDocumentListEmpty(docs)).toBe(false);
  });

  it("each sample has correct provider grouping count", () => {
    for (const [, detail] of Object.entries(CASE_DETAIL_SAMPLES)) {
      const stats = computeAllProviderStats(detail.documents);
      expect(stats.length).toBe(detail.documents.length);
      for (let i = 0; i < stats.length; i++) {
        expect(stats[i].group).toBe(detail.documents[i].group);
      }
    }
  });

  it("no sample has negative completion rate", () => {
    for (const detail of Object.values(CASE_DETAIL_SAMPLES)) {
      const rate = computeCaseDocumentCompletionRate(detail.documents);
      expect(rate.percent).toBeGreaterThanOrEqual(0);
      expect(rate.percent).toBeLessThanOrEqual(100);
      expect(rate.collected).toBeGreaterThanOrEqual(0);
      expect(rate.total).toBeGreaterThanOrEqual(0);
    }
  });
});
