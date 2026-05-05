/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns, jsdoc/require-description */
/**
 * 建案/更新写入路径上的引用归一化 + 校验。
 *
 * 拆分自 `cases.service.ts`，专注 customer / group / owner / assistant
 * 的 UUID/slug/email/display name 三态归一化与组织内存在性断言：
 *
 * - `resolveExplicitGroupId` — 显式 groupId（UUID/slug/name）→ groups.id
 * - `resolveOwnerUserId` — owner 入参（UUID/email/name/current-user 占位）→ users.id
 * - `resolveCustomerGroupId` — 从 base_profile 解析 group_id
 * - `assertBmvCaseCreationGate` — BMV 建案前置门禁
 * - `assertBelongsToOrg` — 表名白名单 + RLS 过滤断言
 *
 * 详见 BUG-159 / BUG-165 / BMV-Gate 注释。
 */
import { BadRequestException } from "@nestjs/common";

import type { CaseCreateInput } from "./cases.types";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { checkBmvCaseCreationGate } from "./cases.types-bmv-gate";
import { resolveCustomerBmvProfile } from "../customers/customers.dto-mappers";
import type { TenantDbTx } from "../tenancy/tenantDb";
import { normalizeObject } from "../../../infra/utils/normalize";

/** 允许 `assertBelongsToOrg` 使用的表名白名单（防 SQL 注入）。 */
const ALLOWED_ASSERT_TABLES = new Set(["customers", "users", "companies"]);

/**
 * 将显式 groupId 入参（UUID / slug / 显示名）规范化为 groups.id（UUID）。
 *
 * 兼容前端 admin 链路：建案向导 Step 3 的 `draft.group` 来自客户 DTO 的
 * `customer.group` 字段（即 `groups.name`），既可能是 catalog slug
 * （如 `tokyo-1`），也可能是真实 UUID。统一在 service 入口做归一化，
 * 避免 cases.group_id 列直接接收非 UUID 字符串导致 FK 违例 / 500。
 *
 * - 入参为空/null → 返回 null
 * - 入参为 UUID → 校验组织内是否存在；不存在抛 400
 * - 入参为非 UUID 字符串 → 按 `groups.name` 精确匹配；未命中抛 400
 * @param tx
 * @param orgId
 * @param raw
 */
export async function resolveExplicitGroupId(
  tx: TenantDbTx,
  orgId: string,
  raw: string | null | undefined,
): Promise<string | null> {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const result = await tx.query<{ id: string }>(
    `select id from groups
     where org_id = $1 and (id::text = $2 or name = $2)
     limit 1`,
    [orgId, trimmed],
  );
  const found = result.rows.at(0)?.id ?? null;
  if (!found) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.GROUP_NOT_FOUND +
        `: groupId "${trimmed}" does not match any active group in the organization`,
    );
  }
  return found;
}

/**
 * 将显式 ownerUserId 入参（UUID / email / display name / admin 占位）
 * 规范化为 users.id（UUID）。
 *
 * 兼容前端 admin 链路：建案向导 Step 3 的 owner 选项来自前端 fixture
 * catalog（如 `suzuki` / `tanaka`）以及 `withCurrentUserOwnerOption` 注入的
 * 当前登录用户（value 可能是 email 或 `current-user:<name>` 占位）。统一在
 * service 入口做归一化，避免 `cases.owner_user_id` 列直接接收非 UUID 字符串
 * 触发 PG 22P02 / 23503 → 500（参见 BUG-165 / R13 BUG-159 v2 对称模式）。
 *
 * - 入参为 undefined/null/空白 → 继承 `fallbackUserId`（当前请求用户）
 * - 入参以 `current-user:` 前缀打头 → 视同缺省，继承 `fallbackUserId`
 * - 入参为 UUID → 校验组织内是否存在；不存在抛 400 OWNER_NOT_FOUND
 * - 入参匹配 `users.email`（不区分大小写）或 `users.name` → 返回真实 id
 * - 完全无法解析 → 400 OWNER_NOT_FOUND（避免 PG 22P02 → 500）
 * @param tx
 * @param raw
 * @param fallbackUserId
 */
