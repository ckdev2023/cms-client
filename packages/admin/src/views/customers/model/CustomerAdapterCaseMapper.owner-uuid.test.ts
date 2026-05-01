// ── Test Ownership ──────────────────────────────────────────────
// Owner: customer cases tab P1 BUG — Owner column was dumping raw
//        UUID. CustomerCasesTab now reuses Local Admin / catalog
//        resolution like the global Cases table, which depends on
//        the adapter forwarding ownerDisplayName + ownerId.
// 见 docs/gyoseishoshi_saas_md/_output/23-admin-UI视觉规范走查与优化报告-第三轮.md。
//
// Covers:
//   - Backend ownerDisplayName ("Local Admin") wins over UUID owner field.
//   - ownerId 正确从 ownerUserId / nested owner.id 抽取。
//   - 缺失 ownerDisplayName 时仅得到 ownerId，便于 UI 走 catalog/Local Admin 兜底。

import { describe, expect, it } from "vitest";
import { adaptCustomerCaseListResult } from "./CustomerAdapterCaseMapper";

const UUID = "11111111-2222-3333-4444-555555555555";

describe("adaptCustomerCaseListResult — owner display contract (P1 BUG)", () => {
  it("propagates ownerDisplayName + ownerId so UI can render Local Admin", () => {
    const result = adaptCustomerCaseListResult({
      total: 1,
      items: [
        {
          id: "case-la-001",
          caseName: "経営管理ビザ",
          caseTypeCode: "business-management",
          stage: "S4",
          ownerUserId: UUID,
          ownerDisplayName: "Local Admin",
          createdAt: "2026-04-01",
          updatedAt: "2026-04-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    const c = result![0];
    expect(c.ownerId).toBe(UUID);
    expect(c.ownerDisplayName).toBe("Local Admin");
    expect(c.owner).toBe("Local Admin");
  });

  it("falls back to ownerId when only ownerUserId is provided", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "case-uuid-only",
          caseName: "Visa",
          caseTypeCode: "work",
          stage: "S2",
          ownerUserId: UUID,
          createdAt: "2026-04-01",
          updatedAt: "2026-04-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    const c = result![0];
    expect(c.ownerId).toBe(UUID);
    expect(c.ownerDisplayName).toBeUndefined();
    expect(c.owner).toBe(UUID);
  });

  it("reads nested owner.{id,name} from summary DTO", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "case-nested",
          caseName: "Visa",
          caseTypeCode: "work",
          stage: "S2",
          owner: { id: UUID, name: "担当太郎" },
          createdAt: "2026-04-01",
          updatedAt: "2026-04-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    const c = result![0];
    expect(c.ownerId).toBe(UUID);
    expect(c.ownerDisplayName).toBe("担当太郎");
    expect(c.owner).toBe("担当太郎");
  });
});
