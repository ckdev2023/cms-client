// ── Test Ownership ──────────────────────────────────────────────
// Owner: write request-body builders (buildCreateCasePayload,
//   buildUpdateCasePayload, buildTransitionPayload, etc.).
// Does NOT test: response mapping, URL construction, or repository
//   orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  buildBillingRiskAckPayload,
  buildCreateCaseInputFromDraft,
  buildCreateCasePayload,
  buildPostApprovalPayload,
  buildTransitionPayload,
  buildUpdateCaseInputFromDraft,
  buildUpdateCasePayload,
  normalizeNullableString,
  parseQuotePrice,
  UPDATE_PATCH_NULLABLE_FIELDS,
  UPDATE_PATCH_NON_NULL_FIELDS,
  type CreateCaseDraftSnapshot,
  type UpdateCaseDraftSnapshot,
  type UpdateCaseFormValues,
} from "./CaseAdapterWriteBuilders";

// ─── normalizeNullableString (p0-fe-002d-04) ────────────────────

describe("normalizeNullableString", () => {
  it("returns undefined when input is undefined", () => {
    expect(normalizeNullableString(undefined)).toBeUndefined();
  });

  it("returns null when input is null", () => {
    expect(normalizeNullableString(null)).toBeNull();
  });

  it("returns null when input is empty string", () => {
    expect(normalizeNullableString("")).toBeNull();
  });

  it("returns null when input is whitespace-only", () => {
    expect(normalizeNullableString("   ")).toBeNull();
    expect(normalizeNullableString("\t\n")).toBeNull();
  });

  it("trims non-empty strings", () => {
    expect(normalizeNullableString("  hello  ")).toBe("hello");
  });

  it("preserves non-empty strings without whitespace", () => {
    expect(normalizeNullableString("visa")).toBe("visa");
  });
});

// ─── parseQuotePrice (p0-fe-002d-01) ─────────────────────────────

describe("parseQuotePrice", () => {
  it("parses integer string", () => {
    expect(parseQuotePrice("300000")).toBe(300000);
  });

  it("strips thousands commas", () => {
    expect(parseQuotePrice("300,000")).toBe(300000);
  });

  it("parses decimal", () => {
    expect(parseQuotePrice("150000.5")).toBe(150000.5);
  });

  it("returns undefined for empty string", () => {
    expect(parseQuotePrice("")).toBeUndefined();
  });

  it("returns undefined for whitespace-only", () => {
    expect(parseQuotePrice("   ")).toBeUndefined();
  });

  it("returns undefined for non-numeric", () => {
    expect(parseQuotePrice("abc")).toBeUndefined();
  });

  it("returns undefined for mixed alpha-numeric", () => {
    expect(parseQuotePrice("12abc")).toBeUndefined();
  });

  it("preserves zero", () => {
    expect(parseQuotePrice("0")).toBe(0);
  });

  it("handles negative values", () => {
    expect(parseQuotePrice("-1000")).toBe(-1000);
  });

  it("handles leading/trailing whitespace around digits", () => {
    expect(parseQuotePrice("  300000  ")).toBe(300000);
  });
});

// ─── buildCreateCaseInputFromDraft (p0-fe-002d-01) ───────────────

