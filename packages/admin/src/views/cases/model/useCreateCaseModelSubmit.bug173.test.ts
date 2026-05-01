import { describe, expect, it, vi } from "vitest";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import {
  normalizeSubmitError,
  type SubmitErrorInfo,
} from "./useCreateCaseModelSubmit";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../constants";
import type { CaseRepository } from "./CaseRepository";
import type { CaseMutationResult, CaseCreateInput } from "./CaseAdapterTypes";
import { CaseRepositoryError } from "./CaseRepositorySupport";

function stubRepo(
  handler: (input: CaseCreateInput) => Promise<CaseMutationResult>,
) {
  const spy = vi.fn(handler);
  return {
    repo: {
      createCase: spy,
      createCaseParty: vi.fn(async () => ({ id: "party-stub" })),
    } as unknown as CaseRepository,
    spy,
  };
}

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

function createSubmittableModel(
  overrides: Partial<UseCreateCaseModelDeps> = {},
) {
  const m = useCreateCaseModel(createDeps(overrides));
  m.setDueDate("2026-05-01");
  m.setAmount("120000");
  return m;
}

describe("BUG-173 normalizeSubmitError returns SubmitErrorInfo", () => {
  it("CaseRepositoryError with code + detail → all three fields", () => {
    const err = new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "Owner not found",
      status: 400,
      serverErrorCode: "CASE_OWNER_NOT_FOUND",
      detail: "owner uuid e00ea5d2-210a-4f65-a205-5d4e0da4cc7d not found",
    });
    const info = normalizeSubmitError(err);
    expect(info.message).toBe("CASE_OWNER_NOT_FOUND: Owner not found");
    expect(info.code).toBe("CASE_OWNER_NOT_FOUND");
    expect(info.detail).toBe(
      "owner uuid e00ea5d2-210a-4f65-a205-5d4e0da4cc7d not found",
    );
  });

  it("CaseRepositoryError without detail → detail is undefined", () => {
    const err = new CaseRepositoryError({
      code: "NETWORK",
      message: "Case request failed",
    });
    const info = normalizeSubmitError(err);
    expect(info.message).toBe("Case request failed");
    expect(info.code).toBeUndefined();
    expect(info.detail).toBeUndefined();
  });

  it("generic Error → message only", () => {
    const info = normalizeSubmitError(new Error("unexpected"));
    expect(info.message).toBe("unexpected");
    expect(info.code).toBeUndefined();
    expect(info.detail).toBeUndefined();
  });

  it("raw string throw → message only", () => {
    const info = normalizeSubmitError("raw string");
    expect(info.message).toBe("raw string");
  });
});

describe("BUG-176 normalizeSubmitError prevents double-prefix", () => {
  it("message already prefixed with serverErrorCode → no double prefix", () => {
    const err = new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "CASE_OWNER_NOT_FOUND: ownerUserId e00ea5d2 not found",
      status: 400,
      serverErrorCode: "CASE_OWNER_NOT_FOUND",
      detail: "ownerUserId e00ea5d2 not found",
    });
    const info = normalizeSubmitError(err);
    expect(info.message).toBe(
      "CASE_OWNER_NOT_FOUND: ownerUserId e00ea5d2 not found",
    );
    expect(info.code).toBe("CASE_OWNER_NOT_FOUND");
    expect(info.detail).toBe("ownerUserId e00ea5d2 not found");
  });

  it("message NOT prefixed (legacy) → single prefix added", () => {
    const err = new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "ownerUserId e00ea5d2 not found",
      status: 400,
      serverErrorCode: "CASE_OWNER_NOT_FOUND",
    });
    const info = normalizeSubmitError(err);
    expect(info.message).toBe(
      "CASE_OWNER_NOT_FOUND: ownerUserId e00ea5d2 not found",
    );
    expect(info.code).toBe("CASE_OWNER_NOT_FOUND");
  });

  it("no serverErrorCode → message passed through unchanged", () => {
    const err = new CaseRepositoryError({
      code: "NETWORK",
      message: "Case request failed",
    });
    const info = normalizeSubmitError(err);
    expect(info.message).toBe("Case request failed");
    expect(info.code).toBeUndefined();
  });
});

describe("BUG-173 submitError ref carries structured error info", () => {
  it("4xx with {code, detail, message} → submitError has all three", async () => {
    const { repo } = stubRepo(async () => {
      throw new CaseRepositoryError({
        code: "CASE_WRITE_ERROR",
        message: "Owner not found",
        status: 400,
        serverErrorCode: "CASE_OWNER_NOT_FOUND",
        detail: "owner uuid abc-123 not found",
      });
    });
    const m = createSubmittableModel({ repo });
    const result = await m.submit();

    expect(result).toBeNull();
    const err: SubmitErrorInfo = m.submitError.value!;
    expect(err.message).toBe("CASE_OWNER_NOT_FOUND: Owner not found");
    expect(err.code).toBe("CASE_OWNER_NOT_FOUND");
    expect(err.detail).toBe("owner uuid abc-123 not found");
  });

  it("generic Error → submitError.message only, no code/detail", async () => {
    const { repo } = stubRepo(async () => {
      throw new Error("boom");
    });
    const m = createSubmittableModel({ repo });
    await m.submit();

    expect(m.submitError.value?.message).toBe("boom");
    expect(m.submitError.value?.code).toBeUndefined();
    expect(m.submitError.value?.detail).toBeUndefined();
  });

  it("success clears submitError to null", async () => {
    let fail = true;
    const { repo } = stubRepo(async () => {
      if (fail) {
        throw new CaseRepositoryError({
          code: "CASE_WRITE_ERROR",
          message: "fail",
          status: 422,
          serverErrorCode: "SOME_CODE",
          detail: "some detail",
        });
      }
      return { id: "CASE-OK" };
    });
    const m = createSubmittableModel({ repo });

    await m.submit();
    expect(m.submitError.value).not.toBeNull();

    fail = false;
    await m.submit();
    expect(m.submitError.value).toBeNull();
  });
});
