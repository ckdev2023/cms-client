import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useCaseValidationActions } from "./useCaseValidationActions";
import type { ValidationRunsRepository } from "../data/ValidationRunsRepository";
import type { SubmissionPackagesRepository } from "../data/SubmissionPackagesRepository";
import type { ReviewRecordsRepository } from "../data/ReviewRecordsRepository";
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

describe("useCaseValidationActions", () => {
  it("starts with loading=false and no error", () => {
    const repo = createMockRepo();
    const { rerunLoading, rerunError } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo,
    });

    expect(rerunLoading.value).toBe(false);
    expect(rerunError.value).toBeNull();
  });

  it("sets loading during rerun and clears on success", async () => {
    let resolveCreateRun!: (v: unknown) => void;
    const repo = createMockRepo({
      createRun: vi.fn(
        () =>
          new Promise((r) => {
            resolveCreateRun = r;
          }),
      ),
    });

    const { rerunLoading, rerunError, rerunValidation } =
      useCaseValidationActions({
        caseId: ref("case-1"),
        repo,
      });

    const promise = rerunValidation();
    await nextTick();
    expect(rerunLoading.value).toBe(true);

    resolveCreateRun({ id: "vr-001", caseId: "case-1", status: "completed" });
    await promise;
    expect(rerunLoading.value).toBe(false);
    expect(rerunError.value).toBeNull();
  });

  it("calls repo.createRun with the current caseId", async () => {
    const repo = createMockRepo();
    const caseId = ref("case-42");

    const { rerunValidation } = useCaseValidationActions({
      caseId,
      repo,
    });

    await rerunValidation();
    expect(repo.createRun).toHaveBeenCalledWith({ caseId: "case-42" });
  });

  it("invokes onRerunSuccess callback after successful run", async () => {
    const repo = createMockRepo();
    const onSuccess = vi.fn();

    const { rerunValidation } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo,
      onRerunSuccess: onSuccess,
    });

    await rerunValidation();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("sets error on failure and does not call onRerunSuccess", async () => {
    const repo = createMockRepo({
      createRun: vi.fn(async () => {
        throw new Error("Server error");
      }),
    });
    const onSuccess = vi.fn();

    const { rerunLoading, rerunError, rerunValidation } =
      useCaseValidationActions({
        caseId: ref("case-1"),
        repo,
        onRerunSuccess: onSuccess,
      });

    await rerunValidation();
    expect(rerunLoading.value).toBe(false);
    expect(rerunError.value).toBe("Server error");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("clears previous error on retry", async () => {
    let callCount = 0;
    const repo = createMockRepo({
      createRun: vi.fn(async () => {
        callCount++;
        if (callCount === 1) throw new Error("First failure");
        return { id: "vr-002", caseId: "case-1", status: "completed" };
      }),
    });

    const { rerunError, rerunValidation } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo,
    });

    await rerunValidation();
    expect(rerunError.value).toBe("First failure");

    await rerunValidation();
    expect(rerunError.value).toBeNull();
  });

  it("ignores concurrent calls while loading", async () => {
    let resolveCreateRun!: (v: unknown) => void;
    const createRunFn = vi.fn(
      () =>
        new Promise((r) => {
          resolveCreateRun = r;
        }),
    );
    const repo = createMockRepo({ createRun: createRunFn });

    const { rerunValidation } = useCaseValidationActions({
      caseId: ref("case-1"),
      repo,
    });

    const p1 = rerunValidation();
    void rerunValidation();
    expect(createRunFn).toHaveBeenCalledTimes(1);

    resolveCreateRun({ id: "vr-001", caseId: "case-1", status: "completed" });
    await p1;
  });

  describe("createSubmissionPackage", () => {
    it("starts with loading=false and no error", () => {
      const repo = createMockRepo();
      const spRepo = createMockSpRepo();
      const { createSpLoading, createSpError, createSpErrorI18nKey } =
        useCaseValidationActions({
          caseId: ref("case-1"),
          repo,
          spRepo,
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

      const promise = createSubmissionPackage();
      await nextTick();
      expect(createSpLoading.value).toBe(true);

      resolveCreate({ id: "sp-001", caseId: "case-1" });
      await promise;

      expect(createSpLoading.value).toBe(false);
    });

    it("calls spRepo.create with current caseId", async () => {
      const spRepo = createMockSpRepo();
      const caseId = ref("case-42");

      const { createSubmissionPackage } = useCaseValidationActions({
        caseId,
        repo: createMockRepo(),
        spRepo,
      });

      await createSubmissionPackage();
      expect(spRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: "case-42" }),
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

      await createSubmissionPackage();
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

      await createSubmissionPackage();
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

      await createSubmissionPackage();
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

      const p1 = createSubmissionPackage();
      void createSubmissionPackage();
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

      const { createSpError, createSubmissionPackage } =
        useCaseValidationActions({
          caseId: ref("case-1"),
          repo: createMockRepo(),
          spRepo,
        });

      await createSubmissionPackage();
      expect(createSpError.value).toBe("First failure");

      await createSubmissionPackage();
      expect(createSpError.value).toBeNull();
    });
  });

  describe("createReviewRequest", () => {
    function createMockRrRepo(
      overrides: Partial<ReviewRecordsRepository> = {},
    ): ReviewRecordsRepository {
      return {
        createReviewRequest: vi.fn(async () => ({
          id: "rr-001",
          caseId: "case-1",
          status: "pending",
        })),
        ...overrides,
      };
    }

    it("starts with loading=false and no error", () => {
      const rrRepo = createMockRrRepo();
      const { reviewLoading, reviewError } = useCaseValidationActions({
        caseId: ref("case-1"),
        repo: createMockRepo(),
        rrRepo,
      });

      expect(reviewLoading.value).toBe(false);
      expect(reviewError.value).toBeNull();
    });

    it("sets loading during request and clears on success", async () => {
      let resolveCreate!: (v: unknown) => void;
      const rrRepo = createMockRrRepo({
        createReviewRequest: vi.fn(
          () =>
            new Promise((r) => {
              resolveCreate = r;
            }),
        ),
      });

      const { reviewLoading, createReviewRequest } = useCaseValidationActions({
        caseId: ref("case-1"),
        repo: createMockRepo(),
        rrRepo,
      });

      const promise = createReviewRequest();
      await nextTick();
      expect(reviewLoading.value).toBe(true);

      resolveCreate({ id: "rr-001", caseId: "case-1", status: "pending" });
      await promise;

      expect(reviewLoading.value).toBe(false);
    });

    it("calls rrRepo.createReviewRequest with current caseId", async () => {
      const rrRepo = createMockRrRepo();
      const caseId = ref("case-42");

      const { createReviewRequest } = useCaseValidationActions({
        caseId,
        repo: createMockRepo(),
        rrRepo,
      });

      await createReviewRequest();
      expect(rrRepo.createReviewRequest).toHaveBeenCalledWith({
        caseId: "case-42",
      });
    });

    it("invokes onReviewRequestSuccess callback after success", async () => {
      const rrRepo = createMockRrRepo();
      const onSuccess = vi.fn();

      const { createReviewRequest } = useCaseValidationActions({
        caseId: ref("case-1"),
        repo: createMockRepo(),
        rrRepo,
        onReviewRequestSuccess: onSuccess,
      });

      await createReviewRequest();
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("sets error on failure and does not call onReviewRequestSuccess", async () => {
      const rrRepo = createMockRrRepo({
        createReviewRequest: vi.fn(async () => {
          throw new Error("Server error");
        }),
      });
      const onSuccess = vi.fn();

      const { reviewLoading, reviewError, createReviewRequest } =
        useCaseValidationActions({
          caseId: ref("case-1"),
          repo: createMockRepo(),
          rrRepo,
          onReviewRequestSuccess: onSuccess,
        });

      await createReviewRequest();
      expect(reviewLoading.value).toBe(false);
      expect(reviewError.value).toBe("Server error");
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("ignores concurrent calls while loading", async () => {
      let resolveCreate!: (v: unknown) => void;
      const createFn = vi.fn(
        () =>
          new Promise((r) => {
            resolveCreate = r;
          }),
      );
      const rrRepo = createMockRrRepo({ createReviewRequest: createFn });

      const { createReviewRequest } = useCaseValidationActions({
        caseId: ref("case-1"),
        repo: createMockRepo(),
        rrRepo,
      });

      const p1 = createReviewRequest();
      void createReviewRequest();
      expect(createFn).toHaveBeenCalledTimes(1);

      resolveCreate({ id: "rr-001", caseId: "case-1", status: "pending" });
      await p1;
    });

    it("clears previous error on retry", async () => {
      let callCount = 0;
      const rrRepo = createMockRrRepo({
        createReviewRequest: vi.fn(async () => {
          callCount++;
          if (callCount === 1) throw new Error("First failure");
          return { id: "rr-002", caseId: "case-1", status: "pending" };
        }),
      });

      const { reviewError, createReviewRequest } = useCaseValidationActions({
        caseId: ref("case-1"),
        repo: createMockRepo(),
        rrRepo,
      });

      await createReviewRequest();
      expect(reviewError.value).toBe("First failure");

      await createReviewRequest();
      expect(reviewError.value).toBeNull();
    });
  });
});
