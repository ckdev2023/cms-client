/* eslint-disable complexity, jsdoc/require-description, jsdoc/require-param-description, jsdoc/require-returns, max-lines, max-lines-per-function */

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type {
  SubmissionPackage,
  SubmissionPackageItem,
} from "../model/documentEntities";
import {
  CasesService,
  TEMPLATES_RESOLVER,
  type TemplatesResolver,
} from "../cases/cases.service";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

const SUBMISSION_PACKAGE_COLS =
  "id, org_id, case_id, submission_no, submission_kind, submitted_at, validation_run_id, review_record_id, authority_name, acceptance_no, receipt_storage_type, receipt_relative_path_or_key, related_submission_id, created_by, created_at";
const SUBMISSION_PACKAGE_ITEM_COLS =
  "id, submission_package_id, item_type, ref_id, snapshot_payload, created_at";
const ALLOWED_ITEM_TYPES = new Set([
  "document_requirement",
  "document_file_version",
  "generated_document_version",
  "field_snapshot",
]);
const ALLOWED_SUBMISSION_KINDS = new Set(["initial", "supplement"]);

type SubmissionPackageQueryRow = {
  id: string;
  org_id: string;
  case_id: string;
  submission_no: unknown;
  submission_kind: string;
  submitted_at: unknown;
  validation_run_id: string | null;
  review_record_id: string | null;
  authority_name: string | null;
  acceptance_no: string | null;
  receipt_storage_type: string | null;
  receipt_relative_path_or_key: string | null;
  related_submission_id: string | null;
  created_by: string | null;
  created_at: unknown;
};

type SubmissionPackageItemQueryRow = {
  id: string;
  submission_package_id: string;
  item_type: string;
  ref_id: string;
  snapshot_payload: unknown;
  created_at: unknown;
};

type ValidationRunQueryRow = {
  id: string;
  result_status: string;
};

type ReviewRecordQueryRow = {
  id: string;
  validation_run_id: string;
  decision: string;
};

type SubmissionPackageDetail = SubmissionPackage & {
  items: SubmissionPackageItem[];
};

/**
 *
 */
export type SubmissionPackageCreateItemInput = {
  itemType: string;
  refId: string;
  snapshotPayload?: Record<string, unknown> | null;
};

/**
 *
 */
export type SubmissionPackageCreateInput = {
  caseId: string;
  submissionKind?: string;
  submittedAt?: string;
  validationRunId?: string | null;
  reviewRecordId?: string | null;
  authorityName?: string | null;
  acceptanceNo?: string | null;
  receiptStorageType?: string | null;
  receiptRelativePathOrKey?: string | null;
  relatedSubmissionId?: string | null;
  items: SubmissionPackageCreateItemInput[];
};

/**
 *
 */
export type SubmissionPackageListInput = {
  caseId?: string;
  page?: number;
  limit?: number;
};

function toTimestampString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  throw new BadRequestException("Invalid timestamp value");
}

function normalizeSnapshotPayload(
  value: unknown,
): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/**
 *
 * @param row
 */
export function mapSubmissionPackageRow(
  row: SubmissionPackageQueryRow,
): SubmissionPackage {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    submissionNo: Number(row.submission_no),
    submissionKind: row.submission_kind,
    submittedAt: toTimestampString(row.submitted_at),
    validationRunId: row.validation_run_id,
    reviewRecordId: row.review_record_id,
    authorityName: row.authority_name,
    acceptanceNo: row.acceptance_no,
    receiptStorageType: row.receipt_storage_type,
    receiptRelativePathOrKey: row.receipt_relative_path_or_key,
    relatedSubmissionId: row.related_submission_id,
    createdBy: row.created_by,
    createdAt: toTimestampString(row.created_at),
  };
}

/**
 *
 * @param row
 */
export function mapSubmissionPackageItemRow(
  row: SubmissionPackageItemQueryRow,
): SubmissionPackageItem {
  return {
    id: row.id,
    submissionPackageId: row.submission_package_id,
    itemType: row.item_type,
    refId: row.ref_id,
    snapshotPayload: normalizeSnapshotPayload(row.snapshot_payload),
    createdAt: toTimestampString(row.created_at),
  };
}

