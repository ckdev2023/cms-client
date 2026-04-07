import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  CommunicationLogsService,
  mapCommunicationLogRow,
} from "./communicationLogs.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const LOG_ID = "log-1";
const CASE_ID = "case-1";
const CUSTOMER_ID = "customer-1";
const COMPANY_ID = "company-1";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeLogRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LOG_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    customer_id: CUSTOMER_ID,
    company_id: COMPANY_ID,
    channel_type: "email",
    direction: "outbound",
    subject: "Follow up",
    content_summary: "sent summary",
    full_content: "body",
    visible_to_client: true,
    created_by: USER_ID,
    follow_up_required: true,
    follow_up_due_at: "2026-04-01T00:00:00.000Z",
    created_at: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

function makePool(queryFn: PoolClientLike["query"]): Pool {
  const client: PoolClientLike = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) } as unknown as Pool;
}

function makeTimeline() {
  const writes: unknown[] = [];
  return {
    service: {
      write: (_ctx: unknown, input: unknown) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}

function service(pool: Pool, tl: ReturnType<typeof makeTimeline>) {
  return new CommunicationLogsService(pool, tl.service as never);
}

void test("mapCommunicationLogRow maps database row", () => {
  const log = mapCommunicationLogRow(makeLogRow());
  assert.equal(log.id, LOG_ID);
  assert.equal(log.caseId, CASE_ID);
  assert.equal(log.channelType, "email");
  assert.equal(log.followUpRequired, true);
});

void test("mapCommunicationLogRow handles null optional fields", () => {
  const log = mapCommunicationLogRow(
    makeLogRow({
      case_id: null,
      customer_id: null,
      company_id: null,
      subject: null,
      content_summary: null,
      full_content: null,
      created_by: null,
      follow_up_due_at: null,
    }),
  );
  assert.equal(log.caseId, null);
  assert.equal(log.customerId, null);
  assert.equal(log.companyId, null);
  assert.equal(log.followUpDueAt, null);
});

void test("CommunicationLogsService.create inserts row and dual-writes case timeline", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    if (sql.includes("select id from customers")) {
      return Promise.resolve({ rows: [{ id: CUSTOMER_ID }], rowCount: 1 });
    }
    if (sql.includes("insert into communication_logs")) {
      return Promise.resolve({ rows: [makeLogRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const tl = makeTimeline();

  const created = await service(pool, tl).create(makeCtx(), {
    caseId: CASE_ID,
    customerId: CUSTOMER_ID,
    channelType: "email",
    direction: "outbound",
    followUpRequired: true,
  });

  assert.equal(created.id, LOG_ID);
  assert.equal(created.createdBy, USER_ID);
  assert.equal(tl.writes.length, 2);
  assert.deepEqual(tl.writes[0], {
    entityType: "communication_log",
    entityId: LOG_ID,
    action: "communication_log.created",
    payload: {
      caseId: CASE_ID,
      customerId: CUSTOMER_ID,
      companyId: COMPANY_ID,
      channelType: "email",
      direction: "outbound",
    },
  });
  assert.deepEqual(tl.writes[1], {
    entityType: "case",
    entityId: CASE_ID,
    action: "communication_log.created",
    payload: {
      communicationLogId: LOG_ID,
      channelType: "email",
      direction: "outbound",
    },
  });
});

void test("CommunicationLogsService.create requires one relation id", async () => {
  await assert.rejects(
    () =>
      service(
        makePool(() => Promise.resolve({ rows: [], rowCount: 0 })),
        makeTimeline(),
      ).create(makeCtx(), {
        channelType: "phone",
      }),
    {
      name: "BadRequestException",
      message: "caseId, customerId or companyId is required",
    },
  );
});

void test("CommunicationLogsService.create validates enums and org isolation", async () => {
  await assert.rejects(
    () =>
      service(
        makePool(() => Promise.resolve({ rows: [], rowCount: 0 })),
        makeTimeline(),
      ).create(makeCtx(), {
        caseId: CASE_ID,
        channelType: "sms",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("Invalid channelType"));
      return true;
    },
  );

  const pool = makePool((sql) => {
    if (sql.includes("select id from companies")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  await assert.rejects(
    () =>
      service(pool, makeTimeline()).create(makeCtx(), {
        companyId: COMPANY_ID,
        channelType: "phone",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("companies"));
      return true;
    },
  );
});

void test("CommunicationLogsService.get returns item or null", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from communication_logs") && params?.[0] === LOG_ID) {
      return Promise.resolve({ rows: [makeLogRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const found = await service(pool, makeTimeline()).get(
    makeCtx("viewer"),
    LOG_ID,
  );
  assert.ok(found);
  assert.equal(found.id, LOG_ID);

  const missing = await service(pool, makeTimeline()).get(
    makeCtx("viewer"),
    "missing",
  );
  assert.equal(missing, null);
});

void test("CommunicationLogsService.list returns items and applies relation filters", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [makeLogRow()], rowCount: 1 });
  });

  const result = await service(pool, makeTimeline()).list(makeCtx("viewer"), {
    caseId: CASE_ID,
    customerId: CUSTOMER_ID,
    companyId: COMPANY_ID,
  });

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  const countSql = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countSql);
  assert.ok(countSql.sql.includes("case_id = $"));
  assert.ok(countSql.sql.includes("customer_id = $"));
  assert.ok(countSql.sql.includes("company_id = $"));
});

void test("CommunicationLogsService.update updates row and writes case timeline", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from communication_logs") && params?.[0] === LOG_ID) {
      return Promise.resolve({ rows: [makeLogRow()], rowCount: 1 });
    }
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    if (sql.includes("select id from customers")) {
      return Promise.resolve({ rows: [{ id: CUSTOMER_ID }], rowCount: 1 });
    }
    if (sql.includes("select id from companies")) {
      return Promise.resolve({ rows: [{ id: COMPANY_ID }], rowCount: 1 });
    }
    if (sql.includes("update communication_logs")) {
      return Promise.resolve({
        rows: [makeLogRow({ subject: "Updated subject" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const tl = makeTimeline();

  const updated = await service(pool, tl).update(makeCtx(), LOG_ID, {
    subject: "Updated subject",
  });

  assert.equal(updated.subject, "Updated subject");
  assert.equal(tl.writes.length, 2);
  assert.equal(
    (tl.writes[0] as { entityType: string }).entityType,
    "communication_log",
  );
  assert.equal((tl.writes[1] as { entityType: string }).entityType, "case");
});

void test("CommunicationLogsService.update rejects removing all relations", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from communication_logs") && params?.[0] === LOG_ID) {
      return Promise.resolve({ rows: [makeLogRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      service(pool, makeTimeline()).update(makeCtx(), LOG_ID, {
        caseId: null,
        customerId: null,
        companyId: null,
      }),
    {
      name: "BadRequestException",
      message: "caseId, customerId or companyId is required",
    },
  );
});

void test("CommunicationLogsService.followUps queries due items only", async () => {
  const calls: string[] = [];
  const pool = makePool((sql) => {
    calls.push(sql.trim());
    return Promise.resolve({ rows: [makeLogRow()], rowCount: 1 });
  });

  const result = await service(pool, makeTimeline()).followUps(makeCtx(), {
    caseId: CASE_ID,
  });
  assert.equal(result.length, 1);
  const followUpQuery = calls.find((sql) =>
    sql.includes("from communication_logs"),
  );
  assert.ok(followUpQuery?.includes("follow_up_required = true"));
  assert.ok(followUpQuery?.includes("follow_up_due_at <= now()"));
  assert.ok(followUpQuery?.includes("case_id = $"));
});
