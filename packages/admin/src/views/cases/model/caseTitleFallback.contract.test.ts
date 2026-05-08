// Owner: R35-A — title fallback contract tests
// Locks the rule: detail heading and list row produce the same display name
// for the same case data, regardless of which caseName value the server returns.

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import { CASE_DETAIL_HEADER_FIELDS } from "./CaseAdapterDetailContracts";
import {
  buildFallbackName,
  isFallbackTitle,
} from "../../../shared/model/caseTitleFallback";

const BASE_CASE = {
  id: "case-tf01",
  orgId: "org-1",
  customerId: "cust-tf01",
  caseTypeCode: "biz_mgmt_cert_4m",
  stage: "S3",
  groupId: "group-tf01",
  ownerUserId: "user-tf01",
  dueAt: "2026-09-15",
  caseNo: "CASE-TF01",
  priority: "normal",
  riskLevel: "low",
  applicationType: "認定",
  acceptedAt: "2026-03-10T00:00:00.000Z",
  businessPhase: "RECEIVING",
};

const DEEP_LINK = {
  customerId: "cust-tf01",
  customerName: "張伟",
  groupId: "group-tf01",
  groupName: "Tokyo-A",
  ownerUserId: "user-tf01",
  ownerDisplayName: "担当太郎",
  assistantUserId: null,
  assistantDisplayName: null,
};

const COUNTS = {
  documentItemsTotal: 10,
  documentItemsDone: 6,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 2,
  tasks: 3,
  tasksPending: 1,
  communicationLogs: 5,
  submissionPackages: 0,
  generatedDocuments: 0,
  validationRuns: 0,
  reviewRecords: 0,
  billingRecords: 0,
  paymentRecords: 0,
};

const BILLING = {
  quotePrice: 300000,
  unpaidAmount: 0,
  totalReceived: 300000,
  depositPaid: true,
  finalPaymentPaid: true,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

function buildAggregate(
  caseOverrides: Record<string, unknown> = {},
  deepLinkOverrides: Record<string, unknown> = {},
) {
  return {
    case: { ...BASE_CASE, ...caseOverrides },
    deepLink: { ...DEEP_LINK, ...deepLinkOverrides },
    counts: COUNTS,
    billing: BILLING,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
  };
}

describe("CASE_DETAIL_HEADER_FIELDS includes titleFallbackParts", () => {
  it("titleFallbackParts is a frozen header field", () => {
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("titleFallbackParts");
  });
});

describe("adapter outputs titleFallbackParts", () => {
  it("exposes applicant, caseTypeCode, caseNo, id", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.titleFallbackParts).toEqual({
      applicant: "張伟",
      caseTypeCode: "biz_mgmt_cert_4m",
      caseNo: "CASE-TF01",
      id: "case-tf01",
    });
  });

  it("missing deepLink.customerName → applicant is empty string", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({}, { customerName: "" }),
    )!;
    expect(result.detail.titleFallbackParts.applicant).toBe("");
  });

  it("missing caseNo → caseNo is undefined", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ caseNo: "" }))!;
    expect(result.detail.titleFallbackParts.caseNo).toBeUndefined();
  });
});

describe("list row and detail heading produce identical display name", () => {
  const typeLabel = "経営管理4ヶ月";

  it("caseName is meaningful → both show caseName directly", () => {
    const caseName = "経営ビザ新規申請";
    const result = adaptCaseDetailAggregate(buildAggregate({ caseName }))!;
    expect(result.detail.title).toBe(caseName);
    expect(isFallbackTitle(caseName, "CASE-TF01", "case-tf01")).toBe(false);
  });

  it("caseName equals caseNo → both fall back to applicant · typeLabel", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ caseName: "CASE-TF01" }),
    )!;
    const fp = result.detail.titleFallbackParts;
    expect(isFallbackTitle(result.detail.title, fp.caseNo, fp.id)).toBe(true);
    const detailDisplay = buildFallbackName(
      fp.applicant,
      typeLabel,
      fp.caseNo,
      fp.id,
    );
    const listDisplay = buildFallbackName(
      "張伟",
      typeLabel,
      "CASE-TF01",
      "case-tf01",
    );
    expect(detailDisplay).toBe(listDisplay);
  });

  it("caseName equals id → both fall back to applicant · typeLabel", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ caseName: "case-tf01" }),
    )!;
    const fp = result.detail.titleFallbackParts;
    expect(isFallbackTitle(result.detail.title, fp.caseNo, fp.id)).toBe(true);
    const detailDisplay = buildFallbackName(
      fp.applicant,
      typeLabel,
      fp.caseNo,
      fp.id,
    );
    const listDisplay = buildFallbackName(
      "張伟",
      typeLabel,
      "CASE-TF01",
      "case-tf01",
    );
    expect(detailDisplay).toBe(listDisplay);
  });

  it("caseName is empty → both fall back", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ caseName: "" }))!;
    const fp = result.detail.titleFallbackParts;
    expect(isFallbackTitle(result.detail.title, fp.caseNo, fp.id)).toBe(true);
    const detailDisplay = buildFallbackName(
      fp.applicant,
      typeLabel,
      fp.caseNo,
      fp.id,
    );
    expect(detailDisplay).toBe("張伟 · 経営管理4ヶ月");
  });

  it("no applicant, no typeLabel → fallback to caseNo", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ caseName: "" }, { customerName: "" }),
    )!;
    const fp = result.detail.titleFallbackParts;
    expect(isFallbackTitle(result.detail.title, fp.caseNo, fp.id)).toBe(true);
    const display = buildFallbackName(fp.applicant, "", fp.caseNo, fp.id);
    expect(display).toBe("CASE-TF01");
  });

  it("no applicant, no typeLabel, no caseNo → fallback to id", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ caseName: "", caseNo: "" }, { customerName: "" }),
    )!;
    const fp = result.detail.titleFallbackParts;
    const display = buildFallbackName(fp.applicant, "", fp.caseNo, fp.id);
    expect(display).toBe("case-tf01");
  });
});
