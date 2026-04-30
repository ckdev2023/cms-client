import { describe, it, expect, vi } from "vitest";
import { useDocumentReviewModel } from "./useDocumentReviewModel";
import type { DocumentRepository } from "./DocumentRepositoryTypes";

function stubRepository(): Pick<
  DocumentRepository,
  | "transition"
  | "waive"
  | "followUp"
  | "listReferenceCandidates"
  | "linkRef"
  | "listFiles"
  | "getSharedExpiryRisk"
> {
  return {
    transition: vi.fn().mockResolvedValue({ id: "x", status: "approved" }),
    followUp: vi.fn().mockResolvedValue({ id: "x" }),
    waive: vi.fn().mockResolvedValue({ id: "x", status: "waived" }),
    listReferenceCandidates: vi.fn().mockResolvedValue([]),
    linkRef: vi.fn().mockResolvedValue({
      id: "ref-1",
      requirementId: "doc-001",
      fileVersionId: "fv-1",
      refMode: "cross_case_link",
      createdAt: "2026-04-30T10:00:00Z",
    }),
    listFiles: vi.fn().mockResolvedValue({
      items: [{ id: "file-1", assetId: "asset-1" }],
      total: 1,
    }),
    getSharedExpiryRisk: vi.fn().mockResolvedValue({
      versionInfo: "有効期限: 2026-03-31（过期）",
      affectedCases: [
        { caseId: "case-1", caseName: "経管签", docName: "課税証明" },
      ],
      suggestedAction: "请提供新版本",
    }),
  };
}

function create() {
  return useDocumentReviewModel();
}

function createWithRepo() {
  const repository = stubRepository();
  const onApproveSuccess = vi.fn();
  const onRejectSuccess = vi.fn();
  const onRemindSuccess = vi.fn();
  const onReferenceSuccess = vi.fn();
  const onError = vi.fn();
  const model = useDocumentReviewModel({
    repository,
    onApproveSuccess,
    onRejectSuccess,
    onRemindSuccess,
    onReferenceSuccess,
    onError,
  });
  return {
    model,
    repository,
    onApproveSuccess,
    onRejectSuccess,
    onRemindSuccess,
    onReferenceSuccess,
    onError,
  };
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
  it("starts closed with null data", () => {
    const m = create();
    expect(m.riskPanelOpen.value).toBe(false);
    expect(m.riskData.value).toBeNull();
    expect(m.riskLoading.value).toBe(false);
  });

  it("openRiskPanel opens and triggers data fetch", async () => {
    const { model, repository } = createWithRepo();
    model.openRiskPanel(DOC);
    expect(model.riskPanelOpen.value).toBe(true);
    await vi.waitFor(() => {
      expect(repository.listFiles).toHaveBeenCalledWith("doc-001", {
        limit: 1,
      });
    });
    await vi.waitFor(() => {
      expect(repository.getSharedExpiryRisk).toHaveBeenCalledWith("asset-1");
    });
    expect(model.riskData.value).toMatchObject({
      versionInfo: "有効期限: 2026-03-31（过期）",
      affectedCases: [{ caseId: "case-1" }],
    });
  });

  it("closeRiskPanel closes and clears data", async () => {
    const { model } = createWithRepo();
    model.openRiskPanel(DOC);
    await vi.waitFor(() => expect(model.riskData.value).not.toBeNull());
    model.closeRiskPanel();
    expect(model.riskPanelOpen.value).toBe(false);
    expect(model.riskData.value).toBeNull();
  });

  it("handles missing assetId gracefully", async () => {
    const repository = stubRepository();
    (repository.listFiles as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{ id: "file-1", assetId: null }],
      total: 1,
    });
    const model = useDocumentReviewModel({ repository });
    model.openRiskPanel(DOC);
    await vi.waitFor(() => expect(model.riskLoading.value).toBe(false));
    expect(model.riskData.value).toBeNull();
    expect(repository.getSharedExpiryRisk).not.toHaveBeenCalled();
  });

  it("calls onError when API fails", async () => {
    const repository = stubRepository();
    const onError = vi.fn();
    (repository.listFiles as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network error"),
    );
    const model = useDocumentReviewModel({ repository, onError });
    model.openRiskPanel(DOC);
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(model.riskLoading.value).toBe(false);
  });
});

