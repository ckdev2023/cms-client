import type { Pool, PoolClient } from "pg";

import { hashPassword } from "./auth.service";
import { parseRole, type Role } from "./roles";

const DEFAULT_LOCAL_ORG_ID = "00000000-0000-4000-8000-000000000010";
const DEFAULT_LOCAL_USER_ID = "00000000-0000-4000-8000-000000000011";
const DEFAULT_LOCAL_GROUP_ID = "00000000-0000-4000-8000-000000000020";
const DEFAULT_LOCAL_ORG_NAME = "Local Demo Office";
const DEFAULT_LOCAL_USER_NAME = "Local Admin";
const DEFAULT_LOCAL_USER_EMAIL = "admin@local.test";
const DEFAULT_LOCAL_ROLE: Role = "owner";
const DEFAULT_LOCAL_PASSWORD_PARTS = ["Admin", "123", "!"];

type OrganizationRow = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  org_id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * 本地管理员初始化输入。
 */
export type LocalAdminBootstrapInput = {
  dbUrl: string;
  orgId: string;
  orgName: string;
  userId: string;
  userName: string;
  email: string;
  password: string;
  role: Role;
};

/**
 * 本地管理员初始化结果。
 */
export type LocalAdminBootstrapResult = {
  dbUrl: string;
  orgId: string;
  orgName: string;
  userId: string;
  userName: string;
  email: string;
  password: string;
  role: Role;
};

/**
 * 从环境变量读取本地管理员初始化参数。
 *
 * 未提供 `DB_URL` 时，默认回退到 docker-compose 的本地 PostgreSQL 地址。
 *
 * @param env 环境变量
 * @returns 初始化输入
 */
export function readLocalAdminBootstrapInput(
  env: NodeJS.ProcessEnv = process.env,
): LocalAdminBootstrapInput {
  const roleInput = readOptionalEnv("ADMIN_INIT_ROLE", env, DEFAULT_LOCAL_ROLE);
  const role = parseRole(roleInput);
  if (!role) {
    throw new Error(`Invalid ADMIN_INIT_ROLE: ${roleInput}`);
  }

  const password = readOptionalEnv(
    "ADMIN_INIT_PASSWORD",
    env,
    DEFAULT_LOCAL_PASSWORD_PARTS.join(""),
  );
  if (password.trim().length === 0) {
    throw new Error("ADMIN_INIT_PASSWORD is required");
  }

  return {
    dbUrl: readDbUrl(env),
    orgId: readOptionalEnv("ADMIN_INIT_ORG_ID", env, DEFAULT_LOCAL_ORG_ID),
    orgName: readOptionalEnv(
      "ADMIN_INIT_ORG_NAME",
      env,
      DEFAULT_LOCAL_ORG_NAME,
    ),
    userId: readOptionalEnv("ADMIN_INIT_USER_ID", env, DEFAULT_LOCAL_USER_ID),
    userName: readOptionalEnv(
      "ADMIN_INIT_USER_NAME",
      env,
      DEFAULT_LOCAL_USER_NAME,
    ),
    email: normalizeEmail(
      readOptionalEnv("ADMIN_INIT_EMAIL", env, DEFAULT_LOCAL_USER_EMAIL),
    ),
    password,
    role,
  };
}

/**
 * 幂等创建或更新本地组织与管理员账号。
 *
 * @param pool PostgreSQL 连接池
 * @param input 初始化输入
 * @returns 初始化结果
 */
