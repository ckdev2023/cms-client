import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { DocumentRepository } from "../../documents/model/DocumentRepositoryTypes";
import type { DocumentListItem } from "../../documents/types";
import type { CaseRepository } from "./CaseRepository";

const toastAdd = vi.fn();

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) =>
      p ? `${k}:${JSON.stringify(p)}` : k,
  }),
}));

vi.mock("../../../shared/model/useToast", () => ({
  useToast: () => ({
    add: toastAdd,
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

function stubCaseRepository(
  overrides: Partial<CaseRepository> = {},
): CaseRepository {
  return {
    listCases: vi.fn(),
    getSummaryCards: vi.fn().mockReturnValue([]),
    getDetail: vi.fn(),
    getDetailAggregate: vi.fn(),
    createCase: vi.fn(),
    updateCase: vi.fn(),
    transitionCase: vi.fn(),
    transitionPhase: vi.fn(),
    acknowledgeBillingRisk: vi.fn(),
    updatePostApprovalStage: vi.fn(),
    transitionWorkflowStep: vi.fn(),
    deleteCase: vi.fn(),
    bootstrapChecklist: vi.fn().mockResolvedValue({ count: 3 }),
    getMessages: vi.fn(),
    getLogEntries: vi.fn(),
    getDocumentItems: vi.fn(),
    getGeneratedDocuments: vi.fn(),
    getValidationData: vi.fn(),
    getBillingData: vi.fn(),
    getBillingTabAggregate: vi.fn(),
    getSubmissionPackages: vi.fn(),
    getDoubleReviewEntries: vi.fn(),
    getTasks: vi.fn(),
    getDeadlines: vi.fn(),
    createCaseParty: vi.fn(),
    retryReminderCreation: vi.fn(),
    createCommunicationLog: vi.fn(),
    createGeneratedDocument: vi.fn(),
    finalizeGeneratedDocument: vi.fn(),
    exportGeneratedDocument: vi.fn(),
    createReminder: vi.fn(),
    createTask: vi.fn(),
    completeTask: vi.fn(),
    createSubmissionPackage: vi.fn(),
    listDocumentTemplates: vi.fn(),
    previewChecklistCount: vi.fn(),
    ...overrides,
  } as unknown as CaseRepository;
}

describe("useCaseDocumentsTab — bootstrap checklist", () => {
  it("exposes bootstrapping ref and handleBootstrapChecklist function", () => {
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      documentTemplateMissing: ref(true),
      repository: stubRepository([]),
      caseRepository: stubCaseRepository(),
    });

    expect(tab.bootstrapping.value).toBe(false);
    expect(typeof tab.handleBootstrapChecklist).toBe("function");
  });

  it("calls caseRepository.bootstrapChecklist and shows success toast", async () => {
    toastAdd.mockClear();
    const caseRepo = stubCaseRepository();
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      documentTemplateMissing: ref(true),
      repository: stubRepository([]),
      caseRepository: caseRepo,
    });

    await tab.handleBootstrapChecklist();
    await flushPromises();

    expect(caseRepo.bootstrapChecklist).toHaveBeenCalledWith("case-1");
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("bootstrapSuccess"),
      }),
    );
  });

  it("shows error toast when bootstrap fails", async () => {
    toastAdd.mockClear();
    const caseRepo = stubCaseRepository({
      bootstrapChecklist: vi
        .fn()
        .mockRejectedValue(new Error("Template not found")),
    });
    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      documentTemplateMissing: ref(true),
      repository: stubRepository([]),
      caseRepository: caseRepo,
    });

    await tab.handleBootstrapChecklist();
    await flushPromises();

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "error",
      }),
    );
  });

  it("sets bootstrapping=true during the call", async () => {
    let resolveBootstrap: (v: { count: number }) => void = () => {};
    const bootstrapPromise = new Promise<{ count: number }>((r) => {
      resolveBootstrap = r;
    });
    const caseRepo = stubCaseRepository({
      bootstrapChecklist: vi.fn().mockReturnValue(bootstrapPromise),
    });

    const tab = useCaseDocumentsTab({
      caseId: ref("case-1"),
      isStorageRootConfigured: ref(true),
      documentTemplateMissing: ref(true),
      repository: stubRepository([]),
      caseRepository: caseRepo,
    });

    const p = tab.handleBootstrapChecklist();
    await nextTick();
    expect(tab.bootstrapping.value).toBe(true);

    resolveBootstrap({ count: 5 });
    await p;
    await nextTick();
    expect(tab.bootstrapping.value).toBe(false);
  });
});
