import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  assertAllMigrationsApplied,
  buildMigrationIndex,
  findPendingMigrationKeys,
  listMigrations,
} from "./runMigrationsLib";
const LEGACY_FILES = [
  "001_init.sql",
  "002_rls.sql",
  "003_templates.sql",
  "003_timeline_triggers.sql",
  "004_templates_rls.sql",
  "005_jobs.sql",
  "006_jobs_rls.sql",
];
async function makeFixtureDir(extra) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cms-migrations-test-"));
  for (const file of LEGACY_FILES) {
    await fs.writeFile(path.join(dir, file), `-- ${file}\n`);
  }
  for (const [name, body] of Object.entries(extra)) {
    await fs.writeFile(path.join(dir, name), body);
  }
  return dir;
}
async function cleanup(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}
function makePool(rows) {
  const calls = [];
  const pool = {
    query: (sql, params) => {
      calls.push({ sql, params });
      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith("select id from schema_migrations")) {
        return Promise.resolve({ rows });
      }
      return Promise.resolve({ rows: [] });
    },
  };
  return { pool, calls };
}
void test("listMigrations sorts legacy + paired by numeric prefix", async () => {
  const dir = await makeFixtureDir({
    "010_alpha.up.sql": "-- up alpha\n",
    "010_alpha.down.sql": "-- down alpha\n",
    "020_beta.up.sql": "-- up beta\n",
    "020_beta.down.sql": "-- down beta\n",
  });
  try {
    const keys = listMigrations(dir).map((m) => m.key);
    assert.deepEqual(keys, [
      "001_init.sql",
      "002_rls.sql",
      "003_templates.sql",
      "003_timeline_triggers.sql",
      "004_templates_rls.sql",
      "005_jobs.sql",
      "006_jobs_rls.sql",
      "010_alpha",
      "020_beta",
    ]);
  } finally {
    await cleanup(dir);
  }
});
void test("buildMigrationIndex throws when paired up has no down", async () => {
  const dir = await makeFixtureDir({
    "010_only_up.up.sql": "-- up\n",
  });
  try {
    assert.throws(() => buildMigrationIndex(dir), /missing \.down\.sql for/);
  } finally {
    await cleanup(dir);
  }
});
void test("buildMigrationIndex rejects new prefix that collides with legacy", async () => {
  const dir = await makeFixtureDir({
    "006_clash.up.sql": "-- up\n",
    "006_clash.down.sql": "-- down\n",
  });
  try {
    assert.throws(() => buildMigrationIndex(dir), /prefix must be > 006/);
  } finally {
    await cleanup(dir);
  }
});
void test("findPendingMigrationKeys returns files that are not in schema_migrations", async () => {
  const dir = await makeFixtureDir({
    "010_alpha.up.sql": "-- up alpha\n",
    "010_alpha.down.sql": "-- down alpha\n",
    "020_beta.up.sql": "-- up beta\n",
    "020_beta.down.sql": "-- down beta\n",
  });
  try {
    const applied = [
      ...LEGACY_FILES.map((id) => ({ id })),
      { id: "010_alpha" },
    ];
    const { pool, calls } = makePool(applied);
    const pending = await findPendingMigrationKeys(pool, dir);
    assert.deepEqual(pending, ["020_beta"]);
    const sawSelect = calls.some((c) =>
      c.sql.toLowerCase().includes("select id from schema_migrations"),
    );
    assert.equal(sawSelect, true);
  } finally {
    await cleanup(dir);
  }
});
void test("findPendingMigrationKeys returns empty when DB is fully synced", async () => {
  const dir = await makeFixtureDir({
    "010_alpha.up.sql": "-- up alpha\n",
    "010_alpha.down.sql": "-- down alpha\n",
  });
  try {
    const applied = [
      ...LEGACY_FILES.map((id) => ({ id })),
      { id: "010_alpha" },
    ];
    const { pool } = makePool(applied);
    const pending = await findPendingMigrationKeys(pool, dir);
    assert.deepEqual(pending, []);
  } finally {
    await cleanup(dir);
  }
});
void test("assertAllMigrationsApplied throws fail-fast hint when pending exists", async () => {
  const dir = await makeFixtureDir({
    "099_pending.up.sql": "-- up\n",
    "099_pending.down.sql": "-- down\n",
  });
  try {
    const applied = LEGACY_FILES.map((id) => ({ id }));
    const { pool } = makePool(applied);
    await assert.rejects(
      () => assertAllMigrationsApplied(pool, dir),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /099_pending/);
        assert.match(err.message, /npm run db:migrate/);
        return true;
      },
    );
  } finally {
    await cleanup(dir);
  }
});
void test("assertAllMigrationsApplied is silent when DB matches disk", async () => {
  const dir = await makeFixtureDir({});
  try {
    const applied = LEGACY_FILES.map((id) => ({ id }));
    const { pool } = makePool(applied);
    await assertAllMigrationsApplied(pool, dir);
  } finally {
    await cleanup(dir);
  }
});
void test("listMigrations works against the real migrations directory", () => {
  const realDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "migrations",
  );
  const migrations = listMigrations(realDir);
  assert.ok(
    migrations.length >= LEGACY_FILES.length,
    "expected at least the legacy migrations on disk",
  );
  for (const legacy of LEGACY_FILES) {
    assert.ok(
      migrations.some((m) => m.key === legacy),
      `missing legacy migration in real dir: ${legacy}`,
    );
  }
});
//# sourceMappingURL=runMigrationsLib.test.js.map
