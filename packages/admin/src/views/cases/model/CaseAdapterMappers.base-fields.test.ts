// ── Test Ownership ──────────────────────────────────────────────
// Owner: list DTO → CaseListItem base field mapping contract
//   (p0-fe-002b-04: id/name/type/customer/group/owner/stage).
// Does NOT test: derived status fields (→ CaseAdapterMappers.test 002b-05),
//   detail aggregate, mutation results, write builders, repository
//   orchestration, or customer downstream reuse (→ CaseListSummaryDownstream.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseListResult } from "./CaseAdapterMappers";
import {
  CASE_LIST_BASE_FIELD_MAP,
  CASE_LIST_BASE_TARGET_KEYS,
} from "./CaseAdapterTypes";

// ─── Helpers ────────────────────────────────────────────────────

function flatRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "case-001",
    customerId: "cust-001",
    caseTypeCode: "visa",
    stage: "S3",
    groupId: "group-1",
    ownerUserId: "user-1",
    caseName: "技人国更新",
    caseNo: "CASE-001",
    riskLevel: "low",
    billingUnpaidAmountCached: 50000,
    updatedAt: "2026-04-10T00:00:00.000Z",
    dueAt: "2026-06-01",
    customerName: "張伟",
    groupName: "Tokyo-1",
    ownerDisplayName: "担当太郎",
    assistantDisplayName: null,
    ...overrides,
  };
}

function wrappedRow(
  caseOverrides: Record<string, unknown> = {},
  wrapperOverrides: Record<string, unknown> = {},
) {
  const caseRecord = {
    id: "case-001",
    customerId: "cust-001",
    caseTypeCode: "visa",
    stage: "S3",
    groupId: "group-1",
    ownerUserId: "user-1",
    caseName: "技人国更新",
    caseNo: "CASE-001",
    riskLevel: "low",
    billingUnpaidAmountCached: 50000,
    updatedAt: "2026-04-10T00:00:00.000Z",
    dueAt: "2026-06-01",
    ...caseOverrides,
  };
  return {
    case: caseRecord,
    customerName: "張伟",
    groupName: "Tokyo-1",
    latestValidation: null,
    ...wrapperOverrides,
  };
}

function adaptFirst(payload: unknown) {
  const result = adaptCaseListResult(payload);
  expect(result).not.toBeNull();
  return result!.items[0];
}

// ─── Contract constants ─────────────────────────────────────────

describe("base field contract constants (p0-fe-002b-04)", () => {
  it("CASE_LIST_BASE_FIELD_MAP covers all 10 DTO→UI mappings", () => {
    expect(Object.keys(CASE_LIST_BASE_FIELD_MAP).sort()).toEqual(
      [
        "caseName",
        "caseNo",
        "caseTypeCode",
        "customerId",
        "customerName",
        "groupId",
        "groupName",
        "id",
        "ownerUserId",
        "stage",
      ].sort(),
    );
  });

  it("CASE_LIST_BASE_TARGET_KEYS enumerates all 10 UI properties", () => {
    expect([...CASE_LIST_BASE_TARGET_KEYS].sort()).toEqual([
      "applicant",
      "customerId",
      "groupId",
      "groupLabel",
      "id",
      "name",
      "ownerId",
      "stageId",
      "stageLabel",
      "type",
    ]);
  });
});

// ─── Full snapshot tests ────────────────────────────────────────

describe("base fields — flat DTO snapshot", () => {
  it("maps all base fields from a flat DTO", () => {
    const item = adaptFirst({
      items: [
        flatRow({
          id: "snap-001",
          caseName: "技人国更新",
          caseNo: "CASE-SNAP",
          caseTypeCode: "business_manager",
          customerId: "cust-snap",
          customerName: "田中花子",
          groupId: "grp-snap",
          groupName: "Tokyo-A",
          ownerUserId: "owner-snap",
          stage: "S4",
        }),
      ],
      total: 1,
    });

    expect(item.id).toBe("snap-001");
    expect(item.name).toBe("技人国更新");
    expect(item.type).toBe("business_manager");
    expect(item.applicant).toBe("田中花子");
    expect(item.customerId).toBe("cust-snap");
    expect(item.groupId).toBe("grp-snap");
    expect(item.groupLabel).toBe("Tokyo-A");
    expect(item.ownerId).toBe("owner-snap");
    expect(item.stageId).toBe("S4");
    expect(item.stageLabel).toBe("S4");
  });
});

describe("base fields — wrapped (summary) DTO snapshot", () => {
  it("maps all base fields from a wrapped DTO", () => {
    const item = adaptFirst({
      items: [
        wrappedRow(
          {
            id: "snap-002",
            caseName: "経営管理",
            caseNo: "CASE-W",
            caseTypeCode: "business_manager",
            customerId: "cust-wrap",
            groupId: "grp-wrap",
            ownerUserId: "owner-wrap",
            stage: "S6",
          },
          {
            customerName: "佐藤太郎",
            groupName: "Osaka-B",
          },
        ),
      ],
      total: 1,
    });

    expect(item.id).toBe("snap-002");
    expect(item.name).toBe("経営管理");
    expect(item.type).toBe("business_manager");
    expect(item.applicant).toBe("佐藤太郎");
    expect(item.customerId).toBe("cust-wrap");
    expect(item.groupId).toBe("grp-wrap");
    expect(item.groupLabel).toBe("Osaka-B");
    expect(item.ownerId).toBe("owner-wrap");
    expect(item.stageId).toBe("S6");
    expect(item.stageLabel).toBe("S6");
  });
});

// ─── Per-field edge cases ───────────────────────────────────────

