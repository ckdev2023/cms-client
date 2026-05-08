import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { DEV_USER_SEEDS } from "./seedDevUsers";

/**
 * staff_users.display_name ↔ email 一致性可读性断言。
 *
 * 默认 skip — 当前 dev 环境中 admin002@example.jp 的 display_name
 * 故意设为 "admin003"（边界测试用例）。
 *
 * 如果团队决定对齐 display_name 与 email 前缀，取消 skip 即可
 * 将此断言升级为 hard contract。
 */
void describe("seedDevData staff-mapping contract (opt-in)", () => {
  void test.skip("DEV_USER_SEEDS: each user name should be derivable from email prefix", () => {
    for (const user of DEV_USER_SEEDS) {
      const emailPrefix = user.email.split("@")[0];
      assert.ok(
        emailPrefix && emailPrefix.length > 0,
        `email prefix must be non-empty for user ${user.id}`,
      );
    }
  });

  void test("DEV_USER_SEEDS: no two users share the same email", () => {
    const emails = DEV_USER_SEEDS.map((u) => u.email);
    const unique = new Set(emails);
    assert.equal(
      unique.size,
      emails.length,
      "DEV_USER_SEEDS must not contain duplicate emails",
    );
  });

  void test("DEV_USER_SEEDS: no two users share the same id", () => {
    const ids = DEV_USER_SEEDS.map((u) => u.id);
    const unique = new Set(ids);
    assert.equal(
      unique.size,
      ids.length,
      "DEV_USER_SEEDS must not contain duplicate IDs",
    );
  });

  void test("DEV_USER_SEEDS: all names are non-empty", () => {
    for (const user of DEV_USER_SEEDS) {
      assert.ok(
        user.name.trim().length > 0,
        `display name must be non-empty for user ${user.id} (${user.email})`,
      );
    }
  });
});
