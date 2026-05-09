import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCUMENT_FILE_ERROR_CODES,
  DOCUMENT_FILE_REVIEW_STATUSES,
  DOCUMENT_ITEM_ALLOWED_TRANSITIONS,
  DOCUMENT_ITEM_ERROR_CODES,
  DOCUMENT_ITEM_OWNER_SIDES,
  DOCUMENT_ITEM_STATUSES,
  DOCUMENT_STORAGE_TYPES,
  LOCAL_STORAGE_TYPE,
} from "./documents.types";

void test("LOCAL_STORAGE_TYPE is 'local_server'", () => {
  assert.equal(LOCAL_STORAGE_TYPE, "local_server");
});

void test("DOCUMENT_STORAGE_TYPES contains only local_server for P0", () => {
  assert.deepEqual([...DOCUMENT_STORAGE_TYPES], ["local_server"]);
});

void test("DOCUMENT_ITEM_STATUSES has 8 values (7 active + deleted)", () => {
  assert.equal(DOCUMENT_ITEM_STATUSES.length, 8);
  for (const expected of [
    "pending",
    "waiting_upload",
    "uploaded_reviewing",
    "approved",
    "revision_required",
    "waived",
    "expired",
    "deleted",
  ] as const) {
    assert.ok(
      DOCUMENT_ITEM_STATUSES.includes(expected),
      `missing status: ${expected}`,
    );
  }
});

void test("DOCUMENT_ITEM_ALLOWED_TRANSITIONS covers all non-terminal active statuses (except waived)", () => {
  // P0 §3.2: `waived` 出度仅由 POST /:id/unwaive 提供（与 *→waived 已关闭对称），
  // 因此不在 DOCUMENT_ITEM_ALLOWED_TRANSITIONS 矩阵内。
  const activeStatuses = DOCUMENT_ITEM_STATUSES.filter(
    (s) => s !== "deleted" && s !== "waived",
  );
  for (const status of activeStatuses) {
    const transitions =
      DOCUMENT_ITEM_ALLOWED_TRANSITIONS[
        status as keyof typeof DOCUMENT_ITEM_ALLOWED_TRANSITIONS
      ];
    assert.ok(
      Array.isArray(transitions) && transitions.length > 0,
      `status '${status}' should have defined transitions`,
    );
  }
});

void test("'waived' status has no entry in ALLOWED_TRANSITIONS (unwaive uses dedicated endpoint)", () => {
  const transitions =
    DOCUMENT_ITEM_ALLOWED_TRANSITIONS[
      "waived" as keyof typeof DOCUMENT_ITEM_ALLOWED_TRANSITIONS
    ];
  assert.equal(
    transitions,
    undefined,
    "'waived' should NOT have transitions — exit is via POST /:id/unwaive only",
  );
});

void test("transition targets are all valid statuses", () => {
  const entries = Object.entries(DOCUMENT_ITEM_ALLOWED_TRANSITIONS) as [
    string,
    readonly string[],
  ][];
  for (const [from, targets] of entries) {
    for (const target of targets) {
      assert.ok(
        (DOCUMENT_ITEM_STATUSES as readonly string[]).includes(target),
        `'${from}' → '${target}': target must be a valid status`,
      );
    }
  }
});

void test("no status can transition to deleted (soft delete is a separate path)", () => {
  const entries = Object.entries(DOCUMENT_ITEM_ALLOWED_TRANSITIONS) as [
    string,
    readonly string[],
  ][];
  for (const [from, targets] of entries) {
    assert.ok(
      !targets.includes("deleted"),
      `'${from}' should not transition to 'deleted'`,
    );
  }
});

void test("no status can transition to waived via ALLOWED_TRANSITIONS (use dedicated waive endpoint)", () => {
  const entries = Object.entries(DOCUMENT_ITEM_ALLOWED_TRANSITIONS) as [
    string,
    readonly string[],
  ][];
  for (const [from, targets] of entries) {
    assert.ok(
      !targets.includes("waived"),
      `'${from}' should not transition to 'waived' — use POST /:id/waive instead`,
    );
  }
});

void test("DOCUMENT_FILE_REVIEW_STATUSES has 3 values", () => {
  assert.deepEqual(
    [...DOCUMENT_FILE_REVIEW_STATUSES],
    ["pending", "approved", "rejected"],
  );
});

void test("DOCUMENT_ITEM_OWNER_SIDES has 3 values", () => {
  assert.deepEqual(
    [...DOCUMENT_ITEM_OWNER_SIDES],
    ["applicant", "customer", "office"],
  );
});

void test("error codes are unique strings", () => {
  const itemCodes = Object.values(DOCUMENT_ITEM_ERROR_CODES);
  assert.equal(new Set(itemCodes).size, itemCodes.length, "item codes unique");

  const fileCodes = Object.values(DOCUMENT_FILE_ERROR_CODES);
  assert.equal(new Set(fileCodes).size, fileCodes.length, "file codes unique");

  const allCodes = [...itemCodes, ...fileCodes];
  assert.equal(new Set(allCodes).size, allCodes.length, "all codes unique");
});

void test("error codes follow DOCUMENT_ITEM_ / DOCUMENT_FILE_ prefix convention", () => {
  for (const code of Object.values(DOCUMENT_ITEM_ERROR_CODES)) {
    assert.match(code, /^DOCUMENT_ITEM_/);
  }
  for (const code of Object.values(DOCUMENT_FILE_ERROR_CODES)) {
    assert.match(code, /^DOCUMENT_FILE_/);
  }
});
