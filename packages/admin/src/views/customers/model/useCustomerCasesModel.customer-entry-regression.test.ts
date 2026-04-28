import { describe, expect, it, vi } from "vitest";
import {
  useCreateCaseModel,
  synthesizeCustomerFromSourceContext,
  type UseCreateCaseModelDeps,
} from "../../cases/model/useCreateCaseModel";
import {
  parseCaseCreateQuery,
  buildCaseCreateRoute,
  buildCaseCreateHref,
  buildCustomerDetailHref,
} from "../../cases/query";
import type { CaseCreateQueryParams } from "../../cases/query";
import type { CaseCreateSourceContext } from "../../cases/types-create";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../../cases/fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../../cases/constants";
import { CUSTOMER_CREATE_CASE_ENTRY_CONTRACT } from "./CustomerAdapterTypes";
import type { CaseRepository } from "../../cases/model/CaseRepository";

// ─── Helpers ─────────────────────────────────────────────────────

function stubRepo() {
  return {
    createCase: vi.fn(async () => ({ id: "CASE-STUB" })),
    createCaseParty: vi.fn(async () => ({ id: "party-stub" })),
  } as unknown as CaseRepository;
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
    sourceContext: { familyBulkMode: false },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    repo: stubRepo(),
    ...overrides,
  };
}

function simulateCustomerDetailEntry(
  customer: {
    id: string;
    displayName: string;
    furigana?: string;
    group?: string;
    groupLabel?: string;
    templateId?: "family" | "work" | "bmv";
    phone?: string;
    email?: string;
  },
  familyBulk = false,
): CaseCreateSourceContext {
  const params: CaseCreateQueryParams = {
    customerId: customer.id,
    customerName: customer.displayName,
    customerKana: customer.furigana,
    templateId: customer.templateId,
    customerGroup: customer.group,
    customerGroupLabel: customer.groupLabel,
    customerContact: [customer.phone, customer.email]
      .filter(Boolean)
      .join(" / "),
  };
  const route = buildCaseCreateRoute(params, familyBulk);
  return parseCaseCreateQuery(
    (route.query ?? {}) as Record<string, string>,
    route.hash ?? "",
  );
}

// ═══════════════════════════════════════════════════════════════════
//  1. ENTRY WITH CUSTOMER ID — QUERY ROUND-TRIP & MODEL INIT
// ═══════════════════════════════════════════════════════════════════

describe("entry with customerId: query round-trip (p0-fe-010-03)", () => {
  it("customerId survives build → parse round-trip", () => {
    const ctx = simulateCustomerDetailEntry({
      id: "cust-entry-001",
      displayName: "テスト太郎",
    });
    expect(ctx.customerId).toBe("cust-entry-001");
    expect(ctx.familyBulkMode).toBe(false);
  });

  it("customerId + familyBulkMode both survive round-trip", () => {
    const ctx = simulateCustomerDetailEntry(
      { id: "cust-entry-002", displayName: "テスト花子" },
      true,
    );
    expect(ctx.customerId).toBe("cust-entry-002");
    expect(ctx.familyBulkMode).toBe(true);
  });

  it("customer defaults survive round-trip", () => {
    const ctx = simulateCustomerDetailEntry({
      id: "cust-entry-003",
      displayName: "山田太郎",
      furigana: "ヤマダタロウ",
      group: "tokyo-2",
      groupLabel: "東京二組",
      phone: "090-1111-2222",
      email: "yamada@example.com",
    });
    expect(ctx.customerName).toBe("山田太郎");
    expect(ctx.customerKana).toBe("ヤマダタロウ");
    expect(ctx.customerGroup).toBe("tokyo-2");
    expect(ctx.customerGroupLabel).toBe("東京二組");
    expect(ctx.customerContact).toBe("090-1111-2222 / yamada@example.com");
  });

  it("empty optional fields are omitted in round-trip", () => {
    const ctx = simulateCustomerDetailEntry({
      id: "cust-entry-004",
      displayName: "最小テスト",
    });
    expect(ctx.customerId).toBe("cust-entry-004");
    expect(ctx.customerName).toBe("最小テスト");
    expect(ctx.customerKana).toBeUndefined();
    expect(ctx.customerGroup).toBeUndefined();
    expect(ctx.customerContact).toBeUndefined();
  });
});

