import test from "node:test";
import assert from "node:assert/strict";
import { DocumentFilesService } from "./documentFiles.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const FILE_ID = "file-1";
const REQUIREMENT_ID = "00000000-0000-4000-8000-000000000010";
const CASE_ID = "00000000-0000-4000-8000-000000000020";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000030";
const ASSET_ID = "00000000-0000-4000-8000-000000000040";
const CHECKLIST_ITEM_CODE = "passport_copy";
function makeCtx(role = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makeFileRow(overrides = {}) {
  return {
    id: FILE_ID,
    org_id: ORG_ID,
    requirement_id: REQUIREMENT_ID,
    file_name: "passport.pdf",
    file_url: "document-files/req/passport.pdf",
    file_type: "application/pdf",
    file_size: 12,
    version_no: 1,
    uploaded_by: USER_ID,
    uploaded_at: "2026-01-01T00:00:00.000Z",
    storage_type: "local_server",
    relative_path: null,
    review_status: "pending",
    review_by: null,
    review_at: null,
    expiry_date: null,
    hash_value:
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
function makePool(queryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: queryFn,
        release: () => undefined,
      }),
  };
}
function createService(queryFn) {
  const pool = makePool(queryFn);
  const timeline = {
    writes: [],
    service: {
      write: (_ctx, input) => {
        timeline.writes.push(input);
        return Promise.resolve();
      },
    },
  };
  const storage = {
    upload: () => Promise.resolve(),
    download: () => Promise.resolve(Buffer.alloc(0)),
    remove: () => Promise.resolve(),
    getSignedUrl: () => Promise.resolve("https://example.com/file"),
  };
  const svc = new DocumentFilesService(pool, timeline.service, storage);
  return { svc };
}
function makeUploadQueryFn(overrides) {
  const code = overrides?.requirementChecklistItemCode ?? CHECKLIST_ITEM_CODE;
  const assetReturns = overrides?.assetInsertReturns ?? true;
  return (sql) => {
    if (sql.includes("from document_items") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [
          {
            id: REQUIREMENT_ID,
            status: "approved",
            case_id: CASE_ID,
            checklist_item_code: code,
          },
        ],
        rowCount: 1,
      });
    }
    if (
      sql.includes("select coalesce(max(version_no), 0) + 1 as next_version")
    ) {
      return Promise.resolve({ rows: [{ next_version: "3" }], rowCount: 1 });
    }
    if (sql.includes("customer_id from cases")) {
      return Promise.resolve({
        rows: [{ customer_id: CUSTOMER_ID }],
        rowCount: 1,
      });
    }
    if (sql.includes("INSERT INTO document_assets")) {
      return assetReturns
        ? Promise.resolve({ rows: [{ id: ASSET_ID }], rowCount: 1 })
        : Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("SELECT id FROM document_assets")) {
      return Promise.resolve({ rows: [{ id: ASSET_ID }], rowCount: 1 });
    }
    if (sql.includes("insert into document_files")) {
      return Promise.resolve({
        rows: [makeFileRow({ version_no: 3 })],
        rowCount: 1,
      });
    }
    if (sql.includes("document_requirement_file_refs")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
}
// ── D3: upload + asset merge ──
void test("D3: upload upserts document_asset and writes requirement_file_ref in same transaction", async () => {
  const calls = [];
  const queryFn = makeUploadQueryFn();
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    return queryFn(sql, params);
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    relativePath: "archive/passport.pdf",
  });
  const assetInsert = calls.find((c) =>
    c.sql.includes("INSERT INTO document_assets"),
  );
  assert.ok(assetInsert, "should INSERT INTO document_assets");
  assert.ok(assetInsert.params);
  assert.equal(assetInsert.params[0], ORG_ID);
  assert.equal(assetInsert.params[1], CHECKLIST_ITEM_CODE);
  assert.equal(assetInsert.params[2], "customer");
  assert.equal(assetInsert.params[3], CUSTOMER_ID);
  assert.equal(assetInsert.params[5], CASE_ID);
  assert.equal(assetInsert.params[6], REQUIREMENT_ID);
  const refInsert = calls.find((c) =>
    c.sql.includes("document_requirement_file_refs"),
  );
  assert.ok(refInsert, "should insert document_requirement_file_refs");
  assert.ok(refInsert.params);
  assert.equal(refInsert.params[0], REQUIREMENT_ID);
  assert.equal(refInsert.params[1], FILE_ID);
  assert.equal(refInsert.params[2], USER_ID);
});
void test("D3: upload uses materialCode from input when provided", async () => {
  const calls = [];
  const queryFn = makeUploadQueryFn();
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    return queryFn(sql, params);
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    relativePath: "archive/passport.pdf",
    materialCode: "custom_material",
  });
  const assetInsert = calls.find((c) =>
    c.sql.includes("INSERT INTO document_assets"),
  );
  assert.ok(assetInsert);
  assert.equal(assetInsert.params?.[1], "custom_material");
});
void test("D3: upload falls back to checklist_item_code when materialCode not provided", async () => {
  const calls = [];
  const queryFn = makeUploadQueryFn({
    requirementChecklistItemCode: "tax_cert",
  });
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    return queryFn(sql, params);
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "tax.pdf",
    relativePath: "archive/tax.pdf",
  });
  const assetInsert = calls.find((c) =>
    c.sql.includes("INSERT INTO document_assets"),
  );
  assert.ok(assetInsert);
  assert.equal(assetInsert.params?.[1], "tax_cert");
});
void test("D3: upload uses ownerSubjectType and ownerCustomerId from input when provided", async () => {
  const calls = [];
  const EMPLOYER_KEY = "EMP-001";
  const queryFn = makeUploadQueryFn();
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    return queryFn(sql, params);
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "cert.pdf",
    relativePath: "archive/cert.pdf",
    ownerSubjectType: "employer",
    ownerCustomerId: null,
    ownerEmployerIdentityKey: EMPLOYER_KEY,
  });
  const assetInsert = calls.find((c) =>
    c.sql.includes("INSERT INTO document_assets"),
  );
  assert.ok(assetInsert);
  assert.ok(assetInsert.params);
  assert.equal(assetInsert.params[2], "employer");
  assert.equal(assetInsert.params[3], null);
  assert.equal(assetInsert.params[4], EMPLOYER_KEY);
});
void test("D3: upload falls back to SELECT on asset conflict (ON CONFLICT DO NOTHING)", async () => {
  const calls = [];
  const queryFn = makeUploadQueryFn({ assetInsertReturns: false });
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    return queryFn(sql, params);
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    relativePath: "archive/passport.pdf",
  });
  const fallbackSelect = calls.find((c) =>
    c.sql.includes("SELECT id FROM document_assets"),
  );
  assert.ok(fallbackSelect, "should fallback to SELECT on conflict");
  const fileInsert = calls.find((c) =>
    c.sql.includes("insert into document_files"),
  );
  assert.ok(fileInsert);
  assert.equal(fileInsert.params?.[12], ASSET_ID);
});
void test("D3: upload writes asset_id into document_files insert (binary path)", async () => {
  const calls = [];
  const queryFn = makeUploadQueryFn();
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    return queryFn(sql, params);
  });
  await svc.upload(makeCtx(), {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    data: Buffer.from("hello"),
    contentType: "application/pdf",
  });
  const fileInsert = calls.find((c) =>
    c.sql.includes("insert into document_files"),
  );
  assert.ok(fileInsert);
  assert.ok(
    fileInsert.sql.includes("asset_id"),
    "INSERT should include asset_id column",
  );
  assert.equal(fileInsert.params?.[12], ASSET_ID);
  const refInsert = calls.find((c) =>
    c.sql.includes("document_requirement_file_refs"),
  );
  assert.ok(refInsert, "binary upload should also write ref");
});
//# sourceMappingURL=documentFiles.d3-asset-merge.test.js.map
