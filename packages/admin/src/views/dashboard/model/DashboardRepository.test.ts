import { describe, expect, it, vi } from "vitest";
import {
  createDashboardRepository,
  DashboardRepositoryError,
} from "./DashboardRepository";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("createDashboardRepository", () => {
  it("requests dashboard summary with query params and bearer token", async () => {
    const request = vi.fn().mockResolvedValue(
      jsonResponse({
        scope: "mine",
        timeWindow: 7,
        summary: {
          todayTasks: 6,
          upcomingCases: 3,
          pendingSubmissions: 2,
          riskCases: 1,
        },
        panels: {
          todo: [],
          deadlines: [],
          submissions: [],
          risks: [],
        },
      }),
    );
    const repo = createDashboardRepository({
      request,
      getToken: () => "token-123",
    });

    const result = await repo.getSummary({ scope: "mine", timeWindow: 7 });

    expect(result.summary.todayTasks).toBe(6);
    expect(request).toHaveBeenCalledWith(
      "/api/dashboard/summary?scope=mine&timeWindow=7",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer token-123",
        },
      },
    );
  });

  it("omits authorization header when token is absent", async () => {
    const request = vi.fn().mockResolvedValue(
      jsonResponse({
        scope: "all",
        timeWindow: 30,
        summary: {
          todayTasks: 10,
          upcomingCases: 8,
          pendingSubmissions: 5,
          riskCases: 2,
        },
        panels: {
          todo: [],
          deadlines: [],
          submissions: [],
          risks: [],
        },
      }),
    );
    const repo = createDashboardRepository({ request, getToken: () => null });

    await repo.getSummary({ scope: "all", timeWindow: 30 });

    expect(request).toHaveBeenCalledWith(
      "/api/dashboard/summary?scope=all&timeWindow=30",
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );
  });

  it("throws unauthorized error on 401 response", async () => {
    const repo = createDashboardRepository({
      request: vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ message: "Unauthorized" }, { status: 401 }),
        ),
    });
    const expectedError: Partial<DashboardRepositoryError> = {
      name: "DashboardRepositoryError",
      code: "UNAUTHORIZED",
      status: 401,
      message: "Unauthorized",
    };

    await expect(
      repo.getSummary({ scope: "mine", timeWindow: 7 }),
    ).rejects.toMatchObject(expectedError);
  });

  it("throws invalid-response error when payload shape is unexpected", async () => {
    const repo = createDashboardRepository({
      request: vi.fn().mockResolvedValue(jsonResponse({ scope: "mine" })),
    });
    const expectedError: Partial<DashboardRepositoryError> = {
      name: "DashboardRepositoryError",
      code: "INVALID_RESPONSE",
    };

    await expect(
      repo.getSummary({ scope: "mine", timeWindow: 7 }),
    ).rejects.toMatchObject(expectedError);
  });

  it("normalizes numeric strings and nullable optional fields", async () => {
    const repo = createDashboardRepository({
      request: vi.fn().mockResolvedValue(
        jsonResponse({
          scope: "mine",
          timeWindow: "7",
          summary: {
            todayTasks: "6",
            upcomingCases: 3,
            pendingSubmissions: "2",
            riskCases: 1,
          },
          panels: {
            todo: [],
            deadlines: [
              {
                id: "case-1",
                title: "在留资格更新",
                meta: ["负责人：Suzuki"],
                desc: "当前阶段：S5",
                status: "warn",
                statusLabel: "剩余 3 天",
                action: "查看案件",
                route: null,
                daysLeft: "3",
              },
            ],
            submissions: [],
            risks: [],
          },
        }),
      ),
    });

    const result = await repo.getSummary({ scope: "mine", timeWindow: 7 });

    expect(result.timeWindow).toBe(7);
    expect(result.summary.todayTasks).toBe(6);
    expect(result.summary.pendingSubmissions).toBe(2);
    expect(result.panels.deadlines[0]).toMatchObject({
      id: "case-1",
      route: undefined,
      daysLeft: 3,
    });
  });
});
