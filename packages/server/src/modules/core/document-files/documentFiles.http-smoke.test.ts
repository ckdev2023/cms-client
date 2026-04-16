import "reflect-metadata";

import test from "node:test";
import assert from "node:assert/strict";
import {
  Module,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

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

class TestCoreContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      requestContext?: { orgId: string; userId: string; role: "manager" };
    }>();
    req.requestContext = { orgId: ORG_ID, userId: USER_ID, role: "manager" };
    return true;
  }
}

@Module({
  controllers: [DocumentFilesController],
  providers: [
    {
      provide: DocumentFilesService,
      useValue: {
        get: (_ctx: unknown, id: string) =>
          Promise.resolve(id === FILE_ID ? mockFile : null),
      },
    },
  ],
})
class TestDocumentFilesModule {
  private readonly _module = true;
}

async function withApp(run: (baseUrl: string) => Promise<void>) {
  const app = await NestFactory.create<NestExpressApplication>(
    TestDocumentFilesModule,
    { logger: false },
  );
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

    const body = (await res.json()) as DocumentFile & { fileKey: string };
    assert.equal(body.id, FILE_ID);
    assert.equal(body.fileUrl, mockFile.fileUrl);
    assert.equal(body.fileKey, mockFile.fileUrl);
  });
});
