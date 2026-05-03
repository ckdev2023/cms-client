import { describe, it, expect } from "vitest";
import { computed, ref } from "vue";
import { createI18n } from "vue-i18n";
import casesZhCN from "../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../i18n/messages/cases/en-US";
import { getStageI18nKey } from "./constants";
import { createMockDetail } from "./model/useCaseDetailModel.test-support";
import type { CaseDetail } from "./types";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildReadonlyBanner(detail: CaseDetail, locale: Locale): string {
  const i18n = makeI18n(locale);
  const t = i18n.global.t.bind(i18n.global);
  const detailRef = ref<CaseDetail | null>(detail);
  const stageLabel = computed(() => {
    if (!detailRef.value) return "";
    const key = getStageI18nKey(detailRef.value.stageCode);
    return key ? t(key) : detailRef.value.stage;
  });
  return t("cases.detail.readonlyBanner", { stage: stageLabel.value });
}

const LOG_EXCLUSIVE_PATTERNS: Record<Locale, RegExp> = {
  "zh-CN": /仅.*日志|日志.*可访问|只.*日志/,
  "ja-JP": /ログ.*のみ|のみ.*ログ|ログタブのみ/,
  "en-US": /only.*log\s*tab|log\s*tab.*accessible/i,
};

describe("CaseDetailView banner — R28 B2", () => {
  describe("三语 readonlyBanner 不含「日志独占」字样", () => {
    const LOCALES: Locale[] = ["zh-CN", "ja-JP", "en-US"];

    for (const locale of LOCALES) {
      it(`${locale}: banner 文案不含 log-exclusive 独占表述`, () => {
        const detail = createMockDetail({
          stage: "S9",
          stageCode: "S9",
          readonly: true,
        });
        const banner = buildReadonlyBanner(detail, locale);
        expect(banner).not.toMatch(LOG_EXCLUSIVE_PATTERNS[locale]);
      });
    }

    it("zh-CN banner 不含「日志」", () => {
      const detail = createMockDetail({ stageCode: "S9", readonly: true });
      const banner = buildReadonlyBanner(detail, "zh-CN");
      expect(banner).not.toContain("日志");
    });

    it("ja-JP banner 不含「ログ」", () => {
      const detail = createMockDetail({ stageCode: "S9", readonly: true });
      const banner = buildReadonlyBanner(detail, "ja-JP");
      expect(banner).not.toContain("ログ");
    });

    it("en-US banner 不含 'Log tab' (case-insensitive)", () => {
      const detail = createMockDetail({ stageCode: "S9", readonly: true });
      const banner = buildReadonlyBanner(detail, "en-US");
      expect(banner.toLowerCase()).not.toContain("log tab");
    });
  });

  describe("isReadonly=true 时 banner 渲染（合约镜像）", () => {
    it("readonly=true 的 detail 触发 banner 渲染条件", () => {
      const detail = createMockDetail({ readonly: true, stageCode: "S9" });
      const isReadonly = computed(() => detail.readonly ?? false);
      expect(isReadonly.value).toBe(true);
    });

    it("readonly=false 的 detail 不触发 banner", () => {
      const detail = createMockDetail({ readonly: false, stageCode: "S3" });
      const isReadonly = computed(() => detail.readonly ?? false);
      expect(isReadonly.value).toBe(false);
    });

    it("banner 包含 {stage} 插值后的翻译标签", () => {
      const detail = createMockDetail({ stageCode: "S9", readonly: true });
      expect(buildReadonlyBanner(detail, "zh-CN")).toContain("已归档");
      expect(buildReadonlyBanner(detail, "en-US")).toContain("Archived");
      expect(buildReadonlyBanner(detail, "ja-JP")).toContain("アーカイブ済み");
    });

    it("banner 包含「只读」语义表述", () => {
      const detail = createMockDetail({ stageCode: "S9", readonly: true });
      expect(buildReadonlyBanner(detail, "zh-CN")).toContain("只读");
      expect(buildReadonlyBanner(detail, "en-US")).toContain("read-only");
      expect(buildReadonlyBanner(detail, "ja-JP")).toContain("読み取り専用");
    });
  });
});
