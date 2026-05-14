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

function buildDetail(
  phase: string,
  extras?: Pick<CaseDetail, "failureCloseout" | "caseType"> &
    Partial<CaseDetail>,
): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    /** 与聚合层一致的种类码；契约样本 `caseType` 字段仍为展示名时由 `titleFallbackParts` 为准。 */
    caseType: "work",
    titleFallbackParts: {
      ...CASE_DETAIL_SAMPLES.work.titleFallbackParts,
      caseTypeCode: "work",
    },
    businessPhase: phase,
    doubleReview: [],
    reviewEnabled: false,
    riskConfirmationRecord: null,
    ...extras,
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

function getPostApprovalNote(
  locale: Locale,
  phase: string,
  extras?: Pick<CaseDetail, "failureCloseout">,
): string {
  return mountSupport(locale, buildDetail(phase, extras))
    .find(".valsup__post-note")
    .text();
}

const POST_APPROVAL_KEYS = [
  "notePreSubmission",
  "notePostSubmission",
  "noteImmigrationRejected",
  "noteAwaitingCoe",
  "noteAwaitingCoeMilestoneMissing",
  "noteAwaitingCoePaymentOutstanding",
  "noteAwaitingCoeBillingRiskUnacknowledged",
  "noteAwaitingVisaStamp",
  "noteDomesticTypicalSansCoeChain",
  "noteOverseasVisaApplying",
  "noteVisaRejected",
  "noteFailureClosed",
  "noteCompleted",
] as const;

