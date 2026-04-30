import type { CaseTemplateDef } from "./types";
import type { I18nLabel } from "./types-create";

function il(zh: string, en: string, ja: string): I18nLabel {
  return { zh, en, ja };
}

// ─── 技人国认定 (eng_humanities_intl_cert) — 19 required + 4 conditional ───

export const TMPL_ENG_CERT: CaseTemplateDef = {
  id: "eng_humanities_intl_cert",
  label: il("技人国（认定）", "Engineer/Specialist (CoE)", "技人国（認定）"),
  badge: "popular",
  applicationTypes: ["certification"],
  subtitle: il(
    "技术・人文知识・国际业务认定 — 重点在学历链、职历链、雇佣条件与雇主主体证明。",
    "Engineer / Specialist in Humanities / Int'l Services CoE — focus on academic chain, career chain, employment conditions, and employer entity proof.",
    "技術・人文知識・国際業務（認定）— 学歴チェーン、職歴チェーン、雇用条件、雇用主の実体証明が重点。",
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
          id: "ec_passport",
          label: il("护照复印件", "Passport copy", "パスポート写し"),
          required: true,
        },
        {
          id: "ec_photo",
          label: il("证件照", "ID photo (3×4)", "証明写真（3×4）"),
          required: true,
        },
        {
          id: "ec_resume",
          label: il("经历书 / 履历书", "CV / resume", "経歴書・履歴書"),
          required: true,
        },
        {
          id: "ec_diploma",
          label: il(
            "毕业证明",
            "Graduation certificate",
            "卒業証明書（外国文書は翻訳添付）",
          ),
          required: true,
        },
        {
          id: "ec_degree",
          label: il(
            "学位证明",
            "Degree certificate",
            "学位証明書（外国文書は翻訳添付）",
          ),
          required: true,
        },
        {
          id: "ec_transcript",
          label: il(
            "成绩证明",
            "Academic transcript",
            "成績証明書（外国文書は翻訳添付）",
          ),
          required: true,
        },
        {
          id: "ec_employment",
          label: il(
            "在职 / 离职证明",
            "Employment / resignation proof",
            "在職・離職証明書",
          ),
          required: true,
        },
        {
          id: "ec_address",
          label: il("现住址信息", "Current address", "現住所情報"),
          required: true,
        },
        {
          id: "ec_japan_history",
          label: il("来日履历", "Japan visit history", "来日履歴"),
          required: true,
        },
        {
          id: "ec_jp_relatives",
          label: il("日本亲属情况", "Relatives in Japan", "日本の親族状況"),
          required: true,
        },
        {
          id: "ec_tax",
          label: il(
            "最近课税 / 纳税证明",
            "Tax certificate",
            "課税・納税証明書",
          ),
          required: true,
        },
        {
          id: "ec_phone",
          label: il("手机号码", "Mobile number", "携帯電話番号"),
          required: true,
        },
        {
          id: "ec_zairyu",
          label: il("在留卡", "Residence card", "在留カード"),
          required: true,
        },
      ],
    },
    {
      title: il(
        "雇主 / 受入企業提供",
        "Employer / Host Company Documents",
        "雇用主・受入企業提出書類",
      ),
      items: [
        {
          id: "ec_company_registry",
          label: il(
            "公司登本",
            "Company registry (3 months)",
            "履歴事項全部証明書（3ヶ月以内）",
          ),
          required: true,
        },
        {
          id: "ec_financial_report",
          label: il(
            "最近决算报告书",
            "Financial report / tax return",
            "最近決算報告書・確定申告書",
          ),
          required: true,
        },
        {
          id: "ec_withholding",
          label: il(
            "前一年源泉征收票等法定调书",
            "Withholding tax statement",
            "源泉徴収票等法定調書合計表",
          ),
          required: true,
        },
        {
          id: "ec_insurance",
          label: il(
            "雇用保险适用事业者编号",
            "Employment insurance number",
            "雇用保険適用事業所番号",
          ),
          required: true,
        },
        {
          id: "ec_employee_list",
          label: il("员工列表", "Employee list", "従業員名簿"),
          required: true,
        },
        {
          id: "ec_conditions",
          label: il(
            "雇用条件通知书",
            "Employment conditions notice",
            "雇用条件通知書",
          ),
          required: true,
        },
      ],
    },
    {
      title: il("条件材料", "Conditional Documents", "条件付書類"),
      items: [
        {
          id: "ec_qualification",
          label: il(
            "资格证明",
            "Qualification certificate",
            "資格証明書（日本語能力・免許等）",
          ),
          required: false,
          conditionalTag: "日语能力/执照等",
        },
        {
          id: "ec_company_intro",
          label: il("公司介绍", "Company introduction", "会社案内"),
          required: false,
          conditionalTag: "如有",
        },
        {
          id: "ec_marriage",
          label: il("结婚证明", "Marriage certificate", "婚姻証明書"),
          required: false,
          conditionalTag: "仅家族滞在",
        },
        {
          id: "ec_birth",
          label: il("出生证明", "Birth certificate", "出生証明書"),
          required: false,
          conditionalTag: "仅家族滞在",
        },
      ],
    },
  ],
};

// ─── 技人国续签 (eng_humanities_intl_renewal) — 13 items ─────────────────

