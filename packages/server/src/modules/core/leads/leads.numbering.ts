import type { TenantDbTx } from "../tenancy/tenantDb";

const LEAD_PREFIX = "LEAD";

/**
 * 生成线索编号所需的年月片段。
 *
 * @param date - 用于格式化的日期。
 * @returns `YYYYMM` 形式的年月字符串。
 */
export function formatLeadYearMonth(date: Date): string {
  return `${String(date.getFullYear())}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 按约定格式拼装线索编号。
 *
 * @param date - 线索编号所属月份。
 * @param seq - 当月顺序号。
 * @returns `LEAD-YYYYMM-NNNN` 格式的线索编号。
 */
export function formatLeadNumber(date: Date, seq: number): string {
  return `${LEAD_PREFIX}-${formatLeadYearMonth(date)}-${String(seq).padStart(4, "0")}`;
}

/**
 * 为指定组织生成下一个线索编号。
 *
 * @param tx - 当前租户事务对象。
 * @param orgId - 组织 ID。
 * @returns 可用于新建线索的下一个编号。
 */
export async function generateNextLeadNumber(
  tx: TenantDbTx,
  orgId: string,
): Promise<string> {
  const now = new Date();
  const prefix = `${LEAD_PREFIX}-${formatLeadYearMonth(now)}-`;
  const result = await tx.query<{ max_seq: string }>(
    `select coalesce(max(substring(trim(lead_no) from '([0-9]+)$')::int), 0)::text as max_seq
     from leads
     where org_id = $1
       and trim(coalesce(lead_no, '')) like $2`,
    [orgId, `${prefix}%`],
  );
  const seq = parseInt(result.rows[0]?.max_seq ?? "0", 10) + 1;
  return formatLeadNumber(now, seq);
}

/**
 * 判断错误是否为线索编号唯一索引冲突。
 *
 * @param error - 待识别的异常对象。
 * @returns 命中 `uq_leads_lead_no` 唯一约束冲突时返回 `true`。
 */
export function isLeadNumberConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: string; constraint?: string };
  return pgError.code === "23505" && pgError.constraint === "uq_leads_lead_no";
}
