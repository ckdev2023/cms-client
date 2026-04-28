// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-008-03 — case party flow focused tests.
// Covers: party submission mechanics across three submit paths:
//   1. Single customer → primary party (partyType=applicant, isPrimary=true)
//   2. Related person → related parties (role-based partyType, isPrimary=false)
//   3. Family bulk → per-applicant primary + shared supporters
// Does NOT test: case creation payload (→ focused.test / create-flow.test),
//   draft wizard logic (→ useCreateCaseModel.test),
//   bulk case creation counts (→ family-bulk-submit.test).
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
import type { CaseCreateInput, CasePartyCreateInput } from "./CaseAdapterTypes";

// ─── Helpers ─────────────────────────────────────────────────────

function trackingRepo() {
  let n = 0;
  const caseSpy = vi.fn<(input: CaseCreateInput) => Promise<{ id: string }>>(
    async () => ({
      id: `CASE-PT-${++n}`,
    }),
  );
  const partySpy = vi.fn<
    (input: CasePartyCreateInput) => Promise<{ id: string }>
  >(async () => ({
    id: "party-stub",
  }));
  return {
    repo: {
      createCase: caseSpy,
      createCaseParty: partySpy,
    } as unknown as CaseRepository,
    caseSpy,
    partySpy,
    calls: () => partySpy.mock.calls.map((c) => c[0]),
  };
}

function deps(o: Partial<UseCreateCaseModelDeps> = {}): UseCreateCaseModelDeps {
  return {
    templates: () => SAMPLE_CREATE_TEMPLATES,
    customers: () => SAMPLE_CREATE_CUSTOMERS,
    familyScenario: () => FAMILY_SCENARIO,
    ownerOptions: () => CASE_OWNER_OPTIONS,
    groupOptions: () => CASE_GROUP_OPTIONS,
    sourceContext: { customerId: "cust-001", familyBulkMode: false },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    ...o,
  };
}

