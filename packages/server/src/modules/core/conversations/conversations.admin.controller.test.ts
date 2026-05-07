import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { ConversationsAdminController } from "./conversations.admin.controller";
import type { ConversationsAdminService } from "./conversations.admin.service";

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

function stubService(
  overrides?: Record<string, unknown>,
): ConversationsAdminService {
  return {
    list: () => Promise.resolve({ items: [], total: 0 }),
    getDetail: () => Promise.resolve({}),
    assign: () => Promise.resolve({}),
    close: () => Promise.resolve({}),
    reopen: () => Promise.resolve({}),
    ...overrides,
  } as unknown as ConversationsAdminService;
}

function readControllerSource(): string {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, "conversations.admin.controller.ts"),
    "utf-8",
  );
}

// ── Permission: @RequirePermission(PERMISSION_CODES.CASE_EDIT) on every route ──

void describe("ConversationsAdminController — permission decorators", () => {
  void test("controller is mounted at admin/conversations", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes('@Controller("admin/conversations")'),
      "Controller must be at admin/conversations path",
    );
  });

  const ROUTE_METHODS = ["list", "getDetail", "assign", "close", "reopen"];

  for (const method of ROUTE_METHODS) {
    void test(`${method}() has @RequirePermission(PERMISSION_CODES.CASE_EDIT) decorator`, () => {
      const src = readControllerSource();
      const methodIdx = src.indexOf(`async ${method}(`);
      assert.ok(methodIdx > 0, `Method ${method} must exist`);
      const decoratorRegion = src.slice(
        Math.max(0, methodIdx - 200),
        methodIdx,
      );
      assert.ok(
        decoratorRegion.includes(
          "@RequirePermission(PERMISSION_CODES.CASE_EDIT)",
        ),
        `${method}() must have @RequirePermission(PERMISSION_CODES.CASE_EDIT)`,
      );
    });
  }
});

// ── ParseUUIDPipe on :id routes ──

void describe("ConversationsAdminController — ParseUUIDPipe on :id routes", () => {
  const ID_ROUTES = ["getDetail", "assign", "close", "reopen"];

  void test("controller source imports ParseUUIDPipe", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes("ParseUUIDPipe"),
      "Controller must import ParseUUIDPipe",
    );
  });

  void test("UuidParam helper is defined", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes('Param("id", new ParseUUIDPipe())'),
      "UuidParam must use ParseUUIDPipe",
    );
  });

  for (const method of ID_ROUTES) {
    void test(`${method}() uses @UuidParam() instead of @Param("id")`, () => {
      const src = readControllerSource();
      const methodIdx = src.indexOf(`async ${method}(`);
      assert.ok(methodIdx > 0, `Method ${method} must exist`);
      const sig = src.slice(methodIdx, src.indexOf("{", methodIdx));
      assert.ok(
        sig.includes("@UuidParam()"),
        `${method}() must use @UuidParam()`,
      );
      assert.ok(
        !sig.includes('@Param("id")'),
        `${method}() must NOT use raw @Param("id")`,
      );
    });
  }
});

// ── Missing request context ──

void describe("ConversationsAdminController — missing context", () => {
  void test("list throws UnauthorizedException without requestContext", async () => {
    const controller = new ConversationsAdminController(stubService());
    await assert.rejects(
      () => controller.list({} as never, {}),
      UnauthorizedException,
    );
  });

  void test("getDetail throws UnauthorizedException without requestContext", async () => {
    const controller = new ConversationsAdminController(stubService());
    await assert.rejects(
      () => controller.getDetail({} as never, "some-id"),
      UnauthorizedException,
    );
  });
});

// ── UUID query params on list ──

