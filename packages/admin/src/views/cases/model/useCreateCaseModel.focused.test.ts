// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-007-01 — create-case submit flow focused tests.
// Covers: submit payload construction, loading lifecycle, error
//   normalization (CaseRepositoryError / generic Error / raw throw),
//   double-submit guard, canSubmit gate, post-create result.
// Does NOT test: sourceContext / navigation / E2E flow
//   (→ useCreateCaseModel.create-flow.test),
//   draft wizard logic (→ useCreateCaseModel.test),
//   write builder serialization (→ CaseAdapterWriteBuilders.*.test),
//   repository HTTP wiring (→ CaseRepository.*.test).
// ────────────────────────────────────────────────────────────────

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
import type { CaseMutationResult, CaseCreateInput } from "./CaseAdapterTypes";
import { CaseRepositoryError } from "./CaseRepositorySupport";

// ─── Helpers ─────────────────────────────────────────────────────

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

function successRepo(id = "CASE-NEW-001") {
  return stubRepo(async () => ({ id }));
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

// ═══════════════════════════════════════════════════════════════════
//  INITIAL STATE
// ═══════════════════════════════════════════════════════════════════

describe("submit flow initial state (p0-fe-007-01)", () => {
  it("submitting is false on init", () => {
    const m = createSubmittableModel();
    expect(m.submitting.value).toBe(false);
  });

  it("submitError is null on init", () => {
    const m = createSubmittableModel();
    expect(m.submitError.value).toBeNull();
  });

  it("submitResult is null on init", () => {
    const m = createSubmittableModel();
    expect(m.submitResult.value).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  SUBMIT PAYLOAD CONSTRUCTION
// ═══════════════════════════════════════════════════════════════════

describe("submit payload construction (p0-fe-007-01)", () => {
  it("passes customerId from primary customer", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(spy).toHaveBeenCalledTimes(1);
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.customerId).toBe("cust-001");
  });

  it("passes templateId as caseTypeCode", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.caseTypeCode).toBe("family");
  });

  it("passes owner as ownerUserId", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.ownerUserId).toBe("suzuki");
  });

  it("passes group as groupId", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.groupId).toBe("tokyo-1");
  });

  it("passes dueDate as dueAt", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.dueAt).toBe("2026-05-01");
  });

  it("passes amount as quotePrice (parsed number)", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.quotePrice).toBe(120000);
  });

  it("passes effectiveTitle as caseName", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.caseName).toBe("李娜 家族滞在认定");
  });

  it("passes stage as S1", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.stage).toBe("S1");
  });

  it("passes crossGroupReason when group overridden", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    m.setGroup("osaka");
    m.setGroupOverrideReason("客户要求跨组");
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.crossGroupReason).toBe("客户要求跨组");
  });

  it("omits crossGroupReason when group not overridden", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.crossGroupReason).toBeUndefined();
  });

  it("passes applicationType from draft", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });
    m.setApplicationType("change_of_status");
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.applicationType).toBe("change_of_status");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  LOADING LIFECYCLE
// ═══════════════════════════════════════════════════════════════════

