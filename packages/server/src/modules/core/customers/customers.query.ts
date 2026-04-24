import type { Customer } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import type {
  CustomerDuplicateCheckInput,
  CustomerDuplicateField,
  CustomerListInput,
  CustomerListScope,
} from "./customers.types";
import {
  CUSTOMER_GROUP_FIELDS,
  CUSTOMER_KANA_FIELDS,
  CUSTOMER_NAME_FIELDS,
  CUSTOMER_OWNER_FIELDS,
  activeCustomerPredicate,
  collectComparableNames,
  normalizeComparableString,
  normalizeOptionalString,
  normalizePhone,
  pushParam,
} from "./customers.utils";

const CUSTOMER_COLLABORATOR_FIELDS = [
  "collaborator_user_ids",
  "collaboratorUserIds",
] as const;

function buildCustomerCollaboratorExistsClause(
  alias: string,
  userParamRef: string,
): string {
  return CUSTOMER_COLLABORATOR_FIELDS.map(
    (field) => `
      exists (
        select 1
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(${alias}.base_profile->'${field}') = 'array'
              then ${alias}.base_profile->'${field}'
            else '[]'::jsonb
          end
        ) as collaborator_id
        where collaborator_id = ${userParamRef}
      )
    `,
  ).join(" or ");
}

function buildActiveCasesExistsClause(alias: string): string {
  return `exists (
    select 1
    from cases ca
    where ca.customer_id = ${alias}.id
      and coalesce(ca.metadata->>'_status', '') is distinct from 'deleted'
      and ca.archived_at is null
      and coalesce(ca.stage, '') is distinct from 'S9'
  )`;
}

function buildCustomerGroupMatchClause(
  alias: string,
  groupParamRef: string,
): string {
  return CUSTOMER_GROUP_FIELDS.map(
    (field) => `${alias}.base_profile->>'${field}' = ${groupParamRef}`,
  ).join(" or ");
}

function buildCaseBaseWhere(alias: string, customerAlias: string): string {
  return `${alias}.customer_id = ${customerAlias}.id
      and coalesce(${alias}.metadata->>'_status', '') is distinct from 'deleted'`;
}

function buildTotalCasesExpr(customerAlias: string): string {
  return `(select count(*)::int
    from cases ca
    where ${buildCaseBaseWhere("ca", customerAlias)})`;
}

function buildActiveCasesExpr(customerAlias: string): string {
  return `(select count(*)::int
    from cases ca
    where ${buildCaseBaseWhere("ca", customerAlias)}
      and ca.archived_at is null
      and coalesce(ca.stage, ca.status, '') is distinct from 'S9')`;
}

function buildArchivedCasesExpr(customerAlias: string): string {
  return `(select count(*)::int
    from cases ca
    where ${buildCaseBaseWhere("ca", customerAlias)}
      and (
        ca.archived_at is not null
        or coalesce(ca.stage, ca.status, '') = 'S9'
      ))`;
}

function buildCaseNamesExpr(customerAlias: string): string {
  return `(select coalesce(jsonb_agg(case_name order by created_at desc, id desc), '[]'::jsonb)
    from (
      select distinct on (ca.case_name, ca.id)
        ca.case_name,
        ca.created_at,
        ca.id
      from cases ca
      where ${buildCaseBaseWhere("ca", customerAlias)}
        and nullif(trim(coalesce(ca.case_name, '')), '') is not null
    ) named_cases)`;
}

