import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import SettingsView from "./SettingsView.vue";
import { i18n, setAppLocale } from "../../i18n";
import {
  initOrgSettings,
  resetOrgSettings,
} from "../../shared/model/useOrgSettings";
import {
  getDefaultPermissionsStore,
  _resetDefaultPermissionsStoreForTest,
} from "../../shared/model/PermissionsStore";

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
    listRoles: vi.fn().mockResolvedValue([]),
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

function getSubnavButtons(wrapper: ReturnType<typeof mountView>) {
  return wrapper.findAll(".settings-view__subnav-btn");
}

describe("SettingsView — aria-current on sub-navigation", () => {
  beforeEach(() => {
    resetOrgSettings();
    initOrgSettings({
      initialStorageRoot: { rootLabel: null, rootPath: null },
    });
    setAppLocale("zh-CN");

    const store = getDefaultPermissionsStore();
    store._setForTest(["group.manage", "user.manage", "settings.write"]);
  });

  afterEach(() => {
    _resetDefaultPermissionsStoreForTest();
  });

  it("default active panel (group-management) has aria-current='page'", () => {
    const wrapper = mountView();
    const buttons = getSubnavButtons(wrapper);

    expect(buttons.length).toBe(4);
    expect(buttons[0]!.attributes("aria-current")).toBe("page");
    expect(buttons[1]!.attributes("aria-current")).toBeUndefined();
    expect(buttons[2]!.attributes("aria-current")).toBeUndefined();
    expect(buttons[3]!.attributes("aria-current")).toBeUndefined();
  });

  it("switches aria-current to storage-root tab after click", async () => {
    const wrapper = mountView();
    const buttons = getSubnavButtons(wrapper);

    await buttons[3]!.trigger("click");
    await wrapper.vm.$nextTick();

    const refreshed = getSubnavButtons(wrapper);
    expect(refreshed[0]!.attributes("aria-current")).toBeUndefined();
    expect(refreshed[3]!.attributes("aria-current")).toBe("page");
  });

  it("switches aria-current to member-management tab after click", async () => {
    const wrapper = mountView();
    const buttons = getSubnavButtons(wrapper);

    await buttons[1]!.trigger("click");
    await wrapper.vm.$nextTick();

    const refreshed = getSubnavButtons(wrapper);
    expect(refreshed[0]!.attributes("aria-current")).toBeUndefined();
    expect(refreshed[1]!.attributes("aria-current")).toBe("page");
  });

  it("only one button has aria-current at any time", async () => {
    const wrapper = mountView();

    for (let i = 0; i < 4; i++) {
      const buttons = getSubnavButtons(wrapper);
      await buttons[i]!.trigger("click");
      await wrapper.vm.$nextTick();

      const refreshed = getSubnavButtons(wrapper);
      const withAria = refreshed.filter(
        (b) => b.attributes("aria-current") === "page",
      );
      expect(withAria).toHaveLength(1);
    }
  });
});
