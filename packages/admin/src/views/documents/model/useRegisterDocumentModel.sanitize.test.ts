import { describe, it, expect, vi } from "vitest";
import type { DocumentListItem } from "../types";
import { useRegisterDocumentModel } from "./useRegisterDocumentModel";
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
    ...overrides,
  };
}

function stubRepository(): Pick<DocumentRepository, "uploadLocalArchive"> {
  return {
    uploadLocalArchive: vi.fn().mockResolvedValue({
      id: "file-1",
      requirementId: "doc-001",
      fileName: "file.pdf",
      fileUrl: null,
      relativePath: "case/doc/file.pdf",
      fileKey: "k1",
      versionNo: 1,
      storageType: "local_server",
      reviewStatus: "pending",
      reviewBy: null,
      reviewAt: null,
      expiryDate: null,
      uploadedBy: null,
      uploadedAt: "2026-04-30",
      createdAt: "2026-04-30",
    }),
  };
}

// 资料项名称可能含 `/`（例如「在留資格認定/変更許可申請書」），
// 若不在前端 sanitize，提交后服务端会把 fileName 改成下划线版本，
// 而 relativePath 保留原样，导致 fileName 与 relativePath 末段不一致。
describe("useRegisterDocumentModel — fileName sanitization", () => {
  it("sanitizes doc item name containing '/' so fileName matches path tail", async () => {
    const items = [
      makeItem({
        id: "d-slash",
        caseId: "c-slash",
        caseName: "案件S",
        status: "pending",
        name: "在留資格認定/変更許可申請書",
      }),
    ];
    const repository = stubRepository();
    const model = useRegisterDocumentModel({
      allItems: () => items,
      repository,
    });
    model.updateField("caseId", "c-slash");
    model.updateField("docItemId", "d-slash");
    model.updateField(
      "relativePath",
      "CASE-202605-0012/office/fs-application-form/",
    );
    await model.submit();
    const expectedFileName = "在留資格認定_変更許可申請書";
    const expectedFullPath =
      "CASE-202605-0012/office/fs-application-form/在留資格認定_変更許可申請書";
    expect(repository.uploadLocalArchive).toHaveBeenCalledWith({
      requirementId: "d-slash",
      fileName: expectedFileName,
      relativePath: expectedFullPath,
    });
  });

  it("sanitizes manually entered fileName containing '/'", async () => {
    const items = [
      makeItem({
        id: "d1",
        caseId: "c1",
        caseName: "案件A",
        status: "pending",
      }),
    ];
    const repository = stubRepository();
    const model = useRegisterDocumentModel({
      allItems: () => items,
      repository,
    });
    model.updateField("caseId", "c1");
    model.updateField("docItemId", "d1");
    model.updateField("relativePath", "A2026-001/applicant/passport/");
    model.updateField("fileName", "foo/bar.pdf");
    await model.submit();
    expect(repository.uploadLocalArchive).toHaveBeenCalledWith({
      requirementId: "d1",
      fileName: "foo_bar.pdf",
      relativePath: "A2026-001/applicant/passport/foo_bar.pdf",
    });
  });
});
