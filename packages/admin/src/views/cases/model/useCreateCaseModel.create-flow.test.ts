// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-007-03 — create-case flow focused tests.
// Covers: sourceContext inheritance (customerId, groupId,
//   familyBulkMode, sourceLeadId pass-through), post-create
//   navigation readiness, and end-to-end create flow scenarios
//   (success, canSubmit gate, server error retry, double-submit
//   protection, group override).
// Does NOT test: submit payload field-by-field (→ focused.test),
//   draft wizard logic (→ useCreateCaseModel.test),
//   write builder serialization (→ CaseAdapterWriteBuilders.*.test).
// ────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from "vitest";
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

function stubQuickCreateFetch() {
  let customerCounter = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ id: `cust-auto-${++customerCounter}` }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ═══════════════════════════════════════════════════════════════════
//  SOURCE CONTEXT INHERITANCE (p0-fe-007-03)
// ═══════════════════════════════════════════════════════════════════

describe("sourceContext → submit payload inheritance (p0-fe-007-03)", () => {
  it("customerId from sourceContext flows through to submit payload", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({
      repo,
      sourceContext: { customerId: "cust-003", familyBulkMode: false },
    });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.customerId).toBe("cust-003");
  });

  it("group inherited from source customer flows to groupId", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({
      repo,
      sourceContext: { customerId: "cust-003", familyBulkMode: false },
    });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.groupId).toBe("tokyo-2");
  });

  it("defaults to defaultGroup when no source customer", async () => {
    const { repo, spy } = successRepo();
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: { familyBulkMode: false },
        defaultGroup: "osaka",
      }),
    );
    m.setDueDate("2026-05-01");
    m.setAmount("100000");
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.groupId).toBe("osaka");
  });

  it("familyBulkMode selects family template → caseTypeCode=family", async () => {
    const { repo, spy } = successRepo();
    stubQuickCreateFetch();
    const m = createSubmittableModel({
      repo,
      sourceContext: { customerId: "cust-001", familyBulkMode: true },
    });
    await m.submit();
    expect(spy).toHaveBeenCalled();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.caseTypeCode).toBe("family");
  });

  it("empty customerId sends empty string as customerId", async () => {
    const { repo, spy } = successRepo();
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: { familyBulkMode: false },
      }),
    );
    m.setDueDate("2026-05-01");
    m.setAmount("100000");
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.customerId).toBe("");
  });

  it("sourceLeadId does not affect submit payload (pass-through context only)", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({
      repo,
      sourceContext: {
        customerId: "cust-001",
        sourceLeadId: "LEAD-999",
        familyBulkMode: false,
      },
    });
    await m.submit();
    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.customerId).toBe("cust-001");
    expect(Object.prototype.hasOwnProperty.call(input, "sourceLeadId")).toBe(
      false,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
//  NAVIGATION-READY STATE (p0-fe-007-03)
// ═══════════════════════════════════════════════════════════════════

describe("post-create navigation readiness (p0-fe-007-03)", () => {
  it("submitResult.id is available for navigation after success", async () => {
    const { repo } = successRepo("CASE-NAV-001");
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitResult.value?.id).toBe("CASE-NAV-001");
  });

  it("submitResult is null after failure (no navigation)", async () => {
    const { repo } = stubRepo(async () => {
      throw new Error("fail");
    });
    const m = createSubmittableModel({ repo });
    await m.submit();
    expect(m.submitResult.value).toBeNull();
  });

  it("submitResult updates after retry success", async () => {
    let fail = true;
    const { repo } = stubRepo(async () => {
      if (fail) throw new Error("temp");
      return { id: "CASE-RETRY-NAV" };
    });
    const m = createSubmittableModel({ repo });

    await m.submit();
    expect(m.submitResult.value).toBeNull();

    fail = false;
    await m.submit();
    expect(m.submitResult.value?.id).toBe("CASE-RETRY-NAV");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  CREATE FLOW END-TO-END (p0-fe-007-03)
// ═══════════════════════════════════════════════════════════════════

describe("create flow end-to-end (p0-fe-007-03)", () => {
  it("success: sourceContext → draft → submit → result ready", async () => {
    const { repo, spy } = successRepo("CASE-E2E-001");
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      }),
    );
    expect(m.primaryCustomer.value?.id).toBe("cust-001");
    expect(m.draft.group).toBe("tokyo-1");

    m.setDueDate("2026-06-01");
    m.setAmount("200000");
    expect(m.canSubmit.value).toBe(true);

    const result = await m.submit();
    expect(result).toEqual({ id: "CASE-E2E-001" });
    expect(m.submitResult.value?.id).toBe("CASE-E2E-001");
    expect(m.submitError.value).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("failure: canSubmit false prevents API call", async () => {
    const { repo, spy } = successRepo();
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: { familyBulkMode: false },
      }),
    );
    expect(m.canSubmit.value).toBe(false);

    const result = await m.submit();
    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("failure: server error → error state → retry succeeds", async () => {
    let callCount = 0;
    const { repo } = stubRepo(async () => {
      callCount++;
      if (callCount === 1)
        throw new CaseRepositoryError({
          code: "VALIDATION_ERROR",
          status: 422,
          message: "Missing customer",
        });
      return { id: "CASE-E2E-RETRY" };
    });
    const m = createSubmittableModel({ repo });

    const r1 = await m.submit();
    expect(r1).toBeNull();
    expect(m.submitError.value?.message).toBe("Missing customer");

    const r2 = await m.submit();
    expect(r2).toEqual({ id: "CASE-E2E-RETRY" });
    expect(m.submitError.value).toBeNull();
  });

  it("double-submit: second call during in-flight returns null", async () => {
    let resolve: ((v: CaseMutationResult) => void) | undefined;
    const { repo, spy } = stubRepo(
      () =>
        new Promise<CaseMutationResult>((r) => {
          resolve = r;
        }),
    );
    const m = createSubmittableModel({ repo });

    const p1 = m.submit();
    const p2 = m.submit();

    resolve!({ id: "CASE-ONLY-ONCE" });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toEqual({ id: "CASE-ONLY-ONCE" });
    expect(r2).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("sourceContext group override preserved through submit", async () => {
    const { repo, spy } = successRepo();
    const m = createSubmittableModel({
      repo,
      sourceContext: { customerId: "cust-003", familyBulkMode: false },
    });
    expect(m.draft.group).toBe("tokyo-2");

    m.setGroup("osaka");
    m.setGroupOverrideReason("客户要求");
    await m.submit();

    const input = spy.mock.calls[0][0] as CaseCreateInput;
    expect(input.groupId).toBe("osaka");
    expect(input.crossGroupReason).toBe("客户要求");
  });
});
