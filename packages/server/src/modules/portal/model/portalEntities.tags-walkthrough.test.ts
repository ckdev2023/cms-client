import test from "node:test";
import assert from "node:assert/strict";

import { mapLeadRow } from "./portalEntities";

void test("mapLeadRow strips walkthrough/QA tag patterns (R<n>- / test- / mcp- / tmp-) at read time", () => {
  const row = {
    id: "l-walkthrough",
    org_id: null,
    app_user_id: "au1",
    source: "web",
    language: "ja",
    status: "new",
    assigned_org_id: null,
    tags: [
      "R5-walk",
      "VIP",
      "test-foo",
      "面談済",
      "mcp-bar",
      "tmp_baz",
      "R12-edge",
      "優先",
    ],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapLeadRow(row);
  assert.deepEqual(
    result.tags,
    ["VIP", "面談済", "優先"],
    "walkthrough/QA pattern tags must be filtered at read time so admin/portal UI never surfaces them",
  );
});

void test("mapLeadRow keeps real business tags resembling walkthrough patterns (Rapid / RC1- / R-no-digit)", () => {
  const row = {
    id: "l-keep",
    org_id: null,
    app_user_id: "au1",
    source: "web",
    language: "ja",
    status: "new",
    assigned_org_id: null,
    tags: ["Rapid-development", "RC1-keep", "R-no-digit", "紹介"],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const result = mapLeadRow(row);
  assert.deepEqual(result.tags, [
    "Rapid-development",
    "RC1-keep",
    "R-no-digit",
    "紹介",
  ]);
});
