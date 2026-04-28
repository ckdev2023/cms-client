import { describe, expect, it } from "vitest";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import {
  parseCaseCreateQuery,
  buildCaseCreateQuery,
  buildCaseCreateRoute,
} from "../query-create";
import {
  buildCaseListQuery,
  parseCaseListQuery,
  buildCaseDetailRoute,
  buildCustomerDetailHref,
} from "../query";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../constants";
import type { CaseCreateSourceContext } from "../types-create";

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

function simulateCustomerEntry(
  customerId: string,
  extraQuery: Record<string, string> = {},
  hash = "",
): CaseCreateSourceContext {
  const query = buildCaseCreateQuery({ customerId, ...extraQuery });
  return parseCaseCreateQuery(query as Record<string, string>, hash);
}

function simulateCustomerEntryWithDefaults(
  customerId: string,
  defaults: {
    name?: string;
    kana?: string;
    group?: string;
    groupLabel?: string;
    contact?: string;
  },
  hash = "",
): CaseCreateSourceContext {
  const query = buildCaseCreateQuery({
    customerId,
    customerName: defaults.name,
    customerKana: defaults.kana,
    customerGroup: defaults.group,
    customerGroupLabel: defaults.groupLabel,
    customerContact: defaults.contact,
  });
  return parseCaseCreateQuery(query as Record<string, string>, hash);
}

// ═══════════════════════════════════════════════════════════════════
//  ENTRY WITH KNOWN CUSTOMER (in create customer list)
// ═══════════════════════════════════════════════════════════════════

