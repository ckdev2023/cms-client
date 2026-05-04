import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
const mockFeatureFlags = {
  resolve: () => Promise.resolve({ key: "bmv", enabled: true, used: true }),
};
const mockCustomer = {
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
  canAccessCustomer = () => true,
  canEditCustomer = () => true,
) {
  return {
    canAccessCustomer,
    canEditCustomer,
  };
}
void test("CustomersController create validates DTO and requires context", async () => {
  const service = {
    create: () => Promise.resolve(mockCustomer),
  };
  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );
  await assert.rejects(
    async () => {
      await controller.create({}, { type: "individual" });
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
      await controller.create(req, { type: "invalid_type" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid type enum");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.create(req, { type: "" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid type");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.create(req, {
        type: "individual",
        baseProfile: "string_is_invalid",
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid object");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.create(req, {
        type: "individual",
        baseProfile: [],
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid object");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.create(req, {
        type: "individual",
        contacts: "not_an_array",
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid contacts");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.create(req, {
        type: "individual",
        contacts: ["string_item"],
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid contacts item");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.create(req, {
        type: "individual",
        contacts: [[]],
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid contacts item");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.create(req, {
        type: "individual",
        contacts: [null],
      });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid contacts item");
      return true;
    },
  );
  const res = await controller.create(req, {
    type: "individual",
    baseProfile: { name: "Alice" },
    contacts: [{ email: "alice@example.com" }],
  });
  assert.equal(res.id, "c1");
});
void test("CustomersController list parses page and limit", async () => {
  let calledQuery = {};
  const service = {
    list: (_ctx, query) => {
      calledQuery = query;
      return Promise.resolve({ items: [mockCustomerSummary], total: 1 });
    },
  };
  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );
  await assert.rejects(
    async () => {
      await controller.list({}, {});
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
  const pagedRes = await controller.list(req, {
    page: "2",
    limit: "10",
  });
  assert.equal(calledQuery.page, 2);
  assert.equal(calledQuery.limit, 10);
  assert.equal(pagedRes.total, 1);
  assert.equal(pagedRes.items[0]?.displayName, "Alice Tanaka");
  assert.equal(pagedRes.items[0]?.owner.initials, "YS");
  assert.equal(pagedRes.items[0]?.bmvProfile, null);
  await controller.list(req, {
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
  await controller.list(req, { scope: "group" });
  assert.equal(calledQuery.scope, "group");
  await controller.list(req, {});
  assert.equal(calledQuery.page, undefined);
  assert.equal(calledQuery.limit, undefined);
  await assert.rejects(
    async () => {
      await controller.list(req, { page: "-1" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid page");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.list(req, { page: "abc" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid page");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.list(req, { limit: "500" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid limit");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.list(req, { limit: "0" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid limit");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.list(req, { limit: "abc" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid limit");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.list(req, { scope: "invalid" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid scope");
      return true;
    },
  );
});
void test("CustomersController BMV actions require context, permission and call service", async () => {
  const calls = [];
  const service = {
    getByIds: () => Promise.resolve([mockCustomer]),
    sendBmvQuestionnaire: (ctx, id) => {
      calls.push(`send:${ctx.orgId}:${id}`);
      return Promise.resolve(mockCustomer);
    },
    generateBmvQuote: (ctx, id) => {
      calls.push(`quote:${ctx.orgId}:${id}`);
      return Promise.resolve(mockCustomer);
    },
    recordBmvSign: (ctx, id) => {
      calls.push(`sign:${ctx.orgId}:${id}`);
      return Promise.resolve(mockCustomer);
    },
  };
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
      withoutContext: (target) => target.sendBmvQuestionnaire({}, "c1"),
      withContext: (target) => target.sendBmvQuestionnaire(req, "c1"),
    },
    {
      withoutContext: (target) => target.generateBmvQuote({}, "c1"),
      withContext: (target) => target.generateBmvQuote(req, "c1"),
    },
    {
      withoutContext: (target) => target.recordBmvSign({}, "c1"),
      withContext: (target) => target.recordBmvSign(req, "c1"),
    },
  ];
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
//# sourceMappingURL=customers.controller.test.js.map
