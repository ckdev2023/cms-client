import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import { FeatureFlagsService } from "../../feature-flags/featureFlags.service";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import type { Customer } from "../model/coreEntities";

const mockFeatureFlags = {
  resolve: () => Promise.resolve({ key: "bmv", enabled: true, used: true }),
} as unknown as FeatureFlagsService;

const mockCustomer: Customer = {
  id: "c1",
  orgId: "org1",
  type: "individual",
  baseProfile: {
    name: "Alice Tanaka",
    furigana: "アリス タナカ",
    customerNumber: "C-0001",
    phone: "090-1111-2222",
    email: "alice@example.com",
    owner: { name: "Yamada Shota" },
    referralSource: "Web",
    groupName: "東京一組",
    lastContactDate: "2026-01-02",
    lastContactChannel: "email",
  },
  contacts: [{ email: "alice-contact@example.com" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockCustomerSummary = {
  id: "c1",
  displayName: "Alice Tanaka",
  furigana: "アリス タナカ",
  customerNumber: "C-0001",
  type: "individual",
  status: "active",
  group: "tokyo",
  groupName: "東京一組",
  owner: { name: "Yamada Shota", initials: "YS" },
  totalCases: 2,
  activeCases: 1,
  archivedCases: 1,
  lastCaseCreatedDate: "2026-01-02T00:00:00.000Z",
  latestCase: null,
  tags: [],
  residenceStatus: null,
  nationality: null,
  bmvProfile: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makePermissions(
  canAccessCustomer: PermissionsService["canAccessCustomer"] = () => true,
  canEditCustomer: PermissionsService["canEditCustomer"] = () => true,
): PermissionsService {
  return {
    canAccessCustomer,
    canEditCustomer,
  } as unknown as PermissionsService;
}

void test("CustomersController create validates DTO and requires context", async () => {
  const service = {
    create: () => Promise.resolve(mockCustomer),
  } as unknown as CustomersService;

  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );

  await assert.rejects(
    async () => {
      await controller.create({} as never, { type: "individual" });
    },
    (err) => {
      assert.ok(err instanceof UnauthorizedException);
      return true;
    },
  );

  const req = {
    requestContext: {
      orgId: "org1",
      userId: "user1",
      role: "staff",
    },
  };

  await assert.rejects(
    async () => {
      await controller.create(req as never, { type: "invalid_type" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid type enum");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.create(req as never, { type: "" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid type");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.create(req as never, {
        type: "individual",
        baseProfile: "string_is_invalid",
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid object");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.create(req as never, {
        type: "individual",
        baseProfile: [],
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid object");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.create(req as never, {
        type: "individual",
        contacts: "not_an_array",
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid contacts");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.create(req as never, {
        type: "individual",
        contacts: ["string_item"],
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid contacts item");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.create(req as never, {
        type: "individual",
        contacts: [[]],
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid contacts item");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.create(req as never, {
        type: "individual",
        contacts: [null],
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid contacts item");
      return true;
    },
  );

  const res = await controller.create(req as never, {
    type: "individual",
    baseProfile: { name: "Alice" },
    contacts: [{ email: "alice@example.com" }],
  });
  assert.equal(res.id, "c1");
});

void test("CustomersController list parses page and limit", async () => {
  let calledQuery: Record<string, unknown> = {};

  const service = {
    list: (_ctx: unknown, query: Record<string, unknown>) => {
      calledQuery = query;
      return Promise.resolve({ items: [mockCustomerSummary], total: 1 });
    },
  } as unknown as CustomersService;

  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );

  await assert.rejects(
    async () => {
      await controller.list({} as never, {});
    },
    (err) => {
      assert.ok(err instanceof UnauthorizedException);
      return true;
    },
  );

  const req = {
    requestContext: {
      orgId: "org1",
      userId: "user1",
      role: "viewer",
    },
  };

  const pagedRes = await controller.list(req as never, {
    page: "2",
    limit: "10",
  });
  assert.equal(calledQuery.page, 2);
  assert.equal(calledQuery.limit, 10);
  assert.equal(pagedRes.total, 1);
  assert.equal(pagedRes.items[0]?.displayName, "Alice Tanaka");
  assert.equal(pagedRes.items[0]?.owner.initials, "YS");
  assert.equal(pagedRes.items[0]?.bmvProfile, null);

  await controller.list(req as never, {
    keyword: "alice",
    phone: "080-1234-5678",
    email: "alice@example.com",
    group: "tokyo",
    owner: "owner-1",
    activeCases: "has",
    scope: "mine",
  });
  assert.equal(calledQuery.keyword, "alice");
  assert.equal(calledQuery.phone, "080-1234-5678");
  assert.equal(calledQuery.email, "alice@example.com");
  assert.equal(calledQuery.group, "tokyo");
  assert.equal(calledQuery.owner, "owner-1");
  assert.equal(calledQuery.activeCases, "yes");
  assert.equal(calledQuery.scope, "mine");

  await controller.list(req as never, { scope: "group" });
  assert.equal(calledQuery.scope, "group");

  await controller.list(req as never, {});
  assert.equal(calledQuery.page, undefined);
  assert.equal(calledQuery.limit, undefined);

  await assert.rejects(
    async () => {
      await controller.list(req as never, { page: "-1" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid page");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.list(req as never, { page: "abc" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid page");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.list(req as never, { limit: "500" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid limit");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.list(req as never, { limit: "0" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid limit");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.list(req as never, { limit: "abc" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid limit");
      return true;
    },
  );

  await assert.rejects(
    async () => {
      await controller.list(req as never, { scope: "invalid" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Invalid scope");
      return true;
    },
  );
});

void test("CustomersController BMV actions require context, permission and call service", async () => {
  const calls: string[] = [];
  const service = {
    getByIds: () => Promise.resolve([mockCustomer]),
    sendBmvQuestionnaire: (ctx: { orgId: string }, id: string) => {
      calls.push(`send:${ctx.orgId}:${id}`);
      return Promise.resolve(mockCustomer);
    },
    generateBmvQuote: (ctx: { orgId: string }, id: string) => {
      calls.push(`quote:${ctx.orgId}:${id}`);
      return Promise.resolve(mockCustomer);
    },
    recordBmvSign: (ctx: { orgId: string }, id: string) => {
      calls.push(`sign:${ctx.orgId}:${id}`);
      return Promise.resolve(mockCustomer);
    },
  } as unknown as CustomersService;

  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );
  const req = {
    requestContext: {
      orgId: "org1",
      userId: "user1",
      role: "staff",
    },
  };

  const actions = [
    {
      withoutContext: (target: CustomersController) =>
        target.sendBmvQuestionnaire({} as never, "c1"),
      withContext: (target: CustomersController) =>
        target.sendBmvQuestionnaire(req as never, "c1"),
    },
    {
      withoutContext: (target: CustomersController) =>
        target.generateBmvQuote({} as never, "c1"),
      withContext: (target: CustomersController) =>
        target.generateBmvQuote(req as never, "c1"),
    },
    {
      withoutContext: (target: CustomersController) =>
        target.recordBmvSign({} as never, "c1"),
      withContext: (target: CustomersController) =>
        target.recordBmvSign(req as never, "c1"),
    },
  ] as const;

  for (const action of actions) {
    await assert.rejects(
      async () => {
        await action.withoutContext(controller);
      },
      (err) => {
        assert.ok(err instanceof UnauthorizedException);
        return true;
      },
    );
  }

  const [updatedBySend, updatedByQuote, updatedBySign] = await Promise.all(
    actions.map((action) => action.withContext(controller)),
  );

  assert.equal(updatedBySend.id, "c1");
  assert.equal(updatedByQuote.id, "c1");
  assert.equal(updatedBySign.id, "c1");
  assert.deepEqual(calls, ["send:org1:c1", "quote:org1:c1", "sign:org1:c1"]);

  const forbiddenController = new CustomersController(
    service,
    makePermissions(
      () => true,
      () => false,
    ),
    mockFeatureFlags,
  );

  for (const action of actions) {
    await assert.rejects(
      async () => {
        await action.withContext(forbiddenController);
      },
      (err) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, "Insufficient permissions to edit customer");
        return true;
      },
    );
  }
});
