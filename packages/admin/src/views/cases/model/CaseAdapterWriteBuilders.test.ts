// ── Test Ownership ──────────────────────────────────────────────
// Owner: write request-body builders — utility helpers + create family
//   (normalizeNullableString, parseQuotePrice,
//   buildCreateCaseInputFromDraft, buildCreateCasePayload).
// Does NOT test: update / transition / billing-risk-ack / post-approval
//   builders (split into sibling test files), serialization rule
//   aggregates (→ serialization.test), response mapping, URL
//   construction, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  buildCreateCaseInputFromDraft,
  buildCreateCasePayload,
  normalizeNullableString,
  parseQuotePrice,
  type CreateCaseDraftSnapshot,
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
