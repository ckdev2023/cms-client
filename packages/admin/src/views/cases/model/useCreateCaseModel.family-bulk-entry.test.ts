import { describe, expect, it } from "vitest";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import {
  parseCaseCreateQuery,
  buildCaseCreateRoute,
  buildCaseCreateHref,
  FAMILY_BULK_ENTRY_CONTRACT,
  CASE_CREATE_QUERY_PARAM_KEYS,
} from "../query";
import { buildCustomerDetailHref } from "../query";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../constants";
import type { CaseCreateSourceContext } from "../types-create";
import { CUSTOMER_FAMILY_BULK_ENTRY_CONTRACT } from "../../customers/model/CustomerAdapterTypes";

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

const FAMILY_BULK_CTX_KNOWN: CaseCreateSourceContext = {
  customerId: "cust-002",
  familyBulkMode: true,
};

const FAMILY_BULK_CTX_UNKNOWN: CaseCreateSourceContext = {
  customerId: "cust-family-unknown",
  customerName: "伊藤太郎",
  customerKana: "イトウ タロウ",
  customerGroup: "tokyo-2",
  customerGroupLabel: "東京二組",
  customerContact: "090-5555-0000",
  familyBulkMode: true,
};

const FAMILY_BULK_CTX_WITH_RELATIONS: CaseCreateSourceContext = {
  customerId: "cust-002",
  familyBulkMode: true,
  selectedRelations: [
    {
      id: "rel-sp",
      name: "伊藤花子",
      relationType: "spouse",
      roleTitle: "配偶",
      phone: "080-1111-2222",
    },
    {
      id: "rel-ch",
      name: "伊藤太郎Jr",
      relationType: "child",
      roleTitle: "子女",
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
//  ENTRY ACTIVATION
// ═══════════════════════════════════════════════════════════════════

describe("family bulk entry activation (p0-fe-011-03)", () => {
  it("familyBulkMode activates family bulk scenario", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.isFamilyBulkScenario.value).toBe(true);
  });

  it("template defaults to family", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.draft.templateId).toBe("family");
  });

  it("non-bulk mode does not activate family bulk scenario", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-002", familyBulkMode: false },
      }),
    );
    expect(m.isFamilyBulkScenario.value).toBe(false);
  });

  it("hash activation: #family-bulk → familyBulkMode: true", () => {
    const sourceContext = parseCaseCreateQuery(
      { customerId: "cust-002" },
      "#family-bulk",
    );
    expect(sourceContext.familyBulkMode).toBe(true);

    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.isFamilyBulkScenario.value).toBe(true);
  });

  it("non-family-bulk hash does not activate", () => {
    const sourceContext = parseCaseCreateQuery(
      { customerId: "cust-002" },
      "#other",
    );
    expect(sourceContext.familyBulkMode).toBe(false);
  });

  it("enableFamilyBulkMode can switch from single to bulk mode", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-002", familyBulkMode: false },
      }),
    );
    expect(m.isFamilyBulkScenario.value).toBe(false);

    m.enableFamilyBulkMode();
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.draft.templateId).toBe("family");
    expect(m.isFamilyBulkScenario.value).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DEFAULTS INHERITANCE
// ═══════════════════════════════════════════════════════════════════

