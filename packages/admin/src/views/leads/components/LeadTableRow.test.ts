import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { getLeadSamples } from "../fixtures";
import {
  clearUserAliases,
  registerUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import type { LeadSummary } from "../types";
import LeadTableRow from "./LeadTableRow.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

const UUID_LOCAL_ADMIN = "00000000-0000-4000-8000-000000000011";
const UUID_UNKNOWN = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

function makeLead(overrides: Partial<LeadSummary>): LeadSummary {
  return {
    ...getLeadSamples("zh-CN")[0]!,
    ...overrides,
  };
}

describe("LeadTableRow", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
    clearUserAliases();
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

  describe("H-9 owner UUID 列表渲染（不再展示 raw UUID 或 ?）", () => {
    it("ownerId 是 catalog 短码 → 仍然走 catalog 本地化路径（BC）", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: "suzuki" }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("铃木");
      expect(wrapper.text()).not.toContain("?");
    });

    it("ownerId 是真实 UUID 且已注册别名 → 显示 displayName + 派生 initials", () => {
      setAppLocale("zh-CN");
      registerUserAliases([
        { id: UUID_LOCAL_ADMIN, displayName: "Local Admin" },
      ]);
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: UUID_LOCAL_ADMIN }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("Local Admin");
      expect(wrapper.text()).toContain("LA");
      expect(wrapper.text()).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
      expect(wrapper.text()).not.toContain("?");
    });

    it("ownerId 是真实 UUID 但 alias 未注册 → 显示『未知用户』而非裸 UUID 或 ?", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: UUID_UNKNOWN }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("未知用户");
      expect(wrapper.text()).not.toContain(UUID_UNKNOWN);
      expect(wrapper.text()).not.toContain("?");
    });

    it("ownerId 是 nil UUID → 显示『未分配』", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: NIL_UUID }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("未分配");
      expect(wrapper.text()).not.toContain("?");
    });

    it("en-US locale 下 unknown UUID → 显示『Unknown user』", () => {
      setAppLocale("en-US");
      const wrapper = mount(LeadTableRow, {
        props: { lead: makeLead({ ownerId: UUID_UNKNOWN }) },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("Unknown user");
    });
  });
});
