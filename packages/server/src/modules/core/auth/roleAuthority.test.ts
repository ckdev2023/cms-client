import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { canManageRole, canAssignRole } from "./roleAuthority";
import type { Role } from "./roles";

const ALL_ROLES: Role[] = ["owner", "manager", "staff", "viewer"];

void describe("canManageRole", () => {
  const expected: Record<Role, Record<Role, boolean>> = {
    owner: { owner: true, manager: true, staff: true, viewer: true },
    manager: { owner: false, manager: false, staff: true, viewer: true },
    staff: { owner: false, manager: false, staff: false, viewer: false },
    viewer: { owner: false, manager: false, staff: false, viewer: false },
  };

  for (const actor of ALL_ROLES) {
    for (const target of ALL_ROLES) {
      void test(`${actor} → ${target} = ${String(expected[actor][target])}`, () => {
        assert.equal(canManageRole(actor, target), expected[actor][target]);
      });
    }
  }
});

void describe("canAssignRole", () => {
  const expected: Record<Role, Record<Role, boolean>> = {
    owner: { owner: true, manager: true, staff: true, viewer: true },
    manager: { owner: false, manager: false, staff: true, viewer: true },
    staff: { owner: false, manager: false, staff: false, viewer: false },
    viewer: { owner: false, manager: false, staff: false, viewer: false },
  };

  for (const actor of ALL_ROLES) {
    for (const newRole of ALL_ROLES) {
      void test(`${actor} → ${newRole} = ${String(expected[actor][newRole])}`, () => {
        assert.equal(canAssignRole(actor, newRole), expected[actor][newRole]);
      });
    }
  }
});
