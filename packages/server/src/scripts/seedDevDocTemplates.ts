import type { PoolClient } from "pg";

const DOC_TPL_FAMILY_STAY_1 = "00000000-0000-4000-a000-000000000600";
const DOC_TPL_FAMILY_STAY_2 = "00000000-0000-4000-a000-000000000601";
const DOC_TPL_FAMILY_STAY_3 = "00000000-0000-4000-a000-000000000602";
const DOC_TPL_DEPENDENT_VISA_2 = "00000000-0000-4000-a000-000000000603";
const DOC_TPL_ENGINEER_1 = "00000000-0000-4000-a000-000000000610";
const DOC_TPL_ENGINEER_2 = "00000000-0000-4000-a000-000000000611";
const DOC_TPL_ENGINEER_3 = "00000000-0000-4000-a000-000000000612";

const DOC_TPL_BMV_PLAN_1 = "00000000-0000-4000-a000-000000000620";
const DOC_TPL_BMV_PLAN_2 = "00000000-0000-4000-a000-000000000621";
const DOC_TPL_BMV_PLAN_3 = "00000000-0000-4000-a000-000000000622";
const DOC_TPL_BMV_OVERVIEW_1 = "00000000-0000-4000-a000-000000000623";
const DOC_TPL_BMV_OVERVIEW_2 = "00000000-0000-4000-a000-000000000624";
const DOC_TPL_BMV_OVERVIEW_3 = "00000000-0000-4000-a000-000000000625";

const DOC_TPL_WORK_1 = "00000000-0000-4000-a000-000000000630";
const DOC_TPL_WORK_2 = "00000000-0000-4000-a000-000000000631";
const DOC_TPL_WORK_3 = "00000000-0000-4000-a000-000000000632";
const DOC_TPL_BMV_CANONICAL_1 = "00000000-0000-4000-a000-000000000640";
const DOC_TPL_BMV_CANONICAL_2 = "00000000-0000-4000-a000-000000000641";
const DOC_TPL_COMPANY_SETUP = "00000000-0000-4000-a000-000000000650";
const DOC_TPL_HIGHLY_SKILLED = "00000000-0000-4000-a000-000000000660";
const DOC_TPL_PERMANENT = "00000000-0000-4000-a000-000000000670";
const DOC_TPL_PERMANENT_2 = "00000000-0000-4000-a000-000000000671";
const DOC_TPL_OTHER = "00000000-0000-4000-a000-000000000680";

type DocTemplateSeed = {
  id: string;
  caseType: string;
  templateName: string;
  docType: string;
};

