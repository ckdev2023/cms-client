import test from "node:test";
import assert from "node:assert/strict";

import { hasRequiredRole, parseRole } from "./roles";

void test("parseRole parses known roles", () => {
  assert.equal(parseRole("owner"), "owner");
  assert.equal(parseRole("manager"), "manager");
  assert.equal(parseRole("staff"), "staff");
  assert.equal(parseRole("viewer"), "viewer");
  assert.equal(parseRole("unknown"), null);
});

void test("hasRequiredRole supports role hierarchy", () => {
  assert.equal(hasRequiredRole("owner", ["viewer"]), true);
  assert.equal(hasRequiredRole("manager", ["manager"]), true);
  assert.equal(hasRequiredRole("staff", ["manager"]), false);
  assert.equal(hasRequiredRole("viewer", ["viewer"]), true);
  assert.equal(hasRequiredRole("viewer", []), true);
});
