/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns, jsdoc/require-jsdoc, jsdoc/require-description */
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { BMV_CASE_TYPE, isBmvCaseTypeCode } from "./cases.template-bmv";
import type { ChecklistItem } from "./cases.service.write-ops";

export type CaseTemplateRow = {
  id: string;
  case_type: string;
  application_type: string | null;
  requirement_blueprint: unknown;
  active_flag: boolean;
};

export type CaseTemplateResolveResult =
  | { found: true; items: ChecklistItem[] }
  | { found: false };

/**
 * 解析 caseTypeCode → 实际查询的 case_type 候选列表。
 *
 * BMV 系列子类型（biz_mgmt_*）当前共享一份 `business_manager_visa` 模板蓝图，
 * 因此先按原始 code 精确查询，未命中再回退到 BMV 总表。
 *
 * @param caseTypeCode 入参案件类型 code
 */
function resolveCaseTypeCandidates(caseTypeCode: string): string[] {
  if (caseTypeCode === BMV_CASE_TYPE) return [BMV_CASE_TYPE];
  if (isBmvCaseTypeCode(caseTypeCode)) {
    return [caseTypeCode, BMV_CASE_TYPE];
  }
  return [caseTypeCode];
}

/**
 * @param pool
 * @param ctx
 * @param caseTypeCode
 * @param applicationType
 */
export async function findActiveCaseTemplateByCaseType(
  pool: Pool,
  ctx: RequestContext,
  caseTypeCode: string,
  applicationType?: string,
): Promise<CaseTemplateResolveResult> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);

  const candidates = resolveCaseTypeCandidates(caseTypeCode);

  for (const candidate of candidates) {
    const whereClause = applicationType
      ? `case_type = $1 AND application_type = $2 AND active_flag = true`
      : `case_type = $1 AND active_flag = true`;

    const params = applicationType ? [candidate, applicationType] : [candidate];

    const result = await tenantDb.query<CaseTemplateRow>(
      `SELECT id, case_type, application_type, requirement_blueprint, active_flag
       FROM case_templates
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT 1`,
      params,
    );

    if (result.rows.length === 0) continue;

    const items = parseRequirementBlueprint(
      result.rows[0].requirement_blueprint,
    );
    return { found: true, items };
  }

  return { found: false };
}

export function parseRequirementBlueprint(raw: unknown): ChecklistItem[] {
  if (!raw) return [];

  const blueprint = extractItemsArray(raw);
  if (!blueprint) return [];

  return blueprint.map((item) => {
    const rec = item as Record<string, unknown>;
    const code =
      typeof rec.code === "string"
        ? rec.code
        : typeof rec.checklistItemCode === "string"
          ? rec.checklistItemCode
          : "";

    return {
      code,
      name: typeof rec.name === "string" ? rec.name : "",
      ownerSide:
        typeof rec.ownerSide === "string" ? rec.ownerSide : "applicant",
      category: typeof rec.category === "string" ? rec.category : null,
      requiredFlag:
        typeof rec.requiredFlag === "boolean" ? rec.requiredFlag : false,
      providedByRole:
        typeof rec.providedByRole === "string" ? rec.providedByRole : null,
    };
  });
}

function extractItemsArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw as unknown[];

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as unknown[];
  }

  return null;
}
