import { describe, expect, it } from "vitest";

import {
  buildBillingCollectionsBulkUrl,
  buildBillingPlansUrl,
  buildBillingRiskAckUrl,
  buildBillingSummaryUrl,
  buildPaymentRecordReverseUrl,
  buildPaymentRecordVoidUrl,
  buildPaymentRecordsUrl,
} from "./BillingAdapterUrls";

const api = "/api";

describe("buildBillingPlansUrl", () => {
  it("returns base path without filters", () => {
    expect(buildBillingPlansUrl(api)).toBe("/api/billing-plans");
  });

  it("appends all filter params", () => {
    const url = buildBillingPlansUrl(api, {
      caseId: "c1",
      status: "overdue",
      groupId: "g1",
      ownerId: "o1",
      q: "test",
      page: 2,
      limit: 20,
    });
    expect(url).toContain("caseId=c1");
    expect(url).toContain("status=overdue");
    expect(url).toContain("groupId=g1");
    expect(url).toContain("ownerId=o1");
    expect(url).toContain("q=test");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=20");
  });

  it("skips empty filter values", () => {
    const url = buildBillingPlansUrl(api, { status: "", q: "" });
    expect(url).toBe("/api/billing-plans");
  });
});

describe("buildBillingSummaryUrl", () => {
  it("returns base path without filters", () => {
    expect(buildBillingSummaryUrl(api)).toBe("/api/billing-summary");
  });

  it("appends date range params", () => {
    const url = buildBillingSummaryUrl(api, {
      from: "2026-01-01",
      to: "2026-04-30",
    });
    expect(url).toContain("from=2026-01-01");
    expect(url).toContain("to=2026-04-30");
  });
});

describe("buildPaymentRecordsUrl", () => {
  it("returns base path without filters", () => {
    expect(buildPaymentRecordsUrl(api)).toBe("/api/payment-records");
  });

  it("appends recordStatus filter", () => {
    const url = buildPaymentRecordsUrl(api, { recordStatus: "reversed" });
    expect(url).toContain("recordStatus=reversed");
  });
});

describe("buildBillingCollectionsBulkUrl", () => {
  it("builds correct path", () => {
    expect(buildBillingCollectionsBulkUrl(api)).toBe(
      "/api/billing-collections/bulk",
    );
  });
});

describe("buildBillingRiskAckUrl", () => {
  it("builds correct path with encoded caseId", () => {
    expect(buildBillingRiskAckUrl(api, "case-1")).toBe(
      "/api/cases/case-1/billing-risk-ack",
    );
  });
});

describe("buildPaymentRecordVoidUrl", () => {
  it("builds correct path", () => {
    expect(buildPaymentRecordVoidUrl(api, "pr-1")).toBe(
      "/api/payment-records/pr-1/void",
    );
  });
});

describe("buildPaymentRecordReverseUrl", () => {
  it("builds correct path", () => {
    expect(buildPaymentRecordReverseUrl(api, "pr-1")).toBe(
      "/api/payment-records/pr-1/reverse",
    );
  });
});
