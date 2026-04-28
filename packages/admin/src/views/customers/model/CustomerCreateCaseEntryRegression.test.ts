// ── Test Ownership ──────────────────────────────────────────────
// Owner: customer → case create entry regression (p0-fe-010-03).
//
// Purpose: prevent regressions in the customer → case create entry flow.
// Tests lock the full round-trip from customer detail/contacts tab through
// to case create model initialization, covering:
//   1. Entry with customerId → correct primaryCustomer, group, title
//   2. Return / back-link navigation from case create → customer detail
//   3. Default value inheritance when customer is not in create list
//   4. Family bulk entry from contacts tab with relations
//   5. Backward compatibility with old query (no customer defaults)
//
// Does NOT re-test:
//   - Query key set / build / parse unit logic → CustomerCreateCaseEntryContract.test
//   - synthesize function in isolation → useCreateCaseModel.customer-defaults.test
//   - Submit payload construction → useCreateCaseModel.focused.test
//   - Draft wizard logic → useCreateCaseModel.test
//   - Customer cases list model → useCustomerCasesModel.test
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  parseCaseCreateQuery,
  buildCaseCreateQuery,
  buildCaseCreateRoute,
  type CaseCreateQueryParams,
} from "../../cases/query";
import {
  buildCustomerDetailHref,
  buildCaseListQuery,
  buildCaseDetailRoute,
} from "../../cases/query";
import {
  useCreateCaseModel,
  type UseCreateCaseModelDeps,
} from "../../cases/model/useCreateCaseModel";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../../cases/fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../../cases/constants";

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

/**
 * 模拟客户详情页构造 create params。
 * 对齐 `CustomerDetailView.buildCustomerCreateParams` 的契约。
 * @param customer - 客户详情页当前客户信息
 * @param customer.id - 客户 ID
 * @param customer.displayName - 客户显示名
 * @param customer.furigana - 客户片假名
 * @param customer.group - 客户分组编码
 * @param customer.groupLabel - 客户分组标签
 * @param customer.phone - 客户联系电话
 * @param customer.email - 客户邮箱
 * @returns 用于案件创建页的 query 参数
 */
function buildCustomerCreateParams(customer: {
  id: string;
  displayName: string;
  furigana: string;
  group: string;
  groupLabel: string;
  phone: string;
  email: string;
}): CaseCreateQueryParams {
  return {
    customerId: customer.id,
    customerName: customer.displayName,
    customerKana: customer.furigana,
    customerGroup: customer.group,
    customerGroupLabel: customer.groupLabel,
    customerContact: [customer.phone, customer.email]
      .filter(Boolean)
      .join(" / "),
  };
}

const KNOWN_CUSTOMER = {
  id: "cust-001",
  displayName: "李娜",
  furigana: "リ ナ",
  group: "tokyo-1",
  groupLabel: "东京一组",
  phone: "080-1111-2222",
  email: "li.na@email.com",
};

const UNKNOWN_CUSTOMER = {
  id: "cust-regression-777",
  displayName: "高橋健太",
  furigana: "タカハシ ケンタ",
  group: "tokyo-2",
  groupLabel: "東京二組",
  phone: "090-7777-8888",
  email: "takahashi@example.com",
};

// ═══════════════════════════════════════════════════════════════════
//  1. ENTRY WITH CUSTOMERID (p0-fe-010-03)
// ═══════════════════════════════════════════════════════════════════

describe("entry with customerId — known customer (p0-fe-010-03)", () => {
  it("route → parse → model sets primaryCustomer from list", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-001");
    expect(m.primaryCustomer.value!.name).toBe("李娜");
  });

  it("inherits group from known customer in list", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.draft.group).toBe("tokyo-1");
    expect(m.draft.inheritedGroup).toBe("tokyo-1");
  });

  it("derives title from known customer name", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.effectiveTitle.value).toContain("李娜");
  });

  it("hasSourceContext is true", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.hasSourceContext.value).toBe(true);
  });
});

