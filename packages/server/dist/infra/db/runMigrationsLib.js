import fs from "node:fs";
import path from "node:path";
const legacyMigrationAllowlist = new Set([
  "001_init.sql",
  "002_rls.sql",
  "003_templates.sql",
  "003_timeline_triggers.sql",
  "004_templates_rls.sql",
  "005_jobs.sql",
  "006_jobs_rls.sql",
]);
function listSqlFiles(migrationsDir) {
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}
/**
 * 读取指定 migration 文件的 SQL 文本。
 *
 * @param migrationsDir migrations 目录绝对路径
 * @param fileName 目录内文件名
 * @returns 文件内容
 */
export function readSql(migrationsDir, fileName) {
  return fs.readFileSync(path.join(migrationsDir, fileName), "utf8");
}
function parsePrefix(name) {
  const match = /^(\d{3})_/.exec(name);
  if (!match) return null;
  return Number(match[1]);
}
function assertMigrationKeyFormat(key) {
  if (!/^\d{3}_[a-z0-9][a-z0-9_-]*$/i.test(key)) {
    throw new Error(
      `migration id must match ^\\d{3}_[a-z0-9][a-z0-9_-]*$: ${key}`,
    );
  }
}
function scanMigrationFiles(migrationsDir) {
  const files = listSqlFiles(migrationsDir);
  const legacyFiles = [];
  const upFiles = new Map();
  const downFiles = new Map();
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
function validateLegacyFiles(legacyFiles) {
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
function validatePairedFiles(upFiles, downFiles) {
  const missingDown = [...upFiles.keys()].filter((k) => !downFiles.has(k));
  if (missingDown.length > 0) {
    throw new Error(`missing .down.sql for: ${missingDown.join(", ")}`);
  }
  const orphanDown = [...downFiles.keys()].filter((k) => !upFiles.has(k));
  if (orphanDown.length > 0) {
    throw new Error(
      `.down.sql exists without .up.sql for: ${orphanDown.join(", ")}`,
    );
  }
}
function computeMaxLegacyPrefix(legacyKeys) {
  let maxLegacyPrefix = 0;
  for (const key of legacyKeys) {
    const prefix = parsePrefix(key);
    if (prefix !== null) maxLegacyPrefix = Math.max(maxLegacyPrefix, prefix);
  }
  return maxLegacyPrefix;
}
function buildLegacyMigrations(legacyFiles) {
  const legacy = new Map();
  for (const file of legacyFiles) {
    legacy.set(file, { key: file, kind: "legacy", upFile: file });
  }
  return legacy;
}
function buildPairedMigrations(upFiles, downFiles, maxLegacyPrefix) {
  const paired = new Map();
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
/**
 * 索引 migrations 目录，返回 legacy / paired 双 map 及 legacy 最大前缀。
 *
 * @param migrationsDir migrations 目录绝对路径
 * @returns 索引结果
 */
export function buildMigrationIndex(migrationsDir) {
  const { legacyFiles, upFiles, downFiles } = scanMigrationFiles(migrationsDir);
  validateLegacyFiles(legacyFiles);
  validatePairedFiles(upFiles, downFiles);
  const legacy = buildLegacyMigrations(legacyFiles);
  const maxLegacyPrefix = computeMaxLegacyPrefix([...legacy.keys()]);
  const paired = buildPairedMigrations(upFiles, downFiles, maxLegacyPrefix);
  return { legacy, paired, maxLegacyPrefix };
}
/**
 * 返回 migrations 列表，已按前缀升序排好。
 *
 * @param migrationsDir migrations 目录绝对路径
 * @returns migration 列表
 */
export function listMigrations(migrationsDir) {
  const index = buildMigrationIndex(migrationsDir);
  const migrations = [...index.legacy.values(), ...index.paired.values()];
  return migrations.sort((a, b) => {
    const ap = parsePrefix(a.key) ?? 0;
    const bp = parsePrefix(b.key) ?? 0;
    if (ap !== bp) return ap - bp;
    return a.key.localeCompare(b.key);
  });
}
/**
 * 创建 `schema_migrations` 表（如不存在）。
 *
 * @param pool PostgreSQL 连接池
 */
export async function ensureMigrationsTable(pool) {
  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}
/**
 * 读取已应用的 migration ID 列表，按 `applied_at` 升序。
 *
 * @param pool PostgreSQL 连接池
 * @returns 已应用 migration ID 列表
 */
export async function getAppliedMigrationIds(pool) {
  await ensureMigrationsTable(pool);
  const result = await pool.query(
    "select id from schema_migrations order by applied_at asc",
  );
  return result.rows.map((r) => r.id);
}
/**
 * 在事务中应用单条 migration 并写入 `schema_migrations`。
 *
 * @param pool PostgreSQL 连接池
 * @param id migration ID
 * @param sql migration SQL 文本
 */
export async function applyMigration(pool, id, sql) {
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
/**
 * 在事务中回滚单条 migration 并删除 `schema_migrations` 记录。
 *
 * @param pool PostgreSQL 连接池
 * @param id migration ID
 * @param sql migration .down.sql 文本
 */
export async function rollbackMigration(pool, id, sql) {
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
/**
 * 计算 migrations 目录与 `schema_migrations` 表的差集。
 *
 * 仅返回「在磁盘上、但 DB 还没记录」的 migration 列表，按文件前缀升序。
 * 反向漂移（DB 有但磁盘缺）只是警告条件，由调用方决定如何处理。
 *
 * @param pool PostgreSQL 连接池
 * @param migrationsDir migrations 目录绝对路径
 * @returns 缺失的 migration ID 列表（按前缀升序）
 */
export async function findPendingMigrationKeys(pool, migrationsDir) {
  const onDisk = listMigrations(migrationsDir).map((m) => m.key);
  const appliedIds = new Set(await getAppliedMigrationIds(pool));
  return onDisk.filter((key) => !appliedIds.has(key));
}
/**
 * 校验 migrations 目录与 `schema_migrations` 表完全一致；
 * 若仍有 pending 文件，抛出带有运维 hint 的 fail-fast Error。
 *
 * @param pool PostgreSQL 连接池
 * @param migrationsDir migrations 目录绝对路径
 * @throws 当存在 pending migration 时抛出
 */
export async function assertAllMigrationsApplied(pool, migrationsDir) {
  const pending = await findPendingMigrationKeys(pool, migrationsDir);
  if (pending.length === 0) return;
  const list = pending.join(", ");
  throw new Error(
    `[db] schema_migrations is out of sync. ` +
      `Pending: ${list}. ` +
      `Run \`npm run db:migrate\` from packages/server before starting the server.`,
  );
}
//# sourceMappingURL=runMigrationsLib.js.map
