import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
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

function stubListItem(
  partial: Pick<DocumentListItem, "id" | "name" | "provider"> &
    Partial<DocumentListItem>,
): DocumentListItem {
  return {
    caseId: "c1",
    caseName: "Case",
    status: "pending",
    dueDate: null,
    dueDateLabel: "—",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 0,
    ...partial,
  };
}

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
    getCompletionRate: vi.fn().mockResolvedValue(null),
    createItem: vi.fn(),
    ...overrides,
  };
}

describe("useCaseDocumentsTab — checklist-stable order within provider group", () => {
  let repo: DocumentRepository;

  beforeEach(() => {
    const items: DocumentListItem[] = [
      stubListItem({
        id: "3",
        name: "履历书",
        provider: "main_applicant",
        checklistItemCode: "bmv-resume",
      }),
      stubListItem({
        id: "1",
        name: "パスポートコピー",
        provider: "main_applicant",
        checklistItemCode: "bmv-passport-copy",
      }),
      stubListItem({
        id: "2",
        name: "証明写真",
        provider: "main_applicant",
        checklistItemCode: "bmv-photo",
      }),
      stubListItem({
        id: "o1",
        name: "事業計画書",
        provider: "office_internal",
        checklistItemCode: "bmv-biz-plan",
      }),
      stubListItem({
        id: "o2",
        name: "事業概要説明書",
        provider: "office_internal",
        checklistItemCode: "bmv-biz-outline",
      }),
    ];

    repo = stubRepository({
      listDocuments: vi.fn().mockResolvedValue({ items, total: items.length }),
    });
  });

  it("sorts rows inside each group by checklistItemCode independent of API row order", async () => {
    const tab = useCaseDocumentsTab({
      caseId: ref("case-x"),
      isStorageRootConfigured: ref(true),
      repository: repo,
    });
    await flushPromises();

    const main = tab.documentGroups.value.find((g) =>
      g.group.includes("mainApplicant"),
    );
    expect(main).toBeTruthy();
    expect(main!.items.map((d) => d.name)).toEqual([
      "パスポートコピー",
      "証明写真",
      "履历书",
    ]);

    const office = tab.documentGroups.value.find((g) =>
      g.group.includes("officeInternal"),
    );
    expect(office).toBeTruthy();
    expect(office!.items.map((d) => d.name)).toEqual([
      "事業概要説明書",
      "事業計画書",
    ]);
  });
});
