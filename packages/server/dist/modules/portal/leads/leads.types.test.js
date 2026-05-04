import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  checkLeadConvertGate,
  assessLeadBmvReadiness,
  LEAD_STATUSES,
  LEAD_SOURCES,
} from "./leads.types";
// ── lead convert gate ──
void test("checkLeadConvertGate: non-BMV lead with assignment can convert", () => {
  const result = checkLeadConvertGate({
    leadStatus: "assigned",
    assignedOrgId: "org-1",
    isBmv: false,
  });
  assert.equal(result.canConvert, true);
  assert.equal(result.blockers.length, 0);
});
void test("checkLeadConvertGate: unassigned lead cannot convert", () => {
  const result = checkLeadConvertGate({
    leadStatus: "new",
    assignedOrgId: null,
    isBmv: false,
  });
  assert.equal(result.canConvert, false);
  assert.ok(result.blockers.some((b) => b.code === "LEAD_NOT_ASSIGNED"));
});
void test("checkLeadConvertGate: already converted lead is blocked", () => {
  const result = checkLeadConvertGate({
    leadStatus: "converted",
    assignedOrgId: "org-1",
    isBmv: false,
  });
  assert.equal(result.canConvert, false);
  assert.ok(result.blockers.some((b) => b.code === "LEAD_ALREADY_CONVERTED"));
});
void test("checkLeadConvertGate: BMV lead with signed + ready can convert", () => {
  const result = checkLeadConvertGate({
    leadStatus: "assigned",
    assignedOrgId: "org-1",
    isBmv: true,
    bmvSignStatus: "signed",
    bmvIntakeStatus: "ready_for_case_creation",
  });
  assert.equal(result.canConvert, true);
  assert.equal(result.blockers.length, 0);
});
void test("checkLeadConvertGate: BMV lead without signature is blocked", () => {
  const result = checkLeadConvertGate({
    leadStatus: "assigned",
    assignedOrgId: "org-1",
    isBmv: true,
    bmvSignStatus: "pending",
    bmvIntakeStatus: "sign_pending",
  });
  assert.equal(result.canConvert, false);
  assert.ok(result.blockers.some((b) => b.code === "BMV_NOT_SIGNED"));
});
void test("checkLeadConvertGate: BMV lead with questionnaire not started is blocked", () => {
  const result = checkLeadConvertGate({
    leadStatus: "assigned",
    assignedOrgId: "org-1",
    isBmv: true,
    bmvSignStatus: "not_started",
    bmvIntakeStatus: "not_started",
  });
  assert.equal(result.canConvert, false);
  assert.ok(result.blockers.some((b) => b.code === "BMV_NOT_SIGNED"));
  assert.ok(
    result.blockers.some((b) => b.code === "BMV_QUESTIONNAIRE_INCOMPLETE"),
  );
});
void test("checkLeadConvertGate: BMV lead with quote pending is blocked", () => {
  const result = checkLeadConvertGate({
    leadStatus: "assigned",
    assignedOrgId: "org-1",
    isBmv: true,
    bmvSignStatus: "pending",
    bmvIntakeStatus: "quote_pending",
  });
  assert.equal(result.canConvert, false);
  assert.ok(result.blockers.some((b) => b.code === "BMV_NOT_SIGNED"));
  assert.ok(result.blockers.some((b) => b.code === "BMV_QUOTE_NOT_CONFIRMED"));
});
void test("checkLeadConvertGate: multiple blockers accumulate", () => {
  const result = checkLeadConvertGate({
    leadStatus: "converted",
    assignedOrgId: null,
    isBmv: true,
    bmvSignStatus: "not_started",
    bmvIntakeStatus: "not_started",
  });
  assert.equal(result.canConvert, false);
  assert.ok(result.blockers.length >= 3);
});
// ── enum constants ──
void describe("lead enum constants", () => {
  void test("LEAD_STATUSES covers all lifecycle states", () => {
    assert.deepEqual(
      [...LEAD_STATUSES],
      ["new", "contacted", "assigned", "converted", "closed"],
    );
  });
  void test("LEAD_SOURCES covers all channels", () => {
    assert.ok(LEAD_SOURCES.includes("web"));
    assert.ok(LEAD_SOURCES.includes("referral"));
    assert.equal(LEAD_SOURCES.length, 6);
  });
});
// ── assessLeadBmvReadiness ──
void describe("assessLeadBmvReadiness", () => {
  void test("fully ready BMV lead reports canConvert=true", () => {
    const snapshot = assessLeadBmvReadiness({
      assignedOrgId: "org-1",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "confirmed",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    });
    assert.equal(snapshot.canConvert, true);
    assert.equal(snapshot.isAssigned, true);
    assert.equal(snapshot.questionnaireSent, true);
    assert.equal(snapshot.questionnaireReturned, true);
    assert.equal(snapshot.quoteGenerated, true);
    assert.equal(snapshot.quoteConfirmed, true);
    assert.equal(snapshot.signed, true);
    assert.equal(snapshot.intakeReady, true);
  });
  void test("unassigned lead reports canConvert=false", () => {
    const snapshot = assessLeadBmvReadiness({
      assignedOrgId: null,
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "confirmed",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    });
    assert.equal(snapshot.canConvert, false);
    assert.equal(snapshot.isAssigned, false);
  });
  void test("not_started profile reports all phases incomplete", () => {
    const snapshot = assessLeadBmvReadiness({
      assignedOrgId: null,
      bmvQuestionnaireStatus: "not_started",
      bmvQuoteStatus: "not_started",
      bmvSignStatus: "not_started",
      bmvIntakeStatus: "not_started",
    });
    assert.equal(snapshot.canConvert, false);
    assert.equal(snapshot.questionnaireSent, false);
    assert.equal(snapshot.questionnaireReturned, false);
    assert.equal(snapshot.quoteGenerated, false);
    assert.equal(snapshot.quoteConfirmed, false);
    assert.equal(snapshot.signed, false);
    assert.equal(snapshot.intakeReady, false);
  });
  void test("sent questionnaire but not returned is partial progress", () => {
    const snapshot = assessLeadBmvReadiness({
      assignedOrgId: "org-1",
      bmvQuestionnaireStatus: "sent",
      bmvQuoteStatus: "not_started",
      bmvSignStatus: "not_started",
      bmvIntakeStatus: "questionnaire_pending",
    });
    assert.equal(snapshot.questionnaireSent, true);
    assert.equal(snapshot.questionnaireReturned, false);
    assert.equal(snapshot.canConvert, false);
  });
  void test("quote generated but not confirmed is partial", () => {
    const snapshot = assessLeadBmvReadiness({
      assignedOrgId: "org-1",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "generated",
      bmvSignStatus: "pending",
      bmvIntakeStatus: "sign_pending",
    });
    assert.equal(snapshot.quoteGenerated, true);
    assert.equal(snapshot.quoteConfirmed, false);
    assert.equal(snapshot.canConvert, false);
  });
  void test("null profile fields default to incomplete", () => {
    const snapshot = assessLeadBmvReadiness({
      assignedOrgId: "org-1",
    });
    assert.equal(snapshot.questionnaireSent, false);
    assert.equal(snapshot.questionnaireReturned, false);
    assert.equal(snapshot.quoteGenerated, false);
    assert.equal(snapshot.quoteConfirmed, false);
    assert.equal(snapshot.signed, false);
    assert.equal(snapshot.intakeReady, false);
    assert.equal(snapshot.canConvert, false);
  });
});
// ── type contracts ──
void describe("leads type contracts", () => {
  void test("LeadBmvConvertContext can be constructed", () => {
    const ctx = {
      customerId: "cust-1",
      caseTypeCode: "business_manager_visa",
      visaPlan: "new_1year",
      quotePrice: 500000,
    };
    assert.equal(ctx.caseTypeCode, "business_manager_visa");
  });
  void test("LeadConvertToCasePayload includes sourceChannel and leadId", () => {
    const payload = {
      customerId: "cust-1",
      caseTypeCode: "business_manager_visa",
      ownerUserId: "user-1",
      orgId: "org-1",
      sourceChannel: "lead_convert",
      leadId: "lead-1",
    };
    assert.equal(payload.sourceChannel, "lead_convert");
    assert.equal(payload.leadId, "lead-1");
  });
  void test("LeadBmvReadinessSnapshot has all 8 boolean fields", () => {
    const snap = {
      isAssigned: true,
      questionnaireSent: true,
      questionnaireReturned: true,
      quoteGenerated: true,
      quoteConfirmed: true,
      signed: true,
      intakeReady: true,
      canConvert: true,
    };
    const keys = Object.keys(snap);
    assert.equal(keys.length, 8);
    for (const k of keys) {
      assert.equal(typeof snap[k], "boolean");
    }
  });
});
//# sourceMappingURL=leads.types.test.js.map
