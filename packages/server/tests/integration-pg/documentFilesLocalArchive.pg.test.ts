/**
 * integration-pg — DocumentFilesService.upload 「本地归档登记」全链路。
 *
 * 哨兵目的：
 * - 校验 `storage_type=local_server + relative_path` 时 INSERT 不再被
 *   `document_files.file_url NOT NULL` 阻断（054 迁移修复）。
 * - 覆盖 D3 链路：`document_assets` upsert + `document_requirement_file_refs`
 *   ref_mode=direct_register 写入。
 * - 校验 054 中新增 CHECK 约束的边界（file_url + relative_path 同时缺失被拒）。
 */

import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  getTestPool,
  closeTestPool,
  migrateAndSeed,
  truncateAllBusinessTables,
} from "./setup";

import { DocumentFilesService } from "../../src/modules/core/document-files/documentFiles.service";
import type { StorageAdapter } from "../../src/infra/storage/storageAdapter";
import type { TimelineService } from "../../src/modules/core/timeline/timeline.service";
import type { RequestContext } from "../../src/modules/core/tenancy/requestContext";

before(async () => {
  await migrateAndSeed();
});

beforeEach(async () => {
  await truncateAllBusinessTables();
});

after(async () => {
  await closeTestPool();
});

const ORG_ID = "32000000-0000-4000-a000-000000000001";
const USER_ID = "32000000-0000-4000-a000-000000000010";
const ROLE_ID = "32000000-0000-4000-a000-00000000a001";
const CUSTOMER_ID = "32000000-0000-4000-a000-c00000000001";
const CASE_ID = "32000000-0000-4000-a000-c10000000001";
const REQUIREMENT_ID = "32000000-0000-4000-a000-d00000000001";

const CTX: RequestContext = {
  orgId: ORG_ID,
  userId: USER_ID,
  role: "owner",
};

function stubTimeline(): {
  service: TimelineService;
  writes: { action: string }[];
} {
  const writes: { action: string }[] = [];
  const service = {
    write: (_ctx: unknown, input: { action: string }) => {
      writes.push(input);
      return Promise.resolve();
    },
    list: () => Promise.resolve([]),
  } as unknown as TimelineService;
  return { service, writes };
}

function stubStorage(): {
  adapter: StorageAdapter;
  uploadCalls: number;
  removeCalls: number;
} {
  const counters = { uploadCalls: 0, removeCalls: 0 };
  const adapter: StorageAdapter = {
    upload: () => {
      counters.uploadCalls += 1;
      return Promise.resolve();
    },
    download: () => Promise.resolve(Buffer.alloc(0)),
    remove: () => {
      counters.removeCalls += 1;
      return Promise.resolve();
    },
    getSignedUrl: () => Promise.resolve("file:///dummy"),
  };
  return {
    adapter,
    get uploadCalls() {
      return counters.uploadCalls;
    },
    get removeCalls() {
      return counters.removeCalls;
    },
  };
}

async function seedBase(pool: Pool) {
  await pool.query(
    `INSERT INTO organizations (id, name) VALUES ($1, 'test-org-doc-local')
     ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'doc-local@test.com', 'Doc Local', $3)
     ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID, ROLE_ID],
  );
  await pool.query(
    `INSERT INTO customers (id, org_id, type) VALUES ($1, $2, 'individual')
     ON CONFLICT DO NOTHING`,
    [CUSTOMER_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO cases
       (id, org_id, customer_id, case_type_code, status, owner_user_id,
        case_no, case_name, business_phase, stage)
     VALUES ($1, $2, $3, 'family_stay', 'open', $4,
             'CASE-DOC-LOCAL-001', '本地归档登记案件', 'INTAKE', 'S1')
     ON CONFLICT DO NOTHING`,
    [CASE_ID, ORG_ID, CUSTOMER_ID, USER_ID],
  );
  await pool.query(
    `INSERT INTO document_items
       (id, org_id, case_id, checklist_item_code, name, status, owner_side,
        category, provided_by_role, required_flag)
     VALUES ($1, $2, $3, 'fs-supporter-employment', '扶養者の在職証明書',
             'pending', 'applicant', '主申请人', 'applicant', true)
     ON CONFLICT DO NOTHING`,
    [REQUIREMENT_ID, ORG_ID, CASE_ID],
  );
}

function createService(pool: Pool) {
  const timeline = stubTimeline();
  const storage = stubStorage();
  const svc = new DocumentFilesService(pool, timeline.service, storage.adapter);
  return { svc, timeline, storage };
}

// ── 1. happy-path: 本地归档登记成功，DB 行为符合预期 ──