describe("buildCreateCaseInputFromDraft", () => {
  const BASE_SNAPSHOT: CreateCaseDraftSnapshot = {
    customerId: "cust-001",
    templateId: "family",
    applicationType: "認定",
    effectiveTitle: "李娜 家族滞在認定",
    group: "tokyo-1",
    inheritedGroup: "tokyo-1",
    groupOverrideReason: "",
    owner: "suzuki",
    dueDate: "2026-12-31",
    amount: "300000",
  };

  it("maps required fields from snapshot", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input.customerId).toBe("cust-001");
    expect(input.caseTypeCode).toBe("family");
    expect(input.ownerUserId).toBe("suzuki");
  });

  it("defaults stage to S1", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input.stage).toBe("S1");
  });

  it("maps group to groupId", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input.groupId).toBe("tokyo-1");
  });

  it("omits groupId when group is empty", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      group: "",
      inheritedGroup: "",
    });
    expect(input.groupId).toBeUndefined();
  });

  it("omits crossGroupReason when group matches inheritedGroup", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input.crossGroupReason).toBeUndefined();
  });

  it("includes crossGroupReason when group differs from inheritedGroup", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      group: "osaka-1",
      inheritedGroup: "tokyo-1",
      groupOverrideReason: "client relocated",
    });
    expect(input.crossGroupReason).toBe("client relocated");
  });

  it("omits crossGroupReason when reason is empty despite cross-group", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      group: "osaka-1",
      inheritedGroup: "tokyo-1",
      groupOverrideReason: "",
    });
    expect(input.crossGroupReason).toBeUndefined();
  });

  it("omits crossGroupReason when inheritedGroup is empty", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      group: "osaka-1",
      inheritedGroup: "",
      groupOverrideReason: "some reason",
    });
    expect(input.crossGroupReason).toBeUndefined();
  });

  it("parses amount to quotePrice", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input.quotePrice).toBe(300000);
  });

  it("omits quotePrice when amount is empty", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      amount: "",
    });
    expect(input.quotePrice).toBeUndefined();
  });

  it("parses comma-separated amount", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      amount: "300,000",
    });
    expect(input.quotePrice).toBe(300000);
  });

  it("maps effectiveTitle to caseName", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input.caseName).toBe("李娜 家族滞在認定");
  });

  it("omits caseName when effectiveTitle is empty", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      effectiveTitle: "",
    });
    expect(input.caseName).toBeUndefined();
  });

  it("maps dueDate to dueAt", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input.dueAt).toBe("2026-12-31");
  });

  it("omits dueAt when dueDate is empty", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      dueDate: "",
    });
    expect(input.dueAt).toBeUndefined();
  });

  it("maps applicationType", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input.applicationType).toBe("認定");
  });

  it("omits applicationType when empty", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      applicationType: "",
    });
    expect(input.applicationType).toBeUndefined();
  });

  it("produces output compatible with buildCreateCasePayload", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    const payload = buildCreateCasePayload(input);
    expect(payload).toHaveProperty("customerId", "cust-001");
    expect(payload).toHaveProperty("caseTypeCode", "family");
    expect(payload).toHaveProperty("ownerUserId", "suzuki");
    expect(payload).toHaveProperty("stage", "S1");
    expect(payload).toHaveProperty("quotePrice", 300000);
    expect(payload).not.toHaveProperty("crossGroupReason");
  });

  it("round-trip with cross-group includes reason in final payload", () => {
    const input = buildCreateCaseInputFromDraft({
      ...BASE_SNAPSHOT,
      group: "osaka-1",
      inheritedGroup: "tokyo-1",
      groupOverrideReason: "client relocated",
    });
    const payload = buildCreateCasePayload(input);
    expect(payload).toHaveProperty("groupId", "osaka-1");
    expect(payload).toHaveProperty("crossGroupReason", "client relocated");
  });

  it("does not include fields absent from CaseCreateInput", () => {
    const input = buildCreateCaseInputFromDraft(BASE_SNAPSHOT);
    expect(input).not.toHaveProperty("templateId");
    expect(input).not.toHaveProperty("effectiveTitle");
    expect(input).not.toHaveProperty("inheritedGroup");
    expect(input).not.toHaveProperty("groupOverrideReason");
    expect(input).not.toHaveProperty("dueDate");
    expect(input).not.toHaveProperty("amount");
  });
});

// ─── buildCreateCasePayload (p0-fe-002d-01) ─────────────────────