describe("submit loading lifecycle (p0-fe-007-01)", () => {
  it("submitting true during in-flight request", async () => {
    let resolve: ((v: CaseMutationResult) => void) | undefined;
    const { repo } = stubRepo(
      () =>
        new Promise<CaseMutationResult>((r) => {
          resolve = r;
        }),
    );
    const m = createSubmittableModel({ repo });
    const p = m.submit();
    expect(m.submitting.value).toBe(true);
    resolve!({ id: "CASE-001" });
    await p;
    expect(m.submitting.value).toBe(false);
  });

  it("submitting false after success", async () => {
    const { repo } = successRepo();
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitting.value).toBe(false);
  });

  it("submitting false after error", async () => {
    const { repo } = stubRepo(async () => {
      throw new Error("server error");
    });
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitting.value).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  SUCCESS RESULT
// ═══════════════════════════════════════════════════════════════════

describe("submit success result (p0-fe-007-01)", () => {
  it("returns CaseMutationResult on success", async () => {
    const { repo } = successRepo("CASE-NEW-42");
    const m = createSubmittableModel({ repo });
    const result = await m.submit();
    expect(result).toEqual({ id: "CASE-NEW-42" });
  });

  it("sets submitResult ref on success", async () => {
    const { repo } = successRepo("CASE-NEW-42");
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitResult.value).toEqual({ id: "CASE-NEW-42" });
  });

  it("clears submitError on success", async () => {
    let fail = true;
    const { repo } = stubRepo(async () => {
      if (fail) throw new Error("first fail");
      return { id: "CASE-OK" };
    });
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitError.value).toBe("first fail");

    fail = false;
    await m.submit();
    expect(m.submitError.value).toBeNull();
    expect(m.submitResult.value).toEqual({ id: "CASE-OK" });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  ERROR NORMALIZATION
// ═══════════════════════════════════════════════════════════════════

describe("submit error normalization (p0-fe-007-01)", () => {
  it("normalizes CaseRepositoryError with serverErrorCode", async () => {
    const { repo } = stubRepo(async () => {
      throw new CaseRepositoryError({
        code: "CASE_WRITE_ERROR",
        message: "Customer not found",
        status: 400,
        serverErrorCode: "CUSTOMER_NOT_FOUND",
      });
    });
    const m = createSubmittableModel({ repo });
    const result = await m.submit();
    expect(result).toBeNull();
    expect(m.submitError.value).toBe("CUSTOMER_NOT_FOUND: Customer not found");
  });

  it("normalizes CaseRepositoryError without serverErrorCode", async () => {
    const { repo } = stubRepo(async () => {
      throw new CaseRepositoryError({
        code: "NETWORK",
        message: "Case request failed",
      });
    });
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitError.value).toBe("Case request failed");
  });

  it("normalizes generic Error", async () => {
    const { repo } = stubRepo(async () => {
      throw new Error("unexpected error");
    });
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitError.value).toBe("unexpected error");
  });

  it("normalizes raw string throw", async () => {
    const { repo } = stubRepo(async () => {
      throw "raw string";
    });
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitError.value).toBe("raw string");
  });

  it("returns null on error", async () => {
    const { repo } = stubRepo(async () => {
      throw new Error("fail");
    });
    const m = createSubmittableModel({ repo });
    const result = await m.submit();
    expect(result).toBeNull();
  });

  it("submitResult is null after error", async () => {
    const { repo } = stubRepo(async () => {
      throw new Error("fail");
    });
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitResult.value).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  SUBMIT GUARDS
// ═══════════════════════════════════════════════════════════════════

describe("submit guards (p0-fe-007-01)", () => {
  it("returns null when canSubmit is false", async () => {
    const { repo, spy } = successRepo();
    const m = useCreateCaseModel(createDeps({ repo }));
    expect(m.canSubmit.value).toBe(false);
    const result = await m.submit();
    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    expect(m.submitting.value).toBe(false);
  });

  it("prevents double-submit while in-flight", async () => {
    let resolveCount = 0;
    let resolve: ((v: CaseMutationResult) => void) | undefined;
    const { repo, spy } = stubRepo(
      () =>
        new Promise<CaseMutationResult>((r) => {
          resolveCount++;
          resolve = r;
        }),
    );
    const m = createSubmittableModel({ repo });

    const p1 = m.submit();
    const p2 = m.submit();
    expect(resolveCount).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);

    resolve!({ id: "CASE-001" });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ id: "CASE-001" });
    expect(r2).toBeNull();
  });

  it("allows re-submit after previous error", async () => {
    let fail = true;
    const { repo, spy } = stubRepo(async () => {
      if (fail) throw new Error("temporary");
      return { id: "CASE-RETRY" };
    });
    const m = createSubmittableModel({ repo });

    await m.submit();
    expect(m.submitError.value).toBe("temporary");
    expect(spy).toHaveBeenCalledTimes(1);

    fail = false;
    await m.submit();
    expect(m.submitError.value).toBeNull();
    expect(m.submitResult.value).toEqual({ id: "CASE-RETRY" });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("allows re-submit after previous success", async () => {
    const { repo, spy } = stubRepo(async () => ({ id: "CASE-NEW" }));
    const m = createSubmittableModel({ repo });

    await m.submit();
    expect(spy).toHaveBeenCalledTimes(1);

    await m.submit();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  COMBINED LIFECYCLE
// ═══════════════════════════════════════════════════════════════════

describe("submit combined lifecycle (p0-fe-007-01)", () => {
  it("full cycle: fail → retry → success", async () => {
    let fail = true;
    const { repo } = stubRepo(async () => {
      if (fail)
        throw new CaseRepositoryError({
          code: "VALIDATION_ERROR",
          status: 422,
          message: "Missing required fields",
        });
      return { id: "CASE-FINAL" };
    });
    const m = createSubmittableModel({ repo });

    await m.submit();
    expect(m.submitError.value).toBe("Missing required fields");
    expect(m.submitResult.value).toBeNull();
    expect(m.submitting.value).toBe(false);

    fail = false;
    const result = await m.submit();
    expect(result).toEqual({ id: "CASE-FINAL" });
    expect(m.submitError.value).toBeNull();
    expect(m.submitResult.value).toEqual({ id: "CASE-FINAL" });
    expect(m.submitting.value).toBe(false);
  });

  it("draft changes reflected in subsequent submit payload", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({ repo });

    await m.submit();
    const first = spy.mock.calls[0][0] as CaseCreateInput;
    expect(first.ownerUserId).toBe("suzuki");

    m.setOwner("tanaka");
    await m.submit();
    const second = spy.mock.calls[1][0] as CaseCreateInput;
    expect(second.ownerUserId).toBe("tanaka");
  });
});
