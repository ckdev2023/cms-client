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
          customer: {
            id: "cust-1",
            displayName: "Test",
            customerNumber: "C001",
            furigana: "テスト",
            totalCases: 1,
            activeCases: 0,
            phone: "090-0000-0000",
            email: "test@example.com",
            lastContactDate: null,
            lastContactChannel: null,
            owner: { name: "admin", initials: "A" },
            referralSource: null,
            group: "grp-1",
          },
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
          lead: {
            id: "lead-1",
            name: "Test Lead",
            phone: "090-0000-0000",
            email: "lead@example.com",
            status: "new" as const,
            ownerId: "owner-1",
            groupId: "grp-1",
            businessType: "visa_change",
            source: "web",
            nextFollowUp: null,
            updatedAt: "2026-04-01",
            createdAt: "2026-03-01",
          },
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
          groups: [
            {
              id: "grp-1",
              name: "Tokyo",
              groupNo: "G001",
              status: "active",
              memberCount: 3,
            },
          ],
          statusFilter: "all",
          selectedGroupId: null,
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
