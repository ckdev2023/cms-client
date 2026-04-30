import { describe, it, expect, vi } from "vitest";
import { useDocumentReviewModel } from "./model/useDocumentReviewModel";
import type { DocumentRepository } from "./model/DocumentRepositoryTypes";

// ─── Fixtures ─────────────────────────────────────────────────────

const DOC = { id: "doc-2", name: "在留カード写し" };

const RISK_DATA_EXPIRED = {
  versionInfo: "有効期限: 2026-03-31（过期）",
  affectedCases: [
    { caseId: "case-1", caseName: "A2026-001", docName: "在留カード写し" },
    { caseId: "case-3", caseName: "A2026-003", docName: "在留カード写し" },
  ],
  suggestedAction: "请通知客户提供新版本资料；可考虑免除该资料要求",
};

function makeRepository(): DocumentRepository {
  return {
    listDocuments: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    transition: vi.fn().mockResolvedValue({ id: "x" }),
    followUp: vi.fn().mockResolvedValue({ id: "x" }),
    waive: vi.fn().mockResolvedValue({ id: "x" }),
    uploadLocalArchive: vi.fn().mockResolvedValue({ id: "file-1" }),
    listFiles: vi.fn().mockResolvedValue({
      items: [
        {
          id: "file-1",
          requirementId: "doc-2",
          fileName: "card.pdf",
          fileUrl: null,
          relativePath: null,
          fileKey: "k",
          versionNo: 1,
          storageType: "local_server",
          reviewStatus: "approved",
          reviewBy: null,
          reviewAt: null,
          expiryDate: "2026-03-31",
          uploadedBy: null,
          uploadedAt: "2025-12-01T00:00:00Z",
          assetId: "asset-2",
          createdAt: "2025-12-01T00:00:00Z",
        },
      ],
      total: 1,
    }),
    getCompletionRate: vi
      .fn()
      .mockResolvedValue({ collected: 0, total: 0, percent: 0, label: "0/0" }),
    createItem: vi.fn().mockResolvedValue({ id: "new-1" }),
    listReferenceCandidates: vi.fn().mockResolvedValue([]),
    linkRef: vi.fn().mockResolvedValue({
      id: "ref-1",
      requirementId: "",
      fileVersionId: "",
      refMode: "",
      createdAt: "",
    }),
    getSharedExpiryRisk: vi.fn().mockResolvedValue(RISK_DATA_EXPIRED),
  };
}

// ─── Data from repository ────────────────────────────────────────

describe("SharedExpiryRiskPanel wiring — data from repository", () => {
  it("fetches risk data via listFiles → getSharedExpiryRisk chain", async () => {
    const repo = makeRepository();
    const review = useDocumentReviewModel({ repository: repo });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(review.riskLoading.value).toBe(false));

    expect(repo.listFiles).toHaveBeenCalledWith("doc-2", { limit: 1 });
    expect(repo.getSharedExpiryRisk).toHaveBeenCalledWith("asset-2");
  });

  it("populates riskData with correct SharedExpiryRiskData shape", async () => {
    const repo = makeRepository();
    const review = useDocumentReviewModel({ repository: repo });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(review.riskData.value).not.toBeNull());

    const data = review.riskData.value!;
    expect(data).toHaveProperty("versionInfo");
    expect(data).toHaveProperty("affectedCases");
    expect(data).toHaveProperty("suggestedAction");
    expect(typeof data.versionInfo).toBe("string");
    expect(data.versionInfo).toContain("2026-03-31");
    expect(data.versionInfo).toContain("过期");
    expect(Array.isArray(data.affectedCases)).toBe(true);
    expect(data.affectedCases).toHaveLength(2);
    expect(typeof data.suggestedAction).toBe("string");
    expect(data.suggestedAction.length).toBeGreaterThan(0);
  });

  it("maps affectedCases to {caseId, caseName, docName} shape", async () => {
    const repo = makeRepository();
    const review = useDocumentReviewModel({ repository: repo });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(review.riskData.value).not.toBeNull());

    const cases = review.riskData.value!.affectedCases;
    expect(cases[0]).toEqual({
      caseId: "case-1",
      caseName: "A2026-001",
      docName: "在留カード写し",
    });
    expect(cases[1]).toEqual({
      caseId: "case-3",
      caseName: "A2026-003",
      docName: "在留カード写し",
    });
  });

  it("suggestedAction contains human-readable labels", async () => {
    const repo = makeRepository();
    const review = useDocumentReviewModel({ repository: repo });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(review.riskData.value).not.toBeNull());

    const action = review.riskData.value!.suggestedAction;
    expect(action).toContain("请通知客户提供新版本资料");
    expect(action).toContain("可考虑免除该资料要求");
  });
});