describe("entry with customerId: model pre-selection (p0-fe-010-03)", () => {
  it("primaryCustomer is pre-selected when customerId matches create customer list", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      }),
    );
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-001");
    expect(m.primaryCustomer.value!.name).toBe("李娜");
  });

  it("primaryCustomer group inherited from matched customer", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-003", familyBulkMode: false },
      }),
    );
    expect(m.primaryCustomer.value!.group).toBe("tokyo-2");
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("primaryCustomer is null when no customerId in sourceContext", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { familyBulkMode: false },
      }),
    );
    expect(m.primaryCustomer.value).toBeNull();
  });

  it("draft group falls back to defaultGroup when no customer", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { familyBulkMode: false },
        defaultGroup: "osaka",
      }),
    );
    expect(m.draft.group).toBe("osaka");
    expect(m.draft.inheritedGroup).toBe("osaka");
  });

  it("familyBulkMode selects family template when entering from customer", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-001", familyBulkMode: true },
      }),
    );
    expect(m.draft.templateId).toBe("family");
    expect(m.draft.familyBulkMode).toBe(true);
  });

  it("explicit source template selects bmv template for signed customer entry", () => {
    const ctx = simulateCustomerDetailEntry({
      id: "cust-entry-bmv",
      displayName: "经营管理签客户",
      group: "tokyo-1",
      groupLabel: "東京一組",
      templateId: "bmv",
    });
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(ctx.templateId).toBe("bmv");
    expect(m.draft.templateId).toBe("bmv");
  });

  it("family bulk entry keeps family template even if source template is bmv", () => {
    const ctx = simulateCustomerDetailEntry(
      {
        id: "cust-entry-bmv-bulk",
        displayName: "经营管理签客户",
        templateId: "bmv",
      },
      true,
    );
    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(ctx.templateId).toBe("bmv");
    expect(m.draft.templateId).toBe("family");
    expect(m.draft.familyBulkMode).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. RETURN NAVIGATION — CASE CREATE BACK TO CUSTOMER
// ═══════════════════════════════════════════════════════════════════

describe("return navigation: case create → customer detail (p0-fe-010-03)", () => {
  it("buildCustomerDetailHref with 'cases' tab produces correct URL", () => {
    const href = buildCustomerDetailHref("cust-return-001", "cases");
    expect(href).toBe("#/customers/cust-return-001?tab=cases");
  });

  it("buildCustomerDetailHref without tab omits tab query", () => {
    const href = buildCustomerDetailHref("cust-return-002");
    expect(href).toBe("#/customers/cust-return-002");
    expect(href).not.toContain("tab=");
  });

  it("round-trip: customer entry → case create → return to customer cases tab", () => {
    const customerId = "cust-roundtrip-001";
    const ctx = simulateCustomerDetailEntry({
      id: customerId,
      displayName: "往復テスト",
      group: "tokyo-1",
    });
    expect(ctx.customerId).toBe(customerId);

    const returnHref = buildCustomerDetailHref(customerId, "cases");
    expect(returnHref).toBe(`#/customers/${customerId}?tab=cases`);
  });

  it("buildCaseCreateHref includes customerId for browser back stack", () => {
    const href = buildCaseCreateHref({ customerId: "cust-back-001" });
    expect(href).toContain("customerId=cust-back-001");
    expect(href).toMatch(/^#\/cases\/create\?/);
  });

  it("buildCaseCreateHref for family-bulk includes hash", () => {
    const href = buildCaseCreateHref({ customerId: "cust-back-002" }, true);
    expect(href).toContain("customerId=cust-back-002");
    expect(href).toContain("#family-bulk");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. DEFAULT VALUE INHERITANCE — SYNTHESIZE CUSTOMER FROM CONTEXT
// ═══════════════════════════════════════════════════════════════════

describe("synthesizeCustomerFromSourceContext (p0-fe-010-03)", () => {
  it("synthesizes complete customer option from full context", () => {
    const ctx: CaseCreateSourceContext = {
      familyBulkMode: false,
      customerId: "cust-synth-001",
      customerName: "合成太郎",
      customerKana: "ゴウセイタロウ",
      customerGroup: "osaka",
      customerGroupLabel: "大阪支店",
      customerContact: "080-9999-0000",
    };
    const option = synthesizeCustomerFromSourceContext(ctx);
    expect(option).not.toBeNull();
    expect(option!.id).toBe("cust-synth-001");
    expect(option!.name).toBe("合成太郎");
    expect(option!.kana).toBe("ゴウセイタロウ");
    expect(option!.group).toBe("osaka");
    expect(option!.groupLabel).toBe("大阪支店");
    expect(option!.contact).toBe("080-9999-0000");
    expect(option!.roleHint).toBe("主申請人");
  });

  it("returns null when customerId is missing", () => {
    const option = synthesizeCustomerFromSourceContext({
      familyBulkMode: false,
      customerName: "名前だけ",
    });
    expect(option).toBeNull();
  });

  it("returns null when customerName is missing", () => {
    const option = synthesizeCustomerFromSourceContext({
      familyBulkMode: false,
      customerId: "cust-no-name",
    });
    expect(option).toBeNull();
  });

  it("fills empty string for missing optional fields", () => {
    const option = synthesizeCustomerFromSourceContext({
      familyBulkMode: false,
      customerId: "cust-partial",
      customerName: "部分データ",
    });
    expect(option).not.toBeNull();
    expect(option!.kana).toBe("");
    expect(option!.group).toBe("");
    expect(option!.groupLabel).toBe("");
    expect(option!.contact).toBe("");
  });
});

describe("default value inheritance in model (p0-fe-010-03)", () => {
  it("synthesized customer used when customerId not in create list", () => {
    const sourceContext: CaseCreateSourceContext = {
      familyBulkMode: false,
      customerId: "cust-not-in-list",
      customerName: "リスト外顧客",
      customerKana: "リストガイコキャク",
      customerGroup: "osaka",
      customerGroupLabel: "大阪支店",
      customerContact: "090-0000-1111",
    };
    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-not-in-list");
    expect(m.primaryCustomer.value!.name).toBe("リスト外顧客");
    expect(m.primaryCustomer.value!.kana).toBe("リストガイコキャク");
    expect(m.primaryCustomer.value!.group).toBe("osaka");
  });

  it("group inherited from synthesized customer", () => {
    const sourceContext: CaseCreateSourceContext = {
      familyBulkMode: false,
      customerId: "cust-synth-group",
      customerName: "グループ継承",
      customerGroup: "nagoya",
    };
    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.draft.group).toBe("nagoya");
    expect(m.draft.inheritedGroup).toBe("nagoya");
  });

  it("group falls back to defaultGroup when synthesized customer has no group", () => {
    const sourceContext: CaseCreateSourceContext = {
      familyBulkMode: false,
      customerId: "cust-no-group",
      customerName: "グループなし",
    };
    const m = useCreateCaseModel(
      createDeps({ sourceContext, defaultGroup: "default-grp" }),
    );
    expect(m.draft.group).toBe("default-grp");
  });

  it("derived title includes synthesized customer name", () => {
    const sourceContext: CaseCreateSourceContext = {
      familyBulkMode: false,
      customerId: "cust-title-test",
      customerName: "タイトルテスト",
    };
    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.derivedTitle.value).toContain("タイトルテスト");
  });

  it("list customer takes priority over synthesized customer", () => {
    const sourceContext: CaseCreateSourceContext = {
      familyBulkMode: false,
      customerId: "cust-001",
      customerName: "上書きされない名前",
      customerGroup: "osaka",
    };
    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.primaryCustomer.value!.name).toBe("李娜");
    expect(m.primaryCustomer.value!.group).toBe("tokyo-1");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  4. FULL ENTRY FLOW — BUILD → PARSE → MODEL
// ═══════════════════════════════════════════════════════════════════

describe("full customer → case create entry flow (p0-fe-010-03)", () => {
  it("customer detail single create: build → parse → model with customer in list", () => {
    const ctx = simulateCustomerDetailEntry({
      id: "cust-001",
      displayName: "李娜",
      furigana: "リ ナ",
      group: "tokyo-1",
      groupLabel: "東京一組",
      phone: "080-1111-2222",
      email: "li.na@email.com",
    });

    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value!.id).toBe("cust-001");
    expect(m.primaryCustomer.value!.name).toBe("李娜");
    expect(m.draft.group).toBe("tokyo-1");
    expect(m.draft.familyBulkMode).toBe(false);
    expect(m.derivedTitle.value).toContain("李娜");
  });

  it("customer detail single create: build → parse → model with customer NOT in list", () => {
    const ctx = simulateCustomerDetailEntry({
      id: "cust-external-001",
      displayName: "外部顧客",
      furigana: "ガイブコキャク",
      group: "nagoya",
      groupLabel: "名古屋支店",
      phone: "052-111-2222",
    });

    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-external-001");
    expect(m.primaryCustomer.value!.name).toBe("外部顧客");
    expect(m.primaryCustomer.value!.kana).toBe("ガイブコキャク");
    expect(m.primaryCustomer.value!.group).toBe("nagoya");
    expect(m.primaryCustomer.value!.groupLabel).toBe("名古屋支店");
    expect(m.draft.group).toBe("nagoya");
    expect(m.derivedTitle.value).toContain("外部顧客");
  });

  it("customer detail batch create: build → parse → model with family bulk", () => {
    const ctx = simulateCustomerDetailEntry(
      {
        id: "cust-001",
        displayName: "李娜",
        group: "tokyo-1",
      },
      true,
    );

    const m = useCreateCaseModel(createDeps({ sourceContext: ctx }));
    expect(m.primaryCustomer.value!.id).toBe("cust-001");
    expect(m.draft.templateId).toBe("family");
    expect(m.draft.familyBulkMode).toBe(true);
  });

  it("empty customerId entry: no primary customer, default group", () => {
    const params: CaseCreateQueryParams = {};
    const route = buildCaseCreateRoute(params);
    const ctx = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const m = useCreateCaseModel(
      createDeps({ sourceContext: ctx, defaultGroup: "fallback" }),
    );
    expect(m.primaryCustomer.value).toBeNull();
    expect(m.draft.group).toBe("fallback");
    expect(m.hasSourceContext.value).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  5. CONTRACT ALIGNMENT — CROSS-MODULE KEY STABILITY
// ═══════════════════════════════════════════════════════════════════

describe("cross-module contract stability (p0-fe-010-03)", () => {
  it("CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.routeName matches buildCaseCreateRoute output", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-stability" });
    expect(route.name).toBe(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.routeName);
  });

  it("CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.familyBulkHash matches buildCaseCreateRoute hash", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-bulk" }, true);
    expect(route.hash).toBe(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.familyBulkHash);
  });

  it("customer defaults keys in contract match parseCaseCreateQuery output fields", () => {
    const ctx = simulateCustomerDetailEntry({
      id: "cust-keys",
      displayName: "キーテスト",
      furigana: "キーテスト",
      group: "grp",
      groupLabel: "グループ",
      phone: "000",
      email: "a@b.com",
    });

    const customerDefaultKeys =
      CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.customerDefaultKeys as ReadonlyArray<
        keyof CaseCreateSourceContext
      >;
    for (const key of customerDefaultKeys) {
      expect(ctx).toHaveProperty(key);
      expect(ctx[key]).toBeTruthy();
    }
  });

  it("customerDefaultKeys length is stable at 5", () => {
    expect(
      CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.customerDefaultKeys,
    ).toHaveLength(5);
  });
});
