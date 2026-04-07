import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import type { UserDocument } from "../model/portalEntities";
import { UserDocumentsController } from "./userDocuments.controller";
import { UserDocumentsService } from "./userDocuments.service";

const APP_USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_APP_USER_ID = "00000000-0000-4000-8000-000000000002";
const DOC_ID = "00000000-0000-4000-8000-000000000010";
const LEAD_ID = "00000000-0000-4000-8000-000000000011";
const CASE_ID = "00000000-0000-4000-8000-000000000012";
const ORG_ID = "00000000-0000-4000-8000-000000000013";

const mockDoc: UserDocument = {
  id: DOC_ID,
  appUserId: APP_USER_ID,
  orgId: ORG_ID,
  leadId: LEAD_ID,
  caseId: CASE_ID,
  fileKey: "user-docs/au-1/test.pdf",
  fileName: "test.pdf",
  docType: "general",
  status: "active",
  uploadedAt: "2026-01-01T00:00:00.000Z",
};

const req = {
  appUserContext: {
    appUserId: APP_USER_ID,
  },
};

void test("UserDocumentsController upload validates context and input", async () => {
  let uploadInput: Record<string, unknown> | undefined;
  const service = {
    upload: (input: Record<string, unknown>) => {
      uploadInput = input;
      return Promise.resolve(mockDoc);
    },
  } as unknown as UserDocumentsService;
  const controller = new UserDocumentsController(service);

  await assert.rejects(
    () => controller.upload({} as never, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () =>
      controller.upload(req as never, {
        fileName: "a.pdf",
        data: "not-base64***",
        contentType: "application/pdf",
      }),
    /Invalid data/,
  );
  await assert.rejects(
    () =>
      controller.upload(req as never, {
        fileName: "a.pdf",
        data: Buffer.alloc(10 * 1024 * 1024 + 1, 1).toString("base64"),
        contentType: "application/pdf",
      }),
    /File too large \(max 10MB\)/,
  );
  await assert.rejects(
    () =>
      controller.upload(req as never, {
        fileName: "a.pdf",
        data: Buffer.from("hello").toString("base64"),
        contentType: "application/x-msdownload",
      }),
    /Invalid contentType/,
  );
  await assert.rejects(
    () =>
      controller.upload(req as never, {
        fileName: "a.pdf",
        data: Buffer.from("hello").toString("base64"),
        contentType: "application/pdf",
        leadId: "bad",
      }),
    /Invalid leadId/,
  );

  const res = await controller.upload(req as never, {
    fileName: "../safe.pdf",
    docType: "general",
    leadId: LEAD_ID,
    caseId: CASE_ID,
    orgId: ORG_ID,
    data: Buffer.from("hello").toString("base64"),
    contentType: "application/pdf",
  });

  assert.equal(res.id, DOC_ID);
  assert.ok(uploadInput);
  assert.equal(uploadInput.appUserId, APP_USER_ID);
  assert.equal(uploadInput.fileName, "__safe.pdf");
  assert.equal(uploadInput.leadId, LEAD_ID);
  assert.ok(Buffer.isBuffer(uploadInput.data));
});

void test("UserDocumentsController list parses query and validates UUID filters", async () => {
  let calledQuery: Record<string, unknown> | undefined;
  const service = {
    list: (query: Record<string, unknown>) => {
      calledQuery = query;
      return Promise.resolve({ items: [mockDoc], total: 1 });
    },
  } as unknown as UserDocumentsService;
  const controller = new UserDocumentsController(service);

  await assert.rejects(
    () => controller.list({} as never, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.list(req as never, { leadId: "bad" }),
    /Invalid leadId/,
  );
  await assert.rejects(
    () => controller.list(req as never, { caseId: "bad" }),
    /Invalid caseId/,
  );

  const res = await controller.list(req as never, {
    leadId: LEAD_ID,
    caseId: CASE_ID,
    page: "2",
    limit: "10",
  });

  assert.equal(res.total, 1);
  assert.ok(calledQuery);
  assert.equal(calledQuery.appUserId, APP_USER_ID);
  assert.equal(calledQuery.leadId, LEAD_ID);
  assert.equal(calledQuery.page, 2);
  assert.equal(calledQuery.limit, 10);
});

void test("UserDocumentsController get validates id and ownership", async () => {
  const service = {
    get: (id: string) =>
      Promise.resolve(
        id === DOC_ID
          ? mockDoc
          : id === ORG_ID
            ? { ...mockDoc, appUserId: OTHER_APP_USER_ID }
            : null,
      ),
  } as unknown as UserDocumentsService;
  const controller = new UserDocumentsController(service);

  await assert.rejects(
    () => controller.get({} as never, DOC_ID),
    UnauthorizedException,
  );
  await assert.rejects(() => controller.get(req as never, "bad"), /Invalid id/);
  await assert.rejects(
    () => controller.get(req as never, CASE_ID),
    /Document not found/,
  );
  await assert.rejects(
    () => controller.get(req as never, ORG_ID),
    /Cannot access other user's document/,
  );

  const res = await controller.get(req as never, DOC_ID);
  assert.equal(res.id, DOC_ID);
});

void test("UserDocumentsController downloadUrl validates id and ownership", async () => {
  let calledId = "";
  const service = {
    get: (id: string) =>
      Promise.resolve(
        id === DOC_ID
          ? mockDoc
          : id === ORG_ID
            ? { ...mockDoc, appUserId: OTHER_APP_USER_ID }
            : null,
      ),
    getDownloadUrl: (id: string) => {
      calledId = id;
      return Promise.resolve("https://example.com/signed");
    },
  } as unknown as UserDocumentsService;
  const controller = new UserDocumentsController(service);

  await assert.rejects(
    () => controller.downloadUrl({} as never, DOC_ID),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.downloadUrl(req as never, "bad"),
    /Invalid id/,
  );
  await assert.rejects(
    () => controller.downloadUrl(req as never, CASE_ID),
    /Document not found/,
  );
  await assert.rejects(
    () => controller.downloadUrl(req as never, ORG_ID),
    /Cannot access other user's document/,
  );

  const res = await controller.downloadUrl(req as never, DOC_ID);
  assert.equal(res.url, "https://example.com/signed");
  assert.equal(res.downloadUrl, "https://example.com/signed");
  assert.equal(calledId, DOC_ID);
});

void test("UserDocumentsController remove validates id and ownership", async () => {
  let removedId = "";
  const service = {
    get: (id: string) =>
      Promise.resolve(
        id === DOC_ID
          ? mockDoc
          : id === ORG_ID
            ? { ...mockDoc, appUserId: OTHER_APP_USER_ID }
            : null,
      ),
    remove: (id: string) => {
      removedId = id;
      return Promise.resolve();
    },
  } as unknown as UserDocumentsService;
  const controller = new UserDocumentsController(service);

  await assert.rejects(
    () => controller.remove({} as never, DOC_ID),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.remove(req as never, "bad"),
    BadRequestException,
  );
  await assert.rejects(
    () => controller.remove(req as never, CASE_ID),
    /Document not found/,
  );
  await assert.rejects(
    () => controller.remove(req as never, ORG_ID),
    /Cannot delete other user's document/,
  );

  const res = await controller.remove(req as never, DOC_ID);
  assert.equal(res.ok, true);
  assert.equal(removedId, DOC_ID);
});
