import { describe, expect, it, vi } from "vitest";
import { createLeadRepository } from "./LeadRepository";
import { LeadRepositoryError } from "./LeadRepositorySupport";

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "00000000-0000-4000-8000-000000000011";

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

describe("LeadRepository — convertCase BMV gate error extraction (R2-B-5)", () => {
  it("extracts code + blockers from CASE_BMV_GATE_BLOCKED 400 response", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          code: "CASE_BMV_GATE_BLOCKED",
          message: "BMV gate blocked",
          blockers: [
            {
              code: "BMV_QUESTIONNAIRE_NOT_RETURNED",
              message:
                "BMV questionnaire must be returned before case creation",
            },
            {
              code: "BMV_NOT_SIGNED",
              message: "Customer must sign contract before BMV case creation",
            },
          ],
        },
        { status: 400 },
      ),
    );

    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    try {
      await repo.convertCase(LEAD_ID, {
        caseTypeCode: "business_manager_visa",
        ownerUserId: OWNER_ID,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(LeadRepositoryError);
      const error = err as LeadRepositoryError;
      expect(error.status).toBe(400);
      expect(error.code).toBe("LEAD_WRITE_ERROR");
      expect(error.serverErrorCode).toBe("CASE_BMV_GATE_BLOCKED");
      expect(error.serverBlockers).toEqual([
        {
          code: "BMV_QUESTIONNAIRE_NOT_RETURNED",
          message: "BMV questionnaire must be returned before case creation",
        },
        {
          code: "BMV_NOT_SIGNED",
          message: "Customer must sign contract before BMV case creation",
        },
      ]);
    }
  });

  it("falls back to errorCode field when code is absent", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          errorCode: "CASE_BMV_GATE_BLOCKED",
          message: "Gate blocked",
          blockers: [{ code: "BMV_INTAKE_NOT_READY" }],
        },
        { status: 400 },
      ),
    );

    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    try {
      await repo.convertCase(LEAD_ID, {
        caseTypeCode: "business_manager_visa",
        ownerUserId: OWNER_ID,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as LeadRepositoryError;
      expect(error.serverErrorCode).toBe("CASE_BMV_GATE_BLOCKED");
      expect(error.serverBlockers).toEqual([
        { code: "BMV_INTAKE_NOT_READY", message: undefined },
      ]);
    }
  });

  it("serverBlockers is undefined when response carries no blockers array", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        { code: "SOME_OTHER_ERROR", message: "Validation failed" },
        { status: 400 },
      ),
    );

    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    try {
      await repo.convertCase(LEAD_ID, {
        caseTypeCode: "business_manager_visa",
        ownerUserId: OWNER_ID,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as LeadRepositoryError;
      expect(error.serverErrorCode).toBe("SOME_OTHER_ERROR");
      expect(error.serverBlockers).toBeUndefined();
    }
  });

  it("filters malformed blocker entries", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          code: "CASE_BMV_GATE_BLOCKED",
          blockers: [
            { code: "BMV_NOT_SIGNED", message: "Sign first" },
            "not-an-object",
            { noCode: true },
            { code: 123 },
            { code: "BMV_QUOTE_NOT_CONFIRMED" },
          ],
        },
        { status: 400 },
      ),
    );

    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    try {
      await repo.convertCase(LEAD_ID, {
        caseTypeCode: "business_manager_visa",
        ownerUserId: OWNER_ID,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as LeadRepositoryError;
      expect(error.serverBlockers).toEqual([
        { code: "BMV_NOT_SIGNED", message: "Sign first" },
        { code: "BMV_QUOTE_NOT_CONFIRMED", message: undefined },
      ]);
    }
  });

  it("extracts code + blockers from CONVERT_CASE_REQUIRES_CUSTOMER 400 response (R3-C-2)", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          code: "CONVERT_CASE_REQUIRES_CUSTOMER",
          message:
            "Lead must have converted_customer_id; run convert-customer first",
          blockers: [
            {
              code: "MISSING_CONVERTED_CUSTOMER",
              message: "Must convert to customer before creating case",
            },
          ],
        },
        { status: 400 },
      ),
    );

    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    try {
      await repo.convertCase(LEAD_ID, {
        caseTypeCode: "business_manager_visa",
        ownerUserId: OWNER_ID,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(LeadRepositoryError);
      const error = err as LeadRepositoryError;
      expect(error.status).toBe(400);
      expect(error.code).toBe("LEAD_WRITE_ERROR");
      expect(error.serverErrorCode).toBe("CONVERT_CASE_REQUIRES_CUSTOMER");
      expect(error.serverBlockers).toEqual([
        {
          code: "MISSING_CONVERTED_CUSTOMER",
          message: "Must convert to customer before creating case",
        },
      ]);
    }
  });

  it("does not surface serverErrorCode / serverBlockers for 401", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          code: "UNAUTHORIZED",
          message: "Unauthorized",
          blockers: [{ code: "BMV_NOT_SIGNED" }],
        },
        { status: 401 },
      ),
    );

    const repo = createLeadRepository({ request, getToken: () => "token-1" });

    try {
      await repo.convertCase(LEAD_ID, {
        caseTypeCode: "business_manager_visa",
        ownerUserId: OWNER_ID,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as LeadRepositoryError;
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.serverErrorCode).toBeUndefined();
      expect(error.serverBlockers).toBeUndefined();
    }
  });

  it("posts to /api/admin/leads/:id/convert-case with JSON body and bearer token", async () => {
    let observedUrl = "";
    let observedInit: RequestInit | undefined;
    const request = createRequestMock((input, init) => {
      observedUrl = String(input);
      observedInit = init;
      return jsonResponse(
        { lead: { id: LEAD_ID }, caseId: "CASE-NEW-001" },
        { status: 201 },
      );
    });

    const repo = createLeadRepository({ request, getToken: () => "token-X" });
    await repo.convertCase(LEAD_ID, {
      caseTypeCode: "business_manager_visa",
      ownerUserId: OWNER_ID,
    });

    expect(observedUrl).toBe(`/api/admin/leads/${LEAD_ID}/convert-case`);
    expect(observedInit?.method).toBe("POST");
    const headers = observedInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-X");
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse((observedInit?.body as string) ?? "{}");
    expect(body).toMatchObject({
      caseTypeCode: "business_manager_visa",
      ownerUserId: OWNER_ID,
    });
  });
});