describe("family bulk defaults inheritance (p0-fe-011-03)", () => {
  it("known customer: group inherited from customer list", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.draft.group).toBe("tokyo-1");
  });

  it("unknown customer: group inherited from source context defaults", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_UNKNOWN }),
    );
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.name).toBe("伊藤太郎");
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("title includes (批量) suffix", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.effectiveTitle.value).toContain("（批量）");
  });

  it("title includes customer name", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_UNKNOWN }),
    );
    expect(m.effectiveTitle.value).toContain("伊藤太郎");
    expect(m.effectiveTitle.value).toContain("（批量）");
  });

  it("no selectedRelations → falls back to FAMILY_SCENARIO.defaultDraftParties", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.additionalParties.value.length).toBe(
      FAMILY_SCENARIO.defaultDraftParties.length,
    );
    expect(m.familySourcedFromRelations.value).toBe(false);
  });

  it("selectedRelations → seeds parties from relations", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_WITH_RELATIONS }),
    );
    expect(m.familySourcedFromRelations.value).toBe(true);
    expect(m.additionalParties.value.length).toBe(2);
    expect(m.additionalParties.value[0].name).toBe("伊藤花子");
    expect(m.additionalParties.value[1].name).toBe("伊藤太郎Jr");
  });

  it("seeded parties inherit group from draft", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    for (const party of m.additionalParties.value) {
      expect(party.group).toBe(m.draft.group);
    }
  });

  it("seeded parties from relations inherit group from draft", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_WITH_RELATIONS }),
    );
    for (const party of m.additionalParties.value) {
      expect(party.group).toBe(m.draft.group);
    }
  });

  it("familyApplicants computed from applicant roles", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_WITH_RELATIONS }),
    );
    const applicants = m.familyApplicants.value;
    expect(applicants.length).toBe(2);
    for (const a of applicants) {
      expect(["主申请人", "配偶", "子女"]).toContain(a.role);
    }
  });

  it("familySupporters include primary customer as supporter", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    const supporters = m.familySupporters.value;
    expect(supporters.some((s) => s.customerId === "cust-002")).toBe(true);
  });

  it("sourceCustomerId is exposed for return navigation", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.sourceCustomerId).toBe("cust-002");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  PRE-SUBMIT VALIDATION
// ═══════════════════════════════════════════════════════════════════

describe("family bulk pre-submit validation (p0-fe-011-03)", () => {
  it("canProceedStep1: passes when template and title are set", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.canProceedStep1.value).toBe(true);
  });

  it("canProceedStep2: passes when primary customer set and applicants exist", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.canProceedStep2.value).toBe(true);
  });

  it("canProceedStep2: fails when no applicants in family bulk mode", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-002", familyBulkMode: true },
        familyScenario: () => ({
          ...FAMILY_SCENARIO,
          defaultDraftParties: [
            {
              name: "保证人A",
              role: "保证人",
              relation: "保证人",
              contact: "phone",
              note: "",
              reuseDocs: [],
            },
          ],
        }),
      }),
    );
    expect(m.familyApplicants.value.length).toBe(0);
    expect(m.canProceedStep2.value).toBe(false);
  });

  it("canProceedStep2: fails without primary customer", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { familyBulkMode: true },
      }),
    );
    expect(m.primaryCustomer.value).toBeNull();
    expect(m.canProceedStep2.value).toBe(false);
  });

  it("canProceedStep3: fails without required fields (owner/dueDate/amount)", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.canProceedStep3.value).toBe(false);

    m.setDueDate("2026-07-01");
    expect(m.canProceedStep3.value).toBe(false);

    m.setAmount("100000");
    expect(m.canProceedStep3.value).toBe(true);
  });

  it("canProceedStep3: fails when group override reason missing", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    m.setDueDate("2026-07-01");
    m.setAmount("100000");
    m.setGroup("osaka");
    expect(m.needsGroupOverrideReason.value).toBe(true);
    expect(m.canProceedStep3.value).toBe(false);

    m.setGroupOverrideReason("客户要求跨组");
    expect(m.canProceedStep3.value).toBe(true);
  });

  it("familyContextComplete: true when primary customer and applicants present", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.familyContextComplete.value).toBe(true);
  });

  it("familyContextComplete: false without primary customer", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { familyBulkMode: true },
      }),
    );
    expect(m.familyContextComplete.value).toBe(false);
  });

  it("familyContextComplete: true for non-bulk mode (always)", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { familyBulkMode: false },
      }),
    );
    expect(m.familyContextComplete.value).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  RETURN CHAIN
// ═══════════════════════════════════════════════════════════════════

describe("family bulk return chain (p0-fe-011-03)", () => {
  it("sourceCustomerId enables customer detail return link", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.sourceCustomerId).toBe("cust-002");
    const href = buildCustomerDetailHref(m.sourceCustomerId!, "cases");
    expect(href).toBe("#/customers/cust-002?tab=cases");
  });

  it("sourceCustomerId is null when no customerId in context", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: { familyBulkMode: true } }),
    );
    expect(m.sourceCustomerId).toBeNull();
  });

  it("hasSourceContext is true for family bulk with customerId", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: FAMILY_BULK_CTX_KNOWN }),
    );
    expect(m.hasSourceContext.value).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  QUERY ROUND-TRIP: CUSTOMER → FAMILY BULK → MODEL
