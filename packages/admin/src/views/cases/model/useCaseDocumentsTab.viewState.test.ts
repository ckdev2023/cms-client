import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { DocumentRepository } from "../../documents/model/DocumentRepositoryTypes";
import type { DocumentListItem } from "../../documents/types";

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

function stubRepository(items: DocumentListItem[] = []): DocumentRepository {
  return {
    listDocuments: vi.fn().mockResolvedValue({ items, total: items.length }),
    transition: vi.fn(),
    followUp: vi.fn(),
    waive: vi.fn(),
    uploadLocalArchive: vi.fn(),
    listFiles: vi.fn(),
    getCompletionRate: vi
      .fn()
      .mockResolvedValue({ collected: 0, total: 0, percent: 0, label: "0/0" }),
    createItem: vi.fn(),
  };
}

function makeItem(name: string): DocumentListItem {
  return {
    id: `item-${name}`,
    caseId: "case-1",
    name,
    status: "pending",
    provider: "applicant",
    dueAt: null,
    category: null,
    note: null,
    fileVersionId: null,
    fileName: null,
    filePath: null,
    uploadedAt: null,
    references: [],
    waiveInfo: null,
  } as unknown as DocumentListItem;
}

describe("useCaseDocumentsTab — viewState", () => {
  it("returns 'templateMissing' when list is empty and documentTemplateMissing is true", () => {
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      documentTemplateMissing: ref(true),
      repository: stubRepository([]),
    });

    expect(tab.viewState.value).toBe("templateMissing");
  });

  it("returns 'storageGateBlocked' when list is empty and storage root not configured", () => {
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(false),
      documentTemplateMissing: ref(false),
      repository: stubRepository([]),
    });

    expect(tab.viewState.value).toBe("storageGateBlocked");
  });

  it("returns 'empty' when list is empty but storage is configured and template exists", () => {
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      documentTemplateMissing: ref(false),
      repository: stubRepository([]),
    });

    expect(tab.viewState.value).toBe("empty");
  });

  it("returns 'ready' when list has items", async () => {
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      documentTemplateMissing: ref(false),
      repository: stubRepository([makeItem("doc-a")]),
    });

    await flushPromises();
    await nextTick();
    expect(tab.viewState.value).toBe("ready");
  });

  it("returns 'ready' even when templateMissing=true if there are items", async () => {
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      documentTemplateMissing: ref(true),
      repository: stubRepository([makeItem("doc-b")]),
    });

    await flushPromises();
    await nextTick();
    expect(tab.viewState.value).toBe("ready");
  });

  it("templateMissing takes precedence over storageGateBlocked", () => {
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(false),
      documentTemplateMissing: ref(true),
      repository: stubRepository([]),
    });

    expect(tab.viewState.value).toBe("templateMissing");
  });
});
