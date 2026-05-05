import { describe, it, expect } from "vitest";
import {
  resolveTimelineParams,
  resolveTimelineText,
  type I18nAccessor,
  type TimelineTextSource,
} from "./CaseTimelineTextResolver";
import { buildCaseTimelineMessageResult } from "./CaseCommsTimelineBuilders";

function stubI18n(translations: Record<string, string> = {}): I18nAccessor {
  return {
    te: (key) => key in translations,
    t: (key) => translations[key] ?? key,
  };
}

describe("CaseTimelineTextResolver — resolveTimelineParams", () => {
  describe("raw suffix only (no suffixKey) — colonSuffix keeps builder value", () => {
    it("preserves colonSuffix when suffixKey is absent", () => {
      const params = resolveTimelineParams(
        { suffix: "low_risk", colonSuffix: "：low_risk" },
        stubI18n(),
      );
      expect(params.suffix).toBe("low_risk");
      expect(params.colonSuffix).toBe("：low_risk");
    });

    it("preserves colonSuffix when suffixKey is empty string", () => {
      const params = resolveTimelineParams(
        { suffix: "low_risk", colonSuffix: "：low_risk", suffixKey: "" },
        stubI18n(),
      );
      expect(params.suffix).toBe("low_risk");
      expect(params.colonSuffix).toBe("：low_risk");
    });
  });

  describe("empty suffix — colonSuffix stays empty", () => {
    it("keeps colonSuffix empty when suffix is empty", () => {
      const params = resolveTimelineParams(
        { suffix: "", colonSuffix: "" },
        stubI18n(),
      );
      expect(params.suffix).toBe("");
      expect(params.colonSuffix).toBe("");
    });

    it("keeps colonSuffix empty with empty suffixKey", () => {
      const params = resolveTimelineParams(
        { suffix: "", colonSuffix: "", suffixKey: "" },
        stubI18n(),
      );
      expect(params.suffix).toBe("");
      expect(params.colonSuffix).toBe("");
    });
  });

  describe("suffixKey present — colonSuffix syncs after translation", () => {
    it("recalculates colonSuffix from translated suffix", () => {
      const i18n = stubI18n({
        "cases.constants.caseTypes.biz_mgmt_cert_4m": "経営管理4月",
      });
      const params = resolveTimelineParams(
        {
          suffix: "biz_mgmt_cert_4m",
          colonSuffix: "：biz_mgmt_cert_4m",
          suffixKey: "cases.constants.caseTypes.biz_mgmt_cert_4m",
        },
        i18n,
      );
      expect(params.suffix).toBe("経営管理4月");
      expect(params.colonSuffix).toBe("：経営管理4月");
    });

    it("produces empty colonSuffix when translated suffix is empty", () => {
      const i18n = stubI18n({ "some.key": "" });
      const params = resolveTimelineParams(
        {
          suffix: "raw_value",
          colonSuffix: "：raw_value",
          suffixKey: "some.key",
        },
        i18n,
      );
      expect(params.suffix).toBe("");
      expect(params.colonSuffix).toBe("");
    });

    it("falls back to builder colonSuffix when i18n key is missing", () => {
      const i18n = stubI18n({});
      const params = resolveTimelineParams(
        {
          suffix: "biz_mgmt_cert_4m",
          colonSuffix: "：biz_mgmt_cert_4m",
          suffixKey: "cases.constants.caseTypes.biz_mgmt_cert_4m",
        },
        i18n,
      );
      expect(params.suffix).toBe("biz_mgmt_cert_4m");
      expect(params.colonSuffix).toBe("：biz_mgmt_cert_4m");
    });
  });
});

describe("CaseTimelineTextResolver — resolveTimelineText", () => {
  it("translates text key with resolved params", () => {
    const i18n = stubI18n({
      "cases.log.timeline.caseCreated": "案件作成{colonSuffix}",
      "cases.constants.caseTypes.biz_mgmt_cert_4m": "経営管理4月",
    });
    const entry: TimelineTextSource = {
      text: "cases.log.timeline.caseCreated",
      textParams: {
        suffix: "biz_mgmt_cert_4m",
        colonSuffix: "：biz_mgmt_cert_4m",
        suffixKey: "cases.constants.caseTypes.biz_mgmt_cert_4m",
      },
    };
    const result = resolveTimelineText(entry, i18n);
    expect(result).toBe("案件作成{colonSuffix}");
  });

  it("returns fallback when text key is unknown", () => {
    const entry: TimelineTextSource = {
      text: "cases.log.timeline.unknown_action",
      textParams: { fallback: "unknown.action" },
    };
    const result = resolveTimelineText(entry, stubI18n());
    expect(result).toBe("unknown.action");
  });
});

