import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import CaseTemplatesListView from "./CaseTemplatesListView.vue";
import { i18n } from "../../i18n";
import type { AppLocale } from "../../i18n/locale";
import { getDefaultPermissionsStore } from "../../shared/model/PermissionsStore";

const hoisted = vi.hoisted(() => {
  const templateItem = {
    id: "tid-1",
    orgId: "org-1",
    templateName: "Test Template",
    caseType: "bmv",
    applicationType: null,
    blueprintItemCount: 1,
    reviewRequiredFlag: false,
    billingGateMode: "warn",
    activeFlag: true,
    createdAt: "",
    updatedAt: "",
  };
  const mockList = vi.fn().mockResolvedValue({ items: [templateItem] });
  return { mockList };
});

vi.mock("./model/CaseTemplatesRepository", () => ({
  createCaseTemplatesRepository: () => ({
    list: hoisted.mockList,
    get: vi.fn().mockResolvedValue({
      id: "tid-1",
      orgId: "org-1",
      templateName: "Test Template",
      caseType: "bmv",
      applicationType: null,
      requirementBlueprint: null,
      defaultTasksBlueprint: null,
      blueprintItemCount: 1,
      reviewRequiredFlag: false,
      billingGateMode: "warn",
      activeFlag: true,
      createdAt: "",
      updatedAt: "",
    }),
    create: vi.fn(),
    update: vi.fn(),
    getCaseTypeOptions: vi.fn().mockResolvedValue([
      { code: "dependent_visa", sort: 0 },
      { code: "work", sort: 1 },
      { code: "business_manager_visa", sort: 2 },
    ]),
  }),
}));

describe("CaseTemplatesListView create dialog", () => {
  let previousLocale: AppLocale;

  beforeEach(() => {
    previousLocale = i18n.global.locale.value as AppLocale;
    i18n.global.locale.value = "zh-CN";
    hoisted.mockList.mockResolvedValue({
      items: [
        {
          id: "tid-1",
          orgId: "org-1",
          templateName: "Test Template",
          caseType: "bmv",
          applicationType: null,
          blueprintItemCount: 1,
          reviewRequiredFlag: false,
          billingGateMode: "warn",
          activeFlag: true,
          createdAt: "",
          updatedAt: "",
        },
      ],
    });
    getDefaultPermissionsStore()._setForTest(
      ["case.view", "settings.write"],
      "manager",
    );
  });

  afterEach(() => {
    i18n.global.locale.value = previousLocale;
    document.body.innerHTML = "";
  });

  it("renders billing gate column with zh-CN label for warn mode", async () => {
    hoisted.mockList.mockResolvedValue({
      items: [
        {
          id: "tid-warn",
          orgId: "org-1",
          templateName: "Test Template",
          caseType: "bmv",
          applicationType: null,
          blueprintItemCount: 1,
          reviewRequiredFlag: false,
          billingGateMode: "WARN",
          activeFlag: true,
          createdAt: "",
          updatedAt: "",
        },
      ],
    });
    const wrapper = mount(CaseTemplatesListView, {
      global: { plugins: [i18n] },
      attachTo: document.body,
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    const table = wrapper.find('[data-testid="case-templates-table"]');
    expect(table.exists()).toBe(true);
    expect(table.text()).toContain("收费闸口");
    expect(table.text()).toContain("提醒");
    expect(table.text()).not.toContain("warn");

    wrapper.unmount();
  });

  it("opens create dialog in DOM when clicking New template", async () => {
    const wrapper = mount(CaseTemplatesListView, {
      global: { plugins: [i18n] },
      attachTo: document.body,
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="case-templates-table"]').exists()).toBe(
      true,
    );

    await wrapper
      .find('[data-testid="create-template-button"]')
      .trigger("click");
    await wrapper.vm.$nextTick();

    expect(
      document.body.querySelector('[data-testid="create-dialog"]'),
    ).not.toBe(null);
    wrapper.unmount();
  });
});
