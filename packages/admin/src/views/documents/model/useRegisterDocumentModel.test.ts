import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import type { DocumentListItem } from "../types";
import type { RegisterDocumentForm } from "./useRegisterDocumentModel";
import { useRegisterDocumentModel } from "./useRegisterDocumentModel";

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

const ITEMS: DocumentListItem[] = [
  makeItem({ id: "d1", caseId: "c1", caseName: "案件A", status: "pending" }),
  makeItem({
    id: "d2",
    caseId: "c1",
    caseName: "案件A",
    status: "uploaded_reviewing",
  }),
  makeItem({
    id: "d3",
    caseId: "c1",
    caseName: "案件A",
    status: "approved",
    referenceCount: 2,
  }),
  makeItem({ id: "d4", caseId: "c1", caseName: "案件A", status: "waived" }),
  makeItem({ id: "d5", caseId: "c2", caseName: "案件B", status: "rejected" }),
  makeItem({ id: "d6", caseId: "c2", caseName: "案件B", status: "expired" }),
];

function create() {
  const onSubmit =
    vi.fn<(form: RegisterDocumentForm, version: number) => void>();
  const model = useRegisterDocumentModel({
    allItems: () => ITEMS,
    onSubmit,
  });
  return { model, onSubmit };
}

// ─── Initial state ──────────────────────────────────────────────

describe("useRegisterDocumentModel — initial state", () => {
  it("starts closed with empty form", () => {
    const { model } = create();
    expect(model.open.value).toBe(false);
    expect(model.form.value.caseId).toBe("");
    expect(model.form.value.docItemId).toBe("");
    expect(model.form.value.relativePath).toBe("");
    expect(model.form.value.fileName).toBe("");
  });

  it("canSubmit is false initially", () => {
    const { model } = create();
    expect(model.canSubmit.value).toBe(false);
  });

  it("pathError is null when relativePath is empty", () => {
    const { model } = create();
    expect(model.pathError.value).toBeNull();
  });
});

// ─── openModal / closeModal ──────────────────────────────────────

describe("useRegisterDocumentModel — open/close", () => {
  it("openModal sets open to true", () => {
    const { model } = create();
    model.openModal();
    expect(model.open.value).toBe(true);
  });

  it("closeModal sets open to false", () => {
    const { model } = create();
    model.openModal();
    model.closeModal();
    expect(model.open.value).toBe(false);
  });

  it("openModal resets form before opening", () => {
    const { model } = create();
    model.updateField("caseId", "c1");
    model.updateField("relativePath", "test/path.pdf");
    model.openModal();
    expect(model.form.value.caseId).toBe("");
    expect(model.form.value.relativePath).toBe("");
  });

  it("openModal with prefilled caseId", () => {
    const { model } = create();
    model.openModal("c1");
    expect(model.form.value.caseId).toBe("c1");
    expect(model.form.value.docItemId).toBe("");
  });

  it("openModal with prefilled caseId and docId", () => {
    const { model } = create();
    model.openModal("c1", "d1");
    expect(model.form.value.caseId).toBe("c1");
    expect(model.form.value.docItemId).toBe("d1");
  });
});

// ─── caseOptions ────────────────────────────────────────────────

describe("useRegisterDocumentModel — caseOptions", () => {
  it("derives unique case options from items", () => {
    const { model } = create();
    const opts = model.caseOptions.value;
    expect(opts).toHaveLength(2);
    expect(opts[0]).toEqual({ value: "c1", label: "案件A" });
    expect(opts[1]).toEqual({ value: "c2", label: "案件B" });
  });
});

// ─── docItemOptions ─────────────────────────────────────────────

describe("useRegisterDocumentModel — docItemOptions", () => {
  it("returns empty when no case selected", () => {
    const { model } = create();
    expect(model.docItemOptions.value).toHaveLength(0);
  });

  it("excludes approved and waived items for selected case", () => {
    const { model } = create();
    model.updateField("caseId", "c1");
    const opts = model.docItemOptions.value;
    const ids = opts.map((o) => o.value);
    expect(ids).toContain("d1");
    expect(ids).toContain("d2");
    expect(ids).not.toContain("d3");
    expect(ids).not.toContain("d4");
  });

  it("returns items for the second case", () => {
    const { model } = create();
    model.updateField("caseId", "c2");
    const opts = model.docItemOptions.value;
    expect(opts).toHaveLength(2);
    expect(opts.map((o) => o.value)).toEqual(["d5", "d6"]);
  });
});

// ─── Case change resets docItemId ───────────────────────────────

describe("useRegisterDocumentModel — case change resets docItem", () => {
  it("clears docItemId when caseId changes", async () => {
    const { model } = create();
    model.updateField("caseId", "c1");
    model.updateField("docItemId", "d1");
    model.updateField("caseId", "c2");
    await nextTick();
    expect(model.form.value.docItemId).toBe("");
  });
});

// ─── pathError ──────────────────────────────────────────────────

