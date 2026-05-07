import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import type { OwnerOption } from "../types";
import LeadBulkActionBar from "./LeadBulkActionBar.vue";

function makeOwnerOptions(count: number): OwnerOption[] {
  return Array.from({ length: count }, (_, i) => ({
    value: `00000000-0000-4000-8000-0000000000${String(i + 1).padStart(2, "0")}`,
    label: `Staff ${i + 1}`,
    initials: `S${i + 1}`,
    avatarClass: "avatar--default",
  }));
}

function mountBar(ownerOptions: OwnerOption[]) {
  return mount(LeadBulkActionBar, {
    global: { plugins: [i18n] },
    props: { selectedCount: 3, ownerOptions },
  });
}

describe("LeadBulkActionBar", () => {
  it("owner dropdown options.length equals ownerOptions prop length (PR-2 regression lock)", () => {
    const owners = makeOwnerOptions(8);
    const wrapper = mountBar(owners);

    const select = wrapper.find("#lead-bulk-assignOwner")
      .element as HTMLSelectElement;
    const valueOptions = Array.from(select.querySelectorAll("option")).filter(
      (o) => o.value !== "",
    );
    expect(valueOptions.length).toBe(owners.length);
  });

  it("renders zero owner options when ownerOptions prop is empty", () => {
    const wrapper = mountBar([]);

    const select = wrapper.find("#lead-bulk-assignOwner")
      .element as HTMLSelectElement;
    const valueOptions = Array.from(select.querySelectorAll("option")).filter(
      (o) => o.value !== "",
    );
    expect(valueOptions.length).toBe(0);
  });
});