void describe("ConversationsAdminController — UUID query validation on list", () => {
  const UUID_FIELDS = [
    "leadId",
    "customerId",
    "caseId",
    "appUserId",
    "ownerUserId",
  ];

  for (const field of UUID_FIELDS) {
    void test(`rejects non-UUID ${field}`, async () => {
      const controller = new ConversationsAdminController(stubService());
      await assert.rejects(
        () =>
          controller.list(
            makeReq() as never,
            {
              [field]: "not-a-uuid",
            } as never,
          ),
        BadRequestException,
      );
    });

    void test(`accepts valid UUID ${field}`, async () => {
      let calledWith: unknown;
      const service = stubService({
        list: (_ctx: unknown, input: unknown) => {
          calledWith = input;
          return Promise.resolve({ items: [], total: 0 });
        },
      });

      const controller = new ConversationsAdminController(service);
      const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
      await controller.list(
        makeReq() as never,
        {
          [field]: validUuid,
        } as never,
      );

      const input = calledWith as Record<string, unknown>;
      assert.equal(input[field], validUuid);
    });

    void test(`accepts undefined ${field}`, async () => {
      let calledWith: unknown;
      const service = stubService({
        list: (_ctx: unknown, input: unknown) => {
          calledWith = input;
          return Promise.resolve({ items: [], total: 0 });
        },
      });

      const controller = new ConversationsAdminController(service);
      await controller.list(makeReq() as never, {});

      const input = calledWith as Record<string, unknown>;
      assert.equal(input[field], undefined);
    });
  }

  void test("status still uses optStr (not optUuid)", async () => {
    let calledWith: unknown;
    const service = stubService({
      list: (_ctx: unknown, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    });

    const controller = new ConversationsAdminController(service);
    await controller.list(makeReq() as never, { status: "active" });

    const input = calledWith as Record<string, unknown>;
    assert.equal(input.status, "active");
  });
});

// ── optUuid shared helper source contract ──

void describe("ConversationsAdminController — optUuid import", () => {
  void test("imports optUuid from shared/uuid-parsers", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes('from "../shared/uuid-parsers"'),
      "Must import optUuid from shared/uuid-parsers",
    );
  });
});

// ── list response includes join fields (R3-E-1) ──

void describe("ConversationsAdminController — list response join fields (R3-E-1)", () => {
  void test("list response contains linkedEntity and ownerLabel", async () => {
    const sampleItem = {
      id: "conv-001",
      channel: "web",
      preferredLanguage: "zh",
      status: "open",
      ownerUserId: "00000000-0000-4000-8000-00000000000b",
      ownerLabel: "田中太郎",
      ownerDisplayName: "田中太郎",
      leadName: "張三",
      customerName: null,
      appUserName: "AppUser 張三",
      linkedEntity: {
        id: "00000000-0000-4000-8000-1ead00000001",
        label: "張三",
        type: "lead",
      },
      lastMessagePreview: "",
      lastMessageAt: "2026-04-27T00:00:00.000Z",
      unreadCountUser: 0,
      unreadCountStaffTenant: 1,
      unreadCountStaffOwner: 0,
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z",
    };

    const service = stubService({
      list: () => Promise.resolve({ items: [sampleItem], total: 1 }),
    });
    const controller = new ConversationsAdminController(service);
    const result = (await controller.list(makeReq() as never, {})) as {
      items: Record<string, unknown>[];
      total: number;
    };

    assert.equal(result.total, 1);
    assert.equal(result.items.length, 1);
    const item = result.items[0];
    assert.equal(item.ownerLabel, "田中太郎");
    assert.equal(item.appUserName, "AppUser 張三");
    assert.ok(item.linkedEntity);
    const linked = item.linkedEntity as {
      id: string;
      label: string;
      type: string;
    };
    assert.equal(linked.type, "lead");
    assert.equal(linked.label, "張三");
  });
});

// ── R2-D-1: assign body ownerUserId UUID validation ──

