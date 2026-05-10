import assert from "node:assert/strict";
import test from "node:test";

import type { RequestContext } from "../tenancy/requestContext";
import { SearchService, scoreMatch } from "./search.service";
import { MAX_HITS_PER_TYPE } from "./search.types";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "viewer", ...overrides };
}

type FakeCustomer = {
  id: string;
  displayName: string;
  legalName: string;
  customerNumber: string;
};
type FakeCase = {
  id: string;
  caseName: string | null;
  caseNo: string | null;
  customerName: string;
};
type FakeLead = {
  id: string;
  name: string | null;
  leadNo: string | null;
  email: string | null;
  phone: string | null;
};
type FakeTask = { id: string; title: string; status: string };
type FakeDoc = { id: string; name: string; status: string };
type FakeConv = { id: string; channel: string };

function makeCustomerStub(items: FakeCustomer[]) {
  return { list: () => Promise.resolve({ items, total: items.length }) };
}
function makeCaseStub(items: FakeCase[]) {
  return {
    listSummary: () =>
      Promise.resolve({
        items,
        total: items.length,
        page: 1,
        limit: items.length,
      }),
  };
}
function makeLeadStub(items: FakeLead[]) {
  return { list: () => Promise.resolve({ items, total: items.length }) };
}
function makeTaskStub(items: FakeTask[]) {
  return { list: () => Promise.resolve({ items, total: items.length }) };
}
function makeDocStub(items: FakeDoc[]) {
  return { list: () => Promise.resolve({ items, total: items.length }) };
}
function makeConvStub(items: FakeConv[]) {
  return { list: () => Promise.resolve({ items, total: items.length }) };
}

function createService(opts?: {
  customers?: ReturnType<typeof makeCustomerStub>;
  cases?: ReturnType<typeof makeCaseStub>;
  leads?: ReturnType<typeof makeLeadStub>;
  tasks?: ReturnType<typeof makeTaskStub>;
  documents?: ReturnType<typeof makeDocStub>;
  conversations?: ReturnType<typeof makeConvStub>;
}): SearchService {
  return new SearchService(
    opts?.customers as never,
    opts?.cases as never,
    opts?.leads as never,
    opts?.tasks as never,
    opts?.documents as never,
    opts?.conversations as never,
  );
}

void test("scoreMatch: startsWith=2, includes=1, miss=0, case-insensitive", () => {
  assert.equal(scoreMatch("Hello World", "hello"), 2);
  assert.equal(scoreMatch("Say Hello", "hello"), 1);
  assert.equal(scoreMatch("Goodbye", "hello"), 0);
  assert.equal(scoreMatch("HELLO", "hello"), 2);
  assert.equal(scoreMatch("hello", "HELLO"), 2);
});

void test("search returns empty hits for empty string", async () => {
  const service = createService({
    customers: makeCustomerStub([
      { id: "c1", displayName: "A", legalName: "A", customerNumber: "001" },
    ]),
  });
  const result = await service.search(makeCtx(), "");
  assert.equal(result.hits.length, 0);
  assert.equal(result.query, "");
});

void test("search returns empty hits for whitespace-only string", async () => {
  const service = createService({
    customers: makeCustomerStub([
      { id: "c1", displayName: "A", legalName: "A", customerNumber: "001" },
    ]),
  });
  const result = await service.search(makeCtx(), "   ");
  assert.equal(result.hits.length, 0);
  assert.equal(result.query, "");
});

