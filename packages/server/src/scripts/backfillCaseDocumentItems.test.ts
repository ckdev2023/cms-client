import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildItemsFromBlueprint } from "./backfillCaseDocumentItems";

void describe("buildItemsFromBlueprint", () => {
  void it("returns items from {version,items} wrapped blueprint", () => {
    const blueprint = {
      version: 1,
      items: [
        {
          code: "passport_copy",
          name: "パスポートコピー",
          ownerSide: "applicant",
          category: "identity",
          requiredFlag: true,
          providedByRole: null,
        },
        {
          code: "resume",
          name: "履歴書",
          ownerSide: "applicant",
          category: "career",
          requiredFlag: true,
          providedByRole: "agent",
        },
        {
          code: "photo",
          name: "証明写真",
          ownerSide: "applicant",
        },
      ],
    };

    const items = buildItemsFromBlueprint(blueprint);

    assert.equal(items.length, 3);
    assert.deepEqual(items[0], {
      code: "passport_copy",
      name: "パスポートコピー",
      ownerSide: "applicant",
      category: "identity",
      requiredFlag: true,
      providedByRole: null,
    });
    assert.deepEqual(items[1], {
      code: "resume",
      name: "履歴書",
      ownerSide: "applicant",
      category: "career",
      requiredFlag: true,
      providedByRole: "agent",
    });
    assert.equal(items[2].code, "photo");
    assert.equal(items[2].name, "証明写真");
    assert.equal(items[2].ownerSide, "applicant");
  });

  void it("returns items from a plain array blueprint", () => {
    const blueprint = [
      { code: "tax_cert", name: "納税証明書", ownerSide: "company" },
      { code: "reg_cert", name: "登記簿謄本", ownerSide: "company" },
    ];

    const items = buildItemsFromBlueprint(blueprint);

    assert.equal(items.length, 2);
    assert.equal(items[0].code, "tax_cert");
    assert.equal(items[1].code, "reg_cert");
  });

  void it("returns [] for null blueprint", () => {
    assert.deepEqual(buildItemsFromBlueprint(null), []);
  });

  void it("returns [] for undefined blueprint", () => {
    assert.deepEqual(buildItemsFromBlueprint(undefined), []);
  });

  void it("returns [] for empty object blueprint", () => {
    assert.deepEqual(buildItemsFromBlueprint({}), []);
  });

  void it("returns [] for empty array blueprint", () => {
    assert.deepEqual(buildItemsFromBlueprint([]), []);
  });

  void it("returns [] for {items:[]} (wrapped but empty)", () => {
    assert.deepEqual(buildItemsFromBlueprint({ version: 1, items: [] }), []);
  });

  void it("defaults missing optional fields", () => {
    const blueprint = {
      items: [{ code: "minimal", name: "最小項目" }],
    };

    const items = buildItemsFromBlueprint(blueprint);

    assert.equal(items.length, 1);
    assert.deepEqual(items[0], {
      code: "minimal",
      name: "最小項目",
      ownerSide: "applicant",
      category: null,
      requiredFlag: false,
      providedByRole: null,
    });
  });

  void it("reads checklistItemCode as fallback for code", () => {
    const blueprint = [
      { checklistItemCode: "alt_code", name: "代替コード項目" },
    ];

    const items = buildItemsFromBlueprint(blueprint);

    assert.equal(items.length, 1);
    assert.equal(items[0].code, "alt_code");
  });
});
