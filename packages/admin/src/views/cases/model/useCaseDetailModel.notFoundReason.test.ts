import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useCaseDetailModel } from "./useCaseDetailModel";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";
import { RepositoryError } from "../../../shared/api/repositoryRuntime";
import {
  ZERO_TAB_COUNTS,
  createDetailRepoStub,
  createMockAggregate,
  createMockDetail,
  flushFetch,
} from "./useCaseDetailModel.test-support";

function d(overrides: Parameters<typeof createMockDetail>[0] = {}) {
  return createMockDetail(overrides);
}

function agg(
  detail: ReturnType<typeof createMockDetail>,
  overrides: Partial<CaseDetailAggregate> = {},
): CaseDetailAggregate {
  return createMockAggregate(detail, {
    tabCounts: { ...ZERO_TAB_COUNTS },
    ownerUserId: "u1",
    ...overrides,
  });
}

const AGG_ACTIVE = agg(d({ id: "CASE-ACTIVE", customerId: "CUS-ACTIVE" }));

function stubRepo(
  handler: (id: string) => Promise<CaseDetailAggregate | null>,
) {
  return createDetailRepoStub(handler);
}

function mapRepo(
  map: Record<string, CaseDetailAggregate> = {
    "CASE-ACTIVE": AGG_ACTIVE,
  },
) {
  return stubRepo(async (id) => map[id] ?? null);
}

describe("notFoundReason (R41-D)", () => {
  it("400 RepositoryError → badRequest", async () => {
    const { repo } = stubRepo(async () => {
      throw new RepositoryError({
        code: "VALIDATION_ERROR",
        message: "bad uuid",
        status: 400,
      });
    });
    const m = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(m.notFound.value).toBe(true);
    expect(m.notFoundReason.value).toBe("badRequest");
  });

  it("422 RepositoryError → badRequest", async () => {
    const { repo } = stubRepo(async () => {
      throw new RepositoryError({
        code: "VALIDATION_ERROR",
        message: "unprocessable",
        status: 422,
      });
    });
    const m = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(m.notFoundReason.value).toBe("badRequest");
  });

  it("403 RepositoryError → forbidden", async () => {
    const { repo } = stubRepo(async () => {
      throw new RepositoryError({
        code: "UNAUTHORIZED",
        message: "access denied",
        status: 403,
      });
    });
    const m = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(m.notFound.value).toBe(true);
    expect(m.notFoundReason.value).toBe("forbidden");
  });

  it("404 (null result) → notFound", async () => {
    const { repo } = mapRepo();
    const m = useCaseDetailModel(ref("UNKNOWN"), { repo });
    await flushFetch();
    expect(m.notFound.value).toBe(true);
    expect(m.notFoundReason.value).toBe("notFound");
  });

  it("500 RepositoryError → serverError", async () => {
    const { repo } = stubRepo(async () => {
      throw new RepositoryError({
        code: "BAD_RESPONSE",
        message: "internal server error",
        status: 500,
      });
    });
    const m = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(m.notFound.value).toBe(true);
    expect(m.notFoundReason.value).toBe("serverError");
  });

  it("plain Error (no status) → notFound", async () => {
    const { repo } = stubRepo(async () => {
      throw new Error("network timeout");
    });
    const m = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(m.notFoundReason.value).toBe("notFound");
  });

  it("null when detail loaded successfully", async () => {
    const { repo } = mapRepo();
    const m = useCaseDetailModel(ref("CASE-ACTIVE"), { repo });
    await flushFetch();
    expect(m.notFoundReason.value).toBeNull();
  });

  it("resets after successful refetch", async () => {
    let fail = true;
    const { repo } = stubRepo(async () => {
      if (fail)
        throw new RepositoryError({
          code: "BAD_RESPONSE",
          message: "fail",
          status: 500,
        });
      return AGG_ACTIVE;
    });
    const m = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(m.notFoundReason.value).toBe("serverError");

    fail = false;
    await m.refetch();
    await flushFetch();
    expect(m.notFoundReason.value).toBeNull();
    expect(m.notFound.value).toBe(false);
  });
});
