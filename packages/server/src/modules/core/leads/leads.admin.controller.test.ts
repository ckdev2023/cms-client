import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { LeadsAdminController } from "./leads.admin.controller";
import type { LeadsAdminService } from "./leads.admin.service";

// ── Helpers ──

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";

function makeReq(ctx?: Record<string, unknown>) {
  return {
    requestContext: ctx ?? {
      orgId: ORG_ID,
      userId: USER_ID,
      role: "staff" as const,
    },
  };
}

function stubService(overrides?: Record<string, unknown>): LeadsAdminService {
  return {
    list: () => Promise.resolve({ items: [], total: 0 }),
    getDetail: () => Promise.resolve({ lead: {} }),
    update: () => Promise.resolve({}),
    transitionStatus: () => Promise.resolve({}),
    addFollowup: () => Promise.resolve({}),
    listFollowups: () => Promise.resolve([]),
    listLogs: () => Promise.resolve([]),
    bulkAssign: () => Promise.resolve({ updatedCount: 0 }),
    bulkFollowup: () => Promise.resolve({ updatedCount: 0 }),
    bulkStatus: () => Promise.resolve({ updatedCount: 0, errors: [] }),
    bulkTags: () => Promise.resolve({ updatedCount: 0 }),
    bulkExport: () => Promise.resolve([]),
    dedup: () => Promise.resolve({ leads: [], customers: [] }),
    ...overrides,
  } as unknown as LeadsAdminService;
}

function readControllerSource(): string {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, "leads.admin.controller.ts"),
    "utf-8",
  );
}

// ── RBAC: @RequireRoles("staff") on every route ──

void describe("LeadsAdminController — RBAC decorators", () => {
  void test("controller is mounted at admin/leads", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes('@Controller("admin/leads")'),
      "Controller must be at admin/leads path",
    );
  });

  const ROUTE_METHODS = [
    "list",
    "dedup",
    "getDetail",
    "update",
    "transitionStatus",
    "addFollowup",
    "listFollowups",
    "listLogs",
    "bulkAssign",
    "bulkFollowup",
    "bulkStatus",
    "bulkTags",
    "bulkExport",
  ];

  for (const method of ROUTE_METHODS) {
    void test(`${method}() has @RequireRoles("staff") decorator`, () => {
      const src = readControllerSource();
      const methodIdx = src.indexOf(`async ${method}(`);
      assert.ok(methodIdx > 0, `Method ${method} must exist`);
      const decoratorRegion = src.slice(
        Math.max(0, methodIdx - 200),
        methodIdx,
      );
      assert.ok(
        decoratorRegion.includes('@RequireRoles("staff")'),
        `${method}() must have @RequireRoles("staff")`,
      );
    });
  }
});

// ── Missing request context ──

void describe("LeadsAdminController — missing context", () => {
  void test("list throws UnauthorizedException without requestContext", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () => controller.list({} as never, {}),
      UnauthorizedException,
    );
  });

  void test("getDetail throws UnauthorizedException without requestContext", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () => controller.getDetail({} as never, "some-id"),
      UnauthorizedException,
    );
  });
});

// ── Query parsing: list ──

void describe("LeadsAdminController — list query parsing", () => {
  void test("forwards parsed list query to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      list: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.list(makeReq() as never, {
      scope: "mine",
      status: "new",
      search: "tanaka",
      page: "2",
      limit: "25",
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.scope, "mine");
    assert.equal(input.status, "new");
    assert.equal(input.search, "tanaka");
    assert.equal(input.page, 2);
    assert.equal(input.limit, 25);
  });

  void test("rejects invalid scope", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () => controller.list(makeReq() as never, { scope: "invalid" }),
      BadRequestException,
    );
  });

  void test("rejects invalid page (non-numeric)", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () => controller.list(makeReq() as never, { page: "abc" }),
      BadRequestException,
    );
  });

  void test("rejects page < 1", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () => controller.list(makeReq() as never, { page: "0" }),
      BadRequestException,
    );
  });

  void test("rejects limit > 200", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () => controller.list(makeReq() as never, { limit: "201" }),
      BadRequestException,
    );
  });

  void test("accepts undefined query params gracefully", async () => {
    let calledWith: unknown;
    const service = stubService({
      list: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.list(makeReq() as never, {});

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.scope, undefined);
    assert.equal(input.page, undefined);
    assert.equal(input.limit, undefined);
  });
});

