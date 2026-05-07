import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { QueryResult, QueryResultRow } from "pg";

import type { TenantDb } from "../tenancy/tenantDb";
import { queryCaseSummary, queryCustomerSummary } from "./leads.admin.query";

function makeTenantDb(
  queryFn: (sql: string, params?: unknown[]) => { rows: QueryResultRow[] },
): TenantDb {
  return {
    query: <T extends QueryResultRow>(sql: string, params?: unknown[]) =>
      Promise.resolve(queryFn(sql, params) as unknown as QueryResult<T>),
    transaction: () => Promise.reject(new Error("not implemented")),
  };
}

void describe("queryCaseSummary", () => {
  void test("returns full summary with caseNo, group, convertedAt", async () => {
    const db = makeTenantDb((sql) => {
      assert.ok(sql.includes("from cases ca"));
      assert.ok(sql.includes("left join groups g on g.id = ca.group_id"));
      return {
        rows: [
          {
            id: "case-001",
            case_no: "CASE-202605-0001",
            case_type_code: "dependent_visa",
            group_id: "grp-001",
            group_name: "東京オフィス",
            created_at: "2026-05-07T10:00:00.000Z",
          },
        ],
      };
    });

    const result = await queryCaseSummary(db, "case-001");
    assert.ok(result);
    assert.equal(result.id, "case-001");
    assert.equal(result.caseNo, "CASE-202605-0001");
    assert.equal(result.caseTypeCode, "dependent_visa");
    assert.deepEqual(result.group, { id: "grp-001", name: "東京オフィス" });
    assert.equal(result.convertedAt, "2026-05-07T10:00:00.000Z");
  });

  void test("returns null group when case has no group_id", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-002",
          case_no: "CASE-202605-0002",
          case_type_code: "work_visa",
          group_id: null,
          group_name: null,
          created_at: "2026-04-01T08:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-002");
    assert.ok(result);
    assert.equal(result.id, "case-002");
    assert.equal(result.caseNo, "CASE-202605-0002");
    assert.equal(result.caseTypeCode, "work_visa");
    assert.equal(result.group, null);
    assert.equal(result.convertedAt, "2026-04-01T08:00:00.000Z");
  });

  void test("returns null when case does not exist", async () => {
    const db = makeTenantDb(() => ({ rows: [] }));
    const result = await queryCaseSummary(db, "nonexistent");
    assert.equal(result, null);
  });

  void test("handles null case_no gracefully", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-003",
          case_no: null,
          case_type_code: "bmv",
          group_id: "grp-002",
          group_name: "大阪支社",
          created_at: "2026-03-15T12:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-003");
    assert.ok(result);
    assert.equal(result.caseNo, null);
    assert.equal(result.caseTypeCode, "bmv");
    assert.deepEqual(result.group, { id: "grp-002", name: "大阪支社" });
  });

  void test("defaults group name to empty string when group_name is null", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-004",
          case_no: "CASE-004",
          case_type_code: "general",
          group_id: "grp-003",
          group_name: null,
          created_at: "2026-05-01T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-004");
    assert.ok(result);
    assert.deepEqual(result.group, { id: "grp-003", name: "" });
  });
});

void describe("queryCustomerSummary — group output regression", () => {
  void test("returns group as { id, name } when customer has group", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-001",
          base_profile: {
            name_jp: "田中太郎",
            customerNumber: "CUS-202605-0001",
            groupId: "grp-001",
          },
          group_id: "grp-001",
          group_name: "東京オフィス",
          created_at: "2026-05-07T10:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-001");
    assert.ok(result);
    assert.deepEqual(result.group, { id: "grp-001", name: "東京オフィス" });
    assert.equal(result.convertedAt, "2026-05-07T10:00:00.000Z");
  });

  void test("returns null group when customer has no group match", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-002",
          base_profile: { name_jp: "佐藤花子" },
          group_id: null,
          group_name: null,
          created_at: "2026-04-01T08:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-002");
    assert.ok(result);
    assert.equal(result.group, null);
  });

  void test("returns customerNo from base_profile", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-003",
          base_profile: {
            customerNumber: "CUS-202605-0099",
            name_jp: "鈴木一郎",
          },
          group_id: null,
          group_name: null,
          created_at: "2026-03-01T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-003");
    assert.ok(result);
    assert.equal(result.customerNo, "CUS-202605-0099");
  });

  void test("group name defaults to empty string when group_name column is null", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-004",
          base_profile: { groupId: "grp-x" },
          group_id: "grp-x",
          group_name: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-004");
    assert.ok(result);
    assert.deepEqual(result.group, { id: "grp-x", name: "" });
  });
});
