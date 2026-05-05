import { describe, it, expect } from "vitest";
import { createI18n } from "vue-i18n";
import { adaptCaseLogDto } from "./CaseCommsLogsAdapter";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: "zh-CN" | "ja-JP" | "en-US") {
  return createI18n({ legacy: false, locale, messages: MESSAGES });
}

function makeLogDto(action: string, payload: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    action,
    createdAt: "2026-04-01T10:00:00Z",
    actorDisplayName: "田中太郎",
    payload,
  };
}

describe("CaseCommsLogsAdapter i18n key resolution", () => {
  it.each([
    ["zh-CN", "案件创建：bmv", "操作日志", "案件"],
    ["ja-JP", "案件作成：bmv", "操作ログ", "案件"],
    ["en-US", "Case created：bmv", "Operation", "Case"],
  ] as const)(
    "case.created resolves correctly in %s",
    (locale, expectedText, expectedCategory, expectedObjType) => {
      const i18n = makeI18n(locale);
      const t = i18n.global.t;
      const entry = adaptCaseLogDto(
        makeLogDto("case.created", { caseTypeCode: "bmv" }),
      );
      expect(entry).not.toBeNull();
      expect(t(entry!.text, entry!.textParams ?? {})).toBe(expectedText);
      expect(t(entry!.category)).toBe(expectedCategory);
      expect(t(entry!.objectType)).toBe(expectedObjType);
    },
  );

  it.each([
    ["zh-CN", "阶段变更：S3 → S4", "状态变更"],
    ["ja-JP", "段階変更：S3 → S4", "状態変更"],
    ["en-US", "Stage change: S3 → S4", "Status change"],
  ] as const)(
    "case.status_changed resolves correctly in %s",
    (locale, expectedText, expectedCategory) => {
      const i18n = makeI18n(locale);
      const t = i18n.global.t;
      const entry = adaptCaseLogDto(
        makeLogDto("case.status_changed", { from: "S3", to: "S4" }),
      );
      expect(entry).not.toBeNull();
      expect(entry!.text).toBe("cases.log.timeline.stageChange");
      expect(entry!.category).toBe("cases.log.category.status");
      expect(t(entry!.text, entry!.textParams ?? {})).toBe(expectedText);
      expect(t(entry!.category)).toBe(expectedCategory);
    },
  );

  it.each([
    ["zh-CN", "未收款风险确认：deposit_pending"],
    ["ja-JP", "未収金リスク確認：deposit_pending"],
    ["en-US", "Unpaid risk acknowledged：deposit_pending"],
  ] as const)(
    "case.billing_risk_acknowledged resolves in %s",
    (locale, expectedText) => {
      const i18n = makeI18n(locale);
      const t = i18n.global.t;
      const entry = adaptCaseLogDto(
        makeLogDto("case.billing_risk_acknowledged", {
          reasonCode: "deposit_pending",
        }),
      );
      expect(entry).not.toBeNull();
      expect(entry!.text).toBe("cases.log.timeline.billingRiskAck");
      expect(t(entry!.text, entry!.textParams ?? {})).toBe(expectedText);
    },
  );

  it.each([
    ["zh-CN", "案件转组：A組 → B組（人员调整）"],
    ["ja-JP", "案件転組：A組 → B組（人员调整）"],
    ["en-US", "Case transferred: A組 → B組 (人员调整)"],
  ] as const)(
    "case.group_transferred resolves in %s",
    (locale, expectedText) => {
      const i18n = makeI18n(locale);
      const t = i18n.global.t;
      const entry = adaptCaseLogDto(
        makeLogDto("case.group_transferred", {
          fromGroupName: "A組",
          toGroupName: "B組",
          reason: "人员调整",
        }),
      );
      expect(entry).not.toBeNull();
      expect(t(entry!.text, entry!.textParams ?? {})).toBe(expectedText);
    },
  );

  it.each([
    [
      "zh-CN",
      "cases.log.timeline.phaseChange",
      "cases.constants.phases.UNDER_REVIEW",
      "cases.constants.phases.APPROVED",
      "状态变更",
    ],
    [
      "ja-JP",
      "cases.log.timeline.phaseChange",
      "cases.constants.phases.UNDER_REVIEW",
      "cases.constants.phases.APPROVED",
      "状態変更",
    ],
    [
      "en-US",
      "cases.log.timeline.phaseChange",
      "cases.constants.phases.UNDER_REVIEW",
      "cases.constants.phases.APPROVED",
      "Status change",
    ],
  ] as const)(
    "case.phase_transitioned builder returns correct key+params in %s",
    (locale, expectedKey, expectedFromKey, expectedToKey, expectedCategory) => {
      const i18n = makeI18n(locale);
      const t = i18n.global.t;
      const entry = adaptCaseLogDto(
        makeLogDto("case.phase_transitioned", {
          from: "UNDER_REVIEW",
          to: "APPROVED",
        }),
      );
      expect(entry).not.toBeNull();
      expect(entry!.text).toBe(expectedKey);
      expect(entry!.textParams).toEqual({
        fromPhaseKey: expectedFromKey,
        toPhaseKey: expectedToKey,
      });
      expect(t(entry!.category)).toBe(expectedCategory);
    },
  );

  it.each([
    ["zh-CN", "业务阶段变更：审查中（入管） → 已批准"],
    ["ja-JP", "業務フェーズ変更：審査中（入管） → 許可済み"],
    ["en-US", "Phase change: Under immigration review → Approved"],
  ] as const)(
    "case.phase_transitioned double-layer t() renders in %s",
    (locale, expectedText) => {
      const i18n = makeI18n(locale);
      const t = i18n.global.t;
      const entry = adaptCaseLogDto(
        makeLogDto("case.phase_transitioned", {
          from: "UNDER_REVIEW",
          to: "APPROVED",
        }),
      );
      expect(entry).not.toBeNull();
      const params: Record<string, unknown> = {
        ...(entry!.textParams ?? {}),
      };
      if (typeof params.fromPhaseKey === "string" && params.fromPhaseKey) {
        params.from = t(params.fromPhaseKey);
      }
      if (typeof params.toPhaseKey === "string" && params.toPhaseKey) {
        params.to = t(params.toPhaseKey);
      }
      expect(t(entry!.text, params)).toBe(expectedText);
    },
  );

  it("case.phase_transitioned falls back to empty strings when payload is missing", () => {
    const entry = adaptCaseLogDto(makeLogDto("case.phase_transitioned", {}));
    expect(entry).not.toBeNull();
    expect(entry!.text).toBe("cases.log.timeline.phaseChange");
    expect(entry!.textParams).toEqual({
      fromPhaseKey: "",
      toPhaseKey: "",
    });
  });

  it("case.phase_transitioned accepts fromPhase/toPhase alias keys", () => {
    const entry = adaptCaseLogDto(
      makeLogDto("case.phase_transitioned", {
        fromPhase: "CONSULTING",
        toPhase: "CONTRACTED",
      }),
    );
    expect(entry).not.toBeNull();
    expect(entry!.textParams).toEqual({
      fromPhaseKey: "cases.constants.phases.CONSULTING",
      toPhaseKey: "cases.constants.phases.CONTRACTED",
    });
  });

  it.each(["zh-CN", "ja-JP", "en-US"] as const)(
    "object type keys resolve for all known prefixes in %s",
    (locale) => {
      const i18n = makeI18n(locale);
      const t = i18n.global.t;
      const prefixes = [
        "case",
        "communication_log",
        "document_item",
        "task",
        "billing_record",
        "validation_run",
        "submission_package",
        "generated_document",
        "reminder",
      ];
      for (const prefix of prefixes) {
        const entry = adaptCaseLogDto(makeLogDto(`${prefix}.created`, {}));
        expect(entry).not.toBeNull();
        const resolved = t(entry!.objectType);
        expect(resolved).not.toBe(entry!.objectType);
      }
    },
  );
});
