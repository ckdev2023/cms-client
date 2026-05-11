import { describe, it, expect } from "vitest";
import { createCaseTemplatesRepository } from "./CaseTemplatesRepository";

function mockFetch(body: unknown, status = 200): typeof fetch {
  return async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
      headers: new Headers(),
    }) as Response;
}

describe("CaseTemplatesRepository", () => {
  it("list adapts server response", async () => {
    const repo = createCaseTemplatesRepository({
      request: mockFetch({
        items: [
          {
            id: "t-1",
            orgId: "org-1",
            templateName: "Test",
            caseType: "dependent_visa",
            applicationType: null,
            blueprintItemCount: 3,
            reviewRequiredFlag: false,
            billingGateMode: "warn",
            activeFlag: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
      getToken: () => "test-token",
    });

    const result = await repo.list();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].templateName).toBe("Test");
    expect(result.items[0].blueprintItemCount).toBe(3);
  });

  it("list builds query string from params", async () => {
    let calledUrl = "";
    const repo = createCaseTemplatesRepository({
      request: async (url: string | URL | Request) => {
        calledUrl = typeof url === "string" ? url : String(url);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ items: [] }),
          headers: new Headers(),
        } as Response;
      },
      getToken: () => "test-token",
    });

    await repo.list({ caseType: "bmv", includeInactive: true });
    expect(calledUrl).toContain("caseType=bmv");
    expect(calledUrl).toContain("includeInactive=true");
  });

  it("list throws on 401 response", async () => {
    const repo = createCaseTemplatesRepository({
      request: mockFetch({ message: "Unauthorized" }, 401),
      getToken: () => "bad-token",
    });

    await expect(repo.list()).rejects.toThrow(/access denied|Unauthorized/i);
  });

  it("list handles items with missing fields gracefully", async () => {
    const repo = createCaseTemplatesRepository({
      request: mockFetch({
        items: [
          { id: "t-1" },
          { id: "t-2", templateName: "Full", caseType: "bmv" },
          { noId: true },
        ],
      }),
      getToken: () => "test-token",
    });

    const result = await repo.list();
    expect(result.items).toHaveLength(2);
    expect(result.items[0].templateName).toBe("");
    expect(result.items[1].templateName).toBe("Full");
  });

  it("create sends POST and adapts response", async () => {
    let calledMethod = "";
    let calledBody = "";
    const repo = createCaseTemplatesRepository({
      request: async (_url: string | URL | Request, init?: RequestInit) => {
        calledMethod = init?.method ?? "";
        calledBody = (init?.body as string) ?? "";
        return {
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              id: "t-new",
              orgId: "org-1",
              templateName: "New Template",
              caseType: "dependent_visa",
              applicationType: null,
              blueprintItemCount: 0,
              reviewRequiredFlag: false,
              billingGateMode: "warn",
              activeFlag: true,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            }),
          headers: new Headers(),
        } as Response;
      },
      getToken: () => "test-token",
    });

    const result = await repo.create({
      templateName: "New Template",
      caseType: "dependent_visa",
    });
    expect(calledMethod).toBe("POST");
    expect(JSON.parse(calledBody)).toMatchObject({
      templateName: "New Template",
      caseType: "dependent_visa",
    });
    expect(result.id).toBe("t-new");
    expect(result.templateName).toBe("New Template");
  });

  it("update sends PATCH with id in URL", async () => {
    let calledUrl = "";
    let calledMethod = "";
    const repo = createCaseTemplatesRepository({
      request: async (url: string | URL | Request, init?: RequestInit) => {
        calledUrl = typeof url === "string" ? url : String(url);
        calledMethod = init?.method ?? "";
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: "t-1",
              orgId: "org-1",
              templateName: "Updated",
              caseType: "dependent_visa",
              applicationType: null,
              blueprintItemCount: 2,
              reviewRequiredFlag: true,
              billingGateMode: "warn",
              activeFlag: false,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-05-01T00:00:00.000Z",
            }),
          headers: new Headers(),
        } as Response;
      },
      getToken: () => "test-token",
    });

    const result = await repo.update("t-1", {
      templateName: "Updated",
      activeFlag: false,
    });
    expect(calledMethod).toBe("PATCH");
    expect(calledUrl).toContain("/t-1");
    expect(result.templateName).toBe("Updated");
    expect(result.activeFlag).toBe(false);
  });

  it("create throws on 403 response", async () => {
    const repo = createCaseTemplatesRepository({
      request: mockFetch({ message: "Forbidden" }, 403),
      getToken: () => "test-token",
    });

    await expect(
      repo.create({ templateName: "X", caseType: "bmv" }),
    ).rejects.toThrow();
  });

  it("getCaseTypeOptions adapts server response", async () => {
    const repo = createCaseTemplatesRepository({
      request: mockFetch({
        items: [
          { code: "dependent_visa", sort: 0 },
          { code: "work", sort: 1 },
          { code: "business_manager_visa", sort: 2 },
        ],
      }),
      getToken: () => "test-token",
    });

    const result = await repo.getCaseTypeOptions();
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ code: "dependent_visa", sort: 0 });
    expect(result[2]).toEqual({ code: "business_manager_visa", sort: 2 });
  });

  it("getCaseTypeOptions returns empty array for invalid response", async () => {
    const repo = createCaseTemplatesRepository({
      request: mockFetch({ unexpected: true }),
      getToken: () => "test-token",
    });

    await expect(repo.getCaseTypeOptions()).rejects.toThrow();
  });

  it("get fetches detail with requirementBlueprint", async () => {
    let calledUrl = "";
    const repo = createCaseTemplatesRepository({
      request: async (url: string | URL | Request) => {
        calledUrl = typeof url === "string" ? url : String(url);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: "t-1",
              orgId: "org-1",
              templateName: "Blueprint Template",
              caseType: "dependent_visa",
              applicationType: null,
              requirementBlueprint: { items: [{ code: "passport" }] },
              defaultTasksBlueprint: null,
              blueprintItemCount: 1,
              reviewRequiredFlag: true,
              billingGateMode: "block",
              activeFlag: true,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            }),
          headers: new Headers(),
        } as Response;
      },
      getToken: () => "test-token",
    });

    const result = await repo.get("t-1");
    expect(calledUrl).toContain("/t-1");
    expect(result.id).toBe("t-1");
    expect(result.templateName).toBe("Blueprint Template");
    expect(result.requirementBlueprint).toEqual({
      items: [{ code: "passport" }],
    });
    expect(result.defaultTasksBlueprint).toBeNull();
    expect(result.blueprintItemCount).toBe(1);
  });

  it("get throws on 404 response", async () => {
    const repo = createCaseTemplatesRepository({
      request: mockFetch({ message: "Not Found" }, 404),
      getToken: () => "test-token",
    });

    await expect(repo.get("non-existent")).rejects.toThrow();
  });
});
