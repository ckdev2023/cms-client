import { describe, expect, it, vi } from "vitest";

import {
  OrgSettingsRepositoryError,
  createOrgSettingsRepository,
} from "./OrgSettingsRepository";

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

const RESPONSE_BODY = {
  visibility: {
    allowCrossGroupCaseCreate: true,
    allowPrincipalViewCrossGroupCollab: false,
  },
  storageRoot: {
    rootLabel: "案件資料総盤",
    rootPath: "\\fileserver\\gyosei-docs",
    updatedBy: "Admin",
    updatedAt: "2026-04-27T12:00:00.000Z",
  },
};

describe("OrgSettingsRepository", () => {
  it("gets organization settings with auth header", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/organizations/current/settings");
      expect(init?.method).toBe("GET");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token-1",
      });
      return jsonResponse(RESPONSE_BODY);
    });

    const repository = createOrgSettingsRepository({
      request,
      getToken: () => "token-1",
    });

    await expect(repository.getOrgSettings()).resolves.toEqual(RESPONSE_BODY);
  });

  it("patches organization settings with partial payload", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/organizations/current/settings");
      expect(init?.method).toBe("PATCH");
      expect(init?.headers).toEqual({
        Accept: "application/json",
        Authorization: "Bearer token-1",
        "Content-Type": "application/json",
      });
      expect(init?.body).toBe(
        JSON.stringify({
          storageRoot: {
            rootLabel: "案件資料総盤",
            rootPath: "\\fileserver\\gyosei-docs",
          },
        }),
      );
      return jsonResponse(RESPONSE_BODY);
    });

    const repository = createOrgSettingsRepository({
      request,
      getToken: () => "token-1",
    });

    await expect(
      repository.updateOrgSettings({
        storageRoot: {
          rootLabel: "案件資料総盤",
          rootPath: "\\fileserver\\gyosei-docs",
        },
      }),
    ).resolves.toEqual(RESPONSE_BODY);
  });

  it("throws when response payload is invalid", async () => {
    const repository = createOrgSettingsRepository({
      request: createRequestMock(() => jsonResponse({ ok: true })),
    });

    await expect(repository.getOrgSettings()).rejects.toBeInstanceOf(
      OrgSettingsRepositoryError,
    );
  });
});
