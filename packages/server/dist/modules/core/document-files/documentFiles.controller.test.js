import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { DocumentFilesController } from "./documentFiles.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const FILE_ID = "00000000-0000-4000-8000-000000000002";
const REQUIREMENT_ID = "00000000-0000-4000-8000-000000000010";
const CASE_ID = "00000000-0000-4000-8000-000000000020";
const mockFile = {
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
  assetId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};
const mockDocumentItem = {
  id: REQUIREMENT_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  checklistItemCode: "doc_passport",
  name: "Passport",
  status: "pending",
  requiredFlag: true,
  requestedAt: null,
  receivedAt: null,
  reviewedAt: null,
  dueAt: null,
  ownerSide: "applicant",
  lastFollowUpAt: null,
  note: null,
  category: null,
  surveyData: null,
  waiveReasonLatest: null,
  waiveReasonCodeLatest: null,
  waivedByUserIdLatest: null,
  waivedAtLatest: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
function makeMockItemsService(item = mockDocumentItem) {
  return {
    get: () => Promise.resolve(item),
  };
}
function makeMockCasesService(stage = "S3") {
  return {
    get: () => Promise.resolve({ id: CASE_ID, stage, status: "active" }),
  };
}
const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "manager",
  },
};
void test("DocumentFilesController upload validates context and input", async () => {
  let uploadInput;
  const service = {
    upload: (_ctx, input) => {
      uploadInput = input;
      return Promise.resolve(mockFile);
    },
  };
  const controller = new DocumentFilesController(
    service,
    makeMockItemsService(),
    makeMockCasesService(),
  );
  await assert.rejects(() => controller.upload({}, {}), UnauthorizedException);
  await assert.rejects(
    () =>
      controller.upload(req, {
        requirementId: "bad",
        fileName: "a.pdf",
        data: "aGVsbG8=",
        contentType: "application/pdf",
      }),
    /Invalid requirementId/,
  );
  await assert.rejects(
    () =>
      controller.upload(req, {
        requirementId: REQUIREMENT_ID,
        fileName: "a.pdf",
        data: "not-base64***",
        contentType: "application/pdf",
      }),
    /Invalid data/,
  );
  await assert.rejects(
    () =>
      controller.upload(req, {
        requirementId: REQUIREMENT_ID,
        fileName: "a.pdf",
        data: Buffer.alloc(10 * 1024 * 1024 + 1, 1).toString("base64"),
        contentType: "application/pdf",
      }),
    /File too large \(max 10MB\)/,
  );
  await assert.rejects(
    () =>
      controller.upload(req, {
        requirementId: REQUIREMENT_ID,
        fileName: "a.pdf",
        data: "aGVsbG8=",
        contentType: "application/x-msdownload",
      }),
    /Invalid contentType/,
  );
  await assert.rejects(
    () =>
      controller.upload(req, {
        requirementId: REQUIREMENT_ID,
        fileName: "a.pdf",
        data: "aGVsbG8=",
        contentType: "application/pdf",
        expiryDate: "2026-02-30",
      }),
    /Invalid expiryDate/,
  );
  const res = await controller.upload(req, {
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
  assert.equal(uploadInput.data.toString(), "hello");
});
void test("DocumentFilesController upload supports local paper archive registration", async () => {
  let uploadInput;
  const service = {
    upload: (_ctx, input) => {
      uploadInput = input;
      return Promise.resolve({
        ...mockFile,
        fileUrl: null,
        fileType: null,
        fileSize: null,
        relativePath: "paper-archive/2026/box-01/passport.pdf",
      });
    },
  };
  const controller = new DocumentFilesController(
    service,
    makeMockItemsService(),
    makeMockCasesService(),
  );
  const res = await controller.upload(req, {
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
  let calledQuery;
  const service = {
    list: (_ctx, query) => {
      calledQuery = query;
      return Promise.resolve({ items: [mockFile], total: 1 });
    },
  };
  const controller = new DocumentFilesController(
    service,
    makeMockItemsService(),
    makeMockCasesService(),
  );
  await assert.rejects(() => controller.list({}, {}), UnauthorizedException);
  await assert.rejects(
    () => controller.list(req, { requirementId: "bad" }),
    /Invalid requirementId/,
  );
  const res = await controller.list(req, {
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
    get: (_ctx, id) => Promise.resolve(id === FILE_ID ? mockFile : null),
  };
  const controller = new DocumentFilesController(
    service,
    makeMockItemsService(),
    makeMockCasesService(),
  );
  await assert.rejects(
    () => controller.get({}, FILE_ID),
    UnauthorizedException,
  );
  await assert.rejects(() => controller.get(req, "bad"), /Invalid id/);
  await assert.rejects(
    () => controller.get(req, ORG_ID),
    /Document file not found/,
  );
  const res = await controller.get(req, FILE_ID);
  assert.equal(res.id, FILE_ID);
  assert.equal(res.fileKey, mockFile.fileUrl);
});
void test("DocumentFilesController review validates id and decision", async () => {
  let calledId = "";
  let calledDecision = "";
  const service = {
    review: (_ctx, id, input) => {
      calledId = id;
      calledDecision = input.decision;
      return Promise.resolve({ ...mockFile, reviewStatus: "approved" });
    },
  };
  const controller = new DocumentFilesController(
    service,
    makeMockItemsService(),
    makeMockCasesService(),
  );
  await assert.rejects(
    () => controller.review({}, FILE_ID, { decision: "approve" }),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.review(req, "bad", { decision: "approve" }),
    /Invalid id/,
  );
  await assert.rejects(
    () => controller.review(req, FILE_ID, { decision: "noop" }),
    /Invalid decision/,
  );
  const res = await controller.review(req, FILE_ID, {
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
    remove: (_ctx, id) => {
      removedId = id;
      return Promise.resolve();
    },
  };
  const controller = new DocumentFilesController(
    service,
    makeMockItemsService(),
    makeMockCasesService(),
  );
  await assert.rejects(
    () => controller.remove({}, FILE_ID),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.remove(req, "bad"),
    BadRequestException,
  );
  const res = await controller.remove(req, FILE_ID);
  assert.equal(res.ok, true);
  assert.equal(removedId, FILE_ID);
});
void test("DocumentFilesController upload rejects when parent case is S9 (readonly)", async () => {
  const service = {
    upload: () => Promise.resolve(mockFile),
  };
  const controller = new DocumentFilesController(
    service,
    makeMockItemsService(),
    makeMockCasesService("S9"),
  );
  await assert.rejects(
    () =>
      controller.upload(req, {
        requirementId: REQUIREMENT_ID,
        fileName: "passport.pdf",
        relativePath: "archive/passport.pdf",
      }),
    /CASE_S9_READONLY/,
  );
});
void test("DocumentFilesController upload allows when parent case is not S9", async () => {
  const service = {
    upload: () => Promise.resolve(mockFile),
  };
  const controller = new DocumentFilesController(
    service,
    makeMockItemsService(),
    makeMockCasesService("S3"),
  );
  const res = await controller.upload(req, {
    requirementId: REQUIREMENT_ID,
    fileName: "passport.pdf",
    relativePath: "archive/passport.pdf",
  });
  assert.equal(res.id, FILE_ID);
});
void test("DocumentFilesController upload rejects when requirement not found", async () => {
  const service = {
    upload: () => Promise.resolve(mockFile),
  };
  const controller = new DocumentFilesController(
    service,
    makeMockItemsService(null),
    makeMockCasesService(),
  );
  await assert.rejects(
    () =>
      controller.upload(req, {
        requirementId: REQUIREMENT_ID,
        fileName: "passport.pdf",
        relativePath: "archive/passport.pdf",
      }),
    /REQUIREMENT_NOT_FOUND/,
  );
});
//# sourceMappingURL=documentFiles.controller.test.js.map
