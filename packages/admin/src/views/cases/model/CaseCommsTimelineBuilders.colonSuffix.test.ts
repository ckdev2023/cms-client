import { describe, it, expect } from "vitest";
import { buildCaseTimelineMessageResult } from "./CaseCommsTimelineBuilders";

describe("CaseCommsTimelineBuilders — colonSuffix propagation", () => {
  const cases: Array<{
    action: string;
    payloadWithSuffix: Record<string, unknown>;
    expectedSuffix: string;
    label: string;
  }> = [
    {
      action: "case.created",
      payloadWithSuffix: { caseTypeCode: "biz_mgmt_cert_4m" },
      expectedSuffix: "biz_mgmt_cert_4m",
      label: "case.created",
    },
    {
      action: "case.billing_risk_acknowledged",
      payloadWithSuffix: { reasonCode: "low_risk" },
      expectedSuffix: "low_risk",
      label: "case.billing_risk_acknowledged",
    },
    {
      action: "case.post_approval_stage_changed",
      payloadWithSuffix: { stage: "monitoring" },
      expectedSuffix: "monitoring",
      label: "case.post_approval_stage_changed",
    },
    {
      action: "case.cross_group_created",
      payloadWithSuffix: { reason: "複数拠点" },
      expectedSuffix: "複数拠点",
      label: "case.cross_group_created",
    },
    {
      action: "communication_log.created",
      payloadWithSuffix: { channelType: "phone" },
      expectedSuffix: "phone",
      label: "communication_log.created",
    },
    {
      action: "case_party.created",
      payloadWithSuffix: { partyName: "テスト人" },
      expectedSuffix: "テスト人",
      label: "case_party.created",
    },
    {
      action: "document_item.created",
      payloadWithSuffix: { itemName: "在留カード" },
      expectedSuffix: "在留カード",
      label: "document_item.created",
    },
    {
      action: "document_file.created",
      payloadWithSuffix: { fileName: "passport.pdf" },
      expectedSuffix: "passport.pdf",
      label: "document_file.created",
    },
    {
      action: "task.created",
      payloadWithSuffix: { title: "書類確認" },
      expectedSuffix: "書類確認",
      label: "task.created",
    },
    {
      action: "billing_record.created",
      payloadWithSuffix: { amount: "¥100,000" },
      expectedSuffix: "¥100,000",
      label: "billing_record.created",
    },
    {
      action: "payment_record.created",
      payloadWithSuffix: { amount: "¥50,000" },
      expectedSuffix: "¥50,000",
      label: "payment_record.created",
    },
    {
      action: "review_record.rejected",
      payloadWithSuffix: { reason: "書類不備" },
      expectedSuffix: "書類不備",
      label: "review_record.rejected",
    },
    {
      action: "reminder.created",
      payloadWithSuffix: { label: "期限通知" },
      expectedSuffix: "期限通知",
      label: "reminder.created",
    },
    {
      action: "residence_period.created",
      payloadWithSuffix: { kind: "initial" },
      expectedSuffix: "initial",
      label: "residence_period.created",
    },
  ];

  describe("emits colonSuffix when suffix is present", () => {
    for (const { action, payloadWithSuffix, expectedSuffix, label } of cases) {
      it(`${label} → colonSuffix === "：${expectedSuffix}"`, () => {
        const result = buildCaseTimelineMessageResult(
          action,
          payloadWithSuffix,
        );
        expect(result.params!.colonSuffix).toBe(`：${expectedSuffix}`);
      });
    }
  });

  describe("emits empty colonSuffix when suffix is missing", () => {
    for (const { action, label } of cases) {
      it(`${label} → colonSuffix === ""`, () => {
        const result = buildCaseTimelineMessageResult(action, {});
        expect(result.params!.colonSuffix).toBe("");
      });
    }
  });

  describe("emits suffixKey alongside colonSuffix when payload has i18n-key suffix", () => {
    it("case.created → suffixKey + suffix + colonSuffix", () => {
      const result = buildCaseTimelineMessageResult("case.created", {
        caseTypeCode: "biz_mgmt_cert_4m",
      });
      expect(result.params).toMatchObject({
        suffix: "biz_mgmt_cert_4m",
        colonSuffix: "：biz_mgmt_cert_4m",
        suffixKey: "cases.constants.caseTypes.biz_mgmt_cert_4m",
      });
    });

    it("case.created with empty payload → suffixKey is empty", () => {
      const result = buildCaseTimelineMessageResult("case.created", {});
      expect(result.params).toMatchObject({
        suffix: "",
        colonSuffix: "",
        suffixKey: "",
      });
    });

    it("communication_log.created → suffixKey + suffix + colonSuffix", () => {
      const result = buildCaseTimelineMessageResult(
        "communication_log.created",
        { channelType: "internal_note" },
      );
      expect(result.params).toMatchObject({
        suffix: "internal_note",
        colonSuffix: "：internal_note",
        suffixKey: "cases.detail.messages.types.internal_note",
      });
    });

    it("communication_log.created with unknown channel → suffixKey falls back to other", () => {
      const result = buildCaseTimelineMessageResult(
        "communication_log.created",
        { channelType: "carrier_pigeon" },
      );
      expect(result.params).toMatchObject({
        suffix: "carrier_pigeon",
        colonSuffix: "：carrier_pigeon",
        suffixKey: "cases.detail.messages.types.other",
      });
    });

    it("communication_log.created with empty payload → suffixKey is empty", () => {
      const result = buildCaseTimelineMessageResult(
        "communication_log.created",
        {},
      );
      expect(result.params).toMatchObject({
        suffix: "",
        colonSuffix: "",
        suffixKey: "",
      });
    });
  });
});
