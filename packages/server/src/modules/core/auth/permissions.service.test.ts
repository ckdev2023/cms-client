import test from "node:test";
import assert from "node:assert/strict";

import type { Case, Customer } from "../model/coreEntities";
import {
  PermissionsService,
  resolveRoleTier,
  type CaseAction,
} from "./permissions.service";

const service = new PermissionsService();

const baseCaseFields = {
  orgId: "org-1",
  customerId: "customer-1",
  caseTypeCode: "visa",
  status: "open",
  stage: null,
  openedAt: "2026-01-01T00:00:00.000Z",
  dueAt: null,
  metadata: {},
  caseNo: null,
  caseName: null,
  caseSubtype: null,
  applicationType: null,
  applicationFlowType: null,
  visaPlan: null,
  postApprovalStage: null,
  coeIssuedAt: null,
  coeExpiryDate: null,
  coeSentAt: null,
  closeReason: null,
  supplementCount: 0,
  companyId: null,
  priority: "normal",
  riskLevel: "low",
  sourceChannel: null,
  signedAt: null,
  acceptedAt: null,
  submissionDate: null,
  resultDate: null,
  residenceExpiryDate: null,
  archivedAt: null,
  resultOutcome: null,
  quotePrice: null,
  depositPaidCached: false,
  finalPaymentPaidCached: false,
  billingUnpaidAmountCached: 0,
  billingRiskAcknowledgedBy: null,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
  billingRiskAckReasonNote: null,
  billingRiskAckEvidenceUrl: null,
  overseasVisaStartAt: null,
  entryConfirmedAt: null,
  jurisdictionAuthority: null,
  businessPhase: "CONSULTING",
  currentWorkflowStepCode: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as const;

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    id: "case-1",
    ...baseCaseFields,
    groupId: "tokyo",
    ownerUserId: "owner-1",
    assistantUserId: "assistant-1",
    ...overrides,
  };
}

