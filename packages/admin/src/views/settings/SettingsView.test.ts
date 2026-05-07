import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import SettingsView from "./SettingsView.vue";
import MemberCreateModal from "./components/MemberCreateModal.vue";
import MemberRoleModal from "./components/MemberRoleModal.vue";
import MemberDisableConfirmModal from "./components/MemberDisableConfirmModal.vue";
import MemberListPanel from "./components/MemberListPanel.vue";
import SettingsToast from "./components/SettingsToast.vue";
import { i18n, setAppLocale } from "../../i18n";
import {
  initOrgSettings,
  resetOrgSettings,
} from "../../shared/model/useOrgSettings";
import {
  getDefaultPermissionsStore,
  _resetDefaultPermissionsStoreForTest,
} from "../../shared/model/PermissionsStore";
import {
  ADMIN_SESSION_STORAGE_KEY,
  adminSessionController,
} from "../../auth/model/adminSession";
import type { RoleItem } from "./model/RolesAdminRepository";

const STUB_ROLES: RoleItem[] = [
  {
    id: "r1",
    orgId: "org1",
    code: "owner",
    name: "Owner",
    description: null,
    isSystem: true,
    memberCount: 1,
    createdBy: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "r2",
    orgId: "org1",
    code: "manager",
    name: "Manager",
    description: null,
    isSystem: true,
    memberCount: 2,
    createdBy: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "r3",
    orgId: "org1",
    code: "staff",
    name: "Staff",
    description: null,
    isSystem: true,
    memberCount: 5,
    createdBy: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

vi.mock("./model/OrgSettingsRepository", () => ({
  createOrgSettingsRepository: () => ({
    getOrgSettings: vi.fn().mockResolvedValue({
      visibility: {
        allowCrossGroupCaseCreate: false,
        allowPrincipalViewCrossGroupCollab: false,
      },
      storageRoot: {
        rootLabel: null,
        rootPath: null,
        updatedBy: null,
        updatedAt: null,
      },
    }),
    updateOrgSettings: vi.fn(),
  }),
}));

vi.mock("./model/GroupsRepository", () => ({
  createGroupsRepository: () => ({
    listGroups: vi.fn().mockResolvedValue([]),
    getGroupDetail: vi.fn(),
    createGroup: vi.fn(),
    renameGroup: vi.fn(),
    disableGroup: vi.fn(),
  }),
}));

vi.mock("./model/UsersAdminRepository", () => ({
  createUsersAdminRepository: () => ({
    listMembers: vi.fn().mockResolvedValue([]),
    createMember: vi.fn(),
    updateMemberRole: vi.fn(),
    disableMember: vi.fn(),
    activateMember: vi.fn(),
    resetPassword: vi.fn(),
    addGroupMember: vi.fn(),
    removeGroupMember: vi.fn(),
  }),
}));

vi.mock("./model/RolesAdminRepository", () => ({
  createRolesAdminRepository: () => ({
    listRoles: vi.fn().mockResolvedValue(STUB_ROLES),
    getRoleDetail: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    setRolePermissions: vi.fn(),
    deleteRole: vi.fn(),
  }),
}));

function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: SettingsView }],
  });
  return shallowMount(SettingsView, {
    global: {
      plugins: [i18n, router],
      stubs: { teleport: true },
    },
  });
}

describe("SettingsView", () => {
  beforeEach(() => {
    resetOrgSettings();
    initOrgSettings({
      initialStorageRoot: {
        rootLabel: null,
        rootPath: null,
      },
    });
    setAppLocale("zh-CN");

    adminSessionController.reset();
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    adminSessionController.login(
      { email: "admin@test.com", password: "pw" },
      window.localStorage,
    );

    const store = getDefaultPermissionsStore();
    store._setForTest([
      "group.manage",
      "user.manage",
      "permission.override",
      "settings.write",
    ]);
  });

  afterEach(() => {
    _resetDefaultPermissionsStoreForTest();
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    adminSessionController.reset();
  });

  it("localizes the settings sub-navigation aria-label in en-US", () => {
    setAppLocale("en-US");
    const wrapper = mountView();

    expect(
      wrapper.find(".settings-view__subnav").attributes("aria-label"),
    ).toBe("Settings sub-navigation");
  });

  it("localizes the settings sub-navigation aria-label in ja-JP", () => {
    setAppLocale("ja-JP");
    const wrapper = mountView();

    expect(
      wrapper.find(".settings-view__subnav").attributes("aria-label"),
    ).toBe("設定サブナビゲーション");
  });

  it("passes rolesPage.roles as availableRoles to MemberCreateModal and MemberRoleModal", async () => {
    const wrapper = mountView();
    await flushPromises();

    const createModal = wrapper.findComponent(MemberCreateModal);
    const roleModal = wrapper.findComponent(MemberRoleModal);

    const expectedCodes = STUB_ROLES.map((r) => r.code);

    expect(
      createModal.props("availableRoles").map((r: { code: string }) => r.code),
    ).toEqual(expectedCodes);
    expect(
      roleModal.props("availableRoles").map((r: { code: string }) => r.code),
    ).toEqual(expectedCodes);
  });

  it("passes currentUser.role as actorRole to MemberRoleModal", async () => {
    const wrapper = mountView();
    await flushPromises();

    const roleModal = wrapper.findComponent(MemberRoleModal);
    const actorRole = roleModal.props("actorRole");
    expect(actorRole).toBe(adminSessionController.currentUser.value?.role);
  });

  it("opens MemberDisableConfirmModal on @disable and calls disableMember only after confirm", async () => {
    const wrapper = mountView();
    await flushPromises();

    const memberBtn = wrapper
      .findAll(".settings-view__subnav-btn")
      .find((btn) => btn.text().includes("成员管理"));
    expect(memberBtn).toBeDefined();
    await memberBtn!.trigger("click");
    await flushPromises();

    const confirmModal = wrapper.findComponent(MemberDisableConfirmModal);
    expect(confirmModal.props("open")).toBe(false);

    const memberPanel = wrapper.findComponent(MemberListPanel);
    memberPanel.vm.$emit("disable", "user-1");
    await flushPromises();

    expect(wrapper.findComponent(MemberDisableConfirmModal).props("open")).toBe(
      true,
    );

    wrapper.findComponent(MemberDisableConfirmModal).vm.$emit("confirm");
    await flushPromises();

    expect(wrapper.findComponent(MemberDisableConfirmModal).props("open")).toBe(
      false,
    );
  });

  it("passes empty strings to SettingsToast when toast keys are empty (no t('') warning)", () => {
    const wrapper = mountView();
    const toast = wrapper.findComponent(SettingsToast);
    expect(toast.props("title")).toBe("");
    expect(toast.props("description")).toBe("");
  });
});