void test("DocumentFilesService.upload(local_server) registers archive without binary upload", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const { svc, timeline, storage } = createService(pool);

  const RELATIVE = "CASE-DOC-LOCAL-001/main_applicant/employment.pdf";

  const result = await svc.upload(CTX, {
    requirementId: REQUIREMENT_ID,
    fileName: "employment.pdf",
    storageType: "local_server",
    relativePath: RELATIVE,
  });

  assert.equal(
    result.fileUrl,
    null,
    "本地归档登记不应写入 file_url（依赖 054 迁移让该列 nullable）",
  );
  assert.equal(result.relativePath, RELATIVE);
  assert.equal(result.storageType, "local_server");
  assert.equal(result.versionNo, 1);
  assert.equal(storage.uploadCalls, 0, "本地归档登记不调用 storage.upload");
  assert.equal(storage.removeCalls, 0);
  assert.ok(
    timeline.writes.some((w) => w.action === "document_file.uploaded"),
    "应写 document_file.uploaded timeline",
  );

  const fileRows = await pool.query<{
    id: string;
    file_url: string | null;
    relative_path: string | null;
    storage_type: string;
    asset_id: string | null;
    version_no: number;
  }>(
    `select id, file_url, relative_path, storage_type, asset_id, version_no
       from document_files where requirement_id = $1`,
    [REQUIREMENT_ID],
  );
  assert.equal(fileRows.rowCount, 1);
  const fileRow = fileRows.rows[0];
  assert.equal(fileRow.file_url, null);
  assert.equal(fileRow.relative_path, RELATIVE);
  assert.equal(fileRow.storage_type, "local_server");
  assert.ok(fileRow.asset_id, "asset_id 应被 D3 链路填充");

  const refRows = await pool.query<{ ref_mode: string }>(
    `select ref_mode from document_requirement_file_refs
       where requirement_id = $1`,
    [REQUIREMENT_ID],
  );
  assert.equal(refRows.rowCount, 1);
  assert.equal(refRows.rows[0].ref_mode, "direct_register");

  const assetRows = await pool.query<{
    material_code: string;
    owner_subject_type: string;
    owner_customer_id: string | null;
    active_flag: boolean;
  }>(
    `select material_code, owner_subject_type, owner_customer_id, active_flag
       from document_assets where org_id = $1`,
    [ORG_ID],
  );
  assert.equal(assetRows.rowCount, 1);
  const assetRow = assetRows.rows[0];
  assert.equal(assetRow.material_code, "fs-supporter-employment");
  assert.equal(assetRow.owner_subject_type, "customer");
  assert.equal(assetRow.owner_customer_id, CUSTOMER_ID);
  assert.equal(assetRow.active_flag, true);

  const itemRows = await pool.query<{ status: string }>(
    `select status from document_items where id = $1`,
    [REQUIREMENT_ID],
  );
  assert.equal(
    itemRows.rows[0].status,
    "uploaded_reviewing",
    "登记后 document_item 应迁移至 uploaded_reviewing",
  );
});

// ── 2. 同一 requirement 重复登记 → version_no 递增；asset upsert 复用 ──

void test("repeated local-archive registration increments version_no and reuses asset", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const { svc } = createService(pool);

  await svc.upload(CTX, {
    requirementId: REQUIREMENT_ID,
    fileName: "employment-v1.pdf",
    storageType: "local_server",
    relativePath: "CASE-DOC-LOCAL-001/main_applicant/employment-v1.pdf",
  });
  const second = await svc.upload(CTX, {
    requirementId: REQUIREMENT_ID,
    fileName: "employment-v2.pdf",
    storageType: "local_server",
    relativePath: "CASE-DOC-LOCAL-001/main_applicant/employment-v2.pdf",
  });

  assert.equal(second.versionNo, 2);

  const fileCount = await pool.query<{ n: number }>(
    `select count(*)::int as n from document_files where requirement_id = $1`,
    [REQUIREMENT_ID],
  );
  assert.equal(fileCount.rows[0].n, 2);

  const assetCount = await pool.query<{ n: number }>(
    `select count(*)::int as n from document_assets where org_id = $1`,
    [ORG_ID],
  );
  assert.equal(assetCount.rows[0].n, 1, "同一 owner+material 应复用单一 asset");
});

// ── 3. CHECK 约束：file_url 与 relative_path 同时为空被 DB 拒绝 ──

void test("document_files CHECK constraint rejects rows with both file_url and relative_path null", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  await assert.rejects(
    () =>
      pool.query(
        `INSERT INTO document_files
           (org_id, requirement_id, file_name, file_url, file_type, file_size,
            version_no, uploaded_by, storage_type, relative_path)
         VALUES ($1, $2, 'oops.pdf', NULL, NULL, NULL, 1, $3, 'local_server', NULL)`,
        [ORG_ID, REQUIREMENT_ID, USER_ID],
      ),
    /document_files_storage_target_present/,
  );
});