export const DOC_TEMPLATE_SEEDS: DocTemplateSeed[] = [
  // ── Alias entries ──────────────────────────────────────────────
  // TODO(C-template-seed): 以下 alias 条目与 case_templates 无对应蓝图，
  //   待产品 confirm 后另起 PR 清理。保留以免影响现有 dev 数据。
  // 家族滞在 — alias caseTypeCode（canonical = dependent_visa）
  {
    id: DOC_TPL_FAMILY_STAY_1,
    caseType: "family_stay",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  {
    id: DOC_TPL_FAMILY_STAY_2,
    caseType: "family",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  // 技人国 — alias caseTypeCode（canonical = work）
  {
    id: DOC_TPL_ENGINEER_1,
    caseType: "engineer_humanities_intl_visa",
    templateName: "雇用契約書サマリ",
    docType: "employment_summary",
  },
  {
    id: DOC_TPL_ENGINEER_2,
    caseType: "hum",
    templateName: "雇用契約書サマリ",
    docType: "employment_summary",
  },
  {
    id: DOC_TPL_ENGINEER_3,
    caseType: "engineer_visa",
    templateName: "雇用契約書サマリ",
    docType: "employment_summary",
  },
  // 経営管理 — alias caseTypeCode（canonical = business_manager_visa）
  {
    id: DOC_TPL_BMV_PLAN_1,
    caseType: "biz_mgmt",
    templateName: "事業計画書",
    docType: "business_plan",
  },
  {
    id: DOC_TPL_BMV_PLAN_2,
    caseType: "biz_mgmt_4m",
    templateName: "事業計画書",
    docType: "business_plan",
  },
  {
    id: DOC_TPL_BMV_PLAN_3,
    caseType: "biz_mgmt_cert_4m",
    templateName: "事業計画書",
    docType: "business_plan",
  },
  {
    id: DOC_TPL_BMV_OVERVIEW_1,
    caseType: "biz_mgmt",
    templateName: "会社概要",
    docType: "company_overview",
  },
  {
    id: DOC_TPL_BMV_OVERVIEW_2,
    caseType: "biz_mgmt_4m",
    templateName: "会社概要",
    docType: "company_overview",
  },
  {
    id: DOC_TPL_BMV_OVERVIEW_3,
    caseType: "biz_mgmt_cert_4m",
    templateName: "会社概要",
    docType: "company_overview",
  },
  // ── Canonical entries (aligned with case_templates blueprints) ──
  // dependent_visa — BUSINESS_TYPE_TO_CASE_TYPE_CODE["family-stay"] canonical
  {
    id: DOC_TPL_FAMILY_STAY_3,
    caseType: "dependent_visa",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  {
    id: DOC_TPL_DEPENDENT_VISA_2,
    caseType: "dependent_visa",
    templateName: "身元保証書",
    docType: "guarantor_statement",
  },
  // work — BUSINESS_TYPE_TO_CASE_TYPE_CODE["work-visa"] canonical
  {
    id: DOC_TPL_WORK_1,
    caseType: "work",
    templateName: "雇用契約書サマリ",
    docType: "employment_summary",
  },
  {
    id: DOC_TPL_WORK_2,
    caseType: "work",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  {
    id: DOC_TPL_WORK_3,
    caseType: "work",
    templateName: "履歴書",
    docType: "resume",
  },
  // business_manager_visa — BUSINESS_TYPE_TO_CASE_TYPE_CODE["business-management-visa"] canonical
  {
    id: DOC_TPL_BMV_CANONICAL_1,
    caseType: "business_manager_visa",
    templateName: "事業計画書",
    docType: "business_plan",
  },
  {
    id: DOC_TPL_BMV_CANONICAL_2,
    caseType: "business_manager_visa",
    templateName: "会社概要",
    docType: "company_overview",
  },
  // TODO: 業務口径回帰後に細化
  {
    id: DOC_TPL_COMPANY_SETUP,
    caseType: "company_setup",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  {
    id: DOC_TPL_HIGHLY_SKILLED,
    caseType: "highly_skilled",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  {
    id: DOC_TPL_PERMANENT,
    caseType: "permanent",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
  {
    id: DOC_TPL_PERMANENT_2,
    caseType: "permanent",
    templateName: "理由書（永住）",
    docType: "reason_statement",
  },
  {
    id: DOC_TPL_OTHER,
    caseType: "other",
    templateName: "申請理由書",
    docType: "reason_statement",
  },
];

/**
 * 批量 upsert `document_templates` 种子数据。
 * canonical 三套蓝图（dependent_visa / work / business_manager_visa）与
 * case_templates 对齐；alias 条目为兼容历史 dev 数据保留。
 *
 * dev 种子 = 当前 codebase 的可重现状态：同 id 第二次 seed 会更新
 * template_name / case_type / doc_type 等业务字段，保证 seed 与代码同步。
 *
 * @param client - 当前事务内的 PoolClient
 * @param orgId - 种子数据归属的 org id
 * @param userId - 作为 created_by / updated_by 的 user id
 */
export async function seedDocumentTemplates(
  client: PoolClient,
  orgId: string,
  userId: string,
): Promise<void> {
  for (const tpl of DOC_TEMPLATE_SEEDS) {
    await client.query(
      `INSERT INTO document_templates (
         id, org_id, template_name, case_type, doc_type, language,
         version_no, content_body, variables_schema, active_flag,
         created_by, updated_by
       )
       VALUES ($1,$2,$3,$4,$5,'ja',1,'','{}'::jsonb,true,$6,$6)
       ON CONFLICT (id) DO UPDATE SET
         template_name = EXCLUDED.template_name,
         case_type     = EXCLUDED.case_type,
         doc_type      = EXCLUDED.doc_type,
         language      = EXCLUDED.language,
         version_no    = EXCLUDED.version_no,
         active_flag   = EXCLUDED.active_flag,
         updated_by    = EXCLUDED.updated_by,
         updated_at    = now()`,
      [tpl.id, orgId, tpl.templateName, tpl.caseType, tpl.docType, userId],
    );
  }
}
