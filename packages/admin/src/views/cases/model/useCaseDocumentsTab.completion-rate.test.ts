import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, nextTick } from "vue";
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
  collected: 7,
  total: 10,
  percent: 70,
  label: "7/10",
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
    createItem: vi.fn(),
    ...overrides,
  };
}

function createTab(repo: DocumentRepository, caseId = "case-1") {
  const caseIdRef = ref(caseId);
  const tab = useCaseDocumentsTab({
    caseId: caseIdRef,
    isStorageRootConfigured: ref(true),
    repository: repo,
  });
  return { tab, caseIdRef };
}

describe("useCaseDocumentsTab — completion rate from API (C3)", () => {
  let repo: DocumentRepository;

  beforeEach(() => {
    repo = stubRepository();
  });

  it("fetches completion rate from API on mount", async () => {
    const { tab } = createTab(repo);
    await flushPromises();

    expect(repo.getCompletionRate).toHaveBeenCalledWith("case-1");
    expect(tab.apiCompletionRate.value).toEqual(API_RATE);
  });

  it("re-fetches completion rate when caseId changes", async () => {
    const { caseIdRef } = createTab(repo);
    await flushPromises();

    expect(repo.getCompletionRate).toHaveBeenCalledTimes(1);

    caseIdRef.value = "case-2";
    await nextTick();
    await flushPromises();

    expect(repo.getCompletionRate).toHaveBeenCalledWith("case-2");
    expect(repo.getCompletionRate).toHaveBeenCalledTimes(2);
  });

  it("sets apiCompletionRate to null when API fails (fallback path)", async () => {
    const failingRepo = stubRepository({
      getCompletionRate: vi.fn().mockRejectedValue(new Error("network")),
    });
    const { tab } = createTab(failingRepo);
    await flushPromises();

    expect(failingRepo.getCompletionRate).toHaveBeenCalledTimes(1);
    expect(tab.apiCompletionRate.value).toBeNull();
  });

  it("exposes hasApiData from listModel source", async () => {
    const { tab } = createTab(repo);
    await flushPromises();

    expect(typeof tab.hasApiData.value).toBe("boolean");
  });
});
