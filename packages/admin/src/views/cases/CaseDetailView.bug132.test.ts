// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-132 — `CaseDetailView` 头部 stage Chip 与 readonlyBanner
//   切换 locale 后必须经 i18n 翻译，禁止透传 adapter 的 zh-CN fallback `detail.stage`。
// Locks: 复刻视图侧 `stageLabel = key ? t(key) : detail.stage` 与
//   `t("cases.detail.readonlyBanner", { stage: stageLabel })` 解析合约，
//   覆盖 zh-CN / en-US / ja-JP × S1..S9。
// Does NOT test: 真实 mount `CaseDetailView`（依赖 router + useCaseDetailModel），
//   亦不测试 stage Chip 视觉/tone 映射。
// Rationale: 第十轮走查发现切到 EN/JA 后 stage Chip 残留 `已建档`，
//   而 phase Chip 走 `t(getPhaseI18nKey(...))` 正确翻译。修复方向为镜像
//   `phaseLabel`：经 `getStageI18nKey` 拿 i18n key 再 `t()`，仅 key 缺失才回退。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { computed, ref } from "vue";
import { createI18n } from "vue-i18n";
import casesZhCN from "../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../i18n/messages/cases/en-US";
import { CASE_STAGE_IDS, getStageI18nKey } from "./constants";
import { createMockDetail } from "./model/useCaseDetailModel.test-support";
import type { CaseDetail, CaseStageId } from "./types";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

const EXPECTED_STAGE_LABELS: Record<Locale, Record<CaseStageId, string>> = {
  "zh-CN": {
    S1: "已建档",
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
    S1: "Filed",
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
    S1: "案件登録済",
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

function buildStageLabelFromDetail(detail: CaseDetail | null, locale: Locale) {
  const i18n = makeI18n(locale);
  const t = i18n.global.t.bind(i18n.global);
  const detailRef = ref<CaseDetail | null>(detail);
  return computed(() => {
    if (!detailRef.value) return "";
    const key = getStageI18nKey(detailRef.value.stageCode);
    return key ? t(key) : detailRef.value.stage;
  });
}

function buildReadonlyBannerFromDetail(
  detail: CaseDetail,
  locale: Locale,
): string {
  const i18n = makeI18n(locale);
  const t = i18n.global.t.bind(i18n.global);
  const stageLabelRef = buildStageLabelFromDetail(detail, locale);
  return t("cases.detail.readonlyBanner", { stage: stageLabelRef.value });
}

describe("CaseDetailView BUG-132 — stage Chip 与 readonlyBanner 走 i18n", () => {
  describe("stageLabel 解析合约（镜像 phaseLabel）", () => {
    for (const locale of ["zh-CN", "en-US", "ja-JP"] as const) {
      for (const stageId of CASE_STAGE_IDS) {
        it(`${locale} × ${stageId} → ${EXPECTED_STAGE_LABELS[locale][stageId]}`, () => {
          const detail = createMockDetail({
            stage: "已建档",
            stageCode: stageId,
          });
          const stageLabel = buildStageLabelFromDetail(detail, locale);
          expect(stageLabel.value).toBe(EXPECTED_STAGE_LABELS[locale][stageId]);
        });
      }
    }

    it("detail 为 null 时返回空字符串", () => {
      const stageLabel = buildStageLabelFromDetail(null, "zh-CN");
      expect(stageLabel.value).toBe("");
    });

    it("EN/JA locale 不允许 zh-CN fallback `已建档` 残留（BUG-132 反向断言）", () => {
      const detail = createMockDetail({
        stage: "已建档",
        stageCode: "S1",
      });
      expect(buildStageLabelFromDetail(detail, "en-US").value).not.toBe(
        "已建档",
      );
      expect(buildStageLabelFromDetail(detail, "ja-JP").value).not.toBe(
        "已建档",
      );
    });

    it("`detail.stage` 与 `detail.stageCode` 不一致时仍以 stageCode 为准", () => {
      const detail = createMockDetail({
        stage: "S3",
        stageCode: "S9",
      });
      expect(buildStageLabelFromDetail(detail, "en-US").value).toBe("Archived");
      expect(buildStageLabelFromDetail(detail, "ja-JP").value).toBe(
        "アーカイブ済み",
      );
      expect(buildStageLabelFromDetail(detail, "zh-CN").value).toBe("已归档");
    });
  });

  describe("readonlyBanner 文案插值同样走 i18n stage 标签", () => {
    it("zh-CN: 已归档 占位被翻译填充", () => {
      const detail = createMockDetail({ stage: "S9", stageCode: "S9" });
      expect(buildReadonlyBannerFromDetail(detail, "zh-CN")).toBe(
        "此案件处于「已归档」状态，全字段只读，状态变更与编辑已禁用。",
      );
    });

    it("en-US: 不含 zh-CN 字面 `已归档`", () => {
      const detail = createMockDetail({ stage: "S9", stageCode: "S9" });
      const banner = buildReadonlyBannerFromDetail(detail, "en-US");
      expect(banner).toContain("Archived");
      expect(banner).not.toContain("已归档");
      expect(banner).not.toContain("已建档");
    });

    it("ja-JP: 不含 zh-CN 字面 `已归档`", () => {
      const detail = createMockDetail({ stage: "S9", stageCode: "S9" });
      const banner = buildReadonlyBannerFromDetail(detail, "ja-JP");
      expect(banner).toContain("アーカイブ済み");
      expect(banner).not.toContain("已归档");
      expect(banner).not.toContain("已建档");
    });
  });
});
