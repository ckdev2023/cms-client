import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import { LEAD_DETAIL_SAMPLES } from "../fixtures-detail";
import { HEADER_BUTTON_PRESETS } from "../types-detail";
import {
  clearUserAliases,
  registerUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import LeadDetailHeader from "./LeadDetailHeader.vue";

const originalLocale = i18n.global.locale.value as AppLocale;

describe("LeadDetailHeader", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
    clearUserAliases();
  });

  it("localizes breadcrumb aria-label in zh-CN", () => {
    setAppLocale("zh-CN");
    const wrapper = mount(LeadDetailHeader, {
      global: { plugins: [i18n] },
      props: {
        lead: LEAD_DETAIL_SAMPLES.following,
        avatarInitials: "李",
        buttonStates: HEADER_BUTTON_PRESETS.normal,
      },
    });

    expect(
      wrapper.find(".detail-header__breadcrumb").attributes("aria-label"),
    ).toBe("面包屑导航");
  });

  describe("R2-B-6 view-customer / view-case 事件分流", () => {
    it("converted-customer 状态下「查看客户」按钮 emit viewCustomer 而非 convertCustomer", async () => {
      setAppLocale("zh-CN");
      const sample = LEAD_DETAIL_SAMPLES["converted-customer"];
      expect(sample).toBeTruthy();

      const wrapper = mount(LeadDetailHeader, {
        global: { plugins: [i18n] },
        props: {
          lead: sample,
          avatarInitials: "王",
          buttonStates: HEADER_BUTTON_PRESETS.convertedCustomer,
        },
      });

      const buttons = wrapper.findAll("button");
      const viewBtn = buttons.find((b) => b.text() === "查看客户");
      expect(viewBtn).toBeTruthy();

      await viewBtn!.trigger("click");

      expect(wrapper.emitted().viewCustomer).toBeTruthy();
      expect(wrapper.emitted().viewCustomer).toHaveLength(1);
      expect(wrapper.emitted().convertCustomer).toBeFalsy();
    });

    it("converted-case 状态下「查看案件」按钮 emit viewCase 而非 convertCase", async () => {
      setAppLocale("zh-CN");
      const sample = LEAD_DETAIL_SAMPLES["converted-case"];
      expect(sample).toBeTruthy();

      const wrapper = mount(LeadDetailHeader, {
        global: { plugins: [i18n] },
        props: {
          lead: sample,
          avatarInitials: "王",
          buttonStates: HEADER_BUTTON_PRESETS.convertedCase,
        },
      });

      const buttons = wrapper.findAll("button");
      const viewBtn = buttons.find((b) => b.text() === "查看案件");
      expect(viewBtn).toBeTruthy();

      await viewBtn!.trigger("click");

      expect(wrapper.emitted().viewCase).toBeTruthy();
      expect(wrapper.emitted().viewCase).toHaveLength(1);
      expect(wrapper.emitted().convertCase).toBeFalsy();
    });

    it("converted-case 状态下「查看客户」+「查看案件」分别走两个独立事件", async () => {
      setAppLocale("zh-CN");
      const sample = LEAD_DETAIL_SAMPLES["converted-case"];

      const wrapper = mount(LeadDetailHeader, {
        global: { plugins: [i18n] },
        props: {
          lead: sample,
          avatarInitials: "王",
          buttonStates: HEADER_BUTTON_PRESETS.convertedCase,
        },
      });

      const buttons = wrapper.findAll("button");
      const viewCustomerBtn = buttons.find((b) => b.text() === "查看客户");
      const viewCaseBtn = buttons.find((b) => b.text() === "查看案件");
      expect(viewCustomerBtn).toBeTruthy();
      expect(viewCaseBtn).toBeTruthy();

      await viewCustomerBtn!.trigger("click");
      await viewCaseBtn!.trigger("click");

      expect(wrapper.emitted().viewCustomer).toHaveLength(1);
      expect(wrapper.emitted().viewCase).toHaveLength(1);
      expect(wrapper.emitted().convertCustomer).toBeFalsy();
      expect(wrapper.emitted().convertCase).toBeFalsy();
    });
  });

  describe("R2-B-2 头部「编号」chip 优先展示 leadNo", () => {
    it("lead.leadNo 存在时显示 leadNo 而非 UUID", () => {
      setAppLocale("zh-CN");
      const UUID_LEAD = "720dc94b-df0f-4fb5-be18-a514a6cab776";
      const lead = {
        ...LEAD_DETAIL_SAMPLES.following,
        id: UUID_LEAD,
        leadNo: "LEAD-202605-0002",
      };

      const wrapper = mount(LeadDetailHeader, {
        global: { plugins: [i18n] },
        props: {
          lead,
          avatarInitials: "李",
          buttonStates: HEADER_BUTTON_PRESETS.normal,
        },
      });

      const html = wrapper.html();
      expect(html).toContain("LEAD-202605-0002");
      expect(html).not.toContain(UUID_LEAD);
    });

    it("lead.leadNo 缺失时回退展示 lead.id（fixture 兼容）", () => {
      setAppLocale("zh-CN");
      const lead = {
        ...LEAD_DETAIL_SAMPLES.following,
        leadNo: null,
      };

      const wrapper = mount(LeadDetailHeader, {
        global: { plugins: [i18n] },
        props: {
          lead,
          avatarInitials: "李",
          buttonStates: HEADER_BUTTON_PRESETS.normal,
        },
      });

      expect(wrapper.html()).toContain(LEAD_DETAIL_SAMPLES.following.id);
    });
  });

  describe("H-9 owner UUID 回落（列表 / 详情头部不再裸出 UUID）", () => {
    it("ownerLabel 缺失但 ownerId UUID 已在 /api/users 别名表注册 → 显示 displayName", () => {
      setAppLocale("zh-CN");
      const UUID_LOCAL_ADMIN = "00000000-0000-4000-8000-000000000011";
      registerUserAliases([
        { id: UUID_LOCAL_ADMIN, displayName: "Local Admin" },
      ]);
      const lead = {
        ...LEAD_DETAIL_SAMPLES.following,
        ownerId: UUID_LOCAL_ADMIN,
        ownerLabel: "",
      };

      const wrapper = mount(LeadDetailHeader, {
        global: { plugins: [i18n] },
        props: {
          lead,
          avatarInitials: "李",
          buttonStates: HEADER_BUTTON_PRESETS.normal,
        },
      });

      const html = wrapper.html();
      expect(html).toContain("Local Admin");
      expect(html).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    });

    it("ownerLabel 缺失且 alias 未注册 → 显示『未知用户』而非裸 UUID", () => {
      setAppLocale("zh-CN");
      const UUID_UNKNOWN = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
      const lead = {
        ...LEAD_DETAIL_SAMPLES.following,
        ownerId: UUID_UNKNOWN,
        ownerLabel: "",
      };

      const wrapper = mount(LeadDetailHeader, {
        global: { plugins: [i18n] },
        props: {
          lead,
          avatarInitials: "李",
          buttonStates: HEADER_BUTTON_PRESETS.normal,
        },
      });

      const html = wrapper.html();
      expect(html).toContain("未知用户");
      expect(html).not.toContain(UUID_UNKNOWN);
    });

    it("nil UUID（00000000-0000-0000-0000-000000000000）→ 显示『未分配』", () => {
      setAppLocale("zh-CN");
      const NIL_UUID = "00000000-0000-0000-0000-000000000000";
      const lead = {
        ...LEAD_DETAIL_SAMPLES.following,
        ownerId: NIL_UUID,
        ownerLabel: "",
      };

      const wrapper = mount(LeadDetailHeader, {
        global: { plugins: [i18n] },
        props: {
          lead,
          avatarInitials: "李",
          buttonStates: HEADER_BUTTON_PRESETS.normal,
        },
      });

      expect(wrapper.html()).toContain("未分配");
    });
  });
});
