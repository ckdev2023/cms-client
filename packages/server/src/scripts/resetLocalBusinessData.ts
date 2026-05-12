import type { PoolClient } from "pg";

import { createPgPool } from "../infra/db/createPgPool";
import {
  bootstrapLocalAdmin,
  DEFAULT_LOCAL_GROUP_ID,
  readLocalAdminBootstrapInput,
  type LocalAdminBootstrapInput,
} from "../modules/core/auth/localAdminBootstrap";

function requireConfirmEnv(): void {
  if (process.env.RESET_LOCAL_BUSINESS_CONFIRM !== "1") {
    throw new Error(
      "Refusing to run: set RESET_LOCAL_BUSINESS_CONFIRM=1 to execute (destructive).",
    );
  }
}

async function assertSingleOrgOrExplicitOk(client: PoolClient): Promise<void> {
  const { rows } = await client.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM organizations`,
  );
  const n = Number.parseInt(rows[0]?.c ?? "0", 10);
  if (n > 1 && process.env.RESET_LOCAL_BUSINESS_MULTI_ORG_OK !== "1") {
    throw new Error(
      `Refusing: ${String(n)} organizations — set RESET_LOCAL_BUSINESS_MULTI_ORG_OK=1 if you intend to wipe only the bootstrap org's scoped deletes (script still deletes portal rows by org match).`,
    );
  }
}

function buildOrgBusinessDeleteSteps(leadScope: string): string[] {
  return [
    `DELETE FROM payment_records WHERE org_id = $1`,
    `DELETE FROM billing_records WHERE org_id = $1`,
    `DELETE FROM submission_package_items WHERE submission_package_id IN
       (SELECT id FROM submission_packages WHERE org_id = $1)`,
    `DELETE FROM submission_packages WHERE org_id = $1`,
    `DELETE FROM document_requirement_file_refs WHERE requirement_id IN
       (SELECT id FROM document_items WHERE org_id = $1)`,
    `DELETE FROM review_records WHERE org_id = $1`,
    `DELETE FROM validation_runs WHERE org_id = $1`,
    `DELETE FROM generated_documents WHERE org_id = $1`,
    `DELETE FROM document_files WHERE org_id = $1`,
    `DELETE FROM document_items WHERE org_id = $1`,
    `DELETE FROM document_assets WHERE org_id = $1`,
    `DELETE FROM case_stage_history WHERE case_id IN
       (SELECT id FROM cases WHERE org_id = $1)`,
    `DELETE FROM case_parties WHERE org_id = $1`,
    `DELETE FROM residence_periods WHERE org_id = $1`,
    `DELETE FROM tasks WHERE org_id = $1`,
    `DELETE FROM communication_logs WHERE org_id = $1`,
    `DELETE FROM timeline_logs WHERE org_id = $1`,
    `DELETE FROM reminders WHERE org_id = $1`,
    `DELETE FROM messages WHERE org_id = $1 OR conversation_id IN
       (SELECT id FROM conversations WHERE org_id = $1)`,
    `DELETE FROM conversations WHERE org_id = $1`,
    `DELETE FROM user_documents WHERE org_id = $1 OR case_id IN
       (SELECT id FROM cases WHERE org_id = $1)`,
    `DELETE FROM intake_forms WHERE lead_id IN (${leadScope})`,
    `DELETE FROM lead_followups WHERE lead_id IN (${leadScope})`,
    `DELETE FROM lead_logs WHERE lead_id IN (${leadScope})`,
    `DELETE FROM leads WHERE org_id = $1 OR assigned_org_id = $1
       OR group_id IN (SELECT id FROM groups WHERE org_id = $1)`,
    `DELETE FROM jobs WHERE org_id = $1`,
    `DELETE FROM cases WHERE org_id = $1`,
    `DELETE FROM contact_persons WHERE org_id = $1`,
    `DELETE FROM companies WHERE org_id = $1`,
    `DELETE FROM customers WHERE org_id = $1`,
  ];
}

async function deleteOrgBusinessData(
  client: PoolClient,
  orgId: string,
): Promise<void> {
  const leadScope = `
    SELECT id FROM leads
    WHERE org_id = $1 OR assigned_org_id = $1
       OR group_id IN (SELECT id FROM groups WHERE org_id = $1)
  `;

  const steps = buildOrgBusinessDeleteSteps(leadScope);

  for (const sql of steps) {
    await client.query(sql.replace(/\s+/g, " ").trim(), [orgId]);
  }

  await client.query(
    `DELETE FROM app_users au WHERE NOT EXISTS
       (SELECT 1 FROM leads l WHERE l.app_user_id = au.id)
       AND NOT EXISTS
       (SELECT 1 FROM conversations c WHERE c.app_user_id = au.id)`.replace(
      /\s+/g,
      " ",
    ),
  );
}

