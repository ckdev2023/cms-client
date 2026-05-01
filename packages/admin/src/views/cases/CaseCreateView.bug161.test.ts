// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-161 — 建案向导顶部 CASE SOURCE 标签直显客户 raw UUID
//   Covers: ?customerId=uuid 进入时，顶部 source 行不得直显 36 字符
//   UUID；加载完成后应显示 `CUS-...·displayName` 友好标签；
//   未加载完成时显示 loading 占位而非 UUID。
// ────────────────────────────────────────────────────────────────

import { flushPromises, shallowMount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import CaseCreateView from "./CaseCreateView.vue";
import { i18n } from "../../i18n";

const RAW_UUID = "825d708f-dec5-443d-b987-63f0a62dae99";
const CUSTOMER_NUMBER = "CUS-202604-0005";
const DISPLAY_NAME = "R6试探客户";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

async function mountViewWithCustomerId(fetchImpl: typeof fetch) {
  vi.stubGlobal("fetch", fetchImpl);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/cases/create", name: "case-create", component: CaseCreateView },
    ],
  });

  await router.push({
    name: "case-create",
    query: { customerId: RAW_UUID },
  });
  await router.isReady();

  const wrapper = shallowMount(CaseCreateView, {
    global: {
      plugins: [i18n, router],
      stubs: { teleport: true },
    },
  });

  await flushPromises();
  return wrapper;
}

describe("CaseCreateView source label (BUG-161)", () => {
  beforeEach(() => {
    i18n.global.locale.value = "zh-CN";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
    i18n.global.locale.value = "zh-CN";
  });

  it("renders `customerNumber · displayName` after dropdown loads, not raw UUID", async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: RAW_UUID,
            customerNumber: CUSTOMER_NUMBER,
            displayName: DISPLAY_NAME,
            group: "tokyo-1",
          },
        ],
        total: 1,
      }),
    );

    const wrapper = await mountViewWithCustomerId(fetchSpy);
    const span = wrapper.find('[data-testid="case-create-source-customer"]');

    expect(span.exists()).toBe(true);
    expect(span.text()).toContain(CUSTOMER_NUMBER);
    expect(span.text()).toContain(DISPLAY_NAME);
    expect(span.text()).not.toContain(RAW_UUID);
  });

  it("falls back to displayName when customerNumber is missing", async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: RAW_UUID,
            displayName: DISPLAY_NAME,
            group: "tokyo-1",
          },
        ],
        total: 1,
      }),
    );

    const wrapper = await mountViewWithCustomerId(fetchSpy);
    const span = wrapper.find('[data-testid="case-create-source-customer"]');

    expect(span.text()).toContain(DISPLAY_NAME);
    expect(span.text()).not.toContain(RAW_UUID);
  });

  it("shows loading placeholder (never raw UUID) while dropdown has not resolved", async () => {
    const fetchSpy = vi
      .fn<typeof fetch>()
      .mockImplementation(() => new Promise(() => undefined));

    const wrapper = await mountViewWithCustomerId(fetchSpy);
    const span = wrapper.find('[data-testid="case-create-source-customer"]');

    expect(span.exists()).toBe(true);
    expect(span.text()).not.toContain(RAW_UUID);
    expect(span.text()).toContain(
      i18n.global.t("cases.create.source.resolving"),
    );
  });
});
