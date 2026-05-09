import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useCaseValidationActions } from "./useCaseValidationActions";
import type { ValidationRunsRepository } from "../data/ValidationRunsRepository";
import type { ReviewRecordsRepository } from "../data/ReviewRecordsRepository";

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

  // createSubmissionPackage tests live in `useCaseValidationActions.createSp.test.ts`.

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
