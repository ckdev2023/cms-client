import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import type { FeatureFlagsService } from "../../feature-flags/featureFlags.service";
import { ctx } from "./customers.bmv.d7.focused.test-support";

// ────────────────────────────────────────────────────────────────
// Feature flag 關閉時拒否
// ────────────────────────────────────────────────────────────────

function makeReq(reqCtx = ctx) {
  return { requestContext: reqCtx } as never;
}

function makeFeatureFlagsService(enabled: boolean): FeatureFlagsService {
  return {
    resolve: () =>
      Promise.resolve({
        key: "bmv",
        enabled,
        used: enabled,
        reason: enabled ? undefined : "disabled",
      }),
  } as unknown as FeatureFlagsService;
}

function makePermissions(): PermissionsService {
  return {
    canAccessCustomer: () => true,
    canEditCustomer: () => true,
  } as unknown as PermissionsService;
}

function makeCustomersService(): CustomersService {
  return {
    sendBmvQuestionnaire: () => Promise.resolve({}),
    generateBmvQuote: () => Promise.resolve({}),
    recordBmvSign: () => Promise.resolve({}),
    saveBmvSurvey: () => Promise.resolve({}),
    modifyBmvQuote: () => Promise.resolve({}),
    transitionBmvToCase: () => Promise.resolve({}),
    getBmvAggregate: () => Promise.resolve({}),
  } as unknown as CustomersService;
}

void describe("D7 feature flag: BMV endpoints reject when flag disabled", () => {
  void test("sendBmvQuestionnaire returns 403", async () => {
    const controller = new CustomersController(
      makeCustomersService(),
      makePermissions(),
      makeFeatureFlagsService(false),
    );
    await assert.rejects(
      () => controller.sendBmvQuestionnaire(makeReq(), "c1"),
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });

  void test("generateBmvQuote returns 403", async () => {
    const controller = new CustomersController(
      makeCustomersService(),
      makePermissions(),
      makeFeatureFlagsService(false),
    );
    await assert.rejects(
      () => controller.generateBmvQuote(makeReq(), "c1"),
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });

  void test("recordBmvSign returns 403", async () => {
    const controller = new CustomersController(
      makeCustomersService(),
      makePermissions(),
      makeFeatureFlagsService(false),
    );
    await assert.rejects(
      () => controller.recordBmvSign(makeReq(), "c1"),
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });

  void test("saveBmvSurvey returns 403", async () => {
    const controller = new CustomersController(
      makeCustomersService(),
      makePermissions(),
      makeFeatureFlagsService(false),
    );
    await assert.rejects(
      () =>
        controller.saveBmvSurvey(makeReq(), "c1", {
          intakeFormId: "intake-1",
          formData: {},
        }),
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });

  void test("modifyBmvQuote returns 403", async () => {
    const controller = new CustomersController(
      makeCustomersService(),
      makePermissions(),
      makeFeatureFlagsService(false),
    );
    await assert.rejects(
      () =>
        controller.modifyBmvQuote(makeReq(), "c1", {
          appUserId: "app-1",
          formData: {},
        }),
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });

  void test("transitionBmvToCase returns 403", async () => {
    const controller = new CustomersController(
      makeCustomersService(),
      makePermissions(),
      makeFeatureFlagsService(false),
    );
    await assert.rejects(
      () => controller.transitionBmvToCase(makeReq(), "c1", {}),
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });

  void test("getBmvAggregate returns 403", async () => {
    const controller = new CustomersController(
      makeCustomersService(),
      makePermissions(),
      makeFeatureFlagsService(false),
    );
    await assert.rejects(
      () => controller.getBmvAggregate(makeReq(), "c1"),
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });
});

void describe("D7 feature flag: BMV endpoints proceed when flag enabled", () => {
  void test("getBmvAggregate succeeds when enabled", async () => {
    const controller = new CustomersController(
      makeCustomersService(),
      makePermissions(),
      makeFeatureFlagsService(true),
    );
    await assert.doesNotReject(() =>
      controller.getBmvAggregate(makeReq(), "c1"),
    );
  });
});
