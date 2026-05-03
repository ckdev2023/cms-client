import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseValidationSupport from "./CaseValidationSupport.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildDetail(overrides: Partial<CaseDetail>): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    doubleReview: [],
    riskConfirmationRecord: null,
    ...overrides,
  };
}

function mountSupport(locale: Locale, detail: CaseDetail) {
  return mount(CaseValidationSupport, {
    props: { detail, readonly: false },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: {
          template:
            '<section><header><slot name="header" /></header><slot /><footer><slot name="footer" /></footer></section>',
        },
        Button: { template: "<button><slot /></button>" },
        Chip: {
          template: '<span class="chip"><slot /></span>',
          props: ["tone", "size"],
        },
      },
    },
  });
}

describe("BUG-R27-J — CaseValidationSupport coeCard.note branches by phase", () => {
  it("S1 phase (WAITING_MATERIAL) → notePreSubmission", () => {
    const detail = buildDetail({
      stageCode: "S2",
      businessPhase: "WAITING_MATERIAL",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("提交前或补正处理阶段");
    expect(html).not.toContain("已提交至入管局");
  });

  it("S5 phase (APPLYING) → notePreSubmission", () => {
    const detail = buildDetail({
      stageCode: "S5",
      businessPhase: "APPLYING",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("提交前或补正处理阶段");
  });

  it("S7 phase (UNDER_REVIEW) → notePostSubmission", () => {
    const detail = buildDetail({
      stageCode: "S7",
      businessPhase: "UNDER_REVIEW",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("已提交至入管局");
    expect(html).not.toContain("提交前或补正处理阶段");
  });

  it("APPROVED phase → noteAwaitingCoe", () => {
    const detail = buildDetail({
      stageCode: "S8",
      businessPhase: "APPROVED",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("已获批准");
    expect(html).toContain("COE");
  });

  it("WAITING_PAYMENT phase → noteAwaitingCoe", () => {
    const detail = buildDetail({
      stageCode: "S8",
      businessPhase: "WAITING_PAYMENT",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("已获批准");
  });

  it("COE_SENT phase → noteAwaitingVisaStamp", () => {
    const detail = buildDetail({
      stageCode: "S8",
      businessPhase: "COE_SENT",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("COE 已发送");
    expect(html).toContain("海外");
  });

  it("VISA_APPLYING phase → noteAwaitingVisaStamp", () => {
    const detail = buildDetail({
      stageCode: "S8",
      businessPhase: "VISA_APPLYING",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("COE 已发送");
  });

  it("CLOSED_SUCCESS phase → noteCompleted", () => {
    const detail = buildDetail({
      stageCode: "S9",
      businessPhase: "CLOSED_SUCCESS",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("已完成");
  });

  it("CLOSED_FAILED phase → noteCompleted", () => {
    const detail = buildDetail({
      stageCode: "S9",
      businessPhase: "CLOSED_FAILED",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("已完成");
  });

  it("S7 phase (UNDER_REVIEW) in en-US → notePostSubmission", () => {
    const detail = buildDetail({
      stageCode: "S7",
      businessPhase: "UNDER_REVIEW",
    });
    const html = mountSupport("en-US", detail).html();
    expect(html).toContain("submitted to the immigration bureau");
    expect(html).not.toContain("pre-submission or supplement stage");
  });

  it("S7 phase (UNDER_REVIEW) in ja-JP → notePostSubmission", () => {
    const detail = buildDetail({
      stageCode: "S7",
      businessPhase: "UNDER_REVIEW",
    });
    const html = mountSupport("ja-JP", detail).html();
    expect(html).toContain("入管局に提出済み");
    expect(html).not.toContain("提出前または補正処理段階");
  });

  it("NEED_SUPPLEMENT phase → notePostSubmission (not preSubmission)", () => {
    const detail = buildDetail({
      stageCode: "S7",
      businessPhase: "NEED_SUPPLEMENT",
    });
    const html = mountSupport("zh-CN", detail).html();
    expect(html).toContain("已提交至入管局");
  });
});
