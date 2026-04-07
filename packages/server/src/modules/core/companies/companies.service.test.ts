import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { CompaniesService, mapCompanyRow } from "./companies.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

const sampleRow = {
  id: "comp1",
  org_id: ORG_ID,
  company_no: "C-001",
  company_name: "Acme Corp",
  corporate_number: "1234567890123",
  established_date: "2020-01-15",
  capital_amount: "10000000.00",
  address: "Tokyo",
  business_scope: "IT",
  employee_count: 50,
  fiscal_year_end: "03",
  website: "https://acme.example.com",
  contact_phone: "03-1234-5678",
  contact_email: "info@acme.example.com",
  owner_user_id: USER_ID,
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

// ── mapCompanyRow ──

void test("mapCompanyRow maps row to Company entity", () => {
  const c = mapCompanyRow(sampleRow);
  assert.equal(c.id, "comp1");
  assert.equal(c.orgId, ORG_ID);
  assert.equal(c.companyName, "Acme Corp");
  assert.equal(c.capitalAmount, 10000000);
  assert.equal(c.employeeCount, 50);
  assert.equal(c.contactEmail, "info@acme.example.com");
});

void test("mapCompanyRow handles null optional fields", () => {
  const c = mapCompanyRow({
    ...sampleRow,
    capital_amount: null,
    employee_count: null,
    established_date: null,
  });
  assert.equal(c.capitalAmount, null);
  assert.equal(c.employeeCount, null);
  assert.equal(c.establishedDate, null);
});

// ── create ──

void test("CompaniesService.create inserts row and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("insert into companies")) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const tl = makeTimeline();
  const service = new CompaniesService(pool, tl.service as never);

  const company = await service.create(makeCtx(), { companyName: "Acme Corp" });
  assert.equal(company.id, "comp1");
  assert.equal(company.companyName, "Acme Corp");

  const insertCall = calls.find((c) => c.sql.includes("insert into companies"));
  assert.ok(insertCall);

  assert.equal(tl.writes.length, 1);
  assert.deepEqual(tl.writes[0], {
    entityType: "company",
    entityId: "comp1",
    action: "company.created",
    payload: { companyName: "Acme Corp" },
  });
});

void test("CompaniesService.create throws on insert failure", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const service = new CompaniesService(pool, {
    write: () => Promise.resolve(),
  } as never);

  await assert.rejects(
    () => service.create(makeCtx(), { companyName: "Fail" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to create company");
      return true;
    },
  );
});

// ── get ──

void test("CompaniesService.get returns company or null", async () => {
  const calls: string[] = [];
  const pool = makePool((sql, params) => {
    calls.push(sql.trim());
    if (sql.includes("from companies") && params?.[0] === "comp1") {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new CompaniesService(pool, {} as never);

  const c1 = await service.get(makeCtx("viewer"), "comp1");
  assert.ok(c1);
  assert.equal(c1.id, "comp1");

  const c2 = await service.get(makeCtx("viewer"), "not-found");
  assert.equal(c2, null);
  assert.ok(calls.some((sql) => sql.includes("deleted_at is null")));
});

// ── list ──

void test("CompaniesService.list returns items and total", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
  });
  const service = new CompaniesService(pool, {} as never);

  const result = await service.list(makeCtx("viewer"), { page: 1, limit: 10 });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.companyName, "Acme Corp");
});

void test("CompaniesService.list handles defaults and empty count", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [], rowCount: 0 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new CompaniesService(pool, {} as never);

  const result = await service.list(makeCtx("viewer"));
  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
});

void test("CompaniesService.list with keyword filter", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
  });
  const service = new CompaniesService(pool, {} as never);

  await service.list(makeCtx("viewer"), { keyword: "Acme" });
  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("ilike"));
  assert.ok(countCall.sql.includes("deleted_at is null"));
});

// ── update ──

