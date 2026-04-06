import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  ContactPersonsService,
  mapContactPersonRow,
} from "./contactPersons.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

const sampleRow = {
  id: "cp1",
  org_id: ORG_ID,
  company_id: "comp1",
  customer_id: null as string | null,
  name: "Taro Yamada",
  role_title: "CEO",
  relation_type: "representative",
  phone: "090-1234-5678",
  email: "taro@example.com",
  preferred_language: "ja",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

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

// ── mapContactPersonRow ──

void test("mapContactPersonRow maps row to ContactPerson entity", () => {
  const cp = mapContactPersonRow(sampleRow);
  assert.equal(cp.id, "cp1");
  assert.equal(cp.orgId, ORG_ID);
  assert.equal(cp.companyId, "comp1");
  assert.equal(cp.customerId, null);
  assert.equal(cp.name, "Taro Yamada");
  assert.equal(cp.roleTitle, "CEO");
  assert.equal(cp.relationType, "representative");
  assert.equal(cp.phone, "090-1234-5678");
  assert.equal(cp.email, "taro@example.com");
  assert.equal(cp.preferredLanguage, "ja");
});

void test("mapContactPersonRow handles null optional fields", () => {
  const cp = mapContactPersonRow({
    ...sampleRow,
    role_title: null,
    relation_type: null,
    phone: null,
    email: null,
  });
  assert.equal(cp.roleTitle, null);
  assert.equal(cp.relationType, null);
  assert.equal(cp.phone, null);
  assert.equal(cp.email, null);
});

// ── create ──

void test("ContactPersonsService.create inserts row and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("insert into contact_persons")) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const tl = makeTimeline();
  const service = new ContactPersonsService(pool, tl.service as never);

  const cp = await service.create(makeCtx(), {
    name: "Taro Yamada",
    companyId: "comp1",
  });
  assert.equal(cp.id, "cp1");
  assert.equal(cp.name, "Taro Yamada");

  const insertCall = calls.find((c) =>
    c.sql.includes("insert into contact_persons"),
  );
  assert.ok(insertCall);

  assert.equal(tl.writes.length, 1);
  assert.deepEqual(tl.writes[0], {
    entityType: "contact_person",
    entityId: "cp1",
    action: "contact_person.created",
    payload: { name: "Taro Yamada" },
  });
});

void test("ContactPersonsService.create throws when both companyId and customerId are missing", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const service = new ContactPersonsService(pool, {
    write: () => Promise.resolve(),
  } as never);

  await assert.rejects(
    () => service.create(makeCtx(), { name: "No FK" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "companyId or customerId is required");
      return true;
    },
  );
});

void test("ContactPersonsService.create throws on insert failure", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const service = new ContactPersonsService(pool, {
    write: () => Promise.resolve(),
  } as never);

  await assert.rejects(
    () => service.create(makeCtx(), { name: "Fail", companyId: "comp1" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to create contact person");
      return true;
    },
  );
});

void test("ContactPersonsService.create with customerId only succeeds", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("insert into contact_persons")) {
      return Promise.resolve({
        rows: [{ ...sampleRow, company_id: null, customer_id: "cust1" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const tl = makeTimeline();
  const service = new ContactPersonsService(pool, tl.service as never);

  const cp = await service.create(makeCtx(), {
    name: "Taro",
    customerId: "cust1",
  });
  assert.equal(cp.customerId, "cust1");
  assert.equal(cp.companyId, null);
});

// ── get ──

void test("ContactPersonsService.get returns contact person or null", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from contact_persons") && params?.[0] === "cp1") {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new ContactPersonsService(pool, {} as never);

  const cp1 = await service.get(makeCtx("viewer"), "cp1");
  assert.ok(cp1);
  assert.equal(cp1.id, "cp1");

  const cp2 = await service.get(makeCtx("viewer"), "not-found");
  assert.equal(cp2, null);
});

// ── list ──

void test("ContactPersonsService.list returns items and total", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
  });
  const service = new ContactPersonsService(pool, {} as never);

  const result = await service.list(makeCtx("viewer"), { page: 1, limit: 10 });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.name, "Taro Yamada");
});