// ─── confirmApprove ──────────────────────────────────────────────

describe("useDocumentReviewModel — confirmApprove", () => {
  it("calls repository.transition with approved, closes modal, calls onApproveSuccess", async () => {
    const { model, repository, onApproveSuccess } = createWithRepo();
    model.openApprove(DOC);
    await model.confirmApprove();
    expect(repository.transition).toHaveBeenCalledWith("doc-001", {
      toStatus: "approved",
    });
    expect(model.approveOpen.value).toBe(false);
    expect(onApproveSuccess).toHaveBeenCalledWith(DOC);
  });

  it("does nothing when no target", async () => {
    const { model, repository } = createWithRepo();
    await model.confirmApprove();
    expect(repository.transition).not.toHaveBeenCalled();
  });

  it("calls onError and keeps modal open on failure", async () => {
    const { onError } = createWithRepo();
    const repo = stubRepository();
    const apiError = new Error("transition failed");
    (repo.transition as ReturnType<typeof vi.fn>).mockRejectedValue(apiError);
    const m = useDocumentReviewModel({ repository: repo, onError });
    m.openApprove(DOC);
    await m.confirmApprove();
    expect(onError).toHaveBeenCalledWith(apiError);
    expect(m.approveOpen.value).toBe(true);
  });

  it("sets submitting during call", async () => {
    const { model } = createWithRepo();
    model.openApprove(DOC);
    expect(model.submitting.value).toBe(false);
    const p = model.confirmApprove();
    expect(model.submitting.value).toBe(true);
    await p;
    expect(model.submitting.value).toBe(false);
  });
});

// ─── confirmReject ───────────────────────────────────────────────

describe("useDocumentReviewModel — confirmReject", () => {
  it("calls repository.transition with revision_required, closes modal, calls onRejectSuccess", async () => {
    const { model, repository, onRejectSuccess } = createWithRepo();
    model.openReject(DOC);
    model.rejectReason.value = "書面不鮮明";
    await model.confirmReject();
    expect(repository.transition).toHaveBeenCalledWith("doc-001", {
      toStatus: "revision_required",
    });
    expect(model.rejectOpen.value).toBe(false);
    expect(onRejectSuccess).toHaveBeenCalledWith(DOC);
  });

  it("does nothing when no reason provided", async () => {
    const { model, repository } = createWithRepo();
    model.openReject(DOC);
    await model.confirmReject();
    expect(repository.transition).not.toHaveBeenCalled();
  });

  it("calls onError on failure", async () => {
    const repo = stubRepository();
    const apiError = new Error("reject failed");
    (repo.transition as ReturnType<typeof vi.fn>).mockRejectedValue(apiError);
    const onError = vi.fn();
    const m = useDocumentReviewModel({ repository: repo, onError });
    m.openReject(DOC);
    m.rejectReason.value = "reason";
    await m.confirmReject();
    expect(onError).toHaveBeenCalledWith(apiError);
    expect(m.rejectOpen.value).toBe(true);
  });
});

// ─── confirmRemind ───────────────────────────────────────────────

describe("useDocumentReviewModel — confirmRemind", () => {
  it("calls repository.followUp and onRemindSuccess", async () => {
    const { model, repository, onRemindSuccess } = createWithRepo();
    await model.confirmRemind(DOC);
    expect(repository.followUp).toHaveBeenCalledWith("doc-001");
    expect(onRemindSuccess).toHaveBeenCalledWith(DOC);
  });

  it("calls onError on failure", async () => {
    const repo = stubRepository();
    const apiError = new Error("remind failed");
    (repo.followUp as ReturnType<typeof vi.fn>).mockRejectedValue(apiError);
    const onError = vi.fn();
    const m = useDocumentReviewModel({ repository: repo, onError });
    await m.confirmRemind(DOC);
    expect(onError).toHaveBeenCalledWith(apiError);
  });

  it("sets submitting during call", async () => {
    const { model } = createWithRepo();
    expect(model.submitting.value).toBe(false);
    const p = model.confirmRemind(DOC);
    expect(model.submitting.value).toBe(true);
    await p;
    expect(model.submitting.value).toBe(false);
  });
});
