import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  resolveChecklistItems,
  type CaseTemplateResolver,
} from "./cases.service.create-flow";
import type { TemplatesResolver } from "./cases.service.types-internal";
import type { RequestContext } from "../tenancy/requestContext";

const ORG = "org-1";
const USR = "usr-1";

function makeCtx(): RequestContext {
  return {
    orgId: ORG,
    userId: USR,
    role: "staff",
  } as unknown as RequestContext;
}

function makeLegacyResolver(response: unknown): {
  service: TemplatesResolver;
  calls: { kind: string; key: string }[];
} {
  const calls: { kind: string; key: string }[] = [];
  return {
    service: {
      resolve: (_ctx: unknown, input: { kind: string; key: string }) => {
        calls.push({ kind: input.kind, key: input.key });
        return Promise.resolve(response);
      },
    } as TemplatesResolver,
    calls,
  };
}

void describe("resolveChecklistItems: case_templates priority path", () => {
  void test("uses case_templates when resolver returns found=true with items", async () => {
    const templateResolver: CaseTemplateResolver = () =>
      Promise.resolve({
        found: true as const,
        items: [
          { code: "ct-item-1", name: "Item 1", ownerSide: "applicant" },
          { code: "ct-item-2", name: "Item 2", ownerSide: "office" },
        ],
      });

    const legacy = makeLegacyResolver({ mode: "legacy", used: false });

    const items = await resolveChecklistItems(
      legacy.service,
      makeCtx(),
      "family_stay",
      templateResolver,
    );

    assert.equal(items.length, 2);
    assert.equal(items[0].code, "ct-item-1");
    assert.equal(items[1].code, "ct-item-2");
    assert.equal(
      legacy.calls.length,
      0,
      "legacy resolver should not be called",
    );
  });

  void test("falls back to legacy resolver when case_templates returns found=false", async () => {
    const templateResolver: CaseTemplateResolver = () =>
      Promise.resolve({ found: false as const });

    const legacy = makeLegacyResolver({
      mode: "template",
      used: true,
      version: 1,
      config: {
        requirementBlueprint: [
          {
            checklistItemCode: "legacy-item",
            name: "Legacy",
            ownerSide: "customer",
            requiredFlag: true,
          },
        ],
      },
    });

    const items = await resolveChecklistItems(
      legacy.service,
      makeCtx(),
      "business_manager_visa",
      templateResolver,
    );

    assert.equal(items.length, 1);
    assert.equal(items[0].code, "legacy-item");
    assert.ok(legacy.calls.length > 0, "legacy resolver should be called");
  });

  void test("falls back to legacy when case_templates returns found=true but items are empty", async () => {
    const templateResolver: CaseTemplateResolver = () =>
      Promise.resolve({ found: true as const, items: [] });

    const legacy = makeLegacyResolver({
      mode: "template",
      used: true,
      version: 1,
      config: {
        items: [
          {
            code: "fallback-item",
            name: "Fallback",
            ownerSide: "applicant",
            requiredFlag: false,
          },
        ],
      },
    });

    const items = await resolveChecklistItems(
      legacy.service,
      makeCtx(),
      "work",
      templateResolver,
    );

    assert.equal(items.length, 1);
    assert.equal(items[0].code, "fallback-item");
  });

  void test("returns empty when both case_templates and legacy fail", async () => {
    const templateResolver: CaseTemplateResolver = () =>
      Promise.resolve({ found: false as const });

    const legacy = makeLegacyResolver({ mode: "legacy", used: false });

    const items = await resolveChecklistItems(
      legacy.service,
      makeCtx(),
      "unknown_type",
      templateResolver,
    );

    assert.equal(items.length, 0);
  });

  void test("works without caseTemplateResolver (backward compat)", async () => {
    const legacy = makeLegacyResolver({
      mode: "template",
      used: true,
      version: 1,
      config: {
        requirementBlueprint: [
          {
            checklistItemCode: "compat-item",
            name: "Compat",
            ownerSide: "applicant",
            requiredFlag: true,
          },
        ],
      },
    });

    const items = await resolveChecklistItems(
      legacy.service,
      makeCtx(),
      "business_manager_visa",
    );

    assert.equal(items.length, 1);
    assert.equal(items[0].code, "compat-item");
  });
});
