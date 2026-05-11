import { createPgPool } from "../infra/db/createPgPool";
import {
  bootstrapLocalAdmin,
  readLocalAdminBootstrapInput,
} from "../modules/core/auth/localAdminBootstrap";
import { seedCaseTemplates } from "./seedCaseTemplates";

async function main() {
  const input = readLocalAdminBootstrapInput();
  const pool = createPgPool(input.dbUrl);

  try {
    const result = await bootstrapLocalAdmin(pool, input);
    const caseTplClient = await pool.connect();
    try {
      await caseTplClient.query("BEGIN");
      await seedCaseTemplates(caseTplClient, input.orgId);
      await caseTplClient.query("COMMIT");
    } catch (cause) {
      await caseTplClient.query("ROLLBACK");
      throw cause;
    } finally {
      caseTplClient.release();
    }
    process.stdout.write("[local-admin] ready\n");
    process.stdout.write(`db: ${result.dbUrl}\n`);
    process.stdout.write(`orgId: ${result.orgId}\n`);
    process.stdout.write(`email: ${result.email}\n`);
    process.stdout.write(`password: ${result.password}\n`);
    process.stdout.write(`role: ${result.role}\n`);
  } finally {
    await pool.end();
  }
}

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[local-admin] failed: ${message}\n`);
  process.exitCode = 1;
});