// ─── Loading lifecycle ──────────────────────────────────────────

describe("SharedExpiryRiskPanel wiring — loading lifecycle", () => {
  it("sets riskLoading=true while fetching", async () => {
    const repo = makeRepository();
    let resolveFiles!: (v: unknown) => void;
    vi.mocked(repo.listFiles).mockReturnValue(
      new Promise((r) => {
        resolveFiles = r;
      }),
    );
    const review = useDocumentReviewModel({ repository: repo });

    review.openRiskPanel(DOC);
    expect(review.riskLoading.value).toBe(true);
    expect(review.riskData.value).toBeNull();

    resolveFiles({ items: [{ id: "file-1", assetId: "asset-2" }], total: 1 });
    await vi.waitFor(() => expect(review.riskLoading.value).toBe(false));
  });

  it("riskData stays null when file has no assetId", async () => {
    const repo = makeRepository();
    vi.mocked(repo.listFiles).mockResolvedValue({
      items: [
        {
          id: "file-1",
          assetId: null,
          requirementId: "r",
          fileName: "f",
          fileUrl: null,
          relativePath: null,
          fileKey: "k",
          versionNo: 1,
          storageType: "local_server",
          reviewStatus: "pending",
          reviewBy: null,
          reviewAt: null,
          expiryDate: null,
          uploadedBy: null,
          uploadedAt: "",
          createdAt: "",
        },
      ],
      total: 1,
    });
    const review = useDocumentReviewModel({ repository: repo });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(review.riskLoading.value).toBe(false));

    expect(review.riskData.value).toBeNull();
    expect(repo.getSharedExpiryRisk).not.toHaveBeenCalled();
  });

  it("riskData stays null when listFiles returns empty", async () => {
    const repo = makeRepository();
    vi.mocked(repo.listFiles).mockResolvedValue({ items: [], total: 0 });
    const review = useDocumentReviewModel({ repository: repo });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(review.riskLoading.value).toBe(false));

    expect(review.riskData.value).toBeNull();
    expect(repo.getSharedExpiryRisk).not.toHaveBeenCalled();
  });
});

// ─── Close + error ──────────────────────────────────────────────

describe("SharedExpiryRiskPanel wiring — close + error", () => {
  it("closeRiskPanel clears data and closes", async () => {
    const repo = makeRepository();
    const review = useDocumentReviewModel({ repository: repo });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(review.riskData.value).not.toBeNull());
    expect(review.riskPanelOpen.value).toBe(true);

    review.closeRiskPanel();
    expect(review.riskPanelOpen.value).toBe(false);
    expect(review.riskData.value).toBeNull();
  });

  it("calls onError when listFiles fails", async () => {
    const repo = makeRepository();
    vi.mocked(repo.listFiles).mockRejectedValue(new Error("network error"));
    const onError = vi.fn();
    const review = useDocumentReviewModel({ repository: repo, onError });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());

    expect(review.riskLoading.value).toBe(false);
    expect(review.riskData.value).toBeNull();
  });

  it("calls onError when getSharedExpiryRisk fails", async () => {
    const repo = makeRepository();
    vi.mocked(repo.getSharedExpiryRisk).mockRejectedValue(
      new Error("server error"),
    );
    const onError = vi.fn();
    const review = useDocumentReviewModel({ repository: repo, onError });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());

    expect(review.riskLoading.value).toBe(false);
    expect(review.riskData.value).toBeNull();
  });
});

// ─── Expiring-soon variant ──────────────────────────────────────

describe("SharedExpiryRiskPanel wiring — expiring_soon variant", () => {
  it("shows days-until-expiry for expiring_soon risk status", async () => {
    const repo = makeRepository();
    vi.mocked(repo.getSharedExpiryRisk).mockResolvedValue({
      versionInfo: "有効期限: 2026-05-15（15 日後に期限切れ）",
      affectedCases: [
        { caseId: "case-1", caseName: "A2026-001", docName: "在留カード写し" },
      ],
      suggestedAction: "请通知客户提供新版本资料",
    });
    const review = useDocumentReviewModel({ repository: repo });

    review.openRiskPanel(DOC);
    await vi.waitFor(() => expect(review.riskData.value).not.toBeNull());

    const data = review.riskData.value!;
    expect(data.versionInfo).toContain("2026-05-15");
    expect(data.versionInfo).toContain("15");
    expect(data.affectedCases).toHaveLength(1);
  });
});
