import { getAdminAccessToken } from "../../../auth/model/adminSession";
import {
  createRepositoryRuntime,
  requestAndAdapt,
  type RepositoryRuntime,
} from "../../../shared/api/repositoryRuntime";

/**
 *
 */
export type CaseTemplateItem = {
  /**
   *
   */
  id: string;
  /**
   *
   */
  orgId: string;
  /**
   *
   */
  templateName: string;
  /**
   *
   */
  caseType: string;
  /**
   *
   */
  applicationType: string | null;
  /**
   *
   */
  blueprintItemCount: number;
  /**
   *
   */
  reviewRequiredFlag: boolean;
  /**
   *
   */
  billingGateMode: string;
  /**
   *
   */
  activeFlag: boolean;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  updatedAt: string;
};

/**
 *
 */
export type CaseTemplateListResult = {
  /**
   *
   */
  items: CaseTemplateItem[];
};

/**
 *
 */
export type CaseTemplatesListParams = {
  /**
   *
   */
  caseType?: string;
  /**
   *
   */
  includeInactive?: boolean;
};

/**
 *
 */
export type CaseTemplateCreateParams = {
  /**
   *
   */
  templateName: string;
  /**
   *
   */
  caseType: string;
  /**
   *
   */
  applicationType?: string;
  /**
   *
   */
  requirementBlueprint?: unknown;
  /**
   *
   */
  defaultTasksBlueprint?: unknown;
  /**
   *
   */
  reviewRequiredFlag?: boolean;
  /**
   *
   */
  billingGateMode?: string;
  /**
   *
   */
  activeFlag?: boolean;
};

/**
 *
 */
export type CaseTemplateUpdateParams = {
  /**
   *
   */
  templateName?: string;
  /**
   *
   */
  caseType?: string;
  /**
   *
   */
  applicationType?: string | null;
  /**
   *
   */
  requirementBlueprint?: unknown;
  /**
   *
   */
  defaultTasksBlueprint?: unknown;
  /**
   *
   */
  reviewRequiredFlag?: boolean;
  /**
   *
   */
  billingGateMode?: string;
  /**
   *
   */
  activeFlag?: boolean;
};

/**
 *
 */
/**
 *
 */
export type CaseTypeOption = {
  /**
   *
   */
  code: string;
  /**
   *
   */
  sort: number;
};

/**
 * 单条模板详情 — 比列表条目多出 requirementBlueprint 与 defaultTasksBlueprint。
 */
export type CaseTemplateDetail = CaseTemplateItem & {
  requirementBlueprint: unknown;
  defaultTasksBlueprint: unknown;
};

/**
 *
 */
export interface CaseTemplatesRepository {
  /**
   *
   */
  list(params?: CaseTemplatesListParams): Promise<CaseTemplateListResult>;
  /**
   *
   */
  get(id: string): Promise<CaseTemplateDetail>;
  /**
   *
   */
  create(params: CaseTemplateCreateParams): Promise<CaseTemplateItem>;
  /**
   *
   */
  update(
    id: string,
    params: CaseTemplateUpdateParams,
  ): Promise<CaseTemplateItem>;
  /**
   *
   */
  getCaseTypeOptions(): Promise<CaseTypeOption[]>;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function strNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function adaptItem(raw: unknown): CaseTemplateItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  return {
    id: r.id,
    orgId: str(r.orgId),
    templateName: str(r.templateName),
    caseType: str(r.caseType),
    applicationType: strNull(r.applicationType),
    blueprintItemCount: num(r.blueprintItemCount),
    reviewRequiredFlag: bool(r.reviewRequiredFlag),
    billingGateMode: str(r.billingGateMode, "warn"),
    activeFlag: bool(r.activeFlag, true),
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}

function adaptCaseTypeOptions(raw: unknown): CaseTypeOption[] | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.items)) return null;
  return r.items
    .filter(
      (item): item is Record<string, unknown> =>
        !!item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).code === "string",
    )
    .map((item) => ({
      code: item.code as string,
      sort: typeof item.sort === "number" ? item.sort : 0,
    }));
}

function adaptDetail(raw: unknown): CaseTemplateDetail | null {
  const item = adaptItem(raw);
  if (!item) return null;
  const r = raw as Record<string, unknown>;
  return {
    ...item,
    requirementBlueprint: r.requirementBlueprint ?? null,
    defaultTasksBlueprint: r.defaultTasksBlueprint ?? null,
  };
}

function adaptList(raw: unknown): CaseTemplateListResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.items)) return null;
  const items = r.items
    .map((item) => adaptItem(item))
    .filter((item): item is CaseTemplateItem => item !== null);
  return { items };
}

/**
 *
 */
export type CaseTemplatesRepositoryFactoryInput = {
  /**
   *
   */
  request?: typeof fetch;
  /**
   *
   */
  getToken?: () => string | null;
  /**
   *
   */
  apiPath?: string;
};

function buildListUrl(
  runtime: RepositoryRuntime,
  params?: CaseTemplatesListParams,
): string {
  const qs = new URLSearchParams();
  if (params?.caseType) qs.set("caseType", params.caseType);
  if (params?.includeInactive) qs.set("includeInactive", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return `${runtime.apiPath}${suffix}`;
}

/**
 * 案件資料蓝图仓储工厂。
 *
 * @param input - 可选的请求实现、token 获取器与 API 路径覆盖
 * @returns 仓储实例
 */
export function createCaseTemplatesRepository(
  input: CaseTemplatesRepositoryFactoryInput = {},
): CaseTemplatesRepository {
  const runtime: RepositoryRuntime = createRepositoryRuntime({
    request: input.request,
    getToken: input.getToken ?? getAdminAccessToken,
    apiPath: input.apiPath ?? "/api/case-templates",
    writeErrorCode: "CT_WRITE_ERROR",
    entityLabel: "CaseTemplate",
    errorName: "CaseTemplateRepositoryError",
  });

  return {
    list: (params) =>
      requestAndAdapt({
        runtime,
        url: buildListUrl(runtime, params),
        method: "GET",
        adapt: adaptList,
        errorMessage: "Invalid case templates list response",
      }),
    get: (id) =>
      requestAndAdapt({
        runtime,
        url: `${runtime.apiPath}/${id}`,
        method: "GET",
        adapt: adaptDetail,
        errorMessage: "Invalid case template detail response",
      }),
    create: (params) =>
      requestAndAdapt({
        runtime,
        url: runtime.apiPath,
        method: "POST",
        body: params,
        adapt: adaptItem,
        errorMessage: "Invalid case template create response",
      }),
    update: (id, params) =>
      requestAndAdapt({
        runtime,
        url: `${runtime.apiPath}/${id}`,
        method: "PATCH",
        body: params,
        adapt: adaptItem,
        errorMessage: "Invalid case template update response",
      }),
    getCaseTypeOptions: () =>
      requestAndAdapt({
        runtime,
        url: `${runtime.apiPath}/case-type-options`,
        method: "GET",
        adapt: adaptCaseTypeOptions,
        errorMessage: "Invalid case type options response",
      }),
  };
}
