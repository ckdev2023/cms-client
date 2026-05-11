import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import CaseCreateStep2 from "./CaseCreateStep2.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

describe("CaseCreateStep2 — checklist preview empty vs fixtures", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    setAppLocale(originalLocale);
  });

  it("renders fixture sections when server checklist-preview is empty（示意清单与横幅一致）", async () => {
    const previewState = ref<"empty" | "ok">("empty");
    const checklistItems = ref<
      Array<{ code: string; name: string; requiredFlag: boolean }>
    >([]);

    const model = {
      primaryCustomer: { value: null },
      isFamilyBulkScenario: { value: false },
      familyApplicants: { value: [] },
      familySupporters: { value: [] },
      additionalParties: { value: [] },
      draft: { templateId: "work" },
      currentTemplate: {
        value: {
          id: "work",
          sections: [
            {
              title: { zh: "主申请人", en: "Applicant", ja: "主申請人" },
              items: [
                {
                  id: "fixture-doc",
                  label: {
                    zh: "存折复印件",
                    en: "Bank book copy",
                    ja: "通帳",
                  },
                  required: true,
                },
              ],
            },
          ],
        },
      },
      checklistPreview: {
        previewState,
        checklistItems,
      },
      setPrimaryCustomer: vi.fn(),
      removeRelatedParty: vi.fn(),
    };

    const wrapper = mount(CaseCreateStep2, {
      attachTo: document.body,
      props: {
        model: model as never,
        customerOptions: [],
        customersLoading: false,
        customersError: null,
        customersLoaded: true,
      },
      global: { plugins: [i18n] },
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".preview-card")).toHaveLength(1);
    expect(wrapper.text()).toContain("1 项 · 1 必须");
    expect(wrapper.text()).toContain("存折复印件");
    expect(
      wrapper.find("[data-testid=document-preview-loading]").exists(),
    ).toBe(false);
  });
});
