import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import ArcoVue from "@arco-design/web-vue";
import CaseCreateView from "./CaseCreateView.vue";
import CaseCreateStep3 from "./components/CaseCreateStep3.vue";
import { i18n, setAppLocale } from "../../i18n";
import {
  ADMIN_SESSION_STORAGE_KEY,
  adminSessionController,
  type AdminSession,
} from "../../auth/model/adminSession";

function persistTestSession(user: {
  name: string;
  email: string;
  role: string;
  initials: string;
}): void {
  const session: AdminSession = {
    token: "test-token",
    user,
    loggedInAt: 1700000000,
  };
  window.localStorage.setItem(
    ADMIN_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
}

/**
 * BUG-150 回归：建案向导 Step 3 owner 下拉必须包含登录用户（如 `Local Admin`），
 * 否则登录用户无法把案件分给自己。
 *
 * 静态 catalog 仅包含 7 个 fixture 同事；登录态注入后应在选项列表首项追加。
 */

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/cases/create", name: "case-create", component: CaseCreateView },
    ],
  });

  await router.push({ name: "case-create" });
  await router.isReady();

  const wrapper = mount(CaseCreateView, {
    global: {
      plugins: [i18n, router, ArcoVue],
      stubs: { teleport: true },
    },
  });

  await flushPromises();
  return wrapper;
}

describe("CaseCreateView BUG-150 owner dropdown includes session user", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    adminSessionController.reset();
  });

  afterEach(() => {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    adminSessionController.reset();
    document.body.innerHTML = "";
  });

  it("falls back to static catalog when no admin session is loaded", async () => {
    const wrapper = await mountView();
    const step3 = wrapper.findComponent(CaseCreateStep3);
    const options = step3.props("ownerOptions") as Array<{ label: string }>;

    const labels = options.map((o) => o.label);
    expect(labels).not.toContain("Local Admin");
    expect(labels).toEqual(
      expect.arrayContaining(["铃木", "田中", "李", "佐藤"]),
    );
  });

  it("prepends the logged-in user (Local Admin) to the owner dropdown when not in catalog", async () => {
    persistTestSession({
      name: "Local Admin",
      email: "admin@local.test",
      role: "admin",
      initials: "LA",
    });

    const wrapper = await mountView();
    const step3 = wrapper.findComponent(CaseCreateStep3);
    const options = step3.props("ownerOptions") as Array<{
      value: string;
      label: string;
      initials: string;
    }>;

    expect(options[0]).toMatchObject({
      value: "admin@local.test",
      label: "Local Admin",
      initials: "LA",
    });

    const labels = options.map((o) => o.label);
    expect(labels).toContain("Local Admin");
    expect(labels).toEqual(
      expect.arrayContaining(["Local Admin", "铃木", "田中"]),
    );
  });

  it("does not duplicate when the logged-in user already matches a catalog entry", async () => {
    persistTestSession({
      name: "鈴木",
      email: "suzuki@example.com",
      role: "manager",
      initials: "S",
    });

    const wrapper = await mountView();
    const step3 = wrapper.findComponent(CaseCreateStep3);
    const options = step3.props("ownerOptions") as Array<{ label: string }>;

    const suzukiCount = options.filter((o) =>
      ["铃木", "鈴木", "Suzuki"].includes(o.label),
    ).length;
    expect(suzukiCount).toBe(1);
  });
});
