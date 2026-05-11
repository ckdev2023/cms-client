import { describe, expect, it, vi } from "vitest";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../constants";
import type { CaseRepository } from "./CaseRepository";

function createDeps(
  overrides: Partial<UseCreateCaseModelDeps> = {},
): UseCreateCaseModelDeps {
  return {
    templates: () => SAMPLE_CREATE_TEMPLATES,
    customers: () => SAMPLE_CREATE_CUSTOMERS,
    familyScenario: () => FAMILY_SCENARIO,
    ownerOptions: () => CASE_OWNER_OPTIONS,
    groupOptions: () => CASE_GROUP_OPTIONS,
    sourceContext: { customerId: "cust-001", familyBulkMode: false },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    ...overrides,
  };
}

function stubRepoWithChecklistCount(count: number): CaseRepository {
  return {
    previewChecklistCount: vi.fn(async () => ({ count, requiredCount: count })),
    createCase: vi.fn(async () => ({ id: "CASE-001" })),
    createCaseParty: vi.fn(async () => ({ id: "party-stub" })),
  } as unknown as CaseRepository;
}

function fillDraftForSubmit(m: ReturnType<typeof useCreateCaseModel>) {
  m.setDueDate("2026-05-01");
  m.setAmount("120000");
}

describe("useCreateCaseModel: checklist preflight", () => {
  it("blocks canSubmit when checklist preview returns 0", async () => {
    const repo = stubRepoWithChecklistCount(0);
    const m = useCreateCaseModel(createDeps({ repo }));
    fillDraftForSubmit(m);

    await vi.waitFor(() => {
      expect(m.checklistPreview.previewState.value).toBe("empty");
    });

    expect(m.checklistPreview.checklistEmpty.value).toBe(true);
    expect(m.canSubmit.value).toBe(false);
  });

  it("allows canSubmit when preview is empty but autoChecklist is off", async () => {
    const repo = stubRepoWithChecklistCount(0);
    const m = useCreateCaseModel(createDeps({ repo }));
    m.setAutoChecklist(false);
    fillDraftForSubmit(m);

    await vi.waitFor(() => {
      expect(m.checklistPreview.previewState.value).toBe("empty");
    });

    expect(m.canSubmit.value).toBe(true);
  });

  it("allows canSubmit when checklist preview returns > 0", async () => {
    const repo = stubRepoWithChecklistCount(5);
    const m = useCreateCaseModel(createDeps({ repo }));
    fillDraftForSubmit(m);

    await vi.waitFor(() => {
      expect(m.checklistPreview.previewState.value).toBe("ok");
    });

    expect(m.checklistPreview.checklistEmpty.value).toBe(false);
    expect(m.canSubmit.value).toBe(true);
  });

  it("refetches checklist preview when advancing from step 1 to 2", async () => {
    const previewChecklistCount = vi
      .fn()
      .mockResolvedValueOnce({ count: 0, requiredCount: 0, items: [] })
      .mockResolvedValueOnce({
        count: 5,
        requiredCount: 4,
        items: [],
      });
    const repo = {
      previewChecklistCount,
      createCase: vi.fn(async () => ({ id: "CASE-001" })),
      createCaseParty: vi.fn(async () => ({ id: "party-stub" })),
    } as unknown as CaseRepository;

    const m = useCreateCaseModel(createDeps({ repo }));

    await vi.waitFor(() => {
      expect(m.checklistPreview.previewState.value).toBe("empty");
    });
    expect(previewChecklistCount).toHaveBeenCalledTimes(1);

    m.goNext();

    await vi.waitFor(() => {
      expect(m.draft.currentStep).toBe(2);
    });
    await vi.waitFor(() => {
      expect(m.checklistPreview.previewState.value).toBe("ok");
    });
    expect(previewChecklistCount).toHaveBeenCalledTimes(2);
  });

  it("exposes checklistPreview state on the model", () => {
    const repo = stubRepoWithChecklistCount(3);
    const m = useCreateCaseModel(createDeps({ repo }));

    expect(m.checklistPreview).toBeDefined();
    expect(m.checklistPreview.checklistCount).toBeDefined();
    expect(m.checklistPreview.checklistRequiredCount).toBeDefined();
    expect(m.checklistPreview.previewState).toBeDefined();
    expect(m.checklistPreview.checklistEmpty).toBeDefined();
  });

  it("blocks canSubmit on preview error until preflight succeeds", async () => {
    const repo = {
      previewChecklistCount: vi.fn(async () => {
        throw new Error("network error");
      }),
      createCase: vi.fn(async () => ({ id: "CASE-002" })),
      createCaseParty: vi.fn(async () => ({ id: "party-stub" })),
    } as unknown as CaseRepository;

    const m = useCreateCaseModel(createDeps({ repo }));
    fillDraftForSubmit(m);

    await vi.waitFor(() => {
      expect(m.checklistPreview.previewState.value).toBe("error");
    });

    expect(m.checklistPreview.checklistEmpty.value).toBe(false);
    expect(m.canSubmit.value).toBe(false);
  });

  it("allows canSubmit on preview error when autoChecklist is off", async () => {
    const repo = {
      previewChecklistCount: vi.fn(async () => {
        throw new Error("network error");
      }),
      createCase: vi.fn(async () => ({ id: "CASE-002" })),
      createCaseParty: vi.fn(async () => ({ id: "party-stub" })),
    } as unknown as CaseRepository;

    const m = useCreateCaseModel(createDeps({ repo }));
    m.setAutoChecklist(false);
    fillDraftForSubmit(m);

    await vi.waitFor(() => {
      expect(m.checklistPreview.previewState.value).toBe("error");
    });

    expect(m.canSubmit.value).toBe(true);
  });
});
