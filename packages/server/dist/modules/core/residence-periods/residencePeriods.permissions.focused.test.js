import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PermissionsService } from "../auth/permissions.service";
import { CASE_WRITE_ERROR_CODES } from "../cases/cases.types";
import {
  CASE_ID,
  CUSTOMER_ID,
  GROUP_ID,
  OTHER_USER,
  PERIOD_ID,
  USER_ID,
  createController,
  createService,
  makeCaseEntity,
  makeReq,
  makeResidencePeriodRow,
} from "./residencePeriods.focused.test-support";
// ═══════════════════════════════════════════════════════════════
// B. 权限 — controller-level permission enforcement
// ═══════════════════════════════════════════════════════════════
void describe("permissions: controller create requires parent case edit", () => {
  void test("create succeeds when user can edit parent case", async () => {
    const { svc } = createService((sql) => {
      if (sql.includes("from cases") && sql.includes("customer_id"))
        return Promise.resolve({
          rows: [{ id: CASE_ID, customer_id: CUSTOMER_ID }],
          rowCount: 1,
        });
      if (sql.includes("from customers"))
        return Promise.resolve({ rows: [{ id: CUSTOMER_ID }], rowCount: 1 });
      if (sql.includes("insert into residence_periods"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
      if (sql.includes("update reminders"))
        return Promise.resolve({ rows: [], rowCount: 0 });
      if (sql.includes("select owner_user_id"))
        return Promise.resolve({
          rows: [{ owner_user_id: USER_ID }],
          rowCount: 1,
        });
      if (sql.includes("insert into reminders"))
        return Promise.resolve({ rows: [], rowCount: 1 });
      if (
        sql.includes("update residence_periods") &&
        sql.includes("reminder_created")
      )
        return Promise.resolve({ rows: [], rowCount: 1 });
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set is_current = false")
      )
        return Promise.resolve({ rows: [], rowCount: 0 });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const ctrl = createController({
      periodService: svc,
      canEdit: true,
    });
    const result = await ctrl.create(makeReq("staff"), {
      caseId: CASE_ID,
      customerId: CUSTOMER_ID,
      visaType: "business_manager",
      statusOfResidence: "経営・管理",
      validFrom: "2026-01-01",
      validUntil: "2027-01-01",
      isCurrent: true,
    });
    assert.equal(result.id, PERIOD_ID);
  });
  void test("create rejects when user cannot edit parent case", async () => {
    const { svc } = createService(() =>
      Promise.resolve({ rows: [], rowCount: 0 }),
    );
    const ctrl = createController({
      periodService: svc,
      canEdit: false,
    });
    await assert.rejects(
      () =>
        ctrl.create(makeReq("viewer"), {
          caseId: CASE_ID,
          customerId: CUSTOMER_ID,
          visaType: "business_manager",
          statusOfResidence: "経営・管理",
          validFrom: "2026-01-01",
          validUntil: "2027-01-01",
        }),
      /Insufficient permissions to edit/,
    );
  });
});
void describe("permissions: controller list requires parent case view", () => {
  void test("list succeeds when user can view parent case", async () => {
    const { svc } = createService((sql) => {
      if (sql.includes("count(*)::text"))
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      if (sql.includes("from residence_periods"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const ctrl = createController({
      periodService: svc,
      canView: true,
    });
    const result = await ctrl.list(makeReq("viewer"), {
      caseId: CASE_ID,
    });
    assert.equal(result.items.length, 1);
  });
  void test("list rejects when user cannot view parent case", async () => {
    const { svc } = createService(() =>
      Promise.resolve({ rows: [], rowCount: 0 }),
    );
    const ctrl = createController({
      periodService: svc,
      canView: false,
    });
    await assert.rejects(
      () => ctrl.list(makeReq("viewer"), { caseId: CASE_ID }),
      /Insufficient permissions to view/,
    );
  });
  void test("list requires caseId parameter", async () => {
    const { svc } = createService(() =>
      Promise.resolve({ rows: [], rowCount: 0 }),
    );
    const ctrl = createController({
      periodService: svc,
    });
    await assert.rejects(
      () => ctrl.list(makeReq(), { caseId: undefined }),
      /caseId is required/,
    );
  });
});
void describe("permissions: S9 read-only enforcement", () => {
  void test("create rejects when parent case is S9 archived", async () => {
    const { svc } = createService(() =>
      Promise.resolve({ rows: [], rowCount: 0 }),
    );
    const ctrl = createController({
      periodService: svc,
      getCaseResult: makeCaseEntity({ stage: "S9", status: "S9" }),
      canEdit: true,
    });
    await assert.rejects(
      () =>
        ctrl.create(makeReq("manager"), {
          caseId: CASE_ID,
          customerId: CUSTOMER_ID,
          visaType: "business_manager",
          statusOfResidence: "経営・管理",
          validFrom: "2026-01-01",
          validUntil: "2027-01-01",
        }),
      (error) => {
        assert.ok(
          error.message.includes(CASE_WRITE_ERROR_CODES.S9_READONLY),
          "error should include S9_READONLY code",
        );
        assert.ok(
          error.message.includes("read-only"),
          "error should mention read-only",
        );
        return true;
      },
    );
  });
  void test("update rejects when parent case is S9 archived", async () => {
    const { svc } = createService((sql) => {
      if (sql.includes("from residence_periods"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const ctrl = createController({
      periodService: svc,
      getCaseResult: makeCaseEntity({ stage: "S9", status: "S9" }),
      canEdit: true,
    });
    await assert.rejects(
      () =>
        ctrl.update(makeReq("manager"), PERIOD_ID, {
          visaType: "investor",
        }),
      (error) => {
        assert.ok(
          error.message.includes(CASE_WRITE_ERROR_CODES.S9_READONLY),
          "update should be blocked by S9_READONLY",
        );
        return true;
      },
    );
  });
  void test("list is allowed even when parent case is S9 (view is read-safe)", async () => {
    const { svc } = createService((sql) => {
      if (sql.includes("count(*)::text"))
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      if (sql.includes("from residence_periods"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const ctrl = createController({
      periodService: svc,
      getCaseResult: makeCaseEntity({ stage: "S9", status: "S9" }),
      canView: true,
    });
    const result = await ctrl.list(makeReq("viewer"), {
      caseId: CASE_ID,
    });
    assert.equal(result.items.length, 1);
  });
});
void describe("permissions: PermissionsService role-based case access matrix", () => {
  const permSvc = new PermissionsService();
  const ownedCase = makeCaseEntity({ ownerUserId: USER_ID, groupId: GROUP_ID });
  const otherCase = makeCaseEntity({
    ownerUserId: OTHER_USER,
    groupId: "other-group",
  });
  void test("manager can view any case", () => {
    assert.ok(permSvc.canViewCase(USER_ID, "manager", GROUP_ID, otherCase));
  });
  void test("manager can edit any case", () => {
    assert.ok(permSvc.canEditCase(USER_ID, "manager", GROUP_ID, otherCase));
  });
  void test("staff can view case in same group", () => {
    const sameGroupCase = makeCaseEntity({
      ownerUserId: OTHER_USER,
      groupId: GROUP_ID,
    });
    assert.ok(permSvc.canViewCase(USER_ID, "staff", GROUP_ID, sameGroupCase));
  });
  void test("staff can view own case regardless of group", () => {
    assert.ok(permSvc.canViewCase(USER_ID, "staff", undefined, ownedCase));
  });
  void test("staff cannot view other group / other owner case", () => {
    assert.ok(!permSvc.canViewCase(USER_ID, "staff", GROUP_ID, otherCase));
  });
  void test("staff can edit owned case", () => {
    assert.ok(permSvc.canEditCase(USER_ID, "staff", GROUP_ID, ownedCase));
  });
  void test("staff cannot edit other user's case even in same group", () => {
    const sameGroupCase = makeCaseEntity({
      ownerUserId: OTHER_USER,
      groupId: GROUP_ID,
    });
    assert.ok(!permSvc.canEditCase(USER_ID, "staff", GROUP_ID, sameGroupCase));
  });
  void test("viewer can only view owned/assisted cases", () => {
    assert.ok(permSvc.canViewCase(USER_ID, "viewer", undefined, ownedCase));
    assert.ok(!permSvc.canViewCase(USER_ID, "viewer", undefined, otherCase));
  });
  void test("viewer cannot edit any case", () => {
    assert.ok(!permSvc.canEditCase(USER_ID, "viewer", undefined, ownedCase));
    assert.ok(!permSvc.canEditCase(USER_ID, "viewer", undefined, otherCase));
  });
  void test("assistant relationship grants staff view/edit", () => {
    const assistedCase = makeCaseEntity({
      ownerUserId: OTHER_USER,
      assistantUserId: USER_ID,
      groupId: "other-group",
    });
    assert.ok(permSvc.canViewCase(USER_ID, "staff", GROUP_ID, assistedCase));
    assert.ok(permSvc.canEditCase(USER_ID, "staff", GROUP_ID, assistedCase));
  });
});
void describe("permissions: controller get requires parent case view", () => {
  void test("get rejects when parent case not found", async () => {
    const { svc } = createService((sql) => {
      if (sql.includes("from residence_periods"))
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const ctrl = createController({
      periodService: svc,
      getCaseResult: null,
    });
    await assert.rejects(
      () => ctrl.get(makeReq(), PERIOD_ID),
      /Parent case not found/,
    );
  });
});
//# sourceMappingURL=residencePeriods.permissions.focused.test.js.map
