import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { DocumentRepository } from "../../documents/model/DocumentRepositoryTypes";
import type { DocumentListItem } from "../../documents/types";
import type { DocumentItem } from "../types-detail";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

vi.mock("../../../shared/model/useToast", () => ({
  useToast: () => ({
    add: vi.fn(),
    items: ref([]),
    dismiss: vi.fn(),
  }),
}));

const { useCaseDocumentsTab } = await import("../model/useCaseDocumentsTab");

// ─── Fixtures ─────────────────────────────────────────────────────

const CASE_ID = "case-1";

const LIST_ITEMS: DocumentListItem[] = [
  {
    id: "doc-1",
    name: "パスポート写し",
    caseId: CASE_ID,
    caseName: "A2026-001",
    provider: "main_applicant",
    status: "uploaded_reviewing",
    dueDate: "2026-04-20",
    dueDateLabel: "2026-04-20",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: "/docs/passport.pdf",
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-2",
    name: "在留カード写し",
    caseId: CASE_ID,
    caseName: "A2026-001",
    provider: "main_applicant",
    status: "pending",
    dueDate: "2026-04-25",
    dueDateLabel: "2026-04-25",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-3",
    name: "雇用契約書",
    caseId: CASE_ID,
    caseName: "A2026-001",
    provider: "employer_org",
    status: "approved",
    dueDate: "2026-04-15",
    dueDateLabel: "2026-04-15",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: "/docs/contract.pdf",
    sharedExpiryRisk: false,
    referenceCount: 2,
  },
];

const COMPLETION_RATE = {
  collected: 1,
  total: 3,
  percent: 33,
  label: "1/3",
};

const ITEM_DTO = {
  id: "doc-1",
  caseId: CASE_ID,
  name: "パスポート写し",
  status: "approved",
  ownerSide: "main_applicant",
  dueAt: null,
  lastFollowUpAt: null,
  waiveReasonCodeLatest: null,
  waiveReasonLatest: null,
  waivedAtLatest: null,
  waivedByUserIdLatest: null,
};

// ─── Factory ──────────────────────────────────────────────────────

function makeRepository(): DocumentRepository {
  return {
    listDocuments: vi.fn().mockResolvedValue({
      items: LIST_ITEMS,
      total: LIST_ITEMS.length,
    }),
    transition: vi.fn().mockResolvedValue(ITEM_DTO),
    followUp: vi.fn().mockResolvedValue(ITEM_DTO),
    waive: vi.fn().mockResolvedValue(ITEM_DTO),
    uploadLocalArchive: vi.fn().mockResolvedValue({
      id: "file-1",
      requirementId: "doc-1",
      fileName: "passport.pdf",
      fileUrl: null,
      relativePath: "/docs/passport.pdf",
      fileKey: "key-1",
      versionNo: 1,
      storageType: "local_server",
      reviewStatus: "pending",
      reviewBy: null,
      reviewAt: null,
      expiryDate: null,
      uploadedBy: null,
      uploadedAt: "2026-04-30T00:00:00Z",
      createdAt: "2026-04-30T00:00:00Z",
    }),
    listFiles: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getCompletionRate: vi.fn().mockResolvedValue(COMPLETION_RATE),
    createItem: vi.fn().mockResolvedValue({
      ...ITEM_DTO,
      id: "new-item-1",
      name: "新規資料",
    }),
  };
}

async function createTab(repo?: DocumentRepository) {
  const r = repo ?? makeRepository();
  const tab = useCaseDocumentsTab({
    caseId: ref(CASE_ID),
    isStorageRootConfigured: ref(true),
    repository: r,
  });
  await flushPromises();
  return { tab, repo: r };
}

function findDetailItem(
  tab: ReturnType<typeof useCaseDocumentsTab>,
  listItemId: string,
): DocumentItem | undefined {
  const items = tab.listModel.items.value;
  const idx = items.findIndex((i) => i.id === listItemId);
  if (idx < 0) return undefined;
  for (const g of tab.documentGroups.value) {
    for (const item of g.items) {
      if (item.name === items[idx].name) return item;
    }
  }
  return undefined;
}

// ─── Tests ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("crypto", {
    randomUUID: () => "00000000-0000-0000-0000-000000000000",
  });
});

