import { describe, it, expect } from "vitest";
import { useCaseTemplatesListModel } from "./useCaseTemplatesListModel";
import type {
  CaseTemplatesRepository,
  CaseTemplateItem,
  CaseTemplateListResult,
} from "./CaseTemplatesRepository";

function makeItem(overrides: Partial<CaseTemplateItem> = {}): CaseTemplateItem {
  return {
    id: "t-1",
    orgId: "org-1",
    templateName: "Test template",
    caseType: "dependent_visa",
    applicationType: null,
    blueprintItemCount: 3,
    reviewRequiredFlag: false,
    billingGateMode: "warn",
    activeFlag: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeRepo(
  result: CaseTemplateListResult = { items: [] },
  shouldFail = false,
): CaseTemplatesRepository & { callCount: number } {
  let callCount = 0;
  return {
    get callCount() {
      return callCount;
    },
    list: async () => {
      callCount++;
      if (shouldFail) {
        throw new Error("network error");
      }
      return result;
    },
    create: async () => makeItem(),
    update: async () => makeItem(),
  };
}

describe("useCaseTemplatesListModel", () => {
  it("loads items on initialization", async () => {
    const items = [
      makeItem({ id: "t-1", caseType: "dependent_visa" }),
      makeItem({ id: "t-2", caseType: "business_manager_visa" }),
    ];
    const repo = makeRepo({ items });
    const model = useCaseTemplatesListModel({ repository: repo });

    await new Promise((r) => setTimeout(r, 10));

    expect(model.items.value).toHaveLength(2);
    expect(model.loading.value).toBe(false);
    expect(model.errorCode.value).toBeNull();
  });

  it("sets error code on failure", async () => {
    const repo = makeRepo({ items: [] }, true);
    const model = useCaseTemplatesListModel({ repository: repo });

    await new Promise((r) => setTimeout(r, 10));

    expect(model.items.value).toHaveLength(0);
    expect(model.errorCode.value).toBe("request_failed");
  });

  it("caseTypeOptions derived from items", async () => {
    const items = [
      makeItem({ id: "t-1", caseType: "dependent_visa" }),
      makeItem({ id: "t-2", caseType: "business_manager_visa" }),
      makeItem({ id: "t-3", caseType: "dependent_visa" }),
    ];
    const repo = makeRepo({ items });
    const model = useCaseTemplatesListModel({ repository: repo });

    await new Promise((r) => setTimeout(r, 10));

    expect(model.caseTypeOptions.value).toEqual([
      "business_manager_visa",
      "dependent_visa",
    ]);
  });

  it("refresh calls repository again", async () => {
    const repo = makeRepo({
      items: [makeItem({ id: "t-1" })],
    });
    const model = useCaseTemplatesListModel({ repository: repo });

    await new Promise((r) => setTimeout(r, 10));
    expect(repo.callCount).toBe(1);

    model.refresh({ includeInactive: true });
    await new Promise((r) => setTimeout(r, 10));
    expect(repo.callCount).toBe(2);
  });
});