void test("search passes request context to each service", async () => {
  const capturedCtxs: RequestContext[] = [];
  const customCtx = makeCtx({
    orgId: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
  });

  const customerStub = {
    list: (ctx: RequestContext) => {
      capturedCtxs.push(ctx);
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  const leadStub = {
    list: (ctx: RequestContext) => {
      capturedCtxs.push(ctx);
      return Promise.resolve({ items: [], total: 0 });
    },
  };

  const service = createService({
    customers: customerStub as never,
    leads: leadStub as never,
  });
  await service.search(customCtx, "test");

  assert.equal(capturedCtxs.length, 2);
  for (const captured of capturedCtxs) {
    assert.equal(captured.orgId, customCtx.orgId);
    assert.equal(captured.userId, customCtx.userId);
  }
});

void test("customer hits are truncated to MAX_HITS_PER_TYPE", async () => {
  const customers = Array.from({ length: 10 }, (_, i) => ({
    id: `c${String(i)}`,
    displayName: `Customer ${String(i)}`,
    legalName: `Customer ${String(i)}`,
    customerNumber: `00${String(i)}`,
  }));
  const service = createService({ customers: makeCustomerStub(customers) });
  const result = await service.search(makeCtx(), "Customer");
  const hits = result.hits.filter((h) => h.type === "customer");
  assert.ok(hits.length <= MAX_HITS_PER_TYPE);
});

void test("case hits are truncated to MAX_HITS_PER_TYPE", async () => {
  const cases = Array.from({ length: 10 }, (_, i) => ({
    id: `case-${String(i)}`,
    caseName: `Test Case ${String(i)}`,
    caseNo: `CASE-${String(i).padStart(3, "0")}`,
    customerName: `Customer ${String(i)}`,
  }));
  const service = createService({ cases: makeCaseStub(cases) });
  const result = await service.search(makeCtx(), "Test Case");
  const hits = result.hits.filter((h) => h.type === "case");
  assert.ok(hits.length <= MAX_HITS_PER_TYPE);
});

void test("task hits are truncated to MAX_HITS_PER_TYPE", async () => {
  const tasks = Array.from({ length: 10 }, (_, i) => ({
    id: `t${String(i)}`,
    title: `Review doc ${String(i)}`,
    status: "pending",
  }));
  const service = createService({ tasks: makeTaskStub(tasks) });
  const result = await service.search(makeCtx(), "Review");
  const hits = result.hits.filter((h) => h.type === "task");
  assert.ok(hits.length <= MAX_HITS_PER_TYPE);
});

void test("hits are sorted by score descending", async () => {
  const service = createService({
    customers: makeCustomerStub([
      {
        id: "c1",
        displayName: "Includes hello",
        legalName: "",
        customerNumber: "001",
      },
      {
        id: "c2",
        displayName: "hello starts",
        legalName: "",
        customerNumber: "002",
      },
    ]),
  });
  const result = await service.search(makeCtx(), "hello");
  const hits = result.hits.filter((h) => h.type === "customer");
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].id, "c2");
  assert.equal(hits[0].score, 2);
  if (hits.length >= 2) {
    assert.equal(hits[1].id, "c1");
    assert.equal(hits[1].score, 1);
  }
});

void test("startsWith scores higher than includes across types", async () => {
  const service = createService({
    customers: makeCustomerStub([
      {
        id: "c1",
        displayName: "middle query match",
        legalName: "",
        customerNumber: "001",
      },
    ]),
    leads: makeLeadStub([
      {
        id: "l1",
        name: "query at start",
        leadNo: null,
        email: null,
        phone: null,
      },
    ]),
  });
  const result = await service.search(makeCtx(), "query");
  assert.ok(result.hits.length >= 2);
  assert.equal(result.hits[0].id, "l1");
  assert.equal(result.hits[0].score, 2);
  assert.equal(result.hits[1].id, "c1");
  assert.equal(result.hits[1].score, 1);
});

void test("partial failure: one service throws, others still return", async () => {
  const service = createService({
    customers: { list: () => Promise.reject(new Error("DB fail")) } as never,
    leads: makeLeadStub([
      {
        id: "l1",
        name: "Test Lead",
        leadNo: "L-001",
        email: "a@b.com",
        phone: null,
      },
    ]),
    tasks: makeTaskStub([{ id: "t1", title: "Test Task", status: "pending" }]),
  });
  const result = await service.search(makeCtx(), "Test");
  const types = new Set(result.hits.map((h) => h.type));
  assert.ok(types.has("lead"));
  assert.ok(types.has("task"));
  assert.ok(!types.has("customer"));
});

void test("partial failure: all services fail returns empty", async () => {
  const fail = { list: () => Promise.reject(new Error("boom")) };
  const service = createService({
    customers: fail as never,
    leads: fail as never,
    tasks: fail as never,
  });
  const result = await service.search(makeCtx(), "anything");
  assert.equal(result.hits.length, 0);
  assert.equal(result.truncated, false);
});

function fakeN<T>(n: number, fn: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => fn(i));
}

void test("truncated flag is set correctly", async () => {
  const big = createService({
    customers: makeCustomerStub(
      fakeN(6, (i) => ({
        id: `c${String(i)}`,
        displayName: "Match",
        legalName: "",
        customerNumber: "",
      })),
    ),
    cases: makeCaseStub(
      fakeN(6, (i) => ({
        id: `cs${String(i)}`,
        caseName: "Match",
        caseNo: null,
        customerName: "",
      })),
    ),
    leads: makeLeadStub(
      fakeN(6, (i) => ({
        id: `l${String(i)}`,
        name: "Match",
        leadNo: null,
        email: null,
        phone: null,
      })),
    ),
    tasks: makeTaskStub(
      fakeN(6, (i) => ({ id: `t${String(i)}`, title: "Match", status: "p" })),
    ),
    documents: makeDocStub(
      fakeN(6, (i) => ({ id: `d${String(i)}`, name: "Match", status: "p" })),
    ),
    conversations: makeConvStub(
      fakeN(6, (i) => ({ id: `cv${String(i)}`, channel: "web" })),
    ),
  });
  const r1 = await big.search(makeCtx(), "Match");
  assert.equal(r1.truncated, true);
  assert.ok(r1.hits.length <= 30);

  const small = createService({
    customers: makeCustomerStub([
      { id: "c1", displayName: "Foo", legalName: "", customerNumber: "001" },
    ]),
  });
  assert.equal((await small.search(makeCtx(), "Foo")).truncated, false);
});

