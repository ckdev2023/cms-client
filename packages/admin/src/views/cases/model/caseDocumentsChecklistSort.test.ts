import { describe, expect, it } from "vitest";
import type { DocumentListItem } from "../../documents/types";
import { compareDocumentListItemsForChecklistStableOrder } from "./caseDocumentsChecklistSort";

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

describe("caseDocumentsChecklistSort — compareDocumentListItemsForChecklistStableOrder", () => {
  it("orders by checklistItemCode when both set", () => {
    const a = stubListItem({
      id: "a",
      name: "Z",
      provider: "main_applicant",
      checklistItemCode: "zebra",
    });
    const b = stubListItem({
      id: "b",
      name: "A",
      provider: "main_applicant",
      checklistItemCode: "apple",
    });
    expect(
      [a, b].sort(compareDocumentListItemsForChecklistStableOrder),
    ).toEqual([b, a]);
  });

  it("places missing checklistItemCode after defined codes", () => {
    const withCode = stubListItem({
      id: "w",
      name: "W",
      provider: "main_applicant",
      checklistItemCode: "x-code",
    });
    const missing = stubListItem({
      id: "m",
      name: "M",
      provider: "main_applicant",
    });
    expect(
      [missing, withCode].sort(compareDocumentListItemsForChecklistStableOrder),
    ).toEqual([withCode, missing]);
  });

  it("ties broken by name then id when codes equal", () => {
    const row1 = stubListItem({
      id: "id-b",
      name: "Beta",
      provider: "main_applicant",
      checklistItemCode: "same",
    });
    const row2 = stubListItem({
      id: "id-a",
      name: "Alpha",
      provider: "main_applicant",
      checklistItemCode: "same",
    });
    expect(
      [row1, row2].sort(compareDocumentListItemsForChecklistStableOrder),
    ).toEqual([row2, row1]);
  });
});
