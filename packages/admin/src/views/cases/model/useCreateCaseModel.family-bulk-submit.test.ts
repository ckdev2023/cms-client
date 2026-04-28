// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-008-02 — family bulk party/submit flow focused tests.
// Covers: family bulk submit creates one case per applicant, each case
//   gets applicant as primary party + supporters, primaryCustomer
//   submitted as supporter when not already included, source context
//   (group/template/owner) preserved across all sub-cases, partial
//   failure isolation, title generation per applicant.
// Does NOT test: single-case submit flow (→ focused.test),
//   draft wizard logic (→ useCreateCaseModel.test),
//   write builder serialization (→ CaseAdapterWriteBuilders.*.test).
// ────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import type { CaseCreateInput, CasePartyCreateInput } from "./CaseAdapterTypes";

// ─── Helpers ─────────────────────────────────────────────────────

function createBulkRepo(opts?: {
  createCaseImpl?: (...args: unknown[]) => Promise<{ id: string }>;
  createPartyImpl?: (...args: unknown[]) => Promise<{ id: string }>;
}) {
  let caseCounter = 0;
  const createCaseSpy = vi.fn(
    opts?.createCaseImpl ??
      (async () => ({ id: `CASE-BULK-${++caseCounter}` })),
  );
  const createPartySpy = vi.fn(
    opts?.createPartyImpl ?? (async () => ({ id: "party-stub" })),
  );
  return {
    repo: {
      createCase: createCaseSpy,
      createCaseParty: createPartySpy,
    } as unknown as CaseRepository,
    createCaseSpy,
    createPartySpy,
  };
}

function createBulkDeps(
  overrides: Partial<UseCreateCaseModelDeps> = {},
): UseCreateCaseModelDeps {
  return {
    templates: () => SAMPLE_CREATE_TEMPLATES,
    customers: () => SAMPLE_CREATE_CUSTOMERS,
    familyScenario: () => FAMILY_SCENARIO,
    ownerOptions: () => CASE_OWNER_OPTIONS,
    groupOptions: () => CASE_GROUP_OPTIONS,
    sourceContext: { customerId: "cust-002", familyBulkMode: true },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    ...overrides,
  };
}

