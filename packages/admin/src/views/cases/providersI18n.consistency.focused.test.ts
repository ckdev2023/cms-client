// ── Test Ownership ──────────────────────────────────────────────
// Owner: i18n consistency between cases.detail.providers.* and
//        documents.providers.* (V12 走查发现的卡片 vs 列表分组口径分裂)。
// Locks down:
//   - 同一 provider role 在「按提供方完成率」卡片（cases.detail.providers.*）
//     与资料清单分组标题（documents.providers.*）之间，三语字面值必须一致。
//   - 角色映射：applicant ↔ mainApplicant, supporter ↔ dependentGuarantor,
//             office ↔ officeInternal, employer ↔ employerOrg.
// Does NOT test: 组件渲染、provider 排序、分组项数等其他逻辑。
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import casesEnUS from "../../i18n/messages/cases/en-US";
import casesZhCN from "../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../i18n/messages/cases/ja-JP";
import documentsEnUS from "../../i18n/messages/documents/en-US";
import documentsZhCN from "../../i18n/messages/documents/zh-CN";
import documentsJaJP from "../../i18n/messages/documents/ja-JP";

const LOCALES = [
  { name: "en-US", cases: casesEnUS, docs: documentsEnUS },
  { name: "zh-CN", cases: casesZhCN, docs: documentsZhCN },
  { name: "ja-JP", cases: casesJaJP, docs: documentsJaJP },
] as const;

const ROLE_PAIRS: ReadonlyArray<{
  caseRole: "applicant" | "supporter" | "office" | "employer";
  docRole:
    | "mainApplicant"
    | "dependentGuarantor"
    | "officeInternal"
    | "employerOrg";
}> = [
  { caseRole: "applicant", docRole: "mainApplicant" },
  { caseRole: "supporter", docRole: "dependentGuarantor" },
  { caseRole: "office", docRole: "officeInternal" },
  { caseRole: "employer", docRole: "employerOrg" },
];

describe("providers i18n consistency (cases ↔ documents)", () => {
  for (const locale of LOCALES) {
    describe(locale.name, () => {
      for (const { caseRole, docRole } of ROLE_PAIRS) {
        it(`cases.detail.providers.${caseRole} === documents.providers.${docRole}`, () => {
          const caseLabel = locale.cases.detail.providers[caseRole];
          const docLabel = locale.docs.providers[docRole];
          expect(typeof caseLabel).toBe("string");
          expect(typeof docLabel).toBe("string");
          expect(caseLabel).toBe(docLabel);
        });
      }
    });
  }
});