void test("CompaniesService.update updates and writes timeline", async () => {
  const calls: string[] = [];
  const pool = makePool((sql) => {
    calls.push(sql.trim());
    if (
      sql.includes("from companies") &&
      sql.includes("where id") &&
      !sql.includes("update companies")
    ) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    if (sql.includes("update companies")) {
      return Promise.resolve({
        rows: [{ ...sampleRow, company_name: "Updated Corp" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const tl = makeTimeline();
  const service = new CompaniesService(pool, tl.service as never);

  const updated = await service.update(makeCtx(), "comp1", {
    companyName: "Updated Corp",
  });
  assert.equal(updated.companyName, "Updated Corp");

  assert.equal(tl.writes.length, 1);
  const write = tl.writes[0] as Record<string, unknown>;
  assert.equal(write.action, "company.updated");
  assert.equal(write.entityType, "company");
  assert.ok(
    calls.some(
      (sql) =>
        sql.includes("update companies") && sql.includes("deleted_at is null"),
    ),
  );
});

void test("CompaniesService.update throws NotFoundException when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const service = new CompaniesService(pool, {} as never);

  await assert.rejects(
    () => service.update(makeCtx(), "not-found", { companyName: "X" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Company not found");
      return true;
    },
  );
});

void test("CompaniesService.update throws on update failure", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from companies") && !sql.includes("update companies")) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new CompaniesService(pool, {} as never);

  await assert.rejects(
    () => service.update(makeCtx(), "comp1", { companyName: "X" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to update company");
      return true;
    },
  );
});

// ── softDelete ──

void test("CompaniesService.softDelete marks deleted_at and writes timeline", async () => {
  const calls: string[] = [];
  const pool = makePool((sql, params) => {
    calls.push(sql.trim());
    if (
      sql.includes("from companies") &&
      params?.[0] === "comp1" &&
      !sql.includes("update companies")
    ) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    if (sql.includes("exists")) {
      return Promise.resolve({ rows: [{ exists: false }], rowCount: 1 });
    }
    if (sql.includes("update companies set deleted_at = now()")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const tl = makeTimeline();
  const service = new CompaniesService(pool, tl.service as never);

  await service.softDelete(makeCtx("manager"), "comp1");

  assert.equal(tl.writes.length, 1);
  const write = tl.writes[0] as Record<string, unknown>;
  assert.equal(write.action, "company.deleted");
  assert.equal(write.entityType, "company");
  assert.ok(calls.some((sql) => sql.includes("set deleted_at = now()")));
});

void test("CompaniesService.softDelete throws NotFoundException when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [], rowCount: 0 }));
  const service = new CompaniesService(pool, {} as never);

  await assert.rejects(
    () => service.softDelete(makeCtx("manager"), "not-found"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Company not found");
      return true;
    },
  );
});

void test("CompaniesService.softDelete throws BadRequestException when cases exist", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select") &&
      sql.includes("from companies") &&
      params?.[0] === "comp1"
    ) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    if (sql.includes("exists")) {
      return Promise.resolve({ rows: [{ exists: true }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new CompaniesService(pool, {} as never);

  await assert.rejects(
    () => service.softDelete(makeCtx("manager"), "comp1"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Cannot delete company with existing cases");
      return true;
    },
  );
});

void test("CompaniesService.softDelete throws on delete failure", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select") &&
      sql.includes("from companies") &&
      params?.[0] === "comp1"
    ) {
      return Promise.resolve({ rows: [sampleRow], rowCount: 1 });
    }
    if (sql.includes("exists")) {
      return Promise.resolve({ rows: [{ exists: false }], rowCount: 1 });
    }
    if (
      sql.includes(
        "update companies set deleted_at = now(), updated_at = now()",
      )
    ) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new CompaniesService(pool, {} as never);

  await assert.rejects(
    () => service.softDelete(makeCtx("manager"), "comp1"),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to delete company");
      return true;
    },
  );
});
