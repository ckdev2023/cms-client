import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import UserPicker from "./UserPicker.vue";
import {
  registerUserAliases,
  clearUserAliases,
} from "../model/useOrgUserOptions";

const UUID_A = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
const UUID_B = "11111111-2222-3333-4444-555555555555";
const UUID_UNKNOWN = "99999999-0000-1111-2222-333344445555";

afterEach(() => {
  clearUserAliases();
});

describe("UserPicker", () => {
  it("renders a <select> element", () => {
    const w = mount(UserPicker);
    expect(w.find("select").exists()).toBe(true);
  });

  it("shows registered users as options", () => {
    registerUserAliases([
      { id: UUID_A, displayName: "Admin" },
      { id: UUID_B, displayName: "Staff" },
    ]);
    const w = mount(UserPicker);
    const options = w.findAll("option");
    expect(options.length).toBeGreaterThanOrEqual(3);
    expect(options.some((o) => o.text() === "Admin")).toBe(true);
    expect(options.some((o) => o.text() === "Staff")).toBe(true);
  });

  it("shows displayName for registered UUID value", () => {
    registerUserAliases([{ id: UUID_A, displayName: "Admin" }]);
    const w = mount(UserPicker, { props: { modelValue: UUID_A } });
    const matched = w.findAll("option").find((o) => o.element.value === UUID_A);
    expect(matched).toBeTruthy();
    expect(matched!.text()).toBe("Admin");
  });

  it('shows "—" fallback for unknown UUID value', () => {
    const w = mount(UserPicker, { props: { modelValue: UUID_UNKNOWN } });
    const fallback = w
      .findAll("option")
      .find((o) => o.element.value === UUID_UNKNOWN);
    expect(fallback).toBeTruthy();
    expect(fallback!.text()).toBe("—");
  });

  it("emits update:modelValue on change", async () => {
    registerUserAliases([{ id: UUID_A, displayName: "Admin" }]);
    const w = mount(UserPicker, { props: { modelValue: "" } });
    await w.find("select").setValue(UUID_A);
    expect(w.emitted("update:modelValue")).toBeTruthy();
    expect(w.emitted("update:modelValue")![0]).toEqual([UUID_A]);
  });

  it("forwards id and name attributes", () => {
    const w = mount(UserPicker, {
      props: { id: "test-id", name: "test-name" },
    });
    const select = w.find("select");
    expect(select.attributes("id")).toBe("test-id");
    expect(select.attributes("name")).toBe("test-name");
  });

  it("applies disabled state", () => {
    const w = mount(UserPicker, { props: { disabled: true } });
    expect((w.find("select").element as HTMLSelectElement).disabled).toBe(true);
  });
});