const sampleCustomer: Customer = {
  id: "customer-1",
  orgId: "org-1",
  type: "individual",
  baseProfile: {
    owner_user_id: "owner-1",
    collaborator_user_ids: ["assistant-1"],
    groupId: "tokyo",
  },
  contacts: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// §1  canPerformCaseAction — manager/owner: 全量 (all actions always allowed)
// ---------------------------------------------------------------------------
void test("manager/owner can perform all actions on any case", () => {
  const actions: CaseAction[] = ["view", "edit", "export", "audit"];
  const c = makeCase();

  for (const action of actions) {
    assert.equal(
      service.canPerformCaseAction(
        "unrelated",
        "manager",
        undefined,
        c,
        action,
      ),
      true,
      `manager should be able to ${action}`,
    );
    assert.equal(
      service.canPerformCaseAction("unrelated", "owner", undefined, c, action),
      true,
      `owner should be able to ${action}`,
    );
  }
});

// ---------------------------------------------------------------------------
// §2  staff — view: 本组 + 负责/协作案件
// ---------------------------------------------------------------------------
void test("staff can view case in same group", () => {
  const c = makeCase({ groupId: "tokyo" });
  assert.equal(
    service.canPerformCaseAction("staff-x", "staff", "tokyo", c, "view"),
    true,
  );
});

void test("staff can view case as owner", () => {
  const c = makeCase({ groupId: "osaka" });
  assert.equal(
    service.canPerformCaseAction("owner-1", "staff", "nagoya", c, "view"),
    true,
  );
});

void test("staff can view case as assistant", () => {
  const c = makeCase({ groupId: "osaka" });
  assert.equal(
    service.canPerformCaseAction("assistant-1", "staff", "nagoya", c, "view"),
    true,
  );
});

void test("staff cannot view case in different group without participant role", () => {
  const c = makeCase({ groupId: "osaka" });
  assert.equal(
    service.canPerformCaseAction("staff-x", "staff", "nagoya", c, "view"),
    false,
  );
});

void test("staff cannot view case when no group and not participant", () => {
  const c = makeCase({ groupId: null });
  assert.equal(
    service.canPerformCaseAction("staff-x", "staff", undefined, c, "view"),
    false,
  );
});

// ---------------------------------------------------------------------------
// §3  staff — edit: 负责/协作案件（group alone is insufficient）
// ---------------------------------------------------------------------------
void test("staff can edit case as owner", () => {
  const c = makeCase();
  assert.equal(
    service.canPerformCaseAction("owner-1", "staff", "tokyo", c, "edit"),
    true,
  );
});

void test("staff can edit case as assistant", () => {
  const c = makeCase();
  assert.equal(
    service.canPerformCaseAction("assistant-1", "staff", "tokyo", c, "edit"),
    true,
  );
});

void test("staff in same group cannot edit if not participant", () => {
  const c = makeCase({ groupId: "tokyo" });
  assert.equal(
    service.canPerformCaseAction("staff-x", "staff", "tokyo", c, "edit"),
    false,
  );
});

void test("staff not in group and not participant cannot edit", () => {
  const c = makeCase({ groupId: "osaka" });
  assert.equal(
    service.canPerformCaseAction("staff-x", "staff", "nagoya", c, "edit"),
    false,
  );
});

// ---------------------------------------------------------------------------
// §4  staff — export: 仅案件负责人（主办人）
// ---------------------------------------------------------------------------
void test("staff can export case as owner", () => {
  const c = makeCase();
  assert.equal(
    service.canPerformCaseAction("owner-1", "staff", "tokyo", c, "export"),
    true,
  );
});

void test("staff assistant cannot export case", () => {
  const c = makeCase();
  assert.equal(
    service.canPerformCaseAction("assistant-1", "staff", "tokyo", c, "export"),
    false,
  );
});

void test("staff in same group cannot export if not case owner", () => {
  const c = makeCase({ groupId: "tokyo" });
  assert.equal(
    service.canPerformCaseAction("staff-x", "staff", "tokyo", c, "export"),
    false,
  );
});

// ---------------------------------------------------------------------------
// §5  staff — audit: 负责/协作案件
// ---------------------------------------------------------------------------
void test("staff can audit case as participant", () => {
  const c = makeCase();
  assert.equal(
    service.canPerformCaseAction("owner-1", "staff", undefined, c, "audit"),
    true,
  );
  assert.equal(
    service.canPerformCaseAction("assistant-1", "staff", undefined, c, "audit"),
    true,
  );
});

void test("staff cannot audit case if not participant", () => {
  const c = makeCase();
  assert.equal(
    service.canPerformCaseAction("staff-x", "staff", "tokyo", c, "audit"),
    false,
  );
});

// ---------------------------------------------------------------------------
// §6  viewer — view: 仅负责/协作案件
// ---------------------------------------------------------------------------
void test("viewer can view case as participant", () => {
  const c = makeCase();
  assert.equal(
    service.canPerformCaseAction("owner-1", "viewer", undefined, c, "view"),
    true,
  );
  assert.equal(
    service.canPerformCaseAction("assistant-1", "viewer", undefined, c, "view"),
    true,
  );
});

void test("viewer cannot view case in same group if not participant", () => {
  const c = makeCase({ groupId: "tokyo" });
  assert.equal(
    service.canPerformCaseAction("viewer-x", "viewer", "tokyo", c, "view"),
    false,
  );
});

// ---------------------------------------------------------------------------
// §7  viewer — edit/export/audit: 全部不可
// ---------------------------------------------------------------------------
void test("viewer cannot edit, export, or audit any case", () => {
  const c = makeCase();
  const blocked: CaseAction[] = ["edit", "export", "audit"];
  for (const action of blocked) {
    assert.equal(
      service.canPerformCaseAction("owner-1", "viewer", "tokyo", c, action),
      false,
      `viewer should not be able to ${action} even as participant`,
    );
  }
});

// ---------------------------------------------------------------------------
// §8  convenience wrappers delegate correctly
// ---------------------------------------------------------------------------
void test("canViewCase delegates to canPerformCaseAction(view)", () => {
  const c = makeCase();
  assert.equal(service.canViewCase("owner-1", "staff", "tokyo", c), true);
  assert.equal(service.canViewCase("staff-x", "staff", "osaka", c), false);
});

void test("canEditCase delegates to canPerformCaseAction(edit)", () => {
  const c = makeCase();
  assert.equal(service.canEditCase("owner-1", "staff", "tokyo", c), true);
  assert.equal(service.canEditCase("staff-x", "staff", "tokyo", c), false);
});

void test("canExportCase delegates to canPerformCaseAction(export)", () => {
  const c = makeCase();
  assert.equal(service.canExportCase("owner-1", "staff", undefined, c), true);
  assert.equal(
    service.canExportCase("assistant-1", "staff", undefined, c),
    false,
  );
});

void test("canAuditCase delegates to canPerformCaseAction(audit)", () => {
  const c = makeCase();
  assert.equal(service.canAuditCase("owner-1", "staff", undefined, c), true);
  assert.equal(service.canAuditCase("staff-x", "staff", undefined, c), false);
});

// ---------------------------------------------------------------------------
// §9  edge: groupId is null — group match impossible
// ---------------------------------------------------------------------------
void test("group match is impossible when case groupId is null", () => {
  const c = makeCase({ groupId: null });
  assert.equal(
    service.canPerformCaseAction("staff-x", "staff", "tokyo", c, "view"),
    false,
  );
});

void test("group match is impossible when userGroupId is undefined", () => {
  const c = makeCase({ groupId: "tokyo" });
  assert.equal(
    service.canPerformCaseAction("staff-x", "staff", undefined, c, "view"),
    false,
  );
});

// ---------------------------------------------------------------------------
// §10  edge: assistantUserId is null — only ownerUserId counts as participant
// ---------------------------------------------------------------------------
void test("participant check works when assistantUserId is null", () => {
  const c = makeCase({ assistantUserId: null });
  assert.equal(
    service.canPerformCaseAction("owner-1", "staff", undefined, c, "edit"),
    true,
  );
  assert.equal(
    service.canPerformCaseAction("assistant-1", "staff", undefined, c, "edit"),
    false,
  );
});

// ---------------------------------------------------------------------------
// §11  Customer permissions (unchanged behavior — regression guard)
// ---------------------------------------------------------------------------
void test("manager+ can access and edit any customer", () => {
  assert.equal(
    service.canAccessCustomer("user-1", "owner", undefined, sampleCustomer),
    true,
  );
  assert.equal(
    service.canAccessCustomer("user-1", "manager", undefined, sampleCustomer),
    true,
  );
  assert.equal(
    service.canEditCustomer("user-1", "owner", undefined, sampleCustomer),
    true,
  );
  assert.equal(
    service.canEditCustomer("user-1", "manager", undefined, sampleCustomer),
    true,
  );
});

void test("owner/collaborator can access and edit customer", () => {
  assert.equal(
    service.canAccessCustomer("owner-1", "staff", undefined, sampleCustomer),
    true,
  );
  assert.equal(
    service.canEditCustomer("owner-1", "staff", undefined, sampleCustomer),
    true,
  );
  assert.equal(
    service.canAccessCustomer(
      "assistant-1",
      "viewer",
      undefined,
      sampleCustomer,
    ),
    true,
  );
  assert.equal(
    service.canEditCustomer("assistant-1", "viewer", undefined, sampleCustomer),
    true,
  );
});

void test("same-group users can access and edit customer", () => {
  assert.equal(
    service.canAccessCustomer("staff-2", "staff", "tokyo", sampleCustomer),
    true,
  );
  assert.equal(
    service.canEditCustomer("viewer-2", "viewer", "tokyo", sampleCustomer),
    true,
  );
});

void test("unrelated staff/viewer denied customer access and edit", () => {
  assert.equal(
    service.canAccessCustomer("staff-2", "staff", "osaka", sampleCustomer),
    false,
  );
  assert.equal(
    service.canEditCustomer("staff-2", "staff", "osaka", sampleCustomer),
    false,
  );
  assert.equal(
    service.canAccessCustomer("viewer-2", "viewer", undefined, sampleCustomer),
    false,
  );
  assert.equal(
    service.canEditCustomer("viewer-2", "viewer", undefined, sampleCustomer),
    false,
  );
});

// ---------------------------------------------------------------------------
// §12  resolveRoleTier — role → tier mapping
// ---------------------------------------------------------------------------
void test("resolveRoleTier maps owner/manager to admin", () => {
  assert.equal(resolveRoleTier("owner"), "admin");
  assert.equal(resolveRoleTier("manager"), "admin");
});

void test("resolveRoleTier maps staff to staff", () => {
  assert.equal(resolveRoleTier("staff"), "staff");
});

void test("resolveRoleTier maps viewer to viewer", () => {
  assert.equal(resolveRoleTier("viewer"), "viewer");
});

// ---------------------------------------------------------------------------
// §13  canCreateCase — role-based creation permission
// ---------------------------------------------------------------------------
void test("canCreateCase allows admin roles", () => {
  assert.equal(service.canCreateCase("manager"), true);
  assert.equal(service.canCreateCase("owner"), true);
});

void test("canCreateCase allows staff", () => {
  assert.equal(service.canCreateCase("staff"), true);
});

void test("canCreateCase denies viewer", () => {
  assert.equal(service.canCreateCase("viewer"), false);
});

// ---------------------------------------------------------------------------
// §13  isCustomerInGroup: field key variants
// ---------------------------------------------------------------------------
void test("isCustomerInGroup: recognizes all CUSTOMER_GROUP_FIELDS keys", () => {
  const variants = [
    { group: "tokyo" },
    { group_id: "tokyo" },
    { groupId: "tokyo" },
  ];
  for (const bp of variants) {
    const customer: Customer = {
      ...sampleCustomer,
      baseProfile: { ...bp },
    };
    assert.equal(
      service.canAccessCustomer("staff-x", "staff", "tokyo", customer),
      true,
      `should match with base_profile key ${Object.keys(bp)[0]}`,
    );
  }
});