// ═══════════════════════════════════════════════════════════════════

describe("family bulk query round-trip (p0-fe-011-03)", () => {
  it("customer detail → buildCaseCreateRoute → parse → model: full chain", () => {
    const route = buildCaseCreateRoute(
      {
        customerId: "cust-rt-fam",
        customerName: "渡辺太郎",
        customerGroup: "tokyo-2",
        customerGroupLabel: "東京二組",
      },
      true,
    );

    expect(route.hash).toBe("#family-bulk");

    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    expect(sourceContext.familyBulkMode).toBe(true);

    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.isFamilyBulkScenario.value).toBe(true);
    expect(m.primaryCustomer.value!.name).toBe("渡辺太郎");
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.effectiveTitle.value).toContain("渡辺太郎");
    expect(m.effectiveTitle.value).toContain("（批量）");
  });

  it("contacts tab → buildCaseCreateRoute with relations → model seeding", () => {
    const relations = [
      { id: "rel-a", name: "花子", relationType: "spouse" as const },
      { id: "rel-b", name: "太郎Jr", relationType: "child" as const },
    ];

    const route = buildCaseCreateRoute(
      {
        customerId: "cust-contacts-fam",
        customerName: "田中太郎",
        customerGroup: "tokyo-1",
        customerGroupLabel: "東京一組",
        relationIds: relations.map((r) => r.id).join(","),
        selectedRelations: JSON.stringify(relations),
      },
      true,
    );

    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.isFamilyBulkScenario.value).toBe(true);
    expect(m.familySourcedFromRelations.value).toBe(true);
    expect(m.additionalParties.value.length).toBe(2);
    expect(m.additionalParties.value[0].name).toBe("花子");
    expect(m.additionalParties.value[1].name).toBe("太郎Jr");
  });

  it("href round-trip preserves family bulk hash", () => {
    const href = buildCaseCreateHref({ customerId: "cust-href-fam" }, true);
    expect(href).toContain("#family-bulk");
    expect(href).toContain("customerId=cust-href-fam");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  CONTRACT ALIGNMENT
// ═══════════════════════════════════════════════════════════════════

describe("FAMILY_BULK_ENTRY_CONTRACT alignment (p0-fe-011-03)", () => {
  it("activation hash matches #family-bulk", () => {
    expect(FAMILY_BULK_ENTRY_CONTRACT.activationHash).toBe("#family-bulk");
  });

  it("required fields are subset of CASE_CREATE_QUERY_PARAM_KEYS", () => {
    for (const key of FAMILY_BULK_ENTRY_CONTRACT.requiredFields) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain(key);
    }
  });

  it("recommended fields are subset of CASE_CREATE_QUERY_PARAM_KEYS", () => {
    for (const key of FAMILY_BULK_ENTRY_CONTRACT.recommendedFields) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain(key);
    }
  });

  it("optional fields are subset of CASE_CREATE_QUERY_PARAM_KEYS", () => {
    for (const key of FAMILY_BULK_ENTRY_CONTRACT.optionalFields) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain(key);
    }
  });

  it("default template is family", () => {
    expect(FAMILY_BULK_ENTRY_CONTRACT.defaultTemplateId).toBe("family");
  });

  it("customer-side contract activation hash matches cases-side", () => {
    expect(CUSTOMER_FAMILY_BULK_ENTRY_CONTRACT.activationHash).toBe(
      FAMILY_BULK_ENTRY_CONTRACT.activationHash,
    );
  });

  it("customer-side required keys match cases-side required fields", () => {
    expect(CUSTOMER_FAMILY_BULK_ENTRY_CONTRACT.requiredQueryKeys).toEqual(
      FAMILY_BULK_ENTRY_CONTRACT.requiredFields,
    );
  });

  it("customer-side recommended keys match cases-side recommended fields", () => {
    expect(CUSTOMER_FAMILY_BULK_ENTRY_CONTRACT.recommendedQueryKeys).toEqual(
      FAMILY_BULK_ENTRY_CONTRACT.recommendedFields,
    );
  });
});
