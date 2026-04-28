import { describe, expect, it } from "vitest";
import {
  parseCaseCreateQuery,
  buildCaseCreateRoute,
  buildCaseCreateHref,
  type CaseCreateQueryParams,
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
import { CUSTOMER_CREATE_CASE_ENTRY_CONTRACT } from "./CustomerAdapterTypes";

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

describe("family bulk entry from customer (p0-fe-010-03)", () => {
  it("batch create route → model activates family bulk mode", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params, true);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.draft.templateId).toBe("family");
    expect(m.primaryCustomer.value!.id).toBe("cust-001");
  });

  it("batch create with relations → parties seeded from contacts tab", () => {
    const relations = [
      { id: "r1", name: "田中花子", relationType: "spouse" },
      { id: "r2", name: "田中太郎", relationType: "child" },
    ];
    const params: CaseCreateQueryParams = {
      ...buildCustomerCreateParams(KNOWN_CUSTOMER),
      relationIds: relations.map((r) => r.id).join(","),
      selectedRelations: JSON.stringify(relations),
    };
    const route = buildCaseCreateRoute(params, true);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.additionalParties.value.length).toBeGreaterThan(0);
  });

  it("batch create without relations → default parties seeded from scenario", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params, true);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.additionalParties.value.length).toBe(
      FAMILY_SCENARIO.defaultDraftParties.length,
    );
  });

  it("batch create title includes '（批量）' suffix", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params, true);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.effectiveTitle.value).toContain("（批量）");
  });

  it("batch create with unknown customer synthesizes correctly", () => {
    const params = buildCustomerCreateParams(UNKNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params, true);
    const sourceContext = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );
    const m = useCreateCaseModel(createDeps({ sourceContext }));

    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.primaryCustomer.value!.id).toBe("cust-regression-777");
    expect(m.primaryCustomer.value!.name).toBe("高橋健太");
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.effectiveTitle.value).toContain("高橋健太");
    expect(m.effectiveTitle.value).toContain("（批量）");
  });
});

describe("contract alignment guard (p0-fe-010-03)", () => {
  it("CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.routeName matches route builder", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" });
    expect(route.name).toBe(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.routeName);
  });

  it("CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.familyBulkHash matches batch route", () => {
    const route = buildCaseCreateRoute({ customerId: "cust-001" }, true);
    expect(route.hash).toBe(CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.familyBulkHash);
  });

  it("customer defaults keys all survive build → parse round-trip", () => {
    const params = buildCustomerCreateParams(UNKNOWN_CUSTOMER);
    const route = buildCaseCreateRoute(params);
    const parsed = parseCaseCreateQuery(
      (route.query ?? {}) as Record<string, string>,
      route.hash ?? "",
    );

    for (const key of CUSTOMER_CREATE_CASE_ENTRY_CONTRACT.customerDefaultKeys) {
      expect(
        parsed[key as keyof typeof parsed],
        `field "${key}" should survive round-trip`,
      ).toBeDefined();
    }
  });

  it("href builder aligns with route builder for single create", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const href = buildCaseCreateHref(params);
    expect(href).toMatch(/^#\/cases\/create\?/);
    expect(href).toContain("customerId=cust-001");
  });

  it("href builder aligns with route builder for batch create", () => {
    const params = buildCustomerCreateParams(KNOWN_CUSTOMER);
    const href = buildCaseCreateHref(params, true);
    expect(href).toContain("customerId=cust-001");
    expect(href).toContain("#family-bulk");
  });
});
