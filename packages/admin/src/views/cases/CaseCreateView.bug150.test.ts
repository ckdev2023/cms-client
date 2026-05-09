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
import {
  clearUserAliases,
  registerUserAliases,
} from "../../shared/model/useOrgUserOptions";

function persistTestSession(user: {
  id: string;
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
 * BUG-150 回归（R-FLOW7 收紧）：
 *
 *   1. 建案向导 Step 3 owner 下拉必须能让登录用户把案件分配给自己。
 *   2. owner option `value` 必须使用真实 user UUID（与 `POST /cases.ownerUserId`
 *      schema 一致），不得回填 fixture slug；否则后端会触发
 *      `CASE_OWNER_NOT_FOUND`（R-FLOW7 P0-1）。
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
    clearUserAliases();
  });

  afterEach(() => {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    adminSessionController.reset();
    clearUserAliases();
    document.body.innerHTML = "";
  });

  it("returns an empty list when no admin session and no api users are loaded", async () => {
    const wrapper = await mountView();
    const step3 = wrapper.findComponent(CaseCreateStep3);
    const options = step3.props("ownerOptions") as Array<{ label: string }>;

    expect(options).toEqual([]);
  });

  it("prepends the logged-in user when the api user list does not include them", async () => {
    persistTestSession({
      id: "00000000-0000-4000-8000-000000000099",
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
      value: "00000000-0000-4000-8000-000000000099",
      label: "Local Admin",
      initials: "LA",
    });
  });

  it("uses real user UUIDs (not fixture slugs) once api users are registered", async () => {
    persistTestSession({
      id: "00000000-0000-4000-8000-000000000099",
      name: "Local Admin",
      email: "admin@local.test",
      role: "admin",
      initials: "LA",
    });
    registerUserAliases([
      {
        id: "00000000-0000-4000-8000-000000000099",
        displayName: "Local Admin",
      },
      {
        id: "00000000-0000-4000-8000-000000000100",
        displayName: "R6走查成员",
      },
    ]);

    const wrapper = await mountView();
    await flushPromises();
    const step3 = wrapper.findComponent(CaseCreateStep3);
    const options = step3.props("ownerOptions") as Array<{
      value: string;
      label: string;
    }>;

    const adminEntry = options.find((o) => o.label === "Local Admin");
    expect(adminEntry).toBeDefined();
    expect(adminEntry?.value).toBe("00000000-0000-4000-8000-000000000099");
    // 没有任何 fixture slug（如 "suzuki" / "tanaka"）作为 value。
    const slugLeak = options.filter((o) =>
      ["suzuki", "tanaka", "li", "sato"].includes(o.value),
    );
    expect(slugLeak).toEqual([]);
  });

  it("does not duplicate the session user when api users already include them", async () => {
    persistTestSession({
      id: "00000000-0000-4000-8000-000000000099",
      name: "Local Admin",
      email: "admin@local.test",
      role: "admin",
      initials: "LA",
    });
    registerUserAliases([
      {
        id: "00000000-0000-4000-8000-000000000099",
        displayName: "Local Admin",
      },
    ]);

    const wrapper = await mountView();
    await flushPromises();
    const step3 = wrapper.findComponent(CaseCreateStep3);
    const options = step3.props("ownerOptions") as Array<{
      value: string;
      label: string;
    }>;

    const adminCount = options.filter(
      (o) => o.value === "00000000-0000-4000-8000-000000000099",
    ).length;
    expect(adminCount).toBe(1);
  });
});