export async function resolveOwnerUserId(
  tx: TenantDbTx,
  raw: string | null | undefined,
  fallbackUserId: string,
): Promise<string> {
  if (raw === undefined || raw === null) return fallbackUserId;
  const trimmed = raw.trim();
  if (!trimmed) return fallbackUserId;
  if (trimmed.toLowerCase().startsWith("current-user:")) {
    return fallbackUserId;
  }

  const result = await tx.query<{ id: string }>(
    `select id from users
     where id::text = $1 or lower(email) = lower($1) or name = $1
     limit 1`,
    [trimmed],
  );
  const found = result.rows.at(0)?.id ?? null;
  if (!found) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.OWNER_NOT_FOUND +
        `: ownerUserId "${trimmed}" does not match any active user in the organization`,
    );
  }
  return found;
}

/**
 * 从 Customer.base_profile 中解析 group_id，再查 groups 表确认有效性。
 *
 * 接受两种存储形态以兼容历史数据与新建路径（BUG-159）：
 * - `groups.name = base_profile->>'group_id'/'groupId'/'group'`（slug / 显示名）
 * - `groups.id::text = base_profile->>'group_id'/'groupId'/'group'`（migration 034
 *   将 group_id UUID 字面回填到 baseProfile 的场景）
 *
 * 若 customer 未关联 group 或 group 不存在于 groups 表，返回 null。
 * @param tx
 * @param customerId
 */
export async function resolveCustomerGroupId(
  tx: TenantDbTx,
  customerId: string,
): Promise<string | null> {
  const result = await tx.query<{ group_id: string }>(
    `SELECT g.id AS group_id
     FROM customers c
     CROSS JOIN LATERAL (
       SELECT coalesce(
         nullif(trim(c.base_profile->>'group_id'), ''),
         nullif(trim(c.base_profile->>'groupId'), ''),
         nullif(trim(c.base_profile->>'group'), '')
       ) AS group_val
     ) cv
     JOIN groups g ON g.org_id = c.org_id
       AND (g.name = cv.group_val OR g.id::text = cv.group_val)
     WHERE c.id = $1
     LIMIT 1`,
    [customerId],
  );
  return result.rows.at(0)?.group_id ?? null;
}

/**
 *
 * @param tx
 * @param input
 */
export async function assertBmvCaseCreationGate(
  tx: TenantDbTx,
  input: CaseCreateInput,
): Promise<void> {
  const row = await tx.query<{ base_profile: unknown }>(
    `select base_profile from customers where id = $1 limit 1`,
    [input.customerId],
  );
  const baseProfile = normalizeObject(row.rows.at(0)?.base_profile);
  const bmvProfile = resolveCustomerBmvProfile(baseProfile);

  const gate = checkBmvCaseCreationGate({
    caseTypeCode: input.caseTypeCode,
    customerId: input.customerId,
    bmvQuestionnaireStatus: bmvProfile.questionnaireStatus,
    bmvQuoteStatus: bmvProfile.quoteStatus,
    bmvSignStatus: bmvProfile.signStatus,
    bmvIntakeStatus: bmvProfile.intakeStatus,
  });

  if (!gate.allowed) {
    throw new BadRequestException({
      code: CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED,
      blockers: gate.blockers,
    });
  }
}

/**
 * 断言记录属于当前 org（RLS 过滤 + 表名白名单防注入）。
 * @param tx
 * @param table
 * @param id
 */
export async function assertBelongsToOrg(
  tx: TenantDbTx,
  table: string,
  id: string,
): Promise<void> {
  if (!ALLOWED_ASSERT_TABLES.has(table)) {
    throw new Error(`assertBelongsToOrg: disallowed table "${table}"`);
  }
  const r = await tx.query<{ id: string }>(
    `select id from ${table} where id = $1 limit 1`,
    [id],
  );
  if (r.rows.length === 0)
    throw new BadRequestException(
      `Referenced ${table} record not found in current organization`,
    );
}