void test("hit shape: customer, case, lead", async () => {
  const c = createService({
    customers: makeCustomerStub([
      {
        id: "cust-1",
        displayName: "Tanaka",
        legalName: "田中",
        customerNumber: "C001",
      },
    ]),
  });
  const rc = await c.search(makeCtx(), "Tanaka");
  assert.equal(rc.hits[0].href, "/customers/cust-1");
  assert.equal(rc.hits[0].type, "customer");
  assert.equal(rc.hits[0].title, "Tanaka");

  const cs = createService({
    cases: makeCaseStub([
      {
        id: "case-1",
        caseName: "Visa renewal",
        caseNo: "C-001",
        customerName: "Tanaka",
      },
    ]),
  });
  const rcs = await cs.search(makeCtx(), "Visa");
  assert.equal(rcs.hits[0].href, "/cases/case-1");
  assert.equal(rcs.hits[0].subtitle, "Tanaka");

  const l = createService({
    leads: makeLeadStub([
      {
        id: "lead-1",
        name: "Suzuki",
        leadNo: "L-001",
        email: "s@b.com",
        phone: null,
      },
    ]),
  });
  const rl = await l.search(makeCtx(), "Suzuki");
  assert.equal(rl.hits[0].href, "/leads/lead-1");
  assert.equal(rl.hits[0].subtitle, "s@b.com");
});

void test("task and document hits have correct href pattern", async () => {
  const s1 = createService({
    tasks: makeTaskStub([
      { id: "task-1", title: "Prepare docs", status: "pending" },
    ]),
  });
  assert.equal(
    (await s1.search(makeCtx(), "Prepare")).hits[0].href,
    "/tasks/task-1",
  );

  const s2 = createService({
    documents: makeDocStub([
      { id: "doc-1", name: "Passport", status: "received" },
    ]),
  });
  assert.equal(
    (await s2.search(makeCtx(), "Passport")).hits[0].href,
    "/documents/doc-1",
  );
});

void test("service with no injected services returns empty", async () => {
  const service = createService({});
  const result = await service.search(makeCtx(), "anything");
  assert.equal(result.hits.length, 0);
  assert.equal(result.truncated, false);
});

void test("in-memory filter excludes non-matching items", async () => {
  const s1 = createService({
    cases: makeCaseStub([
      {
        id: "case-1",
        caseName: "Visa renewal",
        caseNo: "C-001",
        customerName: "A",
      },
      {
        id: "case-2",
        caseName: "Work permit",
        caseNo: "C-002",
        customerName: "B",
      },
    ]),
  });
  const r1 = await s1.search(makeCtx(), "Visa");
  assert.equal(r1.hits.filter((h) => h.type === "case").length, 1);
  assert.equal(r1.hits[0].id, "case-1");

  const s1b = createService({
    cases: makeCaseStub([
      {
        id: "case-uuid",
        caseName: "日文或中文标题 · 家族滞在",
        caseNo: "CASE-202605-0020",
        customerName: "申请人",
      },
    ]),
  });
  const r1b = await s1b.search(makeCtx(), "CASE-202605-0020");
  assert.equal(r1b.hits.filter((h) => h.type === "case").length, 1);
  assert.equal(r1b.hits.find((h) => h.type === "case")?.id, "case-uuid");

  const s2 = createService({
    tasks: makeTaskStub([
      { id: "t1", title: "Review submission", status: "pending" },
      { id: "t2", title: "Send email", status: "pending" },
    ]),
  });
  const r2 = await s2.search(makeCtx(), "Review");
  assert.equal(r2.hits.filter((h) => h.type === "task").length, 1);
  assert.equal(r2.hits[0].id, "t1");
});

void test("query is trimmed before search", async () => {
  let capturedQ: string | undefined;
  const customerStub = {
    list: (_ctx: RequestContext, input: { keyword?: string }) => {
      capturedQ = input.keyword;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  const service = createService({ customers: customerStub as never });
  const result = await service.search(makeCtx(), "  hello  ");
  assert.equal(result.query, "hello");
  assert.equal(capturedQ, "hello");
});

void test("hits from multiple types merge sorted", async () => {
  const service = createService({
    customers: makeCustomerStub([
      {
        id: "c1",
        displayName: "query prefix",
        legalName: "",
        customerNumber: "001",
      },
    ]),
    leads: makeLeadStub([
      {
        id: "l1",
        name: "has query inside",
        leadNo: null,
        email: null,
        phone: null,
      },
    ]),
  });
  const result = await service.search(makeCtx(), "query");
  assert.ok(result.hits.length >= 2);
  for (let i = 1; i < result.hits.length; i++) {
    assert.ok(result.hits[i - 1].score >= result.hits[i].score);
  }
});
