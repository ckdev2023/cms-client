import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  WALKTHROUGH_TAG_PATTERN,
  sanitizeWalkthroughTags,
} from "./seedDevData";

void test("sanitizeWalkthroughTags strips R<digit>- / R<digit>_ / test- / mcp- / tmp- patterns", () => {
  const cases: [string[], string[]][] = [
    [
      ["R4-walk", "R4-tag-2", "VIP", "優先"],
      ["VIP", "優先"],
    ],
    [["r3-foo", "面談済"], ["面談済"]],
    [["TEST-baz", "test_qux", "MCP-hello", "tmp-x", "TMP_y"], []],
    [["R12-edge", "R0-alpha"], []],
    [
      ["R-no-digit", "Rapid-development", "RC1-keep", "RR1-foo"],
      ["R-no-digit", "Rapid-development", "RC1-keep", "RR1-foo"],
    ],
    [
      ["紹介", "面談予定", "急ぎ"],
      ["紹介", "面談予定", "急ぎ"],
    ],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(sanitizeWalkthroughTags(input), expected, input.join(","));
  }
});

void test("WALKTHROUGH_TAG_PATTERN is consistent with the SQL clause used in seedTagsCleanup", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevData.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.ok(
    source.includes("^(R[0-9]+|test|mcp|tmp)[-_]"),
    "SQL must use the same regex shape as WALKTHROUGH_TAG_PATTERN (POSIX form)",
  );
  assert.ok(
    source.includes("!~*") && /\s~\*/.test(source),
    "SQL must use case-insensitive POSIX regex operators (~* / !~*) for parity",
  );
  assert.ok(
    WALKTHROUGH_TAG_PATTERN.flags.includes("i"),
    "JS regex must be case-insensitive to match SQL ~* semantics",
  );
});
