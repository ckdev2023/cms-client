import { describe, expect, it } from "vitest";
import { adaptCaseListResult } from "./CaseAdapterMappers";
import {
  CASE_LIST_DERIVED_FIELD_MAP,
  CASE_LIST_DERIVED_TARGET_KEYS,
} from "./CaseAdapterTypes";

const BASE_CASE = {
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
};

function flatRow(overrides: Record<string, unknown> = {}) {
  return {
    ...BASE_CASE,
    customerName: "張伟",
    groupName: "Tokyo-1",
    ...overrides,
  };
}

function wrappedRow(
  caseOverrides: Record<string, unknown> = {},
  wrapperOverrides: Record<string, unknown> = {},
) {
  return {
    case: { ...BASE_CASE, ...caseOverrides },
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

describe("derived status contract constants (p0-fe-002b-05)", () => {
  it("CASE_LIST_DERIVED_FIELD_MAP covers all 5 DTO source fields", () => {
    expect(Object.keys(CASE_LIST_DERIVED_FIELD_MAP).sort()).toEqual([
      "billingUnpaidAmountCached",
      "dueAt",
      "latestValidation",
      "riskLevel",
      "updatedAt",
    ]);
  });

  it("CASE_LIST_DERIVED_FIELD_MAP target arrays are non-empty", () => {
    for (const [, targets] of Object.entries(CASE_LIST_DERIVED_FIELD_MAP)) {
      expect(targets.length).toBeGreaterThan(0);
    }
  });

  it("CASE_LIST_DERIVED_TARGET_KEYS enumerates all 9 UI properties", () => {
    expect([...CASE_LIST_DERIVED_TARGET_KEYS].sort()).toEqual([
      "blockerCount",
      "dueDate",
      "dueDateLabel",
      "riskLabel",
      "riskStatus",
      "unpaidAmount",
      "updatedAtLabel",
      "validationLabel",
      "validationStatus",
    ]);
  });

  it("DERIVED_FIELD_MAP targets and DERIVED_TARGET_KEYS are bidirectionally consistent", () => {
    const mapTargets = new Set(
      Object.values(CASE_LIST_DERIVED_FIELD_MAP).flat(),
    );
    const keySet = new Set<string>(CASE_LIST_DERIVED_TARGET_KEYS);
    expect(mapTargets).toEqual(keySet);
  });
});

describe("derived status — flat DTO snapshot", () => {
  it("maps all derived status fields from a flat DTO", () => {
    const item = adaptFirst({
      items: [
        flatRow({
          riskLevel: "medium",
          billingUnpaidAmountCached: 120000,
          updatedAt: "2026-04-15T09:30:00.000Z",
          dueAt: "2026-07-01",
          latestValidation: {
            status: "passed",
            executedAt: "2026-04-01",
            blockingCount: 0,
            warningCount: 1,
          },
        }),
      ],
      total: 1,
    });
    expect(item.validationStatus).toBe("passed");
    expect(item.validationLabel).toEqual({
      status: "passed",
      blockingCount: 0,
    });
    expect(item.blockerCount).toBe(0);
    expect(item.riskStatus).toBe("attention");
    expect(item.riskLabel).toBe("medium");
    expect(item.dueDate).toBe("2026-07-01");
    expect(item.dueDateLabel).toBeTruthy();
    expect(item.unpaidAmount).toBe(120000);
    expect(item.updatedAtLabel).toBeTruthy();
  });
});

describe("derived status — wrapped (summary) DTO snapshot", () => {
  it("maps all derived status fields from a wrapped DTO", () => {
    const item = adaptFirst({
      items: [
        wrappedRow(
          {
            riskLevel: "high",
            billingUnpaidAmountCached: 80000,
            updatedAt: "2026-04-12T14:00:00.000Z",
            dueAt: "2026-05-15",
          },
          {
            latestValidation: {
              status: "failed",
              executedAt: "2026-04-10",
              blockingCount: 3,
              warningCount: 1,
            },
          },
        ),
      ],
      total: 1,
    });
    expect(item.validationStatus).toBe("failed");
    expect(item.validationLabel).toEqual({
      status: "failed",
      blockingCount: 3,
    });
    expect(item.blockerCount).toBe(3);
    expect(item.riskStatus).toBe("critical");
    expect(item.riskLabel).toBe("high");
    expect(item.dueDate).toBe("2026-05-15");
    expect(item.dueDateLabel).toBeTruthy();
    expect(item.unpaidAmount).toBe(80000);
    expect(item.updatedAtLabel).toBeTruthy();
  });
});

describe("derived status — validationStatus", () => {
  it("resolves passed/failed from latestValidation.status", () => {
    const passed = adaptFirst({
      items: [flatRow({ latestValidation: { status: "passed" } })],
      total: 1,
    });
    expect(passed.validationStatus).toBe("passed");

    const failed = adaptFirst({
      items: [flatRow({ latestValidation: { status: "failed" } })],
      total: 1,
    });
    expect(failed.validationStatus).toBe("failed");
  });

  it("defaults to pending when latestValidation is null, absent, or has unknown status", () => {
    for (const vr of [
      null,
      undefined,
      { executedAt: "2026-01-01" },
      { status: "x" },
    ]) {
      const item = adaptFirst({
        items: [flatRow({ latestValidation: vr })],
        total: 1,
      });
      expect(item.validationStatus).toBe("pending");
    }
  });

  it("reads from wrapper level in summary format", () => {
    const item = adaptFirst({
      items: [
        wrappedRow(
          {},
          { latestValidation: { status: "passed", executedAt: "2026-04-01" } },
        ),
      ],
      total: 1,
    });
    expect(item.validationStatus).toBe("passed");
  });

  it("validationLabel reflects status and blocker count", () => {
    const passed = adaptFirst({
      items: [
        flatRow({
          latestValidation: { status: "passed", blockingCount: 0 },
        }),
      ],
      total: 1,
    });
    expect(passed.validationLabel).toEqual({
      status: "passed",
      blockingCount: 0,
    });

    const failedWithBlockers = adaptFirst({
      items: [
        flatRow({
          latestValidation: { status: "failed", blockingCount: 5 },
        }),
      ],
      total: 1,
    });
    expect(failedWithBlockers.validationLabel).toEqual({
      status: "failed",
      blockingCount: 5,
    });

    const failedNoBlockers = adaptFirst({
      items: [
        flatRow({
          latestValidation: { status: "failed", blockingCount: 0 },
        }),
      ],
      total: 1,
    });
    expect(failedNoBlockers.validationLabel).toEqual({
      status: "failed",
      blockingCount: 0,
    });

    const noValidation = adaptFirst({
      items: [flatRow({ latestValidation: null })],
      total: 1,
    });
    expect(noValidation.validationLabel).toEqual({
      status: "pending",
      blockingCount: 0,
    });
  });

  it("blockerCount is extracted from latestValidation.blockingCount", () => {
    const withBlockers = adaptFirst({
      items: [
        flatRow({
          latestValidation: { status: "failed", blockingCount: 7 },
        }),
      ],
      total: 1,
    });
    expect(withBlockers.blockerCount).toBe(7);

    const noBlockers = adaptFirst({
      items: [
        flatRow({
          latestValidation: { status: "passed", blockingCount: 0 },
        }),
      ],
      total: 1,
    });
    expect(noBlockers.blockerCount).toBe(0);

    const noValidation = adaptFirst({
      items: [flatRow({ latestValidation: null })],
      total: 1,
    });
    expect(noValidation.blockerCount).toBe(0);
  });
});

describe("derived status — riskStatus / riskLabel", () => {
  it.each([
    ["high", "critical", "high"],
    ["critical", "critical", "critical"],
    ["medium", "attention", "medium"],
    ["attention", "attention", "attention"],
    ["low", "normal", "low"],
    ["unknown_level", "normal", "unknown_level"],
  ])("maps riskLevel '%s' → status=%s, label=%s", (level, status, label) => {
    const item = adaptFirst({
      items: [flatRow({ riskLevel: level })],
      total: 1,
    });
    expect(item.riskStatus).toBe(status);
    expect(item.riskLabel).toBe(label);
  });

  it("maps empty/absent riskLevel to normal with 'low' label", () => {
    for (const riskLevel of ["", undefined]) {
      const item = adaptFirst({
        items: [flatRow({ riskLevel })],
        total: 1,
      });
      expect(item.riskStatus).toBe("normal");
      expect(item.riskLabel).toBe("low");
    }
  });
});

describe("derived status — dueDate / dueDateLabel", () => {
  it("maps dueAt to raw dueDate and formatted dueDateLabel", () => {
    const item = adaptFirst({
      items: [flatRow({ dueAt: "2026-08-15" })],
      total: 1,
    });
    expect(item.dueDate).toBe("2026-08-15");
    expect(item.dueDateLabel).toBeTruthy();
    expect(item.dueDateLabel).toMatch(/2026/);
  });

  it("maps null/undefined dueAt to empty strings", () => {
    for (const dueAt of [null, undefined]) {
      const item = adaptFirst({ items: [flatRow({ dueAt })], total: 1 });
      expect(item.dueDate).toBe("");
      expect(item.dueDateLabel).toBe("");
    }
  });

  it("handles ISO datetime with timezone", () => {
    const item = adaptFirst({
      items: [flatRow({ dueAt: "2026-12-31T23:59:59.000Z" })],
      total: 1,
    });
    expect(item.dueDate).toBe("2026-12-31T23:59:59.000Z");
    expect(item.dueDateLabel).toBeTruthy();
  });

  it("returns empty dueDateLabel for invalid date string", () => {
    const item = adaptFirst({
      items: [flatRow({ dueAt: "not-a-date" })],
      total: 1,
    });
    expect(item.dueDate).toBe("not-a-date");
    expect(item.dueDateLabel).toBe("");
  });
});

describe("derived status — unpaidAmount", () => {
  it("reads billingUnpaidAmountCached as unpaidAmount", () => {
    expect(
      adaptFirst({
        items: [flatRow({ billingUnpaidAmountCached: 75000 })],
        total: 1,
      }).unpaidAmount,
    ).toBe(75000);
  });

  it("handles zero and decimal amounts", () => {
    expect(
      adaptFirst({
        items: [flatRow({ billingUnpaidAmountCached: 0 })],
        total: 1,
      }).unpaidAmount,
    ).toBe(0);
    expect(
      adaptFirst({
        items: [flatRow({ billingUnpaidAmountCached: 12345.67 })],
        total: 1,
      }).unpaidAmount,
    ).toBe(12345.67);
  });

  it("defaults to 0 for missing, null, non-numeric, NaN, and Infinity", () => {
    for (const v of [undefined, null, "not-a-number", NaN, Infinity]) {
      expect(
        adaptFirst({
          items: [flatRow({ billingUnpaidAmountCached: v })],
          total: 1,
        }).unpaidAmount,
      ).toBe(0);
    }
  });
});

describe("derived status — updatedAtLabel", () => {
  it("formats valid ISO timestamp as ja-JP date", () => {
    const item = adaptFirst({
      items: [flatRow({ updatedAt: "2026-04-10T00:00:00.000Z" })],
      total: 1,
    });
    expect(item.updatedAtLabel).toBeTruthy();
    expect(item.updatedAtLabel).toMatch(/2026/);
  });

  it("returns empty string for null, undefined, empty, and invalid values", () => {
    for (const updatedAt of [null, undefined, "", "garbage"]) {
      const item = adaptFirst({
        items: [flatRow({ updatedAt })],
        total: 1,
      });
      expect(item.updatedAtLabel).toBe("");
    }
  });
});

describe("derived status — structural invariants", () => {
  it("all CASE_LIST_DERIVED_TARGET_KEYS exist on every adapted item", () => {
    const result = adaptCaseListResult({
      items: [flatRow(), wrappedRow()],
      total: 2,
    });
    expect(result).not.toBeNull();
    for (const item of result!.items) {
      for (const key of CASE_LIST_DERIVED_TARGET_KEYS) {
        expect(item).toHaveProperty(key);
      }
    }
  });

  it("validationStatus is always one of passed/pending/failed", () => {
    const scenarios = [
      flatRow({ latestValidation: { status: "passed" } }),
      flatRow({ latestValidation: { status: "failed" } }),
      flatRow({ latestValidation: null }),
      flatRow(),
    ];
    for (const row of scenarios) {
      const item = adaptFirst({ items: [row], total: 1 });
      expect(["passed", "pending", "failed"]).toContain(item.validationStatus);
    }
  });

  it("riskStatus is always one of normal/attention/critical", () => {
    for (const riskLevel of [
      "low",
      "medium",
      "high",
      "critical",
      "attention",
      "",
      undefined,
    ]) {
      const item = adaptFirst({ items: [flatRow({ riskLevel })], total: 1 });
      expect(["normal", "attention", "critical"]).toContain(item.riskStatus);
    }
  });

  it("unpaidAmount is always a finite number", () => {
    for (const v of [0, 100, 99999, undefined, null, NaN, Infinity]) {
      const item = adaptFirst({
        items: [flatRow({ billingUnpaidAmountCached: v })],
        total: 1,
      });
      expect(typeof item.unpaidAmount).toBe("number");
      expect(Number.isFinite(item.unpaidAmount)).toBe(true);
    }
  });

  it("dueDate and updatedAtLabel are always strings", () => {
    for (const dueAt of ["2026-01-01", null, undefined, ""]) {
      expect(
        typeof adaptFirst({ items: [flatRow({ dueAt })], total: 1 }).dueDate,
      ).toBe("string");
    }
    for (const updatedAt of ["2026-01-01T00:00:00Z", null, undefined, ""]) {
      expect(
        typeof adaptFirst({ items: [flatRow({ updatedAt })], total: 1 })
          .updatedAtLabel,
      ).toBe("string");
    }
  });

  it("flat and wrapped DTOs produce identical derived status for same data", () => {
    const data = {
      riskLevel: "high",
      billingUnpaidAmountCached: 50000,
      updatedAt: "2026-04-10T00:00:00.000Z",
      dueAt: "2026-06-01",
    };
    const vr = { status: "failed", blockingCount: 2, warningCount: 0 };
    const flatItem = adaptFirst({
      items: [flatRow({ ...data, latestValidation: vr })],
      total: 1,
    });
    const wrappedItem = adaptFirst({
      items: [wrappedRow(data, { latestValidation: vr })],
      total: 1,
    });
    const flatRec = flatItem as unknown as Record<string, unknown>;
    const wrappedRec = wrappedItem as unknown as Record<string, unknown>;
    for (const key of CASE_LIST_DERIVED_TARGET_KEYS) {
      expect(flatRec[key]).toEqual(wrappedRec[key]);
    }
  });
});
