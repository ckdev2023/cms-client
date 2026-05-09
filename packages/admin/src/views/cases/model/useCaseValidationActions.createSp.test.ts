import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useCaseValidationActions } from "./useCaseValidationActions";
import type { ValidationRunsRepository } from "../data/ValidationRunsRepository";
import type { SubmissionPackagesRepository } from "../data/SubmissionPackagesRepository";
import { RepositoryError } from "../../../shared/api/repositoryRuntime";

function createMockRepo(
  overrides: Partial<ValidationRunsRepository> = {},
): ValidationRunsRepository {
  return {
    createRun: vi.fn(async () => ({
      id: "vr-001",
      caseId: "case-1",
      status: "completed",
    })),
    ...overrides,
  };
}

function createMockSpRepo(
  overrides: Partial<SubmissionPackagesRepository> = {},
): SubmissionPackagesRepository {
  return {
    create: vi.fn(async () => ({
      id: "sp-001",
      caseId: "case-1",
    })),
    ...overrides,
  };
}

const SAMPLE_PAYLOAD = {
  submittedAt: "2026-05-09T10:00:00.000Z",
  authorityName: "Tokyo Immigration",
};

describe("useCaseValidationActions.createSubmissionPackage", () => {
  it("starts with loading=false and no error", () => {
    const { createSpLoading, createSpError, createSpErrorI18nKey } =
      useCaseValidationActions({
        caseId: ref("case-1"),
        repo: createMockRepo(),
        spRepo: createMockSpRepo(),
      });

    expect(createSpLoading.value).toBe(false);
    expect(createSpError.value).toBeNull();
    expect(createSpErrorI18nKey.value).toBeNull();
  });

  it("sets loading during create and clears on success", async () => {
    let resolveCreate!: (v: unknown) => void;
    const spRepo = createMockSpRepo({
      create: vi.fn(
        () =>
          new Promise((r) => {
            resolveCreate = r;
          }),
      ),
    });

    const { createSpLoading, createSubmissionPackage } =
      useCaseValidationActions({
        caseId: ref("case-1"),
        repo: createMockRepo(),
        spRepo,
      });

    const promise = createSubmissionPackage(SAMPLE_PAYLOAD);
    await nextTick();
    expect(createSpLoading.value).toBe(true);

    resolveCreate({ id: "sp-001", caseId: "case-1" });
    await promise;

    expect(createSpLoading.value).toBe(false);
  });

  it("calls spRepo.create with current caseId, submittedAt, authorityName", async () => {
    const spRepo = createMockSpRepo();
    const caseId = ref("case-42");

    const { createSubmissionPackage } = useCaseValidationActions({
      caseId,
      repo: createMockRepo(),
      spRepo,
    });

    await createSubmissionPackage(SAMPLE_PAYLOAD);
    expect(spRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-42",
        submittedAt: SAMPLE_PAYLOAD.submittedAt,
        authorityName: SAMPLE_PAYLOAD.authorityName,
      }),
    );
  });

  it("invokes onCreateSpSuccess callback after success", async () => {
    const spRepo = createMockSpRepo();
    const onSuccess = vi.fn();

    const { createSubmissionPackage } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo: createMockRepo(),
      spRepo,
      onCreateSpSuccess: onSuccess,
    });

    await createSubmissionPackage(SAMPLE_PAYLOAD);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("sets error and i18n key on failure", async () => {
    const spRepo = createMockSpRepo({
      create: vi.fn(async () => {
        throw new RepositoryError({
          code: "CASE_WRITE_ERROR",
          message: "Stage invalid",
          serverErrorCode: "SP_CASE_STAGE_INVALID",
        });
      }),
    });
    const onSuccess = vi.fn();

    const {
      createSpLoading,
      createSpError,
      createSpErrorI18nKey,
      createSubmissionPackage,
    } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo: createMockRepo(),
      spRepo,
      onCreateSpSuccess: onSuccess,
    });

    await createSubmissionPackage(SAMPLE_PAYLOAD);
    expect(createSpLoading.value).toBe(false);
    expect(createSpError.value).toBe("Stage invalid");
    expect(createSpErrorI18nKey.value).toBe(
      "cases.writeErrors.spCaseStageInvalid",
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("maps gate validation errors to correct i18n key", async () => {
    const spRepo = createMockSpRepo({
      create: vi.fn(async () => {
        throw new RepositoryError({
          code: "CASE_WRITE_ERROR",
          message: "Missing validation run",
          serverErrorCode: "CASE_GATE_VALIDATION_RUN_MISSING",
        });
      }),
    });

    const { createSpErrorI18nKey, createSubmissionPackage } =
      useCaseValidationActions({
        caseId: ref("case-1"),
        repo: createMockRepo(),
        spRepo,
      });

    await createSubmissionPackage(SAMPLE_PAYLOAD);
    expect(createSpErrorI18nKey.value).toBe(
      "cases.writeErrors.gateValidationRunMissing",
    );
  });

  it("ignores concurrent calls while loading", async () => {
    let resolveCreate!: (v: unknown) => void;
    const createFn = vi.fn(
      () =>
        new Promise((r) => {
          resolveCreate = r;
        }),
    );
    const spRepo = createMockSpRepo({ create: createFn });

    const { createSubmissionPackage } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo: createMockRepo(),
      spRepo,
    });

    const p1 = createSubmissionPackage(SAMPLE_PAYLOAD);
    void createSubmissionPackage(SAMPLE_PAYLOAD);
    expect(createFn).toHaveBeenCalledTimes(1);

    resolveCreate({ id: "sp-001", caseId: "case-1" });
    await p1;
  });

  it("clears previous error on retry", async () => {
    let callCount = 0;
    const spRepo = createMockSpRepo({
      create: vi.fn(async () => {
        callCount++;
        if (callCount === 1) throw new Error("First failure");
        return { id: "sp-002", caseId: "case-1" };
      }),
    });

    const { createSpError, createSubmissionPackage } = useCaseValidationActions(
      {
        caseId: ref("case-1"),
        repo: createMockRepo(),
        spRepo,
      },
    );

    await createSubmissionPackage(SAMPLE_PAYLOAD);
    expect(createSpError.value).toBe("First failure");

    await createSubmissionPackage(SAMPLE_PAYLOAD);
    expect(createSpError.value).toBeNull();
  });
});
