import fs from "node:fs";
import path from "node:path";

import { loadEnv } from "../../config/env";
import { createPgPool } from "./createPgPool";

type MigrationRow = { id: string };

type MigrationKind = "legacy" | "paired";

type Migration = {
  key: string;
  kind: MigrationKind;
  upFile: string;
  downFile?: string;
};

const legacyMigrationAllowlist = new Set<string>([
  "001_init.sql",
  "002_rls.sql",
  "003_templates.sql",
  "003_timeline_triggers.sql",
  "004_templates_rls.sql",
  "005_jobs.sql",
  "006_jobs_rls.sql",
]);

function listSqlFiles(migrationsDir: string): string[] {
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

function readSql(migrationsDir: string, fileName: string): string {
  return fs.readFileSync(path.join(migrationsDir, fileName), "utf8");
}

function parsePrefix(name: string): number | null {
  const match = /^(\d{3})_/.exec(name);
  if (!match) return null;
  return Number(match[1]);
}

function assertMigrationKeyFormat(key: string) {
  if (!/^\d{3}_[a-z0-9][a-z0-9_-]*$/i.test(key)) {
    throw new Error(
      `migration id must match ^\\d{3}_[a-z0-9][a-z0-9_-]*$: ${key}`,
    );
  }
}

function scanMigrationFiles(migrationsDir: string): {
  legacyFiles: string[];
  upFiles: Map<string, string>;
  downFiles: Map<string, string>;
} {
  const files = listSqlFiles(migrationsDir);
  const legacyFiles: string[] = [];
  const upFiles = new Map<string, string>();
  const downFiles = new Map<string, string>();

  for (const file of files) {
    if (file.endsWith(".up.sql")) {
      const key = file.slice(0, -".up.sql".length);
      assertMigrationKeyFormat(key);
      upFiles.set(key, file);
      continue;
    }
    if (file.endsWith(".down.sql")) {
      const key = file.slice(0, -".down.sql".length);
      assertMigrationKeyFormat(key);
      downFiles.set(key, file);
      continue;
    }
    legacyFiles.push(file);
  }

  return { legacyFiles, upFiles, downFiles };
}

function validateLegacyFiles(legacyFiles: string[]) {
  for (const file of legacyFiles) {
    if (!legacyMigrationAllowlist.has(file)) {
      throw new Error(
        `unexpected legacy migration file (must use .up.sql/.down.sql): ${file}`,
      );
    }
  }
  for (const expected of legacyMigrationAllowlist) {
    if (!legacyFiles.includes(expected)) {
      throw new Error(`missing legacy migration file: ${expected}`);
    }
  }
}

function validatePairedFiles(upFiles: Map<string, string>, downFiles: Map<string, string>) {
  const missingDown = [...upFiles.keys()].filter((k) => !downFiles.has(k));
  if (missingDown.length > 0) {
    throw new Error(`missing .down.sql for: ${missingDown.join(", ")}`);
  }

  const orphanDown = [...downFiles.keys()].filter((k) => !upFiles.has(k));
  if (orphanDown.length > 0) {
    throw new Error(`.down.sql exists without .up.sql for: ${orphanDown.join(", ")}`);
  }
}

function computeMaxLegacyPrefix(legacyKeys: string[]): number {
  let maxLegacyPrefix = 0;
  for (const key of legacyKeys) {
    const prefix = parsePrefix(key);
    if (prefix !== null) maxLegacyPrefix = Math.max(maxLegacyPrefix, prefix);
  }
  return maxLegacyPrefix;
}

function buildLegacyMigrations(legacyFiles: string[]): Map<string, Migration> {
  const legacy = new Map<string, Migration>();
  for (const file of legacyFiles) {
    legacy.set(file, { key: file, kind: "legacy", upFile: file });
  }
  return legacy;
}

function buildPairedMigrations(
  upFiles: Map<string, string>,
  downFiles: Map<string, string>,
  maxLegacyPrefix: number,
): Map<string, Migration> {
  const paired = new Map<string, Migration>();
  const maxLegacyPrefixText = String(maxLegacyPrefix).padStart(3, "0");

  for (const key of upFiles.keys()) {
    const prefix = parsePrefix(key);
    if (prefix === null) {
      throw new Error(`migration id must start with NNN_: ${key}`);
    }
    if (prefix <= maxLegacyPrefix) {
      throw new Error(
        `new migration id prefix must be > ${maxLegacyPrefixText}_*: ${key}`,
      );
    }
    const upFile = upFiles.get(key);
    const downFile = downFiles.get(key);
    if (!upFile || !downFile) {
      throw new Error(`missing migration files for: ${key}`);
    }
    paired.set(key, { key, kind: "paired", upFile, downFile });
  }

  return paired;
}

function buildMigrationIndex(migrationsDir: string): {
  legacy: Map<string, Migration>;
  paired: Map<string, Migration>;
  maxLegacyPrefix: number;
} {
  const { legacyFiles, upFiles, downFiles } = scanMigrationFiles(migrationsDir);
  validateLegacyFiles(legacyFiles);
  validatePairedFiles(upFiles, downFiles);

  const legacy = buildLegacyMigrations(legacyFiles);
  const maxLegacyPrefix = computeMaxLegacyPrefix([...legacy.keys()]);
  const paired = buildPairedMigrations(upFiles, downFiles, maxLegacyPrefix);

  return { legacy, paired, maxLegacyPrefix };
}

function listMigrations(migrationsDir: string): Migration[] {
  const index = buildMigrationIndex(migrationsDir);
  const migrations = [...index.legacy.values(), ...index.paired.values()];
  return migrations.sort((a, b) => {
    const ap = parsePrefix(a.key) ?? 0;
    const bp = parsePrefix(b.key) ?? 0;
    if (ap !== bp) return ap - bp;
    return a.key.localeCompare(b.key);
  });
}

async function ensureMigrationsTable(pool: ReturnType<typeof createPgPool>) {
  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function getAppliedMigrationIds(
  pool: ReturnType<typeof createPgPool>,
): Promise<string[]> {
  await ensureMigrationsTable(pool);
  const result = await pool.query<MigrationRow>(
    "select id from schema_migrations order by applied_at asc",
  );
  return result.rows.map((r) => r.id);
}

async function applyMigration(
  pool: ReturnType<typeof createPgPool>,
  id: string,
  sql: string,
): Promise<void> {
  await pool.query("begin");
  try {
    await pool.query(sql);
    await pool.query("insert into schema_migrations(id) values ($1)", [id]);
    await pool.query("commit");
  } catch (e) {
    await pool.query("rollback");
    throw e;
  }
}

async function rollbackMigration(
  pool: ReturnType<typeof createPgPool>,
  id: string,
  sql: string,
): Promise<void> {
  await pool.query("begin");
  try {
    await pool.query(sql);
    await pool.query("delete from schema_migrations where id = $1", [id]);
    await pool.query("commit");
  } catch (e) {
    await pool.query("rollback");
    throw e;
  }
}

function parseStepsArg(argv: string[]): number {
  const idx = argv.findIndex((a) => a === "--steps" || a === "-n");
  if (idx === -1) return 1;
  const raw = argv.at(idx + 1);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid steps value: ${raw ?? ""}`);
  }
  return parsed;
}

async function migrate(migrationsDir: string) {
  const env = loadEnv();
  const pool = createPgPool(env.dbUrl);

  try {
    const migrations = listMigrations(migrationsDir);
    const appliedIds = await getAppliedMigrationIds(pool);
    const applied = new Set(appliedIds);

    for (const migration of migrations) {
      if (applied.has(migration.key)) continue;
      const sql = readSql(migrationsDir, migration.upFile);
      await applyMigration(pool, migration.key, sql);
      process.stdout.write(`applied: ${migration.key}\n`);
    }
  } finally {
    await pool.end();
  }
}

async function rollback(migrationsDir: string, argv: string[]) {
  const env = loadEnv();
  const pool = createPgPool(env.dbUrl);

  try {
    const index = buildMigrationIndex(migrationsDir);
    const appliedIds = await getAppliedMigrationIds(pool);
    const steps = parseStepsArg(argv);
    const toRollback = appliedIds.slice(-steps).reverse();

    if (toRollback.length === 0) {
      process.stdout.write("nothing to rollback\n");
      return;
    }

    for (const id of toRollback) {
      const migration = index.paired.get(id);
      if (!migration?.downFile) {
        throw new Error(`migration has no rollback (.down.sql): ${id}`);
      }
      const sql = readSql(migrationsDir, migration.downFile);
      await rollbackMigration(pool, id, sql);
      process.stdout.write(`rolled back: ${id}\n`);
    }
  } finally {
    await pool.end();
  }
}

function check(migrationsDir: string) {
  buildMigrationIndex(migrationsDir);
  process.stdout.write("ok\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? "migrate";
  const migrationsDir = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "migrations",
  );

  if (command === "migrate") {
    await migrate(migrationsDir);
    return;
  }
  if (command === "rollback") {
    await rollback(migrationsDir, argv.slice(1));
    return;
  }
  if (command === "check") {
    check(migrationsDir);
    return;
  }

  throw new Error(`unknown command: ${command}`);
}

await main();
