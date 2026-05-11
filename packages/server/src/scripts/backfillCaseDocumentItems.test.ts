import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import {
  buildItemsFromBlueprint,
  resolveBackfillRows,
  BACKFILL_CASES_QUERY,
  TEMPLATE_BY_CANDIDATES_QUERY,
  type PgClient,
} from "./backfillCaseDocumentItems";

void describe("buildItemsFromBlueprint", () => {
  void it("returns items from {version,items} wrapped blueprint", () => {
    const blueprint = {
      version: 1,
      items: [
        {
          code: "passport_copy",
          name: "パスポートコピー",
          ownerSide: "applicant",
          category: "identity",
          requiredFlag: true,
          providedByRole: null,
        },
        {
          code: "resume",
          name: "履歴書",
          ownerSide: "applicant",
          category: "career",
          requiredFlag: true,
          providedByRole: "agent",
        },
        {
          code: "photo",
          name: "証明写真",
          ownerSide: "applicant",
        },
      ],
    };

    const items = buildItemsFromBlueprint(blueprint);

    assert.equal(items.length, 3);
    assert.deepEqual(items[0], {
      code: "passport_copy",
      name: "パスポートコピー",
      ownerSide: "applicant",
      category: "identity",
      requiredFlag: true,
      providedByRole: null,
    });
    assert.deepEqual(items[1], {
      code: "resume",
      name: "履歴書",
      ownerSide: "applicant",
      category: "career",
      requiredFlag: true,
      providedByRole: "agent",
    });
    assert.equal(items[2].code, "photo");
    assert.equal(items[2].name, "証明写真");
    assert.equal(items[2].ownerSide, "applicant");
  });

  void it("returns items from a plain array blueprint", () => {
    const blueprint = [
      { code: "tax_cert", name: "納税証明書", ownerSide: "company" },
      { code: "reg_cert", name: "登記簿謄本", ownerSide: "company" },
    ];

    const items = buildItemsFromBlueprint(blueprint);

    assert.equal(items.length, 2);
    assert.equal(items[0].code, "tax_cert");
    assert.equal(items[1].code, "reg_cert");
  });

  void it("returns [] for null blueprint", () => {
    assert.deepEqual(buildItemsFromBlueprint(null), []);
  });

  void it("returns [] for undefined blueprint", () => {
    assert.deepEqual(buildItemsFromBlueprint(undefined), []);
  });

  void it("returns [] for empty object blueprint", () => {
    assert.deepEqual(buildItemsFromBlueprint({}), []);
  });

  void it("returns [] for empty array blueprint", () => {
    assert.deepEqual(buildItemsFromBlueprint([]), []);
  });

  void it("returns [] for {items:[]} (wrapped but empty)", () => {
    assert.deepEqual(buildItemsFromBlueprint({ version: 1, items: [] }), []);
  });

  void it("defaults missing optional fields", () => {
    const blueprint = {
      items: [{ code: "minimal", name: "最小項目" }],
    };

    const items = buildItemsFromBlueprint(blueprint);

    assert.equal(items.length, 1);
    assert.deepEqual(items[0], {
      code: "minimal",
      name: "最小項目",
      ownerSide: "applicant",
      category: null,
      requiredFlag: false,
      providedByRole: null,
    });
  });

  void it("reads checklistItemCode as fallback for code", () => {
    const blueprint = [
      { checklistItemCode: "alt_code", name: "代替コード項目" },
    ];

    const items = buildItemsFromBlueprint(blueprint);

    assert.equal(items.length, 1);
    assert.equal(items[0].code, "alt_code");
  });
});

