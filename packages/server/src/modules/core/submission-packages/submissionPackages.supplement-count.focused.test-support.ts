import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { SubmissionPackagesService } from "./submissionPackages.service";

export const ORG_ID = "00000000-0000-4000-8000-000000000000";
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const CASE_ID = "00000000-0000-4000-8000-000000000010";
export const PACKAGE_ID = "00000000-0000-4000-8000-000000000020";
export const ITEM_ID = "00000000-0000-4000-8000-000000000030";
export const REQUIREMENT_ID = "00000000-0000-4000-8000-000000000040";
export const GENERATED_DOC_ID = "00000000-0000-4000-8000-000000000042";
export const VALIDATION_RUN_ID = "00000000-0000-4000-8000-000000000043";
export const RELATED_PACKAGE_ID = "00000000-0000-4000-8000-000000000050";

type QueryResult = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;
type StandardQueryOverrides = {
  submissionKind?: string;
  relatedSubmissionId?: string | null;
};

/**
 * 生成 submission package 测试用请求上下文。
 * @param role 请求上下文中的角色。
 * @returns 供 service 调用的 RequestContext。
 */
export function makeCtx(
  role: RequestContext["role"] = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

/**
 * 生成 submission_packages 查询结果行。
 * @param overrides 需要覆盖的行字段。
 * @returns submission_packages 的模拟查询结果行。
 */
export function makeSubmissionPackageRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: PACKAGE_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    submission_no: 1,
    submission_kind: "initial",
    submitted_at: "2026-01-01T00:00:00.000Z",
    validation_run_id: VALIDATION_RUN_ID,
    review_record_id: null,
    authority_name: "Tokyo Immigration",
    acceptance_no: "A-001",
    receipt_storage_type: null,
    receipt_relative_path_or_key: null,
    related_submission_id: null,
    created_by: USER_ID,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * 生成 submission_package_items 查询结果行。
 * @param overrides 需要覆盖的行字段。
 * @returns submission_package_items 的模拟查询结果行。
 */
export function makeSubmissionPackageItemRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: ITEM_ID,
    submission_package_id: PACKAGE_ID,
    item_type: "document_requirement",
    ref_id: REQUIREMENT_ID,
    snapshot_payload: { id: REQUIREMENT_ID, name: "Passport" },
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePool(queryFn: QueryFn): Pool {
  return {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  } as unknown as Pool;
}

function makeTimeline() {
  const writes: unknown[] = [];
  return {
    service: {
      write: (_ctx: unknown, input: unknown) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}

function makeCasesService(stage = "S7") {
  const transitions: unknown[] = [];
  const supplementIncrements: string[] = [];
  let currentSupplementCount = 0;
  return {
    service: {
      get: () =>
        Promise.resolve({
          id: CASE_ID,
          stage,
          status: stage,
          caseTypeCode: "business_manager_visa",
          supplementCount: currentSupplementCount,
        }),
      transition: (_ctx: unknown, caseId: string, input: unknown) => {
        transitions.push({ caseId, input });
        return Promise.resolve({ id: caseId, stage: "S7", status: "S7" });
      },
      incrementSupplementCount: (_ctx: unknown, caseId: string) => {
        supplementIncrements.push(caseId);
        currentSupplementCount += 1;
        return Promise.resolve(currentSupplementCount);
      },
    },
    transitions,
    supplementIncrements,
    get currentSupplementCount() {
      return currentSupplementCount;
    },
  };
}

function makeTemplatesResolver(reviewRequired = false) {
  return {
    resolve: () =>
      Promise.resolve(
        reviewRequired
          ? {
              mode: "template" as const,
              used: true,
              version: 1,
              config: { review_required_flag: true },
            }
          : { mode: "legacy" as const, used: false },
      ),
  };
}

/**
 * 创建注入 submission package 测试依赖的 service。
 * @param queryFn 数据库 query stub。
 * @param caseStatus 用于 cases service 的阶段值。
 * @param reviewRequired 是否返回需要 review 的模板配置。
 * @returns 含 service、timeline 与 cases stub 的测试夹具。
 */
export function createService(
  queryFn: QueryFn,
  caseStatus = "S7",
  reviewRequired = false,
) {
  const timeline = makeTimeline();
  const cases = makeCasesService(caseStatus);
  const svc = new SubmissionPackagesService(
    makePool(queryFn),
    timeline.service as never,
    cases.service as never,
    makeTemplatesResolver(reviewRequired) as never,
  );
  return { svc, timeline, cases };
}

function handleValidationRunQuery(sql: string): QueryResult | null {
  if (!sql.includes("from validation_runs")) {
    return null;
  }
  return {
    rows: [{ id: VALIDATION_RUN_ID, result_status: "passed" }],
    rowCount: 1,
  };
}

function handleCaseLookupQuery(sql: string): QueryResult | null {
  if (!sql.includes("select id from cases")) {
    return null;
  }
  return { rows: [{ id: CASE_ID }], rowCount: 1 };
}

function handleRelatedSubmissionQuery(sql: string): QueryResult | null {
  if (
    !sql.includes("from submission_packages") ||
    !sql.includes("where id = $1")
  ) {
    return null;
  }
  return { rows: [{ id: RELATED_PACKAGE_ID }], rowCount: 1 };
}

function handleSubmissionNumberQuery(sql: string): QueryResult | null {
  if (!sql.includes("coalesce(max(submission_no), 0) + 1")) {
    return null;
  }
  return { rows: [{ next_submission_no: "2" }], rowCount: 1 };
}

function handleInsertSubmissionPackageQuery(
  sql: string,
  params: unknown[] | undefined,
  overrides: StandardQueryOverrides,
): QueryResult | null {
  if (!sql.includes("insert into submission_packages")) {
    return null;
  }
  return {
    rows: [
      makeSubmissionPackageRow({
        submission_no: 2,
        submission_kind: overrides.submissionKind ?? "initial",
        validation_run_id: params?.[5] ?? null,
        related_submission_id: overrides.relatedSubmissionId ?? null,
      }),
    ],
    rowCount: 1,
  };
}

function handleDocumentItemsQuery(sql: string): QueryResult | null {
  if (!sql.includes("from document_items")) {
    return null;
  }
  return {
    rows: [
      {
        id: REQUIREMENT_ID,
        checklist_item_code: "bmv-questionnaire",
        name: "経営管理ビザ情報表",
        status: "approved",
        category: "questionnaire",
        survey_data: { companyName: "Test Corp" },
      },
    ],
    rowCount: 1,
  };
}

function handleGeneratedDocumentsQuery(sql: string): QueryResult | null {
  if (!sql.includes("from generated_documents")) {
    return null;
  }
  return {
    rows: [
      {
        id: GENERATED_DOC_ID,
        title: "在留資格認定証明書交付申請書",
        version_no: 1,
        output_format: "pdf",
        status: "final",
      },
    ],
    rowCount: 1,
  };
}

function handleInsertSubmissionPackageItemsQuery(
  sql: string,
): QueryResult | null {
  if (!sql.includes("insert into submission_package_items")) {
    return null;
  }
  return { rows: [makeSubmissionPackageItemRow()], rowCount: 1 };
}

function resolveStandardQuery(
  sql: string,
  params: unknown[] | undefined,
  overrides: StandardQueryOverrides,
): QueryResult {
  const handlers = [
    handleValidationRunQuery(sql),
    handleCaseLookupQuery(sql),
    handleRelatedSubmissionQuery(sql),
    handleSubmissionNumberQuery(sql),
    handleInsertSubmissionPackageQuery(sql, params, overrides),
    handleDocumentItemsQuery(sql),
    handleGeneratedDocumentsQuery(sql),
    handleInsertSubmissionPackageItemsQuery(sql),
  ];
  return (
    handlers.find((result) => result !== null) ?? { rows: [], rowCount: 0 }
  );
}

/**
 * 生成 supplement/initial 提交场景的标准 query stub。
 * @param overrides 可选的提交种类与 relatedSubmissionId 覆盖项。
 * @param overrides.submissionKind insert 返回中的 submission kind。
 * @param overrides.relatedSubmissionId insert 返回中的 related submission id。
 * @returns 可注入 service 的数据库 query stub。
 */
export function standardQueryFn(
  overrides: StandardQueryOverrides = {},
): QueryFn {
  return (sql, params) =>
    Promise.resolve(resolveStandardQuery(sql, params, overrides));
}
