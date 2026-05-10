import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseOverviewNextAction from "./CaseOverviewNextAction.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import { createMockDetail } from "../model/useCaseDetailModel.test-support";

const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  messages: { cases: casesZhCN },
});

describe("CaseOverviewNextAction — secondary button disable gate", () => {
  it("does not disable secondary when target tab is deadlines and validation is off", () => {
    const detail = createMockDetail({
      businessPhase: "WAITING_MATERIAL",
      overviewActions: {
        primary: { label: "cases.coach.docManagement", tab: "documents" },
        secondary: { label: "cases.coach.setDeadline", tab: "deadlines" },
      },
    });
    const w = mount(CaseOverviewNextAction, {
      props: { detail, canRunValidation: false },
      global: { plugins: [i18n] },
    });
    const buttons = w.findAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(buttons[1]!.attributes("disabled")).toBeUndefined();
  });

  it("disables secondary when target tab is validation and validation is off", () => {
    const detail = createMockDetail({
      businessPhase: "MATERIAL_PREPARING",
      overviewActions: {
        primary: { label: "cases.coach.docManagement", tab: "documents" },
        secondary: { label: "cases.coach.runValidation", tab: "validation" },
      },
    });
    const w = mount(CaseOverviewNextAction, {
      props: { detail, canRunValidation: false },
      global: { plugins: [i18n] },
    });
    const buttons = w.findAll("button");
    expect(buttons[1]!.attributes("disabled")).toBeDefined();
  });

  it("enables secondary for validation tab when canRunValidation is true", () => {
    const detail = createMockDetail({
      overviewActions: {
        primary: { label: "cases.coach.docManagement", tab: "documents" },
        secondary: { label: "cases.coach.runValidation", tab: "validation" },
      },
    });
    const w = mount(CaseOverviewNextAction, {
      props: { detail, canRunValidation: true },
      global: { plugins: [i18n] },
    });
    const buttons = w.findAll("button");
    expect(buttons[1]!.attributes("disabled")).toBeUndefined();
  });
});
