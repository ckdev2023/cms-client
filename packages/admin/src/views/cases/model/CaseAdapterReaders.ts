/**
 * CaseAdapterReaders — API URL / 路径构造层（p0-fe-002a-03 / p0-fe-002b-01 / p0-fe-002b-03 冻结边界）。
 *
 * 职责：
 * - `buildCaseListSearchParams`：将列表筛选参数序列化为 `URLSearchParams`。
 * - `buildCaseDetailPath`：构造 REST 资源路径。
 *
 * **不属于此文件的职责：**
 * - Vue Router query 解析 → `query.ts`
 * - 写入请求体构造 → `CaseAdapterWriteBuilders`
 * - 响应体适配（含删除） → `CaseAdapterMutationResults`
 *
 * **字段名映射来源：** `CASE_LIST_HTTP_FIELD_MAP`（CaseAdapterTypes）
 * 运行时序列化必须与该映射表一致，contract tests 会校验。
 *
 * **客户端专属过滤字段（不序列化到 HTTP）：**
 * - `validation` — 仅在 useCaseListModel 客户端过滤中使用
 *
 * **Customer 下游复用（p0-fe-002b-03 冻结）：**
 * `CustomerRepository.listRelatedCases` 直接构造 `/api/cases?customerId=`，
 * 未经此 builder。两侧共用同一服务端接口，HTTP 参数名 `customerId` 必须一致。
 * `customerId` / `page` / `limit` / `view=summary` 的序列化规则
 * 由 `CaseAdapterReaders.customer-summary-page.test.ts` 锁定。
 * 变更此 builder 的字段名映射时须同步检查 customer 下游调用方式。
 */

import type { CaseListParams } from "./CaseAdapterTypes";
import { CASE_LIST_HTTP_FIELD_MAP } from "./CaseAdapterTypes";

function normalizeFilterValue(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/**
 * 把前端 domain 风险值（`normal/attention/critical`）反向映射到
 * 后端 cases.risk_level 列存储的字面值（`low/medium/high`）。
 *
 * 兼容 admin domain 与 DB 列两套命名：domain 用于 UI / URL，
 * DB 字面值用于 SQL 精确匹配。未识别的取值原样保留（前向兼容）。
 *
 * @param value 已 trim 的风险过滤取值
 * @returns 对齐后端列存的取值
 */
function mapRiskFilterToDbLiteral(value: string): string {
  switch (value) {
    case "critical":
      return "high";
    case "attention":
      return "medium";
    case "normal":
      return "low";
    default:
      return value;
  }
}

/**
 * 将列表筛选参数转换为 URLSearchParams，空值自动省略。
 *
 * 始终附加 `view=summary`，以获取包含 `customerName` / `groupName` /
 * `latestValidation` 等展示字段的富响应。customer 下游通过
 * `{ customerId }` 复用同一构造器时，也会自动获得 summary 格式。
 *
 * 核心过滤参数（scope/search/stage/owner/group/risk/riskBucket）统一经过
 * `normalizeFilterValue` 去除前后空白并省略空字符串与 null/undefined。
 * `risk` 取值会从前端 domain（`normal/attention/critical`）反向映射到
 * cases.risk_level 列字面值（`low/medium/high`），保持 SQL 精确匹配可命中；
 * `riskBucket` 透传，与 dashboard 风险并集口径对齐。
 * 字段名映射统一来自 `CASE_LIST_HTTP_FIELD_MAP`。
 *
 * @param params - 案件列表筛选参数
 * @returns 可拼接到 URL 的查询参数
 */
export function buildCaseListSearchParams(
  params: CaseListParams,
): URLSearchParams {
  const sp = new URLSearchParams();
  const map = CASE_LIST_HTTP_FIELD_MAP;

  const scope = normalizeFilterValue(params.scope);
  if (scope) sp.set(map.scope, scope);

  const search = normalizeFilterValue(params.search);
  if (search) sp.set(map.search, search);

  const stage = normalizeFilterValue(params.stage);
  if (stage) sp.set(map.stage, stage);

  const owner = normalizeFilterValue(params.owner);
  if (owner) sp.set(map.owner, owner);

  const group = normalizeFilterValue(params.group);
  if (group) sp.set(map.group, group);

  const risk = normalizeFilterValue(params.risk);
  if (risk) sp.set(map.risk, mapRiskFilterToDbLiteral(risk));

  const riskBucket = normalizeFilterValue(params.riskBucket);
  if (riskBucket) sp.set(map.riskBucket, riskBucket);

  const customerId = normalizeFilterValue(params.customerId);
  if (customerId) sp.set(map.customerId, customerId);

  if (typeof params.page === "number") sp.set(map.page, String(params.page));
  if (typeof params.limit === "number") sp.set(map.limit, String(params.limit));

  sp.set("view", "summary");
  return sp;
}

/**
 * 构造单个案件资源的 REST 路径。
 *
 * @param apiPath - 案件接口基础路径
 * @param id - 案件 ID（将被 URI 编码）
 * @returns 完整资源路径
 */
export function buildCaseDetailPath(apiPath: string, id: string): string {
  return `${apiPath}/${encodeURIComponent(id)}`;
}
