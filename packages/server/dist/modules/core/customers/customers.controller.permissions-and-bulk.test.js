import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { CustomersController } from "./customers.controller";
const CUSTOMER_DETAIL_ID = "00000000-0000-4000-8000-000000000001";
const MISSING_CUSTOMER_ID = "00000000-0000-4000-8000-000000000002";
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
    nationality: "日本",
    gender: "女",
    birthday: "1990-01-01",
    note: "vip",
  },
  contacts: [{ email: "alice-contact@example.com" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const mockCustomerDetailDto = {
  id: CUSTOMER_DETAIL_ID,
  displayName: "Alice Tanaka",
  legalName: "Alice Tanaka",
  furigana: "アリス タナカ",
  customerNumber: "C-0001",
  phone: "090-1111-2222",
  email: "alice@example.com",
  totalCases: 0,
  activeCases: 0,
  archivedCases: 0,
  lastContactDate: null,
  lastContactChannel: null,
  owner: { initials: "YS", name: "Yamada Shota" },
  referralSource: "Web",
  group: "東京一組",
  bmvProfile: null,
  nationality: "日本",
  gender: "女",
  birthDate: "1990-01-01",
  avatar: "",
  note: "vip",
  caseNames: [],
  lastCaseCreatedDate: null,
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
void test("CustomersController checkDuplicates validates context and body", async () => {
  let receivedBody;
  const service = {
    checkDuplicates: (_ctx, body) => {
      receivedBody = body;
      return Promise.resolve([]);
    },
  };
  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );
  await assert.rejects(
    () => controller.checkDuplicates({}, {}),
    UnauthorizedException,
  );
  const req = {
    requestContext: {
      orgId: "org1",
      userId: "user1",
      role: "staff",
    },
  };
  await controller.checkDuplicates(req, {
    name: " Alice ",
    phone: "080-1234-5678",
    email: "alice@example.com",
    excludeCustomerId: "c1",
  });
  assert.deepEqual(receivedBody, {
    name: "Alice",
    phone: "080-1234-5678",
    email: "alice@example.com",
    excludeCustomerId: "c1",
  });
});
void test("CustomersController bulk endpoints validate ids and permissions", async () => {
  const calls = [];
  const service = {
    getByIds: (_ctx, ids) =>
      Promise.resolve(ids.map((id) => ({ ...mockCustomer, id }))),
    bulkAssignOwner: (_ctx, ids, ownerId) => {
      calls.push({ type: "owner", ids, value: ownerId });
      return Promise.resolve(ids.length);
    },
    bulkChangeGroup: (_ctx, ids, group) => {
      calls.push({ type: "group", ids, value: group });
      return Promise.resolve(ids.length);
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
  const assignResult = await controller.bulkAssignOwner(req, {
    customerIds: ["c1", "c2", "c1"],
    ownerId: "owner-2",
  });
  assert.deepEqual(assignResult, { ok: true, updatedCount: 2 });
  const groupResult = await controller.bulkChangeGroup(req, {
    customerIds: ["c1", "c2"],
    group: "tokyo",
  });
  assert.deepEqual(groupResult, { ok: true, updatedCount: 2 });
  assert.deepEqual(calls, [
    { type: "owner", ids: ["c1", "c2"], value: "owner-2" },
    { type: "group", ids: ["c1", "c2"], value: "tokyo" },
  ]);
  const deniedController = new CustomersController(
    service,
    makePermissions(
      () => true,
      () => false,
    ),
    mockFeatureFlags,
  );
  await assert.rejects(
    () =>
      deniedController.bulkAssignOwner(req, {
        customerIds: ["c1"],
        ownerId: "owner-3",
      }),
    ForbiddenException,
  );
  await assert.rejects(
    () =>
      controller.bulkAssignOwner(req, {
        customerIds: [],
        ownerId: "x",
      }),
    BadRequestException,
  );
});
void test("CustomersController get validates context and handles not found", async () => {
  const service = {
    get: (_ctx, id) => {
      if (id === CUSTOMER_DETAIL_ID)
        return Promise.resolve(mockCustomerDetailDto);
      return Promise.resolve(null);
    },
  };
  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );
  await assert.rejects(
    async () => {
      await controller.get({}, CUSTOMER_DETAIL_ID);
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
  const res = await controller.get(req, CUSTOMER_DETAIL_ID);
  assert.equal(res.id, CUSTOMER_DETAIL_ID);
  assert.equal(res.displayName, "Alice Tanaka");
  assert.equal(res.owner.initials, "YS");
  assert.equal(res.nationality, "日本");
  assert.deepEqual(res.caseNames, []);
  await assert.rejects(
    async () => {
      await controller.get(req, "d28b5dae");
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Invalid id");
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await controller.get(req, MISSING_CUSTOMER_ID);
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.message, "Customer not found");
      return true;
    },
  );
});
void test("CustomersController update validates DTO", async () => {
  const service = {
    getByIds: () => Promise.resolve([mockCustomer]),
    update: () => Promise.resolve(mockCustomer),
  };
  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );
  await assert.rejects(
    async () => {
      await controller.update({}, "c1", { type: "corporation" });
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
      await controller.update(req, "c1", { type: "unknown" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      return true;
    },
  );
  const res = await controller.update(req, "c1", {
    type: "corporation",
  });
  assert.equal(res.id, "c1");
  const resWithoutType = await controller.update(req, "c1", {});
  assert.equal(resWithoutType.id, "c1");
});
void test("CustomersController update throws when canEditCustomer denies", async () => {
  let updateCalled = false;
  const service = {
    getByIds: () => Promise.resolve([mockCustomer]),
    update: () => {
      updateCalled = true;
      return Promise.resolve(mockCustomer);
    },
  };
  const controller = new CustomersController(
    service,
    makePermissions(
      () => true,
      () => false,
    ),
    mockFeatureFlags,
  );
  const req = {
    requestContext: {
      orgId: "org1",
      userId: "user1",
      role: "staff",
    },
  };
  await assert.rejects(
    () => controller.update(req, "c1", { type: "corporation" }),
    ForbiddenException,
  );
  assert.equal(updateCalled, false);
});
void test("CustomersController delete validates context", async () => {
  let deletedId = "";
  const service = {
    getByIds: () => Promise.resolve([mockCustomer]),
    softDelete: (_ctx, id) => {
      deletedId = id;
      return Promise.resolve();
    },
  };
  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );
  await assert.rejects(
    async () => {
      await controller.delete({}, "c1");
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
      role: "manager",
    },
  };
  const res = await controller.delete(req, "c1");
  assert.equal(res.ok, true);
  assert.equal(deletedId, "c1");
});
void test("CustomersController delete throws when canEditCustomer denies", async () => {
  let deleted = false;
  const service = {
    getByIds: () => Promise.resolve([mockCustomer]),
    softDelete: () => {
      deleted = true;
      return Promise.resolve();
    },
  };
  const controller = new CustomersController(
    service,
    makePermissions(
      () => true,
      () => false,
    ),
    mockFeatureFlags,
  );
  const req = {
    requestContext: {
      orgId: "org1",
      userId: "user1",
      role: "manager",
    },
  };
  await assert.rejects(() => controller.delete(req, "c1"), ForbiddenException);
  assert.equal(deleted, false);
});
//# sourceMappingURL=customers.controller.permissions-and-bulk.test.js.map
