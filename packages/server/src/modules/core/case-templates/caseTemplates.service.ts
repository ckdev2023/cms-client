/* eslint-disable jsdoc/require-jsdoc */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import {
  CASE_TEMPLATE_ERROR_CODES,
  type CaseTemplateCreateInput,
  type CaseTemplateDto,
  type CaseTemplateListInput,
  type CaseTemplateListResult,
  type CaseTemplateUpdateInput,
} from "./caseTemplates.types";

type CaseTemplateRow = {
  id: string;
  org_id: string;
  template_name: string;
  case_type: string;
  application_type: string | null;
  requirement_blueprint: unknown;
  default_tasks_blueprint: unknown;
  review_required_flag: boolean;
  billing_gate_mode: string;
  active_flag: boolean;
  created_at: unknown;
  updated_at: unknown;
};

const CT_COLS = [
  "id",
  "org_id",
  "template_name",
  "case_type",
  "application_type",
  "requirement_blueprint",
  "default_tasks_blueprint",
  "review_required_flag",
  "billing_gate_mode",
  "active_flag",
  "created_at",
  "updated_at",
].join(", ");

@Injectable()
export class CaseTemplatesService {
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  async list(
    ctx: RequestContext,
    input: CaseTemplateListInput,
  ): Promise<CaseTemplateListResult> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const { whereClause, params } = buildListWhere(ctx.orgId, input);

    const result = await tenantDb.query<CaseTemplateRow>(
      `SELECT ${CT_COLS}
       FROM case_templates
       WHERE ${whereClause}
       ORDER BY case_type ASC, template_name ASC, created_at DESC`,
      params,
    );

    return { items: result.rows.map(mapRow) };
  }

  async get(ctx: RequestContext, id: string): Promise<CaseTemplateDto | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<CaseTemplateRow>(
      `SELECT ${CT_COLS} FROM case_templates WHERE id = $1 AND org_id = $2 LIMIT 1`,
      [id, ctx.orgId],
    );
    const row = result.rows.at(0);
    return row ? mapRow(row) : null;
  }

  async create(
    ctx: RequestContext,
    input: CaseTemplateCreateInput,
  ): Promise<CaseTemplateDto> {
    validateCreateInput(input);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const blueprint = input.requirementBlueprint
      ? JSON.stringify(input.requirementBlueprint)
      : null;
    const tasksBp = input.defaultTasksBlueprint
      ? JSON.stringify(input.defaultTasksBlueprint)
      : null;

    const result = await tenantDb.query<CaseTemplateRow>(
      `INSERT INTO case_templates (
         org_id, template_name, case_type, application_type,
         requirement_blueprint, default_tasks_blueprint,
         review_required_flag, billing_gate_mode, active_flag
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
       RETURNING ${CT_COLS}`,
      [
        ctx.orgId,
        input.templateName.trim(),
        input.caseType.trim(),
        input.applicationType?.trim() ?? null,
        blueprint,
        tasksBp,
        input.reviewRequiredFlag ?? false,
        input.billingGateMode ?? "warn",
        input.activeFlag ?? true,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create case template");
    return mapRow(row);
  }

  async update(
    ctx: RequestContext,
    id: string,
    input: CaseTemplateUpdateInput,
  ): Promise<CaseTemplateDto> {
    const existing = await this.get(ctx, id);
    if (!existing) {
      throw new NotFoundException(
        CASE_TEMPLATE_ERROR_CODES.CT_NOT_FOUND + ": Case template not found",
      );
    }

    const { sets, params } = buildUpdateSets(id, ctx, input);
    if (sets.length === 0) return existing;

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await tenantDb.query(
      `UPDATE case_templates SET ${sets.join(", ")} WHERE id = $1 AND org_id = $2`,
      params,
    );

    const dto = await this.get(ctx, id);
    if (!dto) throw new NotFoundException("Case template not found");
    return dto;
  }
}

function validateCreateInput(input: CaseTemplateCreateInput): void {
  if (!input.templateName || input.templateName.trim().length === 0) {
    throw new BadRequestException(
      CASE_TEMPLATE_ERROR_CODES.CT_INVALID_PAYLOAD +
        ": templateName is required",
    );
  }
  if (!input.caseType || input.caseType.trim().length === 0) {
    throw new BadRequestException(
      CASE_TEMPLATE_ERROR_CODES.CT_INVALID_PAYLOAD + ": caseType is required",
    );
  }
}

function buildListWhere(
  orgId: string,
  input: CaseTemplateListInput,
): { whereClause: string; params: unknown[] } {
  const where = ["org_id = $1"];
  const params: unknown[] = [orgId];

  if (!input.includeInactive) {
    where.push("active_flag = true");
  }

  if (input.caseType) {
    params.push(input.caseType);
    where.push(`case_type = $${String(params.length)}`);
  }

  return { whereClause: where.join(" AND "), params };
}

function pushSet(
  sets: string[],
  params: unknown[],
  col: string,
  value: unknown,
  suffix = "",
): void {
  params.push(value);
  sets.push(`${col} = $${String(params.length)}${suffix}`);
}

function requireNonEmptyTrimmed(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException(
      CASE_TEMPLATE_ERROR_CODES.CT_INVALID_PAYLOAD +
        `: ${field} cannot be empty`,
    );
  }
  return trimmed;
}

