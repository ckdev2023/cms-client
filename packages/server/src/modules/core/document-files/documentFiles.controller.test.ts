import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import type { DocumentFile } from "../model/coreEntities";
import { DocumentFilesController } from "./documentFiles.controller";
import { DocumentFilesService } from "./documentFiles.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const FILE_ID = "00000000-0000-4000-8000-000000000002";
const REQUIREMENT_ID = "00000000-0000-4000-8000-000000000010";

const mockFile: DocumentFile = {
  id: FILE_ID,
  orgId: ORG_ID,
  requirementId: REQUIREMENT_ID,
  fileName: "passport.pdf",
  fileUrl: "document-files/req/passport.pdf",
  fileType: "application/pdf",
  fileSize: 5,
  versionNo: 1,
  uploadedBy: USER_ID,
  uploadedAt: "2026-01-01T00:00:00.000Z",
  storageType: "local_server",
  relativePath: null,
  reviewStatus: "pending",
  reviewBy: null,
  reviewAt: null,
  expiryDate: null,
  hashValue: "hash",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "manager" as const,
  },
};

void test("DocumentFilesController upload validates context and input", async () => {
  let uploadInput: Record<string, unknown> | undefined;
  const service = {
    upload: (_ctx: unknown, input: Record<string, unknown>) => {
      uploadInput = input;
      return Promise.resolve(mockFile);
    },
  } as unknown as DocumentFilesService;
  const controller = new DocumentFilesController(service);

  await assert.rejects(
    () => controller.upload({} as never, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () =>
      controller.upload(req as never, {
        requirementId: "bad",
        fileName: "a.pdf",
        data: "aGVsbG8=",
        contentType: "application/pdf",
      }),
    /Invalid requirementId/,
  );
  await assert.rejects(
    () =>
      controller.upload(req as never, {
        requirementId: REQUIREMENT_ID,
        fileName: "a.pdf",
        data: "not-base64***",
        contentType: "application/pdf",
      }),
    /Invalid data/,
  );
  await assert.rejects(
    () =>
      controller.upload(req as never, {
        requirementId: REQUIREMENT_ID,
        fileName: "a.pdf",
        data: Buffer.alloc(10 * 1024 * 1024 + 1, 1).toString("base64"),
        contentType: "application/pdf",
      }),
    /File too large \(max 10MB\)/,
  );
  await assert.rejects(
    () =>
      controller.upload(req as never, {
        requirementId: REQUIREMENT_ID,
        fileName: "a.pdf",
        data: "aGVsbG8=",
        contentType: "application/x-msdownload",
      }),
    /Invalid contentType/,
  );
  await assert.rejects(
    () =>
      controller.upload(req as never, {
        requirementId: REQUIREMENT_ID,
        fileName: "a.pdf",
        data: "aGVsbG8=",
        contentType: "application/pdf",
        expiryDate: "2026-02-30",
      }),
    /Invalid expiryDate/,
  );

  const res = await controller.upload(req as never, {
    requirementId: REQUIREMENT_ID,
    fileName: "../passport.pdf",
    data: Buffer.from("hello").toString("base64"),
    contentType: "application/pdf",
    expiryDate: "2026-12-31",
  });
  assert.ok(uploadInput);
  assert.equal(res.id, FILE_ID);
  assert.equal(res.fileKey, mockFile.fileUrl);
  assert.equal(uploadInput.requirementId, REQUIREMENT_ID);
  assert.equal(uploadInput.fileName, "__passport.pdf");
  assert.equal(uploadInput.contentType, "application/pdf");
  assert.equal(uploadInput.expiryDate, "2026-12-31");
  assert.equal((uploadInput.data as Buffer).toString(), "hello");
});

void test("DocumentFilesController upload supports local paper archive registration", async () => {
  let uploadInput: Record<string, unknown> | undefined;
  const service = {
    upload: (_ctx: unknown, input: Record<string, unknown>) => {
      uploadInput = input;
      return Promise.resolve({
        ...mockFile,
        fileUrl: null,
        fileType: null,
        fileSize: null,
        relativePath: "paper-archive/2026/box-01/passport.pdf",
      });
    },
  } as unknown as DocumentFilesService;
  const controller = new DocumentFilesController(service);

  const res = await controller.upload(req as never, {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    storageType: "local_server",
    relativePath: "paper-archive/2026/box-01/passport.pdf",
  });

  assert.ok(uploadInput);
  assert.equal(uploadInput.storageType, "local_server");
  assert.equal(
    uploadInput.relativePath,
    "paper-archive/2026/box-01/passport.pdf",
  );
  assert.equal(uploadInput.data, undefined);
  assert.equal(uploadInput.contentType, undefined);
  assert.equal(res.fileKey, "paper-archive/2026/box-01/passport.pdf");
});

void test("DocumentFilesController list parses query and validates requirementId", async () => {
  let calledQuery: Record<string, unknown> | undefined;
  const service = {
    list: (_ctx: unknown, query: Record<string, unknown>) => {
      calledQuery = query;
      return Promise.resolve({ items: [mockFile], total: 1 });
    },
  } as unknown as DocumentFilesService;
  const controller = new DocumentFilesController(service);

  await assert.rejects(
    () => controller.list({} as never, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.list(req as never, { requirementId: "bad" }),
    /Invalid requirementId/,
  );

  const res = await controller.list(req as never, {
    requirementId: REQUIREMENT_ID,
    page: "2",
    limit: "10",
  });
  assert.ok(calledQuery);
  assert.equal(res.total, 1);
  assert.equal(calledQuery.page, 2);
  assert.equal(calledQuery.limit, 10);
});

void test("DocumentFilesController get validates id and handles not found", async () => {
  const service = {
    get: (_ctx: unknown, id: string) =>
      Promise.resolve(id === FILE_ID ? mockFile : null),
  } as unknown as DocumentFilesService;
  const controller = new DocumentFilesController(service);

  await assert.rejects(
    () => controller.get({} as never, FILE_ID),
    UnauthorizedException,
  );
  await assert.rejects(() => controller.get(req as never, "bad"), /Invalid id/);
  await assert.rejects(
    () => controller.get(req as never, ORG_ID),
    /Document file not found/,
  );
  const res = await controller.get(req as never, FILE_ID);
  assert.equal(res.id, FILE_ID);
  assert.equal(res.fileKey, mockFile.fileUrl);
});

void test("DocumentFilesController review validates id and decision", async () => {
  let calledId = "";
  let calledDecision = "";
  const service = {
    review: (_ctx: unknown, id: string, input: { decision: string }) => {
      calledId = id;
      calledDecision = input.decision;
      return Promise.resolve({ ...mockFile, reviewStatus: "approved" });
    },
  } as unknown as DocumentFilesService;
  const controller = new DocumentFilesController(service);

  await assert.rejects(
    () => controller.review({} as never, FILE_ID, { decision: "approve" }),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.review(req as never, "bad", { decision: "approve" }),
    /Invalid id/,
  );
  await assert.rejects(
    () => controller.review(req as never, FILE_ID, { decision: "noop" }),
    /Invalid decision/,
  );

  const res = await controller.review(req as never, FILE_ID, {
    decision: "approve",
  });
  assert.equal(res.reviewStatus, "approved");
  assert.equal(res.fileKey, mockFile.fileUrl);
  assert.equal(calledId, FILE_ID);
  assert.equal(calledDecision, "approve");
});

void test("DocumentFilesController remove validates id", async () => {
  let removedId = "";
  const service = {
    remove: (_ctx: unknown, id: string) => {
      removedId = id;
      return Promise.resolve();
    },
  } as unknown as DocumentFilesService;
  const controller = new DocumentFilesController(service);

  await assert.rejects(
    () => controller.remove({} as never, FILE_ID),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.remove(req as never, "bad"),
    BadRequestException,
  );

  const res = await controller.remove(req as never, FILE_ID);
  assert.equal(res.ok, true);
  assert.equal(removedId, FILE_ID);
});
