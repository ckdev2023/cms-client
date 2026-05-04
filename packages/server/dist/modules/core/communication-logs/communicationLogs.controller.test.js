import test from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";
import { CommunicationLogsController } from "./communicationLogs.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const LOG_ID = "00000000-0000-4000-8000-000000000002";
const CASE_ID = "00000000-0000-4000-8000-000000000003";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000004";
const COMPANY_ID = "00000000-0000-4000-8000-000000000005";
const req = {
  requestContext: { orgId: ORG_ID, userId: USER_ID, role: "staff" },
};
const mockLog = {
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
const mockListItem = {
  ...mockLog,
  createdByDisplayName: "Local Admin",
};
void test("CommunicationLogsController create validates input and requires context", async () => {
  let calledInput;
  const service = {
    create: (_ctx, input) => {
      calledInput = input;
      return Promise.resolve(mockLog);
    },
  };
  const controller = new CommunicationLogsController(service);
  await assert.rejects(
    () => controller.create({}, { channelType: "email" }),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.create(req, { channelType: "" }),
    /channelType is required/,
  );
  await assert.rejects(
    () =>
      controller.create(req, { channelType: "email", visibleToClient: "yes" }),
    /Invalid visibleToClient/,
  );
  await assert.rejects(
    () =>
      controller.create(req, { channelType: "email", followUpDueAt: "bad" }),
    /Invalid followUpDueAt/,
  );
  const res = await controller.create(req, {
    caseId: CASE_ID,
    customerId: null,
    companyId: COMPANY_ID,
    channelType: "email",
    visibleToClient: true,
    followUpRequired: false,
    followUpDueAt: null,
  });
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
  let calledQuery;
  const service = {
    list: (_ctx, query) => {
      calledQuery = query;
      return Promise.resolve({ items: [mockListItem], total: 1 });
    },
  };
  const controller = new CommunicationLogsController(service);
  await assert.rejects(() => controller.list({}, {}), UnauthorizedException);
  await assert.rejects(
    () => controller.list(req, { page: "0" }),
    /Invalid page/,
  );
  await assert.rejects(
    () => controller.list(req, { limit: "201" }),
    /Invalid limit/,
  );
  const res = await controller.list(req, {
    caseId: CASE_ID,
    customerId: CUSTOMER_ID,
    companyId: COMPANY_ID,
    page: "2",
    limit: "20",
  });
  assert.equal(res.total, 1);
  assert.equal(res.items[0].createdByDisplayName, "Local Admin");
  assert.deepEqual(calledQuery, {
    caseId: CASE_ID,
    customerId: CUSTOMER_ID,
    companyId: COMPANY_ID,
    page: 2,
    limit: 20,
  });
});
void test("CommunicationLogsController followUps parses filters", async () => {
  let calledQuery;
  const service = {
    followUps: (_ctx, query) => {
      calledQuery = query;
      return Promise.resolve([mockLog]);
    },
  };
  const controller = new CommunicationLogsController(service);
  await assert.rejects(
    () => controller.followUps({}, {}),
    UnauthorizedException,
  );
  const res = await controller.followUps(req, {
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
    get: (_ctx, id) => Promise.resolve(id === LOG_ID ? mockLog : null),
  };
  const controller = new CommunicationLogsController(service);
  await assert.rejects(() => controller.get({}, LOG_ID), UnauthorizedException);
  await assert.rejects(
    () => controller.get(req, "missing"),
    /Communication log not found/,
  );
  const res = await controller.get(req, LOG_ID);
  assert.equal(res.id, LOG_ID);
});
void test("CommunicationLogsController update parses nullable fields", async () => {
  let calledInput;
  const service = {
    update: (_ctx, _id, input) => {
      calledInput = input;
      return Promise.resolve({
        ...mockLog,
        subject: null,
        followUpDueAt: null,
      });
    },
  };
  const controller = new CommunicationLogsController(service);
  await assert.rejects(
    () => controller.update({}, LOG_ID, {}),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.update(req, LOG_ID, { followUpRequired: "no" }),
    /Invalid followUpRequired/,
  );
  const res = await controller.update(req, LOG_ID, {
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
//# sourceMappingURL=communicationLogs.controller.test.js.map
