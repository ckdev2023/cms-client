// ── Test Ownership ──────────────────────────────────────────────
// Owner: repository-level messages / log orchestration (p0-fe-002e-01).
// Verifies that getMessages / getLogEntries call the correct
// endpoints and adapt responses via CaseCommsLogsAdapter.
// Does NOT test: adapter DTO mapping (see CaseCommsLogsAdapter.test.ts),
//   case CRUD orchestration (see CaseRepository.test.ts).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { createCaseRepository } from "./CaseRepository";

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

describe("CaseRepository messages/log (p0-fe-002e-01)", () => {
  // ─── getMessages ──────────────────────────────────────────────

  it("fetches from /communication-logs with caseId and adapts via CaseCommsLogsAdapter", async () => {
    const commLogs = [
      {
        id: "comm-1",
        channelType: "phone",
        contentSummary: "Follow up call",
        createdAt: "2026-03-15T10:00:00.000Z",
        createdByDisplayName: "Tanaka Yuki",
        visibleToClient: false,
        followUpRequired: false,
      },
      {
        id: "comm-2",
        channelType: "email",
        contentSummary: "Document request",
        createdAt: "2026-03-16T10:00:00.000Z",
        createdByDisplayName: "Admin",
        visibleToClient: true,
        followUpRequired: true,
        followUpDueAt: "2026-04-01T00:00:00.000Z",
      },
    ];

    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/communication-logs?caseId=case-001");
      expect(init?.method).toBe("GET");
      return jsonResponse(commLogs);
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const messages = await repo.getMessages("case-001");

    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe("comm-1");
    expect(messages[0].type).toBe("phone");
    expect(messages[0].typeLabel).toBe("電話記録");
    expect(messages[0].author).toBe("Tanaka Yuki");
    expect(messages[1].id).toBe("comm-2");
    expect(messages[1].type).toBe("auto_email");
    expect(messages[1].actionLabel).toBe("2026-04-01T00:00:00.000Z");
  });

  it("getMessages returns empty array for blank caseId without fetching", async () => {
    const request = createRequestMock(() => jsonResponse([]));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const messages = await repo.getMessages("  ");
    expect(messages).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it("getMessages adapts paginated response with items field", async () => {
    const request = createRequestMock(() =>
      jsonResponse({
        items: [
          {
            id: "comm-1",
            channelType: "meeting",
            contentSummary: "Meeting",
            createdAt: "2026-03-15T10:00:00.000Z",
            createdByDisplayName: "User",
            visibleToClient: true,
            followUpRequired: false,
          },
        ],
        total: 1,
      }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const messages = await repo.getMessages("case-001");
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe("meeting");
  });

  // ─── getLogEntries ────────────────────────────────────────────

  it("fetches from /timeline with entityType=case and adapts via CaseCommsLogsAdapter", async () => {
    const timelineLogs = [
      {
        id: "tl-1",
        action: "case.created",
        actorUserId: "user-abc",
        payload: { caseTypeCode: "business_manager" },
        createdAt: "2026-03-15T09:00:00.000Z",
      },
      {
        id: "tl-2",
        action: "case.status_changed",
        actorUserId: "user-xyz",
        payload: { from: "S3", to: "S4" },
        createdAt: "2026-03-16T09:00:00.000Z",
      },
    ];

    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe(
        "/api/timeline?entityType=case&entityId=case-001",
      );
      expect(init?.method).toBe("GET");
      return jsonResponse(timelineLogs);
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const entries = await repo.getLogEntries("case-001");

    expect(entries).toHaveLength(2);
    expect(entries[0].type).toBe("operation");
    expect(entries[0].text).toBe("cases.log.timeline.caseCreated");
    expect(entries[0].textParams).toEqual({
      suffix: "business_manager",
      suffixKey: "cases.constants.caseTypes.business_manager",
    });
    expect(entries[0].category).toBe("cases.log.category.operation");
    expect(entries[1].type).toBe("status");
    expect(entries[1].text).toBe("cases.log.timeline.stageChange");
    expect(entries[1].textParams).toEqual({ from: "S3", to: "S4" });
    expect(entries[1].category).toBe("cases.log.category.status");
  });

  it("getLogEntries returns empty array for blank caseId without fetching", async () => {
    const request = createRequestMock(() => jsonResponse([]));
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const entries = await repo.getLogEntries("");
    expect(entries).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it("getLogEntries adapts paginated response with items field", async () => {
    const request = createRequestMock(() =>
      jsonResponse({
        items: [
          {
            id: "tl-1",
            action: "review_record.created",
            actorUserId: "user-1",
            payload: {},
            createdAt: "2026-03-15T09:00:00.000Z",
          },
        ],
      }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    const entries = await repo.getLogEntries("case-001");
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("review");
    expect(entries[0].category).toBe("cases.log.category.review");
  });

  // ─── Custom apiPath derivation ────────────────────────────────

  it("getMessages uses custom apiPath to derive communication-logs URL", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toContain("/custom/communication-logs?caseId=");
      return jsonResponse([]);
    });
    const repo = createCaseRepository({
      request,
      getToken: () => "t",
      apiPath: "/custom/cases",
    });
    await repo.getMessages("c1");
  });

  it("getLogEntries uses custom apiPath to derive timeline URL", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toContain("/custom/timeline?entityType=case");
      return jsonResponse([]);
    });
    const repo = createCaseRepository({
      request,
      getToken: () => "t",
      apiPath: "/custom/cases",
    });
    await repo.getLogEntries("c1");
  });

  // ─── Focused wiring: error paths (p0-fe-002f-03) ────────────────

  it("getMessages propagates server error as CaseRepositoryError", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ message: "Service unavailable" }, { status: 503 }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(repo.getMessages("case-001")).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      status: 503,
    });
  });

  it("getLogEntries propagates server error as CaseRepositoryError", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ message: "Timeout" }, { status: 504 }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(repo.getLogEntries("case-001")).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "BAD_RESPONSE",
      status: 504,
    });
  });

  it("getMessages sends auth header when token is available", async () => {
    const request = createRequestMock((_, init) => {
      expect(init?.headers).toEqual(
        expect.objectContaining({ Authorization: "Bearer jwt-123" }),
      );
      return jsonResponse([]);
    });
    const repo = createCaseRepository({ request, getToken: () => "jwt-123" });
    await repo.getMessages("case-001");
    expect(request).toHaveBeenCalled();
  });
});
