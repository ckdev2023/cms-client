import test from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";

import type { CommunicationLog } from "../model/coreEntities";
import { CommunicationLogsController } from "./communicationLogs.controller";
import { CommunicationLogsService } from "./communicationLogs.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const LOG_ID = "00000000-0000-4000-8000-000000000002";
const CASE_ID = "00000000-0000-4000-8000-000000000003";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000004";
const COMPANY_ID = "00000000-0000-4000-8000-000000000005";

const req = {
  requestContext: { orgId: ORG_ID, userId: USER_ID, role: "staff" as const },
};

const mockLog: CommunicationLog = {
  id: LOG_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  customerId: CUSTOMER_ID,
  companyId: COMPANY_ID,
  channelType: "email",
  direction: "outbound",
  subject: "Follow up",
  contentSummary: "sent summary",
  fullContent: "full body",
  visibleToClient: true,
  createdBy: USER_ID,
  followUpRequired: true,
  followUpDueAt: "2026-04-01T00:00:00.000Z",
  createdAt: "2026-03-01T00:00:00.000Z",
};

void test("CommunicationLogsController create validates input and requires context", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const service = {
    create: (_ctx: unknown, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve(mockLog);
    },
  } as unknown as CommunicationLogsService;
  const controller = new CommunicationLogsController(service);

  await assert.rejects(
    () => controller.create({} as never, { channelType: "email" } as never),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.create(req as never, { channelType: "" } as never),
    /channelType is required/,
  );
  await assert.rejects(
    () =>
      controller.create(
        req as never,
        { channelType: "email", visibleToClient: "yes" } as never,
      ),
    /Invalid visibleToClient/,
  );
  await assert.rejects(
    () =>
      controller.create(
        req as never,
        { channelType: "email", followUpDueAt: "bad" } as never,
      ),
    /Invalid followUpDueAt/,
  );

  const res = await controller.create(
    req as never,
    {
      caseId: CASE_ID,
      customerId: null,
      companyId: COMPANY_ID,
      channelType: "email",
      visibleToClient: true,
      followUpRequired: false,
      followUpDueAt: null,
    } as never,
  );
  assert.equal(res.id, LOG_ID);
  assert.deepEqual(calledInput, {
    caseId: CASE_ID,
    customerId: null,
    companyId: COMPANY_ID,
    channelType: "email",
    direction: undefined,
    subject: undefined,
    contentSummary: undefined,
    fullContent: undefined,
    visibleToClient: true,
    followUpRequired: false,
    followUpDueAt: null,
  });
});

void test("CommunicationLogsController list parses query", async () => {
  let calledQuery: Record<string, unknown> | undefined;
  const service = {
    list: (_ctx: unknown, query: Record<string, unknown>) => {
      calledQuery = query;
      return Promise.resolve({ items: [mockLog], total: 1 });
    },
  } as unknown as CommunicationLogsService;
  const controller = new CommunicationLogsController(service);

  await assert.rejects(
    () => controller.list({} as never, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.list(req as never, { page: "0" }),
    /Invalid page/,
  );
  await assert.rejects(
    () => controller.list(req as never, { limit: "201" }),
    /Invalid limit/,
  );

  const res = await controller.list(req as never, {
    caseId: CASE_ID,
    customerId: CUSTOMER_ID,
    companyId: COMPANY_ID,
    page: "2",
    limit: "20",
  });
  assert.equal(res.total, 1);
  assert.deepEqual(calledQuery, {
    caseId: CASE_ID,
    customerId: CUSTOMER_ID,
    companyId: COMPANY_ID,
    page: 2,
    limit: 20,
  });
});

void test("CommunicationLogsController followUps parses filters", async () => {
  let calledQuery: Record<string, unknown> | undefined;
  const service = {
    followUps: (_ctx: unknown, query: Record<string, unknown>) => {
      calledQuery = query;
      return Promise.resolve([mockLog]);
    },
  } as unknown as CommunicationLogsService;
  const controller = new CommunicationLogsController(service);

  await assert.rejects(
    () => controller.followUps({} as never, {}),
    UnauthorizedException,
  );
  const res = await controller.followUps(req as never, {
    caseId: CASE_ID,
    companyId: COMPANY_ID,
  });
  assert.equal(res.length, 1);
  assert.deepEqual(calledQuery, {
    caseId: CASE_ID,
    customerId: undefined,
    companyId: COMPANY_ID,
  });
});

void test("CommunicationLogsController get validates context and handles not found", async () => {
  const service = {
    get: (_ctx: unknown, id: string) =>
      Promise.resolve(id === LOG_ID ? mockLog : null),
  } as unknown as CommunicationLogsService;
  const controller = new CommunicationLogsController(service);

  await assert.rejects(
    () => controller.get({} as never, LOG_ID),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.get(req as never, "missing"),
    /Communication log not found/,
  );
  const res = await controller.get(req as never, LOG_ID);
  assert.equal(res.id, LOG_ID);
});

void test("CommunicationLogsController update parses nullable fields", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const service = {
    update: (_ctx: unknown, _id: string, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve({
        ...mockLog,
        subject: null,
        followUpDueAt: null,
      });
    },
  } as unknown as CommunicationLogsService;
  const controller = new CommunicationLogsController(service);

  await assert.rejects(
    () => controller.update({} as never, LOG_ID, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.update(req as never, LOG_ID, { followUpRequired: "no" }),
    /Invalid followUpRequired/,
  );

  const res = await controller.update(req as never, LOG_ID, {
    customerId: null,
    subject: null,
    visibleToClient: false,
    followUpRequired: true,
    followUpDueAt: null,
  });
  assert.equal(res.subject, null);
  assert.deepEqual(calledInput, {
    caseId: undefined,
    customerId: null,
    companyId: undefined,
    channelType: undefined,
    direction: undefined,
    subject: null,
    contentSummary: undefined,
    fullContent: undefined,
    visibleToClient: false,
    followUpRequired: true,
    followUpDueAt: null,
  });
});
