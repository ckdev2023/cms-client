import { getAdminAccessToken } from "../../../auth/model/adminSession";
import type { DocumentListItem } from "../types";
import {
  adaptDocumentItems,
  type CaseNameLookup,
  type DocumentItemDtoLike,
} from "./DocumentAdapter";

const DOCUMENT_ITEMS_API_PATH = "/api/document-items";
const CASES_API_PATH = "/api/cases";
const DEFAULT_LIMIT = 200;

/**
 * 资料中心仓储错误码：与 BUG-079 相关的轻量错误模型，供 UI 区分场景化提示。
 */
export type DocumentRepositoryErrorCode =
  | "NETWORK"
  | "UNAUTHORIZED"
  | "BAD_RESPONSE";

/**
 * 资料中心仓储错误。
 */
export class DocumentRepositoryError extends Error {
  /** 错误码。 */
  readonly code: DocumentRepositoryErrorCode;
  /** HTTP 状态码（如有）。 */
  readonly status?: number;

  /**
   * 构造一个资料中心仓储错误。
   *
   * @param input - 错误描述
   * @param input.code - 业务错误码
   * @param input.message - 可读错误消息
   * @param input.status - HTTP 状态码（如有）
   * @param input.cause - 原始异常（如有）
   */
  constructor(input: {
    code: DocumentRepositoryErrorCode;
    message: string;
    status?: number;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "DocumentRepositoryError";
    this.code = input.code;
    this.status = input.status;
  }
}

/**
 * 资料中心仓储工厂参数。
 */
export interface DocumentRepositoryFactoryInput {
  /** 自定义 fetch 实现（默认 `globalThis.fetch`），用于测试注入。 */
  request?: typeof fetch;
  /** 自定义 Token 取值函数（默认 `getAdminAccessToken`）。 */
  getToken?: () => string | null;
  /** 当前时间提供者（默认 `() => new Date()`），便于过期判定可控测试。 */
  now?: () => Date;
}

/**
 * 资料中心仓储能力定义。
 */
export interface DocumentRepository {
  /**
   * 拉取跨案件资料列表。后端尚无 `/api/documents` 聚合端点；
   * 该方法基于 `/api/document-items` + `/api/cases?view=summary` 在前端组装。
   */
  listDocuments(): Promise<DocumentListItem[]>;
}

interface DocumentItemListResponse {
  items: unknown;
  total?: unknown;
}

interface CaseSummaryRow {
  id: string;
  caseName?: string | null;
}

function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
}

function buildHeaders(token: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new DocumentRepositoryError({
      code: "BAD_RESPONSE",
      message: "Document API response was not valid JSON",
      status: response.status,
      cause,
    });
  }
}

function toDocumentItemDto(value: unknown): DocumentItemDtoLike | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.caseId !== "string") return null;
  if (typeof r.name !== "string" || typeof r.status !== "string") return null;
  return {
    id: r.id,
    caseId: r.caseId,
    name: r.name,
    status: r.status,
    ownerSide: typeof r.ownerSide === "string" ? r.ownerSide : "applicant",
    dueAt: typeof r.dueAt === "string" ? r.dueAt : null,
    lastFollowUpAt:
      typeof r.lastFollowUpAt === "string" ? r.lastFollowUpAt : null,
  };
}

function toCaseSummaryRow(value: unknown): CaseSummaryRow | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const caseName =
    typeof r.caseName === "string"
      ? r.caseName
      : typeof r.case_name === "string"
        ? r.case_name
        : null;
  return { id: r.id, caseName };
}

async function fetchDocumentItems(
  request: typeof fetch,
  token: string | null,
): Promise<DocumentItemDtoLike[]> {
  let response: Response;
  try {
    response = await request(
      `${DOCUMENT_ITEMS_API_PATH}?limit=${DEFAULT_LIMIT}`,
      {
        method: "GET",
        headers: buildHeaders(token),
      },
    );
  } catch (cause) {
    throw new DocumentRepositoryError({
      code: "NETWORK",
      message: "Failed to fetch document items",
      cause,
    });
  }
  if (response.status === 401 || response.status === 403) {
    throw new DocumentRepositoryError({
      code: "UNAUTHORIZED",
      message: "Document API requires authentication",
      status: response.status,
    });
  }
  if (!response.ok) {
    throw new DocumentRepositoryError({
      code: "BAD_RESPONSE",
      message: `Document API returned HTTP ${response.status}`,
      status: response.status,
    });
  }
  const body = (await readJson(response)) as DocumentItemListResponse;
  if (!body || !Array.isArray(body.items)) {
    throw new DocumentRepositoryError({
      code: "BAD_RESPONSE",
      message: "Document API response missing items array",
      status: response.status,
    });
  }
  const rows: DocumentItemDtoLike[] = [];
  for (const raw of body.items) {
    const dto = toDocumentItemDto(raw);
    if (dto) rows.push(dto);
  }
  return rows;
}

async function fetchCaseNames(
  request: typeof fetch,
  token: string | null,
): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  try {
    const response = await request(
      `${CASES_API_PATH}?view=summary&limit=${DEFAULT_LIMIT}`,
      {
        method: "GET",
        headers: buildHeaders(token),
      },
    );
    if (!response.ok) return lookup;
    const body = (await response.json()) as { items?: unknown };
    if (!body || !Array.isArray(body.items)) return lookup;
    for (const raw of body.items) {
      const row = toCaseSummaryRow(raw);
      if (row && row.caseName) lookup.set(row.id, row.caseName);
    }
  } catch {
    // Best-effort: caseName 缺失时回退到 caseId 即可，不阻塞主列表。
  }
  return lookup;
}

/**
 * 创建资料中心仓储实例。
 *
 * @param input - 工厂参数
 * @returns 资料中心仓储
 */
export function createDocumentRepository(
  input: DocumentRepositoryFactoryInput = {},
): DocumentRepository {
  const request = input.request ?? getDefaultRequest();
  const getToken = input.getToken ?? (() => getAdminAccessToken());
  const now = input.now ?? (() => new Date());

  return {
    async listDocuments(): Promise<DocumentListItem[]> {
      const token = getToken();
      const [rows, caseNames] = await Promise.all([
        fetchDocumentItems(request, token),
        fetchCaseNames(request, token),
      ]);
      const lookup: CaseNameLookup = (id) => caseNames.get(id);
      return adaptDocumentItems(rows, lookup, now());
    },
  };
}
