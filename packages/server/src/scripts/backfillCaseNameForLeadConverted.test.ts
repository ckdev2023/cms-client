import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  composeCaseNameFromRow,
  applyBackfillCaseName,
  type BackfillCaseNameRow,
} from "./backfillCaseNameForLeadConverted";

void describe("composeCaseNameFromRow", () => {
  void it("lead_name + known code → joined", () => {
    const row: BackfillCaseNameRow = {
      case_id: "c1",
      case_type_code: "business_manager_visa",
      lead_name: "田中太郎",
    };
    assert.equal(composeCaseNameFromRow(row), "田中太郎 · 経営・管理");
  });

  void it("lead_name + unknown code → name only", () => {
    const row: BackfillCaseNameRow = {
      case_id: "c2",
      case_type_code: "xyz_unknown",
      lead_name: "佐藤",
    };
    assert.equal(composeCaseNameFromRow(row), "佐藤");
  });

  void it("null lead_name + known code → type label only", () => {
    const row: BackfillCaseNameRow = {
      case_id: "c3",
      case_type_code: "permanent",
      lead_name: null,
    };
    assert.equal(composeCaseNameFromRow(row), "永住");
  });

  void it("null lead_name + unknown code → null", () => {
    const row: BackfillCaseNameRow = {
      case_id: "c4",
      case_type_code: "nope",
      lead_name: null,
    };
    assert.equal(composeCaseNameFromRow(row), null);
  });

  void it("whitespace-only lead_name is treated as empty", () => {
    const row: BackfillCaseNameRow = {
      case_id: "c5",
      case_type_code: "work",
      lead_name: "   ",
    };
    assert.equal(composeCaseNameFromRow(row), "技術・人文知識・国際業務");
  });
});

void describe("applyBackfillCaseName", () => {
  void it("updates rows with composable names and skips null results", async () => {
    const queries: { sql: string; params?: unknown[] }[] = [];
    const client = {
      query: (sql: string, params?: unknown[]) => {
        queries.push({ sql, params });
        return Promise.resolve({ rows: [] });
      },
    };

    const rows: BackfillCaseNameRow[] = [
      { case_id: "c1", case_type_code: "work", lead_name: "Alice" },
      { case_id: "c2", case_type_code: "unknown_xyz", lead_name: null },
      { case_id: "c3", case_type_code: "permanent", lead_name: "Bob" },
    ];

    const result = await applyBackfillCaseName(client, rows, false);

    assert.equal(result.updated, 2);
    assert.equal(result.skipped, 1);

    const updateQueries = queries.filter((q) => q.sql.includes("UPDATE cases"));
    assert.equal(updateQueries.length, 2);
    const firstParams = updateQueries[0]?.params ?? [];
    const secondParams = updateQueries[1]?.params ?? [];
    assert.equal(firstParams[0], "Alice · 技術・人文知識・国際業務");
    assert.equal(firstParams[1], "c1");
    assert.equal(secondParams[0], "Bob · 永住");
    assert.equal(secondParams[1], "c3");
  });

  void it("dry-run mode does not issue UPDATE queries", async () => {
    const queries: string[] = [];
    const client = {
      query: (sql: string) => {
        queries.push(sql);
        return Promise.resolve({ rows: [] });
      },
    };

    const rows: BackfillCaseNameRow[] = [
      { case_id: "c1", case_type_code: "work", lead_name: "Test" },
    ];

    const result = await applyBackfillCaseName(client, rows, true);

    assert.equal(result.updated, 1);
    assert.equal(result.skipped, 0);
    assert.ok(!queries.some((q) => q.includes("UPDATE")));
    assert.ok(!queries.some((q) => q.includes("BEGIN")));
  });
});
