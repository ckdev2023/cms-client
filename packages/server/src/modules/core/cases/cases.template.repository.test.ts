import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { findActiveCaseTemplateByCaseType } from "./cases.template.repository";
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

  void test("returns empty items when requirement_blueprint is null", async () => {
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

    assert.equal(result.found, true);
    const items = (result as { found: true; items: unknown[] }).items;
    assert.equal(items.length, 0);
  });
});
