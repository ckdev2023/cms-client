import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultCustomerBmvProfile } from "../customers/customers.dto-mappers";
import { checkBmvCaseCreationGate } from "../cases/cases.types-bmv-gate";
import { synthesizeBmvProfileForSignedLeadAdminConvert } from "./leads.admin.convert-case";

void test("synthesizeBmvProfileForSignedLeadAdminConvert lets BMV gate pass from defaults", () => {
  const base = createDefaultCustomerBmvProfile();
  const gateBefore = checkBmvCaseCreationGate({
    caseTypeCode: "business_manager_visa",
    customerId: "cust-1",
    bmvQuestionnaireStatus: base.questionnaireStatus,
    bmvQuoteStatus: base.quoteStatus,
    bmvSignStatus: base.signStatus,
    bmvIntakeStatus: base.intakeStatus,
  });
  assert.equal(gateBefore.allowed, false);

  const synth = synthesizeBmvProfileForSignedLeadAdminConvert(
    base,
    "lead-1",
    "2026-05-11T00:00:00.000Z",
  );

  const gateAfter = checkBmvCaseCreationGate({
    caseTypeCode: "business_manager_visa",
    customerId: "cust-1",
    bmvQuestionnaireStatus: synth.questionnaireStatus,
    bmvQuoteStatus: synth.quoteStatus,
    bmvSignStatus: synth.signStatus,
    bmvIntakeStatus: synth.intakeStatus,
  });
  assert.equal(gateAfter.allowed, true);
  assert.equal(synth.sourceLeadId, "lead-1");
  assert.ok(synth.signedAt);
});

void test("synthesizeBmvProfileForSignedLeadAdminConvert retains prior timestamps when present", () => {
  const base = createDefaultCustomerBmvProfile();
  const returnedAt = "2026-03-01T10:00:00.000Z";
  const confirmedAt = "2026-03-02T11:00:00.000Z";
  const signedAt = "2026-03-03T12:00:00.000Z";
  const withTimes: typeof base = {
    ...base,
    questionnaireReturnedAt: returnedAt,
    quoteConfirmedAt: confirmedAt,
    signedAt,
  };

  const synth = synthesizeBmvProfileForSignedLeadAdminConvert(
    withTimes,
    "lead-z",
    "2026-05-11T00:00:00.000Z",
  );

  assert.equal(synth.questionnaireReturnedAt, returnedAt);
  assert.equal(synth.quoteConfirmedAt, confirmedAt);
  assert.equal(synth.signedAt, signedAt);
});
