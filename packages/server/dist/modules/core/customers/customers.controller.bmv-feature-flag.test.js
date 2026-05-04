import test from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000001";
const mockCustomer = {
  id: "c1",
  orgId: "org1",
  type: "individual",
  baseProfile: { name: "Test" },
  contacts: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const req = {
  requestContext: { orgId: "org1", userId: "user1", role: "staff" },
};
function makeService() {
  return {
    getByIds: () => Promise.resolve([mockCustomer]),
    sendBmvQuestionnaire: () => Promise.resolve(mockCustomer),
    generateBmvQuote: () => Promise.resolve(mockCustomer),
    recordBmvSign: () => Promise.resolve(mockCustomer),
    saveBmvSurvey: () => Promise.resolve(mockCustomer),
    modifyBmvQuote: () => Promise.resolve(mockCustomer),
    transitionBmvToCase: () => Promise.resolve({ id: "case1" }),
    getBmvAggregate: () => Promise.resolve({ bmvProfile: null }),
  };
}
function makePermissions() {
  return {
    canAccessCustomer: () => true,
    canEditCustomer: () => true,
  };
}
function makeDisabledFlags() {
  return {
    resolve: () =>
      Promise.resolve({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "disabled",
      }),
  };
}
function makeEnabledFlags() {
  return {
    resolve: () => Promise.resolve({ key: "bmv", enabled: true, used: true }),
  };
}
void test("BMV endpoints return 403 when bmv feature flag is disabled", async () => {
  const controller = new CustomersController(
    makeService(),
    makePermissions(),
    makeDisabledFlags(),
  );
  const bmvActions = [
    {
      name: "sendBmvQuestionnaire",
      run: () => controller.sendBmvQuestionnaire(req, "c1"),
    },
    {
      name: "generateBmvQuote",
      run: () => controller.generateBmvQuote(req, "c1"),
    },
    {
      name: "recordBmvSign",
      run: () => controller.recordBmvSign(req, "c1"),
    },
    {
      name: "saveBmvSurvey",
      run: () =>
        controller.saveBmvSurvey(req, "c1", {
          intakeFormId: "f1",
          formData: { q: "a" },
        }),
    },
    {
      name: "modifyBmvQuote",
      run: () =>
        controller.modifyBmvQuote(req, "c1", {
          appUserId: "u1",
          formData: { q: "a" },
        }),
    },
    {
      name: "transitionBmvToCase",
      run: () => controller.transitionBmvToCase(req, "c1", {}),
    },
    {
      name: "getBmvAggregate",
      run: () => controller.getBmvAggregate(req, "c1"),
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
  const calls = [];
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
  };
  const controller = new CustomersController(
    service,
    makePermissions(),
    makeEnabledFlags(),
  );
  await controller.sendBmvQuestionnaire(req, "c1");
  await controller.generateBmvQuote(req, "c1");
  await controller.recordBmvSign(req, "c1");
  await controller.getBmvAggregate(req, "c1");
  assert.deepEqual(calls, ["send", "quote", "sign", "aggregate"]);
});
void test("BMV feature flag check uses 'bmv' key", async () => {
  let resolvedKey = "";
  const flagService = {
    resolve: (_ctx, input) => {
      resolvedKey = input.key;
      return Promise.resolve({ key: input.key, enabled: true, used: true });
    },
  };
  const controller = new CustomersController(
    makeService(),
    makePermissions(),
    flagService,
  );
  await controller.sendBmvQuestionnaire(req, "c1");
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
  };
  const service = {
    get: () => Promise.resolve({ id: CUSTOMER_ID, displayName: "Test" }),
    list: () => Promise.resolve({ items: [], total: 0 }),
    create: () => Promise.resolve(mockCustomer),
  };
  const controller = new CustomersController(
    service,
    makePermissions(),
    flagService,
  );
  await controller.get(req, CUSTOMER_ID);
  assert.equal(flagResolveCalled, false);
  await controller.list(req, {});
  assert.equal(flagResolveCalled, false);
  await controller.create(req, { type: "individual" });
  assert.equal(flagResolveCalled, false);
});
//# sourceMappingURL=customers.controller.bmv-feature-flag.test.js.map