describe("CaseValidationSupport — coeNoteKeySuffix phase-text mapping", () => {
  describe("i18n dictionaries completeness", () => {
    const dicts: Record<Locale, Record<string, unknown>> = {
      "zh-CN": casesZhCN.detail.validation.postApproval,
      "ja-JP": casesJaJP.detail.validation.postApproval,
      "en-US": casesEnUS.detail.validation.postApproval,
    };

    for (const key of POST_APPROVAL_KEYS) {
      it(`all 3 locales define postApproval.${key}`, () => {
        for (const locale of ["zh-CN", "ja-JP", "en-US"] as Locale[]) {
          const val = dicts[locale][key];
          expect(val, `${locale} missing ${key}`).toBeDefined();
          expect(typeof val, `${locale} ${key} should be string`).toBe(
            "string",
          );
          expect(
            (val as string).length,
            `${locale} ${key} should not be empty`,
          ).toBeGreaterThan(0);
        }
      });
    }
  });

  describe("pre-submission phases → notePreSubmission", () => {
    const phases = [
      "CONSULTING",
      "CONTRACTED",
      "WAITING_MATERIAL",
      "MATERIAL_PREPARING",
      "REVIEWING",
      "APPLYING",
    ];

    for (const phase of phases) {
      it(`${phase} → notePreSubmission (zh-CN)`, () => {
        const text = getPostApprovalNote("zh-CN", phase);
        expect(text).toContain("提交前或补正处理阶段");
      });
    }
  });

  describe("post-submission phases → notePostSubmission", () => {
    const phases = ["UNDER_REVIEW", "NEED_SUPPLEMENT", "SUPPLEMENT_PROCESSING"];

    for (const phase of phases) {
      it(`${phase} → notePostSubmission (zh-CN)`, () => {
        const text = getPostApprovalNote("zh-CN", phase);
        expect(text).toContain("已提交至入管局");
      });
    }
  });

  describe("immigration REJECTED → noteImmigrationRejected", () => {
    it("REJECTED → noteImmigrationRejected (zh-CN)", () => {
      const text = getPostApprovalNote("zh-CN", "REJECTED");
      expect(text).toContain("不许可");
      expect(text).not.toContain("已获批准");
    });

    it("REJECTED → noteImmigrationRejected (ja-JP)", () => {
      const text = getPostApprovalNote("ja-JP", "REJECTED");
      expect(text).toContain("不許可");
    });

    it("REJECTED → noteImmigrationRejected (en-US)", () => {
      const text = getPostApprovalNote("en-US", "REJECTED");
      expect(text).toContain("did not grant");
    });
  });

  describe("awaiting-COE phases → noteAwaitingCoe", () => {
    const phases = ["APPROVED", "WAITING_PAYMENT"];

    for (const phase of phases) {
      it(`${phase} → noteAwaitingCoe (zh-CN)`, () => {
        const text = getPostApprovalNote("zh-CN", phase);
        expect(text).toContain("已获批准");
        expect(text).toContain("COE");
      });
    }

    it("WAITING_PAYMENT → noteAwaitingCoe (ja-JP)", () => {
      const text = getPostApprovalNote("ja-JP", "WAITING_PAYMENT");
      expect(text).toContain("許可済み");
      expect(text).toContain("COE");
    });

    it("WAITING_PAYMENT → noteAwaitingCoe (en-US)", () => {
      const text = getPostApprovalNote("en-US", "WAITING_PAYMENT");
      expect(text).toContain("approved");
      expect(text).toContain("COE");
    });
  });

  describe("awaiting COE + finalPaymentGate → specialized post-approval notes", () => {
    const milestoneBlocked = {
      paymentCleared: false,
      finalPaymentMilestoneMatched: false,
      outstandingLabel: "",
      canAdvanceToCoe: false,
      blockers: [
        {
          code: "final_payment_milestone_missing" as const,
          label: "final_payment_milestone_missing",
        },
      ],
    };

    const outstandingBlocked = {
      paymentCleared: false,
      finalPaymentMilestoneMatched: true,
      outstandingLabel: "¥50,000",
      canAdvanceToCoe: false,
      blockers: [
        {
          code: "final_payment_outstanding" as const,
          label: "final_payment_outstanding",
        },
      ],
    };

    const riskBlocked = {
      paymentCleared: false,
      finalPaymentMilestoneMatched: true,
      outstandingLabel: "¥40,000",
      canAdvanceToCoe: false,
      blockers: [
        {
          code: "final_payment_outstanding" as const,
          label: "final_payment_outstanding",
        },
        {
          code: "billing_risk_unacknowledged" as const,
          label: "billing_risk_unacknowledged",
        },
      ],
    };

    it("WAITING_PAYMENT + milestone missing → specialized copy (zh-CN)", () => {
      const text = mountSupport(
        "zh-CN",
        buildDetail("WAITING_PAYMENT", { finalPaymentGate: milestoneBlocked }),
      )
        .find(".valsup__post-note")
        .text();
      expect(text).toContain("尚未");
      expect(text).toContain("收费");
      expect(text).toContain("COE");
    });

    it("WAITING_PAYMENT + outstanding → specialized copy (zh-CN)", () => {
      const text = mountSupport(
        "zh-CN",
        buildDetail("WAITING_PAYMENT", {
          finalPaymentGate: outstandingBlocked,
        }),
      )
        .find(".valsup__post-note")
        .text();
      expect(text).toContain("本案应收尚未结清");
    });

    it("WAITING_PAYMENT + outstanding + risk → risk-first specialized copy (zh-CN)", () => {
      const text = mountSupport(
        "zh-CN",
        buildDetail("WAITING_PAYMENT", { finalPaymentGate: riskBlocked }),
      )
        .find(".valsup__post-note")
        .text();
      expect(text).toContain("欠款风险尚未确认");
    });

    it("WAITING_PAYMENT + canAdvanceToCoe → generic awaiting COE (zh-CN)", () => {
      const text = mountSupport(
        "zh-CN",
        buildDetail("WAITING_PAYMENT", {
          finalPaymentGate: {
            paymentCleared: true,
            finalPaymentMilestoneMatched: true,
            outstandingLabel: "",
            canAdvanceToCoe: true,
            blockers: [],
          },
        }),
      )
        .find(".valsup__post-note")
        .text();
      expect(text).toContain("正在等待本案应收结清后发送");
    });

    it("en-US milestone missing — no Han script leakage", () => {
      const text = mountSupport(
        "en-US",
        buildDetail("WAITING_PAYMENT", { finalPaymentGate: milestoneBlocked }),
      )
        .find(".valsup__post-note")
        .text();
      expect(text).toMatch(/approved/i);
      expect(text).not.toMatch(/\p{Script=Han}/u);
    });
  });

  describe("WAITING_PAYMENT — COE path vs renewal / domestic default", () => {
    it("biz_mgmt_renewal + WAITING_PAYMENT uses domestic wording (zh-CN)", () => {
      const base = buildDetail("WAITING_PAYMENT");
      const text = mountSupport("zh-CN", {
        ...base,
        caseType: "biz_mgmt_renewal",
        titleFallbackParts: {
          ...base.titleFallbackParts,
          caseTypeCode: "biz_mgmt_renewal",
        },
      })
        .find(".valsup__post-note")
        .text();
      expect(text).toContain("国内");
      expect(text).not.toContain("COE");
    });

    it("work_visa_renewal + WAITING_PAYMENT uses domestic wording (zh-CN)", () => {
      const text = mountSupport(
        "zh-CN",
        buildDetail("WAITING_PAYMENT", {
          caseType: "work_visa_renewal",
          titleFallbackParts: {
            ...CASE_DETAIL_SAMPLES.work.titleFallbackParts,
            caseTypeCode: "work_visa_renewal",
          },
        }),
      )
        .find(".valsup__post-note")
        .text();
      expect(text).toContain("国内");
      expect(text).not.toContain("COE");
    });
  });

  describe("COE_SENT → noteAwaitingVisaStamp", () => {
    it("COE_SENT (zh-CN)", () => {
      const text = getPostApprovalNote("zh-CN", "COE_SENT");
      expect(text).toContain("COE 已发送");
      expect(text).toContain("海外领馆");
    });

    it("COE_SENT (ja-JP)", () => {
      const text = getPostApprovalNote("ja-JP", "COE_SENT");
      expect(text).toContain("COE は送付済み");
    });

    it("COE_SENT (en-US)", () => {
      const text = getPostApprovalNote("en-US", "COE_SENT");
      expect(text).toContain("COE has been dispatched");
    });
  });

  describe("VISA_APPLYING → noteOverseasVisaApplying", () => {
    it("VISA_APPLYING (zh-CN)", () => {
      const text = getPostApprovalNote("zh-CN", "VISA_APPLYING");
      expect(text).toContain("海外返签");
      expect(text).toContain("贴签");
    });

    it("VISA_APPLYING (ja-JP)", () => {
      const text = getPostApprovalNote("ja-JP", "VISA_APPLYING");
      expect(text).toContain("海外査証");
    });

    it("VISA_APPLYING (en-US)", () => {
      const text = getPostApprovalNote("en-US", "VISA_APPLYING");
      expect(text.toLowerCase()).toContain("overseas");
      expect(text.toLowerCase()).toContain("consular");
    });
  });

  describe("VISA_REJECTED phase → noteVisaRejected", () => {
    it("VISA_REJECTED → noteVisaRejected (zh-CN)", () => {
      const text = getPostApprovalNote("zh-CN", "VISA_REJECTED");
      expect(text).toContain("拒签");
    });

    it("VISA_REJECTED → noteVisaRejected (ja-JP)", () => {
      const text = getPostApprovalNote("ja-JP", "VISA_REJECTED");
      expect(text).toContain("不許可");
    });

    it("VISA_REJECTED → noteVisaRejected (en-US)", () => {
      const text = getPostApprovalNote("en-US", "VISA_REJECTED");
      expect(text).toContain("refusal");
    });
  });

  describe("completed phases → noteCompleted", () => {
    const phases = [
      "SUCCESS",
      "ENTRY_SUCCESS",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
      "CLOSED_SUCCESS",
    ];

    for (const phase of phases) {
      it(`${phase} → noteCompleted (zh-CN)`, () => {
        const text = getPostApprovalNote("zh-CN", phase);
        expect(text).toContain("已完成");
      });
    }

    it("CLOSED_SUCCESS → noteCompleted (ja-JP)", () => {
      const text = getPostApprovalNote("ja-JP", "CLOSED_SUCCESS");
      expect(text).toContain("完了");
    });

    it("CLOSED_SUCCESS → noteCompleted (en-US)", () => {
      const text = getPostApprovalNote("en-US", "CLOSED_SUCCESS");
      expect(text).toContain("complete");
    });
  });

  describe("CLOSED_FAILED + failureCloseout → post-approval note", () => {
    const fcVisa = {
      isFailurePath: true,
      reasonCode: "VISA_REJECTED",
      reasonLabel: "海外返签拒否",
      canDirectClose: true,
      closeReasonRequired: false,
    } as const;

    const fcImmigration = {
      isFailurePath: true,
      reasonCode: "APPLICATION_REJECTED",
      reasonLabel: "入管申請拒否",
      canDirectClose: true,
      closeReasonRequired: false,
    } as const;

    it("CLOSED_FAILED + VISA_REJECTED → noteVisaRejected (zh-CN)", () => {
      const text = getPostApprovalNote("zh-CN", "CLOSED_FAILED", {
        failureCloseout: fcVisa,
      });
      expect(text).toContain("拒签");
      expect(text).not.toContain("已完成");
    });

    it("CLOSED_FAILED + APPLICATION_REJECTED → noteImmigrationRejected (zh-CN)", () => {
      const text = getPostApprovalNote("zh-CN", "CLOSED_FAILED", {
        failureCloseout: fcImmigration,
      });
      expect(text).toContain("不许可");
    });

    it("CLOSED_FAILED without reasonCode → noteFailureClosed (zh-CN)", () => {
      const text = getPostApprovalNote("zh-CN", "CLOSED_FAILED", {
        failureCloseout: {
          isFailurePath: true,
          reasonCode: null,
          reasonLabel: null,
          canDirectClose: false,
          closeReasonRequired: true,
        },
      });
      expect(text).toContain("失败结案");
    });

    it("CLOSED_FAILED without failureCloseout → noteFailureClosed (en-US)", () => {
      const text = getPostApprovalNote("en-US", "CLOSED_FAILED");
      expect(text.toLowerCase()).toContain("failure");
    });
  });

  describe("unknown phase falls through to notePreSubmission", () => {
    it("SOME_UNKNOWN_PHASE → notePreSubmission (zh-CN)", () => {
      const text = getPostApprovalNote("zh-CN", "SOME_UNKNOWN_PHASE");
      expect(text).toContain("提交前或补正处理阶段");
    });
  });
});
