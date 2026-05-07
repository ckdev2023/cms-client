import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import MemberRoleModal from "./MemberRoleModal.vue";
import type { MemberItem } from "../model/UsersAdminRepository";
import { i18n, setAppLocale } from "../../../i18n";

const ALL_ROLES = [
  { code: "owner", name: "Owner" },
  { code: "manager", name: "Manager" },
  { code: "staff", name: "Staff" },
  { code: "viewer", name: "Viewer" },
];

const STUB_MEMBER: MemberItem = {
  id: "u1",
  name: "Tanaka Taro",
  email: "tanaka@example.com",
  role: "staff",
  roleId: "r3",
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
  disabledAt: null,
};

function mountModal(actorRole?: string) {
  return mount(MemberRoleModal, {
    props: {
      open: true,
      member: STUB_MEMBER,
      availableRoles: ALL_ROLES,
      ...(actorRole !== undefined ? { actorRole } : {}),
    },
    global: {
      plugins: [i18n],
      stubs: { teleport: true },
    },
  });
}

function getOptionCodes(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper
    .findAll("option")
    .map((o) => o.attributes("value"))
    .filter((v): v is string => v !== undefined);
}

describe("MemberRoleModal", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("shows all four roles when actorRole is 'owner'", () => {
    const wrapper = mountModal("owner");
    expect(getOptionCodes(wrapper)).toEqual([
      "owner",
      "manager",
      "staff",
      "viewer",
    ]);
  });

  it("shows only staff and viewer when actorRole is 'manager'", () => {
    const wrapper = mountModal("manager");
    expect(getOptionCodes(wrapper)).toEqual(["staff", "viewer"]);
  });

  it("defaults to owner (all roles visible) when actorRole is not provided", () => {
    const wrapper = mountModal();
    expect(getOptionCodes(wrapper)).toEqual([
      "owner",
      "manager",
      "staff",
      "viewer",
    ]);
  });

  it("shows no roles when actorRole is 'staff'", () => {
    const wrapper = mountModal("staff");
    expect(getOptionCodes(wrapper)).toEqual([]);
  });

  it("emits confirm with selected role", async () => {
    const wrapper = mountModal("owner");
    const select = wrapper.find("select");
    await select.setValue("manager");
    const confirmBtn = wrapper.find(".mrm-footer .ui-btn--filled");
    await confirmBtn.trigger("click");
    expect(wrapper.emitted("confirm")).toEqual([["u1", "manager"]]);
  });

  it("disables confirm button when selected role matches current role", () => {
    const wrapper = mountModal("owner");
    const confirmBtn = wrapper.find(".mrm-footer .ui-btn--filled");
    expect(confirmBtn.attributes("disabled")).toBeDefined();
  });
});
