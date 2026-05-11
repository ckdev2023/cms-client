import { describe, it, expect } from "vitest";
import {
  useCaseTemplatesListModel,
  mergeCaseTypeOptions,
} from "./useCaseTemplatesListModel";
import type {
  CaseTemplatesRepository,
  CaseTemplateItem,
  CaseTemplateListResult,
  CaseTypeOption,
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

const DEFAULT_CANONICAL: CaseTypeOption[] = [
  { code: "dependent_visa", sort: 0 },
  { code: "work", sort: 1 },
  { code: "business_manager_visa", sort: 2 },
];

function makeRepo(
  result: CaseTemplateListResult = { items: [] },
  opts: { shouldFail?: boolean; canonical?: CaseTypeOption[] } = {},
): CaseTemplatesRepository & { callCount: number } {
  let callCount = 0;
  return {
    get callCount() {
      return callCount;
    },
    list: async () => {
      callCount++;
      if (opts.shouldFail) {
        throw new Error("network error");
      }
      return result;
    },
    get: async () => ({
      ...makeItem(),
      requirementBlueprint: null,
      defaultTasksBlueprint: null,
    }),
    create: async () => makeItem(),
    update: async () => makeItem(),
    getCaseTypeOptions: async () => opts.canonical ?? DEFAULT_CANONICAL,
  };
}

describe("mergeCaseTypeOptions", () => {
  it("returns canonical codes in sort order", () => {
    const result = mergeCaseTypeOptions(
      [
        { code: "work", sort: 1 },
        { code: "dependent_visa", sort: 0 },
      ],
      [],
    );
    expect(result).toEqual(["dependent_visa", "work"]);
  });

  it("appends data codes not in canonical list", () => {
    const result = mergeCaseTypeOptions(
      [{ code: "dependent_visa", sort: 0 }],
      ["dependent_visa", "custom_type"],
    );
    expect(result).toEqual(["dependent_visa", "custom_type"]);
  });

  it("handles empty canonical list", () => {
    const result = mergeCaseTypeOptions([], ["b", "a"]);
    expect(result).toEqual(["a", "b"]);
  });

  it("deduplicates data codes present in canonical", () => {
    const result = mergeCaseTypeOptions(
      [
        { code: "a", sort: 0 },
        { code: "b", sort: 1 },
      ],
      ["a", "b", "c"],
    );
    expect(result).toEqual(["a", "b", "c"]);
  });
});

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
    const repo = makeRepo({ items: [] }, { shouldFail: true });
    const model = useCaseTemplatesListModel({ repository: repo });

    await new Promise((r) => setTimeout(r, 10));

    expect(model.items.value).toHaveLength(0);
    expect(model.errorCode.value).toBe("request_failed");
  });

  it("caseTypeOptions merges canonical with data codes", async () => {
    const items = [
      makeItem({ id: "t-1", caseType: "dependent_visa" }),
      makeItem({ id: "t-2", caseType: "custom_legacy" }),
    ];
    const repo = makeRepo({ items }, { canonical: DEFAULT_CANONICAL });
    const model = useCaseTemplatesListModel({ repository: repo });

    await new Promise((r) => setTimeout(r, 10));

    expect(model.caseTypeOptions.value).toEqual([
      "dependent_visa",
      "work",
      "business_manager_visa",
      "custom_legacy",
    ]);
  });

  it("caseTypeOptions shows canonical even with empty data", async () => {
    const repo = makeRepo({ items: [] }, { canonical: DEFAULT_CANONICAL });
    const model = useCaseTemplatesListModel({ repository: repo });

    await new Promise((r) => setTimeout(r, 10));

    expect(model.caseTypeOptions.value).toEqual([
      "dependent_visa",
      "work",
      "business_manager_visa",
    ]);
  });

  it("caseTypeOptions falls back to data codes when canonical fetch fails", async () => {
    const items = [
      makeItem({ id: "t-1", caseType: "dependent_visa" }),
      makeItem({ id: "t-2", caseType: "business_manager_visa" }),
    ];
    const repo = makeRepo({ items });
    repo.getCaseTypeOptions = async () => {
      throw new Error("fetch failed");
    };
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
