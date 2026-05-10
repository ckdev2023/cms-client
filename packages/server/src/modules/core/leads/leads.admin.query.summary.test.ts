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
      assert.ok(sql.includes("left join customers c on c.id = ca.customer_id"));
      assert.ok(sql.includes("left join groups g on g.id = ca.group_id"));
      return {
        rows: [
          {
            id: "case-001",
            case_no: "CASE-202605-0001",
            case_name: "田中太郎 · 家族滞在",
            case_type_code: "dependent_visa",
            base_profile: { name_jp: "田中太郎" },
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
    assert.equal(result.title, "田中太郎 · 家族滞在");
    assert.equal(result.applicantName, "田中太郎");
    assert.deepEqual(result.group, { id: "grp-001", name: "東京オフィス" });
    assert.equal(result.convertedAt, "2026-05-07T10:00:00.000Z");
  });

  void test("returns null group when case has no group_id", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-002",
          case_no: "CASE-202605-0002",
          case_name: null,
          case_type_code: "work_visa",
          base_profile: { name_cn: "李明" },
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
    assert.equal(result.title, null);
    assert.equal(result.applicantName, "李明");
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
          case_name: null,
          case_type_code: "bmv",
          base_profile: null,
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
    assert.equal(result.title, null);
    assert.equal(result.applicantName, null);
    assert.deepEqual(result.group, { id: "grp-002", name: "大阪支社" });
  });

  void test("defaults group name to empty string when group_name is null", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-004",
          case_no: "CASE-004",
          case_name: null,
          case_type_code: "general",
          base_profile: null,
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

  void test("returns title when case_name is set", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-t1",
          case_no: "CASE-T1",
          case_name: "鈴木一郎 · 技人国",
          case_type_code: "work",
          base_profile: { name_jp: "鈴木一郎" },
          group_id: null,
          group_name: null,
          created_at: "2026-05-08T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-t1");
    assert.ok(result);
    assert.equal(result.title, "鈴木一郎 · 技人国");
  });

  void test("returns null title when case_name is NULL", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-t2",
          case_no: "CASE-T2",
          case_name: null,
          case_type_code: "work",
          base_profile: null,
          group_id: null,
          group_name: null,
          created_at: "2026-05-08T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-t2");
    assert.ok(result);
    assert.equal(result.title, null);
  });

  void test("extracts applicantName from base_profile.name_jp", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-a1",
          case_no: "CASE-A1",
          case_name: null,
          case_type_code: "dependent_visa",
          base_profile: { name_jp: "山田花子", name_cn: "张三" },
          group_id: null,
          group_name: null,
          created_at: "2026-05-08T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-a1");
    assert.ok(result);
    assert.equal(result.applicantName, "山田花子");
  });

  void test("falls back to name_cn when name_jp is absent", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-a2",
          case_no: "CASE-A2",
          case_name: null,
          case_type_code: "work",
          base_profile: { name_cn: "王五", name_en: "Wang Wu" },
          group_id: null,
          group_name: null,
          created_at: "2026-05-08T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-a2");
    assert.ok(result);
    assert.equal(result.applicantName, "王五");
  });

  void test("falls back to name_en when name_jp and name_cn are absent", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-a3",
          case_no: "CASE-A3",
          case_name: null,
          case_type_code: "work",
          base_profile: { name_en: "John Doe" },
          group_id: null,
          group_name: null,
          created_at: "2026-05-08T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-a3");
    assert.ok(result);
    assert.equal(result.applicantName, "John Doe");
  });

  void test("returns null applicantName when base_profile has no name fields", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-a4",
          case_no: "CASE-A4",
          case_name: null,
          case_type_code: "work",
          base_profile: { email: "test@example.com" },
          group_id: null,
          group_name: null,
          created_at: "2026-05-08T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-a4");
    assert.ok(result);
    assert.equal(result.applicantName, null);
  });

  void test("returns null applicantName when base_profile is null", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "case-a5",
          case_no: "CASE-A5",
          case_name: null,
          case_type_code: "work",
          base_profile: null,
          group_id: null,
          group_name: null,
          created_at: "2026-05-08T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCaseSummary(db, "case-a5");
    assert.ok(result);
    assert.equal(result.applicantName, null);
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

void describe("queryCustomerSummary — displayName / name resolution", () => {
  void test("respects name_default_locale=zh and returns name_cn", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-disp-1",
          base_profile: {
            name_cn: "走查客户",
            name_jp: "ウォークスルー",
            name_en: "Audit Customer",
            name_default_locale: "zh",
          },
          group_id: null,
          group_name: null,
          created_at: "2026-05-10T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-disp-1");
    assert.ok(result);
    assert.equal(result.displayName, "走查客户");
    assert.equal(result.name, "走查客户");
  });

  void test("respects name_default_locale=ja and returns name_jp", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-disp-2",
          base_profile: {
            name_cn: "山田",
            name_jp: "山田太郎",
            name_default_locale: "ja",
          },
          group_id: null,
          group_name: null,
          created_at: "2026-05-10T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-disp-2");
    assert.ok(result);
    assert.equal(result.displayName, "山田太郎");
  });

  void test("respects name_default_locale=en and returns name_en", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-disp-3",
          base_profile: {
            name_cn: "约翰",
            name_jp: "ジョン",
            name_en: "John Doe",
            name_default_locale: "en",
          },
          group_id: null,
          group_name: null,
          created_at: "2026-05-10T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-disp-3");
    assert.ok(result);
    assert.equal(result.displayName, "John Doe");
  });

  void test("falls back to canonical priority (name_cn → name_en → name_jp) when name_default_locale missing", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-disp-4",
          base_profile: {
            name_cn: "中文姓名",
            name_jp: "日本語名",
            name_en: "English Name",
          },
          group_id: null,
          group_name: null,
          created_at: "2026-05-10T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-disp-4");
    assert.ok(result);
    assert.equal(result.displayName, "中文姓名");
  });

  void test("uses explicit displayName before localized names", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-disp-5",
          base_profile: {
            displayName: "代表姓名",
            name_cn: "中文",
            name_jp: "日本語",
            name_default_locale: "ja",
          },
          group_id: null,
          group_name: null,
          created_at: "2026-05-10T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-disp-5");
    assert.ok(result);
    assert.equal(result.displayName, "代表姓名");
  });

  void test("falls back to next localized name when default locale field is empty", async () => {
    const db = makeTenantDb(() => ({
      rows: [
        {
          id: "cust-disp-6",
          base_profile: {
            name_cn: "",
            name_jp: "山田",
            name_default_locale: "zh",
          },
          group_id: null,
          group_name: null,
          created_at: "2026-05-10T00:00:00.000Z",
        },
      ],
    }));

    const result = await queryCustomerSummary(db, "cust-disp-6");
    assert.ok(result);
    assert.equal(result.displayName, "山田");
  });
});
