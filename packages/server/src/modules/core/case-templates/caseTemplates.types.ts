/**
 * 案件資料蓝图（case_templates）DTO / 入参 / 错误码。
 *
 * 端点映射：
 *   GET    /api/case-templates
 *   GET    /api/case-templates/:id
 *   POST   /api/case-templates
 *   PATCH  /api/case-templates/:id
 */

/** 蓝图条目数——从 requirement_blueprint 解析后的条目计数。 */
export type CaseTemplateDto = {
  id: string;
  orgId: string;
  templateName: string;
  caseType: string;
  applicationType: string | null;
  requirementBlueprint: unknown;
  blueprintItemCount: number;
  defaultTasksBlueprint: unknown;
  reviewRequiredFlag: boolean;
  billingGateMode: string;
  activeFlag: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 *
 */
export type CaseTemplateListResult = {
  items: CaseTemplateDto[];
};

/**
 *
 */
export type CaseTemplateListInput = {
  caseType?: string;
  includeInactive?: boolean;
};

/**
 *
 */
export type CaseTemplateCreateInput = {
  templateName: string;
  caseType: string;
  applicationType?: string;
  requirementBlueprint?: unknown;
  defaultTasksBlueprint?: unknown;
  reviewRequiredFlag?: boolean;
  billingGateMode?: string;
  activeFlag?: boolean;
};

/**
 *
 */
export type CaseTemplateUpdateInput = {
  templateName?: string;
  caseType?: string;
  applicationType?: string | null;
  requirementBlueprint?: unknown;
  defaultTasksBlueprint?: unknown;
  reviewRequiredFlag?: boolean;
  billingGateMode?: string;
  activeFlag?: boolean;
};

export const CASE_TEMPLATE_ERROR_CODES = {
  CT_NOT_FOUND: "CT_NOT_FOUND",
  CT_INVALID_PAYLOAD: "CT_INVALID_PAYLOAD",
} as const;

/**
 *
 */
export type CaseTemplateErrorCode =
  (typeof CASE_TEMPLATE_ERROR_CODES)[keyof typeof CASE_TEMPLATE_ERROR_CODES];
