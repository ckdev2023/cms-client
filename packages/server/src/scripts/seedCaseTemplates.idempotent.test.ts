import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { seedCaseTemplates, CASE_TEMPLATE_SEEDS } from "./seedCaseTemplates";

const ORG_ID = "00000000-0000-4000-8000-000000000099";

type QueryCall = { sql: string; params: unknown[] | undefined };

function makeFakeClient(preExisting: Map<string, Record<string, unknown>>) {
  const calls: QueryCall[] = [];
  const store = new Map(preExisting);

  return {
    calls,
    store,
    client: {
      query: (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });

        const insertMatch = /INSERT INTO case_templates/i.exec(sql);
        if (insertMatch && params) {
          const [id, , templateName, caseType, applicationType, blueprint] =
            params as [string, string, string, string, string | null, string];

          store.set(id, {
            id,
            template_name: templateName,
            case_type: caseType,
            application_type: applicationType,
            requirement_blueprint: JSON.parse(blueprint),
            active_flag: true,
          });
        }

        return { rows: [] };
      },
    },
  };
}

void describe("seedCaseTemplates idempotent upsert", () => {
  void test("overwrites stale case_type and template_name on conflict", async () => {
    const FAMILY_STAY_ID = "00000000-0000-4000-a000-000000000700";

    const staleRow: Record<string, unknown> = {
      id: FAMILY_STAY_ID,
      template_name: "旧テンプレート名",
      case_type: "family_stay",
      application_type: null,
      requirement_blueprint: { version: 1, items: [] },
      active_flag: true,
    };

    const { client, store } = makeFakeClient(
      new Map([[FAMILY_STAY_ID, staleRow]]),
    );

    await seedCaseTemplates(client as never, ORG_ID);

    const updated = store.get(FAMILY_STAY_ID);
    assert.ok(updated, "expected family-stay template to exist after seed");
    assert.equal(
      updated.case_type,
      "dependent_visa",
      "case_type should be overwritten from family_stay to dependent_visa",
    );
    assert.equal(
      updated.template_name,
      "家族滞在ビザ標準テンプレート",
      "template_name should be overwritten to the canonical value",
    );
  });

  void test("all three templates are upserted", async () => {
    const { client, store } = makeFakeClient(new Map());

    await seedCaseTemplates(client as never, ORG_ID);

    assert.equal(store.size, 3, "should insert exactly 3 templates");

    const caseTypes = [...store.values()].map((r) => r.case_type as string);
    assert.ok(caseTypes.includes("dependent_visa"));
    assert.ok(caseTypes.includes("work"));
    assert.ok(caseTypes.includes("business_manager_visa"));
  });

  void test("running twice produces identical results (true idempotency)", async () => {
    const { client, store } = makeFakeClient(new Map());

    await seedCaseTemplates(client as never, ORG_ID);
    const afterFirst = new Map(
      [...store.entries()].map(([k, v]) => [k, { ...v }]),
    );

    await seedCaseTemplates(client as never, ORG_ID);

    for (const [id, row] of store) {
      const prev = afterFirst.get(id);
      assert.ok(prev, `expected template ${id} in first-run snapshot`);
      assert.equal(row.case_type, prev.case_type);
      assert.equal(row.template_name, prev.template_name);
      assert.deepEqual(row.requirement_blueprint, prev.requirement_blueprint);
    }
  });

  void test("SQL includes ON CONFLICT … DO UPDATE with key fields", async () => {
    const { client, calls } = makeFakeClient(new Map());

    await seedCaseTemplates(client as never, ORG_ID);

    assert.equal(calls.length, CASE_TEMPLATE_SEEDS.length);

    for (const call of calls) {
      assert.ok(
        call.sql.includes("ON CONFLICT"),
        "INSERT should have ON CONFLICT clause",
      );
      assert.ok(
        call.sql.includes("DO UPDATE"),
        "ON CONFLICT should include DO UPDATE",
      );
    }
  });

  void test("passes org_id as second parameter to every INSERT", async () => {
    const { client, calls } = makeFakeClient(new Map());

    await seedCaseTemplates(client as never, ORG_ID);

    for (const call of calls) {
      assert.ok(call.params, "expected params array");
      const params = call.params;
      assert.equal(params[1], ORG_ID, "second param should be the org_id");
    }
  });
});
