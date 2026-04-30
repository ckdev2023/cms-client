// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-010-02 — customer defaults into create form.
// Covers:
//   - synthesizeCustomerFromSourceContext: synthesis, null fallbacks
//   - parseCaseCreateQuery / buildCaseCreateQuery: round-trip with
//     customer default fields (name, kana, group, groupLabel, contact)
//   - useCreateCaseModel: group/title/primaryCustomer inheritance from
//     source context defaults when customer not in create customer list
//   - useCreateCaseModel: customer list takes priority over source context
//   - backward compatibility: old query (no defaults) still works
// Does NOT test: submit payload (→ focused.test), draft wizard logic
//   (→ useCreateCaseModel.test), customer detail view wiring.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  useCreateCaseModel,
  synthesizeCustomerFromSourceContext,
  type UseCreateCaseModelDeps,
} from "./useCreateCaseModel";
import {
  parseCaseCreateQuery,
  buildCaseCreateQuery,
  CASE_CREATE_QUERY_PARAM_KEYS,
} from "../query-create";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "../fixtures-create";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../constants";
import type { CaseCreateSourceContext } from "../types-create";

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

const UNKNOWN_CUSTOMER_CTX: CaseCreateSourceContext = {
  customerId: "cust-unknown-999",
  customerName: "山田太郎",
  customerKana: "ヤマダ タロウ",
  customerGroup: "tokyo-2",
  customerGroupLabel: "東京二組",
  customerContact: "090-9999-8888 / yamada@example.com",
  familyBulkMode: false,
};

const BMV_READY_CTX: CaseCreateSourceContext = {
  customerId: "cust-bmv-ready-999",
  customerName: "経営管理花子",
  customerGroup: "tokyo-1",
  customerGroupLabel: "東京一組",
  familyBulkMode: false,
  templateCode: "bmv",
  templateId: "bmv",
  bmvQuestionnaireStatus: "returned",
  bmvQuoteStatus: "confirmed",
  bmvSignStatus: "signed",
  bmvIntakeStatus: "ready_for_case_creation",
};

// ═══════════════════════════════════════════════════════════════════
//  synthesizeCustomerFromSourceContext
// ═══════════════════════════════════════════════════════════════════

