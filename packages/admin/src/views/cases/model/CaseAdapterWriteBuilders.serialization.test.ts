// ── Test Ownership ──────────────────────────────────────────────
// Owner: write request-body builders — serialization rule summary
//   + JSON fidelity + draft → payload round-trip edge cases
//   (p0-fe-002d-04).
// Does NOT test: per-builder field-by-field contracts (split into
//   sibling test files), response mapping, URL construction, or
//   repository orchestration.
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
  type CreateCaseDraftSnapshot,
  type UpdateCaseFormValues,
} from "./CaseAdapterWriteBuilders";

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
    expect(
      buildCreateCasePayload({ ...REQ, quotePrice: null }).quotePrice,
    ).toBeNull();
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
    const payload = buildTransitionPayload({
      toStage: "S9",
      closeReason: null,
    });
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
    for (const value of Object.values(json)) {
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
    jurisdictionAuthority: "",
    submissionDate: "",
    resultDate: "",
    residenceExpiryDate: "",
    archivedAt: "",
    resultOutcome: "",
    visaPlan: "",
    overseasVisaStartAt: "",
    entryConfirmedAt: "",
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
