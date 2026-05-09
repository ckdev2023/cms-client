import test from "node:test";
import assert from "node:assert/strict";

import type { RequestContext } from "../tenancy/requestContext";
import { ValidationAutoRunService } from "./validationAutoRun.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}

function flushImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

void test("schedule triggers ValidationRunsService.create with auto_event rulesetRef", async () => {
  const calls: { caseId: string; rulesetRef: unknown }[] = [];
  const runsStub = {
    create: (
      _ctx: RequestContext,
      input: { caseId: string; rulesetRef?: unknown },
    ) => {
      calls.push({ caseId: input.caseId, rulesetRef: input.rulesetRef });
      return Promise.resolve({ id: "run-1" });
    },
  };
  const timelineStub = { write: () => Promise.resolve() };

  const svc = new ValidationAutoRunService(
    runsStub as never,
    timelineStub as never,
  );
  svc.schedule(makeCtx(), CASE_ID, "generated_document.finalize");

  await flushImmediate();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].caseId, CASE_ID);
  const ref = calls[0].rulesetRef as Record<string, unknown>;
  assert.equal(ref.source, "auto_event");
  assert.equal(ref.trigger, "generated_document.finalize");
  assert.equal(ref.gate, "submission_readiness");
  assert.equal(ref.version, 1);
});

void test("schedule writes timeline on create failure without throwing", async () => {
  const timelineWrites: { action: string; payload: unknown }[] = [];
  const runsStub = {
    create: () => Promise.reject(new Error("DB connection failed")),
  };
  const timelineStub = {
    write: (
      _ctx: RequestContext,
      input: { action: string; payload: unknown },
    ) => {
      timelineWrites.push({ action: input.action, payload: input.payload });
      return Promise.resolve();
    },
  };

  const svc = new ValidationAutoRunService(
    runsStub as never,
    timelineStub as never,
  );
  svc.schedule(makeCtx(), CASE_ID, "document_item.transition");

  await flushImmediate();

  assert.equal(timelineWrites.length, 1);
  assert.equal(timelineWrites[0].action, "validation_run.auto_failed");
  const payload = timelineWrites[0].payload as Record<string, unknown>;
  assert.equal(payload.trigger, "document_item.transition");
  assert.equal(payload.message, "DB connection failed");
});

void test("schedule swallows timeline write errors without crashing", async () => {
  const runsStub = {
    create: () => Promise.reject(new Error("run failed")),
  };
  const timelineStub = {
    write: () => Promise.reject(new Error("timeline also failed")),
  };

  const svc = new ValidationAutoRunService(
    runsStub as never,
    timelineStub as never,
  );

  svc.schedule(makeCtx(), CASE_ID, "document_file.upload");

  await flushImmediate();
  // no unhandled rejection → test passes
});

void test("schedule captures error message in timeline payload", async () => {
  const timelineWrites: { payload: unknown }[] = [];
  const runsStub = {
    create: () => Promise.reject(new Error("specific validation error")),
  };
  const timelineStub = {
    write: (_ctx: RequestContext, input: { payload: unknown }) => {
      timelineWrites.push({ payload: input.payload });
      return Promise.resolve();
    },
  };

  const svc = new ValidationAutoRunService(
    runsStub as never,
    timelineStub as never,
  );
  svc.schedule(makeCtx(), CASE_ID, "document_item.waive");

  await flushImmediate();

  assert.equal(timelineWrites.length, 1);
  const payload = timelineWrites[0].payload as Record<string, unknown>;
  assert.equal(payload.message, "specific validation error");
});