describe("entry with customerId — unknown customer (p0-fe-010-03)", () => {
  it("route → parse → model synthesizes primaryCustomer from defaults", () => {
    const params = buildCustomerCreateParams(UNKNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-regression-777");
    expect(m.primaryCustomer.value!.name).toBe("高橋健太");
  });

  it("inherits group from synthesized customer defaults", () => {
    const params = buildCustomerCreateParams(UNKNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("derives title from synthesized customer name", () => {
    const params = buildCustomerCreateParams(UNKNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.effectiveTitle.value).toContain("高橋健太");
  });

  it("canProceedStep2 is true with synthesized customer", () => {
    const params = buildCustomerCreateParams(UNKNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.canProceedStep2.value).toBe(true);
  });
});

describe("entry without customerId (p0-fe-010-03)", () => {
  it("no customerId → primaryCustomer is null", () => {
    const route = buildCaseCreateRoute({});
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.primaryCustomer.value).toBeNull();
  });

  it("no customerId → group falls back to defaultGroup", () => {
    const route = buildCaseCreateRoute({});
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(
      createDeps({ sourceContext, defaultGroup: "osaka" }),
    );

    expect(m.draft.group).toBe("osaka");
  });

  it("no customerId → hasSourceContext is false", () => {
    const route = buildCaseCreateRoute({});
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.hasSourceContext.value).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. RETURN / BACK-LINK NAVIGATION (p0-fe-010-03)
// ═══════════════════════════════════════════════════════════════════

describe("return navigation: case create → customer (p0-fe-010-03)", () => {
  it("buildCustomerDetailHref produces correct back-link from customerId", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const href = buildCustomerDetailHref(sourceContext.customerId ?? "");
    expect(href).toBe("#/customers/cust-001");
  });

  it("buildCustomerDetailHref with 'cases' tab produces correct deep-link", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const href = buildCustomerDetailHref(
      sourceContext.customerId ?? "",
      "cases",
    );
    expect(href).toBe("#/customers/cust-001?tab=cases");
  });

  it("buildCaseListQuery with customerId filter preserves customer context", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const listQuery = buildCaseListQuery({
      scope: "all",
      search: "",
      stage: "",
      owner: "",
      group: "",
      risk: "",
      validation: "",
      customerId: sourceContext.customerId,
    });
    expect(listQuery.customerId).toBe("cust-001");
  });

  it("empty customerId → back-link falls back to customer list", () => {
    const route = buildCaseCreateRoute({});
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    const href = buildCustomerDetailHref(sourceContext.customerId ?? "");
    expect(href).toBe("#/customers");
  });

  it("post-create → buildCaseDetailRoute navigates to new case detail", () => {
    const caseId = "CASE-NEW-REG-001";
    const route = buildCaseDetailRoute(caseId);
    expect(route.name).toBe("case-detail");
    expect(route.params.id).toBe(caseId);
  });

  it("customerId with special characters round-trips in back-link", () => {
    const params = buildCustomerCreateParams({
      ...KNOWN_CUSTOMER,
      id: "cust/special&chars=1",
    });
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    expect(sourceContext.customerId).toBe("cust/special&chars=1");
    const href = buildCustomerDetailHref(sourceContext.customerId ?? "");
    expect(href).toContain("cust%2Fspecial%26chars%3D1");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. DEFAULT VALUE INHERITANCE (p0-fe-010-03)
// ═══════════════════════════════════════════════════════════════════

describe("default value inheritance regression (p0-fe-010-03)", () => {
  it("full flow: customer detail → route → parse → model with all defaults", () => {
    const params = buildCustomerCreateParams(UNKNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(sourceContext.customerName).toBe("高橋健太");
    expect(sourceContext.customerKana).toBe("タカハシ ケンタ");
    expect(sourceContext.customerGroup).toBe("tokyo-2");
    expect(sourceContext.customerGroupLabel).toBe("東京二組");
    expect(sourceContext.customerContact).toBe(
      "090-7777-8888 / takahashi@example.com",
    );

    expect(m.primaryCustomer.value!.name).toBe("高橋健太");
    expect(m.primaryCustomer.value!.kana).toBe("タカハシ ケンタ");
    expect(m.primaryCustomer.value!.group).toBe("tokyo-2");
    expect(m.primaryCustomer.value!.groupLabel).toBe("東京二組");
    expect(m.primaryCustomer.value!.contact).toBe(
      "090-7777-8888 / takahashi@example.com",
    );
  });

  it("known customer in list: list entry takes priority over query defaults", () => {
    const params = buildCustomerCreateParams({
      ...KNOWN_CUSTOMER,
      displayName: "偽名前",
      group: "osaka",
      groupLabel: "大阪組",
    });
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.primaryCustomer.value!.name).toBe("李娜");
    expect(m.draft.group).toBe("tokyo-1");
  });

  it("group inheritance label resolves correctly for synthesized customer", () => {
    const params = buildCustomerCreateParams(UNKNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.groupInheritanceLabel.value).toBe("東京二組");
  });

  it("group override tracks inherited group from customer defaults", () => {
    const params = buildCustomerCreateParams(UNKNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    m.setGroup("tokyo-1");
    expect(m.isGroupOverridden.value).toBe(true);
    expect(m.needsGroupOverrideReason.value).toBe(true);
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("backward compat: old query without defaults still initializes model", () => {
    const query = buildCaseCreateQuery({ customerId: "cust-001" });
    const sourceContext = parseCaseCreateQuery(
      query as Record<string, string>,
      "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.primaryCustomer.value!.id).toBe("cust-001");
    expect(m.primaryCustomer.value!.name).toBe("李娜");
    expect(m.draft.group).toBe("tokyo-1");
  });

  it("customer with no phone/email → contact is empty string in defaults", () => {
    const params = buildCustomerCreateParams({
      ...UNKNOWN_CUSTOMER,
      phone: "",
      email: "",
    });
    const route = buildCaseCreateRoute(params);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    expect(sourceContext.customerContact).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  4. FAMILY BULK ENTRY FROM CUSTOMER (p0-fe-010-03)
// ═══════════════════════════════════════════════════════════════════
