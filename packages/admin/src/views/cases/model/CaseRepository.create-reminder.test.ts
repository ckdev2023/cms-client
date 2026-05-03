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

describe("CaseRepository.createReminder (BUG-215)", () => {
  it("posts to /api/reminders with correct payload", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/reminders");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual({
        targetType: "case",
        targetId: "case-001",
        remindAt: "2026-06-01T00:00:00.000Z",
        caseId: "case-001",
        channel: "in_app",
        payloadSnapshot: { kind: "custom", memo: "test note" },
      });
      return jsonResponse({ id: "rem-001", status: "ok" });
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.createReminder({
      caseId: "case-001",
      targetType: "case",
      targetId: "case-001",
      remindAt: "2026-06-01T00:00:00.000Z",
      kind: "custom",
      memo: "test note",
    });

    expect(result).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("uses custom apiPath to derive reminders URL", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toBe("/custom/reminders");
      return jsonResponse({ id: "rem-002" });
    });

    const repo = createCaseRepository({
      request,
      getToken: () => "t",
      apiPath: "/custom/cases",
    });
    await repo.createReminder({
      caseId: "c1",
      targetType: "case",
      targetId: "c1",
      remindAt: "2026-07-01T00:00:00.000Z",
      kind: "renewal_reminder",
    });
  });

  it("sends auth header when token is available", async () => {
    const request = createRequestMock((_, init) => {
      expect(init?.headers).toEqual(
        expect.objectContaining({ Authorization: "Bearer jwt-abc" }),
      );
      return jsonResponse({ id: "rem-003" });
    });

    const repo = createCaseRepository({ request, getToken: () => "jwt-abc" });
    await repo.createReminder({
      caseId: "c1",
      targetType: "case_party_residence",
      targetId: "party-001",
      remindAt: "2026-08-01T00:00:00.000Z",
      kind: "residence_expiry",
    });
    expect(request).toHaveBeenCalled();
  });

  it("propagates server error as CaseRepositoryError", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ message: "Forbidden" }, { status: 403 }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(
      repo.createReminder({
        caseId: "c1",
        targetType: "case",
        targetId: "c1",
        remindAt: "2026-06-01T00:00:00.000Z",
        kind: "custom",
      }),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
    });
  });
});