function buildLastCaseCreatedDateExpr(customerAlias: string): string {
  return `(select max(ca.created_at)
    from cases ca
    where ${buildCaseBaseWhere("ca", customerAlias)})`;
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function buildOwnerMatchClause(alias: string, userParamRef: string): string {
  return CUSTOMER_OWNER_FIELDS.map(
    (field) => `${alias}.base_profile->>'${field}' = ${userParamRef}`,
  ).join(" or ");
}

function buildJsonbIlikeClauses(
  alias: string,
  fields: readonly string[],
  patternRef: string,
): string[] {
  return fields.map(
    (field) =>
      `coalesce(${alias}.base_profile->>'${field}', '') ilike ${patternRef} escape '\\'`,
  );
}

function buildPhoneContainsClause(alias: string, patternRef: string): string {
  return `regexp_replace(coalesce(${alias}.base_profile->>'phone', ''), '[^0-9]+', '', 'g') like ${patternRef} escape '\\'`;
}

function resolveRequestedScope(
  ctx: RequestContext,
  scope?: CustomerListScope,
): CustomerListScope {
  if (ctx.role === "manager" || ctx.role === "owner") return scope ?? "all";
  if (scope === "all") return "mine";
  return scope ?? "mine";
}

function appendScopeWhere(
  ctx: RequestContext,
  alias: string,
  scope: CustomerListScope,
  where: string[],
  params: unknown[],
): void {
  if (scope === "all") return;

  if (scope === "group") {
    if (!ctx.groupId) {
      where.push("1 = 0");
      return;
    }

    const groupParam = pushParam(params, ctx.groupId);
    where.push(`(${buildCustomerGroupMatchClause(alias, groupParam)})`);
    return;
  }

  const userParam = pushParam(params, ctx.userId);
  where.push(`(
    ${buildOwnerMatchClause(alias, userParam)}
    or ${buildCustomerCollaboratorExistsClause(alias, userParam)}
  )`);
}

function appendKeywordWhere(
  alias: string,
  keyword: string | null,
  where: string[],
  params: unknown[],
): void {
  if (!keyword) return;

  const patternRef = pushParam(params, `%${escapeLikePattern(keyword)}%`);
  const rawKeywordClauses = buildJsonbIlikeClauses(
    alias,
    [...CUSTOMER_NAME_FIELDS, ...CUSTOMER_KANA_FIELDS, "phone", "email"],
    patternRef,
  );
  const normalizedKeywordPhone = normalizePhone(keyword);

  if (normalizedKeywordPhone) {
    const phonePatternRef = pushParam(
      params,
      `%${escapeLikePattern(normalizedKeywordPhone)}%`,
    );
    rawKeywordClauses.push(buildPhoneContainsClause(alias, phonePatternRef));
  }

  where.push(`(${rawKeywordClauses.join(" or ")})`);
}

function appendPhoneWhere(
  alias: string,
  phone: string | null,
  where: string[],
  params: unknown[],
): void {
  if (!phone) return;
  const phoneRef = pushParam(params, `%${escapeLikePattern(phone)}%`);
  where.push(buildPhoneContainsClause(alias, phoneRef));
}

function appendJsonbFieldEqualsWhere(
  alias: string,
  value: string | null,
  fields: readonly string[],
  where: string[],
  params: unknown[],
): void {
  if (!value) return;
  const valueRef = pushParam(params, value);
  where.push(
    `(${fields
      .map((field) => `${alias}.base_profile->>'${field}' = ${valueRef}`)
      .join(" or ")})`,
  );
}

function appendJsonbFieldContainsWhere(
  alias: string,
  value: string | null,
  fields: readonly string[],
  where: string[],
  params: unknown[],
): void {
  if (!value) return;
  const valueRef = pushParam(params, `%${escapeLikePattern(value)}%`);
  where.push(
    `(${fields
      .map(
        (field) =>
          `coalesce(${alias}.base_profile->>'${field}', '') ilike ${valueRef} escape '\\'`,
      )
      .join(" or ")})`,
  );
}

function appendActiveCasesWhere(
  alias: string,
  activeCases: CustomerListInput["activeCases"],
  where: string[],
): void {
  if (activeCases === "yes") {
    where.push(buildActiveCasesExistsClause(alias));
  }
  if (activeCases === "no") {
    where.push(`not ${buildActiveCasesExistsClause(alias)}`);
  }
}

function buildDuplicateNameClause(nameRef: string): string {
  return `(${[...CUSTOMER_NAME_FIELDS, ...CUSTOMER_KANA_FIELDS]
    .map(
      (field) =>
        `lower(trim(coalesce(c.base_profile->>'${field}', ''))) = ${nameRef}`,
    )
    .join(" or ")})`;
}

/**
 * 构造客户列表查询条件。
 * @param ctx 请求上下文
 * @param input 列表过滤参数
 * @returns where 子句与参数数组
 */
export function buildCustomerListWhere(
  ctx: RequestContext,
  input: CustomerListInput,
): { whereClause: string; params: unknown[] } {
  const alias = "c";
  const where = [activeCustomerPredicate(alias)];
  const params: unknown[] = [];
  const scope = resolveRequestedScope(ctx, input.scope);

  appendScopeWhere(ctx, alias, scope, where, params);
  appendKeywordWhere(
    alias,
    normalizeOptionalString(input.keyword),
    where,
    params,
  );
  appendPhoneWhere(alias, normalizePhone(input.phone), where, params);
  appendJsonbFieldContainsWhere(
    alias,
    normalizeOptionalString(input.email),
    ["email"],
    where,
    params,
  );
  appendJsonbFieldEqualsWhere(
    alias,
    normalizeOptionalString(input.group),
    CUSTOMER_GROUP_FIELDS,
    where,
    params,
  );
  appendJsonbFieldEqualsWhere(
    alias,
    normalizeOptionalString(input.owner),
    CUSTOMER_OWNER_FIELDS,
    where,
    params,
  );
  appendActiveCasesWhere(alias, input.activeCases, where);

  return { whereClause: `where ${where.join(" and ")}`, params };
}

/**
 * 构造客户列表查询所需的 select 字段，包含案件聚合列。
 * @param alias 客户表在 SQL 中使用的别名
 * @returns 客户列表查询可直接插入的 select 片段
 */
export function buildCustomerListSelect(alias = "c"): string {
  return [
    `${alias}.*`,
    `${buildTotalCasesExpr(alias)} as total_cases`,
    `${buildActiveCasesExpr(alias)} as active_cases`,
    `${buildArchivedCasesExpr(alias)} as archived_cases`,
    `${buildCaseNamesExpr(alias)} as case_names`,
    `${buildLastCaseCreatedDateExpr(alias)} as last_case_created_date`,
  ].join(",\n        ");
}

/**
 * 构造客户详情查询所需的 select 字段。
 * @param alias 客户表在 SQL 中使用的别名
 * @returns 客户详情查询可直接插入的 select 片段
 */
export function buildCustomerDetailSelect(alias = "c"): string {
  return buildCustomerListSelect(alias);
}

/**
 * 规范化去重输入并构造 SQL 条件片段。
 * @param input 去重检查参数
 * @param params SQL 参数数组
 * @returns 去重 where 条件与归一化后的输入值
 */
export function buildCustomerDuplicateWhere(
  input: CustomerDuplicateCheckInput,
  params: unknown[],
): {
  where: string[];
  normalizedName: string | null;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
} {
  const where: string[] = [];
  const normalizedName = normalizeComparableString(input.name);
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedEmail = normalizeComparableString(input.email);

  if (input.excludeCustomerId) {
    const excludeRef = pushParam(params, input.excludeCustomerId);
    where.push(`c.id <> ${excludeRef}`);
  }
  if (normalizedName) {
    where.push(buildDuplicateNameClause(pushParam(params, normalizedName)));
  }
  if (normalizedPhone) {
    where.push(
      `regexp_replace(coalesce(c.base_profile->>'phone', ''), '[^0-9]+', '', 'g') = ${pushParam(params, normalizedPhone)}`,
    );
  }
  if (normalizedEmail) {
    where.push(
      `lower(trim(coalesce(c.base_profile->>'email', ''))) = ${pushParam(params, normalizedEmail)}`,
    );
  }

  return { where, normalizedName, normalizedPhone, normalizedEmail };
}

/**
 * 计算客户去重命中的字段集合。
 * @param customer 客户实体
 * @param normalizedName 归一化姓名
 * @param normalizedPhone 归一化电话
 * @param normalizedEmail 归一化邮箱
 * @returns 命中的字段列表
 */
export function getCustomerDuplicateMatchedFields(
  customer: Customer,
  normalizedName: string | null,
  normalizedPhone: string | null,
  normalizedEmail: string | null,
): CustomerDuplicateField[] {
  const matchedFields: CustomerDuplicateField[] = [];
  const customerNames = collectComparableNames(customer.baseProfile);

  if (normalizedName && customerNames.includes(normalizedName)) {
    matchedFields.push("name");
  }
  if (
    normalizedPhone &&
    normalizePhone(customer.baseProfile.phone) === normalizedPhone
  ) {
    matchedFields.push("phone");
  }
  if (
    normalizedEmail &&
    normalizeComparableString(customer.baseProfile.email) === normalizedEmail
  ) {
    matchedFields.push("email");
  }

  return matchedFields;
}
