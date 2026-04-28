import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

const ctxReq = {
  requestContext: {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "manager",
  },
};

void test("OrganizationsController.getCurrentSettings requires request context", async () => {
  const controller = new OrganizationsController({} as OrganizationsService);
  await assert.rejects(
    () => controller.getCurrentSettings({} as never),
    UnauthorizedException,
  );
});

void test("OrganizationsController.updateCurrentSettings forwards parsed patch", async () => {
  let captured: unknown;
  const controller = new OrganizationsController({
    updateSettings: (_ctx: unknown, input: unknown) => {
      captured = input;
      return Promise.resolve({ ok: true });
    },
  } as unknown as OrganizationsService);

  await controller.updateCurrentSettings(ctxReq as never, {
    visibility: { allowCrossGroupCaseCreate: true },
    storageRoot: { rootLabel: "案件資料", rootPath: null },
  });

  assert.deepEqual(captured, {
    visibility: { allowCrossGroupCaseCreate: true },
    storageRoot: { rootLabel: "案件資料", rootPath: null },
  });
});

void test("OrganizationsController.updateCurrentSettings rejects invalid payload", async () => {
  const controller = new OrganizationsController({
    updateSettings: () => Promise.resolve({ ok: true }),
  } as unknown as OrganizationsService);

  await assert.rejects(
    () =>
      controller.updateCurrentSettings(ctxReq as never, {
        visibility: { allowCrossGroupCaseCreate: "yes" },
      }),
    BadRequestException,
  );
});