void describe("resolveBackfillRows", () => {
  const DEPENDENT_VISA_BLUEPRINT = {
    version: 1,
    items: [
      { code: "dv_passport", name: "パスポート", ownerSide: "applicant" },
    ],
  };

  function createMockClient(
    cases: { case_id: string; org_id: string; case_type_code: string }[],
    templates: Map<string, unknown>,
  ): PgClient {
    type QueryResult = { rows: Record<string, unknown>[] };
    const queryFn = mock.fn(
      (sql: string, params?: unknown[]): Promise<QueryResult> => {
        if (sql === BACKFILL_CASES_QUERY) {
          return Promise.resolve({
            rows: cases as Record<string, unknown>[],
          });
        }
        if (sql === TEMPLATE_BY_CANDIDATES_QUERY) {
          const p = params ?? [];
          const candidates = p[1] as string[];
          for (const c of candidates) {
            const key = `${p[0] as string}:${c}`;
            if (templates.has(key)) {
              return Promise.resolve({
                rows: [{ requirement_blueprint: templates.get(key) }] as Record<
                  string,
                  unknown
                >[],
              });
            }
          }
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      },
    );
    return { query: queryFn };
  }

  void it("resolves family alias to dependent_visa template", async () => {
    const org = "org-1";
    const tplMap = new Map<string, unknown>();
    tplMap.set(`${org}:dependent_visa`, DEPENDENT_VISA_BLUEPRINT);

    const client = createMockClient(
      [{ case_id: "c-1", org_id: org, case_type_code: "family" }],
      tplMap,
    );

    const rows = await resolveBackfillRows(client);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].case_id, "c-1");
    assert.deepEqual(rows[0].requirement_blueprint, DEPENDENT_VISA_BLUEPRINT);
  });

  void it("resolves family_stay alias to dependent_visa template", async () => {
    const org = "org-1";
    const tplMap = new Map<string, unknown>();
    tplMap.set(`${org}:dependent_visa`, DEPENDENT_VISA_BLUEPRINT);

    const client = createMockClient(
      [{ case_id: "c-2", org_id: org, case_type_code: "family_stay" }],
      tplMap,
    );

    const rows = await resolveBackfillRows(client);

    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].requirement_blueprint, DEPENDENT_VISA_BLUEPRINT);
  });

  void it("prefers exact match over canonical fallback", async () => {
    const org = "org-1";
    const exactBlueprint = {
      version: 1,
      items: [{ code: "exact", name: "exact" }],
    };
    const tplMap = new Map<string, unknown>();
    tplMap.set(`${org}:family`, exactBlueprint);
    tplMap.set(`${org}:dependent_visa`, DEPENDENT_VISA_BLUEPRINT);

    const client = createMockClient(
      [{ case_id: "c-3", org_id: org, case_type_code: "family" }],
      tplMap,
    );

    const rows = await resolveBackfillRows(client);

    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].requirement_blueprint, exactBlueprint);
  });

  void it("resolves biz_mgmt subtypes to business_manager_visa", async () => {
    const org = "org-1";
    const bmvBlueprint = {
      version: 1,
      items: [{ code: "bmv_doc", name: "BMV" }],
    };
    const tplMap = new Map<string, unknown>();
    tplMap.set(`${org}:business_manager_visa`, bmvBlueprint);

    const client = createMockClient(
      [{ case_id: "c-4", org_id: org, case_type_code: "biz_mgmt_cert_4m" }],
      tplMap,
    );

    const rows = await resolveBackfillRows(client);

    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].requirement_blueprint, bmvBlueprint);
  });

  void it("returns null blueprint when no template matches", async () => {
    const client = createMockClient(
      [{ case_id: "c-5", org_id: "org-1", case_type_code: "unknown_type" }],
      new Map(),
    );

    const rows = await resolveBackfillRows(client);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].requirement_blueprint, null);
  });

  void it("caches template lookups per (org_id, case_type_code)", async () => {
    const org = "org-1";
    const tplMap = new Map<string, unknown>();
    tplMap.set(`${org}:dependent_visa`, DEPENDENT_VISA_BLUEPRINT);

    const client = createMockClient(
      [
        { case_id: "c-6", org_id: org, case_type_code: "family" },
        { case_id: "c-7", org_id: org, case_type_code: "family" },
      ],
      tplMap,
    );

    const rows = await resolveBackfillRows(client);

    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0].requirement_blueprint, DEPENDENT_VISA_BLUEPRINT);
    assert.deepEqual(rows[1].requirement_blueprint, DEPENDENT_VISA_BLUEPRINT);

    const templateCalls = (
      client.query as unknown as ReturnType<typeof mock.fn>
    ).mock.calls.filter(
      (call) => (call.arguments[0] as string) === TEMPLATE_BY_CANDIDATES_QUERY,
    );
    assert.equal(
      templateCalls.length,
      1,
      "template query called only once for same (org, type)",
    );
  });
});
