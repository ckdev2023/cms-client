import { describe, expect, it } from "vitest";
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

function createDeps(
  overrides: Partial<UseCreateCaseModelDeps> = {},
): UseCreateCaseModelDeps {
  return {
    templates: () => SAMPLE_CREATE_TEMPLATES,
    customers: () => SAMPLE_CREATE_CUSTOMERS,
    familyScenario: () => FAMILY_SCENARIO,
    ownerOptions: () => CASE_OWNER_OPTIONS,
    groupOptions: () => CASE_GROUP_OPTIONS,
    sourceContext: { customerId: "cust-001", familyBulkMode: false },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    ...overrides,
  };
}

describe("BUG-201 title dirty flag", () => {
  it("caseTitleManual is false on init", () => {
    const m = useCreateCaseModel(createDeps());
    expect(m.draft.caseTitleManual).toBe(false);
  });

  it("sets caseTitleManual to true when user types a title", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("自定义标题");
    expect(m.draft.caseTitleManual).toBe(true);
  });

  it("effectiveTitle uses manual title when caseTitleManual is true", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("自定义标题");
    expect(m.effectiveTitle.value).toBe("自定义标题");
  });

  it("effectiveTitle uses derivedTitle when caseTitleManual is false", () => {
    const m = useCreateCaseModel(createDeps());
    expect(m.effectiveTitle.value).toBe(m.derivedTitle.value);
    expect(m.effectiveTitle.value).toContain("李娜");
  });

  // ─── Template change does NOT overwrite manual title ────────────

  it("manual title preserved after selectTemplate", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("手动输入");
    m.selectTemplate("work");
    expect(m.draft.caseTitle).toBe("手动输入");
    expect(m.draft.caseTitleManual).toBe(true);
    expect(m.effectiveTitle.value).toBe("手动输入");
  });

  // ─── Application type change does NOT overwrite manual title ───

  it("manual title preserved after setApplicationType", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("手动输入");
    m.setApplicationType("renewal");
    expect(m.draft.caseTitle).toBe("手动输入");
    expect(m.draft.caseTitleManual).toBe(true);
    expect(m.effectiveTitle.value).toBe("手动输入");
  });

  // ─── Customer change does NOT overwrite manual title ───────────

  it("manual title preserved after setPrimaryCustomer", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("手动输入");
    m.setPrimaryCustomer(SAMPLE_CREATE_CUSTOMERS[2]!);
    expect(m.draft.caseTitle).toBe("手动输入");
    expect(m.draft.caseTitleManual).toBe(true);
    expect(m.effectiveTitle.value).toBe("手动输入");
  });

  // ─── Clearing the title reverts to auto-derive ─────────────────

  it("clearing title resets caseTitleManual and reverts to derivedTitle", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("手动输入");
    expect(m.draft.caseTitleManual).toBe(true);

    m.setCaseTitle("");
    expect(m.draft.caseTitleManual).toBe(false);
    expect(m.effectiveTitle.value).toBe(m.derivedTitle.value);
  });

  it("whitespace-only title is treated as non-manual", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("   ");
    expect(m.draft.caseTitleManual).toBe(false);
    expect(m.effectiveTitle.value).toBe(m.derivedTitle.value);
  });

  // ─── After clearing, auto-derive responds to changes again ─────

  it("after clearing, template change updates derivedTitle", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("手动");
    m.setCaseTitle("");
    const titleBeforeSwitch = m.effectiveTitle.value;
    m.selectTemplate("work");
    expect(m.effectiveTitle.value).not.toBe(titleBeforeSwitch);
    expect(m.effectiveTitle.value).toBe(m.derivedTitle.value);
  });

  it("after clearing, customer change updates derivedTitle", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("手动");
    m.setCaseTitle("");
    m.setPrimaryCustomer(SAMPLE_CREATE_CUSTOMERS[2]!);
    expect(m.effectiveTitle.value).toContain("王浩");
  });

  // ─── Multi-step sequence ───────────────────────────────────────

  it("type → change template → change customer: manual title survives both", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("固定标题");
    m.selectTemplate("work");
    m.setPrimaryCustomer(SAMPLE_CREATE_CUSTOMERS[2]!);
    expect(m.effectiveTitle.value).toBe("固定标题");
  });

  it("type → clear → change customer → retype: new manual title sticks", () => {
    const m = useCreateCaseModel(createDeps());
    m.setCaseTitle("旧标题");
    m.setCaseTitle("");
    m.setPrimaryCustomer(SAMPLE_CREATE_CUSTOMERS[2]!);
    expect(m.effectiveTitle.value).toContain("王浩");

    m.setCaseTitle("新标题");
    expect(m.effectiveTitle.value).toBe("新标题");
    m.selectTemplate("work");
    expect(m.effectiveTitle.value).toBe("新标题");
  });
});