describe("base fields — per-field mapping and fallbacks", () => {
  it("name: caseName → caseNo → id fallback chain", () => {
    expect(
      adaptFirst({ items: [flatRow({ caseName: "A", caseNo: "B" })], total: 1 })
        .name,
    ).toBe("A");

    expect(
      adaptFirst({ items: [flatRow({ caseName: "", caseNo: "B" })], total: 1 })
        .name,
    ).toBe("B");

    expect(
      adaptFirst({
        items: [flatRow({ id: "fallback-id", caseName: "", caseNo: "" })],
        total: 1,
      }).name,
    ).toBe("fallback-id");
  });

  it("type: maps from caseTypeCode; defaults to empty string", () => {
    expect(
      adaptFirst({ items: [flatRow({ caseTypeCode: "dependent" })], total: 1 })
        .type,
    ).toBe("dependent");

    expect(
      adaptFirst({
        items: [flatRow({ caseTypeCode: undefined })],
        total: 1,
      }).type,
    ).toBe("");
  });

  it("applicant: prefers customerName; falls back to customerId", () => {
    expect(
      adaptFirst({
        items: [flatRow({ customerName: "田中太郎", customerId: "cust-1" })],
        total: 1,
      }).applicant,
    ).toBe("田中太郎");

    expect(
      adaptFirst({
        items: [flatRow({ customerName: undefined, customerId: "cust-1" })],
        total: 1,
      }).applicant,
    ).toBe("cust-1");
  });

  it("applicant: wrapped DTO reads customerName from wrapper level", () => {
    expect(
      adaptFirst({
        items: [
          wrappedRow({ customerId: "cust-1" }, { customerName: "山田太郎" }),
        ],
        total: 1,
      }).applicant,
    ).toBe("山田太郎");

    expect(
      adaptFirst({
        items: [wrappedRow({ customerId: "cust-1" }, { customerName: "" })],
        total: 1,
      }).applicant,
    ).toBe("cust-1");
  });

  it("customerId: maps directly; undefined when empty string", () => {
    expect(
      adaptFirst({
        items: [flatRow({ customerId: "cust-42" })],
        total: 1,
      }).customerId,
    ).toBe("cust-42");

    expect(
      adaptFirst({
        items: [flatRow({ customerId: "" })],
        total: 1,
      }).customerId,
    ).toBeUndefined();
  });

  it("groupId: maps from caseRecord.groupId; defaults to empty string", () => {
    expect(
      adaptFirst({ items: [flatRow({ groupId: "grp-42" })], total: 1 }).groupId,
    ).toBe("grp-42");

    expect(
      adaptFirst({ items: [flatRow({ groupId: null })], total: 1 }).groupId,
    ).toBe("");

    expect(
      adaptFirst({ items: [flatRow({ groupId: undefined })], total: 1 })
        .groupId,
    ).toBe("");
  });

  it("groupLabel: reads groupName from wrapper; empty string when absent", () => {
    expect(
      adaptFirst({
        items: [wrappedRow({}, { groupName: "Branch-X" })],
        total: 1,
      }).groupLabel,
    ).toBe("Branch-X");

    expect(
      adaptFirst({
        items: [wrappedRow({}, { groupName: null })],
        total: 1,
      }).groupLabel,
    ).toBe("");

    expect(
      adaptFirst({
        items: [flatRow({ groupName: "Flat-Group" })],
        total: 1,
      }).groupLabel,
    ).toBe("Flat-Group");
  });

  it("ownerId: maps from ownerUserId; defaults to empty string", () => {
    expect(
      adaptFirst({ items: [flatRow({ ownerUserId: "user-42" })], total: 1 })
        .ownerId,
    ).toBe("user-42");

    expect(
      adaptFirst({ items: [flatRow({ ownerUserId: undefined })], total: 1 })
        .ownerId,
    ).toBe("");
  });

  it("stageId: resolves valid S1–S9; unknown falls back to S1", () => {
    for (const stage of [
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
    ]) {
      expect(
        adaptFirst({ items: [flatRow({ stage })], total: 1 }).stageId,
      ).toBe(stage);
    }

    expect(
      adaptFirst({ items: [flatRow({ stage: "UNKNOWN" })], total: 1 }).stageId,
    ).toBe("S1");

    expect(
      adaptFirst({ items: [flatRow({ stage: "" })], total: 1 }).stageId,
    ).toBe("S1");
  });

  it("stageLabel mirrors stageId for all valid stages", () => {
    for (const stage of ["S1", "S5", "S9"]) {
      const item = adaptFirst({ items: [flatRow({ stage })], total: 1 });
      expect(item.stageLabel).toBe(item.stageId);
    }
  });
});

// ─── Structural invariants ──────────────────────────────────────

describe("base fields — structural invariants", () => {
  it("all CASE_LIST_BASE_TARGET_KEYS exist on every adapted item", () => {
    const result = adaptCaseListResult({
      items: [flatRow(), wrappedRow()],
      total: 2,
    });
    expect(result).not.toBeNull();
    for (const item of result!.items) {
      for (const key of CASE_LIST_BASE_TARGET_KEYS) {
        expect(item).toHaveProperty(key);
      }
    }
  });

  it("id is always a non-empty string", () => {
    const item = adaptFirst({ items: [flatRow()], total: 1 });
    expect(typeof item.id).toBe("string");
    expect(item.id.length).toBeGreaterThan(0);
  });

  it("item without id is filtered out", () => {
    const result = adaptCaseListResult({
      items: [flatRow({ id: undefined }), flatRow({ id: "valid" })],
      total: 2,
    });
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].id).toBe("valid");
  });
});
