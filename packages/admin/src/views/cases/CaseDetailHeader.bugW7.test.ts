// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-W-7 — `/cases/:id` 头部 status badge ("咨询中") 与 stage chip
//   ("S1 · 刚开始办案") 语义冲突。
// Locks:
//   1. S1 fallback label 与三语 i18n 必须对齐 P0 §3 双层状态机权威释义
//      (S1 = 已建档 / Filed / 案件登録済)，禁止再回到 "刚开始办案 /
//      Case opened / 案件開始" 这种暗示"工作已展开"的动词措辞。
//   2. S1 + CONSULTING 是 P0 §3.5 stageToPhaseDefault 的合规初始组合，
//      Chip tone 同色（neutral），不应被认为颜色冲突；语义读为
//      "已建档 / 咨询中" 自洽（已立案、未签约）。
// Does NOT test: 真实 mount CaseDetailView（依赖 router + useCaseDetailModel），
//   亦不锁定其他 stage 的具体文案（由 BUG-132 / BUG-133 覆盖）。
// Rationale: 第 W-7 走查报告中 reviewer 指出 S1 + CONSULTING 的并列 chip
//   读起来像 "已经办案了 vs 仍在咨询" 的矛盾对，根因在 i18n 文案过度承诺。
//   该锁定保证未来不会因为文案微调而漂回旧措辞。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { createI18n } from "vue-i18n";
import casesZhCN from "../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../i18n/messages/cases/en-US";
import {
  BADGE_TONE_MAP,
  CASE_STAGES,
  getPhaseBadge,
  getPhaseI18nKey,
  getStageI18nKey,
  getStageLabel,
} from "./constants";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeT(locale: Locale) {
  const i18n = createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
  return i18n.global.t.bind(i18n.global);
}

describe("BUG-W-7 — 案件详情头部 stage chip 与 phase chip 语义对齐", () => {
  describe("S1 文案对齐 P0 §3 权威 (S1 = 已建档)", () => {
    it("constants.CASE_STAGES.S1.label 锁定为 `已建档`", () => {
      expect(CASE_STAGES.S1.label).toBe("已建档");
      expect(getStageLabel("S1")).toBe("已建档");
    });

    it("zh-CN i18n S1 锁定为 `已建档`，禁止 `刚开始办案 / 开始办案`", () => {
      const t = makeT("zh-CN");
      expect(t(getStageI18nKey("S1"))).toBe("已建档");
      expect(t(getStageI18nKey("S1"))).not.toContain("开始");
      expect(t(getStageI18nKey("S1"))).not.toContain("办案");
    });

    it("en-US i18n S1 锁定为 `Filed`，禁止 `opened / started`", () => {
      const t = makeT("en-US");
      expect(t(getStageI18nKey("S1"))).toBe("Filed");
      expect(t(getStageI18nKey("S1")).toLowerCase()).not.toContain("opened");
      expect(t(getStageI18nKey("S1")).toLowerCase()).not.toContain("started");
    });

    it("ja-JP i18n S1 锁定为 `案件登録済`，禁止 `案件開始 / 開始`", () => {
      const t = makeT("ja-JP");
      expect(t(getStageI18nKey("S1"))).toBe("案件登録済");
      expect(t(getStageI18nKey("S1"))).not.toContain("開始");
    });
  });

  describe("S1 + CONSULTING 合规初始组合 (P0 §3.5 stageToPhaseDefault)", () => {
    it("S1 与 CONSULTING badge 都映射为 neutral，header 两 chip 不存在颜色冲突", () => {
      const stageBadge = CASE_STAGES.S1.badge;
      const phaseBadge = getPhaseBadge("CONSULTING");
      expect(stageBadge).toBe("badge-gray");
      expect(phaseBadge).toBe("badge-gray");
      expect(BADGE_TONE_MAP[stageBadge]).toBe("neutral");
      expect(BADGE_TONE_MAP[phaseBadge]).toBe("neutral");
    });

    it("zh-CN: 头部读作 `S1 · 已建档` + `咨询中` (语义自洽：已立案、未签约)", () => {
      const t = makeT("zh-CN");
      const stageHeader = `S1 · ${t(getStageI18nKey("S1"))}`;
      const phaseLabel = t(getPhaseI18nKey("CONSULTING"));
      expect(stageHeader).toBe("S1 · 已建档");
      expect(phaseLabel).toBe("咨询中");
    });

    it("en-US: 头部读作 `S1 · Filed` + `Consulting`", () => {
      const t = makeT("en-US");
      const stageHeader = `S1 · ${t(getStageI18nKey("S1"))}`;
      const phaseLabel = t(getPhaseI18nKey("CONSULTING"));
      expect(stageHeader).toBe("S1 · Filed");
      expect(phaseLabel).toBe("Consulting");
    });

    it("ja-JP: 头部读作 `S1 · 案件登録済` + `相談中`", () => {
      const t = makeT("ja-JP");
      const stageHeader = `S1 · ${t(getStageI18nKey("S1"))}`;
      const phaseLabel = t(getPhaseI18nKey("CONSULTING"));
      expect(stageHeader).toBe("S1 · 案件登録済");
      expect(phaseLabel).toBe("相談中");
    });
  });
});