describe("CaseTimelineTextResolver — real builder integration", () => {
  describe("case.created (caseTypeCode: biz_mgmt_cert_4m)", () => {
    const builderResult = buildCaseTimelineMessageResult("case.created", {
      caseTypeCode: "biz_mgmt_cert_4m",
    });

    it("builder emits suffixKey + raw colonSuffix", () => {
      expect(builderResult.params!.suffixKey).toBe(
        "cases.constants.caseTypes.biz_mgmt_cert_4m",
      );
      expect(builderResult.params!.suffix).toBe("biz_mgmt_cert_4m");
      expect(builderResult.params!.colonSuffix).toBe("：biz_mgmt_cert_4m");
    });

    it("resolver translates suffix and recalculates colonSuffix", () => {
      const i18n = stubI18n({
        "cases.constants.caseTypes.biz_mgmt_cert_4m": "経営管理4月",
      });
      const params = resolveTimelineParams(
        builderResult.params as Record<string, unknown>,
        i18n,
      );
      expect(params.suffix).toBe("経営管理4月");
      expect(params.colonSuffix).toBe("：経営管理4月");
    });

    it("resolver keeps raw colonSuffix when translation key is missing", () => {
      const i18n = stubI18n({});
      const params = resolveTimelineParams(
        builderResult.params as Record<string, unknown>,
        i18n,
      );
      expect(params.suffix).toBe("biz_mgmt_cert_4m");
      expect(params.colonSuffix).toBe("：biz_mgmt_cert_4m");
    });
  });

  describe("communication_log.created (channelType: internal_note)", () => {
    const builderResult = buildCaseTimelineMessageResult(
      "communication_log.created",
      { channelType: "internal_note" },
    );

    it("builder emits suffixKey + raw colonSuffix", () => {
      expect(builderResult.params!.suffixKey).toBe(
        "cases.detail.messages.types.internal_note",
      );
      expect(builderResult.params!.suffix).toBe("internal_note");
      expect(builderResult.params!.colonSuffix).toBe("：internal_note");
    });

    it("resolver translates suffix and recalculates colonSuffix", () => {
      const i18n = stubI18n({
        "cases.detail.messages.types.internal_note": "社内メモ",
      });
      const params = resolveTimelineParams(
        builderResult.params as Record<string, unknown>,
        i18n,
      );
      expect(params.suffix).toBe("社内メモ");
      expect(params.colonSuffix).toBe("：社内メモ");
    });

    it("resolver keeps raw colonSuffix when translation key is missing", () => {
      const i18n = stubI18n({});
      const params = resolveTimelineParams(
        builderResult.params as Record<string, unknown>,
        i18n,
      );
      expect(params.suffix).toBe("internal_note");
      expect(params.colonSuffix).toBe("：internal_note");
    });
  });

  describe("case.created with empty caseTypeCode", () => {
    const builderResult = buildCaseTimelineMessageResult("case.created", {});

    it("builder emits empty suffix / colonSuffix / suffixKey", () => {
      expect(builderResult.params!.suffix).toBe("");
      expect(builderResult.params!.colonSuffix).toBe("");
      expect(builderResult.params!.suffixKey).toBe("");
    });

    it("resolver keeps empty colonSuffix unchanged", () => {
      const i18n = stubI18n({});
      const params = resolveTimelineParams(
        builderResult.params as Record<string, unknown>,
        i18n,
      );
      expect(params.suffix).toBe("");
      expect(params.colonSuffix).toBe("");
    });
  });

  describe("communication_log.created with empty channelType", () => {
    const builderResult = buildCaseTimelineMessageResult(
      "communication_log.created",
      {},
    );

    it("builder emits empty suffix / colonSuffix / suffixKey", () => {
      expect(builderResult.params!.suffix).toBe("");
      expect(builderResult.params!.colonSuffix).toBe("");
      expect(builderResult.params!.suffixKey).toBe("");
    });

    it("resolver keeps empty colonSuffix unchanged", () => {
      const i18n = stubI18n({});
      const params = resolveTimelineParams(
        builderResult.params as Record<string, unknown>,
        i18n,
      );
      expect(params.suffix).toBe("");
      expect(params.colonSuffix).toBe("");
    });
  });
});
