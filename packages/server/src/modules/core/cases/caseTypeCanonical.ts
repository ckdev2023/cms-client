import { BMV_CASE_TYPE, isBmvCaseTypeCode } from "./cases.template-bmv";

/**
 * Wizard id / legacy alias → seed canonical `case_type` 映射。
 *
 * 维护口径：每当 Admin `CaseTemplateId` 新增条目或 `seedCaseTemplates`
 * 新增 `case_type` 时，必须同步更新此表与下方的 `WIZARD_SEED_MATRIX`。
 */
const CASE_TYPE_ALIAS_MAP: Record<string, string> = {
  // family 系列 → dependent_visa（seed: seedCaseTemplates "dependent_visa"）
  family: "dependent_visa",
  family_stay: "dependent_visa",

  // BMV 总览 wizard id → canonical seed
  bmv: BMV_CASE_TYPE,

  // eng 系列：Admin 向导细分 id → seed `case_templates.case_type`（见 seedCaseTemplates「work」）
  eng_humanities_intl_cert: "work",
  eng_humanities_intl_renewal: "work",
  eng_humanities_intl: "work",
};

/**
 * 将任意 caseTypeCode 归一化为 canonical seed `case_type`。
 *
 * 解析优先级：
 *   1. 显式别名表精确匹配
 *   2. BMV 子类型（`biz_mgmt_*`）回退到 `business_manager_visa`
 *   3. 无命中时原样返回
 * @param code 前端から受け取った caseTypeCode
 * @returns canonical case_type 文字列
 */
export function canonicalizeCaseTypeCode(code: string): string {
  const alias = CASE_TYPE_ALIAS_MAP[code];
  if (alias) return alias;
  if (isBmvCaseTypeCode(code)) return BMV_CASE_TYPE;
  return code;
}

/**
 * Wizard ID ↔ Seed case_type 对照矩阵（仅用于文档与测试断言）。
 *
 * | Wizard ID (Admin)            | Canonical (Seed)          | Seed 存在 |
 * |------------------------------|---------------------------|-----------|
 * | family                       | dependent_visa            | ✓         |
 * | work                         | work                      | ✓         |
 * | permanent                    | permanent                 | ✓         |
 * | bmv                          | business_manager_visa     | ✓         |
 * | biz_mgmt_cert_4m             | business_manager_visa     | ✓ (回退)  |
 * | biz_mgmt_cert_1y             | business_manager_visa     | ✓ (回退)  |
 * | biz_mgmt_renewal             | business_manager_visa     | ✓ (回退)  |
 * | eng_humanities_intl_cert      | work（技人国 seed）       | ✓         |
 * | eng_humanities_intl_renewal   | work                      | ✓         |
 * | intra_company_transfer       | intra_company_transfer    | ✗         |
 * | company_setup                | company_setup             | ✗         |
 */
export const WIZARD_SEED_MATRIX: readonly {
  wizardId: string;
  canonical: string;
  seedExists: boolean;
}[] = [
  { wizardId: "family", canonical: "dependent_visa", seedExists: true },
  { wizardId: "work", canonical: "work", seedExists: true },
  { wizardId: "permanent", canonical: "permanent", seedExists: true },
  { wizardId: "bmv", canonical: "business_manager_visa", seedExists: true },
  {
    wizardId: "biz_mgmt_cert_4m",
    canonical: "business_manager_visa",
    seedExists: true,
  },
  {
    wizardId: "biz_mgmt_cert_1y",
    canonical: "business_manager_visa",
    seedExists: true,
  },
  {
    wizardId: "biz_mgmt_renewal",
    canonical: "business_manager_visa",
    seedExists: true,
  },
  {
    wizardId: "eng_humanities_intl_cert",
    canonical: "work",
    seedExists: true,
  },
  {
    wizardId: "eng_humanities_intl_renewal",
    canonical: "work",
    seedExists: true,
  },
  {
    wizardId: "intra_company_transfer",
    canonical: "intra_company_transfer",
    seedExists: false,
  },
  {
    wizardId: "company_setup",
    canonical: "company_setup",
    seedExists: false,
  },
] as const;

/**
 * 运营可选的 canonical 案件类型（去重、排序后）。
 *
 * 单一事实来源：与 WIZARD_SEED_MATRIX 的 canonical 列对齐。
 * 新增 case_type 时，同时更新 WIZARD_SEED_MATRIX 即可自动出现在此列表中。
 */
export const CANONICAL_CASE_TYPE_OPTIONS: readonly {
  code: string;
  sort: number;
}[] = (() => {
  const seen = new Set<string>();
  const result: { code: string; sort: number }[] = [];
  for (const entry of WIZARD_SEED_MATRIX) {
    if (!seen.has(entry.canonical)) {
      seen.add(entry.canonical);
      result.push({ code: entry.canonical, sort: result.length });
    }
  }
  return result;
})();
