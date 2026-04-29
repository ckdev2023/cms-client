import { BadRequestException } from "@nestjs/common";

import type { Customer } from "../model/coreEntities";
import type { TenantDbTx } from "../tenancy/tenantDb";

import type { CustomerQueryRow } from "./customers.types";
import { CUSTOMER_COLS, mapCustomerRow } from "./customers.utils";

const CUSTOMER_NUMBER_FIELDS = [
  "customerNumber",
  "customer_number",
  "customerNo",
  "customer_no",
] as const;

const DEFAULT_CUSTOMER_PREFIX = "CUS";

/**
 * 从客户基础档案中提取首个可用的客户编号。
 *
 * @param baseProfile - 待读取的客户基础档案。
 * @returns 规范化后的客户编号；不存在时返回 `null`。
 */
export function resolveCustomerNumberValue(
  baseProfile: Record<string, unknown>,
): string | null {
  for (const field of CUSTOMER_NUMBER_FIELDS) {
    const value = baseProfile[field];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * 将客户编号写回到 canonical `customerNumber` 字段。
 *
 * @param baseProfile - 已校验的客户基础档案。
 * @returns 补齐 canonical 字段后的基础档案对象。
 */
export function withCanonicalCustomerNumber(
  baseProfile: Record<string, unknown>,
): Record<string, unknown> {
  const customerNumber = resolveCustomerNumberValue(baseProfile);
  if (!customerNumber || baseProfile.customerNumber === customerNumber) {
    return baseProfile;
  }
  return { ...baseProfile, customerNumber };
}

/**
 * 生成客户编号所需的年月片段。
 *
 * @param date - 用于格式化的日期。
 * @returns `YYYYMM` 形式的年月字符串。
 */
export function formatCustomerYearMonth(date: Date): string {
  return `${String(date.getFullYear())}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 按约定格式拼装客户编号。
 *
 * @param date - 客户编号所属月份。
 * @param seq - 当月顺序号。
 * @returns `CUS-YYYYMM-NNNN` 格式的客户编号。
 */
export function formatCustomerNumber(date: Date, seq: number): string {
  return `${DEFAULT_CUSTOMER_PREFIX}-${formatCustomerYearMonth(date)}-${String(seq).padStart(4, "0")}`;
}

/**
 * 为指定组织生成下一个客户编号。
 *
 * @param tx - 当前租户事务对象。
 * @param orgId - 组织 ID。
 * @returns 可用于新建客户的下一个客户编号。
 */
export async function generateNextCustomerNumber(
  tx: TenantDbTx,
  orgId: string,
): Promise<string> {
  const now = new Date();
  const result = await tx.query<{ max_seq: string }>(
    `select coalesce(max(substring(trim(base_profile->>'customerNumber') from '([0-9]+)$')::int), 0)::text as max_seq
     from customers
     where org_id = $1
       and trim(coalesce(base_profile->>'customerNumber', '')) like $2`,
    [orgId, `${DEFAULT_CUSTOMER_PREFIX}-${formatCustomerYearMonth(now)}-%`],
  );
  const seq = parseInt(result.rows[0]?.max_seq ?? "0", 10) + 1;
  return formatCustomerNumber(now, seq);
}

/**
 * 判断错误是否为客户编号唯一索引冲突。
 *
 * @param error - 待识别的异常对象。
 * @returns 命中客户编号唯一约束冲突时返回 `true`。
 */
export function isCustomerNumberConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: string; constraint?: string };
  return (
    pgError.code === "23505" &&
    pgError.constraint === "uq_customers_org_customer_number"
  );
}

/**
 * 在事务中完成客户创建，并确保客户编号存在且唯一。
 *
 * @param tx - 当前租户事务对象。
 * @param input - 新建客户所需的持久化输入。
 * @param input.orgId - 组织 ID。
 * @param input.type - 客户类型。
 * @param input.baseProfile - 已校验的客户基础档案。
 * @param input.contacts - 客户联系人列表。
 * @returns 创建后的客户领域实体。
 */
export async function createCustomerWithNumbering(
  tx: TenantDbTx,
  input: {
    orgId: string;
    type: string;
    baseProfile: Record<string, unknown>;
    contacts: Record<string, unknown>[];
  },
): Promise<Customer> {
  const explicitCustomerNumber = resolveCustomerNumberValue(input.baseProfile);
  for (
    let attempt = 0;
    attempt < (explicitCustomerNumber ? 1 : 2);
    attempt += 1
  ) {
    const numberedBaseProfile = {
      ...input.baseProfile,
      customerNumber:
        explicitCustomerNumber ??
        (await generateNextCustomerNumber(tx, input.orgId)),
    };
    try {
      const result = await tx.query<CustomerQueryRow>(
        `insert into customers (org_id, type, base_profile, contacts)
         values ($1, $2, $3::jsonb, $4::jsonb)
         returning ${CUSTOMER_COLS}`,
        [
          input.orgId,
          input.type,
          JSON.stringify(numberedBaseProfile),
          JSON.stringify(input.contacts),
        ],
      );
      const row = result.rows.at(0);
      if (!row) throw new BadRequestException("Failed to create customer");
      return mapCustomerRow(row);
    } catch (error) {
      if (
        attempt === 0 &&
        !explicitCustomerNumber &&
        isCustomerNumberConflict(error)
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new BadRequestException("Failed to create customer");
}
