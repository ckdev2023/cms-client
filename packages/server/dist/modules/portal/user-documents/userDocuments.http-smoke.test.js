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
import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import { signAppUserJwt } from "../auth/appUserAuth.service";
import { UserDocumentsController } from "./userDocuments.controller";
import { UserDocumentsService } from "./userDocuments.service";
const APP_USER_ID = "00000000-0000-4000-8000-000000000001";
const DOC_ID = "00000000-0000-4000-8000-000000000010";
const TEST_SECRET = ["http", "smoke", "secret"].join("-");
const SIGNED_URL = "https://example.com/signed";
process.env.AUTH_JWT_SECRET = TEST_SECRET;
const mockDoc = {
  id: DOC_ID,
  appUserId: APP_USER_ID,
  orgId: null,
  leadId: null,
  caseId: null,
  fileKey: "user-docs/test.pdf",
  fileName: "test.pdf",
  docType: "general",
  status: "active",
  uploadedAt: "2026-01-01T00:00:00.000Z",
};
let TestUserDocumentsModule = class TestUserDocumentsModule {
  _module = true;
};
TestUserDocumentsModule = __decorate(
  [
    Module({
      controllers: [UserDocumentsController],
      providers: [
        AppUserAuthGuard,
        {
          provide: UserDocumentsService,
          useValue: {
            get: (id) => Promise.resolve(id === DOC_ID ? mockDoc : null),
            getDownloadUrl: () => Promise.resolve(SIGNED_URL),
          },
        },
      ],
    }),
  ],
  TestUserDocumentsModule,
);
async function withApp(run) {
  const app = await NestFactory.create(TestUserDocumentsModule, {
    logger: false,
  });
  await app.listen(0, "127.0.0.1");
  try {
    await run(await app.getUrl());
  } finally {
    await app.close();
  }
}
void test("UserDocuments HTTP smoke: authenticated download-url returns compatible response", async () => {
  await withApp(async (baseUrl) => {
    const token = signAppUserJwt(APP_USER_ID, TEST_SECRET);
    const res = await fetch(
      `${baseUrl}/user-documents/${DOC_ID}/download-url`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { url: SIGNED_URL, downloadUrl: SIGNED_URL });
  });
});
void test("UserDocuments HTTP smoke: missing authorization is rejected", async () => {
  await withApp(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/user-documents/${DOC_ID}/download-url`);
    assert.equal(res.status, 401);
  });
});
//# sourceMappingURL=userDocuments.http-smoke.test.js.map
