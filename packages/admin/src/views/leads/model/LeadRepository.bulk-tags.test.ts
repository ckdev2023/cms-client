import { describe, expect, it, vi } from "vitest";
import { createLeadRepository } from "./LeadRepository";

const LEAD_ID = "11111111-1111-4111-8111-111111111111";

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

describe("LeadRepository — bulk endpoints adapt {updatedCount} server response", () => {
  it("bulkTags resolves on real {updatedCount} response without throwing BAD_RESPONSE", async () => {
    const request = createRequestMock(() => jsonResponse({ updatedCount: 1 }));
    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    const result = await repo.bulkTags({
      leadIds: [LEAD_ID],
      tags: ["测试2"],
    });

    expect(result).toEqual({ updatedCount: 1 });
  });

  it("bulkAssign resolves on {updatedCount} response", async () => {
    const request = createRequestMock(() => jsonResponse({ updatedCount: 2 }));
    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    const result = await repo.bulkAssign({
      leadIds: [LEAD_ID],
      ownerUserId: "00000000-0000-4000-8000-000000000099",
    });

    expect(result).toEqual({ updatedCount: 2 });
  });

  it("bulkStatus resolves on {updatedCount, errors} response", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ updatedCount: 1, errors: [] }),
    );
    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    const result = await repo.bulkStatus({
      leadIds: [LEAD_ID],
      toStatus: "following",
    });

    expect(result).toEqual({ updatedCount: 1 });
  });

  it("bulkExport resolves on Lead[] array response", async () => {
    const request = createRequestMock(() =>
      jsonResponse([{ id: LEAD_ID }, { id: "another" }]),
    );
    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    const result = await repo.bulkExport({
      leadIds: [LEAD_ID],
      format: "csv",
    });

    expect(result).toEqual({ updatedCount: 2 });
  });
});
