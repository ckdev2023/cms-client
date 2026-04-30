import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { useDocumentReviewModel } from "./model/useDocumentReviewModel";
import { useDocumentListModel } from "./model/useDocumentListModel";
import type { DocumentRepository } from "./model/DocumentRepositoryTypes";
import type { DocumentListItem } from "./types";

// ─── Fixtures ─────────────────────────────────────────────────────

function makeItem(
  overrides: Partial<DocumentListItem> & { id: string },
): DocumentListItem {
  return {
    name: `Doc ${overrides.id}`,
    caseId: "case-1",
    caseName: "A2026-001",
    provider: "main_applicant",
    status: "pending",
    dueDate: null,
    dueDateLabel: "—",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 0,
    ...overrides,
  };
}

const INITIAL_ITEMS: DocumentListItem[] = [
  makeItem({ id: "doc-1", name: "パスポート写し", status: "pending" }),
  makeItem({
    id: "doc-2",
    name: "在留カード写し",
    status: "approved",
    referenceCount: 2,
  }),
];

const AFTER_LINK_ITEMS: DocumentListItem[] = [
  makeItem({
    id: "doc-1",
    name: "パスポート写し",
    status: "uploaded_reviewing",
    referenceCount: 1,
  }),
  makeItem({
    id: "doc-2",
    name: "在留カード写し",
    status: "approved",
    referenceCount: 2,
  }),
];

const CANDIDATES = [
  {
    fileId: "fv-1",
    requirementId: "req-src-1",
    fileName: "passport.pdf",
    versionNo: 2,
    uploadedAt: "2026-04-01T00:00:00Z",
    expiryDate: "2027-04-01",
    sourceCaseId: "case-2",
    sourceRequirementName: "パスポート写し",
    reviewStatus: "approved",
  },
  {
    fileId: "fv-2",
    requirementId: "req-src-2",
    fileName: "passport_v1.pdf",
    versionNo: 1,
    uploadedAt: "2025-10-01T00:00:00Z",
    expiryDate: "2026-10-01",
    sourceCaseId: "case-3",
    sourceRequirementName: "パスポート写し(旧)",
    reviewStatus: "approved",
  },
];

const DOC = { id: "doc-1", name: "パスポート写し" };

function makeRepository(): DocumentRepository {
  return {
    listDocuments: vi
      .fn()
      .mockResolvedValue({ items: INITIAL_ITEMS, total: INITIAL_ITEMS.length }),
    transition: vi.fn().mockResolvedValue({ id: "x", status: "approved" }),
    followUp: vi.fn().mockResolvedValue({ id: "x" }),
    waive: vi.fn().mockResolvedValue({ id: "x", status: "waived" }),
    uploadLocalArchive: vi.fn().mockResolvedValue({ id: "file-1" }),
    listFiles: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getCompletionRate: vi
      .fn()
      .mockResolvedValue({ collected: 1, total: 2, percent: 50, label: "1/2" }),
    createItem: vi.fn().mockResolvedValue({ id: "new-1" }),
    listReferenceCandidates: vi.fn().mockResolvedValue(CANDIDATES),
    linkRef: vi.fn().mockResolvedValue({
      id: "ref-1",
      requirementId: "doc-1",
      fileVersionId: "fv-1",
      refMode: "cross_case_link",
      createdAt: "2026-04-30T10:00:00Z",
    }),
    getSharedExpiryRisk: vi.fn().mockResolvedValue({
      versionInfo: "—",
      affectedCases: [],
      suggestedAction: "—",
    }),
  };
}

// ─── Candidates loading ──────────────────────────────────────────