describe("buildCreateCasePayload", () => {
  const REQUIRED_FIELDS = {
    customerId: "cust-001",
    caseTypeCode: "visa",
    ownerUserId: "u1",
  };

  it("includes all provided fields", () => {
    const payload = buildCreateCasePayload({
      ...REQUIRED_FIELDS,
      groupId: "group-1",
      crossGroupReason: "transferred",
    });
    expect(payload).toEqual({
      customerId: "cust-001",
      caseTypeCode: "visa",
      ownerUserId: "u1",
      groupId: "group-1",
      crossGroupReason: "transferred",
    });
  });

  it("omits undefined optional fields", () => {
    const payload = buildCreateCasePayload(REQUIRED_FIELDS);
    expect(payload).toEqual(REQUIRED_FIELDS);
    expect(payload).not.toHaveProperty("groupId");
    expect(payload).not.toHaveProperty("crossGroupReason");
    expect(payload).not.toHaveProperty("dueAt");
  });

  it("preserves explicit null values", () => {
    const payload = buildCreateCasePayload({
      ...REQUIRED_FIELDS,
      groupId: null,
      dueAt: null,
      caseName: null,
    });
    expect(payload.groupId).toBeNull();
    expect(payload.dueAt).toBeNull();
    expect(payload.caseName).toBeNull();
  });

  it("normalizes empty string to null for nullable fields", () => {
    const payload = buildCreateCasePayload({
      ...REQUIRED_FIELDS,
      groupId: "",
      caseName: "",
      dueAt: "",
      crossGroupReason: "",
      assistantUserId: "",
      sourceChannel: "",
      signedAt: "",
      caseSubtype: "",
      applicationType: "",
    });
    expect(payload.groupId).toBeNull();
    expect(payload.caseName).toBeNull();
    expect(payload.dueAt).toBeNull();
    expect(payload.crossGroupReason).toBeNull();
    expect(payload.assistantUserId).toBeNull();
    expect(payload.sourceChannel).toBeNull();
    expect(payload.signedAt).toBeNull();
    expect(payload.caseSubtype).toBeNull();
    expect(payload.applicationType).toBeNull();
  });

  it("omits empty-string optional non-null fields (stage, priority, riskLevel)", () => {
    const payload = buildCreateCasePayload({
      ...REQUIRED_FIELDS,
      stage: "",
      priority: "",
      riskLevel: "",
    });
    expect(payload).not.toHaveProperty("stage");
    expect(payload).not.toHaveProperty("priority");
    expect(payload).not.toHaveProperty("riskLevel");
  });

  it("trims whitespace from string fields", () => {
    const payload = buildCreateCasePayload({
      ...REQUIRED_FIELDS,
      caseName: "  Test Case  ",
      groupId: " group-1 ",
      crossGroupReason: " reason ",
    });
    expect(payload.caseName).toBe("Test Case");
    expect(payload.groupId).toBe("group-1");
    expect(payload.crossGroupReason).toBe("reason");
  });

  it("preserves quotePrice = 0", () => {
    const payload = buildCreateCasePayload({
      ...REQUIRED_FIELDS,
      quotePrice: 0,
    });
    expect(payload.quotePrice).toBe(0);
  });

  it("preserves quotePrice = null", () => {
    const payload = buildCreateCasePayload({
      ...REQUIRED_FIELDS,
      quotePrice: null,
    });
    expect(payload.quotePrice).toBeNull();
  });

  it("includes all optional fields when set", () => {
    const payload = buildCreateCasePayload({
      ...REQUIRED_FIELDS,
      groupId: "g1",
      stage: "S1",
      dueAt: "2026-12-31",
      caseName: "Test Case",
      caseSubtype: "engineer",
      applicationType: "renewal",
      priority: "high",
      riskLevel: "low",
      assistantUserId: "u2",
      sourceChannel: "web",
      signedAt: "2026-01-01",
      quotePrice: 300000,
      crossGroupReason: "reason",
    });
    expect(Object.keys(payload)).toHaveLength(16);
    expect(payload.quotePrice).toBe(300000);
    expect(payload.sourceChannel).toBe("web");
  });

  it("does not include server-only fields absent from admin CaseCreateInput", () => {
    const payload = buildCreateCasePayload(REQUIRED_FIELDS);
    expect(payload).not.toHaveProperty("metadata");
    expect(payload).not.toHaveProperty("caseNo");
    expect(payload).not.toHaveProperty("companyId");
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("acceptedAt");
    expect(payload).not.toHaveProperty("submissionDate");
    expect(payload).not.toHaveProperty("resultDate");
    expect(payload).not.toHaveProperty("residenceExpiryDate");
    expect(payload).not.toHaveProperty("resultOutcome");
  });
});

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

// ─── buildTransitionPayload (p0-fe-002d-03) ─────────────────────

