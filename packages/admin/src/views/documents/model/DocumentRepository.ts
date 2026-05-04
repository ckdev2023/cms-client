import { getAdminAccessToken } from "../../../auth/model/adminSession";
import type { CompletionRate } from "../types";
import {
  adaptDocumentItems,
  type DocumentItemDtoLike,
} from "./DocumentAdapter";
import {
  getDefaultRequest,
  buildHeaders,
  readJson,
  postJson,
  getJson,
} from "./DocumentRepositoryHttp";
import type { SharedExpiryRiskData } from "../types";
import {
  DocumentRepositoryError,
  toFullDocumentItemDto,
  toDocumentFileDto,
  parseCompletionRate,
  parseSharedExpiryRiskData,
  type DocumentRepositoryFactoryInput,
  type ListDocumentsParams,
  type TransitionParams,
  type WaiveParams,
  type UploadLocalArchiveParams,
  type CreateItemParams,
  type LinkRefParams,
  type DocumentItemDto,
  type DocumentFileDto,
  type ListDocumentFilesResult,
  type PaginatedListResult,
  type ReferenceCandidateDto,
  type LinkRefResult,
  type DocumentRepository,
} from "./DocumentRepositoryTypes";

export { DocumentRepositoryError } from "./DocumentRepositoryTypes";

export type {
  DocumentRepositoryErrorCode,
  DocumentRepositoryFactoryInput,
  ListDocumentsParams,
  TransitionParams,
  WaiveParams,
  UploadLocalArchiveParams,
  CreateItemParams,
  LinkRefParams,
  DocumentItemDto,
  DocumentFileDto,
  ListDocumentFilesResult,
  PaginatedListResult,
  ReferenceCandidateDto,
  LinkRefResult,
  DocumentRepository,
} from "./DocumentRepositoryTypes";

const DOCUMENT_ITEMS_API_PATH = "/api/document-items";
const DOCUMENT_FILES_API_PATH = "/api/document-files";
const DOCUMENT_ASSETS_API_PATH = "/api/document-assets";
const REFS_API_PATH = "/api/document-requirement-file-refs";
const CASES_API_PATH = "/api/cases";
const DEFAULT_LIMIT = 200;

// ─── List-specific helpers ───────────────────────────────────────

interface DocumentItemListResponse {
  items: unknown;
  total?: unknown;
}

interface CaseSummaryRow {
  id: string;
  caseName?: string | null;
}

