import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import RequirePermission from "./RequirePermission.vue";
import {
  getDefaultPermissionsStore,
  _resetDefaultPermissionsStoreForTest,
} from "../model/PermissionsStore";

afterEach(() => {
  _resetDefaultPermissionsStoreForTest();
});

function setupStore(permissions: string[]) {
  const store = getDefaultPermissionsStore();
  store._setForTest(permissions);
}

describe("RequirePermission", () => {
  it("renders slot content when single code is permitted", () => {
    setupStore(["case.view"]);
    const w = mount(RequirePermission, {
      props: { code: "case.view" },
      slots: { default: "<span>Visible</span>" },
    });
    expect(w.text()).toBe("Visible");
  });

  it("does not render slot content when single code is not permitted", () => {
    setupStore([]);
    const w = mount(RequirePermission, {
      props: { code: "case.view" },
      slots: { default: "<span>Hidden</span>" },
    });
    expect(w.text()).toBe("");
  });

  it("renders fallback slot when permission denied and fallback provided", () => {
    setupStore([]);
    const w = mount(RequirePermission, {
      props: { code: "case.view" },
      slots: {
        default: "<span>Main</span>",
        fallback: "<span>No Access</span>",
      },
    });
    expect(w.text()).toBe("No Access");
  });

  it("renders when any code matches in any mode (default)", () => {
    setupStore(["case.view"]);
    const w = mount(RequirePermission, {
      props: { codes: ["case.view", "case.export"] },
      slots: { default: "<span>OK</span>" },
    });
    expect(w.text()).toBe("OK");
  });

  it("does not render when all mode and not all codes match", () => {
    setupStore(["case.view"]);
    const w = mount(RequirePermission, {
      props: { codes: ["case.view", "case.export"], mode: "all" },
      slots: { default: "<span>Nope</span>" },
    });
    expect(w.text()).toBe("");
  });

  it("renders when all mode and all codes match", () => {
    setupStore(["case.view", "case.export"]);
    const w = mount(RequirePermission, {
      props: { codes: ["case.view", "case.export"], mode: "all" },
      slots: { default: "<span>All</span>" },
    });
    expect(w.text()).toBe("All");
  });

  it("renders when neither code nor codes is specified", () => {
    setupStore([]);
    const w = mount(RequirePermission, {
      slots: { default: "<span>Always</span>" },
    });
    expect(w.text()).toBe("Always");
  });
});
