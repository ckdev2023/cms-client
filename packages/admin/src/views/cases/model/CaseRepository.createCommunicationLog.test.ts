import { describe, it, expect, vi } from "vitest";
import { createCaseRepository } from "./CaseRepository";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe("CaseRepository.createCommunicationLog", () => {
  it("sends POST to /api/communication-logs with mapped payload", async () => {
    const request = mockFetch(201, { id: "log-001" });
    const repo = createCaseRepository({
      request,
      getToken: () => "test-token",
      apiPath: "/api/cases",
    });

    const result = await repo.createCommunicationLog({
      caseId: "case-123",
      channelChoice: "internal",
      content: "テスト内容",
    });

    expect(result.id).toBe("log-001");
    expect(request).toHaveBeenCalledTimes(1);

    const [url, opts] = request.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/communication-logs");
    expect(opts.method).toBe("POST");

    const sentBody = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(sentBody.caseId).toBe("case-123");
    expect(sentBody.channelType).toBe("other");
    expect(sentBody.visibleToClient).toBe(false);
    expect(sentBody.direction).toBe("outbound");
    expect(sentBody.contentSummary).toBe("テスト内容");
  });

  it("maps client_visible choice to channelType=other, visibleToClient=true", async () => {
    const request = mockFetch(201, { id: "log-002" });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    await repo.createCommunicationLog({
      caseId: "case-123",
      channelChoice: "client_visible",
      content: "content",
    });

    const sentBody = JSON.parse(
      (request.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(sentBody.channelType).toBe("other");
    expect(sentBody.visibleToClient).toBe(true);
  });

  it("maps phone choice correctly", async () => {
    const request = mockFetch(201, { id: "log-003" });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    await repo.createCommunicationLog({
      caseId: "case-123",
      channelChoice: "phone",
      content: "電話メモ",
    });

    const sentBody = JSON.parse(
      (request.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(sentBody.channelType).toBe("phone");
    expect(sentBody.visibleToClient).toBe(false);
  });

  it("maps meeting choice correctly", async () => {
    const request = mockFetch(201, { id: "log-004" });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    await repo.createCommunicationLog({
      caseId: "case-123",
      channelChoice: "meeting",
      content: "会議メモ",
    });

    const sentBody = JSON.parse(
      (request.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(sentBody.channelType).toBe("meeting");
    expect(sentBody.visibleToClient).toBe(false);
  });

  it("includes authorization header", async () => {
    const request = mockFetch(201, { id: "log-005" });
    const repo = createCaseRepository({
      request,
      getToken: () => "my-jwt",
      apiPath: "/api/cases",
    });

    await repo.createCommunicationLog({
      caseId: "c",
      channelChoice: "internal",
      content: "x",
    });

    const headers = (request.mock.calls[0] as [string, RequestInit])[1]
      .headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer my-jwt");
  });

  it("throws on server error", async () => {
    const request = mockFetch(500, { message: "Internal error" });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    await expect(
      repo.createCommunicationLog({
        caseId: "c",
        channelChoice: "internal",
        content: "x",
      }),
    ).rejects.toThrow();
  });
});
