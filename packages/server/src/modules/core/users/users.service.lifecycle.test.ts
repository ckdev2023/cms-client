import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";

import { UsersService } from "./users.service";
import {
  ACTOR_ID,
  TARGET_ID,
  createTestPool,
  makeUserDetailRow,
  managerCtx,
  ownerCtx,
  stubEffectivePermissions,
  stubTimeline,
} from "./users.service.testHelpers";

// ── updateUserRole ──

void describe("UsersService.updateUserRole", () => {
  void test("prevents changing own role", async () => {
    const { pool } = createTestPool(() => ({ rows: [] }));
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).updateUserRole(ownerCtx(), ACTOR_ID, {
          role: "manager",
        }),
      (err) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok((err as Error).message.includes("OWN_ROLE"));
        return true;
      },
    );
  });

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
    ).updateUserRole(ownerCtx(), TARGET_ID, { role: "manager" });
    assert.equal(result, null);
  });

  void test("manager cannot change owner role", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "owner", status: "active" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).updateUserRole(managerCtx(), TARGET_ID, { role: "staff" }),
      ForbiddenException,
    );
  });

  void test("manager cannot assign manager role", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "staff", status: "active" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).updateUserRole(managerCtx(), TARGET_ID, { role: "manager" }),
      UnprocessableEntityException,
    );
  });

  void test("blocks downgrade of last owner", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("count(*)") && sql.includes("r.code = 'owner'"))
        return { rows: [{ cnt: "1" }] };
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "owner", status: "active" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).updateUserRole(ownerCtx(), TARGET_ID, {
          role: "manager",
        }),
      (err) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok((err as Error).message.includes("LAST_OWNER"));
        return true;
      },
    );
  });

  void test("allows downgrade when multiple owners exist", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("count(*)") && sql.includes("r.code = 'owner'"))
        return { rows: [{ cnt: "2" }] };
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return {
          rows: [
            sql.includes("u.created_by")
              ? makeUserDetailRow({ role: "manager" })
              : { role: "owner", status: "active" },
          ],
        };
      if (sql.includes("UPDATE users SET role")) return { rows: [] };
      return { rows: [] };
    });
    const { service: timeline, entries } = stubTimeline();
    const result = await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).updateUserRole(ownerCtx(), TARGET_ID, { role: "manager" });
    assert.ok(result);
    const entry = entries[0] as {
      action: string;
      payload: { from: string; to: string };
    };
    assert.equal(entry.action, "user_role_changed");
    assert.equal(entry.payload.from, "owner");
    assert.equal(entry.payload.to, "manager");
  });

  void test("owner can change staff to viewer", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return {
          rows: [
            sql.includes("u.created_by")
              ? makeUserDetailRow({ role: "viewer" })
              : { role: "staff", status: "active" },
          ],
        };
      if (sql.includes("UPDATE users SET role")) return { rows: [] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();
    const result = await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).updateUserRole(ownerCtx(), TARGET_ID, { role: "viewer" });
    assert.ok(result);
  });
});

// ── disableUser ──

void describe("UsersService.disableUser", () => {
  void test("prevents disabling self", async () => {
    const { pool } = createTestPool(() => ({ rows: [] }));
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).disableUser(ownerCtx(), ACTOR_ID),
      (err) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok((err as Error).message.includes("DISABLE_SELF"));
        return true;
      },
    );
  });

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
    ).disableUser(ownerCtx(), TARGET_ID);
    assert.equal(result, null);
  });

  void test("manager cannot disable owner", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "owner", status: "active" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).disableUser(managerCtx(), TARGET_ID),
      ForbiddenException,
    );
  });

  void test("rejects already disabled user", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "staff", status: "disabled" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).disableUser(ownerCtx(), TARGET_ID),
      (err) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok((err as Error).message.includes("ALREADY_DISABLED"));
        return true;
      },
    );
  });

  void test("blocks disabling last owner", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("count(*)") && sql.includes("r.code = 'owner'"))
        return { rows: [{ cnt: "1" }] };
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "owner", status: "active" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).disableUser(ownerCtx(), TARGET_ID),
      (err) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok((err as Error).message.includes("LAST_OWNER"));
        return true;
      },
    );
  });

  void test("disables staff and writes timeline", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return {
          rows: [
            sql.includes("u.created_by")
              ? makeUserDetailRow({
                  status: "disabled",
                  disabled_at: "2026-05-01T00:00:00.000Z",
                })
              : { role: "staff", status: "active" },
          ],
        };
      if (sql.includes("UPDATE users")) return { rows: [] };
      return { rows: [] };
    });
    const { service: timeline, entries } = stubTimeline();
    const result = await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).disableUser(ownerCtx(), TARGET_ID);
    assert.ok(result);
    assert.equal((entries[0] as { action: string }).action, "user_disabled");
  });
});

// ── activateUser ──

void describe("UsersService.activateUser", () => {
  void test("returns null when target not found", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();
    assert.equal(
      await new UsersService(
        pool,
        timeline,
        stubEffectivePermissions(),
      ).activateUser(ownerCtx(), TARGET_ID),
      null,
    );
  });

  void test("rejects already active user", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "staff", status: "active" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).activateUser(ownerCtx(), TARGET_ID),
      (err) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok((err as Error).message.includes("ALREADY_ACTIVE"));
        return true;
      },
    );
  });

  void test("activates disabled user and writes timeline", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return {
          rows: [
            sql.includes("u.created_by")
              ? makeUserDetailRow({ status: "active" })
              : { role: "staff", status: "disabled" },
          ],
        };
      if (sql.includes("UPDATE users")) return { rows: [] };
      return { rows: [] };
    });
    const { service: timeline, entries } = stubTimeline();
    const result = await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).activateUser(ownerCtx(), TARGET_ID);
    assert.ok(result);
    assert.equal((entries[0] as { action: string }).action, "user_activated");
  });

  void test("manager cannot activate owner", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "owner", status: "disabled" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).activateUser(managerCtx(), TARGET_ID),
      ForbiddenException,
    );
  });
});

// ── resetPassword ──

void describe("UsersService.resetPassword", () => {
  void test("rejects when target not found", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).resetPassword(ownerCtx(), TARGET_ID),
      UnprocessableEntityException,
    );
  });

  void test("manager cannot reset owner password", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "owner", status: "active" }] };
      return { rows: [] };
    });
    const { service: timeline } = stubTimeline();

    await assert.rejects(
      () =>
        new UsersService(
          pool,
          timeline,
          stubEffectivePermissions(),
        ).resetPassword(managerCtx(), TARGET_ID),
      ForbiddenException,
    );
  });

  void test("returns temporary password and writes timeline", async () => {
    const { pool } = createTestPool((sql) => {
      if (sql.includes("FROM users u") && sql.includes("u.org_id"))
        return { rows: [{ role: "staff", status: "active" }] };
      if (sql.includes("UPDATE users")) return { rows: [] };
      return { rows: [] };
    });
    const { service: timeline, entries } = stubTimeline();
    const result = await new UsersService(
      pool,
      timeline,
      stubEffectivePermissions(),
    ).resetPassword(ownerCtx(), TARGET_ID);
    assert.ok(result.temporaryPassword.length > 0);
    assert.equal(
      (entries[0] as { action: string }).action,
      "user_password_reset",
    );
  });
});