export const TMPL_ENG_RENEWAL: CaseTemplateDef = {
  id: "eng_humanities_intl_renewal",
  label: il(
    "技人国（续签）",
    "Engineer/Specialist (Renewal)",
    "技人国（更新）",
  ),
  badge: "popular",
  applicationTypes: ["renewal"],
  subtitle: il(
    "技术・人文知识・国际业务期间更新 — 重点在在留持续、税务连续和社保连续性。",
    "Engineer / Specialist in Humanities / Int'l Services renewal — focus on residence continuity, tax continuity, and social insurance continuity.",
    "技術・人文知識・国際業務（期間更新）— 在留継続、税務連続、社会保険の連続性が重点。",
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
          id: "er_passport",
          label: il("护照复印件", "Passport copy", "パスポート写し"),
          required: true,
        },
        {
          id: "er_photo",
          label: il("证件照", "ID photo (3×4)", "証明写真（3×4）"),
          required: true,
        },
        {
          id: "er_address",
          label: il("现住址信息", "Current address", "現住所情報"),
          required: true,
        },
        {
          id: "er_jp_relatives",
          label: il("日本亲属情况", "Relatives in Japan", "日本の親族状況"),
          required: true,
        },
        {
          id: "er_juminhyo",
          label: il("住民票", "Resident record", "住民票"),
          required: true,
        },
        {
          id: "er_tax",
          label: il(
            "最近课税 / 纳税证明",
            "Tax certificate",
            "課税・納税証明書",
          ),
          required: true,
        },
        {
          id: "er_phone",
          label: il("手机号码", "Mobile number", "携帯電話番号"),
          required: true,
        },
        {
          id: "er_zairyu",
          label: il("在留卡", "Residence card", "在留カード"),
          required: true,
        },
      ],
    },
    {
      title: il(
        "雇主 / 在留持续性証明",
        "Employer / Residence Continuity",
        "雇用主・在留継続性証明",
      ),
      items: [
        {
          id: "er_health_insurance",
          label: il("健康保险证", "Health insurance card", "健康保険証"),
          required: true,
        },
        {
          id: "er_company_registry",
          label: il(
            "公司登本",
            "Company registry (3 months)",
            "履歴事項全部証明書（3ヶ月以内）",
          ),
          required: true,
        },
        {
          id: "er_withholding",
          label: il(
            "前一年源泉征收票等法定调书",
            "Withholding tax statement",
            "源泉徴収票等法定調書合計表",
          ),
          required: true,
        },
        {
          id: "er_insurance",
          label: il(
            "雇用保险适用事业者编号",
            "Employment insurance number",
            "雇用保険適用事業所番号",
          ),
          required: true,
        },
        {
          id: "er_employee_list",
          label: il("员工列表", "Employee list", "従業員名簿"),
          required: true,
        },
      ],
    },
  ],
};

// ─── 企業内転勤 (intra_company_transfer) — 11 items + 備注 ─────────────

export const TMPL_INTRA: CaseTemplateDef = {
  id: "intra_company_transfer",
  label: il("企業内転勤", "Intra-company Transfer", "企業内転勤"),
  badge: "p1",
  applicationTypes: ["certification"],
  subtitle: il(
    "集团 / 关联企業内部人事调动 — 重点证明転勤关系而非普通招聘，日本侧与本国侧材料须互相对应。",
    "Group / affiliate intra-company transfer — must prove a transfer relationship rather than ordinary hiring; Japan-side and home-country documents must correspond.",
    "グループ／関連企業内部の人事異動 — 通常採用ではなく転勤関係の証明が重点。日本側と本国側の書類は相互に対応させる必要がある。",
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
          id: "ict_passport",
          label: il("护照复印件", "Passport copy", "パスポート写し"),
          required: true,
        },
        {
          id: "ict_photo",
          label: il("证件照", "ID photo (3×4)", "証明写真（3×4）"),
          required: true,
        },
        {
          id: "ict_resume",
          label: il("经历书 / 履历书", "CV / resume", "経歴書・履歴書"),
          required: true,
        },
        {
          id: "ict_employment",
          label: il(
            "在职 / 离职证明",
            "Employment / resignation proof",
            "在職・離職証明書",
          ),
          required: true,
        },
      ],
    },
    {
      title: il(
        "企業 / 集団提供",
        "Corporate / Group Documents",
        "企業・グループ提出書類",
      ),
      items: [
        {
          id: "ict_income",
          label: il("收入相关资料", "Income-related documents", "収入関係資料"),
          required: true,
        },
        {
          id: "ict_company_registry",
          label: il(
            "公司登本",
            "Company registry (3 months)",
            "履歴事項全部証明書（3ヶ月以内）",
          ),
          required: true,
        },
        {
          id: "ict_financial_report",
          label: il(
            "最近决算报告书",
            "Financial report / tax return",
            "最近決算報告書・確定申告書",
          ),
          required: true,
          conditionalTag: "本国・日本",
        },
        {
          id: "ict_withholding",
          label: il(
            "前一年源泉征收票等法定调书",
            "Withholding tax statement",
            "源泉徴収票等法定調書合計表",
          ),
          required: true,
        },
        {
          id: "ict_transfer_order",
          label: il("转勤命令", "Transfer order", "転勤命令書"),
          required: true,
        },
        {
          id: "ict_transfer_contract",
          label: il(
            "转让 / 让渡合同复印件",
            "Assignment / transfer contract",
            "譲渡契約書写し",
          ),
          required: true,
        },
        {
          id: "ict_shareholder_list",
          label: il("股东名簿", "Shareholder register", "株主名簿"),
          required: true,
          conditionalTag: "日本側",
        },
      ],
    },
  ],
};
