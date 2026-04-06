import test from "node:test";
import assert from "node:assert/strict";

import { loadEnv } from "./env";

void test("loadEnv requires DB_URL and REDIS_URL", () => {
  const prev = { ...process.env };
  try {
    delete process.env.DB_URL;
    delete process.env.REDIS_URL;

    assert.throws(() => loadEnv(), /Missing env: DB_URL/);

    process.env.DB_URL = "postgres://example";
    assert.throws(() => loadEnv(), /Missing env: REDIS_URL/);
  } finally {
    process.env = prev;
  }
});