describe("useRegisterDocumentModel — pathError", () => {
  it("returns null for valid path", () => {
    const { model } = create();
    model.updateField("relativePath", "case/doc/file.pdf");
    expect(model.pathError.value).toBeNull();
  });

  it("returns error for path with ..", () => {
    const { model } = create();
    model.updateField("relativePath", "../secret");
    expect(model.pathError.value).toBeTruthy();
  });

  it("returns error for absolute path", () => {
    const { model } = create();
    model.updateField("relativePath", "/etc/passwd");
    expect(model.pathError.value).toBeTruthy();
  });

  it("returns error for path starting with ~", () => {
    const { model } = create();
    model.updateField("relativePath", "~/docs/file.pdf");
    expect(model.pathError.value).toBeTruthy();
  });

  it("returns null when path is empty (no eager validation)", () => {
    const { model } = create();
    model.updateField("relativePath", "");
    expect(model.pathError.value).toBeNull();
  });
});

// ─── Auto-derive fileName from relativePath ─────────────────────

describe("useRegisterDocumentModel — auto fileName", () => {
  it("derives fileName from path tail", async () => {
    const { model } = create();
    model.updateField("relativePath", "case/doc/passport.pdf");
    await nextTick();
    expect(model.form.value.fileName).toBe("passport.pdf");
  });

  it("does not override fileName once manually edited", async () => {
    const { model } = create();
    model.updateField("fileName", "my-custom-name.pdf");
    model.updateField("relativePath", "case/doc/passport.pdf");
    await nextTick();
    expect(model.form.value.fileName).toBe("my-custom-name.pdf");
  });

  it("clears fileName when path cleared and not manually edited", async () => {
    const { model } = create();
    model.updateField("relativePath", "case/doc/passport.pdf");
    await nextTick();
    expect(model.form.value.fileName).toBe("passport.pdf");
    model.fileNameManuallyEdited.value = false;
    model.updateField("relativePath", "");
    await nextTick();
    expect(model.form.value.fileName).toBe("");
  });
});

// ─── version ────────────────────────────────────────────────────

describe("useRegisterDocumentModel — version", () => {
  it("defaults to 1 when no doc item selected", () => {
    const { model } = create();
    expect(model.version.value).toBe(1);
  });

  it("computes version from referenceCount + 1", () => {
    const { model } = create();
    model.updateField("caseId", "c1");
    model.updateField("docItemId", "d3");
    expect(model.version.value).toBe(3);
  });

  it("versionLabel includes version number", () => {
    const { model } = create();
    expect(model.versionLabel.value).toContain("v1");
  });
});

// ─── canSubmit ──────────────────────────────────────────────────

describe("useRegisterDocumentModel — canSubmit", () => {
  it("false when caseId missing", () => {
    const { model } = create();
    model.updateField("docItemId", "d1");
    model.updateField("relativePath", "valid/path.pdf");
    expect(model.canSubmit.value).toBe(false);
  });

  it("false when docItemId missing", () => {
    const { model } = create();
    model.updateField("caseId", "c1");
    model.updateField("relativePath", "valid/path.pdf");
    expect(model.canSubmit.value).toBe(false);
  });

  it("false when relativePath missing", () => {
    const { model } = create();
    model.updateField("caseId", "c1");
    model.updateField("docItemId", "d1");
    expect(model.canSubmit.value).toBe(false);
  });

  it("false when relativePath is invalid", () => {
    const { model } = create();
    model.updateField("caseId", "c1");
    model.updateField("docItemId", "d1");
    model.updateField("relativePath", "../bad");
    expect(model.canSubmit.value).toBe(false);
  });

  it("true when all required fields are valid", () => {
    const { model } = create();
    model.updateField("caseId", "c1");
    model.updateField("docItemId", "d1");
    model.updateField("relativePath", "A2026-001/main/passport.pdf");
    expect(model.canSubmit.value).toBe(true);
  });
});

// ─── submit ─────────────────────────────────────────────────────

describe("useRegisterDocumentModel — submit", () => {
  it("calls onSubmit with form data and version", () => {
    const { model, onSubmit } = create();
    model.updateField("caseId", "c1");
    model.updateField("docItemId", "d1");
    model.updateField("relativePath", "case/doc/file.pdf");
    model.submit();
    expect(onSubmit).toHaveBeenCalledOnce();
    const [formArg, versionArg] = onSubmit.mock.calls[0];
    expect(formArg.caseId).toBe("c1");
    expect(formArg.docItemId).toBe("d1");
    expect(formArg.relativePath).toBe("case/doc/file.pdf");
    expect(versionArg).toBe(1);
  });

  it("closes the modal after submit", () => {
    const { model } = create();
    model.openModal();
    model.updateField("caseId", "c1");
    model.updateField("docItemId", "d1");
    model.updateField("relativePath", "case/doc/file.pdf");
    model.submit();
    expect(model.open.value).toBe(false);
  });

  it("does nothing when canSubmit is false", () => {
    const { model, onSubmit } = create();
    model.submit();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
