import {
  normalizeDocumentStatus,
  isP0DocumentStatus,
  allowedTransitions,
  isValidTransition,
  isActionableStatus,
  computeCompletionRate,
  DOCUMENT_STATUS_TRANSITIONS,
  DOCUMENT_STATUS_SORT_PRIORITY,
} from "./DocumentStatusRules";

describe("normalizeDocumentStatus", () => {
  it("maps legacy 'done' to 'approved'", () => {
    expect(normalizeDocumentStatus("done")).toBe("approved");
  });

  it("maps legacy 'pending' to 'waiting_upload'", () => {
    expect(normalizeDocumentStatus("pending")).toBe("waiting_upload");
  });

  it("maps legacy 'rejected' to 'revision_required'", () => {
    expect(normalizeDocumentStatus("rejected")).toBe("revision_required");
  });

  it("maps legacy 'submitted' to 'uploaded_reviewing'", () => {
    expect(normalizeDocumentStatus("submitted")).toBe("uploaded_reviewing");
  });

  it("is idempotent for P0 values", () => {
    expect(normalizeDocumentStatus("approved")).toBe("approved");
    expect(normalizeDocumentStatus("waived")).toBe("waived");
    expect(normalizeDocumentStatus("expired")).toBe("expired");
  });

  it("returns 'not_sent' for null/undefined/unknown", () => {
    expect(normalizeDocumentStatus(null)).toBe("not_sent");
    expect(normalizeDocumentStatus(undefined)).toBe("not_sent");
    expect(normalizeDocumentStatus("")).toBe("not_sent");
    expect(normalizeDocumentStatus("bogus")).toBe("not_sent");
  });
});

describe("isP0DocumentStatus", () => {
  it("returns true for all 7 P0 statuses", () => {
    const all = [
      "not_sent",
      "waiting_upload",
      "uploaded_reviewing",
      "approved",
      "revision_required",
      "waived",
      "expired",
    ] as const;
    for (const s of all) {
      expect(isP0DocumentStatus(s)).toBe(true);
    }
  });

  it("returns false for legacy keys", () => {
    expect(isP0DocumentStatus("done")).toBe(false);
    expect(isP0DocumentStatus("pending")).toBe(false);
  });
});

describe("allowedTransitions / isValidTransition", () => {
  it("not_sent can go to waiting_upload or waived", () => {
    expect(allowedTransitions("not_sent")).toEqual([
      "waiting_upload",
      "waived",
    ]);
    expect(isValidTransition("not_sent", "waiting_upload")).toBe(true);
    expect(isValidTransition("not_sent", "approved")).toBe(false);
  });

  it("uploaded_reviewing can go to approved, revision_required, waived", () => {
    expect(allowedTransitions("uploaded_reviewing")).toEqual([
      "approved",
      "revision_required",
      "waived",
    ]);
  });

  it("approved can go to expired or uploaded_reviewing", () => {
    expect(isValidTransition("approved", "expired")).toBe(true);
    expect(isValidTransition("approved", "uploaded_reviewing")).toBe(true);
    expect(isValidTransition("approved", "waived")).toBe(false);
  });

  it("waived can revert to not_sent", () => {
    expect(isValidTransition("waived", "not_sent")).toBe(true);
    expect(isValidTransition("waived", "approved")).toBe(false);
  });

  it("all keys in DOCUMENT_STATUS_TRANSITIONS are P0 statuses", () => {
    for (const key of Object.keys(DOCUMENT_STATUS_TRANSITIONS)) {
      expect(isP0DocumentStatus(key)).toBe(true);
    }
  });
});

describe("isActionableStatus", () => {
  it("approved and waived are not actionable", () => {
    expect(isActionableStatus("approved")).toBe(false);
    expect(isActionableStatus("waived")).toBe(false);
  });

  it("waiting_upload and revision_required are actionable", () => {
    expect(isActionableStatus("waiting_upload")).toBe(true);
    expect(isActionableStatus("revision_required")).toBe(true);
  });
});

describe("DOCUMENT_STATUS_SORT_PRIORITY", () => {
  it("uploaded_reviewing sorts first (0)", () => {
    expect(DOCUMENT_STATUS_SORT_PRIORITY.uploaded_reviewing).toBe(0);
  });

  it("waived sorts last (6)", () => {
    expect(DOCUMENT_STATUS_SORT_PRIORITY.waived).toBe(6);
  });
});

describe("computeCompletionRate", () => {
  it("returns rate=1 when there are no required items", () => {
    const result = computeCompletionRate([
      { requiredFlag: false, status: "not_sent" },
    ]);
    expect(result).toEqual({ approved: 0, requiredTotal: 0, rate: 1 });
  });

  it("excludes waived from denominator", () => {
    const result = computeCompletionRate([
      { requiredFlag: true, status: "approved" },
      { requiredFlag: true, status: "waived" },
      { requiredFlag: true, status: "waiting_upload" },
    ]);
    expect(result).toEqual({ approved: 1, requiredTotal: 2, rate: 0.5 });
  });

  it("counts only approved in numerator", () => {
    const result = computeCompletionRate([
      { requiredFlag: true, status: "approved" },
      { requiredFlag: true, status: "approved" },
      { requiredFlag: true, status: "uploaded_reviewing" },
      { requiredFlag: true, status: "not_sent" },
    ]);
    expect(result).toEqual({ approved: 2, requiredTotal: 4, rate: 0.5 });
  });

  it("ignores non-required items", () => {
    const result = computeCompletionRate([
      { requiredFlag: true, status: "approved" },
      { requiredFlag: false, status: "not_sent" },
    ]);
    expect(result).toEqual({ approved: 1, requiredTotal: 1, rate: 1 });
  });
});