describe("entry with known customerId (p0-fe-010-03)", () => {
  it("resolves primaryCustomer from list when customerId matches", () => {
    const ctx = simulateCustomerEntry("cust-001");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-001");
    expect(m.primaryCustomer.value!.name).toBe("李娜");
  });

  it("inherits group from listed customer", () => {
    const ctx = simulateCustomerEntry("cust-003");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("derives title from listed customer name", () => {
    const ctx = simulateCustomerEntry("cust-001");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.effectiveTitle.value).toContain("李娜");
  });

  it("hasSourceContext is true", () => {
    const ctx = simulateCustomerEntry("cust-001");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.hasSourceContext.value).toBe(true);
  });

  it("canProceedStep2 is true with known customer", () => {
    const ctx = simulateCustomerEntry("cust-001");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.canProceedStep2.value).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  ENTRY WITH UNKNOWN CUSTOMER + DEFAULTS
// ═══════════════════════════════════════════════════════════════════

describe("entry with unknown customerId + customer defaults (p0-fe-010-03)", () => {
  it("synthesizes primaryCustomer from defaults", () => {
    const ctx = simulateCustomerEntryWithDefaults("cust-unknown-1", {
      name: "高橋太郎",
      group: "tokyo-2",
      groupLabel: "東京二組",
    });
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-unknown-1");
    expect(m.primaryCustomer.value!.name).toBe("高橋太郎");
  });

  it("inherits group from customer defaults", () => {
    const ctx = simulateCustomerEntryWithDefaults("cust-unknown-2", {
      name: "渡辺",
      group: "tokyo-2",
      groupLabel: "東京二組",
    });
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("groupInheritanceLabel reflects default groupLabel", () => {
    const ctx = simulateCustomerEntryWithDefaults("cust-unknown-3", {
      name: "佐々木",
      group: "tokyo-2",
      groupLabel: "東京二組",
    });
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.groupInheritanceLabel.value).toBe("東京二組");
  });

  it("derives title from defaults name", () => {
    const ctx = simulateCustomerEntryWithDefaults("cust-unknown-4", {
      name: "山本次郎",
      group: "tokyo-1",
    });
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.effectiveTitle.value).toContain("山本次郎");
  });

  it("canProceedStep2 passes with synthesized customer", () => {
    const ctx = simulateCustomerEntryWithDefaults("cust-unknown-5", {
      name: "中村",
    });
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.canProceedStep2.value).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  ENTRY WITH UNKNOWN CUSTOMER + NO DEFAULTS
// ═══════════════════════════════════════════════════════════════════

describe("entry with unknown customerId but no defaults (p0-fe-010-03)", () => {
  it("primaryCustomer is null when no name default", () => {
    const ctx = simulateCustomerEntry("cust-not-found");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value).toBeNull();
  });

  it("falls back to defaultGroup when no customer group", () => {
    const ctx = simulateCustomerEntry("cust-not-found");
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, defaultGroup: "osaka" }),
    );
    expect(m.draft.group).toBe("osaka");
  });

  it("hasSourceContext is true (customerId is present)", () => {
    const ctx = simulateCustomerEntry("cust-not-found");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.hasSourceContext.value).toBe(true);
  });

  it("canProceedStep2 is false (no primary customer selected)", () => {
    const ctx = simulateCustomerEntry("cust-not-found");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.canProceedStep2.value).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  ENTRY WITHOUT CUSTOMERID
// ═══════════════════════════════════════════════════════════════════

describe("entry without customerId (p0-fe-010-03)", () => {
  it("hasSourceContext is false", () => {
    const ctx = parseCaseCreateQuery({}, "");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.hasSourceContext.value).toBe(false);
  });

  it("primaryCustomer is null", () => {
    const ctx = parseCaseCreateQuery({}, "");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value).toBeNull();
  });

  it("uses defaultGroup", () => {
    const ctx = parseCaseCreateQuery({}, "");
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, defaultGroup: "osaka" }),
    );
    expect(m.draft.group).toBe("osaka");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  RETURN NAVIGATION: BACK TO CASE LIST WITH CUSTOMERID FILTER
// ═══════════════════════════════════════════════════════════════════

describe("return navigation: case list with customerId (p0-fe-010-03)", () => {
  it("buildCaseListQuery with customerId produces filterable query", () => {
    const query = buildCaseListQuery({
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
      customerId: "cust-001",
    });
    expect(query.customerId).toBe("cust-001");
    expect(query.scope).toBe("all");
  });

  it("parseCaseListQuery recovers customerId from return query", () => {
    const query = buildCaseListQuery({
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
      customerId: "cust-return-001",
    });
    const parsed = parseCaseListQuery(query as Record<string, string>);
    expect(parsed.customerId).toBe("cust-return-001");
  });

  it("return query omits customerId when not present", () => {
    const query = buildCaseListQuery({
      scope: "mine",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
    });
    expect(query.customerId).toBeUndefined();
  });

  it("return to case list preserves customerId context through round-trip", () => {
    const sourceCtx = simulateCustomerEntry("cust-roundtrip");

    const returnQuery = buildCaseListQuery({
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
      customerId: sourceCtx.customerId,
    });

    const parsed = parseCaseListQuery(returnQuery as Record<string, string>);
    expect(parsed.customerId).toBe("cust-roundtrip");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  RETURN NAVIGATION: TO CREATED CASE DETAIL
// ═══════════════════════════════════════════════════════════════════

describe("return navigation: to created case detail (p0-fe-010-03)", () => {
  it("buildCaseDetailRoute produces valid route for created case", () => {
    const route = buildCaseDetailRoute("CASE-CREATED-001");
    expect(route.name).toBe("case-detail");
    expect(route.params.id).toBe("CASE-CREATED-001");
  });

  it("case detail → customer return href preserves customer context", () => {
    const href = buildCustomerDetailHref("cust-001", "cases");
    expect(href).toBe("#/customers/cust-001?tab=cases");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  E2E REGRESSION: CUSTOMER DETAIL → CREATE → RETURN
// ═══════════════════════════════════════════════════════════════════

describe("E2E: customer detail → create → return (p0-fe-010-03)", () => {
  it("full single-create cycle with known customer", () => {
    const customerId = "cust-001";

    const route = buildCaseCreateRoute({ customerId });
    expect(route.name).toBe("case-create");

    const ctx = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    expect(ctx.customerId).toBe(customerId);
    expect(ctx.familyBulkMode).toBe(false);

    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value!.id).toBe(customerId);
    expect(m.draft.group).toBe("tokyo-1");
    expect(m.effectiveTitle.value).toContain("李娜");
    expect(m.hasSourceContext.value).toBe(true);

    const returnQuery = buildCaseListQuery({
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
      customerId: ctx.customerId,
    });
    expect(returnQuery.customerId).toBe(customerId);
  });

  it("full single-create cycle with unknown customer + defaults", () => {
    const customerId = "cust-unknown-e2e";
    const route = buildCaseCreateRoute({
      customerId,
      customerName: "テスト太郎",
      customerGroup: "tokyo-2",
      customerGroupLabel: "東京二組",
      customerContact: "090-0000-0000",
    });

    const ctx = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value!.id).toBe(customerId);
    expect(m.primaryCustomer.value!.name).toBe("テスト太郎");
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.effectiveTitle.value).toContain("テスト太郎");
  });

  it("full batch-create cycle from customer detail", () => {
    const customerId = "cust-002";
    const route = buildCaseCreateRoute({ customerId }, true);

    const ctx = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    expect(ctx.familyBulkMode).toBe(true);

    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.draft.templateId).toBe("family");
    expect(m.primaryCustomer.value!.id).toBe(customerId);
    expect(m.isFamilyBulkScenario.value).toBe(true);
  });

  it("full batch-create cycle from contacts tab with relations", () => {
    const customerId = "cust-002";
    const relations = [
      { id: "rel-a", name: "田中花子", relationType: "spouse" },
      { id: "rel-b", name: "田中太郎", relationType: "child" },
    ];

    const route = buildCaseCreateRoute(
      {
        customerId,
        relationIds: relations.map((r) => r.id).join(","),
        selectedRelations: JSON.stringify(relations),
      },
      true,
    );

    const ctx = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.primaryCustomer.value!.id).toBe(customerId);
    expect(m.additionalParties.value.length).toBe(2);
    expect(m.additionalParties.value[0].name).toBe("田中花子");
    expect(m.additionalParties.value[1].name).toBe("田中太郎");
  });

  it("customer known → group override → return preserves context", () => {
    const ctx = simulateCustomerEntry("cust-003");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));

    expect(m.draft.group).toBe("tokyo-2");
    m.setGroup("tokyo-1");
    expect(m.isGroupOverridden.value).toBe(true);
    expect(m.draft.inheritedGroup).toBe("tokyo-2");

    const returnQuery = buildCaseListQuery({
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
      customerId: ctx.customerId,
    });
    expect(returnQuery.customerId).toBe("cust-003");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DEFAULT VALUE INHERITANCE PRIORITY
// ═══════════════════════════════════════════════════════════════════

describe("default value inheritance priority (p0-fe-010-03)", () => {
  it("listed customer takes priority over source context defaults", () => {
    const ctx = simulateCustomerEntryWithDefaults("cust-001", {
      name: "偽名前",
      group: "osaka",
      groupLabel: "大阪組",
    });
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value!.name).toBe("李娜");
    expect(m.draft.group).toBe("tokyo-1");
  });

  it("source context defaults used when customer not in list", () => {
    const ctx = simulateCustomerEntryWithDefaults("cust-999", {
      name: "新規客様",
      group: "tokyo-2",
      groupLabel: "東京二組",
    });
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value!.name).toBe("新規客様");
    expect(m.draft.group).toBe("tokyo-2");
  });

  it("defaultGroup used when no customer group context at all", () => {
    const ctx = simulateCustomerEntry("cust-no-match");
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, defaultGroup: "osaka" }),
    );
    expect(m.draft.group).toBe("osaka");
    expect(m.draft.inheritedGroup).toBe("osaka");
  });

  it("defaultOwner is always applied regardless of source context", () => {
    const ctx = simulateCustomerEntry("cust-001");
    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, defaultOwner: "tanaka" }),
    );
    expect(m.draft.owner).toBe("tanaka");
  });

  it("template defaults to family[0] when no familyBulkMode", () => {
    const ctx = simulateCustomerEntry("cust-001");
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.draft.templateId).toBe(SAMPLE_CREATE_TEMPLATES[0].id);
  });

  it("template forced to family when familyBulkMode", () => {
    const ctx = parseCaseCreateQuery(
      { customerId: "cust-001" },
      "#family-bulk",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.draft.templateId).toBe("family");
  });
});
