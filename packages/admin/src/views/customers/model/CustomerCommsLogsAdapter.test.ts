import { describe, expect, it } from "vitest";
import {
  adaptTimelineBmvCommListResult,
  adaptTimelineLogListResult,
} from "./CustomerCommsLogsAdapter";

describe("CustomerCommsLogsAdapter BMV timeline mapping", () => {
  it("maps BMV timeline actions into readable activity logs", () => {
    expect(
      adaptTimelineLogListResult([
        {
          id: "log-001",
          action: "customer.bmv_questionnaire_sent",
          actorUserId: "user-001",
          payload: {
            beforeQuestionnaireStatus: "not_started",
            afterQuestionnaireStatus: "sent",
          },
          createdAt: "2026-04-10T09:00:00.000Z",
        },
        {
          id: "log-002",
          action: "customer.bmv_quote_generated",
          actorUserId: null,
          payload: {
            beforeQuestionnaireStatus: "sent",
            afterQuestionnaireStatus: "returned",
            beforeQuoteStatus: "not_started",
            afterQuoteStatus: "generated",
          },
          createdAt: "2026-04-10T10:00:00.000Z",
        },
        {
          id: "log-003",
          action: "customer.bmv_signed",
          actorUserId: "user-002",
          payload: {
            beforeQuoteStatus: "generated",
            afterQuoteStatus: "confirmed",
            beforeSignStatus: "pending",
            afterSignStatus: "signed",
          },
          createdAt: "2026-04-10T11:00:00.000Z",
        },
      ]),
    ).toEqual([
      {
        id: "log-001",
        type: "comm",
        actor: "user-001",
        at: "2026-04-10T09:00:00.000Z",
        message: "发送经营管理签问卷：问卷：未发送 → 已发送",
      },
      {
        id: "log-002",
        type: "info",
        actor: "System",
        at: "2026-04-10T10:00:00.000Z",
        message:
          "生成经营管理签报价：问卷：已发送 → 已回收；报价：未生成 → 已生成",
      },
      {
        id: "log-003",
        type: "case",
        actor: "user-002",
        at: "2026-04-10T11:00:00.000Z",
        message:
          "确认经营管理签签约：报价：已生成 → 已确认；签约：待签约 → 已签约",
      },
    ]);
  });

  it("derives comm timeline items from BMV timeline actions", () => {
    expect(
      adaptTimelineBmvCommListResult([
        {
          id: "log-ignore",
          action: "customer.updated",
          actorUserId: "user-000",
          payload: {
            before: { displayName: "田中" },
            after: { displayName: "田中太郎" },
          },
          createdAt: "2026-04-10T08:00:00.000Z",
        },
        {
          id: "log-001",
          action: "customer.bmv_questionnaire_sent",
          actorUserId: "user-001",
          payload: {
            beforeQuestionnaireStatus: "not_started",
            afterQuestionnaireStatus: "sent",
            channelType: "email",
          },
          createdAt: "2026-04-10T09:00:00.000Z",
        },
        {
          id: "log-002",
          action: "customer.bmv_quote_generated",
          actorUserId: null,
          payload: {
            beforeQuestionnaireStatus: "sent",
            afterQuestionnaireStatus: "returned",
            beforeQuoteStatus: "not_started",
            afterQuoteStatus: "generated",
          },
          createdAt: "2026-04-10T10:00:00.000Z",
        },
        {
          id: "log-003",
          action: "customer.bmv_signed",
          actorUserId: "user-002",
          payload: {
            beforeQuoteStatus: "generated",
            afterQuoteStatus: "confirmed",
            beforeSignStatus: "pending",
            afterSignStatus: "signed",
          },
          createdAt: "2026-04-10T11:00:00.000Z",
        },
      ]),
    ).toEqual([
      {
        id: "log-001",
        type: "email",
        visibility: "customer",
        occurredAt: "2026-04-10T09:00:00.000Z",
        actor: "user-001",
        summary: "发送经营管理签问卷",
        detail: "问卷：未发送 → 已发送",
        nextAction: "",
      },
      {
        id: "log-002",
        type: "other",
        visibility: "customer",
        occurredAt: "2026-04-10T10:00:00.000Z",
        actor: "System",
        summary: "生成经营管理签报价",
        detail: "问卷：已发送 → 已回收；报价：未生成 → 已生成",
        nextAction: "",
      },
      {
        id: "log-003",
        type: "meeting",
        visibility: "internal",
        occurredAt: "2026-04-10T11:00:00.000Z",
        actor: "user-002",
        summary: "确认经营管理签签约",
        detail: "报价：已生成 → 已确认；签约：待签约 → 已签约",
        nextAction: "",
      },
    ]);
  });
});
