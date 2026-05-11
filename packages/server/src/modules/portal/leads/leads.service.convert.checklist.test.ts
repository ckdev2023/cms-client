import test from "node:test";
import assert from "node:assert/strict";

import type { TemplatesResolver } from "../../core/cases/cases.service.types-internal";
import type { RequestContext } from "../../core/tenancy/requestContext";
import { LeadsService } from "./leads.service";
import {
  SAMPLE_LEAD_ROW,
  makePoolWithClient,
} from "./leads.service.test-support";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";
const ACTOR_ID = "00000000-0000-4000-8000-000000000003";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000004";

function makeStubResolver(
  items: { code: string; name: string }[],
): TemplatesResolver {
  return {
    resolve: () =>
      Promise.resolve({
        mode: "template" as const,
        used: true as const,
        version: 1,
        config: { items },
      }),
  };
}

function makeEmptyResolver(): TemplatesResolver {
  return {
    resolve: () =>
      Promise.resolve({
        mode: "legacy" as const,
        used: false as const,
      }),
  };
}

function makeConvertPool(
  leadRow: Record<string, unknown>,
  onClient?: (sql: string, params?: unknown[]) => void,
) {
  return makePoolWithClient(
    (sql, params) => {
      onClient?.(sql, params ?? []);
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK")
        return Promise.resolve({ rows: [] });
      if (sql.includes("SAVEPOINT") || sql.includes("RELEASE"))
        return Promise.resolve({ rows: [] });
      if (sql.includes("set_config")) return Promise.resolve({ rows: [] });
      if (sql.includes("insert into cases"))
        return Promise.resolve({ rows: [{ id: "case-1" }] });
      if (sql.includes("update leads"))
        return Promise.resolve({
          rows: [
            {
              ...leadRow,
              status: "converted_case",
              converted_customer_id: CUSTOMER_ID,
              converted_case_id: "case-1",
            },
          ],
        });
      if (sql.includes("case_templates")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
    (sql) => {
      if (sql.includes("select") && sql.includes("from leads"))
        return Promise.resolve({ rows: [leadRow] });
      return Promise.resolve({ rows: [] });
    },
  );
}

// ── checklist bootstrap on convert ──

void test("convert inserts document_items when templatesResolver returns checklist", async () => {
  const leadRow = { ...SAMPLE_LEAD_ROW, assigned_org_id: ORG_ID };
  const docInserts: unknown[][] = [];

  const pool = makeConvertPool(leadRow, (sql, params) => {
    if (sql.includes("insert into document_items")) {
      docInserts.push(params ?? []);
    }
  });

  const resolver = makeStubResolver([
    { code: "passport", name: "パスポート" },
    { code: "photo", name: "証明写真" },
  ]);

  const svc = new LeadsService(pool, resolver);
  const result = await svc.convert("lead-1", {
    customerId: CUSTOMER_ID,
    caseTypeCode: "dependent_visa",
    ownerUserId: USER_ID,
    orgId: ORG_ID,
    confirmDedup: true,
  });

  assert.equal(result.caseId, "case-1");
  assert.equal(docInserts.length, 2, "Should insert 2 document_items");
  assert.equal(docInserts[0][0], ORG_ID);
  assert.equal(docInserts[0][1], "case-1");
  assert.equal(docInserts[0][2], "passport");
  assert.equal(docInserts[0][3], "パスポート");
  assert.equal(docInserts[0][4], "pending");
  assert.equal(docInserts[1][2], "photo");
});

void test("convert writes case.created timeline with lead_conversion source", async () => {
  const leadRow = { ...SAMPLE_LEAD_ROW, assigned_org_id: ORG_ID };
  const timelineInserts: { sql: string; params: unknown[] }[] = [];

  const pool = makeConvertPool(leadRow, (sql, params) => {
    if (sql.includes("insert into timeline_logs")) {
      timelineInserts.push({ sql, params: params ?? [] });
    }
  });

  const resolver = makeStubResolver([]);
  const svc = new LeadsService(pool, resolver);
  await svc.convert("lead-1", {
    customerId: CUSTOMER_ID,
    caseTypeCode: "immigration",
    ownerUserId: USER_ID,
    orgId: ORG_ID,
    confirmDedup: true,
    actorUserId: ACTOR_ID,
  });

  const caseCreated = timelineInserts.find((t) =>
    t.sql.includes("case.created"),
  );
  assert.ok(caseCreated, "Should write case.created timeline");
  assert.equal(caseCreated.params[0], ORG_ID);
  assert.equal(caseCreated.params[1], "case-1");
  assert.equal(caseCreated.params[2], ACTOR_ID);

  const payload = JSON.parse(caseCreated.params[3] as string) as Record<
    string,
    unknown
  >;
  assert.equal(payload.source, "lead_conversion");
  assert.equal(payload.caseTypeCode, "immigration");
});

void test("convert without templatesResolver still succeeds with zero document_items", async () => {
  const leadRow = { ...SAMPLE_LEAD_ROW, assigned_org_id: ORG_ID };
  const docInserts: unknown[][] = [];

  const pool = makeConvertPool(leadRow, (sql, params) => {
    if (sql.includes("insert into document_items")) {
      docInserts.push(params ?? []);
    }
  });

  const svc = new LeadsService(pool);
  const result = await svc.convert("lead-1", {
    customerId: CUSTOMER_ID,
    caseTypeCode: "immigration",
    ownerUserId: USER_ID,
    orgId: ORG_ID,
    confirmDedup: true,
  });

  assert.equal(result.caseId, "case-1");
  assert.equal(docInserts.length, 0, "No document_items when resolver absent");
});

void test("convert with resolver returning empty checklist inserts zero document_items", async () => {
  const leadRow = { ...SAMPLE_LEAD_ROW, assigned_org_id: ORG_ID };
  const docInserts: unknown[][] = [];

  const pool = makeConvertPool(leadRow, (sql, params) => {
    if (sql.includes("insert into document_items")) {
      docInserts.push(params ?? []);
    }
  });

  const resolver = makeEmptyResolver();
  const svc = new LeadsService(pool, resolver);
  const result = await svc.convert("lead-1", {
    customerId: CUSTOMER_ID,
    caseTypeCode: "unknown_type",
    ownerUserId: USER_ID,
    orgId: ORG_ID,
    confirmDedup: true,
  });

  assert.equal(result.caseId, "case-1");
  assert.equal(docInserts.length, 0);
});

void test("convert preserves ownerSide, category, requiredFlag, providedByRole from checklist items", async () => {
  const leadRow = { ...SAMPLE_LEAD_ROW, assigned_org_id: ORG_ID };
  const docInserts: unknown[][] = [];

  const pool = makeConvertPool(leadRow, (sql, params) => {
    if (sql.includes("insert into document_items")) {
      docInserts.push(params ?? []);
    }
  });

  const resolver: TemplatesResolver = {
    resolve: () =>
      Promise.resolve({
        mode: "template" as const,
        used: true as const,
        version: 1,
        config: {
          items: [
            {
              code: "doc-1",
              name: "Required Doc",
              ownerSide: "office",
              category: "identity",
              requiredFlag: true,
              providedByRole: "admin",
            },
          ],
        },
      }),
  };

  const svc = new LeadsService(pool, resolver);
  await svc.convert("lead-1", {
    customerId: CUSTOMER_ID,
    caseTypeCode: "dependent_visa",
    ownerUserId: USER_ID,
    orgId: ORG_ID,
    confirmDedup: true,
  });

  assert.equal(docInserts.length, 1);
  const [
    orgId,
    caseId,
    code,
    name,
    status,
    ownerSide,
    category,
    requiredFlag,
    providedByRole,
  ] = docInserts[0];
  assert.equal(orgId, ORG_ID);
  assert.equal(caseId, "case-1");
  assert.equal(code, "doc-1");
  assert.equal(name, "Required Doc");
  assert.equal(status, "pending");
  assert.equal(ownerSide, "office");
  assert.equal(category, "identity");
  assert.equal(requiredFlag, true);
  assert.equal(providedByRole, "admin");
});

void test("convert uses actorUserId for RequestContext when available", async () => {
  const leadRow = { ...SAMPLE_LEAD_ROW, assigned_org_id: ORG_ID };
  let resolverCtx: RequestContext | undefined;

  const pool = makeConvertPool(leadRow);

  const resolver: TemplatesResolver = {
    resolve: (ctx: RequestContext) => {
      resolverCtx = ctx;
      return Promise.resolve({
        mode: "legacy" as const,
        used: false as const,
      });
    },
  };

  const svc = new LeadsService(pool, resolver);
  await svc.convert("lead-1", {
    customerId: CUSTOMER_ID,
    caseTypeCode: "immigration",
    ownerUserId: USER_ID,
    orgId: ORG_ID,
    confirmDedup: true,
    actorUserId: ACTOR_ID,
  });

  assert.ok(resolverCtx);
  assert.equal(resolverCtx.orgId, ORG_ID);
  assert.equal(resolverCtx.userId, ACTOR_ID);
  assert.equal(resolverCtx.role, "staff");
});
