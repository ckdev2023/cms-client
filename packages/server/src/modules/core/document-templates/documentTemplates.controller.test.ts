import test from "node:test";
import assert from "node:assert/strict";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";

import type { DocumentTemplateDto } from "./documentTemplates.types";
import { DocumentTemplatesController } from "./documentTemplates.controller";
import { DocumentTemplatesService } from "./documentTemplates.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const DT_ID = "00000000-0000-4000-8000-000000000010";

const mockDto: DocumentTemplateDto = {
  id: DT_ID,
  orgId: ORG_ID,
  templateName: "申請理由書",
  caseType: "family_stay",
  docType: "reason_statement",
  language: "ja",
  versionNo: 1,
  contentBody: "",
  variablesSchema: {},
  activeFlag: true,
  createdBy: USER_ID,
  updatedBy: USER_ID,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeReq(role: "viewer" | "staff" | "manager" | "owner" = "manager") {
  return {
    requestContext: { orgId: ORG_ID, userId: USER_ID, role, groupId: "g-1" },
  };
}

function makeController(
  overrides: Partial<DocumentTemplatesService> = {},
): DocumentTemplatesController {
  const service = {
    list: () => Promise.resolve({ items: [mockDto] }),
    get: () => Promise.resolve(mockDto),
    create: () => Promise.resolve(mockDto),
    update: () => Promise.resolve(mockDto),
    archive: () => Promise.resolve(mockDto),
    ...overrides,
  } as unknown as DocumentTemplatesService;
  return new DocumentTemplatesController(service);
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
    caseType: "family_stay",
  });
  assert.equal(result.items.length, 1);
  assert.equal(calledInput?.caseType, "family_stay");
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

void test("list forwards language filter to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const ctrl = makeController({
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve({ items: [mockDto] });
    },
  });

  const result = await ctrl.list(makeReq() as never, { language: "ja" });
  assert.equal(result.items.length, 1);
  assert.equal(calledInput?.language, "ja");
});

void test("list forwards both caseType and language filters to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const ctrl = makeController({
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve({ items: [] });
    },
  });

  await ctrl.list(makeReq() as never, {
    caseType: "family_stay",
    language: "en",
  });
  assert.ok(calledInput, "list must have been called");
  assert.equal(calledInput.caseType, "family_stay");
  assert.equal(calledInput.language, "en");
});

void test("list omits language from service input when not provided", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const ctrl = makeController({
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve({ items: [] });
    },
  });

  await ctrl.list(makeReq() as never, {});
  assert.equal(calledInput?.language, undefined);
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
  const result = await ctrl.get(makeReq() as never, DT_ID);
  assert.equal(result.id, DT_ID);
});

void test("get throws NotFoundException when not found", async () => {
  const ctrl = makeController({ get: () => Promise.resolve(null) });
  await assert.rejects(
    () => ctrl.get(makeReq() as never, DT_ID),
    NotFoundException,
  );
});

void test("get requires request context", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () => ctrl.get({} as never, DT_ID),
    UnauthorizedException,
  );
});

// ─── create ──────────────────────────────────────────────────────

void test("create validates required fields", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () =>
      ctrl.create(makeReq() as never, {
        caseType: "family_stay",
        docType: "reason_statement",
      }),
    /templateName is required/,
  );
  await assert.rejects(
    () =>
      ctrl.create(makeReq() as never, {
        templateName: "X",
        docType: "reason_statement",
      }),
    /caseType is required/,
  );
  await assert.rejects(
    () =>
      ctrl.create(makeReq() as never, {
        templateName: "X",
        caseType: "family_stay",
      }),
    /docType is required/,
  );
});

void test("create requires request context", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () =>
      ctrl.create({} as never, {
        templateName: "X",
        caseType: "family_stay",
        docType: "reason_statement",
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
    templateName: "申請理由書",
    caseType: "family_stay",
    docType: "reason_statement",
    language: "ja",
  });
  assert.equal(result.id, DT_ID);
  assert.deepEqual(calledInput, {
    templateName: "申請理由書",
    caseType: "family_stay",
    docType: "reason_statement",
    language: "ja",
    versionNo: undefined,
    contentBody: undefined,
    variablesSchema: undefined,
    activeFlag: undefined,
  });
});

// ─── update ──────────────────────────────────────────────────────

void test("update requires request context", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () => ctrl.update({} as never, DT_ID, { templateName: "X" }),
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

  await ctrl.update(makeReq() as never, DT_ID, {
    templateName: "更新版",
    activeFlag: false,
  });
  assert.equal(calledId, DT_ID);
  assert.deepEqual(calledInput, {
    templateName: "更新版",
    caseType: undefined,
    docType: undefined,
    language: undefined,
    contentBody: undefined,
    variablesSchema: undefined,
    activeFlag: false,
  });
});
