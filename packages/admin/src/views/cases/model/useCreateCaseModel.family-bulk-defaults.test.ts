// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-011-02 — family bulk defaults & submit handoff.
// Covers:
//   - family context inheritance: group, template, customer, parties
//     from source context (selectedRelations / customer defaults) into draft
//   - fallback behavior: no selectedRelations → default scenario parties;
//     no customer defaults → defaultGroup fallback
//   - submit handoff alignment: inherited context propagates correctly
//     through collectDraftSnapshot → buildCreateCaseInputFromDraft → each
//     sub-case in family bulk submit
//   - edge cases: empty relations, mixed roles, group override in bulk mode
// Does NOT test: single-case submit (→ focused.test),
//   party picker modal (→ useCasePartyPicker.test),
//   query parsing (→ query.family-entry-contract.test),
//   bulk failure isolation (→ family-bulk-submit.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import { FAMILY_BULK_ENTRY_CONTRACT } from "../query-create";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../constants";
import type { CaseRepository } from "./CaseRepository";
import type { CaseCreateInput } from "./CaseAdapterTypes";
import type {
  CaseCreateSourceContext,
  CaseCreateSelectedRelation,
} from "../types-create";

// ─── Helpers ─────────────────────────────────────────────────────

function createDeps(
  overrides: Partial<UseCreateCaseModelDeps> = {},
): UseCreateCaseModelDeps {
  return {
    templates: () => SAMPLE_CREATE_TEMPLATES,
    customers: () => SAMPLE_CREATE_CUSTOMERS,
    familyScenario: () => FAMILY_SCENARIO,
    ownerOptions: () => CASE_OWNER_OPTIONS,
    groupOptions: () => CASE_GROUP_OPTIONS,
    sourceContext: { familyBulkMode: false },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    ...overrides,
  };
}

function stubRepo() {
  let caseCounter = 0;
  const createCaseSpy = vi.fn<
    (input: CaseCreateInput) => Promise<{ id: string }>
  >(async () => ({
    id: `CASE-BULK-${++caseCounter}`,
  }));
  const createPartySpy = vi.fn(async () => ({ id: "party-stub" }));
  return {
    repo: {
      createCase: createCaseSpy,
      createCaseParty: createPartySpy,
    } as unknown as CaseRepository,
    createCaseSpy,
    createPartySpy,
  };
}

function familyCtx(
  overrides: Partial<CaseCreateSourceContext> = {},
): CaseCreateSourceContext {
  return {
    customerId: "cust-002",
    familyBulkMode: true,
    ...overrides,
  };
}

const SAMPLE_RELATIONS: CaseCreateSelectedRelation[] = [
  {
    id: "rel-sp",
    name: "田中花子",
    relationType: "spouse",
    roleTitle: "配偶",
    phone: "080-1111-1111",
  },
  {
    id: "rel-ch",
    name: "田中太郎",
    relationType: "child",
    phone: "080-2222-2222",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  FAMILY CONTEXT INHERITANCE: TEMPLATE
// ═══════════════════════════════════════════════════════════════════

describe("family context: template inheritance (p0-fe-011-02)", () => {
  it("familyBulkMode forces templateId to FAMILY_BULK_ENTRY_CONTRACT.defaultTemplateId", () => {
    const m = useCreateCaseModel(createDeps({ sourceContext: familyCtx() }));
    expect(m.draft.templateId).toBe(
      FAMILY_BULK_ENTRY_CONTRACT.defaultTemplateId,
    );
  });

  it("isFamilyBulkScenario is true", () => {
    const m = useCreateCaseModel(createDeps({ sourceContext: familyCtx() }));
    expect(m.isFamilyBulkScenario.value).toBe(true);
  });

  it("isFamilyBulkScenario is false when familyBulkMode is false", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-002", familyBulkMode: false },
      }),
    );
    expect(m.isFamilyBulkScenario.value).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  FAMILY CONTEXT INHERITANCE: GROUP
// ═══════════════════════════════════════════════════════════════════

describe("family context: group inheritance (p0-fe-011-02)", () => {
  it("inherits group from known customer in list", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: familyCtx({ customerId: "cust-002" }) }),
    );
    expect(m.draft.group).toBe("tokyo-1");
    expect(m.draft.inheritedGroup).toBe("tokyo-1");
  });

  it("inherits group from synthesized customer defaults", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({
          customerId: "cust-unknown",
          customerName: "山田花子",
          customerGroup: "tokyo-2",
          customerGroupLabel: "東京二組",
        }),
      }),
    );
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("falls back to defaultGroup when no customer group", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({ customerId: "cust-nonexist" }),
        defaultGroup: "osaka",
      }),
    );
    expect(m.draft.group).toBe("osaka");
  });

  it("group override works in family bulk mode", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: familyCtx({ customerId: "cust-002" }) }),
    );
    m.setGroup("tokyo-2");
    expect(m.isGroupOverridden.value).toBe(true);
    expect(m.needsGroupOverrideReason.value).toBe(true);
    expect(m.draft.inheritedGroup).toBe("tokyo-1");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  FAMILY CONTEXT INHERITANCE: PARTIES FROM SELECTED RELATIONS
// ═══════════════════════════════════════════════════════════════════

