import test from "node:test";
import assert from "node:assert/strict";
import { DocumentAssetsService } from "./documentAssets.service";
import { computeExpiryRisk, mapAffectedCaseRow } from "./documentAssets.shared";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ASSET_ID = "00000000-0000-4000-8000-000000000010";
const CASE_ID = "00000000-0000-4000-8000-000000000030";
function makeCtx(role = "viewer") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makePool(queryFn) {
  return {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
}
function createService(pool) {
  return new DocumentAssetsService(pool);
}
// ── computeExpiryRisk ──
void test("computeExpiryRisk returns none when expiryDate is null", () => {
  const result = computeExpiryRisk(null);
  assert.equal(result.riskStatus, "none");
  assert.equal(result.daysUntilExpiry, null);
  assert.deepEqual(result.suggestions, []);
});
void test("computeExpiryRisk returns expired when date is in the past", () => {
  const result = computeExpiryRisk("2020-01-01");
  assert.equal(result.riskStatus, "expired");
  assert.ok(result.daysUntilExpiry !== null && result.daysUntilExpiry < 0);
  assert.deepEqual(result.suggestions, [
    "refresh_version",
    "waive",
    "replace_with_new_version",
  ]);
});
void test("computeExpiryRisk returns expiring_soon within 30 days", () => {
  const soon = new Date();
  soon.setUTCDate(soon.getUTCDate() + 15);
  const dateStr = soon.toISOString().slice(0, 10);
  const result = computeExpiryRisk(dateStr);
  assert.equal(result.riskStatus, "expiring_soon");
  assert.ok(
    result.daysUntilExpiry !== null &&
      result.daysUntilExpiry >= 0 &&
      result.daysUntilExpiry <= 30,
  );
  assert.deepEqual(result.suggestions, [
    "refresh_version",
    "replace_with_new_version",
  ]);
});
void test("computeExpiryRisk returns valid when date is far in the future", () => {
  const result = computeExpiryRisk("2099-12-31");
  assert.equal(result.riskStatus, "valid");
  assert.ok(result.daysUntilExpiry !== null && result.daysUntilExpiry > 30);
  assert.deepEqual(result.suggestions, []);
});
void test("computeExpiryRisk returns expiring_soon when exactly today", () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const result = computeExpiryRisk(dateStr);
  assert.equal(result.riskStatus, "expiring_soon");
  assert.ok(result.daysUntilExpiry !== null && result.daysUntilExpiry >= 0);
});
// ── mapAffectedCaseRow ──
void test("mapAffectedCaseRow maps all fields correctly", () => {
  const row = {
    case_id: CASE_ID,
    case_no: "CASE-001",
    case_name: "Test Case",
    case_status: "active",
    requirement_id: "00000000-0000-4000-8000-000000000040",
    requirement_name: "Passport Copy",
    requirement_status: "pending",
  };
  const mapped = mapAffectedCaseRow(row);
  assert.equal(mapped.caseId, CASE_ID);
  assert.equal(mapped.caseNo, "CASE-001");
  assert.equal(mapped.caseName, "Test Case");
  assert.equal(mapped.caseStatus, "active");
  assert.equal(mapped.requirementId, "00000000-0000-4000-8000-000000000040");
  assert.equal(mapped.requirementName, "Passport Copy");
  assert.equal(mapped.requirementStatus, "pending");
});
void test("mapAffectedCaseRow handles null caseNo and caseName", () => {
  const row = {
    case_id: CASE_ID,
    case_no: null,
    case_name: null,
    case_status: "active",
    requirement_id: "00000000-0000-4000-8000-000000000040",
    requirement_name: "Passport",
    requirement_status: "approved",
  };
  const mapped = mapAffectedCaseRow(row);
  assert.equal(mapped.caseNo, null);
  assert.equal(mapped.caseName, null);
});
// ── DocumentAssetsService.getSharedExpiryRisk ──
void test("getSharedExpiryRisk returns null when asset not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const svc = createService(pool);
  const result = await svc.getSharedExpiryRisk(makeCtx(), ASSET_ID);
  assert.equal(result, null);
});
void test("getSharedExpiryRisk returns risk data for expired asset", async () => {
  const REQ_ID = "00000000-0000-4000-8000-000000000040";
  const pool = makePool((sql) => {
    if (sql.includes("SELECT id FROM document_assets")) {
      return Promise.resolve({ rows: [{ id: ASSET_ID }], rowCount: 1 });
    }
    if (sql.includes("expiry_date") && sql.includes("version_no")) {
      return Promise.resolve({
        rows: [{ expiry_date: "2020-01-01" }],
        rowCount: 1,
      });
    }
    if (sql.includes("DISTINCT ON")) {
      return Promise.resolve({
        rows: [
          {
            case_id: CASE_ID,
            case_no: "CASE-001",
            case_name: "Test",
            case_status: "active",
            requirement_id: REQ_ID,
            requirement_name: "Passport",
            requirement_status: "approved",
          },
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const svc = createService(pool);
  const result = await svc.getSharedExpiryRisk(makeCtx(), ASSET_ID);
  assert.ok(result);
  assert.equal(result.assetId, ASSET_ID);
  assert.equal(result.latestVersionExpiryDate, "2020-01-01");
  assert.equal(result.riskStatus, "expired");
  assert.ok(result.daysUntilExpiry !== null && result.daysUntilExpiry < 0);
  assert.deepEqual(result.suggestions, [
    "refresh_version",
    "waive",
    "replace_with_new_version",
  ]);
  assert.equal(result.affectedCases.length, 1);
  assert.equal(result.affectedCases[0].caseId, CASE_ID);
  assert.equal(result.affectedCases[0].caseNo, "CASE-001");
  assert.equal(result.affectedCases[0].requirementName, "Passport");
});
void test("getSharedExpiryRisk returns valid status for non-expired asset", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("SELECT id FROM document_assets")) {
      return Promise.resolve({ rows: [{ id: ASSET_ID }], rowCount: 1 });
    }
    if (sql.includes("expiry_date") && sql.includes("version_no")) {
      return Promise.resolve({
        rows: [{ expiry_date: "2099-12-31" }],
        rowCount: 1,
      });
    }
    if (sql.includes("DISTINCT ON")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const svc = createService(pool);
  const result = await svc.getSharedExpiryRisk(makeCtx(), ASSET_ID);
  assert.ok(result);
  assert.equal(result.riskStatus, "valid");
  assert.deepEqual(result.suggestions, []);
  assert.equal(result.affectedCases.length, 0);
});
void test("getSharedExpiryRisk handles null expiry_date (no file versions)", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("SELECT id FROM document_assets")) {
      return Promise.resolve({ rows: [{ id: ASSET_ID }], rowCount: 1 });
    }
    if (sql.includes("expiry_date") && sql.includes("version_no")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("DISTINCT ON")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const svc = createService(pool);
  const result = await svc.getSharedExpiryRisk(makeCtx(), ASSET_ID);
  assert.ok(result);
  assert.equal(result.latestVersionExpiryDate, null);
  assert.equal(result.riskStatus, "none");
  assert.equal(result.daysUntilExpiry, null);
  assert.deepEqual(result.suggestions, []);
});
void test("getSharedExpiryRisk returns multiple affected cases", async () => {
  const CASE_ID_2 = "00000000-0000-4000-8000-000000000031";
  const REQ_ID_1 = "00000000-0000-4000-8000-000000000040";
  const REQ_ID_2 = "00000000-0000-4000-8000-000000000041";
  const pool = makePool((sql) => {
    if (sql.includes("SELECT id FROM document_assets")) {
      return Promise.resolve({ rows: [{ id: ASSET_ID }], rowCount: 1 });
    }
    if (sql.includes("expiry_date") && sql.includes("version_no")) {
      return Promise.resolve({
        rows: [{ expiry_date: "2020-06-15" }],
        rowCount: 1,
      });
    }
    if (sql.includes("DISTINCT ON")) {
      return Promise.resolve({
        rows: [
          {
            case_id: CASE_ID,
            case_no: "CASE-001",
            case_name: "Case A",
            case_status: "active",
            requirement_id: REQ_ID_1,
            requirement_name: "Passport",
            requirement_status: "approved",
          },
          {
            case_id: CASE_ID_2,
            case_no: "CASE-002",
            case_name: "Case B",
            case_status: "active",
            requirement_id: REQ_ID_2,
            requirement_name: "Passport Copy",
            requirement_status: "pending",
          },
        ],
        rowCount: 2,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const svc = createService(pool);
  const result = await svc.getSharedExpiryRisk(makeCtx(), ASSET_ID);
  assert.ok(result);
  assert.equal(result.affectedCases.length, 2);
  assert.equal(result.affectedCases[0].caseId, CASE_ID);
  assert.equal(result.affectedCases[1].caseId, CASE_ID_2);
});
void test("getSharedExpiryRisk handles Date object from expiry query", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("SELECT id FROM document_assets")) {
      return Promise.resolve({ rows: [{ id: ASSET_ID }], rowCount: 1 });
    }
    if (sql.includes("expiry_date") && sql.includes("version_no")) {
      return Promise.resolve({
        rows: [{ expiry_date: new Date("2020-03-15T00:00:00Z") }],
        rowCount: 1,
      });
    }
    if (sql.includes("DISTINCT ON")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const svc = createService(pool);
  const result = await svc.getSharedExpiryRisk(makeCtx(), ASSET_ID);
  assert.ok(result);
  assert.equal(result.latestVersionExpiryDate, "2020-03-15");
  assert.equal(result.riskStatus, "expired");
});
//# sourceMappingURL=documentAssets.shared-expiry-risk.test.js.map
