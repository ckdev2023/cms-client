import type { PoolClient } from "pg";

import { FAMILY_STAY_REQUIREMENT_BLUEPRINT } from "./__data__/caseTemplateBlueprints/family-stay";
import { WORK_VISA_REQUIREMENT_BLUEPRINT } from "./__data__/caseTemplateBlueprints/work";

const CASE_TEMPLATE_FAMILY_STAY_ID = "00000000-0000-4000-a000-000000000700";
const CASE_TEMPLATE_WORK_ID = "00000000-0000-4000-a000-000000000701";

type CaseTemplateSeed = {
  id: string;
  templateName: string;
  caseType: string;
  applicationType: string | null;
  requirementBlueprint: unknown[];
};

const CASE_TEMPLATE_SEEDS: CaseTemplateSeed[] = [
  {
    id: CASE_TEMPLATE_FAMILY_STAY_ID,
    templateName: "家族滞在ビザ標準テンプレート",
    caseType: "family_stay",
    applicationType: null,
    requirementBlueprint: FAMILY_STAY_REQUIREMENT_BLUEPRINT,
  },
  {
    id: CASE_TEMPLATE_WORK_ID,
    templateName: "技術・人文知識・国際業務ビザ標準テンプレート",
    caseType: "engineer_humanities_intl_visa",
    applicationType: null,
    requirementBlueprint: WORK_VISA_REQUIREMENT_BLUEPRINT,
  },
];

export { CASE_TEMPLATE_SEEDS };

/**
 * 批量插入 case_templates 种子数据（家族滞在 + 技人国）。
 *
 * @param client - 事务内 PoolClient
 * @param orgId - 种子数据归属 org id
 */
export async function seedCaseTemplates(
  client: PoolClient,
  orgId: string,
): Promise<void> {
  for (const tpl of CASE_TEMPLATE_SEEDS) {
    const blueprint = JSON.stringify({
      version: 1,
      items: tpl.requirementBlueprint,
    });

    await client.query(
      `INSERT INTO case_templates (
         id, org_id, template_name, case_type, application_type,
         requirement_blueprint, active_flag
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, true)
       ON CONFLICT (id) DO UPDATE SET
         requirement_blueprint = EXCLUDED.requirement_blueprint,
         updated_at = now()`,
      [
        tpl.id,
        orgId,
        tpl.templateName,
        tpl.caseType,
        tpl.applicationType,
        blueprint,
      ],
    );
  }
}
