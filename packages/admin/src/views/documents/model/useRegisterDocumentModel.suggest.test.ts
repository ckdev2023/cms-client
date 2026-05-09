import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import type { DocumentListItem } from "../types";
import {
  suggestPath,
  useRegisterDocumentModel,
} from "./useRegisterDocumentModel";
import type { DocumentRepository } from "./DocumentRepositoryTypes";

function makeItem(overrides: Partial<DocumentListItem> = {}): DocumentListItem {
  return {
    id: "doc-001",
    name: "パスポート写し",
    caseId: "case-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "main_applicant",
    status: "pending",
    dueDate: null,
    dueDateLabel: "—",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 0,
    checklistItemCode: "fs-passport-copy",
    ...overrides,
  };
}

function stubRepository(): Pick<DocumentRepository, "uploadLocalArchive"> {
  return {
    uploadLocalArchive: vi.fn().mockResolvedValue({
      id: "file-1",
      requirementId: "doc-001",
      relativePath: "test/path.pdf",
      fileName: "path.pdf",
    }),
  };
}

describe("suggestPath", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates correct template path", () => {
    const result = suggestPath({
      caseNo: "A2026-001",
      ownerSide: "applicant",
      checklistItemCode: "fs-passport-copy",
      fileName: "passport_front.pdf",
    });
    expect(result).toBe(
      "A2026-001/applicant/fs-passport-copy/20260508_passport_front.pdf",
    );
  });

  it("sanitizes unsafe characters in fileName", () => {
    const result = suggestPath({
      caseNo: "A2026-002",
      ownerSide: "office",
      checklistItemCode: "biz-plan",
      fileName: 'file:name*"test?.PDF',
    });
    expect(result).toBe(
      "A2026-002/office/biz-plan/20260508_file_name__test_.pdf",
    );
  });

  it("lowercases file extension", () => {
    const result = suggestPath({
      caseNo: "A2026-003",
      ownerSide: "employer",
      checklistItemCode: "employment-cert",
      fileName: "Contract.PDF",
    });
    expect(result).toMatch(/\.pdf$/);
    expect(result).toBe(
      "A2026-003/employer/employment-cert/20260508_Contract.pdf",
    );
  });

  it("returns empty string when any required input is missing", () => {
    expect(
      suggestPath({
        caseNo: "",
        ownerSide: "applicant",
        checklistItemCode: "fs-passport",
        fileName: "test.pdf",
      }),
    ).toBe("");
    expect(
      suggestPath({
        caseNo: "A2026-001",
        ownerSide: "",
        checklistItemCode: "fs-passport",
        fileName: "test.pdf",
      }),
    ).toBe("");
    expect(
      suggestPath({
        caseNo: "A2026-001",
        ownerSide: "applicant",
        checklistItemCode: "",
        fileName: "test.pdf",
      }),
    ).toBe("");
    expect(
      suggestPath({
        caseNo: "A2026-001",
        ownerSide: "applicant",
        checklistItemCode: "fs-passport",
        fileName: "",
      }),
    ).toBe("");
  });
});

describe("useRegisterDocumentModel – path suggestion watcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const ITEMS: DocumentListItem[] = [
    makeItem({
      id: "d1",
      caseId: "c1",
      caseName: "案件A",
      provider: "main_applicant",
      checklistItemCode: "fs-passport-copy",
    }),
    makeItem({
      id: "d2",
      caseId: "c1",
      caseName: "案件A",
      provider: "employer_org",
      checklistItemCode: "employment-cert",
    }),
  ];

  function setup() {
    const caseNoLookup = vi.fn((caseId: string) =>
      caseId === "c1" ? "A2026-001" : null,
    );
    const itemMetaLookup = vi.fn((docItemId: string) => {
      const item = ITEMS.find((i) => i.id === docItemId);
      if (!item) return null;
      const mapping: Record<string, string> = {
        main_applicant: "applicant",
        employer_org: "employer",
      };
      return {
        ownerSide: mapping[item.provider] ?? "applicant",
        checklistItemCode: item.checklistItemCode ?? "doc",
      };
    });

    const model = useRegisterDocumentModel({
      allItems: () => ITEMS,
      repository: stubRepository(),
      caseNoLookup,
      itemMetaLookup,
    });
    return { model, caseNoLookup, itemMetaLookup };
  }

  it("suggestedPath computed reflects selected case and doc item", async () => {
    const { model } = setup();
    model.openModal("c1", "d1");
    await nextTick();
    expect(model.suggestedPath.value).toBe(
      "A2026-001/applicant/fs-passport-copy",
    );
  });

  it("does not auto-fill path when user has manually edited", async () => {
    const { model } = setup();
    model.openModal("c1");
    await nextTick();

    model.updateField("relativePath", "custom/path.pdf");
    await nextTick();
    expect(model.pathManuallyEdited.value).toBe(true);

    model.updateField("docItemId", "d1");
    await nextTick();
    expect(model.form.value.relativePath).toBe("custom/path.pdf");
  });

  it("applySuggestedPath fills the base path prefix", async () => {
    const { model } = setup();
    model.openModal("c1", "d1");
    await nextTick();

    model.applySuggestedPath();
    expect(model.form.value.relativePath).toBe(
      "A2026-001/applicant/fs-passport-copy/",
    );
    expect(model.pathManuallyEdited.value).toBe(false);
  });

  it("resetPath clears the path and resets manual flag", async () => {
    const { model } = setup();
    model.openModal("c1", "d1");
    await nextTick();

    model.updateField("relativePath", "some/path.pdf");
    expect(model.pathManuallyEdited.value).toBe(true);

    model.resetPath();
    expect(model.form.value.relativePath).toBe("");
    expect(model.pathManuallyEdited.value).toBe(false);
  });

  it("caseId switch resets docItemId and suggestion updates", async () => {
    const { model, caseNoLookup } = setup();
    model.openModal("c1", "d1");
    await nextTick();
    expect(model.suggestedPath.value).toBe(
      "A2026-001/applicant/fs-passport-copy",
    );

    caseNoLookup.mockReturnValue(null);
    model.updateField("caseId", "c2");
    await nextTick();
    expect(model.form.value.docItemId).toBe("");
    expect(model.suggestedPath.value).toBe("");
  });

  it("first registration (referenceCount=0) shows v1", async () => {
    const { model } = setup();
    model.openModal("c1", "d1");
    await nextTick();

    expect(model.version.value).toBe(1);
    expect(model.versionLabel.value).toContain("v1");
  });
});
