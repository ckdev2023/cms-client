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
    source_channel: null,
    lead_name: null,
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
        sourceChannel: "web",
      },
      owner_user_id: "u-1",
      group_id: "g-1",
      intended_case_type: "business_manager_visa",
    });
    assert.equal(buildPatch(r), null);
  });

  void it("falls back sourceChannel to unknown when lead has no data", () => {
    const patch = buildPatch(row());
    assert.deepEqual(patch, { sourceChannel: "unknown" });
  });

  void it("patches ownerUserId directly from owner_user_id (R-FLOW5-A-3)", () => {
    const r = row({
      base_profile: { sourceChannel: "web" },
      owner_user_id: "owner-1",
    });
    const patch = buildPatch(r);
    assert.deepEqual(patch, { ownerUserId: "owner-1" });
  });

  void it("patches groupId", () => {
    const r = row({
      base_profile: { sourceChannel: "web" },
      group_id: "g-1",
    });
    const patch = buildPatch(r);
    assert.deepEqual(patch, { groupId: "g-1" });
  });

  void it("patches visaType from intended_case_type (BMV)", () => {
    const r = row({
      base_profile: { sourceChannel: "web" },
      intended_case_type: "business_manager_visa",
    });
    const patch = buildPatch(r);
    assert.deepEqual(patch, { visaType: "business_manager" });
  });

  void it("does not patch visaType for unknown intended_case_type", () => {
    const r = row({
      base_profile: { sourceChannel: "web" },
      intended_case_type: "unknown_xyz",
    });
    assert.equal(buildPatch(r), null);
  });

  void it("patches all three fields at once", () => {
    const r = row({
      base_profile: { sourceChannel: "web" },
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
      base_profile: { ownerUserId: "existing-owner", sourceChannel: "web" },
      owner_user_id: "u-new",
      group_id: "g-1",
    });
    const patch = buildPatch(r);
    assert.deepEqual(patch, { groupId: "g-1" });
  });

  void it("backfills sourceChannel from lead source_channel", () => {
    const r = row({ source_channel: "web" });
    const patch = buildPatch(r);
    assert.equal(patch?.sourceChannel, "web");
  });

  void it("backfills name_jp and name_cn from lead name", () => {
    const r = row({
      base_profile: { sourceChannel: "web" },
      lead_name: "田中花子",
    });
    const patch = buildPatch(r);
    assert.deepEqual(patch, { name_jp: "田中花子", name_cn: "田中花子" });
  });

  void it("skips sourceChannel when already present in base_profile", () => {
    const r = row({
      base_profile: { sourceChannel: "web" },
      source_channel: "referral",
      group_id: "g-1",
    });
    const patch = buildPatch(r);
    assert.equal(patch?.sourceChannel, undefined);
    assert.equal(patch?.groupId, "g-1");
  });

  void it("falls back to 'unknown' when lead source_channel is null", () => {
    const r = row({
      base_profile: { ownerUserId: "u-1", groupId: "g-1" },
      source_channel: null,
    });
    const patch = buildPatch(r);
    assert.equal(patch?.sourceChannel, "unknown");
  });
});
