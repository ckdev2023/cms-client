import { describe, expect, it, vi } from "vitest";
import {
  CustomerRepositoryError,
  createCustomerRepository,
} from "./CustomerRepository";

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

describe("CustomerRepository BMV actions", () => {
  it("calls BMV action endpoints and adapts returned bmvProfile", async () => {
    const request = createRequestMock((input, init) => {
      const url = String(input);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token-1",
      });

      if (url.endsWith("/bmv/questionnaire/send")) {
        return jsonResponse({
          id: "cust-004",
          baseProfile: { bmvProfile: { questionnaireStatus: "sent" } },
        });
      }
      if (url.endsWith("/bmv/quote/generate")) {
        return jsonResponse({
          id: "cust-004",
          baseProfile: {
            bmvProfile: {
              questionnaireStatus: "returned",
              quoteStatus: "generated",
              signStatus: "pending",
            },
          },
        });
      }

      expect(url).toBe("/api/customers/cust-004/bmv/sign/record");
      return jsonResponse({
        id: "cust-004",
        baseProfile: {
          bmvProfile: {
            questionnaireStatus: "returned",
            quoteStatus: "confirmed",
            signStatus: "signed",
          },
        },
      });
    });
    const repository = createCustomerRepository({
      request,
      getToken: () => "token-1",
    });

    await expect(
      repository.sendBmvQuestionnaire("cust-004"),
    ).resolves.toMatchObject({
      id: "cust-004",
      bmvProfile: {
        questionnaireStatus: "sent",
        intakeStatus: "questionnaire_pending",
      },
    });
    await expect(
      repository.generateBmvQuote("cust-004"),
    ).resolves.toMatchObject({
      id: "cust-004",
      bmvProfile: {
        questionnaireStatus: "returned",
        quoteStatus: "generated",
        signStatus: "pending",
        intakeStatus: "sign_pending",
      },
    });
    await expect(repository.recordBmvSign("cust-004")).resolves.toMatchObject({
      id: "cust-004",
      bmvProfile: {
        quoteStatus: "confirmed",
        signStatus: "signed",
        intakeStatus: "ready_for_case_creation",
      },
    });
  });

  it("maps validation errors from BMV action endpoints", async () => {
    const repository = createCustomerRepository({
      request: createRequestMock((input, init) => {
        expect(String(input)).toBe(
          "/api/customers/cust-004/bmv/quote/generate",
        );
        expect(init?.method).toBe("POST");
        return jsonResponse(
          { message: ["Quote stage already completed"] },
          { status: 422 },
        );
      }),
      getToken: () => "token-1",
    });

    await expect(repository.generateBmvQuote("cust-004")).rejects.toMatchObject(
      {
        name: "CustomerRepositoryError",
        code: "VALIDATION_ERROR",
        status: 422,
        message: "Quote stage already completed",
      } satisfies Partial<CustomerRepositoryError>,
    );
  });

  it("maps unauthorized errors from BMV action endpoints", async () => {
    const repository = createCustomerRepository({
      request: createRequestMock((input, init) => {
        expect(String(input)).toBe("/api/customers/cust-004/bmv/sign/record");
        expect(init?.method).toBe("POST");
        return jsonResponse(null, { status: 401 });
      }),
      getToken: () => "token-1",
    });

    await expect(repository.recordBmvSign("cust-004")).rejects.toMatchObject({
      name: "CustomerRepositoryError",
      code: "UNAUTHORIZED",
      status: 401,
      message: "Customer access denied",
    } satisfies Partial<CustomerRepositoryError>);
  });
});
