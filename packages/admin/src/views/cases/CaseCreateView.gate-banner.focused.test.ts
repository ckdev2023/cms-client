// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-158 — gate banner rendering & recovery link
//   Covers: banner visibility when gate is blocked/passed,
//   blocker items rendered, customer detail link present.
// ────────────────────────────────────────────────────────────────

import { flushPromises, shallowMount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import CaseCreateView from "./CaseCreateView.vue";
import { i18n } from "../../i18n";
import { buildCaseCreateQuery } from "./query";

async function mountView(bmvOverrides: Record<string, string> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/cases/create",
        name: "case-create",
        component: CaseCreateView,
      },
    ],
  });

  const query = buildCaseCreateQuery({
    templateCode: "bmv",
    templateId: "bmv",
    customerId: "cust-bmv-test",
    customerName: "テスト経営太郎",
    customerGroup: "tokyo-1",
    customerGroupLabel: "Tokyo Team 1",
    bmvQuestionnaireStatus: "returned",
    bmvQuoteStatus: "confirmed",
    bmvSignStatus: "signed",
    bmvIntakeStatus: "ready_for_case_creation",
    ...bmvOverrides,
  });

  await router.push({ name: "case-create", query });
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

describe("CaseCreateView gate banner (BUG-158)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not render gate banner when all prerequisites met", async () => {
    const wrapper = await mountView();
    expect(wrapper.find('[data-testid="gate-banner"]').exists()).toBe(false);
  });

  it("renders gate banner when quote is not confirmed", async () => {
    const wrapper = await mountView({ bmvQuoteStatus: "generated" });
    const banner = wrapper.find('[data-testid="gate-banner"]');
    expect(banner.exists()).toBe(true);
  });

  it("renders blocker list items inside the banner", async () => {
    const wrapper = await mountView({
      bmvQuestionnaireStatus: "sent",
      bmvQuoteStatus: "generated",
    });
    const items = wrapper.findAll(".cc__gate-banner-item");
    expect(items.length).toBe(2);
  });

  it("renders customer detail link when customer is selected", async () => {
    const wrapper = await mountView({ bmvSignStatus: "pending" });
    const link = wrapper.find('[data-testid="gate-banner-customer-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toContain("cust-bmv-test");
    expect(link.attributes("href")).toContain("tab=basic");
    expect(link.attributes("href")).toContain("bmv-intake-card");
  });

  it("renders all 4 blockers when all prerequisites are missing", async () => {
    const wrapper = await mountView({
      bmvQuestionnaireStatus: "sent",
      bmvQuoteStatus: "generated",
      bmvSignStatus: "pending",
      bmvIntakeStatus: "not_started",
    });
    const items = wrapper.findAll(".cc__gate-banner-item");
    expect(items.length).toBe(4);
  });

  it("renders recovery text for each blocker", async () => {
    const wrapper = await mountView({ bmvQuoteStatus: "generated" });
    const recovery = wrapper.findAll(".cc__gate-banner-recovery");
    expect(recovery.length).toBeGreaterThanOrEqual(1);
    expect(recovery[0].text()).toBeTruthy();
  });
});
