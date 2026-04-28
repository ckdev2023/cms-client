import type { CaseTemplateDef } from "./types";
import type { I18nLabel } from "./types-create";

function il(zh: string, en: string, ja: string): I18nLabel {
  return { zh, en, ja };
}

export const TMPL_BMV_RENEWAL: CaseTemplateDef = {
  id: "biz_mgmt_renewal",
  label: il(
    "经营管理（续签）",
    "Business Manager (Renewal)",
    "経営管理（更新）",
  ),
  badge: "BMV",
  applicationTypes: ["renewal"],
  subtitle: "期间更新 — 重点在持续经营与持续在留事实，而非设立材料。",
  sections: [
    {
      title: il(
        "申请人基础材料",
        "Applicant Basic Documents",
        "申請人基礎書類",
      ),
      items: [
        {
          id: "rnw_passport",
          label: il("护照复印件", "Passport copy", "パスポート写し"),
          required: true,
        },
        {
          id: "rnw_photo",
          label: il("证件照", "ID photo (3×4)", "証明写真（3×4）"),
          required: true,
        },
        {
          id: "rnw_address",
          label: il("现住址信息", "Current address", "現住所情報"),
          required: true,
        },
        {
          id: "rnw_jp_relatives",
          label: il("日本亲属情况", "Relatives in Japan", "日本の親族状況"),
          required: true,
        },
        {
          id: "rnw_juminhyo",
          label: il("住民票", "Resident record", "住民票"),
          required: true,
        },
      ],
    },
    {
      title: il("税务与在留证明", "Tax & Residence Proof", "税務・在留証明"),
      items: [
        {
          id: "rnw_tax",
          label: il(
            "最近课税 / 纳税证明",
            "Tax / payment certificates",
            "課税・納税証明書",
          ),
          required: true,
        },
        {
          id: "rnw_phone",
          label: il("手机号码", "Mobile number", "携帯電話番号"),
          required: true,
        },
        {
          id: "rnw_zairyu",
          label: il("在留卡", "Residence card", "在留カード"),
          required: true,
        },
        {
          id: "rnw_company_registry",
          label: il("公司登本", "Company registry", "履歴事項全部証明書"),
          required: true,
        },
      ],
    },
    {
      title: il(
        "经营持续性证明",
        "Business Continuity Proof",
        "経営継続性証明",
      ),
      items: [
        {
          id: "rnw_withholding",
          label: il(
            "前一年源泉征收票等法定调书",
            "Withholding tax statement",
            "源泉徴収票等法定調書",
          ),
          required: true,
        },
        {
          id: "rnw_employment_insurance",
          label: il(
            "雇用保险适用事业者编号",
            "Employment insurance number",
            "雇用保険適用事業所番号",
          ),
          required: true,
        },
        {
          id: "rnw_business_proof",
          label: il(
            "交易方名片或合同",
            "Business partner cards/contracts",
            "取引先の名刺や契約書",
          ),
          required: true,
        },
      ],
    },
  ],
};
