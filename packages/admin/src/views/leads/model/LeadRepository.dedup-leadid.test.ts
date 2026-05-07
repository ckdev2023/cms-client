import { describe, expect, it, vi } from "vitest";
import { createLeadRepository } from "./LeadRepository";

const LEAD_ID = "35ed6148-00de-48cf-8924-15c787554b75";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("LeadRepository.dedup — leadId pass-through (R-FLOW5-A-4)", () => {
  it("appends leadId query param when caller provides it", async () => {
    const captured: string[] = [];
    const request = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      captured.push(url);
      return jsonResponse({ leads: [], customers: [] });
    }) as unknown as typeof fetch;
    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    await repo.dedup({
      phone: "09055556666",
      email: "r-flow-04@example.com",
      leadId: LEAD_ID,
    });

    expect(captured).toHaveLength(1);
    const url = new URL(captured[0]!, "http://localhost");
    expect(url.searchParams.get("leadId")).toBe(LEAD_ID);
    expect(url.searchParams.get("phone")).toBe("09055556666");
    expect(url.searchParams.get("email")).toBe("r-flow-04@example.com");
  });

  it("omits leadId query param when caller does not provide one", async () => {
    const captured: string[] = [];
    const request = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      captured.push(url);
      return jsonResponse({ leads: [], customers: [] });
    }) as unknown as typeof fetch;
    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    await repo.dedup({ phone: "09055556666" });

    expect(captured).toHaveLength(1);
    const url = new URL(captured[0]!, "http://localhost");
    expect(url.searchParams.has("leadId")).toBe(false);
  });
});