describe("buildTransitionPayload", () => {
  it("includes toStage and closeReason", () => {
    const payload = buildTransitionPayload({
      toStage: "S9",
      closeReason: "completed",
    });
    expect(payload).toEqual({ toStage: "S9", closeReason: "completed" });
  });

  it("omits closeReason when undefined", () => {
    const payload = buildTransitionPayload({ toStage: "S4" });
    expect(payload).toEqual({ toStage: "S4" });
    expect(payload).not.toHaveProperty("closeReason");
  });

  it("preserves null closeReason", () => {
    const payload = buildTransitionPayload({
      toStage: "S5",
      closeReason: null,
    });
    expect(payload.closeReason).toBeNull();
  });

  it("normalizes empty-string closeReason to null", () => {
    const payload = buildTransitionPayload({
      toStage: "S9",
      closeReason: "",
    });
    expect(payload.closeReason).toBeNull();
  });

  it("trims closeReason whitespace", () => {
    const payload = buildTransitionPayload({
      toStage: "S9",
      closeReason: "  success  ",
    });
    expect(payload.closeReason).toBe("success");
  });
});

// ─── buildBillingRiskAckPayload (p0-fe-002d-03) ─────────────────

describe("buildBillingRiskAckPayload", () => {
  it("includes all provided fields", () => {
    const payload = buildBillingRiskAckPayload({
      reasonCode: "client_confirmed",
      reasonNote: "phone call",
      evidenceUrl: "https://example.com/evidence.pdf",
    });
    expect(payload).toEqual({
      reasonCode: "client_confirmed",
      reasonNote: "phone call",
      evidenceUrl: "https://example.com/evidence.pdf",
    });
  });

  it("omits optional fields when undefined", () => {
    const payload = buildBillingRiskAckPayload({
      reasonCode: "client_confirmed",
    });
    expect(payload).toEqual({ reasonCode: "client_confirmed" });
    expect(payload).not.toHaveProperty("reasonNote");
    expect(payload).not.toHaveProperty("evidenceUrl");
  });

  it("omits empty-string optional fields", () => {
    const payload = buildBillingRiskAckPayload({
      reasonCode: "client_confirmed",
      reasonNote: "",
      evidenceUrl: "",
    });
    expect(payload).toEqual({ reasonCode: "client_confirmed" });
    expect(payload).not.toHaveProperty("reasonNote");
    expect(payload).not.toHaveProperty("evidenceUrl");
  });

  it("trims optional field whitespace", () => {
    const payload = buildBillingRiskAckPayload({
      reasonCode: "promise",
      reasonNote: "  phone call  ",
      evidenceUrl: " https://example.com ",
    });
    expect(payload.reasonNote).toBe("phone call");
    expect(payload.evidenceUrl).toBe("https://example.com");
  });
});

// ─── buildPostApprovalPayload (p0-fe-002d-03) ───────────────────

describe("buildPostApprovalPayload", () => {
  it("includes stage", () => {
    const payload = buildPostApprovalPayload({ stage: "entry_success" });
    expect(payload).toEqual({ stage: "entry_success" });
  });

  it("sends all valid post-approval stages", () => {
    for (const stage of [
      "waiting_final_payment",
      "coe_sent",
      "overseas_visa_applying",
      "entry_success",
    ]) {
      const payload = buildPostApprovalPayload({ stage });
      expect(payload).toEqual({ stage });
    }
  });
});

// ─── Serialization Rule Summary (p0-fe-002d-04) ─────────────────