void test("ContactPersonsService.list handles defaults and empty count", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [], rowCount: 0 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new ContactPersonsService(pool, {} as never);

  const result = await service.list(makeCtx("viewer"));
  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
});

void test("ContactPersonsService.list with companyId filter", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
  });
  const service = new ContactPersonsService(pool, {} as never);

  await service.list(makeCtx("viewer"), { companyId: "comp1" });
  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("company_id"));
});

void test("ContactPersonsService.list with customerId filter", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
  });
  const service = new ContactPersonsService(pool, {} as never);

  await service.list(makeCtx("viewer"), { customerId: "cust1" });
  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("customer_id"));
});

// ── update ──

void test("ContactPersonsService.update updates and writes timeline", async () => {
  const pool = makePool((sql) => {
    if (
      sql.includes("from contact_persons") &&
      sql.includes("where id") &&
      !sql.includes("update contact_persons")
    ) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    if (sql.includes("update contact_persons")) {
      return Promise.resolve({
        rows: [{ ...sampleRow, name: "Updated Name" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const tl = makeTimeline();
  const service = new ContactPersonsService(pool, tl.service as never);

  const updated = await service.update(makeCtx(), "cp1", {
    name: "Updated Name",
  });
  assert.equal(updated.name, "Updated Name");

  assert.equal(tl.writes.length, 1);
  const write = tl.writes[0] as Record<string, unknown>;
  assert.equal(write.action, "contact_person.updated");
  assert.equal(write.entityType, "contact_person");
});

void test("ContactPersonsService.update throws NotFoundException when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const service = new ContactPersonsService(pool, {} as never);

  await assert.rejects(
    () => service.update(makeCtx(), "not-found", { name: "X" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Contact person not found");
      return true;
    },
  );
});

void test("ContactPersonsService.update throws on update failure", async () => {
  const pool = makePool((sql) => {
    if (
      sql.includes("from contact_persons") &&
      !sql.includes("update contact_persons")
    ) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new ContactPersonsService(pool, {} as never);

  await assert.rejects(
    () => service.update(makeCtx(), "cp1", { name: "X" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to update contact person");
      return true;
    },
  );
});

// ── softDelete ──

void test("ContactPersonsService.softDelete deletes and writes timeline", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("from contact_persons") &&
      params?.[0] === "cp1" &&
      !sql.includes("delete")
    ) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    if (sql.includes("exists")) {
      return Promise.resolve({ rows: [{ exists: false }], rowCount: 1 });
    }
    if (sql.includes("delete from contact_persons")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const tl = makeTimeline();
  const service = new ContactPersonsService(pool, tl.service as never);

  await service.softDelete(makeCtx("manager"), "cp1");

  assert.equal(tl.writes.length, 1);
  const write = tl.writes[0] as Record<string, unknown>;
  assert.equal(write.action, "contact_person.deleted");
  assert.equal(write.entityType, "contact_person");
});

void test("ContactPersonsService.softDelete throws NotFoundException when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const service = new ContactPersonsService(pool, {} as never);

  await assert.rejects(
    () => service.softDelete(makeCtx("manager"), "not-found"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Contact person not found");
      return true;
    },
  );
});

void test("ContactPersonsService.softDelete throws BadRequestException when case_parties exist", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("from contact_persons") &&
      params?.[0] === "cp1" &&
      !sql.includes("delete")
    ) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    if (sql.includes("exists")) {
      return Promise.resolve({ rows: [{ exists: true }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new ContactPersonsService(pool, {} as never);

  await assert.rejects(
    () => service.softDelete(makeCtx("manager"), "cp1"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(
        err.message,
        "Cannot delete contact person with existing case parties",
      );
      return true;
    },
  );
});

void test("ContactPersonsService.softDelete throws on delete failure", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("from contact_persons") &&
      params?.[0] === "cp1" &&
      !sql.includes("delete")
    ) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    if (sql.includes("exists")) {
      return Promise.resolve({ rows: [{ exists: false }], rowCount: 1 });
    }
    if (sql.includes("delete from contact_persons")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new ContactPersonsService(pool, {} as never);

  await assert.rejects(
    () => service.softDelete(makeCtx("manager"), "cp1"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to delete contact person");
      return true;
    },
  );
});
