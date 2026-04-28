import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { getLeadSamples } from "../fixtures";
import LeadTableRow from "./LeadTableRow.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

describe("LeadTableRow", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
  });

  it("renders localized fallback follow-up note and relative time in ja-JP", () => {
    setAppLocale("ja-JP");

    const wrapper = mount(LeadTableRow, {
      props: {
        lead: getLeadSamples("ja-JP")[0],
      },
      global: {
        plugins: [i18n],
      },
    });

    expect(wrapper.text()).toContain("電話で意向と在留資格を確認");
    expect(wrapper.text()).toContain("今日 15:30");
    expect(wrapper.text()).toContain("鈴木");
    expect(wrapper.text()).not.toContain("电话确认意向与签证类别");
    expect(wrapper.text()).not.toContain("今天 15:30");
    expect(wrapper.text()).not.toContain("铃木");
  });
});
