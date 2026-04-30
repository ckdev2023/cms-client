import type { CaseTemplateDef } from "./types";
import type { I18nLabel } from "./types-create";

function il(zh: string, en: string, ja: string): I18nLabel {
  return { zh, en, ja };
}

// ─── 公司设立 (company_setup) — 14 items ────────────────────────

export const TMPL_COMPANY_SETUP: CaseTemplateDef = {
  id: "company_setup",
  label: il("公司设立", "Company Establishment", "会社設立"),
  badge: "BMV",
  applicationTypes: ["certification"],
  subtitle: il(
    "经营管理签公司设立阶段 — 重点在资本金证明、法人登记、设立申报与办公场地。",
    "Business Manager Visa company-establishment stage — focus on capital proof, corporate registration, establishment filings, and office space.",
    "経営管理ビザの会社設立フェーズ — 資本金証明、法人登記、設立届、事務所が重点。",
  ),
  sections: [
    {
      title: il(
        "申请人基础材料",
        "Applicant Basic Documents",
        "申請人基礎書類",
      ),
      items: [
        {
          id: "cs_passport",
          label: il("护照复印件", "Passport copy", "パスポート写し"),
          required: true,
        },
        {
          id: "cs_photo",
          label: il("证件照", "ID photo (3×4)", "証明写真（3×4）"),
          required: true,
        },
        {
          id: "cs_juminhyo",
          label: il("住民票", "Resident record", "住民票"),
          required: true,
        },
        {
          id: "cs_seal_cert",
          label: il("印鉴证明", "Seal registration certificate", "印鑑証明書"),
          required: true,
        },
        {
          id: "cs_address",
          label: il("现住址信息", "Current address", "現住所情報"),
          required: true,
        },
      ],
    },
    {
      title: il("资金证明", "Capital Proof", "資金証明"),
      items: [
        {
          id: "cs_capital_30m",
          label: il(
            "资本金 3000 万余额证明",
            "Capital balance proof (30M JPY)",
            "資本金3000万円残高証明書",
          ),
          required: true,
        },
        {
          id: "cs_capital_source",
          label: il(
            "资本金来源证明",
            "Capital source proof",
            "資本金出所証明書",
          ),
          required: true,
        },
      ],
    },
    {
      title: il(
        "公司设立法定材料",
        "Incorporation Legal Documents",
        "会社設立法定書類",
      ),
      items: [
        {
          id: "cs_company_registry",
          label: il("公司登本", "Company registry", "履歴事項全部証明書"),
          required: true,
        },
        {
          id: "cs_articles",
          label: il("定款", "Articles of incorporation", "定款"),
          required: true,
        },
        {
          id: "cs_establishment_reports",
          label: il(
            "各类设立申报",
            "Establishment reports (tax office / pension)",
            "各種設立届（税務署・年金事務所等）",
          ),
          required: true,
        },
        {
          id: "cs_officer_resolution",
          label: il(
            "役员报酬股东会决议记录",
            "Officer remuneration resolution",
            "役員報酬決議議事録",
          ),
          required: true,
        },
        {
          id: "cs_business_proof",
          label: il(
            "交易方名片或合同",
            "Business partner cards / contracts",
            "取引先の名刺や契約書",
          ),
          required: true,
        },
        {
          id: "cs_office_lease",
          label: il(
            "事务所租赁合同",
            "Office lease contract",
            "事務所賃貸契約書",
          ),
          required: true,
        },
        {
          id: "cs_office_photo_plan",
          label: il(
            "事务所照片 + 平面图",
            "Office photos + floor plan",
            "事務所写真・平面図",
          ),
          required: true,
        },
      ],
    },
  ],
};