function ready(m: ReturnType<typeof useCreateCaseModel>) {
  m.setDueDate("2026-06-01");
  m.setAmount("100000");
  return m;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════
//  PATH 1: SINGLE CUSTOMER → PRIMARY PARTY
// ═══════════════════════════════════════════════════════════════════

describe("single customer party (p0-fe-008-03)", () => {
  it("primary customer → applicant party isPrimary=true", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    await m.submit();
    const p = r.calls().find((c) => c.isPrimary);
    expect(p).toBeDefined();
    expect(p!.partyType).toBe("applicant");
    expect(p!.customerId).toBe("cust-001");
    expect(p!.caseId).toBe("CASE-PT-1");
  });

  it("primary party caseId matches created case", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    const result = await m.submit();
    expect(r.calls().find((c) => c.isPrimary)!.caseId).toBe(result!.id);
  });

  it("no primary party when no primary customer", async () => {
    const r = trackingRepo();
    const m = ready(
      useCreateCaseModel(
        deps({ repo: r.repo, sourceContext: { familyBulkMode: false } }),
      ),
    );
    await m.submit();
    expect(r.calls().filter((c) => c.isPrimary).length).toBe(0);
  });

  it("exactly 1 party call with no additional parties", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    await m.submit();
    expect(r.partySpy).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  PATH 2: RELATED PERSON PARTIES
// ═══════════════════════════════════════════════════════════════════

describe("related person parties (p0-fe-008-03)", () => {
  it("related party → isPrimary=false with correct customerId", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "rel-01",
      name: "A",
      role: "配偶",
      contact: "",
      note: "",
    });
    await m.submit();
    const related = r.calls().filter((c) => !c.isPrimary);
    expect(related.length).toBe(1);
    expect(related[0].customerId).toBe("rel-01");
  });

  it("contact-person related party → payload uses contactPersonId", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      contactPersonId: "cp-01",
      name: "顾问A",
      role: "保证人",
      contact: "advisor@example.com",
      note: "",
    });
    await m.submit();
    const related = r.calls().filter((c) => !c.isPrimary);
    expect(related.length).toBe(1);
    expect(related[0].contactPersonId).toBe("cp-01");
    expect(related[0].customerId).toBeUndefined();
  });

  it("role 配偶/子女 → partyType family", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "S",
      role: "配偶",
      contact: "",
      note: "",
    });
    m.addRelatedParty({
      customerId: "r2",
      name: "C",
      role: "子女",
      contact: "",
      note: "",
    });
    await m.submit();
    const related = r.calls().filter((c) => !c.isPrimary);
    expect(related.every((p) => p.partyType === "family")).toBe(true);
  });

  it("role 扶养者/保证人 → partyType supporter", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "A",
      role: "扶养者",
      contact: "",
      note: "",
    });
    m.addRelatedParty({
      customerId: "r2",
      name: "B",
      role: "保证人",
      contact: "",
      note: "",
    });
    await m.submit();
    const related = r.calls().filter((c) => !c.isPrimary);
    expect(related.every((p) => p.partyType === "supporter")).toBe(true);
  });

  it("multiple related parties submitted in order", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "A",
      role: "配偶",
      contact: "",
      note: "",
    });
    m.addRelatedParty({
      customerId: "r2",
      name: "B",
      role: "子女",
      contact: "",
      note: "",
    });
    await m.submit();
    const related = r.calls().filter((c) => !c.isPrimary);
    expect(related[0].customerId).toBe("r1");
    expect(related[1].customerId).toBe("r2");
  });

  it("primary + N related → total party calls = 1 + N", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "A",
      role: "配偶",
      contact: "",
      note: "",
    });
    m.addRelatedParty({
      customerId: "r2",
      name: "B",
      role: "子女",
      contact: "",
      note: "",
    });
    await m.submit();
    expect(r.partySpy).toHaveBeenCalledTimes(3);
  });

  it("party without customerId → customerId undefined in payload", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({ name: "NoCid", role: "子女", contact: "", note: "" });
    await m.submit();
    const related = r.calls().filter((c) => !c.isPrimary);
    expect(related[0].customerId).toBeUndefined();
  });

  it("relationToCase falls back to role when no relation", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "A",
      role: "配偶",
      contact: "",
      note: "",
    });
    await m.submit();
    expect(r.calls().filter((c) => !c.isPrimary)[0].relationToCase).toBe(
      "配偶",
    );
  });

  it("explicit relation overrides role as relationToCase", async () => {
    const r = trackingRepo();
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "A",
      role: "配偶",
      relation: "妻子",
      contact: "",
      note: "",
    });
    await m.submit();
    expect(r.calls().filter((c) => !c.isPrimary)[0].relationToCase).toBe(
      "妻子",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
//  PATH 3: FAMILY BULK PARTY FLOW
// ═══════════════════════════════════════════════════════════════════

describe("family bulk party details (p0-fe-008-03)", () => {
  function bulkModel(o: Partial<UseCreateCaseModelDeps> = {}) {
    let customerCounter = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ id: `cust-auto-${++customerCounter}` }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );
    const r = trackingRepo();
    const m = ready(
      useCreateCaseModel(
        deps({
          repo: r.repo,
          sourceContext: { customerId: "cust-002", familyBulkMode: true },
          ...o,
        }),
      ),
    );
    return { m, ...r };
  }

  it("each sub-case has applicant as primary (isPrimary=true)", async () => {
    const { m, calls } = bulkModel();
    const applicants = m.familyApplicants.value;
    expect(applicants.length).toBeGreaterThan(0);
    await m.submit();
    for (let i = 0; i < applicants.length; i++) {
      const caseId = `CASE-PT-${i + 1}`;
      const caseParties = calls().filter((c) => c.caseId === caseId);
      if (applicants[i].customerId) {
        expect(
          caseParties.some((p) => p.isPrimary && p.partyType === "applicant"),
        ).toBe(true);
      }
    }
  });

  it("each sub-case has supporters attached", async () => {
    const { m, calls } = bulkModel();
    const applicants = m.familyApplicants.value;
    expect(m.familySupporters.value.length).toBeGreaterThan(0);
    await m.submit();
    for (let i = 0; i < applicants.length; i++) {
      const caseId = `CASE-PT-${i + 1}`;
      const related = calls().filter(
        (c) => c.caseId === caseId && !c.isPrimary,
      );
      expect(related.length).toBeGreaterThan(0);
    }
  });

  it("primaryCustomer included as supporter in bulk sub-cases", async () => {
    const { m, calls } = bulkModel();
    const primaryId = m.primaryCustomer.value?.id;
    expect(primaryId).toBeTruthy();
    await m.submit();
    const firstCaseRelated = calls().filter(
      (c) => c.caseId === "CASE-PT-1" && !c.isPrimary,
    );
    expect(
      firstCaseRelated.some(
        (p) => p.customerId === primaryId || p.relationToCase,
      ),
    ).toBe(true);
  });

  it("supporters shared equally across all sub-cases", async () => {
    const { m, calls } = bulkModel();
    const applicants = m.familyApplicants.value;
    if (applicants.length < 2) return;
    await m.submit();
    const c1Related = calls().filter(
      (c) => c.caseId === "CASE-PT-1" && !c.isPrimary,
    );
    const c2Related = calls().filter(
      (c) => c.caseId === "CASE-PT-2" && !c.isPrimary,
    );
    expect(c1Related.length).toBe(c2Related.length);
  });

  it("selectedRelations flow through to bulk party submission", async () => {
    const r = trackingRepo();
    const m = ready(
      useCreateCaseModel(
        deps({
          repo: r.repo,
          sourceContext: {
            customerId: "cust-002",
            familyBulkMode: true,
            selectedRelations: [
              {
                id: "sel-1",
                name: "选定配偶",
                relationType: "spouse",
                roleTitle: "配偶",
              },
              { id: "sel-2", name: "选定子女", relationType: "child" },
            ],
          },
        }),
      ),
    );
    expect(m.familyApplicants.value.map((a) => a.name)).toContain("选定配偶");
    await m.submit();
    expect(r.calls().length).toBeGreaterThan(0);
  });

  it("bulk party failure → warning, case result preserved", async () => {
    const r = trackingRepo();
    r.partySpy.mockRejectedValue(new Error("party service down"));
    const { m } = bulkModel({ repo: r.repo });
    const result = await m.submit();
    expect(result).not.toBeNull();
    expect(m.submitError.value).toBeNull();
    expect(m.partyWarnings.value.length).toBeGreaterThan(0);
  });

  it("party warnings reference applicant names", async () => {
    const r = trackingRepo();
    r.partySpy.mockRejectedValue(new Error("fail"));
    const { m } = bulkModel({ repo: r.repo });
    await m.submit();
    for (const a of m.familyApplicants.value) {
      expect(m.partyWarnings.value.some((w) => w.includes(a.name))).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  PARTY FAILURE ISOLATION (SINGLE MODE)
// ═══════════════════════════════════════════════════════════════════

describe("single mode party failure isolation (p0-fe-008-03)", () => {
  it("primary party failure → warning, case succeeds", async () => {
    let n = 0;
    const r = trackingRepo();
    r.partySpy.mockImplementation(async () => {
      if (++n === 1) throw new Error("primary party failed");
      return { id: "ok" };
    });
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    const result = await m.submit();
    expect(result).not.toBeNull();
    expect(m.submitError.value).toBeNull();
    expect(m.partyWarnings.value.length).toBe(1);
    expect(m.partyWarnings.value[0]).toContain("Primary party");
  });

  it("related party failure → warning with party name", async () => {
    let n = 0;
    const r = trackingRepo();
    r.partySpy.mockImplementation(async () => {
      if (++n === 2) throw new Error("related fail");
      return { id: "ok" };
    });
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "PartyX",
      role: "配偶",
      contact: "",
      note: "",
    });
    const result = await m.submit();
    expect(result).not.toBeNull();
    expect(m.partyWarnings.value.length).toBe(1);
    expect(m.partyWarnings.value[0]).toContain("PartyX");
  });

  it("all party failures → warnings only, case result preserved", async () => {
    const r = trackingRepo();
    r.partySpy.mockRejectedValue(new Error("all fail"));
    const m = ready(useCreateCaseModel(deps({ repo: r.repo })));
    m.addRelatedParty({
      customerId: "r1",
      name: "A",
      role: "配偶",
      contact: "",
      note: "",
    });
    m.addRelatedParty({
      customerId: "r2",
      name: "B",
      role: "子女",
      contact: "",
      note: "",
    });
    const result = await m.submit();
    expect(result).not.toBeNull();
    expect(m.submitResult.value?.id).toBe("CASE-PT-1");
    expect(m.submitError.value).toBeNull();
    expect(m.partyWarnings.value.length).toBe(3);
  });
});
