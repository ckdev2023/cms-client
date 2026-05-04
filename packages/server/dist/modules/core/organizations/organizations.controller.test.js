import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
const ctxReq = {
  requestContext: {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "manager",
  },
};
void test("OrganizationsController.getCurrentSettings requires request context", async () => {
  const controller = new OrganizationsController({});
  await assert.rejects(
    () => controller.getCurrentSettings({}),
    UnauthorizedException,
  );
});
void test("OrganizationsController.updateCurrentSettings forwards parsed patch", async () => {
  let captured;
  const controller = new OrganizationsController({
    updateSettings: (_ctx, input) => {
      captured = input;
      return Promise.resolve({ ok: true });
    },
  });
  await controller.updateCurrentSettings(ctxReq, {
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
  });
  await assert.rejects(
    () =>
      controller.updateCurrentSettings(ctxReq, {
        visibility: { allowCrossGroupCaseCreate: "yes" },
      }),
    BadRequestException,
  );
});
//# sourceMappingURL=organizations.controller.test.js.map
