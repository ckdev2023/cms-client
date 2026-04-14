import test from "node:test";
import assert from "node:assert/strict";

import type { Case, Customer } from "../model/coreEntities";
import { PermissionsService } from "./permissions.service";

const service = new PermissionsService();

const sampleCase: Case = {
  id: "case-1",
  orgId: "org-1",
  customerId: "customer-1",
  caseTypeCode: "visa",
  status: "open",
  stage: null,
  ownerUserId: "owner-1",
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
  assistantUserId: "assistant-1",
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
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const sampleCustomer: Customer = {
  id: "customer-1",
  orgId: "org-1",
  type: "individual",
  baseProfile: {},
  contacts: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

void test("PermissionsService allows manager+ to access and edit any case", () => {
  assert.equal(service.canAccessCase("someone", "manager", sampleCase), true);
  assert.equal(service.canEditCase("someone", "manager", sampleCase), true);
  assert.equal(service.canAccessCase("someone", "owner", sampleCase), true);
  assert.equal(service.canEditCase("someone", "owner", sampleCase), true);
});

void test("PermissionsService allows assigned staff to access and edit case", () => {
  assert.equal(service.canAccessCase("owner-1", "staff", sampleCase), true);
  assert.equal(service.canEditCase("owner-1", "staff", sampleCase), true);
  assert.equal(service.canAccessCase("assistant-1", "staff", sampleCase), true);
  assert.equal(service.canEditCase("assistant-1", "staff", sampleCase), true);
});

void test("PermissionsService allows assigned viewer to access and edit case", () => {
  assert.equal(
    service.canAccessCase("assistant-1", "viewer", sampleCase),
    true,
  );
  assert.equal(service.canEditCase("assistant-1", "viewer", sampleCase), true);
});

void test("PermissionsService denies unrelated staff case access and edit", () => {
  assert.equal(service.canAccessCase("staff-2", "staff", sampleCase), false);
  assert.equal(service.canEditCase("staff-2", "staff", sampleCase), false);
});

void test("PermissionsService allows customer access and edit for same-org roles in phase 1", () => {
  assert.equal(
    service.canAccessCustomer("user-1", "owner", sampleCustomer),
    true,
  );
  assert.equal(
    service.canAccessCustomer("user-1", "manager", sampleCustomer),
    true,
  );
  assert.equal(
    service.canAccessCustomer("user-1", "staff", sampleCustomer),
    true,
  );
  assert.equal(
    service.canAccessCustomer("user-1", "viewer", sampleCustomer),
    true,
  );
  assert.equal(service.canEditCustomer("user-1", "owner"), true);
  assert.equal(service.canEditCustomer("user-1", "manager"), true);
  assert.equal(service.canEditCustomer("user-1", "staff"), true);
  assert.equal(service.canEditCustomer("user-1", "viewer"), true);
});
