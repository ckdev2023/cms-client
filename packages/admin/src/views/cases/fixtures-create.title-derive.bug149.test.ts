// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-149 / BUG-162 — 建案向导案件标题自动生成器
//   - BUG-149：zh-CN / ja-JP 下出现"模板标签 + 申请类型字面"双重拼接
//     （"经营管理（认定 4 个月）认定"），en-US 下 Latin 模板与申请类型 label
//     之间缺少分隔空格（"Dependent VisaCertificate of Eligibility"）。
//   - BUG-162：en-US 下模板标签使用业内缩写（"(CoE 4-month)" / "(CoS)"）
//     时与申请类型全称（"Certificate of Eligibility" / "Change of Status"）
//     语义重复，但字面 `includes` 不命中。
// 锁定：`buildCaseTitle` 在三语下与真实模板/ApplicationType fixture 联动时
//   - 不得复读模板标签中已出现的申请类型字面或同义缩写；
//   - 当模板标签或申请类型 label 任一为 Latin 字符时必须以空格分隔。
// Does NOT test: Step 1 模板按钮副标题（BUG-144）、Step 4 review 渲染、
//   submit 链路或 caseName 入库格式。
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { SAMPLE_CREATE_TEMPLATES } from "./fixtures";
import {
  APPLICATION_TYPE_LABELS,
  resolveTemplateLabel,
  type ApplicationType,
} from "./types-create";
import { buildCaseTitle } from "./model/useCreateCaseModelActions";

const LOCALES: ReadonlyArray<readonly [string, "zh" | "en" | "ja"]> = [
  ["zh-CN", "zh"],
  ["en-US", "en"],
  ["ja-JP", "ja"],
];

/**
 * BUG-162：当 locale=en-US 且模板标签包含同义缩写（"CoE" / "CoS"）时，
 * 验证生成的 title 不再追加申请类型全称。其他场景直接跳过。
 *
 * @param templateId - 模板 id，仅用于断言失败时的诊断信息
 * @param appType - 申请类型枚举值
 * @param locale - 当前 locale；非 en-US 直接放过
 * @param tplLabel - 已解析为当前 locale 的模板标签
 * @param title - `buildCaseTitle` 的返回值
 */
function assertNoEnglishAcronymRedundancy(
  templateId: string,
  appType: ApplicationType,
  locale: string,
  tplLabel: string,
  title: string,
): void {
  if (locale !== "en-US") return;
  const lowerTpl = tplLabel.toLowerCase();
  const certHit =
    appType === "certification" &&
    (lowerTpl.includes("coe") || lowerTpl.includes("c.o.e."));
  if (certHit) {
    expect(
      title,
      `template=${templateId} en-US already implies CoE; full form should not be appended (title="${title}")`,
    ).not.toContain("Certificate of Eligibility");
  }
  const cosHit = appType === "change_of_status" && lowerTpl.includes("cos");
  if (cosHit) {
    expect(
      title,
      `template=${templateId} en-US already implies CoS; full form should not be appended (title="${title}")`,
    ).not.toContain("Change of Status");
  }
}

describe("buildCaseTitle template × applicationType (BUG-149)", () => {
  it("模板标签已含申请类型字面时不复读（zh-CN: 经营管理（认定 4 个月）+ 认定）", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find(
      (t) => t.id === "biz_mgmt_cert_4m",
    );
    expect(tpl).toBeDefined();
    const tplLabel = resolveTemplateLabel(tpl!.label, "zh-CN");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.certification,
      "zh-CN",
    );
    const title = buildCaseTitle("张三", tplLabel, typeLabel, false);
    expect(title).toBe(`张三 ${tplLabel}`);
    // 关键回归：不得出现两个 "认定"
    const matches = title.match(/认定/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  it("模板标签已含申请类型字面时不复读（ja-JP: 経営管理（認定4ヶ月）+ 認定）", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find(
      (t) => t.id === "biz_mgmt_cert_4m",
    );
    const tplLabel = resolveTemplateLabel(tpl!.label, "ja-JP");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.certification,
      "ja-JP",
    );
    const title = buildCaseTitle("陳麗華", tplLabel, typeLabel, false);
    expect(title).toBe(`陳麗華 ${tplLabel}`);
    const matches = title.match(/認定/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  it("en-US: Dependent Visa + Certificate of Eligibility 之间补空格", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find((t) => t.id === "family");
    const tplLabel = resolveTemplateLabel(tpl!.label, "en-US");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.certification,
      "en-US",
    );
    expect(tplLabel).toBe("Dependent Visa");
    expect(typeLabel).toBe("Certificate of Eligibility");
    const title = buildCaseTitle("", tplLabel, typeLabel, false);
    expect(title).toBe("Dependent Visa Certificate of Eligibility");
    expect(title).not.toContain("VisaCertificate");
  });

  it("CJK 模板标签 + CJK 申请类型保持紧贴（zh-CN: 家族滞在 + 认定）", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find((t) => t.id === "family");
    const tplLabel = resolveTemplateLabel(tpl!.label, "zh-CN");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.certification,
      "zh-CN",
    );
    const title = buildCaseTitle("李娜", tplLabel, typeLabel, false);
    expect(title).toBe("李娜 家族滞在认定");
  });

  it("批量后缀仍生效（family bulk）", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find((t) => t.id === "family");
    const tplLabel = resolveTemplateLabel(tpl!.label, "en-US");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.certification,
      "en-US",
    );
    const title = buildCaseTitle("", tplLabel, typeLabel, true);
    expect(title).toBe("Dependent Visa Certificate of Eligibility（批量）");
  });

  it("全模板 × 全 ApplicationType × 全 locale：不得出现重复字面、缩写重复或 Latin 黏连", () => {
    for (const tpl of SAMPLE_CREATE_TEMPLATES) {
      for (const appType of tpl.applicationTypes) {
        for (const [locale] of LOCALES) {
          const tplLabel = resolveTemplateLabel(tpl.label, locale);
          const typeLabel = resolveTemplateLabel(
            APPLICATION_TYPE_LABELS[appType as ApplicationType],
            locale,
          );
          const title = buildCaseTitle("", tplLabel, typeLabel, false);

          // 1) 不得在 trim 后的 type 串在标题里出现两次（双重拼接 sentinel）
          if (typeLabel.trim()) {
            const occurrences = title.split(typeLabel.trim()).length - 1;
            expect(
              occurrences,
              `template=${tpl.id} type=${appType} locale=${locale} title="${title}"`,
            ).toBeLessThanOrEqual(1);
          }

          // 2) 当模板标签结尾为 Latin / 数字，或申请类型起始为 Latin / 数字时，
          //    标题中必须存在 "Latin/数字 + 空格 + Latin/数字" 的连接（不得黏连）。
          const tplEndsLatin = /[A-Za-z0-9]$/.test(tplLabel.trim());
          const typeStartsLatin = /^[A-Za-z0-9]/.test(typeLabel.trim());
          if ((tplEndsLatin || typeStartsLatin) && title.includes(typeLabel)) {
            expect(
              title,
              `template=${tpl.id} type=${appType} locale=${locale} should keep a space at boundary`,
            ).not.toMatch(
              new RegExp(
                `[A-Za-z0-9]${typeLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")[0]}`,
              ),
            );
          }

          // 3) BUG-162：en-US 下模板标签若已含 "CoE" / "CoS" 缩写，则不得再追加
          //    申请类型全称（"Certificate of Eligibility" / "Change of Status"）。
          assertNoEnglishAcronymRedundancy(
            tpl.id,
            appType as ApplicationType,
            locale,
            tplLabel,
            title,
          );
        }
      }
    }
  });
});

