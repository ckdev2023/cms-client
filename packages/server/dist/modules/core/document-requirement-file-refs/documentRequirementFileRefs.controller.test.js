import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { DocumentRequirementFileRefsController } from "./documentRequirementFileRefs.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const REQ_ID = "00000000-0000-4000-8000-000000000010";
const FILE_ID = "00000000-0000-4000-8000-000000000020";
const REF_ID = "00000000-0000-4000-8000-000000000030";
const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff",
  },
};
const viewerReq = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "viewer",
  },
};
const mockItem = { id: REQ_ID, caseId: CASE_ID };
function makeCase(overrides = {}) {
  return {
    id: CASE_ID,
    orgId: ORG_ID,
    stage: "S5",
    status: "S5",
    ...overrides,
  };
}
const mockCase = makeCase();
const mockRef = {
  id: REF_ID,
  requirementId: REQ_ID,
  fileVersionId: FILE_ID,
  refMode: "cross_case_link",
  linkedFromRequirementId: null,
  createdBy: USER_ID,
  createdAt: "2026-01-01T00:00:00.000Z",
};
const mockCandidate = {
  fileId: FILE_ID,
  requirementId: REQ_ID,
  fileName: "passport.pdf",
  fileUrl: null,
  fileType: "application/pdf",
  fileSize: 12345,
  versionNo: 1,
  uploadedBy: USER_ID,
  uploadedAt: "2026-01-01T00:00:00Z",
  storageType: "local_server",
  relativePath: "cases/A/passport.pdf",
  reviewStatus: "approved",
  expiryDate: "2027-06-30",
  sourceCaseId: CASE_ID,
  sourceRequirementName: "パスポート",
  fileKey: "cases/A/passport.pdf",
};
function makeController(opts = {}) {
  const refsService = {
    link: () => Promise.resolve(mockRef),
    unlink: () => Promise.resolve(),
    get: () => Promise.resolve(mockRef),
    listByRequirement: () => Promise.resolve([mockRef]),
    listCandidates: () => Promise.resolve([mockCandidate]),
    ...opts.refsService,
  };
  const itemsService = {
    get: () => Promise.resolve(mockItem),
    ...opts.itemsService,
  };
  const casesService = {
    get: () => Promise.resolve(mockCase),
    ...opts.casesService,
  };
  return new DocumentRequirementFileRefsController(
    refsService,
    itemsService,
    casesService,
  );
}
// ── link: happy path ──
void test("link: forwards to service and returns ref", async () => {
  let calledInput;
  const controller = makeController({
    refsService: {
      link: (_ctx, input) => {
        calledInput = input;
        return Promise.resolve(mockRef);
      },
    },
  });
  const result = await controller.link(req, {
    requirementId: REQ_ID,
    fileVersionId: FILE_ID,
  });
  assert.equal(result.id, REF_ID);
  assert.equal(result.refMode, "cross_case_link");
  assert.ok(calledInput);
  assert.equal(calledInput.requirementId, REQ_ID);
  assert.equal(calledInput.fileVersionId, FILE_ID);
});
void test("link: passes linkedFromRequirementId", async () => {
  const LINKED_ID = "00000000-0000-4000-8000-000000000099";
  let calledInput;
  const controller = makeController({
    refsService: {
      link: (_ctx, input) => {
        calledInput = input;
        return Promise.resolve(mockRef);
      },
    },
  });
  await controller.link(req, {
    requirementId: REQ_ID,
    fileVersionId: FILE_ID,
    linkedFromRequirementId: LINKED_ID,
  });
  assert.ok(calledInput);
  assert.equal(calledInput.linkedFromRequirementId, LINKED_ID);
});
void test("link: throws UnauthorizedException without context", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.link(
        {},
        {
          requirementId: REQ_ID,
          fileVersionId: FILE_ID,
        },
      ),
    UnauthorizedException,
  );
});
void test("link: throws BadRequestException when requirementId missing", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.link(req, {
        fileVersionId: FILE_ID,
      }),
    BadRequestException,
  );
});
void test("link: throws BadRequestException when fileVersionId missing", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.link(req, {
        requirementId: REQ_ID,
      }),
    BadRequestException,
  );
});
void test("link: throws BadRequestException when requirementId is not a uuid", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.link(req, {
        requirementId: "not-a-uuid",
        fileVersionId: FILE_ID,
      }),
    BadRequestException,
  );
});
// ── link: S9 readonly guard ──
void test("link: throws BadRequestException when parent case is S9", async () => {
  let linkCalled = false;
  const controller = makeController({
    casesService: {
      get: () => Promise.resolve(makeCase({ stage: "S9", status: "S9" })),
    },
    refsService: {
      link: () => {
        linkCalled = true;
        return Promise.resolve(mockRef);
      },
    },
  });
  await assert.rejects(
    () =>
      controller.link(req, {
        requirementId: REQ_ID,
        fileVersionId: FILE_ID,
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(linkCalled, false);
});
void test("link: S9 guard checks status when stage is null", async () => {
  const controller = makeController({
    casesService: {
      get: () => Promise.resolve(makeCase({ stage: null, status: "S9" })),
    },
  });
  await assert.rejects(
    () =>
      controller.link(req, {
        requirementId: REQ_ID,
        fileVersionId: FILE_ID,
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
});
void test("link: throws NotFoundException when document item not found", async () => {
  const controller = makeController({
    itemsService: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () =>
      controller.link(req, {
        requirementId: REQ_ID,
        fileVersionId: FILE_ID,
      }),
    NotFoundException,
  );
});
void test("link: throws NotFoundException when parent case not found", async () => {
  const controller = makeController({
    casesService: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () =>
      controller.link(req, {
        requirementId: REQ_ID,
        fileVersionId: FILE_ID,
      }),
    NotFoundException,
  );
});
void test("link: succeeds when parent case is not S9", async () => {
  const controller = makeController({
    casesService: {
      get: () => Promise.resolve(makeCase({ stage: "S5", status: "S5" })),
    },
  });
  const result = await controller.link(req, {
    requirementId: REQ_ID,
    fileVersionId: FILE_ID,
  });
  assert.equal(result.id, REF_ID);
});
// ── list: refs mode ──
void test("list: returns refs by requirementId", async () => {
  let calledReqId;
  const controller = makeController({
    refsService: {
      listByRequirement: (_ctx, requirementId) => {
        calledReqId = requirementId;
        return Promise.resolve([mockRef]);
      },
    },
  });
  const result = await controller.list(viewerReq, {
    requirementId: REQ_ID,
  });
  assert.ok(Array.isArray(result));
  assert.equal(result.length, 1);
  assert.equal(calledReqId, REQ_ID);
});
// ── list: candidates mode ──
void test("list: returns candidates when candidates=true", async () => {
  let calledReqId;
  const controller = makeController({
    refsService: {
      listCandidates: (_ctx, requirementId) => {
        calledReqId = requirementId;
        return Promise.resolve([mockCandidate]);
      },
    },
  });
  const result = await controller.list(viewerReq, {
    requirementId: REQ_ID,
    candidates: "true",
  });
  assert.ok(Array.isArray(result));
  assert.equal(result.length, 1);
  assert.equal(calledReqId, REQ_ID);
});
void test("list: passes limit to listCandidates", async () => {
  let calledLimit;
  const controller = makeController({
    refsService: {
      listCandidates: (_ctx, _reqId, limit) => {
        calledLimit = limit;
        return Promise.resolve([]);
      },
    },
  });
  await controller.list(viewerReq, {
    requirementId: REQ_ID,
    candidates: "true",
    limit: "25",
  });
  assert.equal(calledLimit, 25);
});
void test("list: throws UnauthorizedException without context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list({}, { requirementId: REQ_ID }),
    UnauthorizedException,
  );
});
void test("list: throws BadRequestException when requirementId missing", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list(viewerReq, {}),
    BadRequestException,
  );
});
void test("list: throws BadRequestException when requirementId is not a uuid", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list(viewerReq, { requirementId: "not-a-uuid" }),
    BadRequestException,
  );
});
void test("list: throws BadRequestException when limit out of range", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.list(viewerReq, {
        requirementId: REQ_ID,
        candidates: "true",
        limit: "0",
      }),
    BadRequestException,
  );
});
// ── unlink: happy path ──
void test("unlink: returns ok:true on success", async () => {
  let unlinkCalledWith;
  const controller = makeController({
    refsService: {
      get: () => Promise.resolve(mockRef),
      unlink: (_ctx, refId) => {
        unlinkCalledWith = refId;
        return Promise.resolve();
      },
    },
  });
  const result = await controller.unlink(req, REF_ID);
  assert.deepEqual(result, { ok: true });
  assert.equal(unlinkCalledWith, REF_ID);
});
void test("unlink: throws UnauthorizedException without context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.unlink({}, REF_ID),
    UnauthorizedException,
  );
});
void test("unlink: throws NotFoundException when ref not found", async () => {
  const controller = makeController({
    refsService: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(() => controller.unlink(req, REF_ID), NotFoundException);
});
void test("unlink: throws BadRequestException when id is not a uuid", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.unlink(req, "not-a-uuid"),
    BadRequestException,
  );
});
// ── unlink: S9 readonly guard ──
void test("unlink: throws BadRequestException when parent case is S9", async () => {
  let unlinkCalled = false;
  const controller = makeController({
    casesService: {
      get: () => Promise.resolve(makeCase({ stage: "S9", status: "S9" })),
    },
    refsService: {
      get: () => Promise.resolve(mockRef),
      unlink: () => {
        unlinkCalled = true;
        return Promise.resolve();
      },
    },
  });
  await assert.rejects(
    () => controller.unlink(req, REF_ID),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(unlinkCalled, false);
});
void test("unlink: succeeds when parent case is not S9", async () => {
  const controller = makeController({
    casesService: {
      get: () => Promise.resolve(makeCase({ stage: "S5", status: "S5" })),
    },
  });
  const result = await controller.unlink(req, REF_ID);
  assert.deepEqual(result, { ok: true });
});
//# sourceMappingURL=documentRequirementFileRefs.controller.test.js.map
