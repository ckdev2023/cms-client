import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(filename: string): string {
  return fs.readFileSync(path.resolve(import.meta.dirname, filename), "utf-8");
}

void test("upsert route requires FEATURE_FLAG_MANAGE permission (not SETTINGS_WRITE)", () => {
  const src = readSource("featureFlags.controller.ts");
  const upsertIdx = src.indexOf("async upsert(");
  assert.ok(upsertIdx > 0, "Controller must have an upsert method");

  const decoratorRegion = src.slice(Math.max(0, upsertIdx - 300), upsertIdx);
  assert.ok(
    decoratorRegion.includes(
      "@RequirePermission(PERMISSION_CODES.FEATURE_FLAG_MANAGE)",
    ),
    "upsert() must use @RequirePermission(PERMISSION_CODES.FEATURE_FLAG_MANAGE)",
  );
  assert.ok(
    !decoratorRegion.includes(
      "@RequirePermission(PERMISSION_CODES.SETTINGS_WRITE)",
    ),
    "upsert() must NOT use SETTINGS_WRITE — feature flags require dedicated permission",
  );
});

void test("list and resolve routes do not require FEATURE_FLAG_MANAGE (read-only)", () => {
  const src = readSource("featureFlags.controller.ts");

  const listIdx = src.indexOf("async list(");
  assert.ok(listIdx > 0, "Controller must have a list method");
  const listRegion = src.slice(Math.max(0, listIdx - 300), listIdx);
  assert.ok(
    !listRegion.includes(
      "@RequirePermission(PERMISSION_CODES.FEATURE_FLAG_MANAGE)",
    ),
    "list() should not require FEATURE_FLAG_MANAGE (read-only endpoint)",
  );

  const resolveIdx = src.indexOf("async resolve(");
  assert.ok(resolveIdx > 0, "Controller must have a resolve method");
  const resolveRegion = src.slice(Math.max(0, resolveIdx - 300), resolveIdx);
  assert.ok(
    !resolveRegion.includes(
      "@RequirePermission(PERMISSION_CODES.FEATURE_FLAG_MANAGE)",
    ),
    "resolve() should not require FEATURE_FLAG_MANAGE (read-only endpoint)",
  );
});

void test("controller imports PERMISSION_CODES from permissions.codes", () => {
  const src = readSource("featureFlags.controller.ts");
  assert.ok(
    src.includes("import { PERMISSION_CODES }") ||
      src.includes("import {PERMISSION_CODES}"),
    "Controller must import PERMISSION_CODES",
  );
  assert.ok(
    src.includes("permissions.codes"),
    "Import must come from permissions.codes module",
  );
});

void test("upsert throws UnauthorizedException when requestContext is missing", () => {
  const src = readSource("featureFlags.controller.ts");
  const upsertIdx = src.indexOf("async upsert(");
  const nextMethodIdx = src.indexOf("\n  async ", upsertIdx + 1);
  const upsertBody = src.slice(
    upsertIdx,
    nextMethodIdx === -1 ? undefined : nextMethodIdx,
  );
  assert.ok(
    upsertBody.includes("UnauthorizedException"),
    "upsert must throw UnauthorizedException when context is missing",
  );
});
