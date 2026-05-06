import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import {
  clearUserAliases,
  registerUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import type { LeadBasicInfo } from "../types";
import LeadInfoTab from "./LeadInfoTab.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

const UUID_LOCAL_ADMIN = "00000000-0000-4000-8000-000000000011";
const UUID_UNKNOWN = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";

function makeInfo(overrides: Partial<LeadBasicInfo> = {}): LeadBasicInfo {
  return {
    id: "LEAD-001",
    name: "李华",
    phone: "080-1234-5678",
    email: "li@example.com",
    source: "介绍",
    referrer: "",
    businessType: "家族滞在",
    group: "tokyo-1",
    owner: "",
    language: "中文",
    note: "",
    ...overrides,
  };
}

describe("LeadInfoTab", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
    clearUserAliases();
  });

  describe("H-9 owner UUID 详情基础信息渲染", () => {
    it("info.owner 已是合法标签 → 直接展示（catalog/字面量路径 BC）", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: { info: makeInfo({ owner: "田中" }), readonly: false },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("田中");
    });

    it("info.owner 为 raw UUID（adapter 回落）+ alias 已注册 → 渲染为 displayName，不裸出 UUID", () => {
      setAppLocale("zh-CN");
      registerUserAliases([
        { id: UUID_LOCAL_ADMIN, displayName: "Local Admin" },
      ]);
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: UUID_LOCAL_ADMIN }),
          ownerId: UUID_LOCAL_ADMIN,
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const text = wrapper.text();
      expect(text).toContain("Local Admin");
      expect(text).not.toContain(UUID_LOCAL_ADMIN);
    });

    it("info.owner 为空 + ownerId 为真实 UUID + alias 已注册 → 通过 ownerId 反解", () => {
      setAppLocale("zh-CN");
      registerUserAliases([
        { id: UUID_LOCAL_ADMIN, displayName: "Local Admin" },
      ]);
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: "" }),
          ownerId: UUID_LOCAL_ADMIN,
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("Local Admin");
    });

    it("info.owner 为 raw UUID + alias 未注册 → 显示『未知用户』而非 UUID", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: UUID_UNKNOWN }),
          ownerId: UUID_UNKNOWN,
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      const text = wrapper.text();
      expect(text).toContain("未知用户");
      expect(text).not.toContain(UUID_UNKNOWN);
    });

    it("info.owner 与 ownerId 都为空 → 显示『未分配』", () => {
      setAppLocale("zh-CN");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: "" }),
          ownerId: "",
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("未分配");
    });

    it("ja-JP locale 下 unknown UUID → 显示『不明なユーザー』", () => {
      setAppLocale("ja-JP");
      const wrapper = mount(LeadInfoTab, {
        props: {
          info: makeInfo({ owner: UUID_UNKNOWN }),
          ownerId: UUID_UNKNOWN,
          readonly: false,
        },
        global: { plugins: [i18n] },
      });
      expect(wrapper.text()).toContain("不明なユーザー");
    });
  });
});
