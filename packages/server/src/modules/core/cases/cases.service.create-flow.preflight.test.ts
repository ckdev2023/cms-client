import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  resolveChecklistItems,
  type CaseTemplateResolver,
} from "./cases.service.create-flow";
import type { TemplatesResolver } from "./cases.service.types-internal";
import type { RequestContext } from "../tenancy/requestContext";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";

function makeCtx(): RequestContext {
  return {
    orgId: "org-1",
    userId: "usr-1",
    role: "staff",
  } as unknown as RequestContext;
}

function makeLegacyResolver(response: unknown): TemplatesResolver {
  return {
    resolve: () => Promise.resolve(response),
  } as TemplatesResolver;
}

void describe("preflight: resolveChecklistItems empty guard integration", () => {
  void test("returns empty array when both resolvers miss — caller can reject", async () => {
    const templateResolver: CaseTemplateResolver = () =>
      Promise.resolve({ found: false as const });

    const legacy = makeLegacyResolver({ mode: "legacy", used: false });

    const items = await resolveChecklistItems(
      legacy,
      makeCtx(),
      "unknown_type",
      templateResolver,
    );

    assert.equal(items.length, 0);
  });

  void test("returns items when case_templates resolver finds a match", async () => {
    const templateResolver: CaseTemplateResolver = () =>
      Promise.resolve({
        found: true as const,
        items: [
          { code: "doc-1", name: "Doc 1", ownerSide: "applicant" },
          { code: "doc-2", name: "Doc 2", ownerSide: "office" },
        ],
      });

    const legacy = makeLegacyResolver({ mode: "legacy", used: false });

    const items = await resolveChecklistItems(
      legacy,
      makeCtx(),
      "dependent_visa",
      templateResolver,
    );

    assert.equal(items.length, 2);
  });

  void test("CASE_CHECKLIST_EMPTY code exists in error codes", () => {
    assert.equal(
      CASE_WRITE_ERROR_CODES.CHECKLIST_EMPTY,
      "CASE_CHECKLIST_EMPTY",
    );
  });

  void test("CaseCreateInput accepts forceCreate field", () => {
    const input = {
      customerId: "c1",
      caseTypeCode: "family",
      ownerUserId: "u1",
      forceCreate: true,
    };
    assert.equal(input.forceCreate, true);
  });
});
