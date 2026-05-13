import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import type { Case } from "../model/coreEntities";
import {
  CASE_ID,
  GD_ID,
  makeController,
  mockCase,
  mockGdDto,
  req,
} from "./generatedDocuments.controller.test-fixtures";

// ─── list ────────────────────────────────────────────────────────

void test("list requires caseId", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list(req as never, {}),
    /caseId is required/,
  );
});

void test("list requires request context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list({} as never, { caseId: CASE_ID }),
    UnauthorizedException,
  );
});

void test("list parses query and forwards to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [mockGdDto], total: 1 });
      },
    },
  });

  const result = await controller.list(req as never, {
    caseId: CASE_ID,
    status: "draft",
    page: "2",
    limit: "10",
  });
  assert.equal(result.total, 1);
  assert.deepEqual(calledInput, {
    caseId: CASE_ID,
    status: "draft",
    page: 2,
    limit: 10,
  });
});

void test("list checks canViewCase on parent case", async () => {
  const controller = makeController({
    permissions: { canViewCase: () => false },
  });
  await assert.rejects(
    () => controller.list(req as never, { caseId: CASE_ID }),
    ForbiddenException,
  );
});

// ─── get ─────────────────────────────────────────────────────────

void test("get returns dto", async () => {
  const controller = makeController();
  const result = await controller.get(req as never, GD_ID);
  assert.equal(result.id, GD_ID);
  assert.equal(result.generatedByDisplayName, "Test User");
});

void test("get throws when not found", async () => {
  const controller = makeController({
    service: { getDto: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () => controller.get(req as never, GD_ID),
    NotFoundException,
  );
});

void test("get checks canViewCase on parent case", async () => {
  const controller = makeController({
    permissions: { canViewCase: () => false },
  });
  await assert.rejects(
    () => controller.get(req as never, GD_ID),
    ForbiddenException,
  );
});

// ─── create ──────────────────────────────────────────────────────

void test("create validates body", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.create(req as never, { title: "X" } as never),
    /caseId is required/,
  );
  await assert.rejects(
    () => controller.create(req as never, { caseId: CASE_ID } as never),
    /title is required/,
  );
});

void test("create requires request context", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.create(
        {} as never,
        {
          caseId: CASE_ID,
          title: "X",
        } as never,
      ),
    UnauthorizedException,
  );
});

void test("create forwards input to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      create: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve(mockGdDto);
      },
    },
  });

  const result = await controller.create(
    req as never,
    {
      caseId: CASE_ID,
      title: "申請書",
      outputFormat: "pdf",
      templateId: "tpl-1",
    } as never,
  );
  assert.equal(result.id, GD_ID);
  assert.deepEqual(calledInput, {
    caseId: CASE_ID,
    title: "申請書",
    outputFormat: "pdf",
    templateId: "tpl-1",
    fileUrl: undefined,
    status: undefined,
  });
});

void test("create throws ForbiddenException when canEditCase denies", async () => {
  let createCalled = false;
  const controller = makeController({
    service: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockGdDto);
      },
    },
    permissions: { canEditCase: () => false },
  });

  await assert.rejects(
    () =>
      controller.create(
        req as never,
        {
          caseId: CASE_ID,
          title: "申請書",
        } as never,
      ),
    ForbiddenException,
  );
  assert.equal(createCalled, false);
});

void test("create throws NotFoundException when parent case is missing", async () => {
  const controller = makeController({
    cases: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () =>
      controller.create(
        req as never,
        {
          caseId: CASE_ID,
          title: "申請書",
        } as never,
      ),
    NotFoundException,
  );
});

void test("create throws BadRequestException when parent case is S9", async () => {
  let createCalled = false;
  const archivedCase: Case = { ...mockCase, stage: "S9", status: "S9" };
  const controller = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    service: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockGdDto);
      },
    },
  });

  await assert.rejects(
    () =>
      controller.create(
        req as never,
        {
          caseId: CASE_ID,
          title: "申請書",
        } as never,
      ),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(createCalled, false);
});

// ─── update ──────────────────────────────────────────────────────

void test("update requires request context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.update({} as never, GD_ID, { status: "final" }),
    UnauthorizedException,
  );
});

void test("update throws NotFoundException when document is missing", async () => {
  const controller = makeController({
    service: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () => controller.update(req as never, GD_ID, { status: "final" }),
    NotFoundException,
  );
});

void test("update forwards input to service", async () => {
  let calledId: string | undefined;
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      update: (_ctx: unknown, id: string, input: Record<string, unknown>) => {
        calledId = id;
        calledInput = input;
        return Promise.resolve(mockGdDto);
      },
    },
  });

  await controller.update(req as never, GD_ID, {
    title: "更新版",
    status: "final",
  });
  assert.equal(calledId, GD_ID);
  assert.deepEqual(calledInput, {
    title: "更新版",
    outputFormat: undefined,
    fileUrl: undefined,
    status: "final",
  });
});

void test("update checks canEditCase on parent case", async () => {
  const controller = makeController({
    permissions: { canEditCase: () => false },
  });
  await assert.rejects(
    () => controller.update(req as never, GD_ID, { status: "final" }),
    ForbiddenException,
  );
});

void test("update throws BadRequestException when parent case is S9", async () => {
  const archivedCase: Case = { ...mockCase, stage: "S9", status: "S9" };
  const controller = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
  });
  await assert.rejects(
    () => controller.update(req as never, GD_ID, { status: "final" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
});
