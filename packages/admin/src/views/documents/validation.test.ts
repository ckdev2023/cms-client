import { describe, expect, it } from "vitest";
import type { DocumentItemStatus } from "./types";
import {
  DOCUMENT_PROVIDER_IDS,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_IDS,
  DOCUMENT_STATUS_TONE,
  LEGACY_STATUS_MAP,
  STATUS_SORT_PRIORITY,
  STATUS_TRANSITIONS,
  WAIVED_REASON_CODES,
  WAIVED_REASONS,
  getProviderLabelKey,
  getStatusLabelKey,
  getStatusTone,
  getWaivedReasonLabelKey,
} from "./constants";
import {
  canTransition,
  computeCompletionRate,
  getStatusSortPriority,
  isSelectableForBatch,
  mapLegacyStatus,
  normalizeRelativePathFront,
  validateRelativePath,
} from "./validation";

// ─── Constants integrity ────────────────────────────────────────

describe("documents/constants", () => {
  it("DOCUMENT_STATUS_IDS covers all 6 statuses", () => {
    expect(DOCUMENT_STATUS_IDS).toHaveLength(6);
    for (const id of DOCUMENT_STATUS_IDS) {
      expect(DOCUMENT_STATUSES[id]).toBeDefined();
      expect(DOCUMENT_STATUSES[id].labelKey).toBeTruthy();
      expect(DOCUMENT_STATUSES[id].badge).toBeTruthy();
    }
  });

  it("DOCUMENT_PROVIDER_IDS covers all 4 providers", () => {
    expect(DOCUMENT_PROVIDER_IDS).toHaveLength(4);
  });

  it("WAIVED_REASON_CODES covers all 5 reason codes", () => {
    expect(WAIVED_REASON_CODES).toHaveLength(5);
    for (const code of WAIVED_REASON_CODES) {
      expect(WAIVED_REASONS[code]).toBeDefined();
      expect(WAIVED_REASONS[code].labelKey).toBeTruthy();
    }
  });

  it("only 'other' reason requires a note", () => {
    const withNote = WAIVED_REASON_CODES.filter(
      (c) => WAIVED_REASONS[c].requiresNote,
    );
    expect(withNote).toEqual(["other"]);
  });

  it("STATUS_SORT_PRIORITY has an entry for every status", () => {
    for (const id of DOCUMENT_STATUS_IDS) {
      expect(STATUS_SORT_PRIORITY[id]).toBeDefined();
    }
  });

  it("label helpers fall back to raw key for unknown values", () => {
    expect(getStatusLabelKey("unknown")).toBe("unknown");
    expect(getProviderLabelKey("unknown")).toBe("unknown");
    expect(getWaivedReasonLabelKey("unknown")).toBe("unknown");
  });

  it("label helpers return correct label keys for known values", () => {
    expect(getStatusLabelKey("pending")).toBe("documents.status.pending");
    expect(getStatusLabelKey("waived")).toBe("documents.status.waived");
    expect(getProviderLabelKey("main_applicant")).toBe(
      "documents.providers.mainApplicant",
    );
    expect(
      getProviderLabelKey("employer_org", {
        caseTypeCode: "business_manager_visa",
      }),
    ).toBe("documents.providers.employerOrgBmv");
    expect(getProviderLabelKey("employer_org", { caseTypeCode: "bmv" })).toBe(
      "documents.providers.employerOrgBmv",
    );
    expect(
      getProviderLabelKey("employer_org", {
        caseTypeCode: "business-management-visa",
      }),
    ).toBe("documents.providers.employerOrgBmv");
    expect(getProviderLabelKey("employer_org", { caseTypeCode: "visa" })).toBe(
      "documents.providers.employerOrg",
    );
    expect(getWaivedReasonLabelKey("other")).toBe(
      "documents.waive.reasons.other",
    );
  });

  it("DOCUMENT_STATUS_TONE has an entry for every status", () => {
    for (const id of DOCUMENT_STATUS_IDS) {
      expect(DOCUMENT_STATUS_TONE[id]).toBeTruthy();
    }
  });
});

// ─── getStatusTone ──────────────────────────────────────────────

describe("documents/getStatusTone", () => {
  it("returns correct tone for canonical statuses", () => {
    expect(getStatusTone("pending")).toBe("warning");
    expect(getStatusTone("uploaded_reviewing")).toBe("primary");
    expect(getStatusTone("approved")).toBe("success");
    expect(getStatusTone("rejected")).toBe("danger");
    expect(getStatusTone("expired")).toBe("danger");
    expect(getStatusTone("waived")).toBe("neutral");
  });

  it("maps legacy keys through LEGACY_STATUS_MAP", () => {
    expect(getStatusTone("idle")).toBe("warning");
    expect(getStatusTone("submitted")).toBe("primary");
    expect(getStatusTone("reviewed")).toBe("success");
    expect(getStatusTone("done")).toBe("success");
  });

  it("falls back to neutral for completely unknown keys", () => {
    expect(getStatusTone("nonsense")).toBe("neutral");
  });
});

