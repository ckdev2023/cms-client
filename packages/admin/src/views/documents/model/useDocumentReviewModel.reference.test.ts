import { describe, it, expect, vi } from "vitest";
import { useDocumentReviewModel } from "./useDocumentReviewModel";
import type { DocumentRepository } from "./DocumentRepositoryTypes";

function stubRepository(): Pick<
  DocumentRepository,
  "transition" | "waive" | "followUp" | "listReferenceCandidates" | "linkRef"
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
  };
}

const DOC = { id: "doc-001", name: "パスポート写し" };

// ─── confirmReference ────────────────────────────────────────────

describe("useDocumentReviewModel — confirmReference", () => {
  it("calls repository.linkRef, closes modal, calls onReferenceSuccess", async () => {
    const repo = stubRepository();
    const onReferenceSuccess = vi.fn();
    const m = useDocumentReviewModel({
      repository: repo,
      onReferenceSuccess,
    });
    m.openReference(DOC);
    await vi.waitFor(() =>
      expect(m.referenceCandidatesLoading.value).toBe(false),
    );
    m.selectedReferenceId.value = "fv-1";
    await m.confirmReference();
    expect(repo.linkRef).toHaveBeenCalledWith({
      requirementId: "doc-001",
      fileVersionId: "fv-1",
    });
    expect(m.referenceOpen.value).toBe(false);
    expect(onReferenceSuccess).toHaveBeenCalledWith(DOC);
  });

  it("does nothing when no selection", async () => {
    const repo = stubRepository();
    const m = useDocumentReviewModel({ repository: repo });
    m.openReference(DOC);
    await vi.waitFor(() =>
      expect(m.referenceCandidatesLoading.value).toBe(false),
    );
    await m.confirmReference();
    expect(repo.linkRef).not.toHaveBeenCalled();
  });

  it("calls onError and keeps modal open on failure", async () => {
    const repo = stubRepository();
    const apiError = new Error("link failed");
    (repo.linkRef as ReturnType<typeof vi.fn>).mockRejectedValue(apiError);
    const onError = vi.fn();
    const m = useDocumentReviewModel({ repository: repo, onError });
    m.openReference(DOC);
    await vi.waitFor(() =>
      expect(m.referenceCandidatesLoading.value).toBe(false),
    );
    m.selectedReferenceId.value = "fv-1";
    await m.confirmReference();
    expect(onError).toHaveBeenCalledWith(apiError);
    expect(m.referenceOpen.value).toBe(true);
  });

  it("sets submitting during call", async () => {
    const repo = stubRepository();
    const m = useDocumentReviewModel({ repository: repo });
    m.openReference(DOC);
    await vi.waitFor(() =>
      expect(m.referenceCandidatesLoading.value).toBe(false),
    );
    m.selectedReferenceId.value = "fv-1";
    expect(m.submitting.value).toBe(false);
    const p = m.confirmReference();
    expect(m.submitting.value).toBe(true);
    await p;
    expect(m.submitting.value).toBe(false);
  });
});

// ─── loadReferenceCandidates ────────────────────────────────────

describe("useDocumentReviewModel — reference candidates loading", () => {
  it("loads candidates from repository when openReference is called", async () => {
    const repo = stubRepository();
    (
      repo.listReferenceCandidates as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        fileId: "fv-1",
        requirementId: "req-src",
        fileName: "passport.pdf",
        versionNo: 2,
        uploadedAt: "2026-04-01T00:00:00Z",
        expiryDate: "2027-04-01",
        sourceCaseId: "case-2",
        sourceRequirementName: "パスポート写し",
        reviewStatus: "approved",
      },
    ]);
    const m = useDocumentReviewModel({ repository: repo });
    m.openReference(DOC);
    await vi.waitFor(() =>
      expect(m.referenceCandidatesLoading.value).toBe(false),
    );
    expect(repo.listReferenceCandidates).toHaveBeenCalledWith("doc-001");
    expect(m.referenceCandidates.value).toHaveLength(1);
    expect(m.referenceCandidates.value[0]).toMatchObject({
      id: "fv-1",
      sourceCaseId: "case-2",
      sourceDocName: "パスポート写し",
      version: 2,
      expiryDate: "2027-04-01",
    });
  });

  it("clears candidates on closeReference", async () => {
    const repo = stubRepository();
    (
      repo.listReferenceCandidates as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        fileId: "fv-1",
        requirementId: "r",
        fileName: "f",
        versionNo: 1,
        uploadedAt: "",
        expiryDate: null,
        sourceCaseId: "c",
        sourceRequirementName: "n",
        reviewStatus: "approved",
      },
    ]);
    const m = useDocumentReviewModel({ repository: repo });
    m.openReference(DOC);
    await vi.waitFor(() =>
      expect(m.referenceCandidatesLoading.value).toBe(false),
    );
    expect(m.referenceCandidates.value).toHaveLength(1);
    m.closeReference();
    expect(m.referenceCandidates.value).toHaveLength(0);
  });

  it("falls back to empty on fetch error", async () => {
    const repo = stubRepository();
    (
      repo.listReferenceCandidates as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("network error"));
    const m = useDocumentReviewModel({ repository: repo });
    m.openReference(DOC);
    await vi.waitFor(() =>
      expect(m.referenceCandidatesLoading.value).toBe(false),
    );
    expect(m.referenceCandidates.value).toEqual([]);
  });
});
