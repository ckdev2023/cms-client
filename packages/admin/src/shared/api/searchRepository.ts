import {
  createRepositoryRuntime,
  requestAndAdapt,
  type RepositoryFactoryInput,
  type RepositoryRuntime,
} from "./repositoryRuntime";

/**
 *
 */
export type SearchHitType =
  | "customer"
  | "case"
  | "lead"
  | "document"
  | "task"
  | "conversation";

/**
 *
 */
export interface SearchHit {
  /**
   *
   */
  type: SearchHitType;
  /**
   *
   */
  id: string;
  /**
   *
   */
  title: string;
  /**
   *
   */
  subtitle?: string;
  /**
   *
   */
  href: string;
  /**
   *
   */
  score?: number;
}

/**
 *
 */
export interface SearchResponse {
  /**
   *
   */
  query: string;
  /**
   *
   */
  hits: readonly SearchHit[];
  /**
   *
   */
  truncated: boolean;
}

/**
 *
 */
export interface SearchRepository {
  /**
   *
   */
  search(query: string): Promise<SearchResponse>;
}

/**
 *
 */
export interface SearchRepositoryFactoryInput {
  /**
   *
   */
  request?: typeof fetch;
  /**
   *
   */
  getToken: () => string | null;
  /**
   *
   */
  apiPath?: string;
}

const VALID_HIT_TYPES = new Set<string>([
  "customer",
  "case",
  "lead",
  "document",
  "task",
  "conversation",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function adaptHit(value: unknown): SearchHit | null {
  const record = asRecord(value);
  if (!record) return null;

  const type = nonEmptyString(record.type);
  if (!type || !VALID_HIT_TYPES.has(type)) return null;

  const id = nonEmptyString(record.id);
  const title = nonEmptyString(record.title);
  const href = nonEmptyString(record.href);
  if (!id || !title || !href) return null;

  return {
    type: type as SearchHitType,
    id,
    title,
    subtitle: typeof record.subtitle === "string" ? record.subtitle : undefined,
    href,
    score:
      typeof record.score === "number" && Number.isFinite(record.score)
        ? record.score
        : undefined,
  };
}

function adaptSearchResponse(value: unknown): SearchResponse | null {
  const record = asRecord(value);
  if (!record) return null;

  const query = record.query;
  if (typeof query !== "string") return null;

  const rawHits = record.hits;
  if (!Array.isArray(rawHits)) return null;

  const hits = rawHits
    .map(adaptHit)
    .filter((hit): hit is SearchHit => hit !== null);

  return {
    query,
    hits,
    truncated: record.truncated === true,
  };
}

function createRuntime(input: SearchRepositoryFactoryInput): RepositoryRuntime {
  return createRepositoryRuntime({
    request: input.request,
    getToken: input.getToken,
    apiPath: input.apiPath ?? "/api/admin/search",
    entityLabel: "Search",
    errorName: "SearchRepositoryError",
  } satisfies RepositoryFactoryInput);
}

/**
 * 创建基于 HTTP 的搜索仓储实例。
 *
 * @param input - 工厂配置（request / token / apiPath）
 * @returns SearchRepository 实现
 */
export function createHttpSearchRepository(
  input: SearchRepositoryFactoryInput,
): SearchRepository {
  const runtime = createRuntime(input);

  return {
    async search(query: string): Promise<SearchResponse> {
      const trimmed = query.trim();
      if (!trimmed) {
        return { query: trimmed, hits: [], truncated: false };
      }

      const url = `${runtime.apiPath}?${new URLSearchParams({ q: trimmed })}`;

      return requestAndAdapt({
        runtime,
        url,
        method: "GET",
        adapt: adaptSearchResponse,
        errorMessage: "Invalid search response",
      });
    },
  };
}

const MAX_HITS_PER_TYPE = 5;
const MAX_TOTAL_HITS = 30;

function scoreHit(hit: SearchHit, query: string): number {
  const t = hit.title.toLowerCase();
  if (t.startsWith(query)) return 2;
  if (t.includes(query)) return 1;
  if (hit.subtitle?.toLowerCase().includes(query)) return 0.5;
  return 0;
}

/**
 * 创建内存过滤的 mock 搜索仓储，供测试与本地 fallback 使用。
 *
 * @param hits - 可搜索的命中项种子数据
 * @returns SearchRepository 实现
 */
export function createMockSearchRepository(
  hits: readonly SearchHit[] = [],
): SearchRepository {
  return {
    async search(query: string): Promise<SearchResponse> {
      const trimmed = query.trim().toLowerCase();
      if (!trimmed) {
        return { query: trimmed, hits: [], truncated: false };
      }

      const scored = hits
        .map((h) => ({ ...h, score: scoreHit(h, trimmed) }))
        .filter((h) => h.score > 0)
        .sort((a, b) => b.score - a.score);

      const grouped = new Map<SearchHitType, SearchHit[]>();
      for (const h of scored) {
        const bucket = grouped.get(h.type) ?? [];
        if (bucket.length < MAX_HITS_PER_TYPE) {
          bucket.push(h);
          grouped.set(h.type, bucket);
        }
      }

      const result: SearchHit[] = [];
      for (const bucket of grouped.values()) {
        result.push(...bucket);
      }
      const truncated = result.length > MAX_TOTAL_HITS;
      const final = truncated ? result.slice(0, MAX_TOTAL_HITS) : result;

      return { query: trimmed, hits: final, truncated };
    },
  };
}
