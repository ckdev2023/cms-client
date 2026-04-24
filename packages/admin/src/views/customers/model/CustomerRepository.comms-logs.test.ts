import { describe, expect, it, vi } from "vitest";
import { createCustomerRepository } from "./CustomerRepository";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createRequestMock(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input, init),
  ) as unknown as typeof fetch;
}

describe("CustomerRepository comms/logs", () => {
  it("lists communications with customerId filter and supplements BMV timeline entries", async () => {
    const request = createRequestMock((input, init) => {
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token-1",
      });

      if (
        String(input) ===
        "/api/communication-logs?customerId=cust-001&limit=200"
      ) {
        return jsonResponse({
          total: 1,
          items: [
            {
              id: "comm-001",
              channelType: "line",
              visibleToClient: false,
              contentSummary: "确认问卷已回收",
              fullContent: "已通过 LINE 回传信息表。",
              followUpRequired: true,
              followUpDueAt: "2026-04-13",
              createdBy: "user-001",
              createdAt: "2026-04-11T15:40:00.000Z",
            },
          ],
        });
      }

      if (
        String(input) ===
        "/api/timeline?entityType=customer&entityId=cust-001&limit=200"
      ) {
        return jsonResponse([
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
            createdAt: "2026-04-12T09:00:00.000Z",
          },
          {
            id: "log-003",
            action: "customer.updated",
            actorUserId: "user-002",
            payload: {
              before: { displayName: "田中" },
              after: { displayName: "田中太郎" },
            },
            createdAt: "2026-04-10T09:00:00.000Z",
          },
        ]);
      }

      throw new Error(`Unexpected request: ${String(input)}`);
    });
    const repository = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    await expect(repository.listComms("cust-001")).resolves.toEqual([
      {
        id: "log-002",
        type: "other",
        visibility: "customer",
        occurredAt: "2026-04-12T09:00:00.000Z",
        actor: "System",
        summary: "生成经营管理签报价",
        detail: "问卷：已发送 → 已回收；报价：未生成 → 已生成",
        nextAction: "",
      },
      {
        id: "comm-001",
        type: "line",
        visibility: "internal",
        occurredAt: "2026-04-11T15:40:00.000Z",
        actor: "user-001",
        summary: "确认问卷已回收",
        detail: "已通过 LINE 回传信息表。",
        nextAction: "2026-04-13",
      },
    ]);

    expect(request).toHaveBeenCalledTimes(2);
  });

  it("lists customer activity logs from timeline", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe(
        "/api/timeline?entityType=customer&entityId=cust-001&limit=200",
      );
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token-1",
      });

      return jsonResponse([
        {
          id: "log-001",
          action: "customer.updated",
          actorUserId: "user-001",
          payload: {
            before: { displayName: "田中" },
            after: { displayName: "田中太郎" },
          },
          createdAt: "2026-04-10T09:00:00.000Z",
        },
      ]);
    });
    const repository = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    await expect(repository.listLogs("cust-001")).resolves.toEqual([
      {
        id: "log-001",
        type: "info",
        actor: "user-001",
        at: "2026-04-10T09:00:00.000Z",
        message: "更新客户信息",
      },
    ]);
  });
});
