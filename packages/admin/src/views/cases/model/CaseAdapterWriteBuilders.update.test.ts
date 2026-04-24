// ── Test Ownership ──────────────────────────────────────────────
// Owner: write request-body builders — update family
//   (buildUpdateCaseInputFromDraft, UPDATE_PATCH_*, buildUpdateCasePayload).
// Does NOT test: create / transition / billing-risk-ack / post-approval
//   builders (split into sibling test files), response mapping, URL
//   construction, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  buildUpdateCaseInputFromDraft,
  buildUpdateCasePayload,
  UPDATE_PATCH_NULLABLE_FIELDS,
  UPDATE_PATCH_NON_NULL_FIELDS,
  type UpdateCaseDraftSnapshot,
  type UpdateCaseFormValues,
} from "./CaseAdapterWriteBuilders";

// ─── buildUpdateCaseInputFromDraft (p0-fe-002d-02) ───────────────

describe("buildUpdateCaseInputFromDraft", () => {
  const BASE_FORM: UpdateCaseFormValues = {
    caseName: "李娜 家族滞在認定",
    caseTypeCode: "family",
    ownerUserId: "suzuki",
    groupId: "tokyo-1",
    dueAt: "2026-12-31",
    applicationType: "認定",
    caseSubtype: "engineer",
    priority: "normal",
    riskLevel: "low",
    assistantUserId: "tanaka",
    sourceChannel: "web",
    signedAt: "2026-01-01",
    acceptedAt: "2026-01-15",
    submissionDate: "",
    resultDate: "",
    residenceExpiryDate: "",
    archivedAt: "",
    resultOutcome: "",
  };

  const BASE_SNAPSHOT: UpdateCaseDraftSnapshot = {
    original: { ...BASE_FORM },
    current: { ...BASE_FORM },
    groupTransferReason: "",
    originalAmount: "300000",
    currentAmount: "300000",
  };

  it("produces empty input when nothing changed", () => {
    const input = buildUpdateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input).toEqual({});
  });

  it("includes only changed nullable field", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      current: { ...BASE_FORM, caseName: "Updated Title" },
    });
    expect(input.caseName).toBe("Updated Title");
    expect(Object.keys(input)).toEqual(["caseName"]);
  });

  it("includes multiple changed nullable fields", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      current: {
        ...BASE_FORM,
        caseName: "New Title",
        dueAt: "2027-03-31",
        sourceChannel: "referral",
      },
    });
    expect(input.caseName).toBe("New Title");
    expect(input.dueAt).toBe("2027-03-31");
    expect(input.sourceChannel).toBe("referral");
    expect(Object.keys(input)).toHaveLength(3);
  });

  it("sets cleared nullable field to null", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      current: { ...BASE_FORM, caseName: "", assistantUserId: "" },
    });
    expect(input.caseName).toBeNull();
    expect(input.assistantUserId).toBeNull();
  });

  it("includes changed non-nullable field", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      current: { ...BASE_FORM, priority: "high" },
    });
    expect(input.priority).toBe("high");
    expect(Object.keys(input)).toEqual(["priority"]);
  });

  it("omits non-nullable field when cleared (can't represent 'clear')", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      current: { ...BASE_FORM, priority: "" },
    });
    expect(input).not.toHaveProperty("priority");
  });

  it("includes groupId and groupTransferReason when group changed", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      current: { ...BASE_FORM, groupId: "osaka-1" },
      groupTransferReason: "client relocated",
    });
    expect(input.groupId).toBe("osaka-1");
    expect(input.groupTransferReason).toBe("client relocated");
  });

  it("omits groupTransferReason when empty despite group change", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      current: { ...BASE_FORM, groupId: "osaka-1" },
      groupTransferReason: "",
    });
    expect(input.groupId).toBe("osaka-1");
    expect(input).not.toHaveProperty("groupTransferReason");
  });

  it("omits both groupId and groupTransferReason when group unchanged", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      groupTransferReason: "should be ignored",
    });
    expect(input).not.toHaveProperty("groupId");
    expect(input).not.toHaveProperty("groupTransferReason");
  });

  it("sets groupId to null when cleared", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      current: { ...BASE_FORM, groupId: "" },
    });
    expect(input.groupId).toBeNull();
  });

  it("includes quotePrice when amount changed", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      currentAmount: "500000",
    });
    expect(input.quotePrice).toBe(500000);
    expect(Object.keys(input)).toEqual(["quotePrice"]);
  });

  it("treats comma-separated amount as same value", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      originalAmount: "300000",
      currentAmount: "300,000",
    });
    expect(input).not.toHaveProperty("quotePrice");
  });

  it("sets quotePrice to null when amount cleared", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      currentAmount: "",
    });
    expect(input.quotePrice).toBeNull();
  });

  it("preserves quotePrice = 0 when changed to zero", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      currentAmount: "0",
    });
    expect(input.quotePrice).toBe(0);
  });

  it("omits quotePrice when both amounts are empty", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      originalAmount: "",
      currentAmount: "",
    });
    expect(input).not.toHaveProperty("quotePrice");
  });

  it("handles all-fields-changed scenario", () => {
    const allChanged: UpdateCaseFormValues = {
      caseName: "New Name",
      caseTypeCode: "work",
      ownerUserId: "yamada",
      groupId: "osaka-1",
      dueAt: "2027-06-30",
      applicationType: "変更",
      caseSubtype: "specialist",
      priority: "high",
      riskLevel: "critical",
      assistantUserId: "sato",
      sourceChannel: "referral",
      signedAt: "2026-06-01",
      acceptedAt: "2026-06-15",
      submissionDate: "2026-07-01",
      resultDate: "2026-08-01",
      residenceExpiryDate: "2029-06-01",
      archivedAt: "2027-01-01",
      resultOutcome: "approved",
    };
    const input = buildUpdateCaseInputFromDraft({
      original: { ...BASE_FORM },
      current: allChanged,
      groupTransferReason: "reassigned",
      originalAmount: "300000",
      currentAmount: "500000",
    });
    expect(input.caseName).toBe("New Name");
    expect(input.caseTypeCode).toBe("work");
    expect(input.ownerUserId).toBe("yamada");
    expect(input.groupId).toBe("osaka-1");
    expect(input.groupTransferReason).toBe("reassigned");
    expect(input.dueAt).toBe("2027-06-30");
    expect(input.applicationType).toBe("変更");
    expect(input.caseSubtype).toBe("specialist");
    expect(input.priority).toBe("high");
    expect(input.riskLevel).toBe("critical");
    expect(input.assistantUserId).toBe("sato");
    expect(input.sourceChannel).toBe("referral");
    expect(input.signedAt).toBe("2026-06-01");
    expect(input.acceptedAt).toBe("2026-06-15");
    expect(input.submissionDate).toBe("2026-07-01");
    expect(input.resultDate).toBe("2026-08-01");
    expect(input.residenceExpiryDate).toBe("2029-06-01");
    expect(input.archivedAt).toBe("2027-01-01");
    expect(input.resultOutcome).toBe("approved");
    expect(input.quotePrice).toBe(500000);
  });

  it("produces output compatible with buildUpdateCasePayload", () => {
    const input = buildUpdateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      current: { ...BASE_FORM, caseName: "  Updated  ", groupId: "osaka-1" },
      groupTransferReason: " reason ",
      currentAmount: "500,000",
    });
    const payload = buildUpdateCasePayload(input);
    expect(payload).toHaveProperty("caseName", "Updated");
    expect(payload).toHaveProperty("groupId", "osaka-1");
    expect(payload).toHaveProperty("groupTransferReason", "reason");
    expect(payload).toHaveProperty("quotePrice", 500000);
  });

  it("does not include fields absent from CaseUpdateInput", () => {
    const input = buildUpdateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input).not.toHaveProperty("customerId");
    expect(input).not.toHaveProperty("stage");
    expect(input).not.toHaveProperty("metadata");
    expect(input).not.toHaveProperty("caseNo");
    expect(input).not.toHaveProperty("companyId");
  });
});

