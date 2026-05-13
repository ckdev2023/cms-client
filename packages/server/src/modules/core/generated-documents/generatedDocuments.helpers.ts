import { BadRequestException } from "@nestjs/common";

import type { GeneratedDocument } from "../model/documentEntities";
import type { RequestContext } from "../tenancy/requestContext";
import {
  GENERATED_DOCUMENT_ERROR_CODES,
  type GeneratedDocumentCreateInput,
  type GeneratedDocumentDto,
  type GeneratedDocumentListInput,
  type GeneratedDocumentUpdateInput,
} from "../cases/cases.types-generated-docs";

const VALID_STATUSES = new Set([
  "draft",
  "final",
  "exporting",
  "exported",
  "export_failed",
]);
const VALID_OUTPUT_FORMATS = new Set(["pdf", "docx", "xlsx"]);

const STATUS_TRANSITIONS: Record<string, Set<string>> = {
  draft: new Set(["draft", "final"]),
  final: new Set(["final"]),
  exporting: new Set(["exported", "export_failed"]),
  exported: new Set(["exported"]),
  export_failed: new Set(["export_failed"]),
};

/** 生成文书数据库行类型。 */
export type GeneratedDocumentRow = {
  id: string;
  org_id: string;
  case_id: string;
  template_id: string | null;
  title: string;
  version_no: number;
  output_format: string;
  file_url: string | null;
  status: string;
  generated_by: string | null;
  approved_by: string | null;
  generated_at: unknown;
  approved_at: unknown;
  template_version_no_snapshot: number | null;
  template_doc_type: string | null;
};

/** 生成文书 DTO 数据库行类型（含 join 展示名）。 */
export type GeneratedDocumentDtoRow = GeneratedDocumentRow & {
  generated_by_display_name: string | null;
  approved_by_display_name: string | null;
};

/**
 * 校验创建参数。
 * @param input 创建参数。
 */
export function validateCreateInput(input: GeneratedDocumentCreateInput): void {
  if (!input.title || input.title.trim().length === 0) {
    throw new BadRequestException(
      GENERATED_DOCUMENT_ERROR_CODES.GD_TITLE_REQUIRED + ": title is required",
    );
  }
  const fmt = input.outputFormat ?? "pdf";
  if (!VALID_OUTPUT_FORMATS.has(fmt)) {
    throw new BadRequestException(
      GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_OUTPUT_FORMAT +
        ": output_format must be pdf, docx, or xlsx",
    );
  }
  const st = input.status ?? "draft";
  if (!VALID_STATUSES.has(st)) {
    throw new BadRequestException(
      GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_STATUS +
        ": invalid status value",
    );
  }
}

function assertStatusTransition(current: string, target: string): void {
  if (!STATUS_TRANSITIONS[current].has(target)) {
    throw new BadRequestException(
      GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_TRANSITION +
        `: cannot transition from '${current}' to '${target}'`,
    );
  }
}

/**
 * 构建列表查询 WHERE 子句。
 * @param orgId 组织 ID。
 * @param input 查询参数。
 * @returns WHERE 子句与参数。
 */
export function buildListWhere(
  orgId: string,
  input: GeneratedDocumentListInput,
): { whereClause: string; params: unknown[] } {
  const where = ["gd.org_id = $1"];
  const params: unknown[] = [orgId];

  params.push(input.caseId);
  where.push(`gd.case_id = $${String(params.length)}`);

  if (input.status) {
    params.push(input.status);
    where.push(`gd.status = $${String(params.length)}`);
  }

  return { whereClause: where.join(" and "), params };
}

/**
 * 构建 UPDATE SET 子句。
 * @param id 文書 ID。
 * @param ctx 请求上下文。
 * @param input 更新参数。
 * @param existing 现有实体。
 * @returns SET 子句与参数。
 */
export function buildUpdateSets(
  id: string,
  ctx: RequestContext,
  input: GeneratedDocumentUpdateInput,
  existing: GeneratedDocument,
): { sets: string[]; params: unknown[] } {
  const sets: string[] = [];
  const params: unknown[] = [id, ctx.orgId];

  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_TITLE_REQUIRED +
          ": title is required",
      );
    }
    params.push(input.title.trim());
    sets.push(`title = $${String(params.length)}`);
  }

  if (input.outputFormat !== undefined) {
    if (!VALID_OUTPUT_FORMATS.has(input.outputFormat)) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_OUTPUT_FORMAT +
          ": output_format must be pdf, docx, or xlsx",
      );
    }
    params.push(input.outputFormat);
    sets.push(`output_format = $${String(params.length)}`);
  }

  if (input.fileUrl !== undefined) {
    params.push(input.fileUrl);
    sets.push(`file_url = $${String(params.length)}`);
  }

  if (input.status !== undefined) {
    if (!VALID_STATUSES.has(input.status)) {
      throw new BadRequestException(
        GENERATED_DOCUMENT_ERROR_CODES.GD_INVALID_STATUS +
          ": invalid status value",
      );
    }
    assertStatusTransition(existing.status, input.status);
    params.push(input.status);
    sets.push(`status = $${String(params.length)}`);

    if (
      input.status === "final" &&
      existing.status === "draft" &&
      !existing.approvedBy
    ) {
      params.push(ctx.userId);
      sets.push(`approved_by = $${String(params.length)}`);
      sets.push("approved_at = now()");
    }
  }

  return { sets, params };
}

/**
 * `file_url` が有効な外部 http(s) URL であるかを判定する。
 * `null`・空文字・`placeholder://` はいずれも無効。
 *
 * @param url - 検査対象の URL 文字列
 * @returns `http://` または `https://` で始まる有効な URL の場合 `true`
 */
export function isValidExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith("placeholder://")) return false;
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

function tsString(value: unknown, field: string): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new Error(`Invalid timestamp: ${field}`);
}

function tsStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  return v instanceof Date ? v.toISOString() : null;
}

/**
 * 将数据库行映射为实体。
 * @param row 数据库行。
 * @returns 实体。
 */
export function mapRow(row: GeneratedDocumentRow): GeneratedDocument {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    templateId: row.template_id,
    title: row.title,
    versionNo: row.version_no,
    outputFormat: row.output_format,
    fileUrl: row.file_url,
    status: row.status,
    generatedBy: row.generated_by,
    approvedBy: row.approved_by,
    generatedAt: tsString(row.generated_at, "generated_at"),
    approvedAt: tsStringOrNull(row.approved_at),
    templateVersionNoSnapshot: row.template_version_no_snapshot ?? null,
    templateDocType: row.template_doc_type ?? null,
  };
}

/**
 * 将数据库行映射为 DTO。
 * @param row 数据库行（含 join 字段）。
 * @returns DTO。
 */
export function mapDtoRow(row: GeneratedDocumentDtoRow): GeneratedDocumentDto {
  return {
    id: row.id,
    caseId: row.case_id,
    templateId: row.template_id,
    title: row.title,
    versionNo: row.version_no,
    outputFormat: row.output_format,
    fileUrl: row.file_url,
    status: row.status,
    generatedBy: row.generated_by,
    generatedByDisplayName: row.generated_by_display_name,
    approvedBy: row.approved_by,
    approvedByDisplayName: row.approved_by_display_name,
    generatedAt: tsString(row.generated_at, "generated_at"),
    approvedAt: tsStringOrNull(row.approved_at),
    templateVersionNoSnapshot: row.template_version_no_snapshot ?? null,
    templateDocType: row.template_doc_type ?? null,
  };
}