// ── Status transition body parsing ──

void describe("LeadsAdminController — transitionStatus parsing", () => {
  void test("forwards status and lostReason to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      transitionStatus: (_ctx: unknown, _id: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.transitionStatus(makeReq() as never, "lead-1", {
      status: "lost",
      lostReason: "Budget issues",
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.status, "lost");
    assert.equal(input.lostReason, "Budget issues");
  });

  void test("requires status field", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () => controller.transitionStatus(makeReq() as never, "lead-1", {}),
      BadRequestException,
    );
  });
});

// ── Followup body parsing ──

void describe("LeadsAdminController — addFollowup parsing", () => {
  void test("requires channel field", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.addFollowup(makeReq() as never, "lead-1", {
          summary: "test",
        }),
      BadRequestException,
    );
  });

  void test("forwards all followup fields to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      addFollowup: (_ctx: unknown, _id: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.addFollowup(makeReq() as never, "lead-1", {
      channel: "phone",
      summary: "Discussed pricing",
      conclusion: "Positive",
      nextAction: "Send proposal",
      nextFollowUpAt: "2026-05-01T09:00:00.000Z",
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.channel, "phone");
    assert.equal(input.summary, "Discussed pricing");
    assert.equal(input.conclusion, "Positive");
    assert.equal(input.nextAction, "Send proposal");
  });
});

// ── Bulk body parsing ──

void describe("LeadsAdminController — bulk body parsing", () => {
  void test("bulkAssign requires non-empty leadIds array", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.bulkAssign(makeReq() as never, {
          leadIds: [],
          ownerUserId: USER_ID,
        }),
      BadRequestException,
    );
  });

  void test("bulkAssign rejects non-array leadIds", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.bulkAssign(makeReq() as never, {
          leadIds: "not-array",
          ownerUserId: USER_ID,
        }),
      BadRequestException,
    );
  });

  void test("bulkStatus requires status", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.bulkStatus(makeReq() as never, {
          leadIds: ["lead-1"],
        }),
      BadRequestException,
    );
  });

  void test("bulkExport deduplicates leadIds", async () => {
    let receivedIds: unknown;
    const service = stubService({
      bulkExport: (_ctx: unknown, ids: unknown) => {
        receivedIds = ids;
        return Promise.resolve([]);
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.bulkExport(makeReq() as never, {
      leadIds: ["lead-1", "lead-1", "lead-2"],
    });

    const ids = receivedIds as string[];
    assert.equal(ids.length, 2);
    assert.ok(ids.includes("lead-1"));
    assert.ok(ids.includes("lead-2"));
  });
});

// ── Dedup query parsing ──

void describe("LeadsAdminController — dedup query parsing", () => {
  void test("forwards phone and email to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      dedup: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ leads: [], customers: [] });
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.dedup(makeReq() as never, {
      phone: "090-1234-5678",
      email: "test@example.com",
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.phone, "090-1234-5678");
    assert.equal(input.email, "test@example.com");
  });
});

// ── Update body parsing ──

void describe("LeadsAdminController — update body parsing", () => {
  void test("forwards updatable fields to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      update: (_ctx: unknown, _id: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });

    const controller = new LeadsAdminController(service);
    await controller.update(makeReq() as never, "lead-1", {
      name: "New Name",
      phone: "080-9999-0000",
      quoteAmount: 150000,
    });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.name, "New Name");
    assert.equal(input.phone, "080-9999-0000");
    assert.equal(input.quoteAmount, 150000);
  });

  void test("rejects non-string field for string inputs", async () => {
    const controller = new LeadsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.update(makeReq() as never, "lead-1", {
          name: 12345 as unknown,
        }),
      BadRequestException,
    );
  });
});
