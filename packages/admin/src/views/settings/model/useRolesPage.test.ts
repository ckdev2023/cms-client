import { describe, expect, it, vi, beforeEach } from "vitest";
import { useRolesPage } from "./useRolesPage";
import type {
  RolesAdminRepository,
  RoleItem,
  RoleDetailItem,
} from "./RolesAdminRepository";

function createMockRepo(
  overrides: Partial<RolesAdminRepository> = {},
): RolesAdminRepository {
  return {
    listRoles: vi.fn().mockResolvedValue([]),
    getRoleDetail: vi.fn().mockResolvedValue(null),
    createRole: vi.fn().mockResolvedValue(null),
    updateRole: vi.fn().mockResolvedValue(null),
    setRolePermissions: vi.fn().mockResolvedValue(null),
    deleteRole: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const SAMPLE_ROLES: RoleItem[] = [
  {
    id: "r1",
    orgId: "o1",
    code: "owner",
    name: "Owner",
    description: null,
    isSystem: true,
    memberCount: 1,
    createdBy: null,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "r2",
    orgId: "o1",
    code: "custom_role",
    name: "Custom Role",
    description: "A custom role",
    isSystem: false,
    memberCount: 3,
    createdBy: "u1",
    createdAt: "2024-02-01",
    updatedAt: "2024-02-01",
  },
];

const SAMPLE_DETAIL: RoleDetailItem = {
  ...SAMPLE_ROLES[1]!,
  permissions: ["case.view", "case.edit"],
};

async function flushPromises() {
  await new Promise((r) => setTimeout(r, 0));
}

describe("useRolesPage", () => {
  let repo: RolesAdminRepository;

  beforeEach(() => {
    repo = createMockRepo({
      listRoles: vi.fn().mockResolvedValue(SAMPLE_ROLES),
      getRoleDetail: vi.fn().mockResolvedValue(SAMPLE_DETAIL),
    });
  });

  it("loads roles on init", async () => {
    const page = useRolesPage({ repository: repo });
    await flushPromises();

    expect(page.roles.value).toHaveLength(2);
    expect(page.loading.value).toBe(false);
  });

  it("separates system and custom roles", async () => {
    const page = useRolesPage({ repository: repo });
    await flushPromises();

    expect(page.systemRoles.value).toHaveLength(1);
    expect(page.customRoles.value).toHaveLength(1);
    expect(page.systemRoles.value[0]!.code).toBe("owner");
  });

  it("selects role and switches to detail view", async () => {
    const page = useRolesPage({ repository: repo });
    await flushPromises();

    await page.selectRole("r2");
    expect(page.view.value).toBe("detail");
    expect(page.selectedRole.value?.code).toBe("custom_role");
  });

  it("backs to list view", async () => {
    const page = useRolesPage({ repository: repo });
    await flushPromises();
    await page.selectRole("r2");

    page.backToList();
    expect(page.view.value).toBe("list");
    expect(page.selectedRole.value).toBeNull();
  });

  it("creates role and reloads list", async () => {
    const created: RoleDetailItem = {
      id: "r-new",
      orgId: "o1",
      code: "new_role",
      name: "New",
      description: null,
      isSystem: false,
      memberCount: 0,
      createdBy: "u1",
      createdAt: "2024-03-01",
      updatedAt: "2024-03-01",
      permissions: ["case.view"],
    };
    repo = createMockRepo({
      listRoles: vi
        .fn()
        .mockResolvedValue([
          ...SAMPLE_ROLES,
          { ...created, permissions: undefined },
        ]),
      createRole: vi.fn().mockResolvedValue(created),
    });
    const page = useRolesPage({ repository: repo });
    await flushPromises();

    page.openCreate();
    expect(page.createModalOpen.value).toBe(true);

    await page.createRole({
      code: "new_role",
      name: "New",
      permissions: ["case.view"],
    });
    expect(page.createModalOpen.value).toBe(false);
    expect(page.view.value).toBe("detail");
    expect(page.selectedRole.value?.code).toBe("new_role");
  });

  it("opens create with from-role for copy", async () => {
    const page = useRolesPage({ repository: repo });
    await flushPromises();

    page.openCreate(SAMPLE_DETAIL);
    expect(page.createFromRole.value).toEqual(SAMPLE_DETAIL);
    expect(page.createModalOpen.value).toBe(true);
  });

  it("updates role metadata", async () => {
    const updated: RoleDetailItem = { ...SAMPLE_DETAIL, name: "Renamed" };
    repo = createMockRepo({
      listRoles: vi.fn().mockResolvedValue(SAMPLE_ROLES),
      getRoleDetail: vi.fn().mockResolvedValue(SAMPLE_DETAIL),
      updateRole: vi.fn().mockResolvedValue(updated),
    });
    const page = useRolesPage({ repository: repo });
    await flushPromises();
    await page.selectRole("r2");

    await page.updateRole("r2", { name: "Renamed" });
    expect(page.selectedRole.value?.name).toBe("Renamed");
  });

  it("saves permissions", async () => {
    const updated: RoleDetailItem = {
      ...SAMPLE_DETAIL,
      permissions: ["case.view", "case.export"],
    };
    repo = createMockRepo({
      listRoles: vi.fn().mockResolvedValue(SAMPLE_ROLES),
      getRoleDetail: vi.fn().mockResolvedValue(SAMPLE_DETAIL),
      setRolePermissions: vi.fn().mockResolvedValue(updated),
    });
    const page = useRolesPage({ repository: repo });
    await flushPromises();
    await page.selectRole("r2");

    await page.savePermissions("r2", ["case.view", "case.export"]);
    expect(page.selectedRole.value?.permissions).toEqual([
      "case.view",
      "case.export",
    ]);
  });

  it("deletes role and returns to list", async () => {
    repo = createMockRepo({
      listRoles: vi.fn().mockResolvedValue(SAMPLE_ROLES.slice(0, 1)),
      getRoleDetail: vi.fn().mockResolvedValue(SAMPLE_DETAIL),
      deleteRole: vi.fn().mockResolvedValue(undefined),
    });
    const page = useRolesPage({ repository: repo });
    await flushPromises();
    await page.selectRole("r2");

    page.openDelete(SAMPLE_ROLES[1]!);
    expect(page.deleteModalOpen.value).toBe(true);

    await page.deleteRole("r2");
    expect(page.deleteModalOpen.value).toBe(false);
    expect(page.view.value).toBe("list");
    expect(page.selectedRole.value).toBeNull();
  });

  it("sets error on load failure", async () => {
    repo = createMockRepo({
      listRoles: vi.fn().mockRejectedValue(new Error("Network error")),
    });
    const page = useRolesPage({ repository: repo });
    await flushPromises();

    expect(page.error.value).toBe("Network error");
    expect(page.loading.value).toBe(false);
  });

  it("sets error on select failure", async () => {
    repo = createMockRepo({
      listRoles: vi.fn().mockResolvedValue(SAMPLE_ROLES),
      getRoleDetail: vi.fn().mockRejectedValue(new Error("Not found")),
    });
    const page = useRolesPage({ repository: repo });
    await flushPromises();

    await page.selectRole("r999");
    expect(page.error.value).toBe("Not found");
    expect(page.view.value).toBe("list");
  });
});