describe("serialization rules", () => {
  const REQ = { customerId: "c1", caseTypeCode: "v", ownerUserId: "u1" };

  it("undefined → omitted across all builders", () => {
    const create = buildCreateCasePayload(REQ);
    expect(Object.keys(create)).toEqual([
      "customerId",
      "caseTypeCode",
      "ownerUserId",
    ]);

    const update = buildUpdateCasePayload({});
    expect(Object.keys(update)).toHaveLength(0);

    const transition = buildTransitionPayload({ toStage: "S2" });
    expect(Object.keys(transition)).toEqual(["toStage"]);

    const ack = buildBillingRiskAckPayload({ reasonCode: "ok" });
    expect(Object.keys(ack)).toEqual(["reasonCode"]);
  });

  it("null → preserved as JSON null across all builders", () => {
    expect(
      buildCreateCasePayload({ ...REQ, groupId: null }).groupId,
    ).toBeNull();
    expect(buildUpdateCasePayload({ dueAt: null }).dueAt).toBeNull();
    expect(
      buildTransitionPayload({ toStage: "S5", closeReason: null }).closeReason,
    ).toBeNull();
  });

  it("empty string → null for nullable fields, omitted for non-null optional fields", () => {
    const create = buildCreateCasePayload({
      ...REQ,
      caseName: "",
      priority: "",
    });
    expect(create.caseName).toBeNull();
    expect(create).not.toHaveProperty("priority");
    const update = buildUpdateCasePayload({ caseName: "", priority: "" });
    expect(update.caseName).toBeNull();
    expect(update).not.toHaveProperty("priority");
  });

  it("whitespace-only → same as empty string across all builders", () => {
    const create = buildCreateCasePayload({
      ...REQ,
      caseName: "   ",
      dueAt: "\t",
      groupId: "  \n ",
      priority: "   ",
      riskLevel: " ",
      stage: "  ",
    });
    expect(create.caseName).toBeNull();
    expect(create.dueAt).toBeNull();
    expect(create.groupId).toBeNull();
    expect(create).not.toHaveProperty("priority");
    expect(create).not.toHaveProperty("riskLevel");
    expect(create).not.toHaveProperty("stage");

    const update = buildUpdateCasePayload({
      caseName: "   ",
      groupId: " \t ",
      caseTypeCode: "  ",
      ownerUserId: "  ",
    });
    expect(update.caseName).toBeNull();
    expect(update.groupId).toBeNull();
    expect(update).not.toHaveProperty("caseTypeCode");
    expect(update).not.toHaveProperty("ownerUserId");

    const transition = buildTransitionPayload({
      toStage: "S9",
      closeReason: "   ",
    });
    expect(transition.closeReason).toBeNull();

    const ack = buildBillingRiskAckPayload({
      reasonCode: "ok",
      reasonNote: "  ",
      evidenceUrl: " \n ",
    });
    expect(ack).not.toHaveProperty("reasonNote");
    expect(ack).not.toHaveProperty("evidenceUrl");
  });

  it("numeric 0 → preserved (not falsy-dropped)", () => {
    expect(buildCreateCasePayload({ ...REQ, quotePrice: 0 }).quotePrice).toBe(
      0,
    );
    expect(buildUpdateCasePayload({ quotePrice: 0 }).quotePrice).toBe(0);
  });

  it("quotePrice undefined → omitted (not sent as null)", () => {
    const create = buildCreateCasePayload({ ...REQ, quotePrice: undefined });
    expect(create).not.toHaveProperty("quotePrice");

    const update = buildUpdateCasePayload({ quotePrice: undefined });
    expect(update).not.toHaveProperty("quotePrice");
  });

  it("quotePrice null → preserved as JSON null (server clears)", () => {
    expect(buildCreateCasePayload({ ...REQ, quotePrice: null }).quotePrice).toBeNull();
    expect(buildUpdateCasePayload({ quotePrice: null }).quotePrice).toBeNull();
  });
});

// ─── JSON Serialization Fidelity (p0-fe-002d-04) ────────────────
// Verify that JSON.stringify of builder output never contains `undefined`.
// This guards against the edge where omitUndefined misses a key.

