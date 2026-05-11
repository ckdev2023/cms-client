import { describe, expect, it } from "vitest";
import { buildChecklistPreviewSections } from "./buildChecklistPreviewSections";
import type { ChecklistPreviewLineItem } from "./checklistPreview.contract";

describe("buildChecklistPreviewSections", () => {
  it("按 providedByRole / ownerSide 分组，与 resolveProvider 语义一致", () => {
    const t = (k: string) => k;
    const lines: ChecklistPreviewLineItem[] = [
      {
        code: "fs-passport-copy",
        name: "パスポートコピー",
        ownerSide: "applicant",
        category: "personal",
        requiredFlag: true,
        providedByRole: "applicant",
      },
      {
        code: "fs-guarantee-letter",
        name: "身元保証書",
        ownerSide: "customer",
        category: "standard",
        requiredFlag: true,
        providedByRole: "supporter",
      },
      {
        code: "fs-application-form",
        name: "在留資格認定/変更許可申請書",
        ownerSide: "office",
        category: "standard",
        requiredFlag: true,
        providedByRole: "office",
      },
    ];
    const sections = buildChecklistPreviewSections(lines, "family", t);
    expect(sections.map((s) => s.provider)).toEqual([
      "main_applicant",
      "dependent_guarantor",
      "office_internal",
    ]);
    expect(sections[0]!.items.map((i) => i.name)).toEqual(["パスポートコピー"]);
    expect(sections[1]!.items.map((i) => i.name)).toEqual(["身元保証書"]);
    expect(sections[2]!.items.map((i) => i.name)).toEqual([
      "在留資格認定/変更許可申請書",
    ]);
  });
});
