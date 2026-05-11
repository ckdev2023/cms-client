import { flushPromises, shallowMount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import type { LocationQueryRaw } from "vue-router";
import { createMemoryHistory, createRouter } from "vue-router";
import CaseCreateView from "./CaseCreateView.vue";
import { i18n } from "../../i18n";
import { buildCaseCreateQuery } from "./query";

async function mountView(query: LocationQueryRaw) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/cases/create", name: "case-create", component: CaseCreateView },
    ],
  });

  await router.push({ name: "case-create", query });
  await router.isReady();

  const wrapper = shallowMount(CaseCreateView, {
    global: {
      plugins: [i18n, router],
      stubs: { teleport: true, CaseCreateWizardFooter: false },
    },
  });

  await flushPromises();
  return { wrapper, router };
}

describe("CaseCreateView pre-sign gate warning", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("hides footer warning for BMV ready deep-link entry", async () => {
    const { wrapper } = await mountView(
      buildCaseCreateQuery({
        templateCode: "bmv",
        templateId: "bmv",
        customerId: "cust-bmv-ready-999",
        customerName: "経営管理花子",
        customerGroup: "tokyo-1",
        customerGroupLabel: "Tokyo Team 1",
        bmvQuestionnaireStatus: "returned",
        bmvQuoteStatus: "confirmed",
        bmvSignStatus: "signed",
        bmvIntakeStatus: "ready_for_case_creation",
      }),
    );

    expect(wrapper.find('[data-testid="footer-gate-warn"]').exists()).toBe(
      false,
    );
  });

  it("shows footer warning for blocked BMV deep-link entry", async () => {
    const { wrapper } = await mountView(
      buildCaseCreateQuery({
        templateCode: "bmv",
        templateId: "bmv",
        customerId: "cust-bmv-blocked-999",
        customerName: "経営管理次郎",
        customerGroup: "tokyo-1",
        customerGroupLabel: "Tokyo Team 1",
        bmvQuestionnaireStatus: "returned",
        bmvQuoteStatus: "generated",
        bmvSignStatus: "signed",
        bmvIntakeStatus: "ready_for_case_creation",
      }),
    );

    expect(wrapper.find('[data-testid="footer-gate-warn"]').exists()).toBe(
      true,
    );
  });

  it("shows footer go-to-customer resume link when opened from customer context", async () => {
    const { wrapper } = await mountView(
      buildCaseCreateQuery({
        customerId: "cust-footer-resume-1",
        customerName: "Resume Link Customer",
      }),
    );

    expect(
      wrapper
        .find('[data-testid="case-create-footer-go-to-customer"]')
        .exists(),
    ).toBe(true);
  });

  it("hides footer go-to-customer resume link without customerId in query", async () => {
    const { wrapper } = await mountView({});

    expect(
      wrapper
        .find('[data-testid="case-create-footer-go-to-customer"]')
        .exists(),
    ).toBe(false);
  });
});