// ─── Status transitions ─────────────────────────────────────────

describe("documents/status-transitions", () => {
  it("pending can transition to uploaded_reviewing (waive via dedicated endpoint)", () => {
    expect(canTransition("pending", "uploaded_reviewing")).toBe(true);
    expect(canTransition("pending", "waived")).toBe(false);
    expect(canTransition("pending", "approved")).toBe(false);
  });

  it("uploaded_reviewing can transition to approved, rejected (waive via dedicated endpoint)", () => {
    expect(canTransition("uploaded_reviewing", "approved")).toBe(true);
    expect(canTransition("uploaded_reviewing", "rejected")).toBe(true);
    expect(canTransition("uploaded_reviewing", "waived")).toBe(false);
    expect(canTransition("uploaded_reviewing", "pending")).toBe(false);
  });

  it("approved can transition to expired and uploaded_reviewing", () => {
    expect(canTransition("approved", "expired")).toBe(true);
    expect(canTransition("approved", "uploaded_reviewing")).toBe(true);
    expect(canTransition("approved", "pending")).toBe(false);
  });

  it("rejected can transition to uploaded_reviewing (waive via dedicated endpoint)", () => {
    expect(canTransition("rejected", "uploaded_reviewing")).toBe(true);
    expect(canTransition("rejected", "waived")).toBe(false);
    expect(canTransition("rejected", "approved")).toBe(false);
  });

  it("expired can only transition to uploaded_reviewing", () => {
    expect(canTransition("expired", "uploaded_reviewing")).toBe(true);
    expect(canTransition("expired", "waived")).toBe(false);
  });

  it("waived has no outgoing transition in matrix (exit via POST /:id/unwaive)", () => {
    expect(STATUS_TRANSITIONS["waived"].length).toBe(0);
    expect(canTransition("waived", "pending")).toBe(false);
    expect(canTransition("waived", "approved")).toBe(false);
  });

  it("every non-waived status has at least one outgoing transition", () => {
    for (const id of DOCUMENT_STATUS_IDS) {
      if (id === "waived") continue;
      expect(STATUS_TRANSITIONS[id].length).toBeGreaterThan(0);
    }
  });
});

// ─── Legacy status mapping ──────────────────────────────────────

describe("documents/mapLegacyStatus", () => {
  const cases: [string, DocumentItemStatus][] = [
    ["idle", "pending"],
    ["submitted", "uploaded_reviewing"],
    ["reviewed", "approved"],
    ["done", "approved"],
    ["pending", "pending"],
    ["uploaded_reviewing", "uploaded_reviewing"],
    ["approved", "approved"],
    ["rejected", "rejected"],
    ["expired", "expired"],
    ["waived", "waived"],
  ];

  it.each(cases)("maps '%s' → '%s'", (legacy, expected) => {
    expect(mapLegacyStatus(legacy)).toBe(expected);
  });

  it("falls back to pending for unknown keys", () => {
    expect(mapLegacyStatus("nonsense")).toBe("pending");
  });

  it("LEGACY_STATUS_MAP covers all P0 status keys as identity mappings", () => {
    for (const id of DOCUMENT_STATUS_IDS) {
      expect(LEGACY_STATUS_MAP[id]).toBe(id);
    }
  });
});

// ─── relative_path validation ───────────────────────────────────

describe("documents/validateRelativePath", () => {
  it("accepts a valid relative path", () => {
    expect(
      validateRelativePath(
        "A2026-001/main_applicant/passport/20260409_passport.pdf",
      ),
    ).toBeNull();
  });

  it("accepts simple file name", () => {
    expect(validateRelativePath("document.pdf")).toBeNull();
  });

  it("accepts nested path", () => {
    expect(validateRelativePath("case/provider/doc/file.pdf")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateRelativePath("")).toBeTruthy();
  });

  it("rejects whitespace-only string", () => {
    expect(validateRelativePath("   ")).toBeTruthy();
  });

  it("rejects path containing '..'", () => {
    expect(validateRelativePath("foo/../bar")).toBeTruthy();
  });

  it("rejects path starting with '..'", () => {
    expect(validateRelativePath("../secret")).toBeTruthy();
  });

  it("rejects path starting with '~'", () => {
    expect(validateRelativePath("~/Documents/file.pdf")).toBeTruthy();
  });

  it("rejects absolute unix path", () => {
    expect(validateRelativePath("/etc/passwd")).toBeTruthy();
  });

  it("rejects windows absolute path", () => {
    expect(validateRelativePath("C:\\Users\\file.pdf")).toBeTruthy();
  });

  it("rejects path with control characters", () => {
    expect(validateRelativePath("foo\x00bar")).toBeTruthy();
    expect(validateRelativePath("foo\tbar")).toBeTruthy();
  });

  it("error message mentions 相对路径", () => {
    const msg = validateRelativePath("");
    expect(msg).toContain("相对路径");
  });
});

// ─── normalizeRelativePathFront ─────────────────────────────────

