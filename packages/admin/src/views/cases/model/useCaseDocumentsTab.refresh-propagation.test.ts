import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { DocumentRepository } from "../../documents/model/DocumentRepositoryTypes";
import type { CompletionRate } from "../../documents/types";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

vi.mock("../../../shared/model/useToast", () => ({
  useToast: () => ({
    add: vi.fn(),
    items: ref([]),
    remove: vi.fn(),
  }),
}));

const { useCaseDocumentsTab } = await import("./useCaseDocumentsTab");

const API_RATE: CompletionRate = {
  collected: 0,
  total: 10,
  percent: 0,
  label: "0/10",
};

function stubRepository(
  overrides: Partial<DocumentRepository> = {},
): DocumentRepository {
  return {
    listDocuments: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    transition: vi.fn(),
    followUp: vi.fn(),
    waive: vi.fn(),
    uploadLocalArchive: vi.fn(),
    listFiles: vi.fn(),
    getCompletionRate: vi.fn().mockResolvedValue(API_RATE),
    createItem: vi.fn().mockResolvedValue({ id: "item-new" }),
    ...overrides,
  };
}

describe("useCaseDocumentsTab — onWriteSuccess (NEW-V11-1 修复)", () => {
  let repo: DocumentRepository;

  beforeEach(() => {
    repo = stubRepository();
  });

  it("triggers onWriteSuccess after addItem.submit succeeds", async () => {
    const onWriteSuccess = vi.fn();
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      repository: repo,
      onWriteSuccess,
    });
    await flushPromises();

    expect(onWriteSuccess).not.toHaveBeenCalled();

    tab.handleAddItemClick("case-1");
    tab.addItem.updateField("name", "新增资料");
    tab.addItem.updateField("ownerSide", "applicant");
    await tab.addItem.submit();
    await flushPromises();

    expect(repo.createItem).toHaveBeenCalledTimes(1);
    expect(onWriteSuccess).toHaveBeenCalledTimes(1);
  });

  it("does NOT trigger onWriteSuccess when createItem rejects", async () => {
    const onWriteSuccess = vi.fn();
    const failingRepo = stubRepository({
      createItem: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      repository: failingRepo,
      onWriteSuccess,
    });
    await flushPromises();

    tab.handleAddItemClick("case-1");
    tab.addItem.updateField("name", "新增资料");
    tab.addItem.updateField("ownerSide", "applicant");
    await tab.addItem.submit();
    await flushPromises();

    expect(failingRepo.createItem).toHaveBeenCalledTimes(1);
    expect(onWriteSuccess).not.toHaveBeenCalled();
  });

  it("safely no-ops when onWriteSuccess is omitted", async () => {
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      repository: repo,
    });
    await flushPromises();

    tab.handleAddItemClick("case-1");
    tab.addItem.updateField("name", "新增资料");
    tab.addItem.updateField("ownerSide", "applicant");
    await expect(tab.addItem.submit()).resolves.toBeUndefined();
  });
});
