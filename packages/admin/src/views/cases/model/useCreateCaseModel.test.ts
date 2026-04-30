// ── Test Ownership ──────────────────────────────────────────────
// Owner: create-case wizard composable (useCreateCaseModel) — steps,
//   validation, title/group logic, family bulk, related parties.
// Does NOT test: adapters, builders, real repository, or other
//   composables.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  buildCaseTitle,
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
    sourceContext: { familyBulkMode: false },
    defaultGroup: "tokyo-1",
    defaultOwner: "suzuki",
    ...overrides,
  };
}

function createModel(overrides: Partial<UseCreateCaseModelDeps> = {}) {
  return useCreateCaseModel(createDeps(overrides));
}

const cust1 = SAMPLE_CREATE_CUSTOMERS[0];
const cust3 = SAMPLE_CREATE_CUSTOMERS[2];
const workTpl = SAMPLE_CREATE_TEMPLATES.find((t) => t.id === "work")!;

// ─── buildCaseTitle ──────────────────────────────────────────────

describe("buildCaseTitle", () => {
  it("builds standard title", () => {
    expect(buildCaseTitle("李娜", "家族滞在", "认定", false)).toBe(
      "李娜 家族滞在认定",
    );
  });
  it("handles empty customer name", () => {
    expect(buildCaseTitle("", "技人国", "变更", false)).toBe("技人国变更");
  });
  it("appends batch suffix", () => {
    expect(buildCaseTitle("李娜", "家族滞在", "认定", true)).toBe(
      "李娜 家族滞在认定（批量）",
    );
  });
  it("batch suffix without customer", () => {
    expect(buildCaseTitle("", "家族滞在", "更新", true)).toBe(
      "家族滞在更新（批量）",
    );
  });
  it("accepts resolved label strings (code-based ApplicationType)", () => {
    expect(
      buildCaseTitle("王浩", "技人国", "Certificate of Eligibility", false),
    ).toBe("王浩 技人国 Certificate of Eligibility");
  });
  it("dedupes when template label already contains the application type (BUG-149 zh-CN)", () => {
    expect(
      buildCaseTitle("张三", "经营管理（认定 4 个月）", "认定", false),
    ).toBe("张三 经营管理（认定 4 个月）");
    expect(buildCaseTitle("", "技人国（认定）", "认定", false)).toBe(
      "技人国（认定）",
    );
    expect(buildCaseTitle("", "経営管理（更新）", "更新", false)).toBe(
      "経営管理（更新）",
    );
  });
  it("inserts a space between Latin template and application type (BUG-149 en-US)", () => {
    expect(
      buildCaseTitle("", "Dependent Visa", "Certificate of Eligibility", false),
    ).toBe("Dependent Visa Certificate of Eligibility");
    expect(
      buildCaseTitle(
        "John",
        "Business Manager Visa",
        "Certificate of Eligibility",
        false,
      ),
    ).toBe("John Business Manager Visa Certificate of Eligibility");
  });
});

// ─── useCreateCaseModel ──────────────────────────────────────────

