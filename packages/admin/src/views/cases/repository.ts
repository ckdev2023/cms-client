import type {
  CaseDetail,
  CaseGroupOption,
  CaseListItem,
  CaseOwnerOption,
  CaseCreateCustomerOption,
  CaseSampleKey,
  CaseSummaryCardData,
  CaseTemplateDef,
  FamilyScenario,
} from "./types";
import type { CaseListQueryParams } from "./query";
import {
  CASE_GROUP_OPTIONS,
  CASE_OWNER_OPTIONS,
  CASE_STAGES,
} from "./constants";
import {
  CURRENT_CASE_VIEWER,
  deriveCaseSummaryCards,
  findOwnerOption,
  SAMPLE_CASE_LIST,
  SAMPLE_SUMMARY_CARDS,
  filterByScope,
} from "./fixtures";
import {
  SAMPLE_CREATE_CUSTOMERS,
  SAMPLE_CREATE_TEMPLATES,
  FAMILY_SCENARIO,
} from "./fixtures-create";
import { CASE_DETAIL_SAMPLES } from "./fixtures-detail";

/**
 *
 */
export interface CaseViewerContext {
  /**
   *
   */
  ownerId: string;
  /**
   *
   */
  ownerLabel: string;
  /**
   *
   */
  groupId: string;
  /**
   *
   */
  groupLabel: string;
}

// ─── Filter Matching ────────────────────────────────────────────

const REPO_FIELD_MATCHERS: [keyof CaseListQueryParams, keyof CaseListItem][] = [
  ["stage", "stageId"],
  ["owner", "ownerId"],
  ["group", "groupId"],
  ["risk", "riskStatus"],
  ["validation", "validationStatus"],
  ["customerId", "customerId"],
];

/**
 * 判断单条案件是否满足所有筛选条件（不含 scope）。
 *
 * @param item - 待检查案件
 * @param params - 筛选参数
 * @returns 是否通过所有筛选
 */
export function matchesCaseFilters(
  item: CaseListItem,
  params: CaseListQueryParams,
): boolean {
  if (params.search) {
    const q = params.search.toLowerCase();
    const haystack = [item.name, item.id, item.applicant, item.type]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  for (const [pk, ik] of REPO_FIELD_MATCHERS) {
    if (params[pk] && item[ik] !== params[pk]) return false;
  }
  return true;
}

// ─── Repository Interface ───────────────────────────────────────

/**
 *
 */
export interface CaseRepository {
  /**
   *
   */
  listCases(params: CaseListQueryParams): CaseListItem[];
  /**
   *
   */
  getSummaryCards(items?: CaseListItem[]): CaseSummaryCardData[];
  /**
   *
   */
  getCaseById(id: string): CaseListItem | undefined;
  /**
   *
   */
  getCaseBySampleKey(key: CaseSampleKey): CaseListItem | undefined;
  /**
   *
   */
  getDetail(id: string): CaseDetail | undefined;
  /**
   *
   */
  getOwnerOptions(): readonly CaseOwnerOption[];
  /**
   *
   */
  getGroupOptions(): readonly CaseGroupOption[];
  /**
   *
   */
  getOwnerById(id: string): CaseOwnerOption | undefined;
  /**
   *
   */
  getTemplates(): readonly CaseTemplateDef[];
  /**
   *
   */
  getCreateCustomers(): readonly CaseCreateCustomerOption[];
  /**
   *
   */
  getCreateTemplates(): readonly CaseTemplateDef[];
  /**
   *
   */
  getFamilyScenario(): FamilyScenario;
  /**
   *
   */
  getViewer(): CaseViewerContext;
}

// ─── Lookup helpers ─────────────────────────────────────────────

function buildSampleKeyMap(data: CaseListItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of data) {
    if (c.sampleKey && !map.has(c.sampleKey)) map.set(c.sampleKey, c.id);
  }
  return map;
}

function findDetailBySampleKey(
  data: CaseListItem[],
  id: string,
): CaseDetail | undefined {
  for (const detail of Object.values(CASE_DETAIL_SAMPLES)) {
    if (detail.id === id) return detail;
  }
  const listItem = data.find((c) => c.id === id);
  if (listItem?.sampleKey) {
    const sample =
      CASE_DETAIL_SAMPLES[
        listItem.sampleKey as keyof typeof CASE_DETAIL_SAMPLES
      ];
    if (sample) return { ...sample, id };
  }
  return undefined;
}

// ─── Mock Implementation ────────────────────────────────────────

/**
 * 创建案件 mock repository。
 *
 * @param data - 案件数据源
 * @param viewer - 当前查看人上下文
 * @returns CaseRepository 实例
 */
export function createMockCaseRepository(
  data: CaseListItem[] = SAMPLE_CASE_LIST,
  viewer: CaseViewerContext = CURRENT_CASE_VIEWER,
): CaseRepository {
  const sampleKeyMap = buildSampleKeyMap(data);

  return {
    listCases(params) {
      return filterByScope(data, params.scope).filter((item) =>
        matchesCaseFilters(item, params),
      );
    },
    getSummaryCards(items) {
      return items ? deriveCaseSummaryCards(items) : [...SAMPLE_SUMMARY_CARDS];
    },
    getCaseById: (id) => data.find((c) => c.id === id),
    getCaseBySampleKey(key) {
      const caseId = sampleKeyMap.get(key);
      return caseId ? data.find((c) => c.id === caseId) : undefined;
    },
    getDetail: (id) => findDetailBySampleKey(data, id),
    getOwnerOptions: () => CASE_OWNER_OPTIONS,
    getGroupOptions: () => CASE_GROUP_OPTIONS,
    getOwnerById: findOwnerOption,
    getTemplates: () => SAMPLE_CREATE_TEMPLATES,
    getCreateCustomers: () => SAMPLE_CREATE_CUSTOMERS,
    getCreateTemplates: () => SAMPLE_CREATE_TEMPLATES,
    getFamilyScenario: () => FAMILY_SCENARIO,
    getViewer: () => viewer,
  };
}

/**
 * 获取阶段定义。
 *
 * @param stageId - 阶段 ID
 * @returns 阶段定义或 undefined
 */
export function getStageInfo(stageId: string) {
  return CASE_STAGES[stageId as keyof typeof CASE_STAGES];
}
