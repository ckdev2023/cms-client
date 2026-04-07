import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import type { Customer } from "../model/coreEntities";

const mockCustomer: Customer = {
  id: "c1",
  orgId: "org1",
  type: "individual",
  baseProfile: {},
  contacts: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makePermissions(
  canEditCustomer: PermissionsService["canEditCustomer"] = () => true,
): PermissionsService {
  return { canEditCustomer } as unknown as PermissionsService;
}

void test("CustomersController create validates DTO and requires context", async () => {
  const service = {
    create: () => Promise.resolve(mockCustomer),
  } as unknown as CustomersService;

  const controller = new CustomersController(service, makePermissions());

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
      return Promise.resolve({ items: [], total: 0 });
    },
  } as unknown as CustomersService;

  const controller = new CustomersController(service, makePermissions());

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

  await controller.list(req as never, { page: "2", limit: "10" });
  assert.equal(calledQuery.page, 2);
  assert.equal(calledQuery.limit, 10);

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
});

void test("CustomersController get validates context and handles not found", async () => {
  const service = {
    get: (_ctx: unknown, id: string) => {
      if (id === "c1") return Promise.resolve(mockCustomer);
      return Promise.resolve(null);
    },
  } as unknown as CustomersService;

  const controller = new CustomersController(service, makePermissions());

  await assert.rejects(
    async () => {
      await controller.get({} as never, "c1");
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

  const res = await controller.get(req as never, "c1");
  assert.equal(res.id, "c1");

  await assert.rejects(
    async () => {
      await controller.get(req as never, "not_found");
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal((err as Error).message, "Customer not found");
      return true;
    },
  );
});

void test("CustomersController update validates DTO", async () => {
  const service = {
    update: () => Promise.resolve(mockCustomer),
  } as unknown as CustomersService;

  const controller = new CustomersController(service, makePermissions());

  await assert.rejects(
    async () => {
      await controller.update({} as never, "c1", { type: "corporation" });
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
      await controller.update(req as never, "c1", { type: "unknown" });
    },
    (err) => {
      assert.ok(err instanceof BadRequestException);
      return true;
    },
  );

  const res = await controller.update(req as never, "c1", {
    type: "corporation",
  });
  assert.equal(res.id, "c1");

  const resWithoutType = await controller.update(req as never, "c1", {});
  assert.equal(resWithoutType.id, "c1");
});

void test("CustomersController update throws when canEditCustomer denies", async () => {
  let updateCalled = false;
  const service = {
    update: () => {
      updateCalled = true;
      return Promise.resolve(mockCustomer);
    },
  } as unknown as CustomersService;

  const controller = new CustomersController(
    service,
    makePermissions(() => false),
  );
  const req = {
    requestContext: {
      orgId: "org1",
      userId: "user1",
      role: "staff",
    },
  };

  await assert.rejects(
    () => controller.update(req as never, "c1", { type: "corporation" }),
    ForbiddenException,
  );
  assert.equal(updateCalled, false);
});

void test("CustomersController delete validates context", async () => {
  let deletedId = "";
  const service = {
    softDelete: (_ctx: unknown, id: string) => {
      deletedId = id;
      return Promise.resolve();
    },
  } as unknown as CustomersService;

  const controller = new CustomersController(service, makePermissions());

  await assert.rejects(
    async () => {
      await controller.delete({} as never, "c1");
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

  const res = await controller.delete(req as never, "c1");
  assert.equal(res.ok, true);
  assert.equal(deletedId, "c1");
});

void test("CustomersController delete throws when canEditCustomer denies", async () => {
  let deleted = false;
  const service = {
    softDelete: () => {
      deleted = true;
      return Promise.resolve();
    },
  } as unknown as CustomersService;

  const controller = new CustomersController(
    service,
    makePermissions(() => false),
  );
  const req = {
    requestContext: {
      orgId: "org1",
      userId: "user1",
      role: "manager",
    },
  };

  await assert.rejects(
    () => controller.delete(req as never, "c1"),
    ForbiddenException,
  );
  assert.equal(deleted, false);
});
