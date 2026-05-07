import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ForbiddenException } from "@nestjs/common";

import {
  mapOrgUserRow,
  mapUserDetailRow,
  generateTemporaryPassword,
  assertCanManage,
  isDuplicateEmailConstraint,
  type OrgUserRow,
  type UserDetailRow,
} from "./users.internal";

void describe("mapOrgUserRow", () => {
  void test("maps DB row to OrgUserDto with email and timestamps", () => {
    const row: OrgUserRow = {
      id: "u1",
      name: "田中太郎",
      email: "tanaka@example.com",
      role: "staff",
      role_id: "r1",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      disabled_at: null,
    };
    assert.deepEqual(mapOrgUserRow(row), {
      id: "u1",
      displayName: "田中太郎",
      email: "tanaka@example.com",
      role: "staff",
      roleId: "r1",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      disabledAt: null,
    });
  });

  void test("maps disabled_at Date to string", () => {
    const row: OrgUserRow = {
      id: "u2",
      name: "鈴木",
      email: "suzuki@example.com",
      role: "owner",
      role_id: "r2",
      status: "disabled",
      created_at: new Date("2026-02-01T00:00:00.000Z"),
      disabled_at: new Date("2026-03-01T00:00:00.000Z"),
    };
    const dto = mapOrgUserRow(row);
    assert.equal(dto.createdAt, "2026-02-01T00:00:00.000Z");
    assert.equal(dto.disabledAt, "2026-03-01T00:00:00.000Z");
  });
});

void describe("mapUserDetailRow", () => {
  void test("maps DB row with Date timestamps", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-02-01T00:00:00.000Z");
    const disabledAt = new Date("2026-03-01T00:00:00.000Z");
    const passwordSetAt = new Date("2026-01-15T00:00:00.000Z");

    const row: UserDetailRow = {
      id: "u1",
      name: "田中太郎",
      email: "tanaka@example.com",
      role: "staff",
      role_id: "r1",
      status: "active",
      created_by: "u0",
      disabled_at: disabledAt,
      password_set_at: passwordSetAt,
      created_at: createdAt,
      updated_at: updatedAt,
    };

    const dto = mapUserDetailRow(row);
    assert.equal(dto.id, "u1");
    assert.equal(dto.name, "田中太郎");
    assert.equal(dto.email, "tanaka@example.com");
    assert.equal(dto.role, "staff");
    assert.equal(dto.roleId, "r1");
    assert.equal(dto.status, "active");
    assert.equal(dto.createdBy, "u0");
    assert.equal(dto.disabledAt, "2026-03-01T00:00:00.000Z");
    assert.equal(dto.passwordSetAt, "2026-01-15T00:00:00.000Z");
    assert.equal(dto.createdAt, "2026-01-01T00:00:00.000Z");
    assert.equal(dto.updatedAt, "2026-02-01T00:00:00.000Z");
  });

  void test("maps nullable timestamps to null", () => {
    const row: UserDetailRow = {
      id: "u1",
      name: "田中太郎",
      email: "tanaka@example.com",
      role: "owner",
      role_id: "r1",
      status: "active",
      created_by: null,
      disabled_at: null,
      password_set_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const dto = mapUserDetailRow(row);
    assert.equal(dto.createdBy, null);
    assert.equal(dto.disabledAt, null);
    assert.equal(dto.passwordSetAt, null);
  });

  void test("maps string timestamps as passthrough", () => {
    const row: UserDetailRow = {
      id: "u1",
      name: "A",
      email: "a@b.com",
      role: "viewer",
      role_id: "r1",
      status: "disabled",
      created_by: null,
      disabled_at: "2026-05-01T00:00:00.000Z",
      password_set_at: "2026-04-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-02-01T00:00:00.000Z",
    };

    const dto = mapUserDetailRow(row);
    assert.equal(dto.disabledAt, "2026-05-01T00:00:00.000Z");
    assert.equal(dto.passwordSetAt, "2026-04-01T00:00:00.000Z");
  });

  void test("throws on missing required timestamps", () => {
    const row: UserDetailRow = {
      id: "u1",
      name: "A",
      email: "a@b.com",
      role: "staff",
      role_id: "r1",
      status: "active",
      created_by: null,
      disabled_at: null,
      password_set_at: null,
      created_at: null,
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    assert.throws(
      () => mapUserDetailRow(row),
      (err: Error) => {
        assert.match(err.message, /Invalid timestamp.*created_at/);
        return true;
      },
    );
  });
});

void describe("generateTemporaryPassword", () => {
  void test("returns a non-empty base64url string", () => {
    const pw = generateTemporaryPassword();
    assert.ok(pw.length > 0);
    assert.ok(/^[A-Za-z0-9_-]+$/.test(pw), "should be base64url");
  });

  void test("generates unique values", () => {
    const set = new Set<string>();
    for (let i = 0; i < 20; i++) {
      set.add(generateTemporaryPassword());
    }
    assert.equal(set.size, 20);
  });
});

void describe("assertCanManage", () => {
  void test("does not throw when owner manages staff", () => {
    assert.doesNotThrow(() => {
      assertCanManage("owner", "staff");
    });
  });

  void test("does not throw when manager manages viewer", () => {
    assert.doesNotThrow(() => {
      assertCanManage("manager", "viewer");
    });
  });

  void test("throws ForbiddenException when manager tries to manage owner", () => {
    assert.throws(
      () => {
        assertCanManage("manager", "owner");
      },
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });

  void test("throws ForbiddenException when staff tries to manage anyone", () => {
    assert.throws(
      () => {
        assertCanManage("staff", "viewer");
      },
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });

  void test("throws ForbiddenException when viewer tries to manage anyone", () => {
    assert.throws(
      () => {
        assertCanManage("viewer", "staff");
      },
      (err) => {
        assert.ok(err instanceof ForbiddenException);
        return true;
      },
    );
  });
});

void describe("isDuplicateEmailConstraint", () => {
  void test("returns true for PG unique violation on email", () => {
    assert.equal(
      isDuplicateEmailConstraint({
        code: "23505",
        constraint: "uq_users_email",
      }),
      true,
    );
  });

  void test("returns false for non-23505 code", () => {
    assert.equal(
      isDuplicateEmailConstraint({
        code: "42000",
        constraint: "uq_users_email",
      }),
      false,
    );
  });

  void test("returns false for non-email constraint", () => {
    assert.equal(
      isDuplicateEmailConstraint({
        code: "23505",
        constraint: "uq_users_name",
      }),
      false,
    );
  });

  void test("returns false for null input", () => {
    assert.equal(isDuplicateEmailConstraint(null), false);
  });

  void test("returns false for non-object input", () => {
    assert.equal(isDuplicateEmailConstraint("error"), false);
  });

  void test("returns false for missing constraint", () => {
    assert.equal(isDuplicateEmailConstraint({ code: "23505" }), false);
  });
});
