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

describe("CustomerRepository.isBmvEnabled", () => {
  it("returns true when feature flag resolve returns enabled:true", async () => {
    const request = createRequestMock((input) => {
      const url = String(input);
      expect(url).toBe("/api/feature-flags/resolve?key=bmv");
      return jsonResponse({ key: "bmv", enabled: true, used: true });
    });

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    const result = await repo.isBmvEnabled();
    expect(result).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("returns false when feature flag resolve returns enabled:false", async () => {
    const request = createRequestMock(() =>
      jsonResponse({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "disabled",
      }),
    );

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    const result = await repo.isBmvEnabled();
    expect(result).toBe(false);
  });

  it("returns false when feature flag resolve returns missing", async () => {
    const request = createRequestMock(() =>
      jsonResponse({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "missing",
      }),
    );

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    const result = await repo.isBmvEnabled();
    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    const request = vi.fn(async () => {
      throw new Error("Network error");
    }) as unknown as typeof fetch;

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    const result = await repo.isBmvEnabled();
    expect(result).toBe(false);
  });

  it("returns false on HTTP 403", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ message: "Forbidden" }, { status: 403 }),
    );

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    const result = await repo.isBmvEnabled();
    expect(result).toBe(false);
  });

  it("sends GET request with correct authorization header", async () => {
    const request = createRequestMock((_input, init) => {
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      );
      return jsonResponse({ key: "bmv", enabled: true, used: true });
    });

    const repo = createCustomerRepository({
      request,
      getToken: () => "my-token",
    });

    await repo.isBmvEnabled();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
