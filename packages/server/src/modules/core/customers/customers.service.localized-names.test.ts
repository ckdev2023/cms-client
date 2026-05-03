import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import { CustomersService } from "./customers.service";
import type { RequestContext } from "../tenancy/requestContext";

function createCustomersService(
  pool: Pool,
  timelineService: { write?: (...args: unknown[]) => Promise<void> } = {
    write: () => Promise.resolve(),
  },
): CustomersService {
  return new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    } as unknown as PermissionsService,
    timelineService as never,
    { create: () => Promise.resolve({}) } as never,
  );
}

const ctx: RequestContext = {
  orgId: "00000000-0000-4000-8000-000000000000",
  userId: "00000000-0000-4000-8000-000000000001",
  role: "staff",
};

function makePoolClient(insertedProfile?: Record<string, unknown>) {
  let capturedProfile: Record<string, unknown> | undefined;

  const client = {
    query: (sql: string, params?: unknown[]) => {
      if (sql.includes("coalesce(max(substring")) {
        return Promise.resolve({ rows: [{ max_seq: "1" }] });
      }
      if (sql.includes("insert into customers")) {
        const insertParams = params as [string, string, string, string];
        capturedProfile = JSON.parse(insertParams[2]) as Record<
          string,
          unknown
        >;
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: ctx.orgId,
              type: "individual",
              base_profile: capturedProfile,
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      if (
        sql.includes("id = $1") &&
        !sql.includes("update customers") &&
        !sql.includes("select exists")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: ctx.orgId,
              type: "individual",
              base_profile: insertedProfile ?? { name_cn: "旧名前" },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      if (sql.includes("update customers")) {
        const updateParams = params as [string, string, string, string];
        capturedProfile = JSON.parse(updateParams[2]) as Record<
          string,
          unknown
        >;
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: ctx.orgId,
              type: "individual",
              base_profile: capturedProfile,
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool = { connect: () => Promise.resolve(client) };

  return {
    pool: pool as unknown as Pool,
    getCapturedProfile: () => {
      assert.ok(capturedProfile, "profile should have been captured");
      return capturedProfile;
    },
  };
}

void test("create merges localizedNames into baseProfile", async () => {
  const { pool, getCapturedProfile } = makePoolClient();
  const service = createCustomersService(pool);

  await service.create(ctx, {
    type: "individual",
    baseProfile: { gender: "male" },
    localizedNames: { zh: "张三", ja: "チョウサン", en: "Zhang San" },
  });

  const profile = getCapturedProfile();
  assert.equal(profile.name_cn, "张三");
  assert.equal(profile.name_jp, "チョウサン");
  assert.equal(profile.name_en, "Zhang San");
  assert.equal(profile.gender, "male");
});

void test("create with localizedNames.defaultLocale persists to baseProfile", async () => {
  const { pool, getCapturedProfile } = makePoolClient();
  const service = createCustomersService(pool);

  await service.create(ctx, {
    type: "individual",
    baseProfile: {},
    localizedNames: { zh: "李四", defaultLocale: "zh" },
  });

  const profile = getCapturedProfile();
  assert.equal(profile.name_cn, "李四");
  assert.equal(profile.name_default_locale, "zh");
});

void test("create without localizedNames leaves baseProfile unchanged", async () => {
  const { pool, getCapturedProfile } = makePoolClient();
  const service = createCustomersService(pool);

  await service.create(ctx, {
    type: "individual",
    baseProfile: { name_cn: "王五" },
  });

  const profile = getCapturedProfile();
  assert.equal(profile.name_cn, "王五");
  assert.equal(profile.name_jp, undefined);
});

void test("update merges localizedNames over existing baseProfile names", async () => {
  const existingProfile = {
    name_cn: "旧中文名",
    name_jp: "旧日文名",
    name_en: "OldEn",
  };
  const { pool, getCapturedProfile } = makePoolClient(existingProfile);
  const service = createCustomersService(pool);

  await service.update(ctx, "c1", {
    localizedNames: { zh: "新中文名", en: "NewEn" },
  });

  const profile = getCapturedProfile();
  assert.equal(profile.name_cn, "新中文名");
  assert.equal(profile.name_jp, "旧日文名");
  assert.equal(profile.name_en, "NewEn");
});

void test("update with null localizedNames field clears the name", async () => {
  const existingProfile = {
    name_cn: "中文名",
    name_jp: "日文名",
    name_en: "EnName",
  };
  const { pool, getCapturedProfile } = makePoolClient(existingProfile);
  const service = createCustomersService(pool);

  await service.update(ctx, "c1", {
    localizedNames: { ja: null },
    baseProfile: { name_cn: "中文名", name_en: "EnName" },
  });

  const profile = getCapturedProfile();
  assert.equal(profile.name_cn, "中文名");
  assert.equal(profile.name_jp, undefined);
  assert.equal(profile.name_en, "EnName");
});
