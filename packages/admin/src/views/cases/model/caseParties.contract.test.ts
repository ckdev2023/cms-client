// ── Contract Test: admin ↔ server partyType alignment ──────────
// Ensures every partyType produced by admin builders is accepted
// by the server VALID_PARTY_TYPES set (imported via relative path
// since admin cannot depend on the server package directly).
// If either side changes its set, this test breaks → forcing a
// coordinated update.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { ADMIN_VALID_PARTY_TYPES } from "./CaseAdapterTypes";
import type { CasePartyCreateInput } from "./CaseAdapterTypes";
import {
  buildPrimaryCasePartyInput,
  buildRelatedCasePartyInput,
} from "./CaseAdapterWriteBuilders.case-party";

// Server source-of-truth — read directly from server package.
// vitest runs from workspace root so relative paths work for test-only imports.
import { VALID_PARTY_TYPES as SERVER_VALID_PARTY_TYPES } from "../../../../../server/src/modules/core/case-parties/caseParties.types";

// ── Helpers ────────────────────────────────────────────────────

const ALL_ADMIN_ROLES = ["主申请人", "配偶", "子女", "扶养者", "保证人"];

function collectBuilderPartyTypes(): string[] {
  const types: string[] = [];
  const primary = buildPrimaryCasePartyInput("case-1", "cust-1");
  types.push(primary.partyType);

  for (const role of ALL_ADMIN_ROLES) {
    const input: CasePartyCreateInput = buildRelatedCasePartyInput("case-1", {
      customerId: "cust-2",
      role,
    });
    types.push(input.partyType);
  }
  return [...new Set(types)];
}

// ── Tests ──────────────────────────────────────────────────────

describe("admin ↔ server partyType contract", () => {
  it("ADMIN_VALID_PARTY_TYPES matches SERVER_VALID_PARTY_TYPES exactly", () => {
    const adminSet = [...ADMIN_VALID_PARTY_TYPES].sort();
    const serverSet = [...SERVER_VALID_PARTY_TYPES].sort();
    expect(adminSet).toEqual(serverSet);
  });

  it("every partyType from buildPrimaryCasePartyInput is in server set", () => {
    const input = buildPrimaryCasePartyInput("case-1", "cust-1");
    expect(SERVER_VALID_PARTY_TYPES.has(input.partyType)).toBe(true);
  });

  it("every partyType from buildRelatedCasePartyInput is in server set", () => {
    const produced = collectBuilderPartyTypes();
    for (const pt of produced) {
      expect(SERVER_VALID_PARTY_TYPES.has(pt)).toBe(true);
    }
  });

  it("all builder-produced partyTypes are subset of ADMIN_VALID_PARTY_TYPES", () => {
    const produced = collectBuilderPartyTypes();
    for (const pt of produced) {
      expect(ADMIN_VALID_PARTY_TYPES.has(pt as never)).toBe(true);
    }
  });

  it("all 8 VALID_PARTY_TYPES accepted (happy-path coverage)", () => {
    const all8: string[] = [
      "applicant",
      "spouse",
      "child",
      "family",
      "guarantor",
      "representative",
      "supporter",
      "other",
    ];
    for (const pt of all8) {
      expect(SERVER_VALID_PARTY_TYPES.has(pt)).toBe(true);
      expect(ADMIN_VALID_PARTY_TYPES.has(pt as never)).toBe(true);
    }
  });

  it("unknown role falls back to applicant (still in server set)", () => {
    const input = buildRelatedCasePartyInput("case-1", {
      customerId: "cust-x",
      role: "未知の役割",
    });
    expect(input.partyType).toBe("applicant");
    expect(SERVER_VALID_PARTY_TYPES.has(input.partyType)).toBe(true);
  });
});
