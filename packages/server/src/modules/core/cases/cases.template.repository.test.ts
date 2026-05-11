import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  findActiveCaseTemplateByCaseType,
  resolveCaseTypeCandidates,
} from "./cases.template.repository";
import type { RequestContext } from "../tenancy/requestContext";

const ORG = "00000000-0000-4000-8000-000000000000";
const USR = "00000000-0000-4000-8000-000000000001";

function makeCtx(): RequestContext {
  return {
    orgId: ORG,
    userId: USR,
    role: "staff",
  } as unknown as RequestContext;
}

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());
const ok = (rows: unknown[] = []) => Promise.resolve({ rows });

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[] }>;

function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  };
}

void describe("findActiveCaseTemplateByCaseType", () => {
  void test("returns found=true with parsed items when template exists", async () => {
    const blueprint = {
      version: 1,
      items: [
        {
          checklistItemCode: "fs-passport-copy",
          name: "パスポートコピー",
          category: "personal",
          requiredFlag: true,
          ownerSide: "applicant",
        },
        {
          checklistItemCode: "fs-photo",
          name: "証明写真",
          category: "personal",
          requiredFlag: true,
          ownerSide: "applicant",
        },
      ],
    };

    const pool = makePool(() =>
      ok([
        {
          id: "tpl-1",
          case_type: "family_stay",
          application_type: null,
          requirement_blueprint: blueprint,
          active_flag: true,
        },
      ]),
    );

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "family_stay",
    );

    assert.equal(result.found, true);
    const items = (result as { found: true; items: unknown[] }).items;
    assert.equal(items.length, 2);
    assert.equal((items[0] as { code: string }).code, "fs-passport-copy");
    assert.equal((items[0] as { name: string }).name, "パスポートコピー");
    assert.equal((items[0] as { ownerSide: string }).ownerSide, "applicant");
    assert.equal((items[0] as { requiredFlag: boolean }).requiredFlag, true);
    assert.equal((items[1] as { code: string }).code, "fs-photo");
  });

  void test("returns found=false when no template matches", async () => {
    const pool = makePool(() => ok([]));

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "unknown_type",
    );

    assert.equal(result.found, false);
  });

  void test("query filters by active_flag=true", async () => {
    let capturedSql = "";
    const pool = makePool((sql) => {
      capturedSql = sql;
      return ok([]);
    });

    await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "family_stay",
    );

    assert.ok(
      capturedSql.includes("active_flag = true"),
      `Expected SQL to filter active_flag. Got: ${capturedSql}`,
    );
  });

  void test("handles flat array requirement_blueprint", async () => {
    const blueprint = [
      {
        code: "item-1",
        name: "Item 1",
        ownerSide: "office",
        requiredFlag: false,
      },
    ];

    const pool = makePool(() =>
      ok([
        {
          id: "tpl-2",
          case_type: "work",
          application_type: null,
          requirement_blueprint: blueprint,
          active_flag: true,
        },
      ]),
    );

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "work",
    );

    assert.equal(result.found, true);
    const items = (result as { found: true; items: unknown[] }).items;
    assert.equal(items.length, 1);
    assert.equal((items[0] as { code: string }).code, "item-1");
    assert.equal((items[0] as { ownerSide: string }).ownerSide, "office");
  });

  void test("falls back to business_manager_visa template for BMV subtype codes", async () => {
    const blueprint = {
      version: 1,
      items: [
        {
          checklistItemCode: "bmv_questionnaire",
          name: "経営管理ビザ情報表",
          category: "questionnaire",
          requiredFlag: true,
          ownerSide: "customer",
        },
      ],
    };
    const queries: { sql: string; params: unknown[] | undefined }[] = [];
    let callCount = 0;
    const pool = makePool((sql, params) => {
      queries.push({ sql, params });
      callCount += 1;
      // First call (case_type='biz_mgmt_cert_4m'): return empty.
      if (callCount === 1) return ok([]);
      // Second call (case_type='business_manager_visa'): return BMV template.
      return ok([
        {
          id: "tpl-bmv",
          case_type: "business_manager_visa",
          application_type: null,
          requirement_blueprint: blueprint,
          active_flag: true,
        },
      ]);
    });

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "biz_mgmt_cert_4m",
    );

    assert.equal(result.found, true);
    const items = (result as { found: true; items: unknown[] }).items;
    assert.equal(items.length, 1);
    assert.equal((items[0] as { code: string }).code, "bmv_questionnaire");
    // First lookup uses the original sub-type code, then falls back to canonical.
    assert.deepEqual(queries[0].params, ["biz_mgmt_cert_4m"]);
    assert.deepEqual(queries[1].params, ["business_manager_visa"]);
  });

  void test("does not fall back for non-BMV unknown codes", async () => {
    let callCount = 0;
    const pool = makePool(() => {
      callCount += 1;
      return ok([]);
    });

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "totally_unknown",
    );

    assert.equal(result.found, false);
    assert.equal(callCount, 1);
  });

  void test("returns found=false when only templates have empty blueprint", async () => {
    const pool = makePool(() =>
      ok([
        {
          id: "tpl-3",
          case_type: "family_stay",
          application_type: null,
          requirement_blueprint: null,
          active_flag: true,
        },
      ]),
    );

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "family_stay",
    );

    assert.equal(result.found, false);
  });

  void test("prefers older template row when newest active row has empty blueprint", async () => {
    const goodBlueprint = {
      version: 1,
      items: [
        {
          checklistItemCode: "dv-from-old-row",
          name: "旧版但有条目",
          category: "personal",
          requiredFlag: true,
          ownerSide: "applicant",
        },
      ],
    };

    const pool = makePool(() =>
      ok([
        {
          id: "tpl-new-empty",
          case_type: "dependent_visa",
          application_type: null,
          requirement_blueprint: { version: 1, items: [] },
          active_flag: true,
        },
        {
          id: "tpl-old-good",
          case_type: "dependent_visa",
          application_type: null,
          requirement_blueprint: goodBlueprint,
          active_flag: true,
        },
      ]),
    );

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "dependent_visa",
    );

    assert.equal(result.found, true);
    const items = (result as { found: true; items: unknown[] }).items;
    assert.equal(items.length, 1);
    assert.equal((items[0] as { code: string }).code, "dv-from-old-row");
  });

  void test("falls back to canonical dependent_visa for alias 'family'", async () => {
    const blueprint = {
      version: 1,
      items: [
        {
          checklistItemCode: "dv-passport-copy",
          name: "パスポートコピー",
          category: "personal",
          requiredFlag: true,
          ownerSide: "applicant",
        },
      ],
    };
    const queries: { sql: string; params: unknown[] | undefined }[] = [];
    let callCount = 0;
    const pool = makePool((sql, params) => {
      queries.push({ sql, params });
      callCount += 1;
      if (callCount === 1) return ok([]);
      return ok([
        {
          id: "tpl-dv",
          case_type: "dependent_visa",
          application_type: null,
          requirement_blueprint: blueprint,
          active_flag: true,
        },
      ]);
    });

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "family",
    );

    assert.equal(result.found, true);
    const items = (result as { found: true; items: unknown[] }).items;
    assert.equal(items.length, 1);
    assert.equal((items[0] as { code: string }).code, "dv-passport-copy");
    assert.deepEqual(queries[0].params, ["family"]);
    assert.deepEqual(queries[1].params, ["dependent_visa"]);
  });

  void test("falls back to canonical dependent_visa for alias 'family_stay'", async () => {
    const blueprint = {
      version: 1,
      items: [
        {
          checklistItemCode: "dv-photo",
          name: "証明写真",
          category: "personal",
          requiredFlag: true,
          ownerSide: "applicant",
        },
      ],
    };
    let callCount = 0;
    const pool = makePool(() => {
      callCount += 1;
      if (callCount === 1) return ok([]);
      return ok([
        {
          id: "tpl-dv2",
          case_type: "dependent_visa",
          application_type: null,
          requirement_blueprint: blueprint,
          active_flag: true,
        },
      ]);
    });

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "family_stay",
    );

    assert.equal(result.found, true);
    const items = (result as { found: true; items: unknown[] }).items;
    assert.equal(items.length, 1);
    assert.equal((items[0] as { code: string }).code, "dv-photo");
  });

  void test("no seed type still returns found=false", async () => {
    let callCount = 0;
    const pool = makePool(() => {
      callCount += 1;
      return ok([]);
    });

    const result = await findActiveCaseTemplateByCaseType(
      pool as never,
      makeCtx(),
      "intra_company_transfer",
    );

    assert.equal(result.found, false);
    assert.equal(callCount, 1);
  });
});

void describe("resolveCaseTypeCandidates", () => {
  void test("returns [raw] when raw equals canonical", () => {
    assert.deepEqual(resolveCaseTypeCandidates("work"), ["work"]);
    assert.deepEqual(resolveCaseTypeCandidates("business_manager_visa"), [
      "business_manager_visa",
    ]);
  });

  void test("returns [raw, canonical] for alias types", () => {
    assert.deepEqual(resolveCaseTypeCandidates("family"), [
      "family",
      "dependent_visa",
    ]);
    assert.deepEqual(resolveCaseTypeCandidates("family_stay"), [
      "family_stay",
      "dependent_visa",
    ]);
  });

  void test("returns [raw, BMV] for BMV subtypes", () => {
    assert.deepEqual(resolveCaseTypeCandidates("biz_mgmt_cert_4m"), [
      "biz_mgmt_cert_4m",
      "business_manager_visa",
    ]);
    assert.deepEqual(resolveCaseTypeCandidates("biz_mgmt_renewal"), [
      "biz_mgmt_renewal",
      "business_manager_visa",
    ]);
  });

  void test("returns single element for unknown types", () => {
    assert.deepEqual(resolveCaseTypeCandidates("totally_unknown"), [
      "totally_unknown",
    ]);
  });
});