describe("synthesizeCustomerFromSourceContext (p0-fe-010-02)", () => {
  it("returns CaseCreateCustomerOption with all fields", () => {
    const result = synthesizeCustomerFromSourceContext(UNKNOWN_CUSTOMER_CTX);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("cust-unknown-999");
    expect(result!.name).toBe("山田太郎");
    expect(result!.kana).toBe("ヤマダ タロウ");
    expect(result!.group).toBe("tokyo-2");
    expect(result!.groupLabel).toBe("東京二組");
    expect(result!.contact).toBe("090-9999-8888 / yamada@example.com");
    expect(result!.roleHint).toBe("cases.create.step2.primaryRole");
  });

  it("carries BMV pre-sign gate statuses when provided", () => {
    const result = synthesizeCustomerFromSourceContext(BMV_READY_CTX);
    expect(result).not.toBeNull();
    expect(result!.bmvQuestionnaireStatus).toBe("returned");
    expect(result!.bmvQuoteStatus).toBe("confirmed");
    expect(result!.bmvSignStatus).toBe("signed");
    expect(result!.bmvIntakeStatus).toBe("ready_for_case_creation");
  });

  it("returns null when customerId is missing", () => {
    expect(
      synthesizeCustomerFromSourceContext({
        customerName: "名前",
        familyBulkMode: false,
      }),
    ).toBeNull();
  });

  it("returns null when customerName is missing", () => {
    expect(
      synthesizeCustomerFromSourceContext({
        customerId: "cust-001",
        familyBulkMode: false,
      }),
    ).toBeNull();
  });

  it("defaults optional fields to empty string", () => {
    const result = synthesizeCustomerFromSourceContext({
      customerId: "cust-min",
      customerName: "最小",
      familyBulkMode: false,
    });
    expect(result).not.toBeNull();
    expect(result!.kana).toBe("");
    expect(result!.group).toBe("");
    expect(result!.groupLabel).toBe("");
    expect(result!.contact).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  parseCaseCreateQuery / buildCaseCreateQuery round-trip
// ═══════════════════════════════════════════════════════════════════

describe("customer defaults query round-trip (p0-fe-010-02)", () => {
  it("customer default fields survive build → parse round-trip", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-rt",
      customerName: "田中",
      customerKana: "タナカ",
      customerGroup: "tokyo-1",
      customerGroupLabel: "東京一組",
      customerContact: "090-1234-5678",
    });
    const parsed = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(parsed.customerId).toBe("cust-rt");
    expect(parsed.customerName).toBe("田中");
    expect(parsed.customerKana).toBe("タナカ");
    expect(parsed.customerGroup).toBe("tokyo-1");
    expect(parsed.customerGroupLabel).toBe("東京一組");
    expect(parsed.customerContact).toBe("090-1234-5678");
  });

  it("BMV status fields survive build → parse round-trip", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-bmv-rt",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "confirmed",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    });
    const parsed = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(parsed.bmvQuestionnaireStatus).toBe("returned");
    expect(parsed.bmvQuoteStatus).toBe("confirmed");
    expect(parsed.bmvSignStatus).toBe("signed");
    expect(parsed.bmvIntakeStatus).toBe("ready_for_case_creation");
  });

  it("omits empty customer default fields", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-001",
      customerName: "",
      customerGroup: "",
    });
    expect(query.customerName).toBeUndefined();
    expect(query.customerGroup).toBeUndefined();
  });

  it("backward compat: old query without customer defaults still parses", () => {
    const query = buildCaseCreateQuery({ customerId: "cust-old" });
    const parsed = parseCaseCreateQuery(query as Record<string, string>, "");
    expect(parsed.customerId).toBe("cust-old");
    expect(parsed.customerName).toBeUndefined();
    expect(parsed.customerKana).toBeUndefined();
    expect(parsed.customerGroup).toBeUndefined();
    expect(parsed.customerGroupLabel).toBeUndefined();
    expect(parsed.customerContact).toBeUndefined();
    expect(parsed.familyBulkMode).toBe(false);
  });

  it("frozen key set includes all customer default keys", () => {
    const customerDefaultKeys = [
      "customerName",
      "customerKana",
      "customerGroup",
      "customerGroupLabel",
      "customerContact",
    ];
    for (const key of customerDefaultKeys) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain(key);
    }
  });

  it("frozen key set includes all BMV status keys", () => {
    const bmvStatusKeys = [
      "bmvQuestionnaireStatus",
      "bmvQuoteStatus",
      "bmvSignStatus",
      "bmvIntakeStatus",
    ];
    for (const key of bmvStatusKeys) {
      expect(CASE_CREATE_QUERY_PARAM_KEYS).toContain(key);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  useCreateCaseModel — customer defaults inheritance
// ═══════════════════════════════════════════════════════════════════

describe("customer defaults → create model inheritance (p0-fe-010-02)", () => {
  it("synthesizes primary customer from source context when not in list", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: UNKNOWN_CUSTOMER_CTX }),
    );
    expect(m.primaryCustomer.value).not.toBeNull();
    expect(m.primaryCustomer.value!.id).toBe("cust-unknown-999");
    expect(m.primaryCustomer.value!.name).toBe("山田太郎");
  });

  it("inherits group from source context defaults", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: UNKNOWN_CUSTOMER_CTX }),
    );
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("derives title from synthesized customer name", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: UNKNOWN_CUSTOMER_CTX }),
    );
    expect(m.effectiveTitle.value).toBe("山田太郎 家族滞在认定");
  });

  it("has source context flag set", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: UNKNOWN_CUSTOMER_CTX }),
    );
    expect(m.hasSourceContext.value).toBe(true);
  });

  it("customer in list takes priority over source context defaults", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: {
          customerId: "cust-001",
          customerName: "偽名前",
          customerGroup: "osaka",
          customerGroupLabel: "大阪組",
          familyBulkMode: false,
        },
      }),
    );
    expect(m.primaryCustomer.value!.name).toBe("李娜");
    expect(m.draft.group).toBe("tokyo-1");
  });

  it("falls back to defaultGroup when no customer defaults and no list match", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: {
          customerId: "cust-missing",
          familyBulkMode: false,
        },
        defaultGroup: "osaka",
      }),
    );
    expect(m.primaryCustomer.value).toBeNull();
    expect(m.draft.group).toBe("osaka");
  });

  it("group override still works with synthesized customer", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: UNKNOWN_CUSTOMER_CTX }),
    );
    expect(m.draft.group).toBe("tokyo-2");

    m.setGroup("tokyo-1");
    expect(m.isGroupOverridden.value).toBe(true);
    expect(m.needsGroupOverrideReason.value).toBe(true);
    expect(m.draft.inheritedGroup).toBe("tokyo-2");
  });

  it("group inheritance label resolves from synthesized customer group", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: UNKNOWN_CUSTOMER_CTX }),
    );
    expect(m.groupInheritanceLabel.value).toBe("東京二組");
  });

  it("family bulk mode works with synthesized customer", () => {
    const m = useCreateCaseModel(
      createDeps({
        sourceContext: {
          ...UNKNOWN_CUSTOMER_CTX,
          familyBulkMode: true,
        },
      }),
    );
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.draft.templateId).toBe("family");
    expect(m.primaryCustomer.value!.id).toBe("cust-unknown-999");
    expect(m.additionalParties.value.length).toBeGreaterThan(0);
  });

  it("step 2 validation passes with synthesized customer", () => {
    const m = useCreateCaseModel(
      createDeps({ sourceContext: UNKNOWN_CUSTOMER_CTX }),
    );
    expect(m.canProceedStep2.value).toBe(true);
  });

  it("BMV entry uses synthesized statuses to pass pre-sign gate", () => {
    const m = useCreateCaseModel(createDeps({ sourceContext: BMV_READY_CTX }));
    expect(m.draft.templateId).toBe("biz_mgmt_cert_4m");
    expect(m.primaryCustomer.value?.id).toBe("cust-bmv-ready-999");
    expect(m.preSignGate.value.active).toBe(true);
    expect(m.preSignGate.value.passed).toBe(true);
    expect(m.preSignGate.value.blockers).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  End-to-end: parse query → model → correct state
// ═══════════════════════════════════════════════════════════════════

describe("end-to-end: query → model with customer defaults (p0-fe-010-02)", () => {
  it("simulates CustomerDetailView → CaseCreateView flow", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-e2e-001",
      customerName: "鈴木一郎",
      customerKana: "スズキ イチロウ",
      customerGroup: "tokyo-1",
      customerGroupLabel: "東京一組",
      customerContact: "080-1111-2222 / suzuki@test.com",
    });
    const sourceContext = parseCaseCreateQuery(
      query as Record<string, string>,
      "",
    );

    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.primaryCustomer.value!.id).toBe("cust-e2e-001");
    expect(m.primaryCustomer.value!.name).toBe("鈴木一郎");
    expect(m.draft.group).toBe("tokyo-1");
    expect(m.effectiveTitle.value).toBe("鈴木一郎 家族滞在认定");
  });

  it("simulates batch create flow with customer defaults", () => {
    const query = buildCaseCreateQuery({
      customerId: "cust-batch-002",
      customerName: "佐藤花子",
      customerGroup: "tokyo-2",
      customerGroupLabel: "東京二組",
    });
    const sourceContext = parseCaseCreateQuery(
      query as Record<string, string>,
      "#family-bulk",
    );

    const m = useCreateCaseModel(createDeps({ sourceContext }));
    expect(m.primaryCustomer.value!.id).toBe("cust-batch-002");
    expect(m.draft.familyBulkMode).toBe(true);
    expect(m.draft.group).toBe("tokyo-2");
    expect(m.effectiveTitle.value).toContain("佐藤花子");
    expect(m.effectiveTitle.value).toContain("（批量）");
  });
});