function toDocumentItemDtoLike(value: unknown): DocumentItemDtoLike | null {
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
    referenceCount:
      typeof r.referenceCount === "number" ? r.referenceCount : undefined,
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

function setIfTruthy(
  qs: URLSearchParams,
  key: string,
  v: string | undefined | null,
): void {
  if (v) qs.set(key, v);
}

function buildListQueryString(params: ListDocumentsParams | undefined): string {
  const qs = new URLSearchParams();
  setIfTruthy(qs, "caseId", params?.caseId);
  setIfTruthy(qs, "status", params?.status);
  const statusIn = params?.statusIn;
  if (statusIn && statusIn.length > 0) qs.set("statusIn", statusIn.join(","));
  setIfTruthy(qs, "ownerSide", params?.ownerSide);
  qs.set("limit", String(params?.limit ?? DEFAULT_LIMIT));
  setIfTruthy(qs, "page", params?.page ? String(params.page) : undefined);
  return qs.toString();
}

async function fetchDocumentItems(
  request: typeof fetch,
  token: string | null,
  params?: ListDocumentsParams,
): Promise<{ rows: DocumentItemDtoLike[]; total: number }> {
  const qs = buildListQueryString(params);
  let response: Response;
  try {
    response = await request(`${DOCUMENT_ITEMS_API_PATH}?${qs}`, {
      method: "GET",
      headers: buildHeaders(token),
    });
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
      message: `Document API returned HTTP ${response.status}`, // i18n-skip
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
    const dto = toDocumentItemDtoLike(raw);
    if (dto) rows.push(dto);
  }
  const total = typeof body.total === "number" ? body.total : rows.length;
  return { rows, total };
}

async function fetchCaseNames(
  request: typeof fetch,
  token: string | null,
): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  try {
    const response = await request(
      `${CASES_API_PATH}?view=summary&limit=${DEFAULT_LIMIT}`,
      { method: "GET", headers: buildHeaders(token) },
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

// ─── Repository method implementations ───────────────────────────

type Ctx = {
  request: typeof fetch;
  getToken: () => string | null;
  now: () => Date;
};

async function repoListDocuments(
  c: Ctx,
  params?: ListDocumentsParams,
): Promise<PaginatedListResult> {
  const token = c.getToken();
  const [{ rows, total }, names] = await Promise.all([
    fetchDocumentItems(c.request, token, params),
    fetchCaseNames(c.request, token),
  ]);
  return {
    items: adaptDocumentItems(rows, (id) => names.get(id), c.now()),
    total,
  };
}

async function repoTransition(
  c: Ctx,
  id: string,
  p: TransitionParams,
): Promise<DocumentItemDto> {
  return toFullDocumentItemDto(
    await postJson(
      c.request,
      `${DOCUMENT_ITEMS_API_PATH}/${id}/transition`,
      c.getToken(),
      { toStatus: p.toStatus },
      "transition",
    ),
  );
}

async function repoFollowUp(c: Ctx, id: string): Promise<DocumentItemDto> {
  return toFullDocumentItemDto(
    await postJson(
      c.request,
      `${DOCUMENT_ITEMS_API_PATH}/${id}/follow-up`,
      c.getToken(),
      {},
      "followUp",
    ),
  );
}

async function repoWaive(
  c: Ctx,
  id: string,
  p: WaiveParams,
): Promise<DocumentItemDto> {
  return toFullDocumentItemDto(
    await postJson(
      c.request,
      `${DOCUMENT_ITEMS_API_PATH}/${id}/waive`,
      c.getToken(),
      { reasonCode: p.reasonCode, note: p.note ?? null },
      "waive",
    ),
  );
}

async function repoUpload(
  c: Ctx,
  p: UploadLocalArchiveParams,
): Promise<DocumentFileDto> {
  const body = {
    requirementId: p.requirementId,
    fileName: p.fileName,
    relativePath: p.relativePath,
    storageType: "local_server",
    expiryDate: p.expiryDate ?? null,
  };
  return toDocumentFileDto(
    await postJson(
      c.request,
      `${DOCUMENT_FILES_API_PATH}/upload`,
      c.getToken(),
      body,
      "uploadLocalArchive",
    ),
  );
}

async function repoListFiles(
  c: Ctx,
  reqId: string,
  opts?: { page?: number; limit?: number },
): Promise<ListDocumentFilesResult> {
  const qs = new URLSearchParams();
  qs.set("requirementId", reqId);
  setIfTruthy(qs, "page", opts?.page ? String(opts.page) : undefined);
  setIfTruthy(qs, "limit", opts?.limit ? String(opts.limit) : undefined);
  const json = await getJson(
    c.request,
    `${DOCUMENT_FILES_API_PATH}?${qs.toString()}`,
    c.getToken(),
    "listFiles",
  );
  const raw = json as { items?: unknown; total?: unknown };
  const items = Array.isArray(raw?.items)
    ? (raw.items as unknown[]).map(toDocumentFileDto)
    : [];
  return {
    items,
    total: typeof raw?.total === "number" ? raw.total : items.length,
  };
}

async function repoGetCompletionRate(
  c: Ctx,
  caseId: string,
): Promise<CompletionRate> {
  const url = `${DOCUMENT_ITEMS_API_PATH}/completion-rate?caseId=${encodeURIComponent(caseId)}`;
  return parseCompletionRate(
    await getJson(c.request, url, c.getToken(), "getCompletionRate"),
  );
}

async function repoCreateItem(
  c: Ctx,
  p: CreateItemParams,
): Promise<DocumentItemDto> {
  const body = {
    caseId: p.caseId,
    checklistItemCode: p.checklistItemCode,
    name: p.name,
    ownerSide: p.ownerSide,
    dueAt: p.dueAt ?? null,
    note: p.note ?? null,
    category: p.category,
  };
  return toFullDocumentItemDto(
    await postJson(
      c.request,
      DOCUMENT_ITEMS_API_PATH,
      c.getToken(),
      body,
      "createItem",
    ),
  );
}

async function repoListReferenceCandidates(
  c: Ctx,
  requirementId: string,
  opts?: { limit?: number },
): Promise<ReferenceCandidateDto[]> {
  const qs = new URLSearchParams();
  qs.set("requirementId", requirementId);
  qs.set("candidates", "true");
  if (opts?.limit) qs.set("limit", String(opts.limit));
  const json = await getJson(
    c.request,
    `${REFS_API_PATH}?${qs.toString()}`,
    c.getToken(),
    "listReferenceCandidates",
  );
  const rows = Array.isArray(json) ? json : [];
  return rows.map(toReferenceCandidateDto);
}

function toReferenceCandidateDto(value: unknown): ReferenceCandidateDto {
  const r = (value ?? {}) as Record<string, unknown>;
  return {
    fileId: typeof r.fileId === "string" ? r.fileId : "",
    requirementId: typeof r.requirementId === "string" ? r.requirementId : "",
    fileName: typeof r.fileName === "string" ? r.fileName : "",
    versionNo: typeof r.versionNo === "number" ? r.versionNo : 0,
    uploadedAt: typeof r.uploadedAt === "string" ? r.uploadedAt : "",
    expiryDate: typeof r.expiryDate === "string" ? r.expiryDate : null,
    sourceCaseId: typeof r.sourceCaseId === "string" ? r.sourceCaseId : "",
    sourceRequirementName:
      typeof r.sourceRequirementName === "string"
        ? r.sourceRequirementName
        : "",
    reviewStatus: typeof r.reviewStatus === "string" ? r.reviewStatus : "",
  };
}

async function repoLinkRef(c: Ctx, p: LinkRefParams): Promise<LinkRefResult> {
  const body: Record<string, unknown> = {
    requirementId: p.requirementId,
    fileVersionId: p.fileVersionId,
  };
  if (p.linkedFromRequirementId) {
    body.linkedFromRequirementId = p.linkedFromRequirementId;
  }
  const json = await postJson(
    c.request,
    REFS_API_PATH,
    c.getToken(),
    body,
    "linkRef",
  );
  return toLinkRefResult(json);
}

function toLinkRefResult(value: unknown): LinkRefResult {
  const r = (value ?? {}) as Record<string, unknown>;
  return {
    id: typeof r.id === "string" ? r.id : "",
    requirementId: typeof r.requirementId === "string" ? r.requirementId : "",
    fileVersionId: typeof r.fileVersionId === "string" ? r.fileVersionId : "",
    refMode: typeof r.refMode === "string" ? r.refMode : "cross_case_link",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
  };
}

async function repoGetSharedExpiryRisk(
  c: Ctx,
  assetId: string,
): Promise<SharedExpiryRiskData> {
  const url = `${DOCUMENT_ASSETS_API_PATH}/${encodeURIComponent(assetId)}/shared-expiry-risk`;
  return parseSharedExpiryRiskData(
    await getJson(c.request, url, c.getToken(), "getSharedExpiryRisk"),
  );
}

// ─── Factory ─────────────────────────────────────────────────────

/**
 * 创建资料中心仓储实例。
 *
 * @param input - 工厂参数
 * @returns 资料中心仓储
 */
export function createDocumentRepository(
  input: DocumentRepositoryFactoryInput = {},
): DocumentRepository {
  const c: Ctx = {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken ?? (() => getAdminAccessToken()),
    now: input.now ?? (() => new Date()),
  };
  return {
    listDocuments: (p) => repoListDocuments(c, p),
    transition: (id, p) => repoTransition(c, id, p),
    followUp: (id) => repoFollowUp(c, id),
    waive: (id, p) => repoWaive(c, id, p),
    uploadLocalArchive: (p) => repoUpload(c, p),
    listFiles: (id, o) => repoListFiles(c, id, o),
    getCompletionRate: (id) => repoGetCompletionRate(c, id),
    createItem: (p) => repoCreateItem(c, p),
    listReferenceCandidates: (id, o) => repoListReferenceCandidates(c, id, o),
    linkRef: (p) => repoLinkRef(c, p),
    getSharedExpiryRisk: (id) => repoGetSharedExpiryRisk(c, id),
  };
}