// ─── field constant sync (p0-fe-002d-02) ─────────────────────────

describe("UPDATE_PATCH field constants", () => {
  it("nullable + non-null + groupId covers all UpdateCaseFormValues keys", () => {
    const allKeys = new Set<string>([
      ...UPDATE_PATCH_NULLABLE_FIELDS,
      ...UPDATE_PATCH_NON_NULL_FIELDS,
      "groupId",
    ]);
    const formKeys: (keyof UpdateCaseFormValues)[] = [
      "caseName",
      "caseTypeCode",
      "ownerUserId",
      "groupId",
      "dueAt",
      "applicationType",
      "caseSubtype",
      "priority",
      "riskLevel",
      "assistantUserId",
      "sourceChannel",
      "signedAt",
      "acceptedAt",
      "submissionDate",
      "resultDate",
      "residenceExpiryDate",
      "archivedAt",
      "resultOutcome",
    ];
    expect([...allKeys].sort()).toEqual([...formKeys].sort());
  });

  it("no field appears in both nullable and non-null lists", () => {
    const nullable = new Set<string>(UPDATE_PATCH_NULLABLE_FIELDS);
    for (const key of UPDATE_PATCH_NON_NULL_FIELDS) {
      expect(nullable.has(key)).toBe(false);
    }
  });
});

