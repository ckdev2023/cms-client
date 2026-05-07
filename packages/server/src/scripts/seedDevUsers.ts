import type { PoolClient } from "pg";

import { hashPassword } from "../modules/core/auth/auth.service";

const SEED_ORG_ID = "00000000-0000-4000-8000-000000000010";

type DevUserSeed = {
  id: string;
  name: string;
  email: string;
};

const DEV_USER_SEEDS: readonly DevUserSeed[] = [
  {
    id: "00000000-0000-4000-c000-000000000001",
    name: "鈴木",
    email: "suzuki@local.test",
  },
  {
    id: "00000000-0000-4000-c000-000000000002",
    name: "田中",
    email: "tanaka@local.test",
  },
  {
    id: "00000000-0000-4000-c000-000000000003",
    name: "李",
    email: "li@local.test",
  },
  {
    id: "00000000-0000-4000-c000-000000000004",
    name: "佐藤",
    email: "sato@local.test",
  },
  {
    id: "00000000-0000-4000-c000-000000000005",
    name: "山田翔太",
    email: "yamada-s@local.test",
  },
  {
    id: "00000000-0000-4000-c000-000000000006",
    name: "高橋健太",
    email: "takahashi-k@local.test",
  },
  {
    id: "00000000-0000-4000-c000-000000000007",
    name: "鈴木あかり",
    email: "suzuki-a@local.test",
  },
];

/**
 * Local Demo Office に 7 名の fixture staff ユーザーを追加する。
 *
 * `localAdminBootstrap` 後に呼び出すことを想定。
 * `ON CONFLICT` + user count チェックで幂等を保証。
 *
 * @param client - トランザクション内の PoolClient
 */
export async function seedDevUsers(client: PoolClient): Promise<void> {
  const countResult = await client.query<{ cnt: string }>(
    `SELECT count(*)::text AS cnt FROM users WHERE org_id = $1`,
    [SEED_ORG_ID],
  );
  const existing = Number.parseInt(countResult.rows[0]?.cnt ?? "0", 10);
  if (existing > 1) return;

  const roleResult = await client.query<{ id: string }>(
    `SELECT id FROM roles WHERE org_id = $1 AND code = 'staff' AND is_system = true LIMIT 1`,
    [SEED_ORG_ID],
  );
  const roleId = roleResult.rows[0]?.id;
  if (!roleId) {
    throw new Error(
      `System role "staff" not found for org ${SEED_ORG_ID}; ensure migration 050 seed has run.`,
    );
  }

  const passwordHash = await hashPassword("Admin123!");

  for (const user of DEV_USER_SEEDS) {
    await client.query(
      `INSERT INTO users (id, org_id, name, email, password_hash, role_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       ON CONFLICT (id) DO NOTHING`,
      [user.id, SEED_ORG_ID, user.name, user.email, passwordHash, roleId],
    );
  }
}

export { DEV_USER_SEEDS };
