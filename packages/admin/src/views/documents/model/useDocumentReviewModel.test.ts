import { describe, it, expect } from "vitest";
import { useDocumentReviewModel } from "./useDocumentReviewModel";

function create() {
  return useDocumentReviewModel();
}

const DOC = { id: "doc-001", name: "パスポート写し" };

// ─── Approve ────────────────────────────────────────────────────

describe("useDocumentReviewModel — approve", () => {
  it("starts closed", () => {
    const m = create();
    expect(m.approveOpen.value).toBe(false);
    expect(m.approveTarget.value).toBeNull();
  });

  it("openApprove sets target and opens", () => {
    const m = create();
    m.openApprove(DOC);
    expect(m.approveOpen.value).toBe(true);
    expect(m.approveTarget.value).toEqual(DOC);
  });

  it("closeApprove clears target", () => {
    const m = create();
    m.openApprove(DOC);
    m.closeApprove();
    expect(m.approveOpen.value).toBe(false);
    expect(m.approveTarget.value).toBeNull();
  });
});

// ─── Reject ─────────────────────────────────────────────────────

describe("useDocumentReviewModel — reject", () => {
  it("starts closed with empty reason", () => {
    const m = create();
    expect(m.rejectOpen.value).toBe(false);
    expect(m.rejectReason.value).toBe("");
    expect(m.canConfirmReject.value).toBe(false);
  });

  it("openReject sets target and resets reason", () => {
    const m = create();
    m.rejectReason.value = "old reason";
    m.openReject(DOC);
    expect(m.rejectOpen.value).toBe(true);
    expect(m.rejectReason.value).toBe("");
  });

  it("canConfirmReject is false when reason is empty", () => {
    const m = create();
    m.openReject(DOC);
    expect(m.canConfirmReject.value).toBe(false);
  });

  it("canConfirmReject is false when reason is whitespace-only", () => {
    const m = create();
    m.openReject(DOC);
    m.rejectReason.value = "   ";
    expect(m.canConfirmReject.value).toBe(false);
  });

  it("canConfirmReject is true when reason has content", () => {
    const m = create();
    m.openReject(DOC);
    m.rejectReason.value = "书面不清晰";
    expect(m.canConfirmReject.value).toBe(true);
  });

  it("closeReject clears target and reason", () => {
    const m = create();
    m.openReject(DOC);
    m.rejectReason.value = "reason";
    m.closeReject();
    expect(m.rejectOpen.value).toBe(false);
    expect(m.rejectReason.value).toBe("");
    expect(m.rejectTarget.value).toBeNull();
  });
});

// ─── Waive ──────────────────────────────────────────────────────

describe("useDocumentReviewModel — waive", () => {
  it("starts closed", () => {
    const m = create();
    expect(m.waiveOpen.value).toBe(false);
    expect(m.canConfirmWaive.value).toBe(false);
  });

  it("openWaive opens and resets fields", () => {
    const m = create();
    m.waiveReasonCode.value = "other";
    m.waiveNote.value = "note";
    m.openWaive("テスト資料");
    expect(m.waiveOpen.value).toBe(true);
    expect(m.waiveTargetLabel.value).toBe("テスト資料");
    expect(m.waiveReasonCode.value).toBe("");
    expect(m.waiveNote.value).toBe("");
  });

  it("openWaive with no label defaults to empty string", () => {
    const m = create();
    m.openWaive();
    expect(m.waiveTargetLabel.value).toBe("");
  });

  it("canConfirmWaive is false when no reason code", () => {
    const m = create();
    m.openWaive();
    expect(m.canConfirmWaive.value).toBe(false);
  });

  it("canConfirmWaive is true with non-other reason code", () => {
    const m = create();
    m.openWaive();
    m.waiveReasonCode.value = "visa_type_exempt";
    expect(m.canConfirmWaive.value).toBe(true);
  });

  it("waiveNoteRequired is true when code is other", () => {
    const m = create();
    m.waiveReasonCode.value = "other";
    expect(m.waiveNoteRequired.value).toBe(true);
  });

  it("waiveNoteRequired is false for non-other codes", () => {
    const m = create();
    m.waiveReasonCode.value = "visa_type_exempt";
    expect(m.waiveNoteRequired.value).toBe(false);
  });

  it("canConfirmWaive is false when code is other and note empty", () => {
    const m = create();
    m.openWaive();
    m.waiveReasonCode.value = "other";
    expect(m.canConfirmWaive.value).toBe(false);
  });

  it("canConfirmWaive is false when code is other and note is whitespace-only", () => {
    const m = create();
    m.openWaive();
    m.waiveReasonCode.value = "other";
    m.waiveNote.value = "   ";
    expect(m.canConfirmWaive.value).toBe(false);
  });

  it("canConfirmWaive is true when code is other and note has content", () => {
    const m = create();
    m.openWaive();
    m.waiveReasonCode.value = "other";
    m.waiveNote.value = "特殊免除理由";
    expect(m.canConfirmWaive.value).toBe(true);
  });

  it("closeWaive clears all waive state", () => {
    const m = create();
    m.openWaive("label");
    m.waiveReasonCode.value = "other";
    m.waiveNote.value = "note";
    m.closeWaive();
    expect(m.waiveOpen.value).toBe(false);
    expect(m.waiveTargetLabel.value).toBe("");
    expect(m.waiveReasonCode.value).toBe("");
    expect(m.waiveNote.value).toBe("");
  });
});

// ─── Reference ──────────────────────────────────────────────────

describe("useDocumentReviewModel — reference", () => {
  it("starts closed", () => {
    const m = create();
    expect(m.referenceOpen.value).toBe(false);
    expect(m.canConfirmReference.value).toBe(false);
  });

  it("openReference sets target and resets selection", () => {
    const m = create();
    m.selectedReferenceId.value = "old-id";
    m.openReference(DOC);
    expect(m.referenceOpen.value).toBe(true);
    expect(m.referenceTarget.value).toEqual(DOC);
    expect(m.selectedReferenceId.value).toBe("");
  });

  it("canConfirmReference is true when id selected", () => {
    const m = create();
    m.openReference(DOC);
    m.selectedReferenceId.value = "ref-001";
    expect(m.canConfirmReference.value).toBe(true);
  });

  it("canConfirmReference is false when id empty", () => {
    const m = create();
    m.openReference(DOC);
    expect(m.canConfirmReference.value).toBe(false);
  });

  it("closeReference clears target and selection", () => {
    const m = create();
    m.openReference(DOC);
    m.selectedReferenceId.value = "ref-001";
    m.closeReference();
    expect(m.referenceOpen.value).toBe(false);
    expect(m.referenceTarget.value).toBeNull();
    expect(m.selectedReferenceId.value).toBe("");
  });
});

// ─── Risk Panel ─────────────────────────────────────────────────

describe("useDocumentReviewModel — risk panel", () => {
  it("starts closed", () => {
    const m = create();
    expect(m.riskPanelOpen.value).toBe(false);
  });

  it("openRiskPanel opens", () => {
    const m = create();
    m.openRiskPanel();
    expect(m.riskPanelOpen.value).toBe(true);
  });

  it("closeRiskPanel closes", () => {
    const m = create();
    m.openRiskPanel();
    m.closeRiskPanel();
    expect(m.riskPanelOpen.value).toBe(false);
  });
});
