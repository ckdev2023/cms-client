// ── Test Ownership ──────────────────────────────────────────────
// Owner: 案件详情面包屑「业务编号 CASE-XXXXXX-XXXX」端到端契约（BUG-128 / BUG-130）。
// Covers: 走完整 `adaptCaseDetailAggregate` → `formatCaseIdentity` 链路，
//   断言面包屑文本以 `CASE-` 开头、不带 `#` 前缀，且不再回退到 UUID。
// Does NOT test:
//   - `formatCaseIdentity` 单元语义（由 CaseDetailView.breadcrumb.test.ts 覆盖）；
//   - adapter `detail.caseNo` 字段语义（由 CaseAdapterDetailAggregate.case-no.focused.test.ts 覆盖）。
// Rationale: BUG-128 修复曾「半 land」——helper 单测 + 消费方都通过，但 adapter 层
//   不写 caseNo，UI 仍是 UUID。本文件用真实聚合 JSON 走 adapter 主链，断言
//   生产数据流真的能产出业务编号，避免再次回归。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { adaptCaseDetailAggregate } from "./model/CaseAdapterDetailAggregate";
import { formatCaseIdentity } from "./caseIdentity";

const UUID = "df9d1e84-fd62-4687-9297-decd8848412f";
const CASE_NO = "CASE-202604-0011";

function buildRawAggregate(caseOverrides: Record<string, unknown> = {}) {
  return {
    case: {
      id: UUID,
      orgId: "org-1",
      customerId: "cust-001",
      caseTypeCode: "visa",
      stage: "S3",
      groupId: "group-1",
      ownerUserId: "user-1",
      dueAt: "2026-06-01",
      caseName: "R6 supplement probe",
      caseNo: CASE_NO,
      priority: "normal",
      riskLevel: "low",
      applicationType: "認定",
      acceptedAt: "2026-01-15T00:00:00.000Z",
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-04-20T00:00:00.000Z",
      ...caseOverrides,
    },
    deepLink: {
      customerId: "cust-001",
      customerName: "张伟",
      groupId: "group-1",
      groupName: "Tokyo-1",
      ownerUserId: "user-1",
      ownerDisplayName: "Local Admin",
      assistantUserId: null,
      assistantDisplayName: null,
    },
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
  };
}

describe("CaseDetailView breadcrumb — adapter → formatCaseIdentity 端到端 (BUG-128 / BUG-130)", () => {
  it("生产数据流：raw aggregate → adapter → 面包屑文本以 'CASE-' 开头", () => {
    const adapted = adaptCaseDetailAggregate(buildRawAggregate());
    expect(adapted).not.toBeNull();
    const detail = adapted!.detail;

    expect(detail.caseNo).toBe(CASE_NO);

    const label = formatCaseIdentity(detail.caseNo, detail.id);
    expect(label).toBe(CASE_NO);
    expect(label.startsWith("CASE-")).toBe(true);
    expect(label).not.toBe(UUID);
  });

  it("面包屑展示与列表行严格对齐：不带 '#' 前缀", () => {
    const adapted = adaptCaseDetailAggregate(buildRawAggregate())!;
    const label = formatCaseIdentity(adapted.detail.caseNo, adapted.detail.id);
    expect(label.startsWith("#")).toBe(false);
  });

  it("server 漏下发 caseNo 时，面包屑回退到 UUID（兜底而非崩溃）", () => {
    const raw = buildRawAggregate();
    delete (raw.case as Record<string, unknown>).caseNo;
    const adapted = adaptCaseDetailAggregate(raw)!;
    expect(adapted.detail.caseNo).toBeUndefined();

    const label = formatCaseIdentity(adapted.detail.caseNo, adapted.detail.id);
    expect(label).toBe(UUID);
  });

  it("server 下发空白 caseNo 时，detail.caseNo === undefined 且面包屑走 UUID 兜底", () => {
    const adapted = adaptCaseDetailAggregate(
      buildRawAggregate({ caseNo: "   " }),
    )!;
    expect(adapted.detail.caseNo).toBeUndefined();

    const label = formatCaseIdentity(adapted.detail.caseNo, adapted.detail.id);
    expect(label).toBe(UUID);
  });

  it("detail.id 仍为 UUID（hover/复制等场景的原始主键不被覆盖）", () => {
    const adapted = adaptCaseDetailAggregate(buildRawAggregate())!;
    expect(adapted.detail.id).toBe(UUID);
    expect(adapted.detail.caseNo).not.toBe(adapted.detail.id);
  });
});
