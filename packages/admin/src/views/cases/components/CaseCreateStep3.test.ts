import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import ArcoVue from "@arco-design/web-vue";
import {
  getArcoLocale,
  i18n,
  setAppLocale,
  type AppLocale,
} from "../../../i18n";
import { getActiveGroupOptions } from "../../../shared/model/useGroupOptions";
import { getOwnerOptions } from "../../../shared/model/useOwnerOptions";
import CaseCreateStep3 from "./CaseCreateStep3.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

function createModel() {
  return {
    draft: {
      group: "tokyo-1",
      owner: "suzuki",
      dueDate: "",
      amount: "",
      groupOverrideReason: "",
      autoChecklist: true,
      autoTasks: true,
    },
    groupInheritanceLabel: { value: "东京一组" },
    needsGroupOverrideReason: { value: false },
    setGroup: vi.fn(),
    setOwner: vi.fn(),
    setDueDate: vi.fn(),
    setAmount: vi.fn(),
    setGroupOverrideReason: vi.fn(),
    setAutoChecklist: vi.fn(),
    setAutoTasks: vi.fn(),
  };
}

function mountWithLocale(locale: AppLocale) {
  setAppLocale(locale);
  const model = createModel();
  const ownerOptions = getOwnerOptions(locale);
  const groupOptions = getActiveGroupOptions(locale);
  const Host = defineComponent({
    components: { CaseCreateStep3 },
    setup: () => ({
      model,
      arcoLocale: getArcoLocale(locale),
      ownerOptions,
      groupOptions,
    }),
    template:
      '<a-config-provider :locale="arcoLocale"><CaseCreateStep3 :model="model" :owner-options="ownerOptions" :group-options="groupOptions" /></a-config-provider>',
  });

  const wrapper = mount(Host, {
    attachTo: document.body,
    global: {
      plugins: [i18n, ArcoVue],
    },
  });

  return { wrapper, model };
}

describe("CaseCreateStep3", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    setAppLocale(originalLocale);
  });

  it("renders DatePicker placeholder in ja-JP", () => {
    const { wrapper } = mountWithLocale("ja-JP");
    expect(wrapper.find(".arco-picker input").attributes("placeholder")).toBe(
      "日付を選択",
    );
  });

  it("renders DatePicker placeholder in en-US", () => {
    const { wrapper } = mountWithLocale("en-US");
    expect(wrapper.find(".arco-picker input").attributes("placeholder")).toBe(
      "Please select date",
    );
    const selects = wrapper.findAll("select");
    expect(selects[0].text()).toContain("Tokyo Team 1");
    expect(selects[1].text()).toContain("Suzuki");
  });

  it("forwards selected due date string to the model", () => {
    const { wrapper, model } = mountWithLocale("zh-CN");
    const picker = wrapper.findComponent(CaseCreateStep3).findComponent({
      name: "DatePicker",
    });

    picker.vm.$emit("change", "2026-05-01");

    expect(model.setDueDate).toHaveBeenCalledWith("2026-05-01");
  });
});
