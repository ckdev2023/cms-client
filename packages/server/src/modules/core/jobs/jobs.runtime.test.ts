import test from "node:test";
import assert from "node:assert/strict";

import { computeRetryDelayMs, shouldRetry, toJobError } from "./jobs.runtime";

void test("computeRetryDelayMs uses staged backoff", () => {
  assert.equal(computeRetryDelayMs(1), 1_000);
  assert.equal(computeRetryDelayMs(2), 5_000);
  assert.equal(computeRetryDelayMs(3), 15_000);
  assert.equal(computeRetryDelayMs(4), 60_000);
  assert.equal(computeRetryDelayMs(5), 5 * 60_000);
});

void test("shouldRetry treats maxRetries as retries (total attempts = 1 + maxRetries)", () => {
  assert.equal(shouldRetry(1, 0), false);
  assert.equal(shouldRetry(1, 1), true);
  assert.equal(shouldRetry(2, 1), false);
  assert.equal(shouldRetry(3, 3), true);
  assert.equal(shouldRetry(4, 3), false);
});

void test("toJobError serializes Error/string/unknown", () => {
  const e = new Error("boom");
  const a = toJobError(e);
  assert.equal(a.message, "boom");

  const b = toJobError("x");
  assert.equal(b.message, "x");

  const c = toJobError({ a: 1 });
  assert.equal(c.message, "Unknown error");
});
