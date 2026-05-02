/**
 * BUG-180 [P2][FE]：Customer Detail Cases tab status 列对 S9 案件标 `Active`，
 * 与全局 Cases List 的 stage 列把 S9 显示为 `Archived` 不一致。
 *
 * 修复契约（CustomerAdapterCaseMapper.readCustomerCaseStatus）：
 * - archivedAt 非空 → "archived"
 * - stage / stageId / stageCode / workflowStage 命中 "S9" → "archived"
 * - status / caseStatus = "archived" → "archived"
 * - 其它 → "active"
 *
 * 注意：localized stage label（如 zh-CN "归档" / ja-JP "アーカイブ"）不做归档判定，
 * 只接受机器可读的 `S9` 字面量。
 */
import { describe, expect, it } from "vitest";
import { adaptCustomerCaseListResult } from "./CustomerAdapter";

describe("[BUG-180] CustomerAdapter readCustomerCaseStatus", () => {
  it("treats stage=S9 as archived even when archivedAt is missing", () => {
    const result = adaptCustomerCaseListResult({
      total: 3,
      items: [
        {
          id: "case-s9-success",
          caseName: "BUG-117 CLOSED_SUCCESS",
          caseTypeCode: "visa-change",
          stage: "S9",
          ownerUserId: "owner-1",
          openedAt: "2026-04-01",
          updatedAt: "2026-04-15",
        },
        {
          id: "case-s9-stagecode-only",
          caseName: "R6 supplement probe",
          caseTypeCode: "visa-renew",
          stageCode: "S9",
          ownerUserId: "owner-1",
          openedAt: "2026-03-01",
          updatedAt: "2026-04-15",
        },
        {
          id: "case-s2-active",
          caseName: "in-flight",
          caseTypeCode: "visa-change",
          stage: "S2",
          ownerUserId: "owner-1",
          openedAt: "2026-04-01",
          updatedAt: "2026-04-15",
        },
      ],
    });

    expect(result?.find((c) => c.id === "case-s9-success")?.status).toBe(
      "archived",
    );
    expect(result?.find((c) => c.id === "case-s9-stagecode-only")?.status).toBe(
      "archived",
    );
    expect(result?.find((c) => c.id === "case-s2-active")?.status).toBe(
      "active",
    );
  });

  it("treats stageId=S9 as archived (alternate field name)", () => {
    const result = adaptCustomerCaseListResult({
      total: 1,
      items: [
        {
          id: "case-stageId-s9",
          caseName: "stageId variant",
          caseTypeCode: "visa-change",
          stageId: "S9",
          ownerUserId: "owner-1",
          openedAt: "2026-04-01",
          updatedAt: "2026-04-15",
        },
      ],
    });

    expect(result?.[0]?.status).toBe("archived");
  });

  it("does NOT treat localized 'archived' label as S9 (only literal 'S9' wins)", () => {
    const result = adaptCustomerCaseListResult({
      total: 1,
      items: [
        {
          id: "case-localized-label",
          caseName: "should remain active",
          caseTypeCode: "visa-change",
          stage: "S2",
          statusLabel: "归档",
          ownerUserId: "owner-1",
          openedAt: "2026-04-01",
          updatedAt: "2026-04-15",
        },
      ],
    });

    expect(result?.[0]?.status).toBe("active");
  });

  it("preserves archivedAt-driven archived status (existing behavior, no regression)", () => {
    const result = adaptCustomerCaseListResult({
      total: 1,
      items: [
        {
          id: "case-archived-at",
          caseName: "explicit archive timestamp",
          caseTypeCode: "visa-change",
          stage: "S2",
          archivedAt: "2026-04-12",
          ownerUserId: "owner-1",
        },
      ],
    });

    expect(result?.[0]?.status).toBe("archived");
  });
});
