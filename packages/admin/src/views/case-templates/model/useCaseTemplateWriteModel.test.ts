import { describe, it, expect, vi } from "vitest";
import { useCaseTemplateWriteModel } from "./useCaseTemplateWriteModel";
import { RepositoryError } from "../../../shared/api/repositoryRuntime";
import type {
  CaseTemplatesRepository,
  CaseTemplateItem,
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
  overrides: Partial<CaseTemplatesRepository> = {},
): CaseTemplatesRepository {
  return {
    list: async () => ({ items: [] }),
    create: async () => makeItem({ id: "t-new" }),
    update: async (_id, params) =>
      makeItem({ ...params, id: "t-1" } as Partial<CaseTemplateItem>),
    ...overrides,
  };
}

describe("useCaseTemplateWriteModel", () => {
  it("create succeeds and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const repo = makeRepo();
    const model = useCaseTemplateWriteModel({ repository: repo, onSuccess });

    const ok = await model.create({
      templateName: "New",
      caseType: "dependent_visa",
    });

    expect(ok).toBe(true);
    expect(model.saving.value).toBe(false);
    expect(model.errorCode.value).toBeNull();
    expect(model.lastSavedItem.value?.id).toBe("t-new");
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("create sets errorCode on unauthorized", async () => {
    const repo = makeRepo({
      create: async () => {
        throw new RepositoryError({ code: "UNAUTHORIZED", message: "denied" });
      },
    });
    const model = useCaseTemplateWriteModel({ repository: repo });

    const ok = await model.create({
      templateName: "X",
      caseType: "bmv",
    });

    expect(ok).toBe(false);
    expect(model.errorCode.value).toBe("unauthorized");
    expect(model.lastSavedItem.value).toBeNull();
  });

  it("create sets errorCode on validation error", async () => {
    const repo = makeRepo({
      create: async () => {
        throw new RepositoryError({
          code: "VALIDATION_ERROR",
          message: "bad input",
        });
      },
    });
    const model = useCaseTemplateWriteModel({ repository: repo });

    const ok = await model.create({
      templateName: "",
      caseType: "bmv",
    });

    expect(ok).toBe(false);
    expect(model.errorCode.value).toBe("validation");
  });

  it("create sets request_failed on generic error", async () => {
    const repo = makeRepo({
      create: async () => {
        throw new Error("network down");
      },
    });
    const model = useCaseTemplateWriteModel({ repository: repo });

    const ok = await model.create({
      templateName: "X",
      caseType: "bmv",
    });

    expect(ok).toBe(false);
    expect(model.errorCode.value).toBe("request_failed");
  });

  it("update succeeds and returns updated item", async () => {
    const onSuccess = vi.fn();
    const repo = makeRepo();
    const model = useCaseTemplateWriteModel({ repository: repo, onSuccess });

    const ok = await model.update("t-1", { templateName: "Updated" });

    expect(ok).toBe(true);
    expect(model.lastSavedItem.value?.id).toBe("t-1");
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("update sets errorCode on failure", async () => {
    const repo = makeRepo({
      update: async () => {
        throw new RepositoryError({
          code: "BAD_RESPONSE",
          message: "server error",
        });
      },
    });
    const model = useCaseTemplateWriteModel({ repository: repo });

    const ok = await model.update("t-1", { templateName: "X" });

    expect(ok).toBe(false);
    expect(model.errorCode.value).toBe("request_failed");
  });

  it("toggleActive flips activeFlag", async () => {
    let calledParams: Record<string, unknown> | undefined;
    const repo = makeRepo({
      update: async (_id, params) => {
        calledParams = params as Record<string, unknown>;
        return makeItem({ activeFlag: false });
      },
    });
    const model = useCaseTemplateWriteModel({ repository: repo });
    const item = makeItem({ activeFlag: true });

    const ok = await model.toggleActive(item);

    expect(ok).toBe(true);
    expect(calledParams?.activeFlag).toBe(false);
  });

  it("toggleActive activates an inactive item", async () => {
    let calledParams: Record<string, unknown> | undefined;
    const repo = makeRepo({
      update: async (_id, params) => {
        calledParams = params as Record<string, unknown>;
        return makeItem({ activeFlag: true });
      },
    });
    const model = useCaseTemplateWriteModel({ repository: repo });
    const item = makeItem({ activeFlag: false });

    await model.toggleActive(item);

    expect(calledParams?.activeFlag).toBe(true);
  });

  it("clearError resets errorCode", async () => {
    const repo = makeRepo({
      create: async () => {
        throw new Error("fail");
      },
    });
    const model = useCaseTemplateWriteModel({ repository: repo });

    await model.create({ templateName: "X", caseType: "bmv" });
    expect(model.errorCode.value).toBe("request_failed");

    model.clearError();
    expect(model.errorCode.value).toBeNull();
  });

  it("saving is true during operation", async () => {
    const states: boolean[] = [];
    const repo = makeRepo({
      create: async () => {
        states.push(true);
        return makeItem();
      },
    });
    const model = useCaseTemplateWriteModel({ repository: repo });

    expect(model.saving.value).toBe(false);
    await model.create({ templateName: "X", caseType: "bmv" });
    expect(model.saving.value).toBe(false);
    expect(states).toEqual([true]);
  });
});
