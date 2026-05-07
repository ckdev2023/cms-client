import { describe, expect, it, vi } from "vitest";
import {
  createUsersAdminRepository,
  adaptMemberItem,
  UsersAdminRepositoryError,
} from "./UsersAdminRepository";

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function createRepo(request: typeof fetch) {
  return createUsersAdminRepository({
    request,
    getToken: () => "test-token",
    apiBase: "/api/users",
    groupsApiBase: "/api/groups",
  });
}

describe("adaptMemberItem", () => {
  it("adapts a full DTO with displayName, roleId and timestamps", () => {
    const result = adaptMemberItem({
      id: "u1",
      displayName: "田中太郎",
      email: "tanaka@example.com",
      role: "staff",
      roleId: "r1",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      disabledAt: null,
    });
    expect(result).toEqual({
      id: "u1",
      name: "田中太郎",
      email: "tanaka@example.com",
      role: "staff",
      roleId: "r1",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      disabledAt: null,
    });
  });

  it("prefers displayName over name", () => {
    const result = adaptMemberItem({
      id: "u1",
      displayName: "Display",
      name: "Raw",
      email: "x@e.com",
      role: "staff",
      roleId: null,
      status: "active",
    });
    expect(result?.name).toBe("Display");
  });

  it("falls back to name when displayName is absent", () => {
    const result = adaptMemberItem({
      id: "u1",
      name: "Fallback",
      email: "x@e.com",
      role: "staff",
      roleId: null,
      status: "active",
    });
    expect(result?.name).toBe("Fallback");
  });

  it("defaults email to empty string when missing", () => {
    const result = adaptMemberItem({
      id: "u1",
      name: "X",
      role: "staff",
      roleId: null,
      status: "active",
    });
    expect(result?.email).toBe("");
  });

  it("maps roleId to null when missing", () => {
    const result = adaptMemberItem({
      id: "u1",
      name: "X",
      email: "x@e.com",
      role: "staff",
      status: "active",
    });
    expect(result?.roleId).toBeNull();
  });

  it("maps disabledAt string", () => {
    const result = adaptMemberItem({
      id: "u1",
      name: "X",
      email: "x@e.com",
      role: "staff",
      roleId: null,
      status: "disabled",
      disabledAt: "2026-03-01T00:00:00.000Z",
    });
    expect(result?.disabledAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("returns null for non-object input", () => {
    expect(adaptMemberItem(null)).toBeNull();
    expect(adaptMemberItem("str")).toBeNull();
    expect(adaptMemberItem(42)).toBeNull();
  });

  it("returns null when id is missing", () => {
    expect(adaptMemberItem({ name: "X", email: "x@e.com" })).toBeNull();
  });
});

describe("UsersAdminRepository.listMembers", () => {
  it("parses { items } wrapper with full DTO fields", async () => {
    const items = [
      {
        id: "u1",
        displayName: "田中太郎",
        email: "tanaka@example.com",
        role: "staff",
        roleId: "r1",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        disabledAt: null,
      },
      {
        id: "u2",
        displayName: "鈴木",
        email: "suzuki@example.com",
        role: "owner",
        roleId: "r2",
        status: "active",
        createdAt: "2026-02-01T00:00:00.000Z",
        disabledAt: null,
      },
    ];
    const request = mockFetch({ items });
    const repo = createRepo(request);

    const result = await repo.listMembers();
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("田中太郎");
    expect(result[0]!.roleId).toBe("r1");
    expect(result[0]!.email).toBe("tanaka@example.com");
    expect(result[0]!.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result[1]!.roleId).toBe("r2");
  });

  it("throws on invalid response shape", async () => {
    const request = mockFetch("not-json-object");
    const repo = createRepo(request);

    await expect(repo.listMembers()).rejects.toThrow(UsersAdminRepositoryError);
  });

  it("filters out invalid items", async () => {
    const items = [
      { id: "u1", displayName: "Valid", email: "v@e.com", role: "staff" },
      null,
      "invalid",
      { noId: true },
    ];
    const request = mockFetch({ items });
    const repo = createRepo(request);

    const result = await repo.listMembers();
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("u1");
  });
});

describe("UsersAdminRepository.createMember", () => {
  it("posts and adapts created member with roleId", async () => {
    const created = {
      id: "u-new",
      name: "New User",
      email: "new@e.com",
      role: "staff",
      roleId: "r1",
      status: "active",
      createdAt: "2026-05-01T00:00:00.000Z",
      disabledAt: null,
    };
    const request = mockFetch(created);
    const repo = createRepo(request);

    const result = await repo.createMember({
      name: "New User",
      email: "new@e.com",
      role: "staff",
      initialPassword: "pw1",
    });
    expect(result.id).toBe("u-new");
    expect(result.roleId).toBe("r1");
    expect(request).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("error handling", () => {
  it("throws with server error message on 4xx", async () => {
    const request = mockFetch({ message: "USER_DUPLICATE_EMAIL" }, 422);
    const repo = createRepo(request);

    await expect(
      repo.createMember({
        name: "X",
        email: "dup@e.com",
        role: "staff",
        initialPassword: "pw",
      }),
    ).rejects.toThrow("USER_DUPLICATE_EMAIL");
  });

  it("throws on network failure", async () => {
    const request = vi.fn().mockRejectedValue(new Error("Network error"));
    const repo = createRepo(request);

    await expect(repo.listMembers()).rejects.toThrow(UsersAdminRepositoryError);
  });
});
