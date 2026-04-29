import { describe, expect, it, vi } from "vitest";

import {
  GroupsRepositoryError,
  createGroupsRepository,
} from "./GroupsRepository";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function textResponse(text: string, init?: ResponseInit): Response {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
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

function failingFetch(): typeof fetch {
  return vi.fn(async () => {
    throw new TypeError("Failed to fetch");
  }) as unknown as typeof fetch;
}

// ---------------------------------------------------------------------------
// Backend DTO fixtures
// ---------------------------------------------------------------------------

const SUMMARY_DTO_1 = {
  id: "g-1",
  name: "Team Alpha",
  activeFlag: true,
  createdAt: "2026-04-01T00:00:00.000Z",
  activeCaseCount: 3,
  memberCount: 5,
};

const SUMMARY_DTO_2 = {
  id: "g-2",
  name: "Team Beta",
  activeFlag: false,
  createdAt: "2026-04-02T00:00:00.000Z",
  activeCaseCount: 0,
  memberCount: 2,
};

const DETAIL_DTO = {
  id: "g-1",
  name: "Team Alpha",
  activeFlag: true,
  createdAt: "2026-04-01T00:00:00.000Z",
  groupNo: "GRP-001",
  description: "Main team",
  members: [
    { userName: "Tanaka", userRole: "manager", joinedAt: "2026-04-01" },
  ],
  references: { customerCount: 7, caseCount: 3 },
};

const EXPECTED_SUM_1 = {
  id: "g-1",
  name: "Team Alpha",
  status: "active",
  createdAt: "2026-04-01T00:00:00.000Z",
  activeCaseCount: 3,
  memberCount: 5,
};

const EXPECTED_SUM_2 = {
  id: "g-2",
  name: "Team Beta",
  status: "disabled",
  createdAt: "2026-04-02T00:00:00.000Z",
  activeCaseCount: 0,
  memberCount: 2,
};

const EXPECTED_DETAIL = {
  id: "g-1",
  name: "Team Alpha",
  status: "active",
  createdAt: "2026-04-01T00:00:00.000Z",
  activeCaseCount: 3,
  memberCount: 1,
  groupNo: "GRP-001",
  description: "Main team",
  members: [{ name: "Tanaka", role: "manager", joinedAt: "2026-04-01" }],
  customerCount: 7,
};

const EXPECTED_AS_SUMMARY = {
  id: "g-1",
  name: "Team Alpha",
  status: "active",
  createdAt: "2026-04-01T00:00:00.000Z",
  activeCaseCount: 3,
  memberCount: 1,
};

const EXPECTED_STATS = {
  stats: { customerCount: 7, activeCaseCount: 3 },
};

// ---------------------------------------------------------------------------
// createGroupsRepository
// ---------------------------------------------------------------------------

describe("createGroupsRepository", () => {
  const TOKEN = "test-jwt";
  const factory = (
    handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
  ) =>
    createGroupsRepository({
      request: createRequestMock(handler),
      getToken: () => TOKEN,
      apiBase: "/api/groups",
    });

  // ---- listGroups --------------------------------------------------------

  describe("listGroups", () => {
    it("fetches groups with auth header", async () => {
      const repo = factory((input, init) => {
        expect(String(input)).toBe("/api/groups");
        expect(init?.method).toBe("GET");
        expect(init?.headers).toMatchObject({
          Authorization: `Bearer ${TOKEN}`,
        });
        return jsonResponse({ items: [SUMMARY_DTO_1, SUMMARY_DTO_2] });
      });
      await expect(repo.listGroups()).resolves.toEqual([
        EXPECTED_SUM_1,
        EXPECTED_SUM_2,
      ]);
    });

    it("appends status param", async () => {
      const repo = factory((input) => {
        expect(String(input)).toBe("/api/groups?status=active");
        return jsonResponse({ items: [SUMMARY_DTO_1] });
      });
      await expect(repo.listGroups("active")).resolves.toEqual([
        EXPECTED_SUM_1,
      ]);
    });

    it("returns empty array", async () => {
      const repo = factory(() => jsonResponse({ items: [] }));
      await expect(repo.listGroups()).resolves.toEqual([]);
    });

    it("throws on 403", async () => {
      const repo = factory(() =>
        jsonResponse({ message: "Forbidden" }, { status: 403 }),
      );
      const e = await repo.listGroups().catch((x: unknown) => x);
      expect(e).toBeInstanceOf(GroupsRepositoryError);
      expect((e as GroupsRepositoryError).status).toBe(403);
    });

    it("throws on network failure", async () => {
      const repo = createGroupsRepository({
        request: failingFetch(),
        getToken: () => TOKEN,
      });
      const e = await repo.listGroups().catch((x: unknown) => x);
      expect(e).toBeInstanceOf(GroupsRepositoryError);
      expect((e as GroupsRepositoryError).status).toBeUndefined();
      expect((e as GroupsRepositoryError).cause).toBeInstanceOf(TypeError);
    });

    it("throws on unparseable JSON (SyntaxError)", async () => {
      const repo = factory(() => textResponse("not-json{"));
      await expect(repo.listGroups()).rejects.toThrow();
    });

    it("throws when items wrapper missing", async () => {
      const repo = factory(() => jsonResponse({ data: [] }));
      const e = await repo.listGroups().catch((x: unknown) => x);
      expect(e).toBeInstanceOf(GroupsRepositoryError);
    });

    it("filters bad items", async () => {
      const repo = factory(() =>
        jsonResponse({ items: [SUMMARY_DTO_1, { bad: true }] }),
      );
      await expect(repo.listGroups()).resolves.toEqual([EXPECTED_SUM_1]);
    });
  });

  // ---- getGroupDetail ----------------------------------------------------

  describe("getGroupDetail", () => {
    it("fetches detail by id", async () => {
      const repo = factory((input, init) => {
        expect(String(input)).toBe("/api/groups/g-1");
        expect(init?.method).toBe("GET");
        return jsonResponse(DETAIL_DTO);
      });
      await expect(repo.getGroupDetail("g-1")).resolves.toEqual(
        EXPECTED_DETAIL,
      );
    });

    it("encodes id", async () => {
      const repo = factory((input) => {
        expect(String(input)).toBe("/api/groups/a%2Fb");
        return jsonResponse(DETAIL_DTO);
      });
      await expect(repo.getGroupDetail("a/b")).resolves.toEqual(
        EXPECTED_DETAIL,
      );
    });

    it("throws on 404 with server message", async () => {
      const repo = factory(() =>
        jsonResponse({ message: "Not found" }, { status: 404 }),
      );
      const e = await repo.getGroupDetail("x").catch((x: unknown) => x);
      expect(e).toBeInstanceOf(GroupsRepositoryError);
      expect((e as GroupsRepositoryError).status).toBe(404);
      expect((e as GroupsRepositoryError).message).toBe("Not found");
    });

    it("throws on network failure", async () => {
      const repo = createGroupsRepository({
        request: failingFetch(),
        getToken: () => TOKEN,
      });
      await expect(repo.getGroupDetail("g-1")).rejects.toBeInstanceOf(
        GroupsRepositoryError,
      );
    });

    it("throws on invalid shape", async () => {
      const repo = factory(() => jsonResponse({ wrong: true }));
      await expect(repo.getGroupDetail("g-1")).rejects.toThrow(
        GroupsRepositoryError,
      );
    });

    it("throws on broken JSON", async () => {
      const repo = factory(() => textResponse("{broken"));
      await expect(repo.getGroupDetail("g-1")).rejects.toThrow();
    });
  });

  // ---- createGroup -------------------------------------------------------

  describe("createGroup", () => {
    it("posts and returns adapted summary", async () => {
      const repo = factory((input, init) => {
        expect(String(input)).toBe("/api/groups");
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({
          "Content-Type": "application/json",
        });
        expect(JSON.parse(init?.body as string)).toEqual({ name: "New" });
        return jsonResponse(DETAIL_DTO);
      });
      await expect(repo.createGroup({ name: "New" })).resolves.toEqual(
        EXPECTED_AS_SUMMARY,
      );
    });

    it("throws on 422", async () => {
      const repo = factory(() =>
        jsonResponse({ message: "Group name already exists" }, { status: 422 }),
      );
      const e = await repo
        .createGroup({ name: "Dup" })
        .catch((x: unknown) => x);
      expect(e).toBeInstanceOf(GroupsRepositoryError);
      expect((e as GroupsRepositoryError).status).toBe(422);
    });

    it("throws on network failure", async () => {
      const repo = createGroupsRepository({
        request: failingFetch(),
        getToken: () => TOKEN,
      });
      await expect(repo.createGroup({ name: "X" })).rejects.toBeInstanceOf(
        GroupsRepositoryError,
      );
    });

    it("throws on malformed response", async () => {
      const repo = factory(() => textResponse("<html>"));
      await expect(repo.createGroup({ name: "X" })).rejects.toThrow();
    });

    it("throws on invalid schema", async () => {
      const repo = factory(() => jsonResponse({ noId: true }));
      await expect(repo.createGroup({ name: "X" })).rejects.toThrow(
        GroupsRepositoryError,
      );
    });
  });

  // ---- renameGroup -------------------------------------------------------

  describe("renameGroup", () => {
    it("patches name and returns updated summary", async () => {
      const dto = { ...DETAIL_DTO, name: "Renamed" };
      const repo = factory((input, init) => {
        expect(String(input)).toBe("/api/groups/g-1");
        expect(init?.method).toBe("PATCH");
        expect(JSON.parse(init?.body as string)).toEqual({ name: "Renamed" });
        return jsonResponse(dto);
      });
      await expect(repo.renameGroup("g-1", "Renamed")).resolves.toMatchObject({
        name: "Renamed",
      });
    });

    it("throws on 422", async () => {
      const repo = factory(() =>
        jsonResponse({ message: "Duplicate" }, { status: 422 }),
      );
      const e = await repo.renameGroup("g-1", "Dup").catch((x: unknown) => x);
      expect(e).toBeInstanceOf(GroupsRepositoryError);
      expect((e as GroupsRepositoryError).status).toBe(422);
    });

    it("throws on network failure", async () => {
      const repo = createGroupsRepository({
        request: failingFetch(),
        getToken: () => TOKEN,
      });
      await expect(repo.renameGroup("g-1", "X")).rejects.toBeInstanceOf(
        GroupsRepositoryError,
      );
    });

    it("throws on broken JSON", async () => {
      const repo = factory(() => textResponse("{bad"));
      await expect(repo.renameGroup("g-1", "X")).rejects.toThrow();
    });

    it("throws on invalid schema", async () => {
      const repo = factory(() => jsonResponse({ random: 1 }));
      await expect(repo.renameGroup("g-1", "X")).rejects.toThrow(
        GroupsRepositoryError,
      );
    });
  });

  // ---- disableGroup ------------------------------------------------------

  describe("disableGroup", () => {
    it("posts with reason and returns stats", async () => {
      const repo = factory((input, init) => {
        expect(String(input)).toBe("/api/groups/g-1/disable");
        expect(init?.method).toBe("POST");
        expect(JSON.parse(init?.body as string)).toEqual({
          reason: "restructure",
        });
        return jsonResponse(DETAIL_DTO);
      });
      await expect(repo.disableGroup("g-1", "restructure")).resolves.toEqual(
        EXPECTED_STATS,
      );
    });

    it("omits reason key when undefined", async () => {
      const repo = factory((_input, init) => {
        const parsed = JSON.parse(init?.body as string) as Record<
          string,
          unknown
        >;
        expect(parsed).not.toHaveProperty("reason");
        return jsonResponse(DETAIL_DTO);
      });
      await expect(repo.disableGroup("g-1")).resolves.toEqual(EXPECTED_STATS);
    });

    it("throws on 409", async () => {
      const repo = factory(() =>
        jsonResponse({ message: "Already disabled" }, { status: 409 }),
      );
      const e = await repo.disableGroup("g-1").catch((x: unknown) => x);
      expect(e).toBeInstanceOf(GroupsRepositoryError);
      expect((e as GroupsRepositoryError).status).toBe(409);
    });

    it("throws on network failure", async () => {
      const repo = createGroupsRepository({
        request: failingFetch(),
        getToken: () => TOKEN,
      });
      await expect(repo.disableGroup("g-1")).rejects.toBeInstanceOf(
        GroupsRepositoryError,
      );
    });

    it("throws when no references", async () => {
      const repo = factory(() => jsonResponse({ id: "g-1", name: "X" }));
      await expect(repo.disableGroup("g-1")).rejects.toThrow(
        GroupsRepositoryError,
      );
    });

    it("throws on broken JSON", async () => {
      const repo = factory(() => textResponse("{{bad"));
      await expect(repo.disableGroup("g-1")).rejects.toThrow();
    });
  });

  // ---- Cross-cutting -----------------------------------------------------

  describe("when token is null", () => {
    it("omits Authorization header", async () => {
      const repo = createGroupsRepository({
        request: createRequestMock((_input, init) => {
          const h = init?.headers as Record<string, string>;
          expect(h).not.toHaveProperty("Authorization");
          return jsonResponse({ items: [SUMMARY_DTO_1] });
        }),
        getToken: () => null,
      });
      await expect(repo.listGroups()).resolves.toEqual([EXPECTED_SUM_1]);
    });
  });

  describe("error message extraction", () => {
    it("uses body.message when present", async () => {
      const repo = factory(() =>
        jsonResponse({ message: "Custom" }, { status: 400 }),
      );
      const e = await repo.listGroups().catch((x: unknown) => x);
      expect((e as GroupsRepositoryError).message).toBe("Custom");
    });

    it("falls back to status text", async () => {
      const repo = factory(() => jsonResponse({}, { status: 500 }));
      const e = await repo.listGroups().catch((x: unknown) => x);
      expect((e as GroupsRepositoryError).message).toBe(
        "Groups request failed with status 500",
      );
    });
  });
});
