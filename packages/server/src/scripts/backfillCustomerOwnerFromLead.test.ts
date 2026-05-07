import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildPatch, type BackfillRow } from "./backfillCustomerOwnerFromLead";

function row(overrides: Partial<BackfillRow> = {}): BackfillRow {
  return {
    customer_id: "cust-1",
    base_profile: {},
    owner_user_id: null,
    group_id: null,
    intended_case_type: null,
    ...overrides,
  };
}

void describe("buildPatch", () => {
  void it("returns null when base_profile already has all fields", () => {
    const r = row({
      base_profile: {
        ownerUserId: "u-1",
        groupId: "g-1",
        visaType: "business_manager",
      },
      owner_user_id: "u-1",
      group_id: "g-1",
      intended_case_type: "business_manager_visa",
    });
    assert.equal(buildPatch(r), null);
  });

  void it("returns null when lead has no data to backfill", () => {
    assert.equal(buildPatch(row()), null);
  });

  void it("patches ownerUserId directly from owner_user_id (R-FLOW5-A-3)", () => {
    const r = row({ owner_user_id: "owner-1" });
    const patch = buildPatch(r);
    assert.deepEqual(patch, { ownerUserId: "owner-1" });
  });

  void it("patches groupId", () => {
    const r = row({ group_id: "g-1" });
    const patch = buildPatch(r);
    assert.deepEqual(patch, { groupId: "g-1" });
  });

  void it("patches visaType from intended_case_type (BMV)", () => {
    const r = row({ intended_case_type: "business_manager_visa" });
    const patch = buildPatch(r);
    assert.deepEqual(patch, { visaType: "business_manager" });
  });

  void it("does not patch visaType for unknown intended_case_type", () => {
    const r = row({ intended_case_type: "unknown_xyz" });
    assert.equal(buildPatch(r), null);
  });

  void it("patches all three fields at once", () => {
    const r = row({
      owner_user_id: "u-1",
      group_id: "g-1",
      intended_case_type: "dependent_visa",
    });
    const patch = buildPatch(r);
    assert.deepEqual(patch, {
      ownerUserId: "u-1",
      groupId: "g-1",
      visaType: "dependent",
    });
  });

  void it("skips fields already present in base_profile", () => {
    const r = row({
      base_profile: { ownerUserId: "existing-owner" },
      owner_user_id: "u-new",
      group_id: "g-1",
    });
    const patch = buildPatch(r);
    assert.deepEqual(patch, { groupId: "g-1" });
  });
});