describe("JSON serialization fidelity", () => {
  const REQ = { customerId: "c1", caseTypeCode: "v", ownerUserId: "u1" };

  it("buildCreateCasePayload: JSON round-trip preserves all keys and values", () => {
    const payload = buildCreateCasePayload({
      ...REQ,
      caseName: null,
      groupId: "g1",
      dueAt: "",
      priority: "",
      quotePrice: 0,
    });
    const json = JSON.parse(JSON.stringify(payload));
    expect(json).toEqual(payload);
    expect(json.caseName).toBeNull();
    expect(json.dueAt).toBeNull();
    expect(json.quotePrice).toBe(0);
    expect(json).not.toHaveProperty("priority");
  });

  it("buildUpdateCasePayload: no undefined leaks into JSON", () => {
    const payload = buildUpdateCasePayload({
      caseName: "updated",
      dueAt: null,
      priority: undefined,
      quotePrice: 0,
    });
    const jsonStr = JSON.stringify(payload);
    expect(jsonStr).not.toContain("undefined");
    const json = JSON.parse(jsonStr);
    expect(json).toEqual(payload);
  });

  it("buildTransitionPayload: JSON round-trip with null closeReason", () => {
    const payload = buildTransitionPayload({ toStage: "S9", closeReason: null });
    const json = JSON.parse(JSON.stringify(payload));
    expect(json.closeReason).toBeNull();
    expect(json.toStage).toBe("S9");
  });

  it("buildBillingRiskAckPayload: JSON round-trip with omitted optionals", () => {
    const payload = buildBillingRiskAckPayload({ reasonCode: "ok" });
    const json = JSON.parse(JSON.stringify(payload));
    expect(json).toEqual({ reasonCode: "ok" });
    expect(Object.keys(json)).toEqual(["reasonCode"]);
  });

  it("buildPostApprovalPayload: JSON round-trip", () => {
    const payload = buildPostApprovalPayload({ stage: "coe_sent" });
    const json = JSON.parse(JSON.stringify(payload));
    expect(json).toEqual({ stage: "coe_sent" });
  });

  it("all-empty optional fields produce minimal JSON with only required keys", () => {
    const payload = buildCreateCasePayload({
      ...REQ,
      groupId: "",
      stage: "",
      dueAt: "",
      caseName: "",
      caseSubtype: "",
      applicationType: "",
      priority: "",
      riskLevel: "",
      assistantUserId: "",
      sourceChannel: "",
      signedAt: "",
      crossGroupReason: "",
    });
    const json = JSON.parse(JSON.stringify(payload));
    const keys = Object.keys(json);
    expect(keys).toContain("customerId");
    expect(keys).toContain("caseTypeCode");
    expect(keys).toContain("ownerUserId");
    for (const key of keys) {
      const value = json[key];
      expect(value === undefined).toBe(false);
    }
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === "string") {
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Draft → Payload Round-Trip Edge Cases (p0-fe-002d-04) ──────
// End-to-end: draft snapshot → input → payload, focusing on boundary values.

describe("create draft → payload round-trip edge cases", () => {
  const MINIMAL_SNAPSHOT: CreateCaseDraftSnapshot = {
    customerId: "c1",
    templateId: "visa",
    applicationType: "",
    effectiveTitle: "",
    group: "",
    inheritedGroup: "",
    groupOverrideReason: "",
    owner: "u1",
    dueDate: "",
    amount: "",
  };

  it("all-empty optional fields → minimal payload with only required + stage", () => {
    const input = buildCreateCaseInputFromDraft(MINIMAL_SNAPSHOT);
    const payload = buildCreateCasePayload(input);
    expect(payload).toEqual({
      customerId: "c1",
      caseTypeCode: "visa",
      ownerUserId: "u1",
      stage: "S1",
    });
  });

  it("whitespace-only form values → draft bridge passes through, payload normalizes to null", () => {
    const input = buildCreateCaseInputFromDraft({
      ...MINIMAL_SNAPSHOT,
      effectiveTitle: "   ",
      dueDate: "  ",
      applicationType: "\t",
      amount: "  ",
    });
    expect(input.caseName).toBe("   ");
    expect(input.dueAt).toBe("  ");
    expect(input.applicationType).toBe("\t");
    expect(input.quotePrice).toBeUndefined();

    const payload = buildCreateCasePayload(input);
    expect(payload.caseName).toBeNull();
    expect(payload.dueAt).toBeNull();
    expect(payload.applicationType).toBeNull();
    expect(payload).not.toHaveProperty("quotePrice");
  });

  it("cross-group with whitespace-only reason → draft passes through, payload normalizes to null", () => {
    const input = buildCreateCaseInputFromDraft({
      ...MINIMAL_SNAPSHOT,
      group: "osaka-1",
      inheritedGroup: "tokyo-1",
      groupOverrideReason: "   ",
    });
    expect(input.crossGroupReason).toBe("   ");

    const payload = buildCreateCasePayload(input);
    expect(payload.groupId).toBe("osaka-1");
    expect(payload.crossGroupReason).toBeNull();
  });

  it("amount with only commas → quotePrice omitted", () => {
    const input = buildCreateCaseInputFromDraft({
      ...MINIMAL_SNAPSHOT,
      amount: ",,,",
    });
    const payload = buildCreateCasePayload(input);
    expect(payload).not.toHaveProperty("quotePrice");
  });

  it("full payload preserves all non-empty values through round-trip", () => {
    const input = buildCreateCaseInputFromDraft({
      customerId: "c1",
      templateId: "family",
      applicationType: " 認定 ",
      effectiveTitle: " 李娜 家族滞在 ",
      group: "tokyo-1",
      inheritedGroup: "osaka-1",
      groupOverrideReason: " client request ",
      owner: "suzuki",
      dueDate: "2026-12-31",
      amount: "300,000",
    });
    const payload = buildCreateCasePayload(input);
    expect(payload.caseName).toBe("李娜 家族滞在");
    expect(payload.applicationType).toBe("認定");
    expect(payload.crossGroupReason).toBe("client request");
    expect(payload.quotePrice).toBe(300000);
    expect(payload.dueAt).toBe("2026-12-31");
  });
});

describe("update draft → payload round-trip edge cases", () => {
  const BASE_FORM: UpdateCaseFormValues = {
    caseName: "Original",
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

  it("whitespace-only change to nullable field → null in payload", () => {
    const input = buildUpdateCaseInputFromDraft({
      original: { ...BASE_FORM },
      current: { ...BASE_FORM, caseName: "   " },
      groupTransferReason: "",
      originalAmount: "300000",
      currentAmount: "300000",
    });
    const payload = buildUpdateCasePayload(input);
    expect(payload.caseName).toBeNull();
    expect(Object.keys(payload)).toEqual(["caseName"]);
  });

  it("whitespace-only change to non-null field → omitted from payload", () => {
    const input = buildUpdateCaseInputFromDraft({
      original: { ...BASE_FORM },
      current: { ...BASE_FORM, priority: "   " },
      groupTransferReason: "",
      originalAmount: "300000",
      currentAmount: "300000",
    });
    const payload = buildUpdateCasePayload(input);
    expect(payload).toEqual({});
  });

  it("group cleared + whitespace-only transfer reason → both null in payload", () => {
    const input = buildUpdateCaseInputFromDraft({
      original: { ...BASE_FORM },
      current: { ...BASE_FORM, groupId: "" },
      groupTransferReason: "   ",
      originalAmount: "300000",
      currentAmount: "300000",
    });
    expect(input.groupId).toBeNull();
    expect(input.groupTransferReason).toBe("   ");

    const payload = buildUpdateCasePayload(input);
    expect(payload.groupId).toBeNull();
    expect(payload.groupTransferReason).toBeNull();
  });

  it("amount changed to whitespace → quotePrice null in payload", () => {
    const input = buildUpdateCaseInputFromDraft({
      original: { ...BASE_FORM },
      current: { ...BASE_FORM },
      groupTransferReason: "",
      originalAmount: "300000",
      currentAmount: "   ",
    });
    const payload = buildUpdateCasePayload(input);
    expect(payload.quotePrice).toBeNull();
  });

  it("amount changed to non-numeric → quotePrice null in payload", () => {
    const input = buildUpdateCaseInputFromDraft({
      original: { ...BASE_FORM },
      current: { ...BASE_FORM },
      groupTransferReason: "",
      originalAmount: "300000",
      currentAmount: "abc",
    });
    const payload = buildUpdateCasePayload(input);
    expect(payload.quotePrice).toBeNull();
  });

  it("no changes → empty payload through full round-trip", () => {
    const input = buildUpdateCaseInputFromDraft({
      original: { ...BASE_FORM },
      current: { ...BASE_FORM },
      groupTransferReason: "",
      originalAmount: "300000",
      currentAmount: "300000",
    });
    const payload = buildUpdateCasePayload(input);
    const json = JSON.parse(JSON.stringify(payload));
    expect(json).toEqual({});
  });

  it("all nullable fields cleared → all null in payload", () => {
    const cleared: UpdateCaseFormValues = {
      ...BASE_FORM,
      caseName: "",
      dueAt: "",
      applicationType: "",
      caseSubtype: "",
      assistantUserId: "",
      sourceChannel: "",
      signedAt: "",
      acceptedAt: "",
    };
    const input = buildUpdateCaseInputFromDraft({
      original: { ...BASE_FORM },
      current: cleared,
      groupTransferReason: "",
      originalAmount: "300000",
      currentAmount: "300000",
    });
    const payload = buildUpdateCasePayload(input);
    expect(payload.caseName).toBeNull();
    expect(payload.dueAt).toBeNull();
    expect(payload.applicationType).toBeNull();
    expect(payload.caseSubtype).toBeNull();
    expect(payload.assistantUserId).toBeNull();
    expect(payload.sourceChannel).toBeNull();
    expect(payload.signedAt).toBeNull();
    expect(payload.acceptedAt).toBeNull();
    for (const value of Object.values(payload)) {
      expect(value).toBeNull();
    }
  });
});