describe("useCreateCaseModel", () => {
  describe("initialization", () => {
    it("starts at step 1 with first template", () => {
      const m = createModel();
      expect(m.draft.currentStep).toBe(1);
      expect(m.draft.templateId).toBe("family");
    });
    it("resolves primary customer from source context", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      expect(m.primaryCustomer.value?.id).toBe("cust-001");
    });
    it("inherits group from source customer", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-003", familyBulkMode: false },
      });
      expect(m.draft.group).toBe("tokyo-2");
      expect(m.draft.inheritedGroup).toBe("tokyo-2");
    });
    it("falls back to default group", () => {
      expect(createModel().draft.group).toBe("tokyo-1");
    });
    it("selects family template on familyBulkMode", () => {
      const m = createModel({ sourceContext: { familyBulkMode: true } });
      expect(m.draft.templateId).toBe("family");
      expect(m.draft.familyBulkMode).toBe(true);
    });
    it("detects source context flag", () => {
      const m = createModel({
        sourceContext: {
          sourceLeadId: "LEAD-001",
          customerId: "cust-001",
          familyBulkMode: false,
        },
      });
      expect(m.hasSourceContext.value).toBe(true);
    });
    it("treats selected relations as source context", () => {
      const m = createModel({
        sourceContext: {
          familyBulkMode: false,
          relationIds: ["rel-001"],
        },
      });
      expect(m.hasSourceContext.value).toBe(true);
    });
    it("no source context when params empty", () => {
      expect(createModel().hasSourceContext.value).toBe(false);
    });
    it("primaryCustomer null without source context", () => {
      expect(createModel().primaryCustomer.value).toBeNull();
    });
    it("defaults auto flags to true", () => {
      const m = createModel();
      expect(m.draft.autoChecklist).toBe(true);
      expect(m.draft.autoTasks).toBe(true);
    });
  });

  describe("template switching", () => {
    it("resets applicationType to first option", () => {
      const m = createModel();
      m.selectTemplate("work");
      expect(m.draft.templateId).toBe("work");
      expect(m.draft.applicationType).toBe(workTpl.applicationTypes[0]);
    });
    it("updates applicationTypes computed", () => {
      const m = createModel();
      m.selectTemplate("work");
      expect(m.applicationTypes.value).toEqual(workTpl.applicationTypes);
    });
    it("reflects in derived title", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      expect(m.derivedTitle.value).toContain("家族滞在");
      m.selectTemplate("work");
      expect(m.derivedTitle.value).toContain("技人国");
      expect(m.derivedTitle.value).toContain("认定");
    });
    it("detects family / work flags", () => {
      const m = createModel();
      expect(m.isFamilyTemplate.value).toBe(true);
      m.selectTemplate("work");
      expect(m.isWorkTemplate.value).toBe(true);
    });
  });

  describe("title derivation", () => {
    it("auto-derives from customer + template + type", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      expect(m.effectiveTitle.value).toBe("李娜 家族滞在认定");
    });
    it("derives without customer", () => {
      expect(createModel().effectiveTitle.value).toBe("家族滞在认定");
    });
    it("respects manual title", () => {
      const m = createModel();
      m.setCaseTitle("自定义标题");
      expect(m.effectiveTitle.value).toBe("自定义标题");
    });
    it("reverts when manual title cleared", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      m.setCaseTitle("自定义");
      m.setCaseTitle("");
      expect(m.effectiveTitle.value).toBe(m.derivedTitle.value);
    });
    it("updates when primary customer changes", () => {
      const m = createModel();
      m.setPrimaryCustomer(cust1);
      expect(m.derivedTitle.value).toBe("李娜 家族滞在认定");
    });
    it("updates when applicationType changes", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      m.setApplicationType("renewal");
      expect(m.derivedTitle.value).toBe("李娜 家族滞在更新");
    });
    it("batch suffix in family bulk mode", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: true },
      });
      expect(m.derivedTitle.value).toContain("（批量）");
    });
  });

  describe("group inheritance", () => {
    it("inherits from primary customer", () => {
      const m = createModel();
      m.setPrimaryCustomer(cust3);
      expect(m.draft.inheritedGroup).toBe("tokyo-2");
      expect(m.draft.group).toBe("tokyo-2");
    });
    it("detects cross-group override", () => {
      const m = createModel();
      m.setGroup("osaka");
      expect(m.isGroupOverridden.value).toBe(true);
      expect(m.needsGroupOverrideReason.value).toBe(true);
    });
    it("preserves manual group on customer change", () => {
      const m = createModel();
      m.setGroup("osaka");
      m.setPrimaryCustomer(cust3);
      expect(m.draft.inheritedGroup).toBe("tokyo-2");
      expect(m.draft.group).toBe("osaka");
    });
    it("auto-updates group if not overridden", () => {
      const m = createModel();
      m.setPrimaryCustomer(cust3);
      expect(m.draft.group).toBe("tokyo-2");
    });
    it("provides inheritance label", () => {
      expect(createModel().groupInheritanceLabel.value).toBe("東京一組");
    });
  });

  describe("stepper navigation", () => {
    it("step 1 → 2", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      m.goNext();
      expect(m.draft.currentStep).toBe(2);
    });
    it("blocks at step 2 without customer", () => {
      const m = createModel();
      m.goNext();
      m.goNext();
      expect(m.draft.currentStep).toBe(2);
    });
    it("step 2 → 3", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      m.goNext();
      m.goNext();
      expect(m.draft.currentStep).toBe(3);
    });
    it("blocks step 3 → 4 without fields", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      m.goNext();
      m.goNext();
      m.goNext();
      expect(m.draft.currentStep).toBe(3);
    });
    it("full flow 1 → 4", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      m.goNext();
      m.goNext();
      m.setDueDate("2026-05-01");
      m.setAmount("120000");
      m.goNext();
      expect(m.draft.currentStep).toBe(4);
    });
    it("goPrev", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      m.goNext();
      m.goPrev();
      expect(m.draft.currentStep).toBe(1);
    });
    it("does not go below step 1", () => {
      createModel().goPrev();
    });
    it("goToStep backward only", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      m.goNext();
      m.goToStep(1);
      expect(m.draft.currentStep).toBe(1);
      m.goToStep(3);
      expect(m.draft.currentStep).toBe(1);
    });
  });

  describe("step validation", () => {
    it("step 1 passes with defaults", () => {
      expect(createModel().canProceedStep1.value).toBe(true);
    });
    it("step 2 fails without customer", () => {
      expect(createModel().canProceedStep2.value).toBe(false);
    });
    it("step 2 passes with customer", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-001", familyBulkMode: false },
      });
      expect(m.canProceedStep2.value).toBe(true);
    });
    it("step 3 fails without fields", () => {
      expect(createModel().canProceedStep3.value).toBe(false);
    });
    it("step 3 passes with all fields", () => {
      const m = createModel();
      m.setDueDate("2026-05-01");
      m.setAmount("120000");
      expect(m.canProceedStep3.value).toBe(true);
    });
    it("step 3 blocks cross-group without reason", () => {
      const m = createModel();
      m.setGroup("osaka");
      m.setDueDate("2026-05-01");
      m.setAmount("120000");
      expect(m.canProceedStep3.value).toBe(false);
      m.setGroupOverrideReason("客户要求");
      expect(m.canProceedStep3.value).toBe(true);
    });
    it("canSubmit tracks step 3", () => {
      const m = createModel();
      expect(m.canSubmit.value).toBe(false);
      m.setDueDate("2026-05-01");
      m.setAmount("120000");
      expect(m.canSubmit.value).toBe(true);
    });
  });

  describe("family bulk mode", () => {
    it("seeds default parties on init", () => {
      const m = createModel({ sourceContext: { familyBulkMode: true } });
      expect(m.additionalParties.value.length).toBe(
        FAMILY_SCENARIO.defaultDraftParties.length,
      );
    });
    it("prefers selected relations when seeding family bulk parties", () => {
      const m = createModel({
        sourceContext: {
          customerId: "cust-001",
          familyBulkMode: true,
          relationIds: ["rel-001", "rel-002"],
          selectedRelations: [
            {
              id: "rel-001",
              name: "田中花子",
              relationType: "spouse",
              phone: "090-1111-2222",
            },
            {
              id: "rel-002",
              name: "田中顾问",
              relationType: "agent",
              tags: ["顾问"],
              email: "advisor@example.com",
            },
          ],
        },
      });

      expect(m.additionalParties.value).toHaveLength(2);
      expect(m.additionalParties.value[0]).toMatchObject({
        name: "田中花子",
        role: "配偶",
        contact: "090-1111-2222",
        relation: "配偶",
      });
      expect(m.additionalParties.value[1]).toMatchObject({
        name: "田中顾问",
        role: "保证人",
        contact: "advisor@example.com",
        relation: "顾问",
      });
      expect(m.familyApplicants.value.map((party) => party.name)).toEqual([
        "田中花子",
      ]);
      expect(m.familySupporters.value.map((party) => party.name)).toContain(
        "田中顾问",
      );
    });
    it("enables via action", () => {
      const m = createModel();
      m.enableFamilyBulkMode();
      expect(m.draft.familyBulkMode).toBe(true);
      expect(m.additionalParties.value.length).toBeGreaterThan(0);
    });
    it("resolves family applicants", () => {
      const m = createModel({ sourceContext: { familyBulkMode: true } });
      expect(m.familyApplicants.value.length).toBeGreaterThan(0);
      expect(
        m.familyApplicants.value.every((p) =>
          ["主申请人", "配偶", "子女"].includes(p.role),
        ),
      ).toBe(true);
    });
    it("resolves supporters", () => {
      const m = createModel({
        sourceContext: { customerId: "cust-002", familyBulkMode: true },
      });
      expect(m.familySupporters.value.length).toBeGreaterThan(0);
    });
    it("requires both bulk flag and family template", () => {
      const m = createModel({ sourceContext: { familyBulkMode: true } });
      expect(m.isFamilyBulkScenario.value).toBe(true);
      m.selectTemplate("work");
      expect(m.isFamilyBulkScenario.value).toBe(false);
    });
  });

  describe("related parties", () => {
    it("adds and removes", () => {
      const m = createModel();
      m.addRelatedParty({ name: "A", role: "配偶", contact: "a@a", note: "" });
      m.addRelatedParty({ name: "B", role: "子女", contact: "b@b", note: "" });
      expect(m.additionalParties.value.length).toBe(2);
      m.removeRelatedParty(0);
      expect(m.additionalParties.value.length).toBe(1);
      expect(m.additionalParties.value[0].name).toBe("B");
    });
  });

  describe("setters", () => {
    it("setApplicationType", () => {
      const m = createModel();
      m.setApplicationType("change_of_status");
      expect(m.draft.applicationType).toBe("change_of_status");
    });
    it("setOwner", () => {
      const m = createModel();
      m.setOwner("tanaka");
      expect(m.draft.owner).toBe("tanaka");
    });
    it("setAutoChecklist / setAutoTasks", () => {
      const m = createModel();
      m.setAutoChecklist(false);
      m.setAutoTasks(false);
      expect(m.draft.autoChecklist).toBe(false);
      expect(m.draft.autoTasks).toBe(false);
    });
    it("setGroupOverrideReason", () => {
      const m = createModel();
      m.setGroupOverrideReason("客户要求跨组");
      expect(m.draft.groupOverrideReason).toBe("客户要求跨组");
    });
  });
});
