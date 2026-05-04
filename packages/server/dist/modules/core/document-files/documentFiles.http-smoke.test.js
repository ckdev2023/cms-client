var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { CasesService } from "../cases/cases.service";
import { DocumentItemsService } from "../document-items/documentItems.service";
import { DocumentFilesController } from "./documentFiles.controller";
import { DocumentFilesService } from "./documentFiles.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const FILE_ID = "00000000-0000-4000-8000-000000000002";
const REQUIREMENT_ID = "00000000-0000-4000-8000-000000000010";
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
class TestCoreContextGuard {
  canActivate(context) {
    const req = context.switchToHttp().getRequest();
    req.requestContext = { orgId: ORG_ID, userId: USER_ID, role: "manager" };
    return true;
  }
}
let TestDocumentFilesModule = class TestDocumentFilesModule {
  _module = true;
};
TestDocumentFilesModule = __decorate(
  [
    Module({
      controllers: [DocumentFilesController],
      providers: [
        {
          provide: DocumentFilesService,
          useValue: {
            get: (_ctx, id) =>
              Promise.resolve(id === FILE_ID ? mockFile : null),
          },
        },
        {
          provide: DocumentItemsService,
          useValue: { get: () => Promise.resolve(null) },
        },
        {
          provide: CasesService,
          useValue: { get: () => Promise.resolve(null) },
        },
      ],
    }),
  ],
  TestDocumentFilesModule,
);
async function withApp(run) {
  const app = await NestFactory.create(TestDocumentFilesModule, {
    logger: false,
  });
  app.useGlobalGuards(new TestCoreContextGuard());
  await app.listen(0, "127.0.0.1");
  try {
    await run(await app.getUrl());
  } finally {
    await app.close();
  }
}
void test("DocumentFiles HTTP smoke: get returns fileUrl and fileKey aliases", async () => {
  await withApp(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/document-files/${FILE_ID}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, FILE_ID);
    assert.equal(body.fileUrl, mockFile.fileUrl);
    assert.equal(body.fileKey, mockFile.fileUrl);
  });
});
//# sourceMappingURL=documentFiles.http-smoke.test.js.map
