import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

import type { Case } from "../model/coreEntities";
import type { GeneratedDocument } from "../model/documentEntities";
import {
  GD_ID,
  makeController,
  mockCase,
  mockGdEntity,
  req,
} from "./generatedDocuments.controller.test-fixtures";

void test("remove forwards draft entity to deleteDraft", async () => {
  let deletedWith: GeneratedDocument | undefined;
  const controller = makeController({
    service: {
      get: () => Promise.resolve(mockGdEntity),
      deleteDraft: (_ctx: unknown, ex: GeneratedDocument) => {
        deletedWith = ex;
        return Promise.resolve();
      },
    },
  });

  const result = await controller.remove(req as never, GD_ID);
  assert.equal(result.id, GD_ID);
  assert.equal(deletedWith?.id, GD_ID);
});

void test("remove throws NotFoundException when document missing", async () => {
  const controller = makeController({
    service: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () => controller.remove(req as never, GD_ID),
    NotFoundException,
  );
});

void test("remove checks canEditCase on parent case", async () => {
  const controller = makeController({
    permissions: { canEditCase: () => false },
  });
  await assert.rejects(
    () => controller.remove(req as never, GD_ID),
    ForbiddenException,
  );
});

void test("remove throws BadRequestException when parent case is S9", async () => {
  const archivedCase: Case = { ...mockCase, stage: "S9", status: "S9" };
  let deleteCalled = false;
  const controller = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    service: {
      deleteDraft: () => {
        deleteCalled = true;
        return Promise.resolve();
      },
    },
  });
  await assert.rejects(
    () => controller.remove(req as never, GD_ID),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(deleteCalled, false);
});
