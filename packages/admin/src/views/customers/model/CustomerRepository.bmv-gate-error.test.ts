import { describe, expect, it, vi } from "vitest";
import { createCustomerRepository } from "./CustomerRepository";
import { CustomerRepositoryError } from "./CustomerRepositorySupport";

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

describe("CustomerRepository — server error code extraction", () => {
  it("carries serverErrorCode from 400 response body with code field", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          code: "CASE_BMV_GATE_BLOCKED",
          message: "BMV gate blocked",
          blockers: [
            {
              code: "BMV_NOT_SIGNED",
              message: "Customer must sign first",
            },
          ],
        },
        { status: 400 },
      ),
    );

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    try {
      await repo.recordBmvSign("cust-1");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CustomerRepositoryError);
      const error = err as CustomerRepositoryError;
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.serverErrorCode).toBe("CASE_BMV_GATE_BLOCKED");
      expect(error.serverBlockers).toEqual([
        { code: "BMV_NOT_SIGNED", message: "Customer must sign first" },
      ]);
    }
  });

  it("carries serverErrorCode from errorCode field in body", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          errorCode: "CASE_BMV_GATE_BLOCKED",
          message: "Gate blocked",
        },
        { status: 400 },
      ),
    );

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    try {
      await repo.recordBmvSign("cust-1");
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as CustomerRepositoryError;
      expect(error.serverErrorCode).toBe("CASE_BMV_GATE_BLOCKED");
    }
  });

  it("serverBlockers is undefined when response has no blockers array", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          code: "SOME_ERROR",
          message: "Validation failed",
        },
        { status: 400 },
      ),
    );

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    try {
      await repo.recordBmvSign("cust-1");
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as CustomerRepositoryError;
      expect(error.serverErrorCode).toBe("SOME_ERROR");
      expect(error.serverBlockers).toBeUndefined();
    }
  });

  it("serverBlockers filters out malformed entries", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          code: "CASE_BMV_GATE_BLOCKED",
          message: "Gate blocked",
          blockers: [
            { code: "BMV_NOT_SIGNED", message: "Must sign" },
            "invalid_entry",
            { noCode: true },
            { code: "BMV_INTAKE_NOT_READY" },
          ],
        },
        { status: 400 },
      ),
    );

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    try {
      await repo.recordBmvSign("cust-1");
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as CustomerRepositoryError;
      expect(error.serverBlockers).toEqual([
        { code: "BMV_NOT_SIGNED", message: "Must sign" },
        { code: "BMV_INTAKE_NOT_READY", message: undefined },
      ]);
    }
  });

  it("serverErrorCode is undefined for 401 responses", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ message: "Unauthorized" }, { status: 401 }),
    );

    const repo = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    try {
      await repo.recordBmvSign("cust-1");
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as CustomerRepositoryError;
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.serverErrorCode).toBeUndefined();
    }
  });
});