export async function bootstrapLocalAdmin(
  pool: Pool,
  input: LocalAdminBootstrapInput,
): Promise<LocalAdminBootstrapResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const organization = await upsertOrganization(client, input);
    const user = await upsertAdminUser(client, input, organization.id);
    const groupId = await upsertDefaultGroup(client, organization.id);
    await upsertDefaultMembership(client, user.id, groupId);
    await upsertDefaultStorageRoot(client, organization.id);

    await client.query("COMMIT");

    return {
      dbUrl: input.dbUrl,
      orgId: organization.id,
      orgName: organization.name,
      userId: user.id,
      userName: user.name,
      email: user.email,
      password: input.password,
      role: input.role,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function upsertOrganization(
  client: PoolClient,
  input: LocalAdminBootstrapInput,
): Promise<OrganizationRow> {
  const result = await client.query<OrganizationRow>(
    `
      insert into organizations (id, name, plan, status)
      values ($1, $2, 'free', 'active')
      on conflict (id) do update
      set name = excluded.name,
          plan = excluded.plan,
          status = excluded.status,
          updated_at = now()
      returning id, name
    `,
    [input.orgId, input.orgName],
  );

  const row = result.rows.at(0);
  if (!row) throw new Error("Failed to initialize local organization");
  return row;
}

async function upsertAdminUser(
  client: PoolClient,
  input: LocalAdminBootstrapInput,
  orgId: string,
): Promise<UserRow> {
  const passwordHash = await hashPassword(input.password);
  const roleId = await resolveSystemRoleId(client, orgId, input.role);
  const result = await client.query<UserRow>(
    `
      insert into users (id, org_id, name, email, password_hash, role_id, status)
      values ($1, $2, $3, $4, $5, $6, 'active')
      on conflict (org_id, email) do update
      set name = excluded.name,
          password_hash = excluded.password_hash,
          role_id = excluded.role_id,
          status = excluded.status,
          updated_at = now()
      returning id, org_id, name, email,
        (select code from roles where id = users.role_id) as role
    `,
    [
      input.userId,
      orgId,
      input.userName,
      normalizeEmail(input.email),
      passwordHash,
      roleId,
    ],
  );

  const row = result.rows.at(0);
  if (!row) throw new Error("Failed to initialize local admin user");
  return {
    ...row,
    email: normalizeEmail(row.email),
  };
}

async function resolveSystemRoleId(
  client: PoolClient,
  orgId: string,
  roleCode: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `select id from roles where org_id = $1 and code = $2 and is_system = true limit 1`,
    [orgId, roleCode],
  );
  const row = result.rows.at(0);
  if (!row) {
    throw new Error(
      `System role "${roleCode}" not found for org ${orgId}; ensure migration 050 seed has run.`,
    );
  }
  return row.id;
}

async function upsertDefaultGroup(
  client: PoolClient,
  orgId: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      insert into groups (id, org_id, name, active_flag)
      values ($1, $2, $3, true)
      on conflict (id) do update
      set name = excluded.name,
          active_flag = true,
          updated_at = now()
      returning id
    `,
    [DEFAULT_LOCAL_GROUP_ID, orgId, "Local Default Group"],
  );

  const row = result.rows.at(0);
  if (!row) throw new Error("Failed to initialize local default group");
  return row.id;
}

async function upsertDefaultMembership(
  client: PoolClient,
  userId: string,
  groupId: string,
): Promise<void> {
  await client.query(
    `
      insert into user_group_memberships
        (user_id, group_id, is_primary_group, active_flag, joined_at)
      values ($1, $2, true, true, now())
      on conflict (user_id, group_id) where active_flag = true do update
      set is_primary_group = true,
          active_flag = true
    `,
    [userId, groupId],
  );
}

async function upsertDefaultStorageRoot(
  client: PoolClient,
  orgId: string,
): Promise<void> {
  const rootPath = `/data/cms/${orgId}/files`;
  const rootLabel = "本地资料根目录";

  await client.query(
    `
      update organizations
      set settings = jsonb_set(
        jsonb_set(
          coalesce(settings, '{}'::jsonb),
          '{storageRoot,rootPath}',
          to_jsonb($2::text),
          true
        ),
        '{storageRoot,rootLabel}',
        to_jsonb($3::text),
        true
      ),
      updated_at = now()
      where id = $1
        and (settings->'storageRoot'->>'rootPath' is null
             or settings->'storageRoot'->>'rootPath' = '')
    `,
    [orgId, rootPath, rootLabel],
  );
}

function readDbUrl(env: NodeJS.ProcessEnv): string {
  const configured = env.DB_URL?.trim();
  if (configured && configured.length > 0) return configured;
  return buildDefaultLocalDbUrl();
}

function buildDefaultLocalDbUrl(): string {
  const url = new URL("postgres://localhost:5433/cms");
  url.username = "cms";
  url.password = "cms";
  return url.toString();
}

function readOptionalEnv(
  key: string,
  env: NodeJS.ProcessEnv,
  fallback: string,
): string {
  const value = env[key]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