describe("CaseDocumentsTab wiring — row approve → repository.transition", () => {
  it("calls transition(id, {toStatus:'approved'})", async () => {
    const { tab, repo } = await createTab();
    const item = findDetailItem(tab, "doc-1")!;
    expect(item).toBeDefined();

    tab.handleRowApprove(item);
    expect(tab.review.approveOpen.value).toBe(true);

    await tab.review.confirmApprove();
    await flushPromises();

    expect(repo.transition).toHaveBeenCalledWith("doc-1", {
      toStatus: "approved",
    });
  });

  it("triggers listModel.refresh after approve success", async () => {
    const { tab, repo } = await createTab();
    vi.mocked(repo.listDocuments).mockClear();

    const item = findDetailItem(tab, "doc-1")!;
    tab.handleRowApprove(item);
    await tab.review.confirmApprove();
    await flushPromises();

    expect(repo.listDocuments).toHaveBeenCalled();
  });
});

describe("CaseDocumentsTab wiring — row reject → repository.transition", () => {
  it("calls transition(id, {toStatus:'revision_required'})", async () => {
    const { tab, repo } = await createTab();
    const item = findDetailItem(tab, "doc-1")!;

    tab.handleRowReject(item);
    expect(tab.review.rejectOpen.value).toBe(true);

    tab.review.rejectReason.value = "書類不備のため";
    await tab.review.confirmReject();
    await flushPromises();

    expect(repo.transition).toHaveBeenCalledWith("doc-1", {
      toStatus: "revision_required",
    });
  });
});

describe("CaseDocumentsTab wiring — row remind → repository.followUp", () => {
  it("calls followUp(id)", async () => {
    const { tab, repo } = await createTab();
    const item = findDetailItem(tab, "doc-2")!;
    expect(item).toBeDefined();

    await tab.handleRowRemind(item);
    await flushPromises();

    expect(repo.followUp).toHaveBeenCalledWith("doc-2");
  });

  it("triggers listModel.refresh after remind success", async () => {
    const { tab, repo } = await createTab();
    vi.mocked(repo.listDocuments).mockClear();

    const item = findDetailItem(tab, "doc-2")!;
    await tab.handleRowRemind(item);
    await flushPromises();

    expect(repo.listDocuments).toHaveBeenCalled();
  });
});

describe("CaseDocumentsTab wiring — row register → register modal", () => {
  it("opens modal with caseId + docItemId pre-filled", async () => {
    const { tab } = await createTab();
    const item = findDetailItem(tab, "doc-2")!;

    tab.handleRowRegister(item);

    expect(tab.register.open.value).toBe(true);
    expect(tab.register.form.value.caseId).toBe(CASE_ID);
    expect(tab.register.form.value.docItemId).toBe("doc-2");
  });
});

describe("CaseDocumentsTab wiring — row reference → reference modal", () => {
  it("opens modal with correct target", async () => {
    const { tab } = await createTab();
    const item = findDetailItem(tab, "doc-2")!;

    tab.handleRowReference(item);

    expect(tab.review.referenceOpen.value).toBe(true);
    expect(tab.review.referenceTarget.value).toEqual({
      id: "doc-2",
      name: "在留カード写し",
    });
  });
});

describe("CaseDocumentsTab wiring — row waive → repository.waive", () => {
  it("calls waive(id, {reasonCode, note}) on confirm", async () => {
    const { tab, repo } = await createTab();
    const item = findDetailItem(tab, "doc-2")!;

    tab.handleRowWaive(item);
    expect(tab.review.waiveOpen.value).toBe(true);

    tab.review.waiveReasonCode.value = "visa_type_exempt";
    await tab.handleConfirmWaive();
    await flushPromises();

    expect(repo.waive).toHaveBeenCalledWith("doc-2", {
      reasonCode: "visa_type_exempt",
      note: undefined,
    });
  });

  it("includes note when reason is 'other'", async () => {
    const { tab, repo } = await createTab();
    const item = findDetailItem(tab, "doc-2")!;

    tab.handleRowWaive(item);
    tab.review.waiveReasonCode.value = "other";
    tab.review.waiveNote.value = "特別免除";
    await tab.handleConfirmWaive();
    await flushPromises();

    expect(repo.waive).toHaveBeenCalledWith("doc-2", {
      reasonCode: "other",
      note: "特別免除",
    });
  });

  it("triggers listModel.refresh after waive success", async () => {
    const { tab, repo } = await createTab();
    vi.mocked(repo.listDocuments).mockClear();

    const item = findDetailItem(tab, "doc-2")!;
    tab.handleRowWaive(item);
    tab.review.waiveReasonCode.value = "visa_type_exempt";
    await tab.handleConfirmWaive();
    await flushPromises();

    expect(repo.listDocuments).toHaveBeenCalled();
  });
});

describe("CaseDocumentsTab wiring — header register click", () => {
  it("opens register modal with caseId", async () => {
    const { tab } = await createTab();

    tab.handleRegisterClick(CASE_ID);

    expect(tab.register.open.value).toBe(true);
    expect(tab.register.form.value.caseId).toBe(CASE_ID);
  });
});

