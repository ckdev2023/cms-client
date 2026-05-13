import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseWorkflowStepSection from "./CaseWorkflowStepSection.vue";
import type { WorkflowStepSummary } from "../types-detail";

/** 经营管理签：`VISA_REJECTED` 终局时，`ENTRY_SUCCESS` 不得误判为已完成。 */

const WF_VISA_REJECTED: WorkflowStepSummary = {
  stepCode: "VISA_REJECTED",
  stepLabel: "签证拒否",
  parentStage: "S9",
  parentStageLabel: "",
  sortOrder: 13,
  isFailureStep: true,
};

function bmvStepsStub() {
  const keys = [
    "WAITING_MATERIAL",
    "MATERIAL_PREPARING",
    "REVIEWING",
    "APPLYING",
    "UNDER_REVIEW",
    "NEED_SUPPLEMENT",
    "SUPPLEMENT_PROCESSING",
    "APPROVED",
    "WAITING_PAYMENT",
    "COE_SENT",
    "VISA_APPLYING",
    "ENTRY_SUCCESS",
    "VISA_REJECTED",
    "RESIDENCE_PERIOD_RECORDED",
    "RENEWAL_REMINDER_SCHEDULED",
  ] as const;
  const o: Record<string, string> = {};
  for (const k of keys) o[k] = k;
  return o;
}

const MESSAGES_ZH = {
  "zh-CN": {
    cases: {
      constants: {
        stages: {
          S1: "已建档",
          S2: "资料收集中",
          S3: "资料准备中",
          S4: "文书制作",
          S5: "提交审查",
          S6: "可提交",
          S7: "已提交待回执",
          S8: "结果确认",
          S9: "已归档",
        },
        bmvSteps: bmvStepsStub(),
      },
      detail: {
        overview: {
          workflowStep: {
            title: "workflow title",
            currentLabel: "current",
            stageGroup: "{stage}",
            completed: "已完成",
            current: "进行中",
            upcoming: "待执行",
            failed: "失败",
            skipped: "不适用",
            aborted: "未达成（拒签）",
            stageParallel: "{stage}",
          },
        },
      },
    },
  },
};

describe("CaseWorkflowStepSection — 海外返签拒否支线", () => {
  it("VISA_REJECTED 时 VISA_APPLYING 不得显示「已完成」（避免误认为贴签成功）", () => {
    const i18n = createI18n({
      legacy: false,
      locale: "zh-CN",
      messages: MESSAGES_ZH,
    });
    const w = mount(CaseWorkflowStepSection, {
      props: {
        workflowStep: WF_VISA_REJECTED,
        managementStage: "S9",
        supplementCount: 0,
      },
      global: { plugins: [i18n] },
    });
    const visaRow = w.find('[data-testid="workflow-step-VISA_APPLYING"]');
    expect(visaRow.exists()).toBe(true);
    expect(visaRow.classes()).toContain("wf-section__step--aborted");
    expect(visaRow.text()).toContain("未达成（拒签）");
    expect(visaRow.text()).not.toContain("已完成");
  });

  it("VISA_REJECTED 时 ENTRY_SUCCESS 显示「不适用」而非「已完成」", () => {
    const i18n = createI18n({
      legacy: false,
      locale: "zh-CN",
      messages: MESSAGES_ZH,
    });
    const w = mount(CaseWorkflowStepSection, {
      props: {
        workflowStep: WF_VISA_REJECTED,
        managementStage: "S9",
        supplementCount: 0,
      },
      global: { plugins: [i18n] },
    });
    const entryRow = w.find('[data-testid="workflow-step-ENTRY_SUCCESS"]');
    expect(entryRow.exists()).toBe(true);
    expect(entryRow.classes()).toContain("wf-section__step--skipped");
    expect(entryRow.text()).toContain("不适用");
    expect(entryRow.text()).not.toContain("已完成");
  });

  it("ENTRY_SUCCESS 为当前步骤时，VISA_REJECTED 仍为 upcoming（未选用的拒否分枝）", () => {
    const i18n = createI18n({
      legacy: false,
      locale: "zh-CN",
      messages: MESSAGES_ZH,
    });
    const w = mount(CaseWorkflowStepSection, {
      props: {
        workflowStep: {
          stepCode: "ENTRY_SUCCESS",
          stepLabel: "入境成功",
          parentStage: "S8",
          parentStageLabel: "",
          sortOrder: 12,
          isFailureStep: false,
        },
        managementStage: "S8",
        supplementCount: 0,
      },
      global: { plugins: [i18n] },
    });
    const rejectedRow = w.find('[data-testid="workflow-step-VISA_REJECTED"]');
    expect(rejectedRow.classes()).toContain("wf-section__step--upcoming");
  });
});