async function assertBootstrapOrgExists(
  client: PoolClient,
  orgId: string,
): Promise<void> {
  const orgCheck = await client.query<{ id: string }>(
    `SELECT id FROM organizations WHERE id = $1`,
    [orgId],
  );
  if (!orgCheck.rows[0]) {
    throw new Error(
      `Organization ${orgId} not found — run db:init-local-admin first.`,
    );
  }
}

async function detachStaffUserReferences(
  client: PoolClient,
  input: LocalAdminBootstrapInput,
): Promise<void> {
  const staffToRemoveSql = `SELECT id FROM users WHERE org_id = $1 AND id <> $2`;

  await client.query(
    `DELETE FROM user_permission_overrides WHERE user_id IN (${staffToRemoveSql})
         OR granted_by IN (${staffToRemoveSql})`,
    [input.orgId, input.userId],
  );

  await client.query(
    `DELETE FROM user_group_memberships
       WHERE user_id IN (${staffToRemoveSql})
          OR group_id IN (
            SELECT id FROM groups WHERE org_id = $1 AND id <> $3
          )`,
    [input.orgId, input.userId, DEFAULT_LOCAL_GROUP_ID],
  );

  await client.query(
    `UPDATE roles SET created_by = NULL WHERE org_id = $1 AND created_by IN (${staffToRemoveSql})`,
    [input.orgId, input.userId],
  );

  await client.query(
    `UPDATE groups SET created_by = NULL, updated_by = NULL
       WHERE org_id = $1 AND (
         created_by IN (${staffToRemoveSql}) OR updated_by IN (${staffToRemoveSql})
       )`,
    [input.orgId, input.userId],
  );

  await client.query(
    `UPDATE users SET created_by = NULL WHERE org_id = $1 AND created_by IN (${staffToRemoveSql})`,
    [input.orgId, input.userId],
  );

  await client.query(
    `UPDATE document_templates SET created_by = $2 WHERE org_id = $1 AND created_by IN (${staffToRemoveSql})`,
    [input.orgId, input.userId],
  );
  await client.query(
    `UPDATE document_templates SET updated_by = $2 WHERE org_id = $1 AND updated_by IN (${staffToRemoveSql})`,
    [input.orgId, input.userId],
  );

  await client.query(
    `UPDATE template_versions SET created_by_user_id = $2 WHERE org_id = $1 AND created_by_user_id IN (${staffToRemoveSql})`,
    [input.orgId, input.userId],
  );
  await client.query(
    `UPDATE template_releases SET updated_by_user_id = $2 WHERE org_id = $1 AND updated_by_user_id IN (${staffToRemoveSql})`,
    [input.orgId, input.userId],
  );
}

async function deleteStaffUsersAndNonDefaultGroups(
  client: PoolClient,
  input: LocalAdminBootstrapInput,
): Promise<void> {
  await client.query(`DELETE FROM users WHERE org_id = $1 AND id <> $2`, [
    input.orgId,
    input.userId,
  ]);

  await client.query(`DELETE FROM groups WHERE org_id = $1 AND id <> $2`, [
    input.orgId,
    DEFAULT_LOCAL_GROUP_ID,
  ]);
}

async function main(): Promise<void> {
  requireConfirmEnv();
  const input = readLocalAdminBootstrapInput();
  const pool = createPgPool(input.dbUrl);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await assertSingleOrgOrExplicitOk(client);
    await assertBootstrapOrgExists(client, input.orgId);
    await detachStaffUserReferences(client, input);
    await deleteOrgBusinessData(client, input.orgId);
    await deleteStaffUsersAndNonDefaultGroups(client, input);
    await client.query("COMMIT");
  } catch (cause) {
    await client.query("ROLLBACK");
    throw cause;
  } finally {
    client.release();
  }

  await bootstrapLocalAdmin(pool, input);
  await pool.end();

  process.stdout.write(
    `[reset-local-business] org=${input.orgId} kept admin user=${input.userId} + default group + roles/templates; business tables for this org cleared.\n`,
  );
}

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[reset-local-business] failed: ${message}\n`);
  process.exitCode = 1;
});
