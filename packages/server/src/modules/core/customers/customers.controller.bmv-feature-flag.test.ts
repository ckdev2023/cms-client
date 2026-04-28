import test from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import type { Customer } from "../model/coreEntities";
import { FeatureFlagsService } from "../../feature-flags/featureFlags.service";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

const CUSTOMER_ID = "00000000-0000-4000-8000-000000000001";

const mockCustomer: Customer = {
  id: "c1",
  orgId: "org1",
  type: "individual",
  baseProfile: { name: "Test" },
  contacts: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const req = {
  requestContext: { orgId: "org1", userId: "user1", role: "staff" as const },
};

function makeService(): CustomersService {
  return {
    getByIds: () => Promise.resolve([mockCustomer]),
    sendBmvQuestionnaire: () => Promise.resolve(mockCustomer),
    generateBmvQuote: () => Promise.resolve(mockCustomer),
    recordBmvSign: () => Promise.resolve(mockCustomer),
    saveBmvSurvey: () => Promise.resolve(mockCustomer),
    modifyBmvQuote: () => Promise.resolve(mockCustomer),
    transitionBmvToCase: () => Promise.resolve({ id: "case1" }),
    getBmvAggregate: () => Promise.resolve({ bmvProfile: null }),
  } as unknown as CustomersService;
}

function makePermissions(): PermissionsService {
  return {
    canAccessCustomer: () => true,
    canEditCustomer: () => true,
  } as unknown as PermissionsService;
}

function makeDisabledFlags(): FeatureFlagsService {
  return {
    resolve: () =>
      Promise.resolve({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "disabled",
      }),
  } as unknown as FeatureFlagsService;
}

function makeEnabledFlags(): FeatureFlagsService {
  return {
    resolve: () => Promise.resolve({ key: "bmv", enabled: true, used: true }),
  } as unknown as FeatureFlagsService;
}

void test("BMV endpoints return 403 when bmv feature flag is disabled", async () => {
  const controller = new CustomersController(
    makeService(),
    makePermissions(),
    makeDisabledFlags(),
  );

  const bmvActions: {
    name: string;
    run: () => Promise<unknown>;
  }[] = [
    {
      name: "sendBmvQuestionnaire",
      run: () => controller.sendBmvQuestionnaire(req as never, "c1"),
    },
    {
      name: "generateBmvQuote",
      run: () => controller.generateBmvQuote(req as never, "c1"),
    },
    {
      name: "recordBmvSign",
      run: () => controller.recordBmvSign(req as never, "c1"),
    },
    {
      name: "saveBmvSurvey",
      run: () =>
        controller.saveBmvSurvey(req as never, "c1", {
          intakeFormId: "f1",
          formData: { q: "a" },
        }),
    },
    {
      name: "modifyBmvQuote",
      run: () =>
        controller.modifyBmvQuote(req as never, "c1", {
          appUserId: "u1",
          formData: { q: "a" },
        }),
    },
    {
      name: "transitionBmvToCase",
      run: () => controller.transitionBmvToCase(req as never, "c1", {}),
    },
    {
      name: "getBmvAggregate",
      run: () => controller.getBmvAggregate(req as never, "c1"),
    },
  ];

  for (const action of bmvActions) {
    await assert.rejects(action.run, (err) => {
      assert.ok(
        err instanceof ForbiddenException,
        `${action.name} should throw ForbiddenException, got ${String(err)}`,
      );
      assert.equal(
        err.message,
        "BMV feature is not enabled for this organization",
      );
      return true;
    });
  }
});

void test("BMV endpoints succeed when bmv feature flag is enabled", async () => {
  const calls: string[] = [];
  const service = {
    getByIds: () => Promise.resolve([mockCustomer]),
    sendBmvQuestionnaire: () => {
      calls.push("send");
      return Promise.resolve(mockCustomer);
    },
    generateBmvQuote: () => {
      calls.push("quote");
      return Promise.resolve(mockCustomer);
    },
    recordBmvSign: () => {
      calls.push("sign");
      return Promise.resolve(mockCustomer);
    },
    getBmvAggregate: () => {
      calls.push("aggregate");
      return Promise.resolve({ bmvProfile: null });
    },
  } as unknown as CustomersService;

  const controller = new CustomersController(
    service,
    makePermissions(),
    makeEnabledFlags(),
  );

  await controller.sendBmvQuestionnaire(req as never, "c1");
  await controller.generateBmvQuote(req as never, "c1");
  await controller.recordBmvSign(req as never, "c1");
  await controller.getBmvAggregate(req as never, "c1");

  assert.deepEqual(calls, ["send", "quote", "sign", "aggregate"]);
});

void test("BMV feature flag check uses 'bmv' key", async () => {
  let resolvedKey = "";
  const flagService = {
    resolve: (_ctx: unknown, input: { key: string }) => {
      resolvedKey = input.key;
      return Promise.resolve({ key: input.key, enabled: true, used: true });
    },
  } as unknown as FeatureFlagsService;

  const controller = new CustomersController(
    makeService(),
    makePermissions(),
    flagService,
  );

  await controller.sendBmvQuestionnaire(req as never, "c1");
  assert.equal(resolvedKey, "bmv");
});

void test("Non-BMV endpoints are not gated by feature flag", async () => {
  let flagResolveCalled = false;
  const flagService = {
    resolve: () => {
      flagResolveCalled = true;
      return Promise.resolve({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "disabled",
      });
    },
  } as unknown as FeatureFlagsService;

  const service = {
    get: () => Promise.resolve({ id: CUSTOMER_ID, displayName: "Test" }),
    list: () => Promise.resolve({ items: [], total: 0 }),
    create: () => Promise.resolve(mockCustomer),
  } as unknown as CustomersService;

  const controller = new CustomersController(
    service,
    makePermissions(),
    flagService,
  );

  await controller.get(req as never, CUSTOMER_ID);
  assert.equal(flagResolveCalled, false);

  await controller.list(req as never, {});
  assert.equal(flagResolveCalled, false);

  await controller.create(req as never, { type: "individual" });
  assert.equal(flagResolveCalled, false);
});