describe("CaseDocumentsTab wiring — add-item success → refresh", () => {
  it("calls repository.createItem with correct params", async () => {
    const { tab, repo } = await createTab();

    tab.handleAddItemClick(CASE_ID);
    expect(tab.addItem.open.value).toBe(true);

    tab.addItem.updateField("name", "新規資料");
    tab.addItem.updateField("ownerSide", "main_applicant");
    tab.addItem.updateField("dueAt", "2026-06-01");

    await tab.addItem.submit();
    await flushPromises();

    expect(repo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: CASE_ID,
        name: "新規資料",
        ownerSide: "main_applicant",
        dueAt: "2026-06-01",
        category: "standard",
      }),
    );
  });

  it("triggers listModel.refresh after add-item success", async () => {
    const { tab, repo } = await createTab();
    vi.mocked(repo.listDocuments).mockClear();

    tab.handleAddItemClick(CASE_ID);
    tab.addItem.updateField("name", "新規資料");
    tab.addItem.updateField("ownerSide", "main_applicant");
    await tab.addItem.submit();
    await flushPromises();

    expect(repo.listDocuments).toHaveBeenCalled();
  });

  it("triggers completion rate re-fetch after add-item success", async () => {
    const { tab, repo } = await createTab();
    vi.mocked(repo.getCompletionRate).mockClear();

    tab.handleAddItemClick(CASE_ID);
    tab.addItem.updateField("name", "新規資料");
    tab.addItem.updateField("ownerSide", "employer_org");
    await tab.addItem.submit();
    await flushPromises();

    expect(repo.getCompletionRate).toHaveBeenCalledWith(CASE_ID);
  });
});

describe("CaseDocumentsTab wiring — register submit → refresh", () => {
  it("triggers listModel.refresh after upload success", async () => {
    const { tab, repo } = await createTab();

    tab.register.openModal(CASE_ID, "doc-2");
    tab.register.updateField("relativePath", "docs/card.pdf");
    expect(tab.register.canSubmit.value).toBe(true);

    vi.mocked(repo.listDocuments).mockClear();

    await tab.register.submit();
    await flushPromises();

    expect(repo.uploadLocalArchive).toHaveBeenCalledWith(
      expect.objectContaining({
        requirementId: "doc-2",
        relativePath: "docs/card.pdf",
      }),
    );
    expect(repo.listDocuments).toHaveBeenCalled();
  });

  it("triggers completion rate re-fetch after upload success", async () => {
    const { tab, repo } = await createTab();

    tab.register.openModal(CASE_ID, "doc-2");
    tab.register.updateField("relativePath", "docs/card.pdf");

    vi.mocked(repo.getCompletionRate).mockClear();

    await tab.register.submit();
    await flushPromises();

    expect(repo.getCompletionRate).toHaveBeenCalledWith(CASE_ID);
  });
});

describe("CaseDocumentsTab wiring — completion rate", () => {
  it("fetches completion rate on initialization", async () => {
    const { repo } = await createTab();
    expect(repo.getCompletionRate).toHaveBeenCalledWith(CASE_ID);
  });

  it("exposes apiCompletionRate from repository", async () => {
    const { tab } = await createTab();
    expect(tab.apiCompletionRate.value).toEqual(COMPLETION_RATE);
  });
});

describe("CaseDocumentsTab wiring — grouping", () => {
  it("groups list items by provider", async () => {
    const { tab } = await createTab();

    expect(tab.hasApiData.value).toBe(true);
    expect(tab.documentGroups.value.length).toBeGreaterThan(0);

    const allItems = tab.documentGroups.value.flatMap((g) => g.items);
    expect(allItems).toHaveLength(LIST_ITEMS.length);
  });
});

describe("CaseDocumentsTab wiring — error handling", () => {
  it("does not throw when repository.waive fails", async () => {
    const repo = makeRepository();
    vi.mocked(repo.waive).mockRejectedValueOnce(new Error("network error"));

    const { tab } = await createTab(repo);
    const item = findDetailItem(tab, "doc-2")!;

    tab.handleRowWaive(item);
    tab.review.waiveReasonCode.value = "visa_type_exempt";

    await expect(tab.handleConfirmWaive()).resolves.not.toThrow();
  });

  it("does not throw when repository.createItem fails", async () => {
    const repo = makeRepository();
    vi.mocked(repo.createItem).mockRejectedValueOnce(new Error("server error"));

    const { tab } = await createTab(repo);
    tab.handleAddItemClick(CASE_ID);
    tab.addItem.updateField("name", "テスト");
    tab.addItem.updateField("ownerSide", "main_applicant");

    await tab.addItem.submit();
    await flushPromises();

    expect(tab.addItem.open.value).toBe(true);
  });
});
