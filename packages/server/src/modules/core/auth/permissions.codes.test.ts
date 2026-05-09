import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  PERMISSION_CODES,
  ALL_PERMISSION_CODES,
  getSystemRolePermissions,
  isValidPermissionCode,
} from "./permissions.codes";

void describe("PERMISSION_CODES", () => {
  void test("all codes follow resource.action naming convention", () => {
    for (const code of ALL_PERMISSION_CODES) {
      assert.match(code, /^[a-z][a-z_]*\.[a-z]+$/);
    }
  });

  void test("ALL_PERMISSION_CODES has no duplicates", () => {
    const unique = new Set(ALL_PERMISSION_CODES);
    assert.equal(unique.size, ALL_PERMISSION_CODES.length);
  });

  void test("contains expected count (16)", () => {
    assert.equal(ALL_PERMISSION_CODES.length, 16);
  });
});

void describe("getSystemRolePermissions", () => {
  void test("owner has all permissions", () => {
    const perms = getSystemRolePermissions("owner");
    assert.equal(perms.length, ALL_PERMISSION_CODES.length);
    for (const code of ALL_PERMISSION_CODES) {
      assert.ok(perms.includes(code), `owner missing ${code}`);
    }
  });

  void test("manager has all except permission.override and feature_flag.manage", () => {
    const perms = getSystemRolePermissions("manager");
    assert.ok(!perms.includes(PERMISSION_CODES.PERMISSION_OVERRIDE));
    assert.ok(!perms.includes(PERMISSION_CODES.FEATURE_FLAG_MANAGE));
    assert.ok(perms.includes(PERMISSION_CODES.CASE_VIEW));
    assert.ok(perms.includes(PERMISSION_CODES.USER_MANAGE));
    assert.ok(perms.includes(PERMISSION_CODES.ROLE_ASSIGN));
    assert.equal(perms.length, ALL_PERMISSION_CODES.length - 2);
  });

  void test("staff has 10 permissions", () => {
    const perms = getSystemRolePermissions("staff");
    assert.equal(perms.length, 10);
    assert.ok(perms.includes(PERMISSION_CODES.CASE_VIEW));
    assert.ok(perms.includes(PERMISSION_CODES.USER_VIEW));
    assert.ok(!perms.includes(PERMISSION_CODES.USER_MANAGE));
    assert.ok(!perms.includes(PERMISSION_CODES.GROUP_MANAGE));
  });

  void test("viewer has 4 read-only permissions", () => {
    const perms = getSystemRolePermissions("viewer");
    assert.equal(perms.length, 4);
    assert.ok(perms.includes(PERMISSION_CODES.CASE_VIEW));
    assert.ok(perms.includes(PERMISSION_CODES.CUSTOMER_VIEW));
    assert.ok(perms.includes(PERMISSION_CODES.GROUP_VIEW));
    assert.ok(perms.includes(PERMISSION_CODES.USER_VIEW));
  });

  void test("unknown role returns empty array", () => {
    const perms = getSystemRolePermissions("nonexistent");
    assert.equal(perms.length, 0);
  });

  void test("staff is superset of viewer", () => {
    const staffPerms = new Set(getSystemRolePermissions("staff"));
    for (const viewerPerm of getSystemRolePermissions("viewer")) {
      assert.ok(
        staffPerms.has(viewerPerm),
        `staff missing viewer perm ${viewerPerm}`,
      );
    }
  });

  void test("manager is superset of staff", () => {
    const managerPerms = new Set(getSystemRolePermissions("manager"));
    for (const staffPerm of getSystemRolePermissions("staff")) {
      assert.ok(
        managerPerms.has(staffPerm),
        `manager missing staff perm ${staffPerm}`,
      );
    }
  });
});

void describe("isValidPermissionCode", () => {
  void test("returns true for valid codes", () => {
    assert.ok(isValidPermissionCode("case.view"));
    assert.ok(isValidPermissionCode("permission.override"));
  });

  void test("returns false for invalid codes", () => {
    assert.ok(!isValidPermissionCode("invalid.code"));
    assert.ok(!isValidPermissionCode(""));
    assert.ok(!isValidPermissionCode("case"));
  });
});