function requireValidSubmissionKind(kind: string): void {
  if (!ALLOWED_SUBMISSION_KINDS.has(kind)) {
    throw new BadRequestException(
      "submissionKind must be 'initial' or 'supplement'",
    );
  }
}

function requireValidItems(items: SubmissionPackageCreateItemInput[]): void {
  if (items.length === 0) {
    throw new BadRequestException("items must not be empty");
  }
  const seen = new Set<string>();
  for (const item of items) {
    if (!ALLOWED_ITEM_TYPES.has(item.itemType)) {
      throw new BadRequestException(
        `Unsupported submission package itemType: ${item.itemType}`,
      );
    }
    const dedupeKey = `${item.itemType}:${item.refId}`;
    if (seen.has(dedupeKey)) {
      throw new BadRequestException(
        "Duplicate submission package item is not allowed",
      );
    }
    seen.add(dedupeKey);
    if (item.itemType === "field_snapshot" && !item.snapshotPayload) {
      throw new BadRequestException("field_snapshot requires snapshotPayload");
    }
  }
}

function requireSubmissionMinimumFields(
  input: SubmissionPackageCreateInput,
): void {
  if (!input.submittedAt) {
    throw new BadRequestException(
      "submittedAt is required for submission package",
    );
  }
  if (
    typeof input.authorityName !== "string" ||
    input.authorityName.trim().length === 0
  ) {
    throw new BadRequestException(
      "authorityName is required for submission package",
    );
  }
}

/**
 *
 */
@Injectable()
export class SubmissionPackagesService {
  /**
   *
   * @param pool
   * @param timelineService
   * @param casesService
   * @param templatesResolver
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
    @Inject(CasesService) private readonly casesService: CasesService,
    @Inject(TEMPLATES_RESOLVER)
    private readonly templatesResolver: TemplatesResolver,
  ) {}

  /**
   *
   * @param ctx
   * @param input
   */
  async create(
    ctx: RequestContext,
    input: SubmissionPackageCreateInput,
  ): Promise<SubmissionPackageDetail> {
    const submissionKind = input.submissionKind ?? "initial";
    requireValidSubmissionKind(submissionKind);
    requireValidItems(input.items);
    requireSubmissionMinimumFields(input);

    if (submissionKind === "supplement" && !input.relatedSubmissionId) {
      throw new BadRequestException(
        "relatedSubmissionId is required for supplement package",
      );
    }
    if (submissionKind === "initial" && input.relatedSubmissionId) {
      throw new BadRequestException(
        "initial package cannot set relatedSubmissionId",
      );
    }

    const currentCase = await this.casesService.get(ctx, input.caseId);
    if (!currentCase) {
      throw new NotFoundException("Case not found");
    }
    if (currentCase.status !== "S6" && currentCase.status !== "S7") {
      throw new BadRequestException(
        "Submission package can only be created when case is in S6 or S7",
      );
    }

    const reviewRequired = await this.isReviewRequired(
      ctx,
      currentCase.caseTypeCode,
      currentCase.id,
    );

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const created = await tenantDb.transaction(async (tx) => {
      await this.assertCaseExists(tx, ctx.orgId, input.caseId);
      if (input.relatedSubmissionId) {
        await this.assertRelatedSubmission(
          tx,
          ctx.orgId,
          input.caseId,
          input.relatedSubmissionId,
        );
      }
      const gateContext = await this.resolveSubmissionGateContext(
        tx,
        ctx.orgId,
        input.caseId,
        input.validationRunId ?? null,
        input.reviewRecordId ?? null,
        reviewRequired,
      );

      const submissionNo = await this.getNextSubmissionNo(
        tx,
        ctx.orgId,
        input.caseId,
      );
      const packageResult = await tx.query<SubmissionPackageQueryRow>(
        `
          insert into submission_packages (
            org_id, case_id, submission_no, submission_kind, submitted_at,
            validation_run_id, review_record_id, authority_name, acceptance_no,
            receipt_storage_type, receipt_relative_path_or_key, related_submission_id, created_by
          )
          values ($1, $2, $3, $4, coalesce($5::timestamptz, now()), $6, $7, $8, $9, $10, $11, $12, $13)
          returning ${SUBMISSION_PACKAGE_COLS}
        `,
        [
          ctx.orgId,
          input.caseId,
          submissionNo,
          submissionKind,
          input.submittedAt ?? null,
          gateContext.validationRunId,
          gateContext.reviewRecordId,
          input.authorityName ?? null,
          input.acceptanceNo ?? null,
          input.receiptStorageType ?? null,
          input.receiptRelativePathOrKey ?? null,
          input.relatedSubmissionId ?? null,
          ctx.userId,
        ],
      );
      const packageRow = packageResult.rows.at(0);
      if (!packageRow)
        throw new BadRequestException("Failed to create submission package");
      const createdPackage = mapSubmissionPackageRow(packageRow);

      const items: SubmissionPackageItem[] = [];
      for (const item of input.items) {
        const snapshotPayload = await this.buildSnapshotPayload(
          tx,
          ctx.orgId,
          input.caseId,
          item,
        );
        const itemResult = await tx.query<SubmissionPackageItemQueryRow>(
          `
            insert into submission_package_items (
              submission_package_id, item_type, ref_id, snapshot_payload
            )
            values ($1, $2, $3, $4::jsonb)
            returning ${SUBMISSION_PACKAGE_ITEM_COLS}
          `,
          [
            createdPackage.id,
            item.itemType,
            item.refId,
            JSON.stringify(snapshotPayload),
          ],
        );
        const createdItem = itemResult.rows.at(0);
        if (!createdItem) {
          throw new BadRequestException(
            "Failed to create submission package item",
          );
        }
        items.push(mapSubmissionPackageItemRow(createdItem));
      }

      return { ...createdPackage, items };
    });

    await this.timelineService.write(ctx, {
      entityType: "case",
      entityId: created.caseId,
      action: "submission_package.created",
      payload: {
        submissionPackageId: created.id,
        submissionNo: created.submissionNo,
        submissionKind: created.submissionKind,
        itemCount: created.items.length,
      },
    });

    if (currentCase.status === "S6") {
      await this.transitionCaseToSubmitted(ctx, created.caseId);
    }

    return created;
  }

