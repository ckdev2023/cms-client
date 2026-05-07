import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import RoleDetailPanel from "./RoleDetailPanel.vue";
import type { RoleDetailItem } from "../model/RolesAdminRepository";
import { i18n, setAppLocale } from "../../../i18n";

function stubRole(overrides: Partial<RoleDetailItem> = {}): RoleDetailItem {
  return {
    id: "role-1",
    orgId: "org-1",
    code: "custom",
    name: "Custom Role",
    description: "A custom role",
    isSystem: false,
    memberCount: 2,
    createdBy: "u1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    permissions: ["case.view", "case.edit"],
    ...overrides,
  };
}

function mountPanel(role: RoleDetailItem, saving = false) {
  return mount(RoleDetailPanel, {
    props: { role, saving },
    global: {
      plugins: [i18n],
      stubs: { teleport: true },
    },
  });
}

function getCheckedPermissions(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper
    .findAll(".rdp__perm-item input[type='checkbox']")
    .filter((cb) => (cb.element as HTMLInputElement).checked)
    .map((cb) => {
      const label = cb.element.closest(".rdp__perm-item");
      return label?.querySelector(".rdp__perm-code")?.textContent ?? "";
    });
}

describe("RoleDetailPanel", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("initialises localPermissions from props.role on mount", () => {
    const wrapper = mountPanel(
      stubRole({ permissions: ["case.view", "customer.view"] }),
    );
    expect(getCheckedPermissions(wrapper)).toEqual(
      expect.arrayContaining(["case.view", "customer.view"]),
    );
    expect(getCheckedPermissions(wrapper)).toHaveLength(2);
  });

  it("resets localPermissions when props.role changes to a different role", async () => {
    const role1 = stubRole({
      id: "r1",
      permissions: ["case.view"],
    });
    const role2 = stubRole({
      id: "r2",
      permissions: ["customer.view", "customer.edit"],
    });

    const wrapper = mountPanel(role1);
    expect(getCheckedPermissions(wrapper)).toEqual(["case.view"]);

    await wrapper.setProps({ role: role2 });
    await nextTick();
    expect(getCheckedPermissions(wrapper)).toEqual(
      expect.arrayContaining(["customer.view", "customer.edit"]),
    );
    expect(getCheckedPermissions(wrapper)).toHaveLength(2);
  });

  it("preserves user permission edits when same role re-emits from parent", async () => {
    const original = stubRole({
      id: "r1",
      permissions: ["case.view", "case.edit"],
    });
    const wrapper = mountPanel(original);

    const caseEditCheckbox = wrapper
      .findAll(".rdp__perm-item")
      .find((el) => el.find(".rdp__perm-code").text() === "case.edit")
      ?.find("input[type='checkbox']");

    expect(caseEditCheckbox).toBeDefined();
    await caseEditCheckbox!.trigger("change");
    await nextTick();

    expect(getCheckedPermissions(wrapper)).toEqual(["case.view"]);
    expect(getCheckedPermissions(wrapper)).not.toContain("case.edit");

    const refreshed = stubRole({
      id: "r1",
      name: "Updated Name",
      permissions: ["case.view", "case.edit"],
    });
    await wrapper.setProps({ role: refreshed });
    await nextTick();

    expect(getCheckedPermissions(wrapper)).toEqual(["case.view"]);
    expect(getCheckedPermissions(wrapper)).not.toContain("case.edit");
  });

  it("syncs name and description even when permission changes are pending", async () => {
    const original = stubRole({
      id: "r1",
      name: "Original",
      description: "Desc A",
      permissions: ["case.view", "case.edit"],
    });
    const wrapper = mountPanel(original);

    const caseEditCheckbox = wrapper
      .findAll(".rdp__perm-item")
      .find((el) => el.find(".rdp__perm-code").text() === "case.edit")
      ?.find("input[type='checkbox']");
    await caseEditCheckbox!.trigger("change");
    await nextTick();

    const refreshed = stubRole({
      id: "r1",
      name: "Renamed",
      description: "Desc B",
      permissions: ["case.view", "case.edit"],
    });
    await wrapper.setProps({ role: refreshed });
    await nextTick();

    const nameInput = wrapper.find("#rdpNameInput");
    expect((nameInput.element as HTMLInputElement).value).toBe("Renamed");

    const textarea = wrapper.find(".rdp__textarea");
    expect((textarea.element as HTMLTextAreaElement).value).toBe("Desc B");
  });

  it("resets permissions when user has no pending changes and same role re-emits", async () => {
    const original = stubRole({
      id: "r1",
      permissions: ["case.view"],
    });
    const wrapper = mountPanel(original);

    const updated = stubRole({
      id: "r1",
      permissions: ["case.view", "case.edit"],
    });
    await wrapper.setProps({ role: updated });
    await nextTick();

    expect(getCheckedPermissions(wrapper)).toEqual(
      expect.arrayContaining(["case.view", "case.edit"]),
    );
    expect(getCheckedPermissions(wrapper)).toHaveLength(2);
  });
});