describe("documents/normalizeRelativePathFront", () => {
  it("trims and normalizes backslashes", () => {
    expect(normalizeRelativePathFront("  foo\\bar\\baz.pdf  ")).toBe(
      "foo/bar/baz.pdf",
    );
  });

  it("returns the path as-is when already normalized", () => {
    expect(normalizeRelativePathFront("A2026-001/applicant/passport.pdf")).toBe(
      "A2026-001/applicant/passport.pdf",
    );
  });

  it("returns null for empty string", () => {
    expect(normalizeRelativePathFront("")).toBeNull();
    expect(normalizeRelativePathFront("   ")).toBeNull();
  });

  it("returns null for absolute path (unix)", () => {
    expect(normalizeRelativePathFront("/etc/passwd")).toBeNull();
  });

  it("returns null for absolute path (windows)", () => {
    expect(normalizeRelativePathFront("C:\\Users\\file.pdf")).toBeNull();
  });

  it("returns null for tilde-prefixed path", () => {
    expect(normalizeRelativePathFront("~/Documents/file.pdf")).toBeNull();
  });

  it("returns null for paths with empty segments (double slash)", () => {
    expect(normalizeRelativePathFront("foo//bar.pdf")).toBeNull();
  });

  it("returns null for paths with dot segment", () => {
    expect(normalizeRelativePathFront("foo/./bar.pdf")).toBeNull();
  });

  it("returns null for paths with dotdot segment", () => {
    expect(normalizeRelativePathFront("foo/../bar.pdf")).toBeNull();
  });

  it("matches server-side normalizeRelativePath behavior for valid paths", () => {
    const valid = "case001/applicant/doc/20260508_file.pdf";
    expect(normalizeRelativePathFront(valid)).toBe(valid);
  });
});

// ─── Completion rate ────────────────────────────────────────────

describe("documents/computeCompletionRate", () => {
  it("returns 100% when all approved", () => {
    const result = computeCompletionRate(["approved", "approved", "approved"]);
    expect(result.percent).toBe(100);
    expect(result.collected).toBe(3);
    expect(result.total).toBe(3);
  });

  it("returns 0% when none approved", () => {
    const result = computeCompletionRate(["pending", "rejected"]);
    expect(result.percent).toBe(0);
    expect(result.collected).toBe(0);
    expect(result.total).toBe(2);
  });

  it("excludes waived from denominator", () => {
    const result = computeCompletionRate([
      "approved",
      "pending",
      "waived",
      "waived",
    ]);
    expect(result.total).toBe(2);
    expect(result.collected).toBe(1);
    expect(result.percent).toBe(50);
  });

  it("returns '无必需资料' label when all waived", () => {
    const result = computeCompletionRate(["waived", "waived"]);
    expect(result.total).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.label).toBe("无必需资料");
  });

  it("returns '无必需资料' label for empty list", () => {
    const result = computeCompletionRate([]);
    expect(result.label).toBe("无必需资料");
  });

  it("rounds percentage correctly", () => {
    const result = computeCompletionRate(["approved", "pending", "pending"]);
    expect(result.percent).toBe(33);
  });

  it("handles mixed statuses correctly", () => {
    const statuses: DocumentItemStatus[] = [
      "approved",
      "approved",
      "pending",
      "rejected",
      "expired",
      "waived",
      "uploaded_reviewing",
    ];
    const result = computeCompletionRate(statuses);
    expect(result.total).toBe(6);
    expect(result.collected).toBe(2);
    expect(result.percent).toBe(33);
    expect(result.label).toBe("2 / 6 完成");
  });
});

// ─── Sort priority ──────────────────────────────────────────────

describe("documents/getStatusSortPriority", () => {
  it("rejected has highest priority (lowest number)", () => {
    expect(getStatusSortPriority("rejected")).toBeLessThan(
      getStatusSortPriority("expired"),
    );
  });

  it("order: rejected < expired < pending < uploaded_reviewing < approved < waived", () => {
    const ordered: DocumentItemStatus[] = [
      "rejected",
      "expired",
      "pending",
      "uploaded_reviewing",
      "approved",
      "waived",
    ];
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(getStatusSortPriority(ordered[i])).toBeLessThan(
        getStatusSortPriority(ordered[i + 1]),
      );
    }
  });
});

// ─── Batch selectable ───────────────────────────────────────────

describe("documents/isSelectableForBatch", () => {
  it("approved is NOT selectable", () => {
    expect(isSelectableForBatch("approved")).toBe(false);
  });

  it("waived is NOT selectable", () => {
    expect(isSelectableForBatch("waived")).toBe(false);
  });

  it("pending is selectable", () => {
    expect(isSelectableForBatch("pending")).toBe(true);
  });

  it("uploaded_reviewing is selectable", () => {
    expect(isSelectableForBatch("uploaded_reviewing")).toBe(true);
  });

  it("rejected is selectable", () => {
    expect(isSelectableForBatch("rejected")).toBe(true);
  });

  it("expired is selectable", () => {
    expect(isSelectableForBatch("expired")).toBe(true);
  });
});
