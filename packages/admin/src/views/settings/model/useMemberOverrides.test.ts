import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMemberOverrides } from "./useMemberOverrides";
import type { PermissionOverridesRepository } from "./PermissionOverridesRepository";
import type { RolesAdminRepository } from "./RolesAdminRepository";
import type { MemberItem } from "./UsersAdminRepository";

function stubOverridesRepo(
  overrides: Partial<PermissionOverridesRepository> = {},
): PermissionOverridesRepository {
  return {
    listOverrides: vi.fn().mockResolvedValue([]),
    setOverrides: vi.fn().mockResolvedValue([]),
    deleteOverride: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function stubRolesRepo(
  overrides: Partial<RolesAdminRepository> = {},
): RolesAdminRepository {
  return {
    listRoles: vi.fn().mockResolvedValue([]),
    getRoleDetail: vi.fn().mockResolvedValue({
      id: "role1",
      orgId: "org1",
      code: "staff",
      name: "Staff",
      description: null,
      isSystem: true,
      memberCount: 3,
      createdBy: null,
      createdAt: "",
      updatedAt: "",
      permissions: ["case.view", "case.edit", "customer.view"],
    }),
    createRole: vi.fn().mockResolvedValue(null),
    updateRole: vi.fn().mockResolvedValue(null),
    setRolePermissions: vi.fn().mockResolvedValue(null),
    deleteRole: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const TEST_MEMBER: MemberItem = {
  id: "u1",
  name: "Test User",
  email: "test@example.com",
  role: "staff",
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
  disabledAt: null,
};

describe("useMemberOverrides", () => {
  let overridesRepo: PermissionOverridesRepository;
  let rolesRepo: RolesAdminRepository;

  beforeEach(() => {
    overridesRepo = stubOverridesRepo();
    rolesRepo = stubRolesRepo();
  });

  it("initializes with closed state", () => {
    const hook = useMemberOverrides({
      overridesRepository: overridesRepo,
      rolesRepository: rolesRepo,
    });
    expect(hook.open.value).toBe(false);
    expect(hook.member.value).toBeNull();
    expect(hook.overrides.value).toEqual([]);
  });

  describe("openDrawer", () => {
    it("loads overrides and role detail for member", async () => {
      const overrides = [
        {
          userId: "u1",
          permission: "case.export",
          effect: "deny" as const,
          reason: "restricted",
          grantedBy: "admin",
          grantedAt: "2025-01-01T00:00:00Z",
          expiresAt: null,
        },
      ];
      overridesRepo = stubOverridesRepo({
        listOverrides: vi.fn().mockResolvedValue(overrides),
      });

      const hook = useMemberOverrides({
        overridesRepository: overridesRepo,
        rolesRepository: rolesRepo,
      });

      await hook.openDrawer(TEST_MEMBER, "role1");

      expect(hook.open.value).toBe(true);
      expect(hook.member.value).toEqual(TEST_MEMBER);
      expect(hook.overrides.value).toEqual(overrides);
      expect(hook.roleDetail.value?.permissions).toContain("case.view");
      expect(hook.loading.value).toBe(false);
    });

    it("handles error gracefully", async () => {
      overridesRepo = stubOverridesRepo({
        listOverrides: vi.fn().mockRejectedValue(new Error("Network error")),
      });

      const hook = useMemberOverrides({
        overridesRepository: overridesRepo,
        rolesRepository: rolesRepo,
      });

      await hook.openDrawer(TEST_MEMBER, "role1");

      expect(hook.error.value).toBe("Network error");
      expect(hook.loading.value).toBe(false);
    });
  });

  describe("effectiveRows", () => {
    it("computes merged effective permissions", async () => {
      const overrides = [
        {
          userId: "u1",
          permission: "case.export",
          effect: "grant" as const,
          reason: "temporary access",
          grantedBy: "admin",
          grantedAt: "2025-01-01T00:00:00Z",
          expiresAt: null,
        },
        {
          userId: "u1",
          permission: "case.view",
          effect: "deny" as const,
          reason: "revoked",
          grantedBy: "admin",
          grantedAt: "2025-01-01T00:00:00Z",
          expiresAt: null,
        },
      ];
      overridesRepo = stubOverridesRepo({
        listOverrides: vi.fn().mockResolvedValue(overrides),
      });

      const hook = useMemberOverrides({
        overridesRepository: overridesRepo,
        rolesRepository: rolesRepo,
      });

      await hook.openDrawer(TEST_MEMBER, "role1");

      const rows = hook.effectiveRows.value;

      const caseView = rows.find((r) => r.code === "case.view");
      expect(caseView?.fromRole).toBe(true);
      expect(caseView?.overrideEffect).toBe("deny");
      expect(caseView?.effective).toBe(false);

      const caseExport = rows.find((r) => r.code === "case.export");
      expect(caseExport?.fromRole).toBe(false);
      expect(caseExport?.overrideEffect).toBe("grant");
      expect(caseExport?.effective).toBe(true);

      const caseEdit = rows.find((r) => r.code === "case.edit");
      expect(caseEdit?.fromRole).toBe(true);
      expect(caseEdit?.overrideEffect).toBeNull();
      expect(caseEdit?.effective).toBe(true);
    });
  });

  describe("addOverride", () => {
    it("merges new override with existing and calls setOverrides", async () => {
      const existingOverrides = [
        {
          userId: "u1",
          permission: "case.export",
          effect: "deny" as const,
          reason: "restricted",
          grantedBy: "admin",
          grantedAt: "2025-01-01T00:00:00Z",
          expiresAt: null,
        },
      ];
      const updatedOverrides = [
        ...existingOverrides,
        {
          userId: "u1",
          permission: "case.audit",
          effect: "grant" as const,
          reason: "needs audit",
          grantedBy: "admin",
          grantedAt: "2025-02-01T00:00:00Z",
          expiresAt: null,
        },
      ];

      const setFn = vi.fn().mockResolvedValue(updatedOverrides);
      overridesRepo = stubOverridesRepo({
        listOverrides: vi.fn().mockResolvedValue(existingOverrides),
        setOverrides: setFn,
      });

      const hook = useMemberOverrides({
        overridesRepository: overridesRepo,
        rolesRepository: rolesRepo,
      });

      await hook.openDrawer(TEST_MEMBER, "role1");
      await hook.addOverride({
        permission: "case.audit",
        effect: "grant",
        reason: "needs audit",
      });

      expect(setFn).toHaveBeenCalledWith("u1", [
        { permission: "case.export", effect: "deny", reason: "restricted" },
        { permission: "case.audit", effect: "grant", reason: "needs audit" },
      ]);
      expect(hook.overrides.value).toEqual(updatedOverrides);
      expect(hook.addModalOpen.value).toBe(false);
    });
  });

  describe("deleteOverride", () => {
    it("removes override from list", async () => {
      const existingOverrides = [
        {
          userId: "u1",
          permission: "case.export",
          effect: "deny" as const,
          reason: "restricted",
          grantedBy: "admin",
          grantedAt: "2025-01-01T00:00:00Z",
          expiresAt: null,
        },
      ];
      overridesRepo = stubOverridesRepo({
        listOverrides: vi.fn().mockResolvedValue(existingOverrides),
        deleteOverride: vi.fn().mockResolvedValue(undefined),
      });

      const hook = useMemberOverrides({
        overridesRepository: overridesRepo,
        rolesRepository: rolesRepo,
      });

      await hook.openDrawer(TEST_MEMBER, "role1");
      await hook.deleteOverride("case.export");

      expect(hook.overrides.value).toEqual([]);
      expect(hook.deleteModalOpen.value).toBe(false);
    });
  });

  describe("availablePermissionsForAdd", () => {
    it("excludes already-overridden permissions", async () => {
      const overrides = [
        {
          userId: "u1",
          permission: "case.export",
          effect: "deny" as const,
          reason: "restricted",
          grantedBy: "admin",
          grantedAt: "2025-01-01T00:00:00Z",
          expiresAt: null,
        },
      ];
      overridesRepo = stubOverridesRepo({
        listOverrides: vi.fn().mockResolvedValue(overrides),
      });

      const hook = useMemberOverrides({
        overridesRepository: overridesRepo,
        rolesRepository: rolesRepo,
      });

      await hook.openDrawer(TEST_MEMBER, "role1");

      expect(hook.availablePermissionsForAdd.value).not.toContain(
        "case.export",
      );
      expect(hook.availablePermissionsForAdd.value).toContain("case.view");
    });
  });

  describe("closeDrawer", () => {
    it("resets state", async () => {
      const hook = useMemberOverrides({
        overridesRepository: overridesRepo,
        rolesRepository: rolesRepo,
      });

      await hook.openDrawer(TEST_MEMBER, "role1");
      hook.closeDrawer();

      expect(hook.open.value).toBe(false);
      expect(hook.member.value).toBeNull();
    });
  });

  describe("toggleAudit", () => {
    it("toggles audit expanded state", () => {
      const hook = useMemberOverrides({
        overridesRepository: overridesRepo,
        rolesRepository: rolesRepo,
      });

      expect(hook.auditExpanded.value).toBe(false);
      hook.toggleAudit();
      expect(hook.auditExpanded.value).toBe(true);
      hook.toggleAudit();
      expect(hook.auditExpanded.value).toBe(false);
    });
  });
});