void describe("ConversationsAdminController — assign body UUID validation (R2-D-1)", () => {
  const VALID_CONV_ID = "b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const VALID_OWNER_ID = "00000000-0000-4000-8000-00000000000a";

  void test("rejects non-UUID ownerUserId in body (catalog short-code 'suzuki')", async () => {
    const controller = new ConversationsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.assign(makeReq() as never, VALID_CONV_ID, {
          ownerUserId: "suzuki",
        } as never),
      (err: unknown) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(
          err.message,
          /ownerUserId/,
          `error message should mention ownerUserId, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  void test("rejects non-UUID ownerUserId in body (free text 'not-a-uuid')", async () => {
    const controller = new ConversationsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.assign(makeReq() as never, VALID_CONV_ID, {
          ownerUserId: "not-a-uuid",
        } as never),
      BadRequestException,
    );
  });

  void test("rejects non-string ownerUserId in body (number)", async () => {
    const controller = new ConversationsAdminController(stubService());
    await assert.rejects(
      () =>
        controller.assign(makeReq() as never, VALID_CONV_ID, {
          ownerUserId: 123,
        } as never),
      BadRequestException,
    );
  });

  void test("accepts valid UUID ownerUserId in body and forwards to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      assign: (_ctx: unknown, _id: string, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });
    const controller = new ConversationsAdminController(service);
    await controller.assign(makeReq() as never, VALID_CONV_ID, {
      ownerUserId: VALID_OWNER_ID,
    } as never);
    const input = calledWith as { ownerUserId?: string };
    assert.equal(input.ownerUserId, VALID_OWNER_ID);
  });

  void test("accepts undefined ownerUserId in body (lead-owner fallback path)", async () => {
    let calledWith: unknown;
    const service = stubService({
      assign: (_ctx: unknown, _id: string, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });
    const controller = new ConversationsAdminController(service);
    await controller.assign(makeReq() as never, VALID_CONV_ID, {} as never);
    const input = calledWith as { ownerUserId?: string };
    assert.equal(input.ownerUserId, undefined);
  });

  void test("accepts empty/whitespace ownerUserId as undefined (consistent with optUuid)", async () => {
    let calledWith: unknown;
    const service = stubService({
      assign: (_ctx: unknown, _id: string, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });
    const controller = new ConversationsAdminController(service);
    await controller.assign(makeReq() as never, VALID_CONV_ID, {
      ownerUserId: "   ",
    } as never);
    const input = calledWith as { ownerUserId?: string };
    assert.equal(input.ownerUserId, undefined);
  });

  void test("source uses optUuid (not optStr) for assign body ownerUserId", () => {
    const src = readControllerSource();
    const assignIdx = src.indexOf("async assign(");
    assert.ok(assignIdx > 0, "assign() method must exist");
    const bodyIdx = src.indexOf("return this.svc.assign(", assignIdx);
    assert.ok(bodyIdx > 0, "assign() must call svc.assign");
    const bodyEnd = src.indexOf(");", bodyIdx);
    const body = src.slice(bodyIdx, bodyEnd);
    assert.ok(
      body.includes('optUuid(body.ownerUserId, "ownerUserId")'),
      "assign body ownerUserId must be parsed with optUuid",
    );
    assert.ok(
      !body.includes("optStr(body.ownerUserId"),
      "assign body ownerUserId must NOT be parsed with optUuid",
    );
  });
});

// ── R5-G-1: list green-path returns items with lastMessagePreview ──

void describe("ConversationsAdminController — list green-path (R5-G-1)", () => {
  void test("list returns 200 with items and lastMessagePreview populated", async () => {
    const sampleItem = {
      id: "conv-001",
      leadId: "00000000-0000-4000-8000-1ead00000001",
      appUserId: "app-user-1",
      orgId: ORG_ID,
      channel: "web",
      preferredLanguage: "zh",
      status: "open",
      ownerUserId: "00000000-0000-4000-8000-00000000000b",
      lastMessageAt: "2026-04-27T00:00:00.000Z",
      unreadCountStaffTenant: 1,
      unreadCountStaffOwner: 0,
      unreadCountUser: 0,
      customerId: null,
      caseId: null,
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z",
      leadName: "張三",
      customerName: null,
      ownerDisplayName: "田中太郎",
      appUserName: "AppUser 張三",
      linkedEntity: {
        id: "00000000-0000-4000-8000-1ead00000001",
        label: "張三",
        type: "lead",
      },
      ownerLabel: "田中太郎",
      lastMessagePreview: "客户：在留資格について相談したいです",
    };

    const service = stubService({
      list: () => Promise.resolve({ items: [sampleItem], total: 1 }),
    });
    const controller = new ConversationsAdminController(service);
    const result = (await controller.list(makeReq() as never, {})) as {
      items: Record<string, unknown>[];
      total: number;
    };

    assert.equal(result.total, 1);
    assert.ok(result.items.length > 0, "items must not be empty");
    const item = result.items[0];
    assert.equal(
      item.lastMessagePreview,
      "客户：在留資格について相談したいです",
    );
    assert.ok(
      typeof item.lastMessagePreview === "string" &&
        item.lastMessagePreview.length > 0,
      "lastMessagePreview must be a non-empty string",
    );
  });
});
