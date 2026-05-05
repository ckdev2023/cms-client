import test from "node:test";
import assert from "node:assert/strict";
import { ParseUUIDPipe } from "@nestjs/common";

const pipe = new ParseUUIDPipe();

const VALID_UUID_V4 = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const VALID_UUID_V1 = "f47ac10b-58cc-11e1-b86c-0800200c9a66";
const VALID_UUID_V3 = "a3bb189e-8bf9-3888-9912-ace4e6543002";
const VALID_UUID_V5 = "886313e1-3b8a-5372-9b90-0c9aee199e5d";

const paramMeta = { type: "param" as const, metatype: String, data: "id" };

// ---------------------------------------------------------------------------
// ParseUUIDPipe — rejects non-UUID → 400
// ---------------------------------------------------------------------------

void test("ParseUUIDPipe rejects plain string", async () => {
  await assert.rejects(
    () => pipe.transform("not-a-uuid", paramMeta),
    (err: Error) => {
      assert.ok("getStatus" in err);
      assert.equal((err as { getStatus(): number }).getStatus(), 400);
      return true;
    },
  );
});

void test("ParseUUIDPipe rejects numeric string", async () => {
  await assert.rejects(
    () => pipe.transform("12345", paramMeta),
    (err: Error) => {
      assert.ok("getStatus" in err);
      assert.equal((err as { getStatus(): number }).getStatus(), 400);
      return true;
    },
  );
});

void test("ParseUUIDPipe rejects empty string", async () => {
  await assert.rejects(
    () => pipe.transform("", paramMeta),
    (err: Error) => {
      assert.ok("getStatus" in err);
      assert.equal((err as { getStatus(): number }).getStatus(), 400);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// ParseUUIDPipe — accepts any well-formed UUID regardless of version
// ---------------------------------------------------------------------------

void test("ParseUUIDPipe accepts valid v4 UUID", async () => {
  const result = await pipe.transform(VALID_UUID_V4, paramMeta);
  assert.equal(result, VALID_UUID_V4);
});

void test("ParseUUIDPipe accepts nil UUID (version 0)", async () => {
  const result = await pipe.transform(NIL_UUID, paramMeta);
  assert.equal(result, NIL_UUID);
});

void test("ParseUUIDPipe accepts v1 UUID", async () => {
  const result = await pipe.transform(VALID_UUID_V1, paramMeta);
  assert.equal(result, VALID_UUID_V1);
});

void test("ParseUUIDPipe accepts v3 UUID", async () => {
  const result = await pipe.transform(VALID_UUID_V3, paramMeta);
  assert.equal(result, VALID_UUID_V3);
});

void test("ParseUUIDPipe accepts v5 UUID", async () => {
  const result = await pipe.transform(VALID_UUID_V5, paramMeta);
  assert.equal(result, VALID_UUID_V5);
});