describe("family context: parties from selectedRelations (p0-fe-011-02)", () => {
  it("seeds parties from selectedRelations when present", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    expect(m.additionalParties.value).toHaveLength(2);
    expect(m.additionalParties.value[0].name).toBe("田中花子");
    expect(m.additionalParties.value[1].name).toBe("田中太郎");
  });

  it("seeded parties get correct roles from relationType", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    expect(m.additionalParties.value[0].role).toBe("配偶");
    expect(m.additionalParties.value[1].role).toBe("子女");
  });

  it("seeded parties inherit group from draft", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    for (const party of m.additionalParties.value) {
      expect(party.group).toBe(m.draft.group);
    }
  });

  it("seeded parties have customerId from relation id", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    expect(m.additionalParties.value[0].customerId).toBe("rel-sp");
    expect(m.additionalParties.value[1].customerId).toBe("rel-ch");
    expect(m.additionalParties.value[0].contactPersonId).toBeUndefined();
  });

  it("contact-person relations seed contactPersonId instead of customerId", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: [
            {
              id: "cp-001",
              name: "田中顾问",
              relationType: "agent",
              kind: "contact_person",
              email: "advisor@example.com",
            },
          ],
        }),
      }),
    );

    expect(m.additionalParties.value[0].contactPersonId).toBe("cp-001");
    expect(m.additionalParties.value[0].customerId).toBeUndefined();
  });

  it("familyApplicants computed correctly from seeded relations", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    const applicants = m.familyApplicants.value;
    expect(applicants.length).toBeGreaterThan(0);
    for (const a of applicants) {
      expect(["主申请人", "配偶", "子女"]).toContain(a.role);
    }
  });

  it("familySupporters include primaryCustomer as supporter", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    const supporters = m.familySupporters.value;
    const primaryId = m.primaryCustomer.value?.id;
    expect(primaryId).toBeTruthy();
    expect(supporters.some((s) => s.customerId === primaryId)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  FAMILY CONTEXT INHERITANCE: FALLBACK TO DEFAULT PARTIES
// ═══════════════════════════════════════════════════════════════════

describe("family context: fallback to FAMILY_SCENARIO defaults (p0-fe-011-02)", () => {
  it("seeds default scenario parties when no selectedRelations", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({
          customerId: "cust-002",
        }),
      }),
    );
    expect(m.additionalParties.value.length).toBe(
      FAMILY_SCENARIO.defaultDraftParties.length,
    );
  });

  it("default parties have names from FAMILY_SCENARIO", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({ customerId: "cust-002" }),
      }),
    );
    const expectedNames = FAMILY_SCENARIO.defaultDraftParties.map(
      (p) => p.name,
    );
    const actualNames = m.additionalParties.value.map((p) => p.name);
    expect(actualNames).toEqual(expectedNames);
  });

  it("default parties inherit group from draft", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: familyCtx({ customerId: "cust-002" }),
      }),
    );
    for (const party of m.additionalParties.value) {
      expect(party.group).toBe(m.draft.group);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  SUBMIT HANDOFF: INHERITED CONTEXT → SUB-CASE PAYLOADS
// ═══════════════════════════════════════════════════════════════════

describe("submit handoff: inherited context flows to sub-cases (p0-fe-011-02)", () => {
  it("all sub-cases use inherited group from draft", async () => {
    const { repo, createCaseSpy } = stubRepo();
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    m.setDueDate("2026-06-01");
    m.setAmount("120000");

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.groupId).toBe(m.draft.group);
    }
  });

  it("all sub-cases use draft owner", async () => {
    const { repo, createCaseSpy } = stubRepo();
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    m.setDueDate("2026-06-01");
    m.setAmount("120000");
    m.setOwner("tanaka");

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.ownerUserId).toBe("tanaka");
    }
  });

  it("all sub-cases use family template code", async () => {
    const { repo, createCaseSpy } = stubRepo();
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    m.setDueDate("2026-06-01");
    m.setAmount("120000");

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.caseTypeCode).toBe("family");
    }
  });

  it("each sub-case title uses applicant name (not primary customer)", async () => {
    const { repo, createCaseSpy } = stubRepo();
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    m.setDueDate("2026-06-01");
    m.setAmount("120000");

    const applicants = m.familyApplicants.value;
    await m.submit();

    for (let i = 0; i < applicants.length; i++) {
      const input = createCaseSpy.mock.calls[i][0] as CaseCreateInput;
      expect(input.caseName).toContain(applicants[i].name);
    }
  });

  it("sub-cases share same dueAt and quotePrice from draft", async () => {
    const { repo, createCaseSpy } = stubRepo();
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    m.setDueDate("2026-07-01");
    m.setAmount("200000");

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.dueAt).toBe("2026-07-01");
      expect(input.quotePrice).toBe(200000);
    }
  });

  it("group override with reason propagates to all sub-cases", async () => {
    const { repo, createCaseSpy } = stubRepo();
    const m = useCreateCaseModel(
      createDeps({
        repo,
        sourceContext: familyCtx({
          customerId: "cust-002",
          selectedRelations: SAMPLE_RELATIONS,
        }),
      }),
    );
    m.setDueDate("2026-06-01");
    m.setAmount("120000");
    m.setGroup("osaka");
    m.setGroupOverrideReason("客户要求跨组");

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.groupId).toBe("osaka");
      expect(input.crossGroupReason).toBe("客户要求跨组");
    }
  });
});
