import { beforeEach, describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import MemberCreateModal from "./MemberCreateModal.vue";
import { i18n, setAppLocale } from "../../../i18n";

const STUB_ROLES = [
  { code: "owner", name: "Owner" },
  { code: "staff", name: "Staff" },
];

const STUB_GROUPS = [{ id: "g1", name: "Group A" }];

function mountModal(open = true) {
  return mount(MemberCreateModal, {
    props: { open, groups: STUB_GROUPS, availableRoles: STUB_ROLES },
    global: { plugins: [i18n], stubs: { teleport: true } },
  });
}

async function fillForm(wrapper: VueWrapper) {
  await wrapper.find("#mcmName").setValue("Yamada Hanako");
  await wrapper.find("#mcmEmail").setValue("yamada@example.com");
  await wrapper.find("#mcmPassword").setValue("secret123");
}

describe("MemberCreateModal", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("retains form values after confirm (no implicit reset)", async () => {
    const wrapper = mountModal();
    await fillForm(wrapper);

    const confirmBtn = wrapper.find(".mcm-footer .ui-btn--filled");
    await confirmBtn.trigger("click");

    expect(wrapper.emitted("confirm")).toHaveLength(1);
    expect((wrapper.find("#mcmName").element as HTMLInputElement).value).toBe(
      "Yamada Hanako",
    );
    expect((wrapper.find("#mcmEmail").element as HTMLInputElement).value).toBe(
      "yamada@example.com",
    );
    expect(
      (wrapper.find("#mcmPassword").element as HTMLInputElement).value,
    ).toBe("secret123");
  });

  it("resets form when handleClose is triggered via cancel button", async () => {
    const wrapper = mountModal();
    await fillForm(wrapper);

    const cancelBtn = wrapper.find(".mcm-footer .ui-btn--outlined");
    await cancelBtn.trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect((wrapper.find("#mcmName").element as HTMLInputElement).value).toBe(
      "",
    );
    expect((wrapper.find("#mcmEmail").element as HTMLInputElement).value).toBe(
      "",
    );
    expect(
      (wrapper.find("#mcmPassword").element as HTMLInputElement).value,
    ).toBe("");
  });

  it("resets form when overlay backdrop is clicked", async () => {
    const wrapper = mountModal();
    await fillForm(wrapper);

    await wrapper.find(".mcm-overlay").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect((wrapper.find("#mcmName").element as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("emits confirm with trimmed payload", async () => {
    const wrapper = mountModal();
    await wrapper.find("#mcmName").setValue("  Tanaka  ");
    await wrapper.find("#mcmEmail").setValue("  t@e.co  ");
    await wrapper.find("#mcmPassword").setValue("abcdef");

    const confirmBtn = wrapper.find(".mcm-footer .ui-btn--filled");
    await confirmBtn.trigger("click");

    expect(wrapper.emitted("confirm")?.[0]).toEqual([
      {
        name: "Tanaka",
        email: "t@e.co",
        role: "staff",
        initialPassword: "abcdef",
        primaryGroupId: undefined,
      },
    ]);
  });

  it("disables confirm button when form is incomplete", () => {
    const wrapper = mountModal();
    const confirmBtn = wrapper.find(".mcm-footer .ui-btn--filled");
    expect(confirmBtn.attributes("disabled")).toBeDefined();
  });
});
