import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { MessagesAdminController } from "./messages.admin.controller";
import type { MessagesAdminService } from "./messages.admin.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const VALID_CONV_ID = "b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const VALID_MSG_ID = "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f";

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
): MessagesAdminService {
  return {
    list: () => Promise.resolve({ items: [], total: 0 }),
    send: () => Promise.resolve({}),
    retryTranslation: () => Promise.resolve({}),
    ...overrides,
  } as unknown as MessagesAdminService;
}

function readControllerSource(): string {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, "messages.admin.controller.ts"),
    "utf-8",
  );
}

void describe("MessagesAdminController — controller mount + permission decorators", () => {
  void test("controller is mounted at admin/conversations/:conversationId/messages", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes(
        '@Controller("admin/conversations/:conversationId/messages")',
      ),
      "Controller must be at admin/conversations/:conversationId/messages path",
    );
  });

  const ROUTE_METHODS = ["list", "send", "retryTranslation"];

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

void describe("MessagesAdminController — ParseUUIDPipe on :conversationId / :messageId routes (R2-D-2)", () => {
  void test("controller source imports ParseUUIDPipe", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes("ParseUUIDPipe"),
      "Controller must import ParseUUIDPipe",
    );
  });

  void test("ConversationIdParam helper is defined with ParseUUIDPipe", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes('Param("conversationId", new ParseUUIDPipe())'),
      "ConversationIdParam must use ParseUUIDPipe",
    );
  });

  void test("MessageIdParam helper is defined with ParseUUIDPipe", () => {
    const src = readControllerSource();
    assert.ok(
      src.includes('Param("messageId", new ParseUUIDPipe())'),
      "MessageIdParam must use ParseUUIDPipe",
    );
  });

  const CONVERSATION_ID_ROUTES = ["list", "send", "retryTranslation"];
  for (const method of CONVERSATION_ID_ROUTES) {
    void test(`${method}() uses @ConversationIdParam() instead of @Param("conversationId")`, () => {
      const src = readControllerSource();
      const methodIdx = src.indexOf(`async ${method}(`);
      assert.ok(methodIdx > 0, `Method ${method} must exist`);
      const sig = src.slice(methodIdx, src.indexOf("{", methodIdx));
      assert.ok(
        sig.includes("@ConversationIdParam()"),
        `${method}() must use @ConversationIdParam()`,
      );
      assert.ok(
        !sig.includes('@Param("conversationId")'),
        `${method}() must NOT use raw @Param("conversationId")`,
      );
    });
  }

  void test('retryTranslation() uses @MessageIdParam() instead of @Param("messageId")', () => {
    const src = readControllerSource();
    const methodIdx = src.indexOf("async retryTranslation(");
    assert.ok(methodIdx > 0, "retryTranslation must exist");
    const sig = src.slice(methodIdx, src.indexOf("{", methodIdx));
    assert.ok(
      sig.includes("@MessageIdParam()"),
      "retryTranslation() must use @MessageIdParam()",
    );
    assert.ok(
      !sig.includes('@Param("messageId")'),
      'retryTranslation() must NOT use raw @Param("messageId")',
    );
  });
});

void describe("MessagesAdminController — missing context", () => {
  void test("list throws UnauthorizedException without requestContext", async () => {
    const controller = new MessagesAdminController(stubService());
    await assert.rejects(
      () => controller.list({} as never, VALID_CONV_ID, {}),
      UnauthorizedException,
    );
  });

  void test("send throws UnauthorizedException without requestContext", async () => {
    const controller = new MessagesAdminController(stubService());
    await assert.rejects(
      () =>
        controller.send({} as never, VALID_CONV_ID, {
          originalLanguage: "ja",
          originalText: "hi",
        } as never),
      UnauthorizedException,
    );
  });

  void test("retryTranslation throws UnauthorizedException without requestContext", async () => {
    const controller = new MessagesAdminController(stubService());
    await assert.rejects(
      () =>
        controller.retryTranslation({} as never, VALID_CONV_ID, VALID_MSG_ID),
      UnauthorizedException,
    );
  });
});

void describe("MessagesAdminController — list query validation (page/limit)", () => {
  void test("rejects non-numeric page", async () => {
    const controller = new MessagesAdminController(stubService());
    await assert.rejects(
      () =>
        controller.list(makeReq() as never, VALID_CONV_ID, {
          page: "abc",
        } as never),
      BadRequestException,
    );
  });

  void test("rejects out-of-range limit (> 200)", async () => {
    const controller = new MessagesAdminController(stubService());
    await assert.rejects(
      () =>
        controller.list(makeReq() as never, VALID_CONV_ID, {
          limit: 999,
        } as never),
      BadRequestException,
    );
  });

  void test("accepts valid page/limit and forwards to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      list: (_ctx: unknown, _id: string, input: unknown) => {
        calledWith = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    });
    const controller = new MessagesAdminController(service);
    await controller.list(makeReq() as never, VALID_CONV_ID, {
      page: 2,
      limit: 50,
    });
    const input = calledWith as { page?: number; limit?: number };
    assert.equal(input.page, 2);
    assert.equal(input.limit, 50);
  });
});

void describe("MessagesAdminController — send body validation", () => {
  void test("rejects missing originalLanguage", async () => {
    const controller = new MessagesAdminController(stubService());
    await assert.rejects(
      () =>
        controller.send(makeReq() as never, VALID_CONV_ID, {
          originalText: "hello",
        } as never),
      BadRequestException,
    );
  });

  void test("rejects missing originalText", async () => {
    const controller = new MessagesAdminController(stubService());
    await assert.rejects(
      () =>
        controller.send(makeReq() as never, VALID_CONV_ID, {
          originalLanguage: "ja",
        } as never),
      BadRequestException,
    );
  });

  void test("accepts minimal body and forwards normalized input to service", async () => {
    let calledWith: unknown;
    const service = stubService({
      send: (_ctx: unknown, _id: string, input: unknown) => {
        calledWith = input;
        return Promise.resolve({});
      },
    });
    const controller = new MessagesAdminController(service);
    await controller.send(makeReq() as never, VALID_CONV_ID, {
      originalLanguage: "  ja  ",
      originalText: "  hello  ",
      forceOriginal: "true",
    } as never);
    const input = calledWith as {
      originalLanguage?: string;
      originalText?: string;
      forceOriginal?: boolean;
      kind?: string;
      visibleScope?: string;
    };
    assert.equal(input.originalLanguage, "ja");
    assert.equal(input.originalText, "hello");
    assert.equal(input.forceOriginal, true);
    assert.equal(input.kind, undefined);
    assert.equal(input.visibleScope, undefined);
  });
});

void describe("MessagesAdminController — retryTranslation forwarding", () => {
  void test("forwards conversationId + messageId to service", async () => {
    let calledArgs: unknown[] = [];
    const service = stubService({
      retryTranslation: (...args: unknown[]) => {
        calledArgs = args;
        return Promise.resolve({});
      },
    });
    const controller = new MessagesAdminController(service);
    await controller.retryTranslation(
      makeReq() as never,
      VALID_CONV_ID,
      VALID_MSG_ID,
    );
    assert.equal(calledArgs[1], VALID_CONV_ID);
    assert.equal(calledArgs[2], VALID_MSG_ID);
  });
});
