import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import { parseCaseCreateQuery, buildCaseCreateRoute } from "../query-create";
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

const SAMPLE_RELATIONS: CaseCreateSelectedRelation[] = [
  {
    id: "rel-sp",
    name: "田中花子",
    relationType: "spouse",
    roleTitle: "配偶",
    phone: "080-1111-2222",
  },
  {
    id: "rel-ch",
    name: "田中一郎",
    relationType: "child",
    roleTitle: "子",
  },
];

describe("submit handoff: party wiring per sub-case (p0-fe-011-02)", () => {
  it("creates one case per applicant from selectedRelations", async () => {
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

    const applicantCount = m.familyApplicants.value.length;
    await m.submit();

    expect(createCaseSpy).toHaveBeenCalledTimes(applicantCount);
  });

  it("submits parties after each sub-case creation", async () => {
    const { repo, createPartySpy } = stubRepo();
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
    expect(createPartySpy).toHaveBeenCalled();
  });

  it("submitResult points to first created case", async () => {
    const { repo } = stubRepo();
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

    const result = await m.submit();
    expect(result).toEqual({ id: "CASE-BULK-1" });
  });

  it("bulkResults array has one entry per applicant", async () => {
    const { repo } = stubRepo();
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
    expect(m.bulkResults.value.length).toBe(m.familyApplicants.value.length);
  });
});

describe("E2E: customer → family entry → model → submit (p0-fe-011-02)", () => {
  it("full cycle: build route → parse → model → submit preserves context", async () => {
    const { repo, createCaseSpy } = stubRepo();
    const customerId = "cust-002";
    const relations = SAMPLE_RELATIONS;

    const route = buildCaseCreateRoute(
      {
        customerId,
        selectedRelations: JSON.stringify(relations),
        relationIds: relations.map((r) => r.id).join(","),
      },
      true,
    );

    const ctx = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    expect(ctx.familyBulkMode).toBe(true);
    expect(ctx.customerId).toBe(customerId);
    expect(ctx.selectedRelations).toHaveLength(2);

    const m = useCreateCaseModel(createDeps({ repo, sourceContext: ctx }));
    expect(m.draft.templateId).toBe("family");
    expect(m.isFamilyBulkScenario.value).toBe(true);
    expect(m.primaryCustomer.value!.id).toBe(customerId);
    expect(m.additionalParties.value).toHaveLength(2);

    m.setDueDate("2026-08-01");
    m.setAmount("180000");

    const result = await m.submit();
    expect(result).not.toBeNull();

    const applicantCount = m.familyApplicants.value.length;
    expect(createCaseSpy).toHaveBeenCalledTimes(applicantCount);

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.groupId).toBe(m.draft.group);
      expect(input.caseTypeCode).toBe("family");
      expect(input.dueAt).toBe("2026-08-01");
      expect(input.quotePrice).toBe(180000);
    }
  });

  it("full cycle with customer defaults (unknown customer)", async () => {
    const { repo, createCaseSpy } = stubRepo();
    stubQuickCreateFetch();
    const route = buildCaseCreateRoute(
      {
        customerId: "cust-new-family",
        customerName: "新規扶養者",
        customerGroup: "tokyo-2",
        customerGroupLabel: "東京二組",
      },
      true,
    );

    const ctx = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const m = useCreateCaseModel(createDeps({ repo, sourceContext: ctx }));
    expect(m.primaryCustomer.value!.name).toBe("新規扶養者");
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.additionalParties.value.length).toBe(
      FAMILY_SCENARIO.defaultDraftParties.length,
    );

    m.setDueDate("2026-09-01");
    m.setAmount("100000");

    await m.submit();

    for (const call of createCaseSpy.mock.calls) {
      const input = call[0] as CaseCreateInput;
      expect(input.groupId).toBe("tokyo-2");
    }
  });
});