// ─── buildUpdateCasePayload (p0-fe-002d-02) ─────────────────────

describe("buildUpdateCasePayload", () => {
  it("includes only provided fields (patch semantics)", () => {
    const payload = buildUpdateCasePayload({
      caseName: "Updated Name",
      groupId: "g-new",
      groupTransferReason: "reassigned",
    });
    expect(payload).toEqual({
      caseName: "Updated Name",
      groupId: "g-new",
      groupTransferReason: "reassigned",
    });
  });

  it("omits undefined fields for minimal patch", () => {
    const payload = buildUpdateCasePayload({ priority: "high" });
    expect(payload).toEqual({ priority: "high" });
    expect(payload).not.toHaveProperty("caseName");
    expect(payload).not.toHaveProperty("groupId");
    expect(payload).not.toHaveProperty("dueAt");
    expect(payload).not.toHaveProperty("sourceChannel");
  });

  it("preserves explicit null to clear a field", () => {
    const payload = buildUpdateCasePayload({
      dueAt: null,
      assistantUserId: null,
      groupId: null,
    });
    expect(payload.dueAt).toBeNull();
    expect(payload.assistantUserId).toBeNull();
    expect(payload.groupId).toBeNull();
  });

  it("normalizes empty string to null for nullable fields", () => {
    const payload = buildUpdateCasePayload({
      caseName: "",
      dueAt: "",
      assistantUserId: "",
      groupId: "",
      groupTransferReason: "",
      sourceChannel: "",
      signedAt: "",
      acceptedAt: "",
      submissionDate: "",
      resultDate: "",
      residenceExpiryDate: "",
      archivedAt: "",
      resultOutcome: "",
    });
    expect(payload.caseName).toBeNull();
    expect(payload.dueAt).toBeNull();
    expect(payload.assistantUserId).toBeNull();
    expect(payload.groupId).toBeNull();
    expect(payload.groupTransferReason).toBeNull();
    expect(payload.sourceChannel).toBeNull();
    expect(payload.signedAt).toBeNull();
    expect(payload.acceptedAt).toBeNull();
    expect(payload.submissionDate).toBeNull();
    expect(payload.resultDate).toBeNull();
    expect(payload.residenceExpiryDate).toBeNull();
    expect(payload.archivedAt).toBeNull();
    expect(payload.resultOutcome).toBeNull();
  });

  it("omits empty-string optional non-null fields (caseTypeCode, ownerUserId, priority, riskLevel)", () => {
    const payload = buildUpdateCasePayload({
      caseTypeCode: "",
      ownerUserId: "",
      priority: "",
      riskLevel: "",
    });
    expect(payload).not.toHaveProperty("caseTypeCode");
    expect(payload).not.toHaveProperty("ownerUserId");
    expect(payload).not.toHaveProperty("priority");
    expect(payload).not.toHaveProperty("riskLevel");
  });

  it("trims whitespace from string fields", () => {
    const payload = buildUpdateCasePayload({
      caseName: "  Updated  ",
      groupTransferReason: " reason ",
    });
    expect(payload.caseName).toBe("Updated");
    expect(payload.groupTransferReason).toBe("reason");
  });

  it("preserves quotePrice = 0", () => {
    const payload = buildUpdateCasePayload({ quotePrice: 0 });
    expect(payload.quotePrice).toBe(0);
  });

  it("preserves quotePrice = null to clear", () => {
    const payload = buildUpdateCasePayload({ quotePrice: null });
    expect(payload.quotePrice).toBeNull();
  });

  it("empty object produces empty payload", () => {
    const payload = buildUpdateCasePayload({});
    expect(payload).toEqual({});
  });

  it("includes server-aligned date fields", () => {
    const payload = buildUpdateCasePayload({
      sourceChannel: "web",
      signedAt: "2026-01-01",
      acceptedAt: "2026-01-15",
      submissionDate: "2026-02-01",
      resultDate: "2026-03-01",
      residenceExpiryDate: "2029-01-01",
      archivedAt: "2026-06-01",
      resultOutcome: "approved",
      quotePrice: 150000,
    });
    expect(payload.sourceChannel).toBe("web");
    expect(payload.signedAt).toBe("2026-01-01");
    expect(payload.acceptedAt).toBe("2026-01-15");
    expect(payload.submissionDate).toBe("2026-02-01");
    expect(payload.resultDate).toBe("2026-03-01");
    expect(payload.residenceExpiryDate).toBe("2029-01-01");
    expect(payload.archivedAt).toBe("2026-06-01");
    expect(payload.resultOutcome).toBe("approved");
    expect(payload.quotePrice).toBe(150000);
  });
});
