import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";

import { UsersService } from "./users.service";
import {
  NEW_USER_ID,
  TARGET_ID,
  createTestPool,
  makeUserDetailRow,
  managerCtx,
  ownerCtx,
  staffCtx,
  stubEffectivePermissions,
  stubTimeline,
} from "./users.service.testHelpers";

// ── listOrgUsers ──

void describe("UsersService.listOrgUsers", () => {
  void test("returns mapped user list", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("ORDER BY u.name")) {
        return {
          rows: [
            { id: "u1", name: "田中", role: "staff", status: "active" },
            { id: "u2", name: "鈴木", role: "owner", status: "active" },
          ],
        };
      }
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();
    const svc = new UsersService(pool, timeline, stubEffectivePermissions());

    const result = await svc.listOrgUsers(ownerCtx());
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].displayName, "田中");
    assert.equal(result.items[1].role, "owner");
  });
});

// ── createUser ──

void describe("UsersService.createUser", () => {
  void test("creates user and writes timeline", async () => {
    const { pool } = createTestPool((sql) => {
      if (
        sql.includes("SELECT id FROM users WHERE org_id") &&
        sql.includes("lower(email)")
      ) {
        return { rows: [] };
      }
      if (sql.includes("INSERT INTO users"))
        return { rows: [{ id: NEW_USER_ID }] };
      if (sql.includes("u.created_by")) {
        return { rows: [makeUserDetailRow({ id: NEW_USER_ID })] };
      }
      return { rows: [] };
    });
    const { service: timeline, entries } = stubTimeline();
    const svc = new UsersService(pool, timeline, stubEffectivePermissions());

    const result = await svc.createUser(ownerCtx(), {
      name: "新人",
      email: "new@example.com",
      role: "staff",
      initialPassword: "pw1",
    });
    assert.equal(result.id, NEW_USER_ID);
    assert.equal(entries.length, 1);
    const entry = entries[0] as { action: string; payload: { role: string } };
    assert.equal(entry.action, "user_created");
    assert.equal(entry.payload.role, "staff");
  });

  void test("rejects when manager tries to create owner", async () => {
    const { pool } = createTestPool(() => ({ rows: [] }));
    const { service: timeline } = stubTimeline();
    const svc = new UsersService(pool, timeline, stubEffectivePermissions());

    await assert.rejects(
      () =>
        svc.createUser(managerCtx(), {
          name: "X",
          email: "x@e.com",
          role: "owner",
          initialPassword: "pass",
        }),
      UnprocessableEntityException,
    );
  });

  void test("rejects when manager tries to create manager", async () => {
    const { pool } = createTestPool(() => ({ rows: [] }));
    const { service: timeline } = stubTimeline();
    const svc = new UsersService(pool, timeline, stubEffectivePermissions());

    await assert.rejects(
      () =>
        svc.createUser(managerCtx(), {
          name: "X",
          email: "x@e.com",
          role: "manager",
          initialPassword: "pass",
        }),
      UnprocessableEntityException,
    );
  });

  void test("manager can create staff", async () => {
    const { pool } = createTestPool((sql) => {
      if (
        sql.includes("SELECT id FROM users WHERE org_id") &&
        sql.includes("lower(email)")
      )
        return { rows: [] };
      if (sql.includes("INSERT INTO users"))
        return { rows: [{ id: NEW_USER_ID }] };
      if (sql.includes("u.created_by"))
        return { rows: [makeUserDetailRow({ id: NEW_USER_ID })] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();
    const result = await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).createUser(managerCtx(), {
      name: "X",
      email: "x@e.com",
      role: "staff",
      initialPassword: "pass",
    });
    assert.equal(result.id, NEW_USER_ID);
  });

  void test("rejects duplicate email", async () => {
    const { pool } = createTestPool((sql) => {
      if (
        sql.includes("SELECT id FROM users WHERE org_id") &&
        sql.includes("lower(email)")
      )
        return { rows: [{ id: "existing" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(pool, timeline, stubEffectivePermissions()).createUser(
          ownerCtx(),
          {
            name: "X",
            email: "dup@e.com",
            role: "staff",
            initialPassword: "pass",
          },
        ),
      (err) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok((err as Error).message.includes("DUPLICATE_EMAIL"));
        return true;
      },
    );
  });

  void test("links primary group when provided", async () => {
    const GROUP_ID = "00000000-0000-4000-8000-00000000000d";
    const queryCalls: string[] = [];
    const { pool } = createTestPool((sql) => {
      queryCalls.push(sql.trim());
      if (
        sql.includes("SELECT id FROM users WHERE org_id") &&
        sql.includes("lower(email)")
      )
        return { rows: [] };
      if (sql.includes("INSERT INTO users"))
        return { rows: [{ id: NEW_USER_ID }] };
      if (sql.includes("SELECT active_flag FROM groups"))
        return { rows: [{ active_flag: true }] };
      if (sql.includes("INSERT INTO user_group_memberships"))
        return { rows: [] };
      if (sql.includes("u.created_by"))
        return { rows: [makeUserDetailRow({ id: NEW_USER_ID })] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();
    await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).createUser(ownerCtx(), {
      name: "X",
      email: "x@e.com",
      role: "staff",
      initialPassword: "pass",
      primaryGroupId: GROUP_ID,
    });
    assert.ok(
      queryCalls.some((s) => s.includes("INSERT INTO user_group_memberships")),
    );
  });

  void test("staff cannot create user (blocked by canAssignRole)", async () => {
    const { pool } = createTestPool(() => ({ rows: [] }));
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(pool, timeline, stubEffectivePermissions()).createUser(
          staffCtx(),
          {
            name: "X",
            email: "x@e.com",
            role: "viewer",
            initialPassword: "pass",
          },
        ),
      UnprocessableEntityException,
    );
  });
});

// ── updateUser ──

void describe("UsersService.updateUser", () => {
  void test("returns null when target not found", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();
    const result = await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).updateUser(ownerCtx(), TARGET_ID, { name: "X" });
    assert.equal(result, null);
  });

  void test("manager cannot update owner info", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "owner", status: "active" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(pool, timeline, stubEffectivePermissions()).updateUser(
          managerCtx(),
          TARGET_ID,
          {
            name: "X",
          },
        ),
      ForbiddenException,
    );
  });

  void test("updates name and writes timeline", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return {
          rows: [
            sql.includes("u.created_by")
              ? makeUserDetailRow({ name: "新名前" })
              : { role: "staff", status: "active" },
          ],
        };
      if (sql.includes("UPDATE users SET")) return { rows: [] };
      return { rows: [] };
    });
    const { service: timeline, entries } = stubTimeline();
    const result = await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).updateUser(ownerCtx(), TARGET_ID, { name: "新名前" });
    assert.ok(result);
    assert.equal(entries.length, 1);
    const entry = entries[0] as { action: string; payload: { name: string } };
    assert.equal(entry.action, "user_updated");
    assert.equal(entry.payload.name, "新名前");
  });

  void test("returns unchanged user when no fields provided", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return {
          rows: [
            sql.includes("u.created_by")
              ? makeUserDetailRow()
              : { role: "staff", status: "active" },
          ],
        };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();
    const result = await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).updateUser(ownerCtx(), TARGET_ID, {});
    assert.ok(result);
  });

  void test("rejects duplicate email on update", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "staff", status: "active" }] };
      if (sql.includes("UPDATE users SET")) {
        throw Object.assign(new Error("unique violation"), {
          code: "23505",
          constraint: "uq_users_org_email",
        });
      }
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(pool, timeline, stubEffectivePermissions()).updateUser(
          ownerCtx(),
          TARGET_ID,
          {
            email: "dup@e.com",
          },
        ),
      (err) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok((err as Error).message.includes("DUPLICATE_EMAIL"));
        return true;
      },
    );
  });
});
