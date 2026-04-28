// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-010-03 — customer → case create entry regression tests.
// Covers:
//   - entry with customerId: model inherits group, title, primary customer
//   - return link: buildCustomerDetailHref from case detail
//   - default value inheritance: customer defaults round-trip through query
//   - edge cases: missing customer defaults, empty customerId
// Does NOT test: case create submit flow (→ focused.test),
//   draft wizard logic (→ useCreateCaseModel.test),
//   query-create unit tests (→ CustomerCreateCaseEntryContract.test),
//   customer detail model (→ useCustomerDetailModel.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  useCreateCaseModel,
  synthesizeCustomerFromSourceContext,
  type UseCreateCaseModelDeps,
} from "../../cases/model/useCreateCaseModel";
import {
  parseCaseCreateQuery,
  buildCaseCreateQuery,
  buildCaseCreateRoute,
  buildCaseCreateHref,
} from "../../cases/query";
import { buildCustomerDetailHref } from "../../cases/query";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../../cases/fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../../cases/constants";
import { CUSTOMER_CREATE_CASE_ENTRY_CONTRACT } from "./CustomerAdapterTypes";
import type { CaseCreateSourceContext } from "../../cases/types-create";

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

// ═══════════════════════════════════════════════════════════════════
//  Entry with customerId — known customer in list
// ═══════════════════════════════════════════════════════════════════

describe("customer entry: known customer in list (p0-fe-010-03)", () => {
  it("primary customer is set when customerId matches a known customer", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      }),
    );
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-001");
    expect(m.primaryCustomer.value!.name).toBe("李娜");
  });

  it("group inherited from known customer", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      }),
    );
    expect(m.draft.group).toBe("tokyo-1");
    expect(m.draft.inheritedGroup).toBe("tokyo-1");
  });

  it("title derived from known customer name", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      }),
    );
    expect(m.effectiveTitle.value).toContain("李娜");
  });

  it("hasSourceContext is true", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      }),
    );
    expect(m.hasSourceContext.value).toBe(true);
  });

  it("canProceedStep2 is true with known customer", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      }),
    );
    expect(m.canProceedStep2.value).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Entry with customerId — unknown customer (synthesized from defaults)
// ═══════════════════════════════════════════════════════════════════

describe("customer entry: synthesized from defaults (p0-fe-010-03)", () => {
  const unknownCtx: CaseCreateSourceContext = {
    customerId: "cust-synth-001",
    customerName: "佐藤太郎",
    customerKana: "サトウ タロウ",
    customerGroup: "tokyo-2",
    customerGroupLabel: "東京二組",
    customerContact: "090-1111-0000 / sato@test.com",
    familyBulkMode: false,
  };

  it("synthesizes primary customer when not in list", () => {
    const m = useCreateCaseModel(createDeps({ sourceContext: unknownCtx }));
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-synth-001");
    expect(m.primaryCustomer.value!.name).toBe("佐藤太郎");
  });

  it("group inherited from synthesized customer defaults", () => {
    const m = useCreateCaseModel(createDeps({ sourceContext: unknownCtx }));
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("title derived from synthesized customer name", () => {
    const m = useCreateCaseModel(createDeps({ sourceContext: unknownCtx }));
    expect(m.effectiveTitle.value).toContain("佐藤太郎");
  });

  it("contact carried through synthesized customer", () => {
    const m = useCreateCaseModel(createDeps({ sourceContext: unknownCtx }));
    expect(m.primaryCustomer.value!.contact).toBe(
      "090-1111-0000 / sato@test.com",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Entry without customerId — no source context
// ═══════════════════════════════════════════════════════════════════

describe("customer entry: no customerId (p0-fe-010-03)", () => {
  it("primary customer is null when no customerId", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: { familyBulkMode: false } }),
    );
    expect(m.primaryCustomer.value).toBeNull();
  });

  it("group falls back to defaultGroup", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: { familyBulkMode: false },
        defaultGroup: "osaka",
      }),
    );
    expect(m.draft.group).toBe("osaka");
  });

  it("hasSourceContext is false", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: { familyBulkMode: false } }),
    );
    expect(m.hasSourceContext.value).toBe(false);
  });

  it("canProceedStep2 is false without customer", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: { familyBulkMode: false } }),
    );
    expect(m.canProceedStep2.value).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Return link: case detail → customer
// ═══════════════════════════════════════════════════════════════════

