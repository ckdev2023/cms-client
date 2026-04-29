// ── Test Ownership ──────────────────────────────────────────────
// Owner: detail header `caseNo` 字段映射（BUG-106 修复）。
// Covers: 适配器从 `case.caseNo` 读取业务编号、空值/缺失/空白时回退为 undefined。
// Does NOT test: 列表行 caseNo 展示、breadcrumb 渲染（分别由
//   CaseTableRow.test.ts、CaseDetailView 相关测试覆盖）。
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

const MOCK_CASE_ROW = {
  id: "989f32d4-24d2-47ba-89f0-387a8e6bb94e",
  orgId: "org-1",
  customerId: "cust-001",
  caseTypeCode: "visa",
  stage: "S3",
  groupId: "group-1",
  ownerUserId: "user-1",
  dueAt: "2026-06-01",
  caseName: "技人国更新",
  caseNo: "CASE-202604-0003",
  priority: "normal",
  riskLevel: "low",
  applicationType: "認定",
  acceptedAt: "2026-01-15T00:00:00.000Z",
  createdAt: "2026-01-10T00:00:00.000Z",
  updatedAt: "2026-04-20T00:00:00.000Z",
};

const MOCK_DEEP_LINK = {
  customerId: "cust-001",
  customerName: "张伟",
  groupId: "group-1",
  groupName: "Tokyo-1",
  ownerUserId: "user-1",
  ownerDisplayName: "担当太郎",
  assistantUserId: null,
  assistantDisplayName: null,
};

function buildAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: MOCK_CASE_ROW,
    deepLink: MOCK_DEEP_LINK,
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    ...overrides,
  };
}

describe.skip("BUG-106: detail header exposes caseNo for breadcrumb parity", () => {
  it("maps caseNo from case slice when present", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.caseNo).toBe("CASE-202604-0003");
  });

  it("trims surrounding whitespace from caseNo", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: { ...MOCK_CASE_ROW, caseNo: "  CASE-202604-0003  " },
      }),
    )!;
    expect(result.detail.caseNo).toBe("CASE-202604-0003");
  });

  it("falls back to undefined when caseNo is empty string", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ case: { ...MOCK_CASE_ROW, caseNo: "" } }),
    )!;
    expect(result.detail.caseNo).toBeUndefined();
  });

  it("falls back to undefined when caseNo is whitespace-only", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ case: { ...MOCK_CASE_ROW, caseNo: "   " } }),
    )!;
    expect(result.detail.caseNo).toBeUndefined();
  });

  it("falls back to undefined when caseNo property is missing", () => {
    const caseWithoutCaseNo: Record<string, unknown> = { ...MOCK_CASE_ROW };
    delete caseWithoutCaseNo.caseNo;
    const result = adaptCaseDetailAggregate(
      buildAggregate({ case: caseWithoutCaseNo }),
    )!;
    expect(result.detail.caseNo).toBeUndefined();
  });

  it("does not mutate detail.id which still exposes the UUID for hover", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.id).toBe("989f32d4-24d2-47ba-89f0-387a8e6bb94e");
    expect(result.detail.caseNo).not.toBe(result.detail.id);
  });
});
