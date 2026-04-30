// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-133 — `CaseOverviewTab` 概览卡 stage 值必须经 i18n 翻译，
//   禁止透传 adapter 的 zh-CN fallback `detail.stage`，且不得在终态出现
//   硬编码字面常量 `"S9"`（不分 locale）。
// Locks: 复刻视图侧 `stageValue = key ? t(key) : detail.stage` 解析合约
//   （镜像 CaseDetailView 的 `stageLabel`），覆盖 zh-CN / en-US / ja-JP × S1..S9，
//   并显式断言终态 S9 也走 i18n 资源（绝不返回 `"S9"` 字面或 zh-CN 残留）。
// Does NOT test: 真实 mount `CaseOverviewTab.vue`（依赖 detail mock + emit 链路），
//   亦不测试 stage 副本（meta）侧 `t("cases.detail.terminalStage.label")`
//   行为（由 BUG-132 / 既有覆盖锁定）。
// Rationale: 第十一/十二轮走查发现非终态卡 EN/JA 残留 zh-CN `资料收集中` 等字面，
//   终态卡 EN/JA/zh-CN 一律显示硬编码 `"S9"`。修复方向为镜像
//   CaseDetailView.vue#stageLabel：用 stageCode 取 i18n key 后 `t()`，仅 key 缺失才回退。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { computed } from "vue";
import { createI18n } from "vue-i18n";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import { CASE_STAGE_IDS, getStageI18nKey } from "../constants";
import { createMockDetail } from "../model/useCaseDetailModel.test-support";
import type { CaseDetail, CaseStageId } from "../types";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

const EXPECTED_STAGE_LABELS: Record<Locale, Record<CaseStageId, string>> = {
  "zh-CN": {
    S1: "刚开始办案",
    S2: "资料收集中",
    S3: "资料待补 / 审核中",
    S4: "文书制作中",
    S5: "提交前检查",
    S6: "可安排提交",
    S7: "已提交待回执",
    S8: "结果待确认",
    S9: "已归档",
  },
  "en-US": {
    S1: "Case opened",
    S2: "Collecting documents",
    S3: "Pending / Under review",
    S4: "Drafting forms",
    S5: "Pre-submission check",
    S6: "Ready to submit",
    S7: "Submitted, awaiting receipt",
    S8: "Awaiting result",
    S9: "Archived",
  },
  "ja-JP": {
    S1: "案件開始",
    S2: "資料収集中",
    S3: "資料補完待ち / 審査中",
    S4: "文書作成中",
    S5: "提出前チェック",
    S6: "提出手配可能",
    S7: "提出済み・受領待ち",
    S8: "結果待ち",
    S9: "アーカイブ済み",
  },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildStageValue(detail: CaseDetail, locale: Locale) {
  const i18n = makeI18n(locale);
  const t = i18n.global.t.bind(i18n.global);
  return computed(() => {
    const key = getStageI18nKey(detail.stageCode);
    return key ? t(key) : detail.stage;
  });
}

describe("CaseOverviewTab BUG-133 — 概览卡 stage 值走 i18n（含终态 S9）", () => {
  describe("stageValue 解析合约（镜像 CaseDetailView#stageLabel）", () => {
    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      for (const stageId of CASE_STAGE_IDS) {
        it(`${locale} × ${stageId} → ${EXPECTED_STAGE_LABELS[locale][stageId]}`, () => {
          const detail = createMockDetail({
            stage: "资料收集中",
            stageCode: stageId,
          });
          const stageValue = buildStageValue(detail, locale);
          expect(stageValue.value).toBe(EXPECTED_STAGE_LABELS[locale][stageId]);
        });
      }
    }
  });

  describe('终态 S9 反向断言（禁止 `"S9"` 字面或 zh-CN fallback 残留）', () => {
    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      it(`${locale} × S9 终态：值不得为字面 \"S9\"`, () => {
        const detail = createMockDetail({
          stage: "S9",
          stageCode: "S9",
        });
        const stageValue = buildStageValue(detail, locale);
        expect(stageValue.value).not.toBe("S9");
        expect(stageValue.value).toBe(EXPECTED_STAGE_LABELS[locale].S9);
      });
    }

    it("EN/JA locale 不允许 zh-CN 字面 `资料收集中` 残留", () => {
      const detail = createMockDetail({
        stage: "资料收集中",
        stageCode: "S2",
      });
      expect(buildStageValue(detail, "en-US").value).not.toBe("资料收集中");
      expect(buildStageValue(detail, "ja-JP").value).not.toBe("资料收集中");
    });

    it("EN/JA locale 不允许 zh-CN 字面 `已归档` 残留", () => {
      const detail = createMockDetail({
        stage: "已归档",
        stageCode: "S9",
      });
      expect(buildStageValue(detail, "en-US").value).not.toBe("已归档");
      expect(buildStageValue(detail, "ja-JP").value).not.toBe("已归档");
    });
  });

  describe("`detail.stage` 与 `detail.stageCode` 不一致时仍以 stageCode 为准", () => {
    it("stage=S3 文案 / stageCode=S9 → 输出终态 i18n 文案", () => {
      const detail = createMockDetail({
        stage: "S3",
        stageCode: "S9",
      });
      expect(buildStageValue(detail, "en-US").value).toBe("Archived");
      expect(buildStageValue(detail, "ja-JP").value).toBe("アーカイブ済み");
      expect(buildStageValue(detail, "zh-CN").value).toBe("已归档");
    });
  });
});
