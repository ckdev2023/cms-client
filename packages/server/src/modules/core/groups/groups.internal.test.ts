import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  mapGroupSummaryRow,
  mapGroupMemberRow,
  isDuplicateNameError,
  type GroupSummaryRow,
  type GroupMemberRow,
} from "./groups.internal";

void describe("mapGroupSummaryRow", () => {
  void test("maps DB row to GroupSummaryDto", () => {
    const row: GroupSummaryRow = {
      id: "g1",
      org_id: "org1",
      group_no: "GRP-001",
      name: "東京一組",
      description: "説明文",
      active_flag: true,
      created_at: "2026-01-01T00:00:00.000Z",
      active_case_count: "5",
      member_count: "3",
    };
    const dto = mapGroupSummaryRow(row);
    assert.equal(dto.id, "g1");
    assert.equal(dto.orgId, "org1");
    assert.equal(dto.groupNo, "GRP-001");
    assert.equal(dto.name, "東京一組");
    assert.equal(dto.description, "説明文");
    assert.equal(dto.activeFlag, true);
    assert.equal(dto.createdAt, "2026-01-01T00:00:00.000Z");
    assert.equal(dto.activeCaseCount, 5);
    assert.equal(dto.memberCount, 3);
  });

  void test("handles Date timestamp", () => {
    const row: GroupSummaryRow = {
      id: "g1",
      org_id: "org1",
      group_no: null,
      name: "大阪",
      description: null,
      active_flag: false,
      created_at: new Date("2026-03-15T12:00:00.000Z"),
      active_case_count: "0",
      member_count: "0",
    };
    const dto = mapGroupSummaryRow(row);
    assert.equal(dto.groupNo, null);
    assert.equal(dto.description, null);
    assert.equal(dto.activeFlag, false);
    assert.equal(dto.createdAt, "2026-03-15T12:00:00.000Z");
    assert.equal(dto.activeCaseCount, 0);
    assert.equal(dto.memberCount, 0);
  });
});

void describe("mapGroupMemberRow", () => {
  void test("maps DB row to GroupMemberDto", () => {
    const row: GroupMemberRow = {
      id: "m1",
      user_id: "u1",
      is_primary_group: true,
      active_flag: true,
      joined_at: "2026-02-01T00:00:00.000Z",
      user_name: "田中太郎",
      user_email: "tanaka@e.com",
      user_role: "staff",
    };
    const dto = mapGroupMemberRow(row);
    assert.equal(dto.id, "m1");
    assert.equal(dto.userId, "u1");
    assert.equal(dto.isPrimaryGroup, true);
    assert.equal(dto.activeFlag, true);
    assert.equal(dto.joinedAt, "2026-02-01T00:00:00.000Z");
    assert.equal(dto.userName, "田中太郎");
    assert.equal(dto.userEmail, "tanaka@e.com");
    assert.equal(dto.userRole, "staff");
  });

  void test("handles Date timestamp for joinedAt", () => {
    const row: GroupMemberRow = {
      id: "m2",
      user_id: "u2",
      is_primary_group: false,
      active_flag: true,
      joined_at: new Date("2026-04-01T10:00:00.000Z"),
      user_name: "鈴木",
      user_email: "suzuki@e.com",
      user_role: "viewer",
    };
    const dto = mapGroupMemberRow(row);
    assert.equal(dto.joinedAt, "2026-04-01T10:00:00.000Z");
    assert.equal(dto.isPrimaryGroup, false);
  });
});

void describe("isDuplicateNameError", () => {
  void test("returns true for exact constraint match", () => {
    assert.equal(
      isDuplicateNameError({
        code: "23505",
        constraint: "uq_groups_org_name",
      }),
      true,
    );
  });

  void test("returns false for different constraint", () => {
    assert.equal(
      isDuplicateNameError({
        code: "23505",
        constraint: "uq_groups_org_id",
      }),
      false,
    );
  });

  void test("returns false for different error code", () => {
    assert.equal(
      isDuplicateNameError({
        code: "42000",
        constraint: "uq_groups_org_name",
      }),
      false,
    );
  });

  void test("returns false for null", () => {
    assert.equal(isDuplicateNameError(null), false);
  });

  void test("returns false for non-object", () => {
    assert.equal(isDuplicateNameError("error"), false);
  });

  void test("returns false for missing fields", () => {
    assert.equal(isDuplicateNameError({ code: "23505" }), false);
    assert.equal(isDuplicateNameError({}), false);
  });
});