describe("ReferenceVersionModal wiring — candidates from repository", () => {
  it("loads candidates via repository.listReferenceCandidates on open", async () => {
    const repo = makeRepository();
    const review = useDocumentReviewModel({ repository: repo });

    review.openReference(DOC);
    await vi.waitFor(() =>
      expect(review.referenceCandidatesLoading.value).toBe(false),
    );

    expect(repo.listReferenceCandidates).toHaveBeenCalledWith("doc-1");
    expect(review.referenceCandidates.value).toHaveLength(2);
  });

  it("adapts DTO fields to ReferenceCandidate shape", async () => {
    const repo = makeRepository();
    const review = useDocumentReviewModel({ repository: repo });

    review.openReference(DOC);
    await vi.waitFor(() =>
      expect(review.referenceCandidatesLoading.value).toBe(false),
    );

    const first = review.referenceCandidates.value[0];
    expect(first).toMatchObject({
      id: "fv-1",
      sourceCaseId: "case-2",
      sourceDocName: "パスポート写し",
      version: 2,
      reviewedAt: "2026-04-01T00:00:00Z",
      expiryDate: "2027-04-01",
    });
    expect(first).toHaveProperty("sourceCaseName");
  });

  it("shows loading state while candidates fetch", async () => {
    const repo = makeRepository();
    let resolve!: (v: unknown) => void;
    vi.mocked(repo.listReferenceCandidates).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const review = useDocumentReviewModel({ repository: repo });

    review.openReference(DOC);
    expect(review.referenceCandidatesLoading.value).toBe(true);

    resolve(CANDIDATES);
    await vi.waitFor(() =>
      expect(review.referenceCandidatesLoading.value).toBe(false),
    );
  });

  it("falls back to empty list when candidates fetch fails", async () => {
    const repo = makeRepository();
    vi.mocked(repo.listReferenceCandidates).mockRejectedValue(
      new Error("network error"),
    );
    const review = useDocumentReviewModel({ repository: repo });

    review.openReference(DOC);
    await vi.waitFor(() =>
      expect(review.referenceCandidatesLoading.value).toBe(false),
    );

    expect(review.referenceCandidates.value).toEqual([]);
  });
});

// ─── Link success → status change ────────────────────────────────

describe("ReferenceVersionModal wiring — link success → item status change", () => {
  let repo: DocumentRepository;
  let listModel: ReturnType<typeof useDocumentListModel>;
  let review: ReturnType<typeof useDocumentReviewModel>;
  let onRefSuccess: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    repo = makeRepository();
    listModel = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    onRefSuccess = vi.fn(() => {
      vi.mocked(repo.listDocuments).mockResolvedValue({
        items: AFTER_LINK_ITEMS,
        total: AFTER_LINK_ITEMS.length,
      });
      listModel.refresh();
    });

    review = useDocumentReviewModel({
      repository: repo,
      onReferenceSuccess: onRefSuccess,
      onError: vi.fn(),
    });
  });

  it("calls repository.linkRef with selected fileVersionId", async () => {
    review.openReference(DOC);
    await vi.waitFor(() =>
      expect(review.referenceCandidatesLoading.value).toBe(false),
    );
    review.selectedReferenceId.value = "fv-1";
    await review.confirmReference();

    expect(repo.linkRef).toHaveBeenCalledWith({
      requirementId: "doc-1",
      fileVersionId: "fv-1",
    });
  });

  it("fires onReferenceSuccess callback after link", async () => {
    review.openReference(DOC);
    await vi.waitFor(() =>
      expect(review.referenceCandidatesLoading.value).toBe(false),
    );
    review.selectedReferenceId.value = "fv-1";
    await review.confirmReference();

    expect(onRefSuccess).toHaveBeenCalledWith(DOC);
  });

  it("list model shows updated status after refresh triggered by link success", async () => {
    expect(listModel.items.value[0].status).toBe("pending");

    review.openReference(DOC);
    await vi.waitFor(() =>
      expect(review.referenceCandidatesLoading.value).toBe(false),
    );
    review.selectedReferenceId.value = "fv-1";
    await review.confirmReference();
    await flushPromises();

    expect(listModel.items.value[0].status).toBe("uploaded_reviewing");
    expect(listModel.items.value[0].referenceCount).toBe(1);
  });

  it("closes modal and clears selection after successful link", async () => {
    review.openReference(DOC);
    await vi.waitFor(() =>
      expect(review.referenceCandidatesLoading.value).toBe(false),
    );
    review.selectedReferenceId.value = "fv-1";
    expect(review.referenceOpen.value).toBe(true);

    await review.confirmReference();
    expect(review.referenceOpen.value).toBe(false);
    expect(review.selectedReferenceId.value).toBe("");
  });

  it("keeps modal open and calls onError when linkRef fails", async () => {
    const onError = vi.fn();
    const apiError = new Error("link failed");
    vi.mocked(repo.linkRef).mockRejectedValue(apiError);
    const failReview = useDocumentReviewModel({ repository: repo, onError });

    failReview.openReference(DOC);
    await vi.waitFor(() =>
      expect(failReview.referenceCandidatesLoading.value).toBe(false),
    );
    failReview.selectedReferenceId.value = "fv-1";
    await failReview.confirmReference();

    expect(onError).toHaveBeenCalledWith(apiError);
    expect(failReview.referenceOpen.value).toBe(true);
  });

  it("does not call linkRef when no candidate is selected", async () => {
    vi.mocked(repo.linkRef).mockClear();
    review.openReference(DOC);
    await vi.waitFor(() =>
      expect(review.referenceCandidatesLoading.value).toBe(false),
    );

    await review.confirmReference();
    expect(repo.linkRef).not.toHaveBeenCalled();
  });
});
