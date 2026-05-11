import test from "node:test";
import assert from "node:assert/strict";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";

import type { CaseTemplateDto } from "./caseTemplates.types";
import { CaseTemplatesController } from "./caseTemplates.controller";
import { CaseTemplatesService } from "./caseTemplates.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CT_ID = "00000000-0000-4000-8000-000000000010";

const mockDto: CaseTemplateDto = {
  id: CT_ID,
  orgId: ORG_ID,
  templateName: "家族滞在テンプレート",
  caseType: "dependent_visa",
  applicationType: null,
  requirementBlueprint: { items: [{ code: "passport", name: "パスポート" }] },
  blueprintItemCount: 1,
  defaultTasksBlueprint: null,
  reviewRequiredFlag: false,
  billingGateMode: "warn",
  activeFlag: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeReq(role: "viewer" | "staff" | "manager" | "owner" = "manager") {
  return {
    requestContext: { orgId: ORG_ID, userId: USER_ID, role, groupId: "g-1" },
  };
}

function makeController(
  overrides: Partial<CaseTemplatesService> = {},
): CaseTemplatesController {
  const service = {
    list: () => Promise.resolve({ items: [mockDto] }),
    get: () => Promise.resolve(mockDto),
    create: () => Promise.resolve(mockDto),
    update: () => Promise.resolve(mockDto),
    ...overrides,
  } as unknown as CaseTemplatesService;
  return new CaseTemplatesController(service);
}

// ─── list ────────────────────────────────────────────────────────

void test("list requires request context", async () => {
  const ctrl = makeController();
  await assert.rejects(() => ctrl.list({} as never, {}), UnauthorizedException);
});

void test("list forwards caseType filter to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const ctrl = makeController({
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve({ items: [mockDto] });
    },
  });

  const result = await ctrl.list(makeReq() as never, {
    caseType: "dependent_visa",
  });
  assert.equal(result.items.length, 1);
  assert.equal(calledInput?.caseType, "dependent_visa");
});

void test("list includeInactive=true effective for manager role", async () => {
  const captured: Record<string, unknown>[] = [];
  const ctrl = makeController({
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      captured.push(input);
      return Promise.resolve({ items: [] });
    },
  });

  await ctrl.list(makeReq("manager") as never, { includeInactive: "true" });
  assert.equal(captured.at(0)?.includeInactive, true);
});

void test("list includeInactive=true ignored for staff role", async () => {
  const captured: Record<string, unknown>[] = [];
  const ctrl = makeController({
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      captured.push(input);
      return Promise.resolve({ items: [] });
    },
  });

  await ctrl.list(makeReq("staff") as never, { includeInactive: "true" });
  assert.equal(captured.at(0)?.includeInactive, false);
});

void test("list includeInactive=true ignored for viewer role", async () => {
  const captured: Record<string, unknown>[] = [];
  const ctrl = makeController({
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      captured.push(input);
      return Promise.resolve({ items: [] });
    },
  });

  await ctrl.list(makeReq("viewer") as never, { includeInactive: "true" });
  assert.equal(captured.at(0)?.includeInactive, false);
});

void test("list includeInactive=true effective for owner role", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const ctrl = makeController({
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve({ items: [] });
    },
  });

  await ctrl.list(makeReq("owner") as never, { includeInactive: "true" });
  assert.equal(calledInput?.includeInactive, true);
});

// ─── get ─────────────────────────────────────────────────────────

void test("get returns dto", async () => {
  const ctrl = makeController();
  const result = await ctrl.get(makeReq() as never, CT_ID);
  assert.equal(result.id, CT_ID);
});

void test("get throws NotFoundException when not found", async () => {
  const ctrl = makeController({ get: () => Promise.resolve(null) });
  await assert.rejects(
    () => ctrl.get(makeReq() as never, CT_ID),
    NotFoundException,
  );
});

void test("get requires request context", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () => ctrl.get({} as never, CT_ID),
    UnauthorizedException,
  );
});

// ─── create ──────────────────────────────────────────────────────

void test("create validates required fields", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () =>
      ctrl.create(makeReq() as never, {
        caseType: "dependent_visa",
      }),
    /templateName is required/,
  );
  await assert.rejects(
    () =>
      ctrl.create(makeReq() as never, {
        templateName: "X",
      }),
    /caseType is required/,
  );
});

void test("create requires request context", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () =>
      ctrl.create({} as never, {
        templateName: "X",
        caseType: "dependent_visa",
      }),
    UnauthorizedException,
  );
});

void test("create forwards input to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const ctrl = makeController({
    create: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve(mockDto);
    },
  });

  const result = await ctrl.create(makeReq() as never, {
    templateName: "家族滞在テンプレート",
    caseType: "dependent_visa",
    applicationType: "initial",
    reviewRequiredFlag: true,
  });
  assert.equal(result.id, CT_ID);
  assert.ok(calledInput, "create must have been called");
  assert.equal(calledInput.templateName, "家族滞在テンプレート");
  assert.equal(calledInput.caseType, "dependent_visa");
  assert.equal(calledInput.applicationType, "initial");
  assert.equal(calledInput.reviewRequiredFlag, true);
});

// ─── update ──────────────────────────────────────────────────────

void test("update requires request context", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () => ctrl.update({} as never, CT_ID, { templateName: "X" }),
    UnauthorizedException,
  );
});

void test("update forwards input to service", async () => {
  let calledId: string | undefined;
  let calledInput: Record<string, unknown> | undefined;
  const ctrl = makeController({
    update: (_ctx: unknown, id: string, input: Record<string, unknown>) => {
      calledId = id;
      calledInput = input;
      return Promise.resolve(mockDto);
    },
  });

  await ctrl.update(makeReq() as never, CT_ID, {
    templateName: "更新版",
    activeFlag: false,
  });
  assert.equal(calledId, CT_ID);
  assert.ok(calledInput, "update must have been called");
  assert.equal(calledInput.templateName, "更新版");
  assert.equal(calledInput.activeFlag, false);
});
