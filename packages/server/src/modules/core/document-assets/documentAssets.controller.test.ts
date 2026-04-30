import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { DocumentAssetsController } from "./documentAssets.controller";
import { DocumentAssetsService } from "./documentAssets.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ASSET_ID = "00000000-0000-4000-8000-000000000010";

const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "viewer" as const,
  },
};

const mockAsset = {
  id: ASSET_ID,
  orgId: ORG_ID,
  materialCode: "passport",
  ownerSubjectType: "customer",
  ownerCustomerId: "cust-1",
  ownerEmployerIdentityKey: null,
  originCaseId: "case-1",
  sourceRequirementId: null,
  activeFlag: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  latestVersionExpiryDate: "2027-12-31",
  referencedCaseCount: 2,
  isExpired: false,
};

import type { SharedExpiryRiskResult } from "./documentAssets.shared";

const mockRiskResult: SharedExpiryRiskResult = {
  assetId: ASSET_ID,
  latestVersionExpiryDate: "2020-01-01",
  riskStatus: "expired",
  daysUntilExpiry: -2000,
  suggestions: ["refresh_version", "waive", "replace_with_new_version"],
  affectedCases: [
    {
      caseId: "case-1",
      caseNo: "CASE-001",
      caseName: "Test Case",
      caseStatus: "active",
      requirementId: "req-1",
      requirementName: "Passport",
      requirementStatus: "approved",
    },
  ],
};

function makeController(
  opts: { service?: Partial<DocumentAssetsService> } = {},
): DocumentAssetsController {
  const service = {
    list: () => Promise.resolve({ items: [mockAsset], total: 1 }),
    get: () => Promise.resolve(mockAsset),
    getSharedExpiryRisk: () => Promise.resolve(mockRiskResult),
    ...opts.service,
  } as unknown as DocumentAssetsService;
  return new DocumentAssetsController(service);
}

// ── list: happy path ──

void test("list: returns items from service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [mockAsset], total: 1 });
      },
    },
  });

  const result = await controller.list(req as never, {});
  assert.equal(result.items.length, 1);
  assert.equal(result.total, 1);
  assert.ok(calledInput);
});

void test("list: passes query params to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    },
  });

  await controller.list(req as never, {
    caseId: "case-1",
    materialCode: "passport",
    ownerCustomerId: "cust-1",
    onlyExpired: "true",
    limit: "10",
  });

  assert.ok(calledInput);
  assert.equal(calledInput.caseId, "case-1");
  assert.equal(calledInput.materialCode, "passport");
  assert.equal(calledInput.ownerCustomerId, "cust-1");
  assert.equal(calledInput.onlyExpired, true);
  assert.equal(calledInput.limit, 10);
});

void test("list: throws UnauthorizedException without context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list({} as never, {}),
    UnauthorizedException,
  );
});

void test("list: omits undefined optional params", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    },
  });

  await controller.list(req as never, {});
  assert.ok(calledInput);
  assert.equal(calledInput.caseId, undefined);
  assert.equal(calledInput.materialCode, undefined);
  assert.equal(calledInput.ownerCustomerId, undefined);
  assert.equal(calledInput.onlyExpired, undefined);
  assert.equal(calledInput.limit, undefined);
});

void test("list: rejects non-string caseId", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list(req as never, { caseId: 123 }),
    BadRequestException,
  );
});

void test("list: rejects limit below 1", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list(req as never, { limit: "0" }),
    BadRequestException,
  );
});

void test("list: rejects limit above 200", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list(req as never, { limit: "201" }),
    BadRequestException,
  );
});

void test("list: rejects non-numeric limit", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list(req as never, { limit: "abc" }),
    BadRequestException,
  );
});

void test("list: parses onlyExpired='false' as false", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    },
  });

  await controller.list(req as never, { onlyExpired: "false" });
  assert.ok(calledInput);
  assert.equal(calledInput.onlyExpired, false);
});

// ── get: happy path ──

void test("get: returns asset by id", async () => {
  const controller = makeController();
  const result = await controller.get(req as never, ASSET_ID);
  assert.equal(result.id, ASSET_ID);
  assert.equal(result.materialCode, "passport");
});

void test("get: throws BadRequestException when asset not found", async () => {
  const controller = makeController({
    service: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () => controller.get(req as never, ASSET_ID),
    BadRequestException,
  );
});

void test("get: throws UnauthorizedException without context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.get({} as never, ASSET_ID),
    UnauthorizedException,
  );
});

// ── getSharedExpiryRisk: happy path ──

void test("getSharedExpiryRisk: returns risk data for asset", async () => {
  const controller = makeController();
  const result = await controller.getSharedExpiryRisk(req as never, ASSET_ID);
  assert.equal(result.assetId, ASSET_ID);
  assert.equal(result.riskStatus, "expired");
  assert.equal(result.affectedCases.length, 1);
});

void test("getSharedExpiryRisk: throws BadRequestException when asset not found", async () => {
  const controller = makeController({
    service: { getSharedExpiryRisk: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () => controller.getSharedExpiryRisk(req as never, ASSET_ID),
    BadRequestException,
  );
});

void test("getSharedExpiryRisk: throws UnauthorizedException without context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.getSharedExpiryRisk({} as never, ASSET_ID),
    UnauthorizedException,
  );
});

void test("getSharedExpiryRisk: forwards assetId to service", async () => {
  let calledId: string | undefined;
  const controller = makeController({
    service: {
      getSharedExpiryRisk: (_ctx: unknown, id: string) => {
        calledId = id;
        return Promise.resolve(mockRiskResult);
      },
    },
  });

  await controller.getSharedExpiryRisk(req as never, ASSET_ID);
  assert.equal(calledId, ASSET_ID);
});
