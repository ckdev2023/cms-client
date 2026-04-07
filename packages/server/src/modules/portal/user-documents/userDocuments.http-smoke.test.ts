import "reflect-metadata";

import test from "node:test";
import assert from "node:assert/strict";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppUserAuthGuard } from "../auth/appUserAuth.guard";
import { signAppUserJwt } from "../auth/appUserAuth.service";
import type { UserDocument } from "../model/portalEntities";
import { UserDocumentsController } from "./userDocuments.controller";
import { UserDocumentsService } from "./userDocuments.service";

const APP_USER_ID = "00000000-0000-4000-8000-000000000001";
const DOC_ID = "00000000-0000-4000-8000-000000000010";
const TEST_SECRET = ["http", "smoke", "secret"].join("-");
const SIGNED_URL = "https://example.com/signed";

process.env.AUTH_JWT_SECRET = TEST_SECRET;

const mockDoc: UserDocument = {
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

@Module({
  controllers: [UserDocumentsController],
  providers: [
    AppUserAuthGuard,
    {
      provide: UserDocumentsService,
      useValue: {
        get: (id: string) => Promise.resolve(id === DOC_ID ? mockDoc : null),
        getDownloadUrl: () => Promise.resolve(SIGNED_URL),
      },
    },
  ],
})
class TestUserDocumentsModule {
  private readonly _module = true;
}

async function withApp(run: (baseUrl: string) => Promise<void>) {
  const app = await NestFactory.create<NestExpressApplication>(
    TestUserDocumentsModule,
    { logger: false },
  );
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
    const body = (await res.json()) as { url: string; downloadUrl: string };
    assert.deepEqual(body, { url: SIGNED_URL, downloadUrl: SIGNED_URL });
  });
});

void test("UserDocuments HTTP smoke: missing authorization is rejected", async () => {
  await withApp(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/user-documents/${DOC_ID}/download-url`);
    assert.equal(res.status, 401);
  });
});