function applyStringFields(
  sets: string[],
  params: unknown[],
  input: CaseTemplateUpdateInput,
): void {
  if (input.templateName !== undefined) {
    pushSet(
      sets,
      params,
      "template_name",
      requireNonEmptyTrimmed(input.templateName, "templateName"),
    );
  }
  if (input.caseType !== undefined) {
    pushSet(
      sets,
      params,
      "case_type",
      requireNonEmptyTrimmed(input.caseType, "caseType"),
    );
  }
  if (input.applicationType !== undefined) {
    pushSet(
      sets,
      params,
      "application_type",
      input.applicationType?.trim() ?? null,
    );
  }
  if (input.billingGateMode !== undefined) {
    pushSet(sets, params, "billing_gate_mode", input.billingGateMode);
  }
}

function applyJsonFields(
  sets: string[],
  params: unknown[],
  input: CaseTemplateUpdateInput,
): void {
  if (input.requirementBlueprint !== undefined) {
    const val = input.requirementBlueprint
      ? JSON.stringify(input.requirementBlueprint)
      : null;
    pushSet(sets, params, "requirement_blueprint", val, "::jsonb");
  }
  if (input.defaultTasksBlueprint !== undefined) {
    const val = input.defaultTasksBlueprint
      ? JSON.stringify(input.defaultTasksBlueprint)
      : null;
    pushSet(sets, params, "default_tasks_blueprint", val, "::jsonb");
  }
}

function applyBooleanFields(
  sets: string[],
  params: unknown[],
  input: CaseTemplateUpdateInput,
): void {
  if (input.reviewRequiredFlag !== undefined) {
    pushSet(sets, params, "review_required_flag", input.reviewRequiredFlag);
  }
  if (input.activeFlag !== undefined) {
    pushSet(sets, params, "active_flag", input.activeFlag);
  }
}

function buildUpdateSets(
  id: string,
  ctx: RequestContext,
  input: CaseTemplateUpdateInput,
): { sets: string[]; params: unknown[] } {
  const sets: string[] = [];
  const params: unknown[] = [id, ctx.orgId];

  applyStringFields(sets, params, input);
  applyJsonFields(sets, params, input);
  applyBooleanFields(sets, params, input);

  if (sets.length > 0) {
    pushSet(sets, params, "updated_at", new Date().toISOString());
  }

  return { sets, params };
}

function countBlueprintItems(raw: unknown): number {
  if (!raw) return 0;
  if (Array.isArray(raw)) return raw.length;
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items.length;
  }
  return 0;
}

function mapRow(row: CaseTemplateRow): CaseTemplateDto {
  return {
    id: row.id,
    orgId: row.org_id,
    templateName: row.template_name,
    caseType: row.case_type,
    applicationType: row.application_type,
    requirementBlueprint: row.requirement_blueprint,
    blueprintItemCount: countBlueprintItems(row.requirement_blueprint),
    defaultTasksBlueprint: row.default_tasks_blueprint,
    reviewRequiredFlag: row.review_required_flag,
    billingGateMode: row.billing_gate_mode,
    activeFlag: row.active_flag,
    createdAt: tsString(row.created_at, "created_at"),
    updatedAt: tsString(row.updated_at, "updated_at"),
  };
}

function tsString(value: unknown, field: string): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new Error(`Invalid timestamp: ${field}`);
}
