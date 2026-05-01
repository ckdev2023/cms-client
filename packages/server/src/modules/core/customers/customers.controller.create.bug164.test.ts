import test from "node:test";
import assert from "node:assert/strict";

import { FeatureFlagsService } from "../../feature-flags/featureFlags.service";
import { PermissionsService } from "../auth/permissions.service";
import type { Customer } from "../model/coreEntities";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { mapCustomerToCreateResponseDto } from "./customers.dto-mappers.create";

const mockFeatureFlags = {
  resolve: () => Promise.resolve({ key: "bmv", enabled: true, used: true }),
} as unknown as FeatureFlagsService;

function makePermissions(): PermissionsService {
  return {
    canAccessCustomer: () => true,
    canEditCustomer: () => true,
  } as unknown as PermissionsService;
}

const createdCustomer: Customer = {
  id: "00000000-0000-4000-8000-00000000bug1",
  orgId: "00000000-0000-4000-8000-000000000000",
  type: "individual",
  baseProfile: {
    name_cn: "測試客戶",
    displayName: "測試客戶",
    legalName: "Test Customer",
    customerNumber: "CUS-202604-0007",
    phone: "090-1234-5678",
    email: "probe@example.com",
    group: "tokyo-1",
    owner: { name: "Local Admin", initials: "LA" },
  },
  contacts: [],
  createdAt: "2026-04-30T00:00:00.000Z",
  updatedAt: "2026-04-30T00:00:00.000Z",
};

void test("BUG-164: POST /api/customers response 顶层暴露 customerNumber", async () => {
  const service = {
    create: () => Promise.resolve(createdCustomer),
  } as unknown as CustomersService;

  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );

  const req = {
    requestContext: {
      orgId: createdCustomer.orgId,
      userId: "00000000-0000-4000-8000-000000000011",
      role: "staff",
    },
  };

  const res = (await controller.create(req as never, {
    type: "individual",
    baseProfile: { name_cn: "測試客戶" },
  })) as unknown as Record<string, unknown>;

  assert.equal(res.id, createdCustomer.id);
  assert.equal(
    res.customerNumber,
    "CUS-202604-0007",
    "POST 返回体顶层必须暴露 customerNumber，与 GET /api/customers 对齐",
  );
});

void test("BUG-164: POST /api/customers response 与 GET 共用顶层字段集合", async () => {
  const service = {
    create: () => Promise.resolve(createdCustomer),
  } as unknown as CustomersService;
  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );
  const req = {
    requestContext: {
      orgId: createdCustomer.orgId,
      userId: "00000000-0000-4000-8000-000000000011",
      role: "staff",
    },
  };

  const res = (await controller.create(req as never, {
    type: "individual",
    baseProfile: { name_cn: "測試客戶" },
  })) as unknown as Record<string, unknown>;

  for (const key of [
    "id",
    "displayName",
    "legalName",
    "customerNumber",
    "phone",
    "email",
    "group",
    "owner",
    "bmvProfile",
  ]) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(res, key),
      `POST 返回体必须包含顶层字段 ${key}`,
    );
  }
});

void test("BUG-164: POST 返回体保留 baseProfile.customerNumber 以维持双写过渡", async () => {
  const service = {
    create: () => Promise.resolve(createdCustomer),
  } as unknown as CustomersService;
  const controller = new CustomersController(
    service,
    makePermissions(),
    mockFeatureFlags,
  );
  const req = {
    requestContext: {
      orgId: createdCustomer.orgId,
      userId: "00000000-0000-4000-8000-000000000011",
      role: "staff",
    },
  };

  const res = (await controller.create(req as never, {
    type: "individual",
    baseProfile: { name_cn: "測試客戶" },
  })) as unknown as Record<string, unknown>;

  const baseProfile = res.baseProfile as Record<string, unknown> | undefined;
  assert.ok(baseProfile, "POST 返回体必须保留 baseProfile 字段");
  assert.equal(
    baseProfile.customerNumber,
    res.customerNumber,
    "顶层 customerNumber 必须与 baseProfile.customerNumber 一致（双写过渡）",
  );
});

void test("BUG-164: mapCustomerToCreateResponseDto 同时输出顶层 DTO 字段与原始实体字段", () => {
  const dto = mapCustomerToCreateResponseDto(createdCustomer);

  assert.equal(dto.id, createdCustomer.id);
  assert.equal(dto.customerNumber, "CUS-202604-0007");
  assert.equal(dto.displayName, "測試客戶");
  assert.equal(dto.legalName, "Test Customer");
  assert.equal(dto.phone, "090-1234-5678");
  assert.equal(dto.email, "probe@example.com");
  assert.equal(dto.group, "tokyo-1");
  assert.equal(dto.owner.name, "Local Admin");
  assert.equal(dto.bmvProfile.intakeStatus, "not_started");

  assert.equal(dto.orgId, createdCustomer.orgId);
  assert.equal(dto.type, createdCustomer.type);
  assert.equal(dto.createdAt, createdCustomer.createdAt);
  assert.equal(dto.updatedAt, createdCustomer.updatedAt);
  assert.deepEqual(dto.contacts, createdCustomer.contacts);
  assert.equal(
    dto.baseProfile.customerNumber,
    "CUS-202604-0007",
    "baseProfile 透传保证存量消费方读取路径不破",
  );
});