describe("buildCaseTitle 缩写 vs 全称语义去重 (BUG-162)", () => {
  it("en-US BMV-CERT-4M：模板含 (CoE 4-month) 时不再追加 Certificate of Eligibility", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find(
      (t) => t.id === "biz_mgmt_cert_4m",
    );
    expect(tpl).toBeDefined();
    const tplLabel = resolveTemplateLabel(tpl!.label, "en-US");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.certification,
      "en-US",
    );
    expect(tplLabel).toBe("Business Manager (CoE 4-month)");
    expect(typeLabel).toBe("Certificate of Eligibility");
    const title = buildCaseTitle("", tplLabel, typeLabel, false);
    expect(title).toBe("Business Manager (CoE 4-month)");
    expect(title).not.toContain("Certificate of Eligibility");
    // 关键回归：sentinel 子串不得出现
    expect(title).not.toContain("4-month) Certificate");
  });

  it("en-US BMV-CERT-1Y：模板含 (CoE 1-year) 时不再追加 Certificate of Eligibility", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find(
      (t) => t.id === "biz_mgmt_cert_1y",
    );
    expect(tpl).toBeDefined();
    const tplLabel = resolveTemplateLabel(tpl!.label, "en-US");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.certification,
      "en-US",
    );
    expect(tplLabel).toBe("Business Manager (CoE 1-year)");
    const title = buildCaseTitle("", tplLabel, typeLabel, false);
    expect(title).toBe("Business Manager (CoE 1-year)");
    expect(title).not.toContain("Certificate of Eligibility");
  });

  it("en-US ENG-CERT：模板含 (CoE) 时不再追加 Certificate of Eligibility", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find(
      (t) => t.id === "eng_humanities_intl_cert",
    );
    expect(tpl).toBeDefined();
    const tplLabel = resolveTemplateLabel(tpl!.label, "en-US");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.certification,
      "en-US",
    );
    expect(tplLabel).toBe("Engineer/Specialist (CoE)");
    const title = buildCaseTitle("", tplLabel, typeLabel, false);
    expect(title).toBe("Engineer/Specialist (CoE)");
    expect(title).not.toContain("Certificate of Eligibility");
  });

  it("en-US BMV-Renewal：模板含 (Renewal) 时不再追加 Renewal（字面 includes 已命中，确认未回归）", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find(
      (t) => t.id === "biz_mgmt_renewal",
    );
    expect(tpl).toBeDefined();
    const tplLabel = resolveTemplateLabel(tpl!.label, "en-US");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.renewal,
      "en-US",
    );
    expect(tplLabel).toBe("Business Manager (Renewal)");
    const title = buildCaseTitle("", tplLabel, typeLabel, false);
    expect(title).toBe("Business Manager (Renewal)");
    expect(title.match(/Renewal/g)?.length).toBe(1);
  });

  it("非 CoE 模板（family / certification）回归：仍正确补空格拼接全称", () => {
    const tpl = SAMPLE_CREATE_TEMPLATES.find((t) => t.id === "family");
    const tplLabel = resolveTemplateLabel(tpl!.label, "en-US");
    const typeLabel = resolveTemplateLabel(
      APPLICATION_TYPE_LABELS.certification,
      "en-US",
    );
    const title = buildCaseTitle("", tplLabel, typeLabel, false);
    expect(title).toBe("Dependent Visa Certificate of Eligibility");
  });

  it("大小写鲁棒：lower-case 模板 (coe ...) 也命中缩写去重", () => {
    const tplLabel = "Business Manager (coe 4-month)";
    const typeLabel = "Certificate of Eligibility";
    const title = buildCaseTitle("", tplLabel, typeLabel, false);
    expect(title).toBe("Business Manager (coe 4-month)");
  });
});