describe("return link: buildCustomerDetailHref (p0-fe-010-03)", () => {
  it("builds back-link to customer detail page", () => {
    const href = buildCustomerDetailHref("cust-001");
    expect(href).toBe("#/customers/cust-001");
  });

  it("builds back-link with cases tab", () => {
    const href = buildCustomerDetailHref("cust-001", "cases");
    expect(href).toBe("#/customers/cust-001?tab=cases");
  });

  it("falls back to customer list when customerId is empty", () => {
    const href = buildCustomerDetailHref("");
    expect(href).toBe("#/customers");
  });

  it("encodes special characters in customerId", () => {
    const href = buildCustomerDetailHref("cust/special&id");
    expect(href).toContain(encodeURIComponent("cust/special&id"));
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Default value inheritance: full query round-trip
// ═══════════════════════════════════════════════════════════════════

describe("default value inheritance via query round-trip (p0-fe-010-03)", () => {
  it("customer detail → buildCaseCreateRoute → parse → model: full chain", () => {
    const route = buildCaseCreateRoute({
      customerId: "cust-chain-001",
      customerName: "高橋美咲",
      customerKana: "タカハシ ミサキ",
      customerGroup: "tokyo-1",
      customerGroupLabel: "東京一組",
      customerContact: "080-9999-1234",
    });

    expect(route.name).toBe("case-create");

    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.primaryCustomer.value!.id).toBe("cust-chain-001");
    expect(m.primaryCustomer.value!.name).toBe("高橋美咲");
    expect(m.draft.group).toBe("tokyo-1");
    expect(m.effectiveTitle.value).toContain("高橋美咲");
    expect(m.hasSourceContext.value).toBe(true);
  });

  it("href round-trip preserves customerId", () => {
    const href = buildCaseCreateHref({ customerId: "cust-href-001" });
    expect(href).toContain("customerId=cust-href-001");
  });

  it("query round-trip with missing optional defaults", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-minimal",
      customerName: "最小テスト",
    });
    const sourceContext = parseCaseCreateQuery(
      query as Record<string, string>,
      "",
    );

    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.primaryCustomer.value!.name).toBe("最小テスト");
    expect(m.primaryCustomer.value!.group).toBe("");
    expect(m.draft.group).toBe("tokyo-1");
  });

  it("batch mode round-trip via hash", () => {
    const route = buildCaseCreateRoute(
      {
        customerId: "cust-batch-rt",
        customerName: "田中一郎",
        customerGroup: "tokyo-2",
        customerGroupLabel: "東京二組",
      },
      true,
    );

    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    expect(sourceContext.familyBulkMode).toBe(true);
    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.primaryCustomer.value!.name).toBe("田中一郎");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Contract alignment: customer-side constants → cases-side constants
// ═══════════════════════════════════════════════════════════════════

describe("cross-module contract alignment (p0-fe-010-03)", () => {
  it("customer entry contract route name matches buildCaseCreateRoute output", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" });
    expect(route.name).toBe(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.routeName);
  });

  it("customer entry contract family hash matches buildCaseCreateRoute output", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" }, true);
    expect(route.hash).toBe(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.familyBulkHash);
  });

  it("all customer default keys are handled by parseCaseCreateQuery", () => {
    const defaults: Record<string, string> = {
      customerId: "cust-contract",
      customerName: "契約テスト",
      customerKana: "ケイヤク",
      customerGroup: "g1",
      customerGroupLabel: "G1",
      customerContact: "test@test.com",
    };
    const parsed = parseCaseCreateQuery(defaults, "");
    for (const key of CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.customerDefaultKeys) {
      expect(parsed).toHaveProperty(key);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Edge case: customerId present but synthesis fails
// ═══════════════════════════════════════════════════════════════════

describe("edge: customerId without sufficient defaults (p0-fe-010-03)", () => {
  it("customerId with no customerName → null synthesis, null primaryCustomer", () => {
    const result = synthesizeCustomerFromSourceContext({
      customerId: "cust-no-name",
      familyBulkMode: false,
    });
    expect(result).toBeNull();

    const m = useCreateCaseModel(
      createDeps({
        sourceContext: {
          customerId: "cust-no-name-unknown",
          familyBulkMode: false,
        },
      }),
    );
    expect(m.primaryCustomer.value).toBeNull();
  });

  it("missing customerId and customerName → no source context", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: {
          customerGroup: "tokyo-2",
          familyBulkMode: false,
        },
      }),
    );
    expect(m.primaryCustomer.value).toBeNull();
    expect(m.hasSourceContext.value).toBe(false);
  });
});
