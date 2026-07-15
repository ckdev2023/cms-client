import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

import CaseFilters from "../cases/components/CaseFilters.vue";
import CustomerFilters from "../customers/components/CustomerFilters.vue";
import CustomerBulkActionBar from "../customers/components/CustomerBulkActionBar.vue";
import CustomerTableRow from "../customers/components/CustomerTableRow.vue";
import DocumentFilters from "../documents/components/DocumentFilters.vue";
import LeadFilters from "../leads/components/LeadFilters.vue";
import LeadBulkActionBar from "../leads/components/LeadBulkActionBar.vue";
import LeadTableRow from "../leads/components/LeadTableRow.vue";
import GroupListPanel from "../settings/components/GroupListPanel.vue";
import GroupNameModal from "../settings/components/GroupNameModal.vue";
// 本审计只断言「表单控件有 id 或 name」，props 的具体取值无关紧要，只需是合法对象。
// 此前是手写的最小字面量，从未被类型检查过，已与 CustomerSummary / LeadSummary /
// GroupSummary 漂移（缺必填字段，LeadSummary 上甚至有个不存在的 createdAt）。
// 改用各模块的权威 fixture——与 LeadTableRow.test.ts / CustomerListView.test.ts 同样的用法，
// 类型正确且不会再漂。
import { SAMPLE_CUSTOMERS } from "../customers/fixtures";
import { getLeadSamples } from "../leads/fixtures";
import { SAMPLE_GROUPS } from "../settings/fixtures";

function assertFormFieldsHaveIdOrName(wrapper: ReturnType<typeof mount>) {
  const fields = wrapper.findAll("input, select, textarea");
  const missing: string[] = [];
  for (const field of fields) {
    const el = field.element as HTMLElement;
    const id = el.getAttribute("id");
    const name = el.getAttribute("name");
    if (!id && !name) {
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute("type") ?? "";
      const cls = el.className.split(" ")[0] ?? "";
      missing.push(`<${tag} type="${type}" class="${cls}">`);
    }
  }
  expect(missing, `Fields missing id/name: ${missing.join(", ")}`).toHaveLength(
    0,
  );
}

describe("BUG-206: form fields must have id or name attribute", () => {
  describe("CaseFilters", () => {
    it("all form fields have id or name", () => {
      const wrapper = mount(CaseFilters, {
        global: { plugins: [i18n] },
        props: {
          scope: "mine",
          search: "",
          stage: "",
          owner: "",
          group: "",
          risk: "",
          validation: "",
          filteredCount: 0,
        },
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });

  describe("CustomerFilters", () => {
    it("all form fields have id or name", () => {
      const wrapper = mount(CustomerFilters, {
        global: { plugins: [i18n] },
        props: {},
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });

  describe("CustomerBulkActionBar", () => {
    it("all form fields have id or name", () => {
      const wrapper = mount(CustomerBulkActionBar, {
        global: { plugins: [i18n] },
        props: { selectedCount: 2 },
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });

  describe("CustomerTableRow", () => {
    it("row checkbox has name attribute", () => {
      const wrapper = mount(CustomerTableRow, {
        global: { plugins: [i18n] },
        props: {
          customer: SAMPLE_CUSTOMERS[0]!,
        },
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });

  describe("DocumentFilters", () => {
    it("all form fields have id or name", () => {
      const wrapper = mount(DocumentFilters, {
        global: { plugins: [i18n] },
        props: {},
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });

  describe("LeadFilters", () => {
    it("all form fields have id or name", () => {
      const wrapper = mount(LeadFilters, {
        global: { plugins: [i18n] },
        props: {},
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });

  describe("LeadBulkActionBar", () => {
    it("all form fields have id or name", () => {
      const wrapper = mount(LeadBulkActionBar, {
        global: { plugins: [i18n] },
        props: { selectedCount: 3 },
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });

  describe("LeadTableRow", () => {
    it("row checkbox has name attribute", () => {
      const wrapper = mount(LeadTableRow, {
        global: { plugins: [i18n] },
        props: {
          lead: getLeadSamples("zh-CN")[0]!,
        },
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });

  describe("Settings — GroupListPanel", () => {
    it("filter select has id or name", () => {
      const wrapper = mount(GroupListPanel, {
        global: { plugins: [i18n] },
        props: {
          groups: SAMPLE_GROUPS,
          // 此前只传 groups，filteredGroups 走默认 []，面板其实一行都没渲染——
          // 审计只覆盖到了筛选 select。补齐后列表行也进入审计范围。
          filteredGroups: SAMPLE_GROUPS,
          statusFilter: "",
          selectedGroupId: null,
          isEmpty: false,
        },
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });

  describe("Settings — GroupNameModal", () => {
    it("input has id and name", () => {
      const wrapper = mount(GroupNameModal, {
        global: { plugins: [i18n] },
        props: {
          open: true,
          mode: "create",
          inputValue: "",
          canSubmit: false,
        },
      });
      assertFormFieldsHaveIdOrName(wrapper);
    });
  });
});