function createSubmittableBulkModel(
  overrides: Partial<UseCreateCaseModelDeps> = {},
) {
  const m = useCreateCaseModel(createBulkDeps(overrides));
  m.setDueDate("2026-06-01");
  m.setAmount("150000");
  return m;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

beforeEach(() => {
  let customerCounter = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse({ id: `cust-auto-${++customerCounter}` })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════
//  FAMILY BULK MODE ACTIVATION
// ═══════════════════════════════════════════════════════════════════

describe("family bulk mode activation (p0-fe-008-02)", () => {
  it("isFamilyBulkScenario is true when familyBulkMode and family template", () => {
    const m = createSubmittableBulkModel();
    expect(m.isFamilyBulkScenario.value).toBe(true);
  });

  it("template defaults to family when familyBulkMode", () => {
    const m = createSubmittableBulkModel();
    expect(m.draft.templateId).toBe("family");
  });

  it("seeds default parties from family scenario", () => {
    const m = createSubmittableBulkModel();
    expect(m.additionalParties.value.length).toBeGreaterThan(0);
  });

  it("familyApplicants computed from seeded parties", () => {
    const m = createSubmittableBulkModel();
    const applicants = m.familyApplicants.value;
    expect(applicants.length).toBeGreaterThan(0);
    for (const a of applicants) {
      expect(["主申请人", "配偶", "子女"]).toContain(a.role);
    }
  });

  it("familySupporters include primary customer as supporter", () => {
    const m = createSubmittableBulkModel();
    const supporters = m.familySupporters.value;
    const primaryName = m.primaryCustomer.value?.name;
    expect(primaryName).toBeTruthy();
    expect(supporters.some((s) => s.name === primaryName)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BULK SUBMIT: CASE CREATION
// ═══════════════════════════════════════════════════════════════════

describe("family bulk submit creates cases per applicant (p0-fe-008-02)", () => {
  it("creates one case per family applicant", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });
    const applicantCount = m.familyApplicants.value.length;
    expect(applicantCount).toBeGreaterThan(0);

    await m.submit();
    expect(createCaseSpy).toHaveBeenCalledTimes(applicantCount);
  });

  it("each sub-case uses applicant name in title (not batch title)", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });
    const applicants = m.familyApplicants.value;

    await m.submit();

    for (let i = 0; i < applicants.length; i++) {
      const input = createCaseSpy.mock.calls[i][0] as CaseCreateInput;
      expect(input.caseName).toContain(applicants[i].name);
      expect(input.caseName).not.toContain("（批量）");
    }
  });

  it("all sub-cases share same group from draft", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.groupId).toBe(m.draft.group);
    }
  });

  it("all sub-cases share same owner from draft", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.ownerUserId).toBe(m.draft.owner);
    }
  });

  it("all sub-cases use family template code", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.caseTypeCode).toBe("family");
    }
  });

  it("all sub-cases share same dueAt and quotePrice", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.dueAt).toBe("2026-06-01");
      expect(input.quotePrice).toBe(150000);
    }
  });

  it("submitResult points to first created case", async () => {
    const { repo } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });

    const result = await m.submit();
    expect(result).toEqual({ id: "CASE-BULK-1" });
    expect(m.submitResult.value?.id).toBe("CASE-BULK-1");
  });

  it("bulkResults contains all sub-case results", async () => {
    const { repo } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });
    const applicantCount = m.familyApplicants.value.length;

    await m.submit();

    expect(m.bulkResults.value.length).toBe(applicantCount);
    for (const br of m.bulkResults.value) {
      expect(br.caseResult).not.toBeNull();
    }
  });

  it("quick-creates missing applicant customers before creating bulk cases", async () => {
    const { repo, createCaseSpy, createPartySpy } = createBulkRepo();
    const fetchSpy = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ id: "cust-new-1" }))
      .mockResolvedValueOnce(jsonResponse({ id: "cust-new-2" }));
    vi.stubGlobal("fetch", fetchSpy);
    const m = createSubmittableBulkModel({ repo });

    await m.submit();

    expect(fetchSpy).toHaveBeenCalledTimes(m.familyApplicants.value.length);
    expect(
      createCaseSpy.mock.calls.map(
        (call) => (call[0] as CaseCreateInput).customerId,
      ),
    ).toEqual(["cust-new-1", "cust-new-2"]);
    expect(
      createPartySpy.mock.calls
        .map((call) => call[0] as CasePartyCreateInput)
        .filter((party) => party.isPrimary)
        .map((party) => party.customerId),
    ).toEqual(["cust-new-1", "cust-new-2"]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BULK SUBMIT: PARTY SUBMISSION
// ═══════════════════════════════════════════════════════════════════

describe("family bulk submit party wiring (p0-fe-008-02)", () => {
  it("submits parties after each case creation", async () => {
    const { repo, createPartySpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });

    await m.submit();
    expect(createPartySpy).toHaveBeenCalled();
  });

  it("each sub-case has supporter parties submitted", async () => {
    const { repo, createPartySpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });

    await m.submit();

    const partyCalls = createPartySpy.mock.calls.map(
      (c) => c[0] as CasePartyCreateInput,
    );
    const applicants = m.familyApplicants.value;
    for (let i = 0; i < applicants.length; i++) {
      const caseId = `CASE-BULK-${i + 1}`;
      const caseParties = partyCalls.filter((p) => p.caseId === caseId);
      expect(caseParties.length).toBeGreaterThan(0);
    }
  });

  it("applicant with customerId is submitted as primary party", async () => {
    const { repo, createPartySpy } = createBulkRepo();
    const m = createSubmittableBulkModel({
      repo,
      sourceContext: {
        customerId: "cust-002",
        familyBulkMode: true,
        selectedRelations: [
          {
            id: "rel-1",
            name: "张三",
            relationType: "spouse",
            roleTitle: "配偶",
          },
        ],
      },
    });
    m.setDueDate("2026-06-01");
    m.setAmount("100000");

    await m.submit();

    const partyCalls = createPartySpy.mock.calls.map(
      (c) => c[0] as CasePartyCreateInput,
    );
    const primaryParties = partyCalls.filter((p) => p.isPrimary === true);
    expect(primaryParties.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  BULK SUBMIT: FAILURE ISOLATION
// ═══════════════════════════════════════════════════════════════════

describe("family bulk submit failure isolation (p0-fe-008-02)", () => {
  it("quick-create failure for one applicant does not block later applicants", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const fetchSpy = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ message: "duplicate applicant" }, { status: 400 }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "cust-new-2" }));
    vi.stubGlobal("fetch", fetchSpy);
    const m = createSubmittableBulkModel({ repo });
    const applicants = m.familyApplicants.value;

    const result = await m.submit();

    expect(result).toEqual({ id: "CASE-BULK-1" });
    expect(createCaseSpy).toHaveBeenCalledTimes(applicants.length - 1);
    expect(m.bulkResults.value[0].caseResult).toBeNull();
    expect(m.bulkResults.value[0].error).toContain("duplicate applicant");
    expect(m.bulkResults.value[1].caseResult?.id).toBe("CASE-BULK-1");
  });

  it("one sub-case failure does not block others", async () => {
    let callCount = 0;
    const { repo, createCaseSpy } = createBulkRepo({
      createCaseImpl: async () => {
        callCount++;
        if (callCount === 1) throw new Error("first case failed");
        return { id: `CASE-BULK-${callCount}` };
      },
    });
    const m = createSubmittableBulkModel({ repo });
    const applicantCount = m.familyApplicants.value.length;
    expect(applicantCount).toBeGreaterThan(1);

    const result = await m.submit();
    expect(createCaseSpy).toHaveBeenCalledTimes(applicantCount);
    expect(result).not.toBeNull();
    expect(m.partyWarnings.value.length).toBeGreaterThan(0);
  });

  it("all sub-cases fail → submitError set", async () => {
    const { repo } = createBulkRepo({
      createCaseImpl: async () => {
        throw new Error("all fail");
      },
    });
    const m = createSubmittableBulkModel({ repo });

    const result = await m.submit();
    expect(result).toBeNull();
    expect(m.submitError.value).toBeTruthy();
  });

  it("party submission failure is a warning, not an error", async () => {
    const { repo } = createBulkRepo({
      createPartyImpl: async () => {
        throw new Error("party failed");
      },
    });
    const m = createSubmittableBulkModel({ repo });

    const result = await m.submit();
    expect(result).not.toBeNull();
    expect(m.submitError.value).toBeNull();
    expect(m.partyWarnings.value.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  SOURCE CONTEXT PRESERVATION
// ═══════════════════════════════════════════════════════════════════

describe("family bulk source context preservation (p0-fe-008-02)", () => {
  it("group override applies to all bulk sub-cases", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });
    m.setGroup("osaka");
    m.setGroupOverrideReason("客户要求跨组");

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.groupId).toBe("osaka");
      expect(input.crossGroupReason).toBe("客户要求跨组");
    }
  });

  it("applicationType from draft is preserved in all sub-cases", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });
    m.setApplicationType("change_of_status");

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.applicationType).toBe("change_of_status");
    }
  });

  it("changed owner applies to all bulk sub-cases", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = createSubmittableBulkModel({ repo });
    m.setOwner("tanaka");

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.ownerUserId).toBe("tanaka");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  SINGLE VS BULK MODE ISOLATION
// ═══════════════════════════════════════════════════════════════════

describe("single vs bulk mode isolation (p0-fe-008-02)", () => {
  it("non-bulk mode still uses single submit path", async () => {
    const { repo, createCaseSpy } = createBulkRepo();
    const m = useCreateCaseModel(
      createBulkDeps({
        repo,
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      }),
    );
    m.setDueDate("2026-06-01");
    m.setAmount("100000");

    await m.submit();

    expect(createCaseSpy).toHaveBeenCalledTimes(1);
    expect(m.bulkResults.value.length).toBe(0);
  });

  it("bulk mode does not produce bulkResults in single mode", async () => {
    const { repo } = createBulkRepo();
    const m = useCreateCaseModel(
      createBulkDeps({
        repo,
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      }),
    );
    m.setDueDate("2026-06-01");
    m.setAmount("100000");

    await m.submit();
    expect(m.bulkResults.value.length).toBe(0);
  });
});
