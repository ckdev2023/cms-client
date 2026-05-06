import { test, describe } from "node:test";
import assert from "node:assert/strict";

import type { TenantDbTx } from "../tenancy/tenantDb";
import {
  formatLeadYearMonth,
  formatLeadNumber,
  generateNextLeadNumber,
  isLeadNumberConflict,
} from "./leads.numbering";

void describe("formatLeadYearMonth", () => {
  void test("pads single-digit month", () => {
    assert.equal(formatLeadYearMonth(new Date(2026, 0, 15)), "202601");
  });

  void test("does not pad double-digit month", () => {
    assert.equal(formatLeadYearMonth(new Date(2026, 11, 1)), "202612");
  });
});

void describe("formatLeadNumber", () => {
  void test("formats with zero-padded sequence", () => {
    assert.equal(formatLeadNumber(new Date(2026, 4, 6), 1), "LEAD-202605-0001");
  });

  void test("handles large sequence numbers", () => {
    assert.equal(
      formatLeadNumber(new Date(2026, 4, 6), 9999),
      "LEAD-202605-9999",
    );
  });

  void test("exceeds 4-digit padding gracefully", () => {
    assert.equal(
      formatLeadNumber(new Date(2026, 4, 6), 10001),
      "LEAD-202605-10001",
    );
  });
});

void describe("generateNextLeadNumber", () => {
  const ORG = "00000000-0000-4000-8000-000000000001";

  function makeTx(maxSeq: string): TenantDbTx {
    return {
      query: () =>
        Promise.resolve({ rows: [{ max_seq: maxSeq }], rowCount: 1 }),
    } as unknown as TenantDbTx;
  }

  void test("returns seq 1 when no existing leads", async () => {
    const result = await generateNextLeadNumber(makeTx("0"), ORG);
    assert.match(result, /^LEAD-\d{6}-0001$/);
  });

  void test("increments from existing max", async () => {
    const result = await generateNextLeadNumber(makeTx("42"), ORG);
    assert.match(result, /^LEAD-\d{6}-0043$/);
  });

  void test("passes orgId and prefix pattern to query", async () => {
    let capturedParams: unknown[] = [];
    const tx: TenantDbTx = {
      query: (_sql: string, params?: unknown[]) => {
        capturedParams = params ?? [];
        return Promise.resolve({ rows: [{ max_seq: "0" }], rowCount: 1 });
      },
    } as unknown as TenantDbTx;

    await generateNextLeadNumber(tx, ORG);
    assert.equal(capturedParams[0], ORG);
    assert.match(capturedParams[1] as string, /^LEAD-\d{6}-%$/);
  });
});

void describe("isLeadNumberConflict", () => {
  void test("returns true for uq_leads_lead_no violation", () => {
    assert.equal(
      isLeadNumberConflict({ code: "23505", constraint: "uq_leads_lead_no" }),
      true,
    );
  });

  void test("returns false for different constraint", () => {
    assert.equal(
      isLeadNumberConflict({ code: "23505", constraint: "uq_other" }),
      false,
    );
  });

  void test("returns false for different error code", () => {
    assert.equal(
      isLeadNumberConflict({ code: "42000", constraint: "uq_leads_lead_no" }),
      false,
    );
  });

  void test("returns false for null/undefined", () => {
    assert.equal(isLeadNumberConflict(null), false);
    assert.equal(isLeadNumberConflict(undefined), false);
  });

  void test("returns false for non-object", () => {
    assert.equal(isLeadNumberConflict("error string"), false);
  });
});
