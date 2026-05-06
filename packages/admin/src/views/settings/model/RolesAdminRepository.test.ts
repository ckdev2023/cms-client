import { describe, expect, it, vi } from "vitest";
import {
  createRolesAdminRepository,
  adaptRoleItem,
  adaptRoleDetailItem,
  RolesAdminRepositoryError,
} from "./RolesAdminRepository";

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function createRepo(request: typeof fetch) {
  return createRolesAdminRepository({
    request,
    getToken: () => "test-token",
    apiBase: "/api/admin/roles",
  });
}

describe("RolesAdminRepository", () => {
  describe("adaptRoleItem", () => {
    it("adapts valid DTO", () => {
      const result = adaptRoleItem({
        id: "r1",
        orgId: "org1",
        code: "staff",
        name: "Staff",
        description: "desc",
        isSystem: true,
        memberCount: 5,
        createdBy: "u1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      });
      expect(result).toEqual({
        id: "r1",
        orgId: "org1",
        code: "staff",
        name: "Staff",
        description: "desc",
        isSystem: true,
        memberCount: 5,
        createdBy: "u1",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      });
    });

    it("returns null for invalid input", () => {
      expect(adaptRoleItem(null)).toBeNull();
      expect(adaptRoleItem("str")).toBeNull();
      expect(adaptRoleItem({ id: 123 })).toBeNull();
    });
  });

  describe("adaptRoleDetailItem", () => {
    it("includes permissions array", () => {
      const result = adaptRoleDetailItem({
        id: "r1",
        orgId: "org1",
        code: "custom",
        name: "Custom",
        description: null,
        isSystem: false,
        memberCount: 0,
        createdBy: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        permissions: ["case.view", "case.edit"],
      });
      expect(result?.permissions).toEqual(["case.view", "case.edit"]);
    });

    it("filters non-string permissions", () => {
      const result = adaptRoleDetailItem({
        id: "r1",
        orgId: "org1",
        code: "x",
        name: "X",
        permissions: ["case.view", 123, null],
      });
      expect(result?.permissions).toEqual(["case.view"]);
    });
  });

  describe("listRoles", () => {
    it("fetches and adapts roles array", async () => {
      const roles = [
        {
          id: "r1",
          orgId: "o1",
          code: "owner",
          name: "Owner",
          isSystem: true,
          memberCount: 1,
        },
        {
          id: "r2",
          orgId: "o1",
          code: "custom",
          name: "Custom",
          isSystem: false,
          memberCount: 0,
        },
      ];
      const request = mockFetch(roles);
      const repo = createRepo(request);

      const result = await repo.listRoles();
      expect(result).toHaveLength(2);
      expect(result[0]!.code).toBe("owner");
      expect(request).toHaveBeenCalledWith(
        "/api/admin/roles",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("throws on non-array response", async () => {
      const request = mockFetch({ items: [] });
      const repo = createRepo(request);

      await expect(repo.listRoles()).rejects.toThrow(RolesAdminRepositoryError);
    });
  });

  describe("getRoleDetail", () => {
    it("fetches role detail by id", async () => {
      const detail = {
        id: "r1",
        orgId: "o1",
        code: "staff",
        name: "Staff",
        isSystem: true,
        memberCount: 3,
        permissions: ["case.view"],
      };
      const request = mockFetch(detail);
      const repo = createRepo(request);

      const result = await repo.getRoleDetail("r1");
      expect(result.permissions).toEqual(["case.view"]);
      expect(request).toHaveBeenCalledWith(
        "/api/admin/roles/r1",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  describe("createRole", () => {
    it("posts new role and returns detail", async () => {
      const created = {
        id: "r-new",
        orgId: "o1",
        code: "auditor",
        name: "Auditor",
        isSystem: false,
        memberCount: 0,
        permissions: ["case.audit"],
      };
      const request = mockFetch(created);
      const repo = createRepo(request);

      const result = await repo.createRole({
        code: "auditor",
        name: "Auditor",
        permissions: ["case.audit"],
      });
      expect(result.id).toBe("r-new");
      expect(request).toHaveBeenCalledWith(
        "/api/admin/roles",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("updateRole", () => {
    it("patches role metadata", async () => {
      const updated = {
        id: "r1",
        orgId: "o1",
        code: "custom",
        name: "Updated",
        isSystem: false,
        memberCount: 0,
        permissions: [],
      };
      const request = mockFetch(updated);
      const repo = createRepo(request);

      const result = await repo.updateRole("r1", { name: "Updated" });
      expect(result.name).toBe("Updated");
    });
  });

  describe("setRolePermissions", () => {
    it("puts permissions array", async () => {
      const updated = {
        id: "r1",
        orgId: "o1",
        code: "custom",
        name: "Custom",
        isSystem: false,
        memberCount: 0,
        permissions: ["case.view", "case.edit"],
      };
      const request = mockFetch(updated);
      const repo = createRepo(request);

      const result = await repo.setRolePermissions("r1", [
        "case.view",
        "case.edit",
      ]);
      expect(result.permissions).toEqual(["case.view", "case.edit"]);
      expect(request).toHaveBeenCalledWith(
        "/api/admin/roles/r1/permissions",
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  describe("deleteRole", () => {
    it("deletes role by id", async () => {
      const request = mockFetch({ ok: true });
      const repo = createRepo(request);

      await expect(repo.deleteRole("r1")).resolves.toBeUndefined();
      expect(request).toHaveBeenCalledWith(
        "/api/admin/roles/r1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("error handling", () => {
    it("throws with server error message on 4xx", async () => {
      const request = mockFetch({ message: "Role not found" }, 404);
      const repo = createRepo(request);

      await expect(repo.getRoleDetail("x")).rejects.toThrow("Role not found");
    });

    it("throws on network failure", async () => {
      const request = vi.fn().mockRejectedValue(new Error("Network error"));
      const repo = createRepo(request);

      await expect(repo.listRoles()).rejects.toThrow(RolesAdminRepositoryError);
    });
  });
});
