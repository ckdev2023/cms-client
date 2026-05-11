import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CaseTemplateCreateDialog from "./CaseTemplateCreateDialog.vue";
import { i18n } from "../../i18n";
import type {
  CaseTemplateDetail,
  CaseTemplateItem,
} from "./model/CaseTemplatesRepository";

const CASE_TYPE_OPTIONS = ["dependent_visa", "work", "business_manager_visa"];

const SOURCE_TEMPLATES: CaseTemplateItem[] = [
  {
    id: "t-src",
    orgId: "org-1",
    templateName: "Source Template",
    caseType: "dependent_visa",
    applicationType: "initial",
    blueprintItemCount: 2,
    reviewRequiredFlag: true,
    billingGateMode: "block",
    activeFlag: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const SOURCE_DETAIL: CaseTemplateDetail = {
  ...SOURCE_TEMPLATES[0],
  requirementBlueprint: { items: [{ code: "passport" }, { code: "photo" }] },
  defaultTasksBlueprint: null,
};

function mountDialog(propsOverrides: Record<string, unknown> = {}) {
  return mount(CaseTemplateCreateDialog, {
    global: { plugins: [i18n] },
    props: {
      saving: false,
      errorCode: null,
      caseTypeOptions: CASE_TYPE_OPTIONS,
      sourceTemplates: SOURCE_TEMPLATES,
      loadingSource: false,
      sourceDetail: null,
      ...propsOverrides,
    },
  });
}

describe("CaseTemplateCreateDialog", () => {
  it("does not emit submit when blueprint field has invalid JSON", async () => {
    const wrapper = mountDialog();

    await wrapper
      .get('[data-testid="create-template-name"]')
      .setValue("模板 A");
    await wrapper
      .get('[data-testid="create-case-type"]')
      .setValue("dependent_visa");
    await wrapper
      .get('[data-testid="create-blueprint-toggle"]')
      .trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper
      .get('[data-testid="create-blueprint-json"]')
      .setValue("{not json");

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(
      wrapper.find('[data-testid="blueprint-parse-error"]').text(),
    ).toContain("JSON");
  });

  it("emits submit with selected case type from dropdown", async () => {
    const wrapper = mountDialog();

    await wrapper
      .get('[data-testid="create-template-name"]')
      .setValue("模板 B");
    await wrapper
      .get('[data-testid="create-case-type"]')
      .setValue("business_manager_visa");

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    const submitted = wrapper.emitted("submit")?.[0]?.[0];
    expect(submitted).toMatchObject({
      templateName: "模板 B",
      caseType: "business_manager_visa",
    });
    expect(submitted?.requirementBlueprint).toBeUndefined();
  });

  it("renders case type options as <select> options", () => {
    const wrapper = mountDialog();
    const options = wrapper
      .get('[data-testid="create-case-type"]')
      .findAll("option");
    const values = options.map((o) => o.element.value);
    expect(values).toContain("dependent_visa");
    expect(values).toContain("work");
    expect(values).toContain("business_manager_visa");
  });

  it("emits submit with custom case type when toggle is enabled", async () => {
    const wrapper = mountDialog();

    await wrapper
      .get('[data-testid="create-template-name"]')
      .setValue("Custom");
    await wrapper
      .get('[data-testid="create-case-type-custom-toggle"]')
      .setValue(true);
    await wrapper.vm.$nextTick();

    await wrapper
      .get('[data-testid="create-case-type-custom"]')
      .setValue("my_custom_type");

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    const submitted = wrapper.emitted("submit")?.[0]?.[0];
    expect(submitted).toMatchObject({
      templateName: "Custom",
      caseType: "my_custom_type",
    });
  });

  it("shows source template picker when copy mode is selected", async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="create-mode-copy"]').setValue(true);
    await wrapper.vm.$nextTick();

    expect(
      wrapper.find('[data-testid="create-source-template"]').exists(),
    ).toBe(true);
  });

  it("emits request-source when a source template is selected", async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="create-mode-copy"]').setValue(true);
    await wrapper.vm.$nextTick();

    await wrapper
      .get('[data-testid="create-source-template"]')
      .setValue("t-src");
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("request-source")?.[0]).toEqual(["t-src"]);
  });

  it("pre-fills form when sourceDetail is provided in copy mode", async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="create-mode-copy"]').setValue(true);
    await wrapper.vm.$nextTick();

    await wrapper.setProps({ sourceDetail: SOURCE_DETAIL });
    await wrapper.vm.$nextTick();

    const caseTypeSelect = wrapper.get('[data-testid="create-case-type"]');
    expect((caseTypeSelect.element as HTMLSelectElement).value).toBe(
      "dependent_visa",
    );
    expect((caseTypeSelect.element as HTMLSelectElement).disabled).toBe(true);
  });

  it("submits with pre-filled blueprint from copy without opening JSON editor", async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="create-mode-copy"]').setValue(true);
    await wrapper.vm.$nextTick();

    await wrapper.setProps({ sourceDetail: SOURCE_DETAIL });
    await wrapper.vm.$nextTick();

    await wrapper
      .get('[data-testid="create-template-name"]')
      .setValue("Copied Template");

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    const submitted = wrapper.emitted("submit")?.[0]?.[0];
    expect(submitted).toMatchObject({
      templateName: "Copied Template",
      caseType: "dependent_visa",
    });
    const bp = submitted?.requirementBlueprint as unknown[];
    expect(bp).toHaveLength(2);
    expect(bp[0]).toMatchObject({ checklistItemCode: "passport" });
    expect(bp[1]).toMatchObject({ checklistItemCode: "photo" });
  });
});
