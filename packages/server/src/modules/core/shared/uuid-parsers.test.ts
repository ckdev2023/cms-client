import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";

import { optUuid, reqUuid } from "./uuid-parsers";

void describe("optUuid", () => {
  void test("returns undefined for undefined input", () => {
    assert.equal(optUuid(undefined, "f"), undefined);
  });

  void test("returns undefined for empty string", () => {
    assert.equal(optUuid("", "f"), undefined);
  });

  void test("returns undefined for whitespace-only string", () => {
    assert.equal(optUuid("   ", "f"), undefined);
  });

  void test("returns valid UUID v4 as-is", () => {
    const uuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
    assert.equal(optUuid(uuid, "f"), uuid);
  });

  void test("returns valid UUID with uppercase", () => {
    const uuid = "A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D";
    assert.equal(optUuid(uuid, "f"), uuid);
  });

  void test("trims whitespace from valid UUID", () => {
    const uuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
    assert.equal(optUuid(`  ${uuid}  `, "f"), uuid);
  });

  void test("throws BadRequestException for non-UUID string", () => {
    assert.throws(
      () => optUuid("not-a-uuid", "myField"),
      (err: unknown) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(
          err.message.includes("myField"),
          "Error message must mention field name",
        );
        return true;
      },
    );
  });

  void test("throws BadRequestException for partial UUID", () => {
    assert.throws(
      () => optUuid("a1b2c3d4-e5f6-4a7b", "f"),
      BadRequestException,
    );
  });

  void test("throws BadRequestException for non-string input", () => {
    assert.throws(() => optUuid(123, "f"), BadRequestException);
  });

  void test("throws BadRequestException for UUID without dashes", () => {
    assert.throws(
      () => optUuid("a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d", "f"),
      BadRequestException,
    );
  });
});

void describe("reqUuid", () => {
  void test("returns valid UUID as-is", () => {
    const uuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
    assert.equal(reqUuid(uuid, "f"), uuid);
  });

  void test("trims whitespace from valid UUID", () => {
    const uuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
    assert.equal(reqUuid(`  ${uuid}  `, "f"), uuid);
  });

  void test("throws BadRequestException for undefined input", () => {
    assert.throws(
      () => reqUuid(undefined, "myField"),
      (err: unknown) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(
          err.message.includes("myField"),
          "Error message must mention field name",
        );
        return true;
      },
    );
  });

  void test("throws BadRequestException for empty string", () => {
    assert.throws(() => reqUuid("", "f"), BadRequestException);
  });

  void test("throws BadRequestException for whitespace-only string", () => {
    assert.throws(() => reqUuid("   ", "f"), BadRequestException);
  });

  void test("throws BadRequestException for catalog short-code (R2-A-1)", () => {
    assert.throws(
      () => reqUuid("suzuki", "ownerUserId"),
      (err: unknown) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(
          err.message.includes("ownerUserId"),
          "Error must mention field for client debugging",
        );
        return true;
      },
    );
  });

  void test("throws BadRequestException for non-string input", () => {
    assert.throws(() => reqUuid(123, "f"), BadRequestException);
  });
});