  private async transitionCaseToSubmitted(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
    try {
      await this.casesService.transition(ctx, caseId, { toStatus: "S7" });
    } catch (error) {
      const reloadedCase = await this.casesService.get(ctx, caseId);
      if (reloadedCase?.status === "S7") {
        return;
      }
      throw error;
    }
  }

  /**
   *
   * @param ctx
   * @param input
   */
  async list(
    ctx: RequestContext,
    input: SubmissionPackageListInput = {},
  ): Promise<{ items: SubmissionPackage[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const where = ["org_id = $1"];
    const params: unknown[] = [ctx.orgId];
    if (input.caseId) {
      params.push(input.caseId);
      where.push(`case_id = $${String(params.length)}`);
    }

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*)::text as count from submission_packages where ${where.join(" and ")}`,
      params,
    );

    const listParams = [...params, limit, offset];
    const listResult = await tenantDb.query<SubmissionPackageQueryRow>(
      `
        select ${SUBMISSION_PACKAGE_COLS}
        from submission_packages
        where ${where.join(" and ")}
        order by submitted_at desc, submission_no desc
        limit $${String(params.length + 1)}
        offset $${String(params.length + 2)}
      `,
      listParams,
    );

    return {
      items: listResult.rows.map(mapSubmissionPackageRow),
      total: Number(countResult.rows.at(0)?.count ?? "0"),
    };
  }

  /**
   *
   * @param ctx
   * @param id
   */
  async get(
    ctx: RequestContext,
    id: string,
  ): Promise<SubmissionPackageDetail | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const packageResult = await tenantDb.query<SubmissionPackageQueryRow>(
      `
        select ${SUBMISSION_PACKAGE_COLS}
        from submission_packages
        where id = $1 and org_id = $2
        limit 1
      `,
      [id, ctx.orgId],
    );
    const packageRow = packageResult.rows.at(0);
    if (!packageRow) return null;

    const itemResult = await tenantDb.query<SubmissionPackageItemQueryRow>(
      `
        select spi.${SUBMISSION_PACKAGE_ITEM_COLS}
        from submission_package_items spi
        join submission_packages sp on sp.id = spi.submission_package_id
        where spi.submission_package_id = $1 and sp.org_id = $2
        order by spi.created_at asc, spi.id asc
      `,
      [id, ctx.orgId],
    );

    return {
      ...mapSubmissionPackageRow(packageRow),
      items: itemResult.rows.map(mapSubmissionPackageItemRow),
    };
  }

  private async assertCaseExists(
    tx: TenantDbTx,
    orgId: string,
    caseId: string,
  ): Promise<void> {
    const result = await tx.query<{ id: string }>(
      `select id from cases where id = $1 and org_id = $2 limit 1`,
      [caseId, orgId],
    );
    if ((result.rowCount ?? 0) === 0) {
      throw new BadRequestException("Case not found in current organization");
    }
  }

  private async assertRelatedSubmission(
    tx: TenantDbTx,
    orgId: string,
    caseId: string,
    relatedSubmissionId: string,
  ): Promise<void> {
    const result = await tx.query<{ id: string }>(
      `
        select id
        from submission_packages
        where id = $1 and org_id = $2 and case_id = $3
        limit 1
      `,
      [relatedSubmissionId, orgId, caseId],
    );
    if ((result.rowCount ?? 0) === 0) {
      throw new BadRequestException(
        "relatedSubmissionId does not belong to current case",
      );
    }
  }

  private async getNextSubmissionNo(
    tx: TenantDbTx,
    orgId: string,
    caseId: string,
  ): Promise<number> {
    const result = await tx.query<{ next_submission_no: string }>(
      `
        select coalesce(max(submission_no), 0) + 1 as next_submission_no
        from submission_packages
        where org_id = $1 and case_id = $2
      `,
      [orgId, caseId],
    );
    return Number(result.rows.at(0)?.next_submission_no ?? "1");
  }

  private async resolveSubmissionGateContext(
    tx: TenantDbTx,
    orgId: string,
    caseId: string,
    validationRunId: string | null,
    reviewRecordId: string | null,
    reviewRequired: boolean,
  ): Promise<{ validationRunId: string; reviewRecordId: string | null }> {
    const validationRunResult = await tx.query<ValidationRunQueryRow>(
      `
        select id, result_status
        from validation_runs
        where org_id = $1 and case_id = $2
        order by executed_at desc nulls last, created_at desc, id desc
        limit 1
      `,
      [orgId, caseId],
    );
    const latestValidationRun = validationRunResult.rows.at(0);
    if (!latestValidationRun) {
      throw new BadRequestException(
        "Gate-C requires a latest validation run before creating a submission package",
      );
    }
    if (latestValidationRun.result_status !== "passed") {
      throw new BadRequestException(
        "Gate-C requires the latest validation run to be passed",
      );
    }
    if (validationRunId && validationRunId !== latestValidationRun.id) {
      throw new BadRequestException(
        "Submission package must reference the latest passed validation run",
      );
    }

    if (!reviewRequired && !reviewRecordId) {
      return { validationRunId: latestValidationRun.id, reviewRecordId: null };
    }

    if (!reviewRequired && reviewRecordId) {
      const specifiedReviewRecord = await this.getReviewRecordById(
        tx,
        orgId,
        caseId,
        reviewRecordId,
      );
      if (specifiedReviewRecord.validation_run_id !== latestValidationRun.id) {
        throw new BadRequestException(
          "reviewRecordId must belong to the latest passed validation run",
        );
      }
      if (specifiedReviewRecord.decision !== "approved") {
        throw new BadRequestException(
          "reviewRecordId must reference an approved review record",
        );
      }
      return {
        validationRunId: latestValidationRun.id,
        reviewRecordId: specifiedReviewRecord.id,
      };
    }

    const latestReviewRecordResult = await tx.query<ReviewRecordQueryRow>(
      `
        select id, validation_run_id, decision
        from review_records
        where org_id = $1
          and case_id = $2
          and validation_run_id = $3
        order by reviewed_at desc nulls last, created_at desc, id desc
        limit 1
      `,
      [orgId, caseId, latestValidationRun.id],
    );
    const latestReviewRecord = latestReviewRecordResult.rows.at(0);
    if (latestReviewRecord?.decision !== "approved") {
      throw new BadRequestException(
        "Gate-C requires the latest review record to be approved when review_required_flag is enabled",
      );
    }
    if (reviewRecordId && reviewRecordId !== latestReviewRecord.id) {
      throw new BadRequestException(
        "Submission package must reference the latest approved review record",
      );
    }

    return {
      validationRunId: latestValidationRun.id,
      reviewRecordId: latestReviewRecord.id,
    };
  }

  private async getReviewRecordById(
    tx: TenantDbTx,
    orgId: string,
    caseId: string,
    reviewRecordId: string,
  ): Promise<ReviewRecordQueryRow> {
    const result = await tx.query<ReviewRecordQueryRow>(
      `
        select id, validation_run_id, decision
        from review_records
        where id = $1 and org_id = $2 and case_id = $3
        limit 1
      `,
      [reviewRecordId, orgId, caseId],
    );
    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException(
        "reviewRecordId does not belong to current case",
      );
    }
    return row;
  }

  private async isReviewRequired(
    ctx: RequestContext,
    caseTypeCode: string,
    caseId: string,
  ): Promise<boolean> {
    const resolved = await this.templatesResolver.resolve(ctx, {
      kind: "case_type",
      key: caseTypeCode,
      entityId: caseId,
    });
    return (
      resolved.mode === "template" &&
      resolved.used &&
      resolved.config.review_required_flag === true
    );
  }

  private async buildSnapshotPayload(
    tx: TenantDbTx,
    orgId: string,
    caseId: string,
    item: SubmissionPackageCreateItemInput,
  ): Promise<Record<string, unknown>> {
    if (item.snapshotPayload) return item.snapshotPayload;

    if (item.itemType === "field_snapshot") {
      throw new BadRequestException("field_snapshot requires snapshotPayload");
    }

    if (item.itemType === "document_requirement") {
      const result = await tx.query<{
        id: string;
        checklist_item_code: string;
        name: string;
        status: string;
      }>(
        `
          select id, checklist_item_code, name, status
          from document_items
          where id = $1 and org_id = $2 and case_id = $3
          limit 1
        `,
        [item.refId, orgId, caseId],
      );
      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException(
          "Document requirement not found for current case",
        );
      return {
        id: row.id,
        checklistItemCode: row.checklist_item_code,
        name: row.name,
        status: row.status,
      };
    }

    if (item.itemType === "document_file_version") {
      const result = await tx.query<{
        id: string;
        requirement_id: string;
        file_name: string;
        version_no: number;
        hash_value: string | null;
      }>(
        `
          select df.id, df.requirement_id, df.file_name, df.version_no, df.hash_value
          from document_files df
          join document_items di on di.id = df.requirement_id
          where df.id = $1 and df.org_id = $2 and di.case_id = $3
          limit 1
        `,
        [item.refId, orgId, caseId],
      );
      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException(
          "Document file version not found for current case",
        );
      return {
        id: row.id,
        requirementId: row.requirement_id,
        fileName: row.file_name,
        versionNo: row.version_no,
        hashValue: row.hash_value,
      };
    }

    if (item.itemType === "generated_document_version") {
      const result = await tx.query<{
        id: string;
        title: string;
        version_no: number;
        output_format: string;
        status: string;
      }>(
        `
          select id, title, version_no, output_format, status
          from generated_documents
          where id = $1 and org_id = $2 and case_id = $3
          limit 1
        `,
        [item.refId, orgId, caseId],
      );
      const row = result.rows.at(0);
      if (!row) {
        throw new BadRequestException(
          "Generated document version not found for current case",
        );
      }
      return {
        id: row.id,
        title: row.title,
        versionNo: row.version_no,
        outputFormat: row.output_format,
        status: row.status,
      };
    }

    throw new NotFoundException("Unsupported submission package item type");
  }
}
