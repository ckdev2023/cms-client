import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAddDocumentItemModel } from "./useAddDocumentItemModel";
import type { DocumentRepository } from "./DocumentRepositoryTypes";

function stubRepository(): Pick<DocumentRepository, "createItem"> {
  return {
    createItem: vi.fn().mockResolvedValue({
      id: "new-item-1",
      caseId: "case-1",
      name: "在留カード",
      status: "pending",
      ownerSide: "main_applicant",
      dueAt: null,
      lastFollowUpAt: null,
      waiveReasonCodeLatest: null,
      waiveReasonLatest: null,
      waivedAtLatest: null,
      waivedByUserIdLatest: null,
    }),
  };
}

function create() {
  const repository = stubRepository();
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const model = useAddDocumentItemModel({
    repository: repository as unknown as DocumentRepository,
    onSuccess,
    onError,
  });
  return { model, repository, onSuccess, onError };
}

describe("useAddDocumentItemModel — initial state", () => {
  it("starts closed with empty form", () => {
    const { model } = create();
    expect(model.open.value).toBe(false);
    expect(model.form.value.name).toBe("");
    expect(model.form.value.ownerSide).toBe("");
    expect(model.form.value.dueAt).toBe("");
    expect(model.form.value.note).toBe("");
    expect(model.canSubmit.value).toBe(false);
    expect(model.submitting.value).toBe(false);
  });
});

describe("useAddDocumentItemModel — open/close", () => {
  it("opens with empty form", () => {
    const { model } = create();
    model.openModal("case-1");
    expect(model.open.value).toBe(true);
    expect(model.form.value.name).toBe("");
  });

  it("resets form on re-open", () => {
    const { model } = create();
    model.openModal("case-1");
    model.updateField("name", "test");
    model.closeModal();
    model.openModal("case-2");
    expect(model.form.value.name).toBe("");
  });

  it("closes via closeModal", () => {
    const { model } = create();
    model.openModal("case-1");
    model.closeModal();
    expect(model.open.value).toBe(false);
  });
});

describe("useAddDocumentItemModel — canSubmit", () => {
  it("requires name and ownerSide", () => {
    const { model } = create();
    model.openModal("case-1");
    expect(model.canSubmit.value).toBe(false);

    model.updateField("name", "パスポート写し");
    expect(model.canSubmit.value).toBe(false);

    model.updateField("ownerSide", "main_applicant");
    expect(model.canSubmit.value).toBe(true);
  });

  it("is false when name is only whitespace", () => {
    const { model } = create();
    model.openModal("case-1");
    model.updateField("name", "   ");
    model.updateField("ownerSide", "main_applicant");
    expect(model.canSubmit.value).toBe(false);
  });
});

describe("useAddDocumentItemModel — submit", () => {
  let ctx: ReturnType<typeof create>;

  beforeEach(() => {
    ctx = create();
    vi.stubGlobal("crypto", {
      randomUUID: () => "00000000-0000-0000-0000-000000000000",
    });
  });

  it("calls repository.createItem with correct params", async () => {
    const { model, repository, onSuccess } = ctx;
    model.openModal("case-1");
    model.updateField("name", "在留カード");
    model.updateField("ownerSide", "main_applicant");
    model.updateField("dueAt", "2026-06-01");
    model.updateField("note", "備考テスト");

    await model.submit();

    expect(repository.createItem).toHaveBeenCalledWith({
      caseId: "case-1",
      checklistItemCode: "manual:00000000-0000-0000-0000-000000000000",
      name: "在留カード",
      ownerSide: "main_applicant",
      dueAt: "2026-06-01",
      note: "備考テスト",
      category: "standard",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(model.open.value).toBe(false);
  });

  it("sends null for empty optional fields", async () => {
    const { model, repository } = ctx;
    model.openModal("case-1");
    model.updateField("name", "テスト資料");
    model.updateField("ownerSide", "employer_org");

    await model.submit();

    expect(repository.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        dueAt: null,
        note: null,
      }),
    );
  });

  it("calls onError on repository failure", async () => {
    const { model, repository, onSuccess, onError } = ctx;
    const err = new Error("Network error");
    (repository.createItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      err,
    );

    model.openModal("case-1");
    model.updateField("name", "テスト");
    model.updateField("ownerSide", "main_applicant");

    await model.submit();

    expect(onError).toHaveBeenCalledWith(err);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(model.open.value).toBe(true);
  });

  it("does nothing when canSubmit is false", async () => {
    const { model, repository } = ctx;
    model.openModal("case-1");

    await model.submit();

    expect(repository.createItem).not.toHaveBeenCalled();
  });

  it("resets submitting after success", async () => {
    const { model } = ctx;
    model.openModal("case-1");
    model.updateField("name", "テスト");
    model.updateField("ownerSide", "main_applicant");

    await model.submit();

    expect(model.submitting.value).toBe(false);
  });

  it("resets submitting after failure", async () => {
    const { model, repository } = ctx;
    (repository.createItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("fail"),
    );
    model.openModal("case-1");
    model.updateField("name", "テスト");
    model.updateField("ownerSide", "main_applicant");

    await model.submit();

    expect(model.submitting.value).toBe(false);
  });
});
