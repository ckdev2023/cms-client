import type { CaseTemplateDef } from "./types";
import type { I18nLabel } from "./types-create";

function il(zh: string, en: string, ja: string): I18nLabel {
  return { zh, en, ja };
}

// ─── 经营管理签（总览入口） ────────────────────────────────────

export const TMPL_BMV: CaseTemplateDef = {
  id: "bmv",
  label: il("经营管理签", "Business Manager Visa", "経営管理ビザ"),
  badge: "BMV",
  applicationTypes: ["certification", "change_of_status", "renewal"],
  subtitle:
    "经营管理签总览 — 根据具体场景选择认定 4 个月、认定 1 年或续签子模板。",
  sections: [
    {
      title: il(
        "申请人基础材料",
        "Applicant Basic Documents",
        "申請人基礎書類",
      ),
      items: [
        {
          id: "bmv_passport",
          label: il("护照复印件", "Passport copy", "パスポート写し"),
          required: true,
        },
        {
          id: "bmv_photo",
          label: il("证件照", "ID photo (3×4)", "証明写真（3×4）"),
          required: true,
        },
        {
          id: "bmv_resume",
          label: il("经历书 / 履历书", "CV / resume", "経歴書・履歴書"),
          required: true,
        },
      ],
    },
  ],
};

// ─── 经营管理签认定 4 个月 (18 items) ────────────────────────────

export const TMPL_BMV_CERT_4M: CaseTemplateDef = {
  id: "biz_mgmt_cert_4m",
  label: il(
    "经营管理（认定 4 个月）",
    "Business Manager (CoE 4-month)",
    "経営管理（認定4ヶ月）",
  ),
  badge: "BMV",
  applicationTypes: ["certification"],
  subtitle:
    "认定 4 个月 — 重点：申请人背景、资本来源、来日履历与创业前置准备。",
  sections: [
    {
      title: il(
        "申请人基础材料",
        "Applicant Basic Documents",
        "申請人基礎書類",
      ),
      items: [
        {
          id: "4m_passport",
          label: il("护照复印件", "Passport copy", "パスポート写し"),
          required: true,
        },
        {
          id: "4m_photo",
          label: il("证件照", "ID photo (3×4)", "証明写真（3×4）"),
          required: true,
        },
        {
          id: "4m_resume",
          label: il("经历书 / 履历书", "CV / resume", "経歴書・履歴書"),
          required: true,
        },
        {
          id: "4m_diploma",
          label: il("毕业证明", "Graduation certificate", "卒業証明書"),
          required: true,
        },
        {
          id: "4m_license",
          label: il("营业许可证", "Business license", "営業許可証"),
          required: false,
        },
        {
          id: "4m_qualification",
          label: il("资格证明", "Qualification certificate", "資格証明書"),
          required: false,
        },
        {
          id: "4m_employment",
          label: il(
            "在职 / 离职证明",
            "Employment / resignation proof",
            "在職・離職証明書",
          ),
          required: true,
        },
        {
          id: "4m_address",
          label: il("现住址信息", "Current address", "現住所情報"),
          required: true,
        },
      ],
    },
    {
      title: il("资金与来日履历", "Capital & Japan History", "資金と来日履歴"),
      items: [
        {
          id: "4m_capital_balance",
          label: il(
            "资本金余额证明",
            "Capital balance certificate",
            "資本金残高証明書",
          ),
          required: true,
        },
        {
          id: "4m_capital_source",
          label: il(
            "资本金来源证明 / 收入证明",
            "Capital source / income proof",
            "資本金出所証明・収入証明",
          ),
          required: true,
        },
        {
          id: "4m_japan_history",
          label: il("来日履历", "Japan visit history", "来日履歴"),
          required: true,
        },
        {
          id: "4m_entry_exit",
          label: il(
            "最近出入境日期",
            "Recent entry/exit dates",
            "直近の出入国日",
          ),
          required: true,
        },
        {
          id: "4m_coe_record",
          label: il(
            "在留资格认定申请记录",
            "CoE application record",
            "在留資格認定申請記録",
          ),
          required: true,
        },
        {
          id: "4m_denial_record",
          label: il(
            "在留资格认定不许可记录",
            "CoE denial record",
            "在留資格認定不許可記録",
          ),
          required: true,
        },
        {
          id: "4m_jp_relatives",
          label: il("日本亲属情况", "Relatives in Japan", "日本の親族状況"),
          required: true,
        },
      ],
    },
    {
      title: il("创业前置准备", "Pre-Startup Preparation", "創業事前準備"),
      items: [
        {
          id: "4m_company_plan",
          label: il(
            "公司名称及事业目的预定",
            "Planned company name & purpose",
            "会社名と事業目的予定",
          ),
          required: true,
        },
        {
          id: "4m_office_property",
          label: il(
            "事务所预定物件资料",
            "Planned office property docs",
            "事務所予定物件資料",
          ),
          required: true,
        },
        {
          id: "4m_office_poa",
          label: il(
            "事务所设置委任状",
            "Office setup power of attorney",
            "事務所設置委任状",
          ),
          required: true,
        },
      ],
    },
  ],
};

// ─── 经营管理签认定 1 年 (25 items) ─────────────────────────────

export const TMPL_BMV_CERT_1Y: CaseTemplateDef = {
  id: "biz_mgmt_cert_1y",
  label: il(
    "经营管理（认定 1 年）",
    "Business Manager (CoE 1-year)",
    "経営管理（認定1年）",
  ),
  badge: "BMV",
  applicationTypes: ["certification"],
  subtitle: "认定 1 年 — 需同时覆盖申请人背景、办公场地、公司主体、税务设立。",
  sections: [
    {
      title: il(
        "申请人基础材料",
        "Applicant Basic Documents",
        "申請人基礎書類",
      ),
      items: [
        {
          id: "1y_passport",
          label: il("护照复印件", "Passport copy", "パスポート写し"),
          required: true,
        },
        {
          id: "1y_photo",
          label: il("证件照", "ID photo (3×4)", "証明写真（3×4）"),
          required: true,
        },
        {
          id: "1y_resume",
          label: il("经历书 / 履历书", "CV / resume", "経歴書・履歴書"),
          required: true,
        },
        {
          id: "1y_diploma",
          label: il("毕业证明", "Graduation certificate", "卒業証明書"),
          required: true,
        },
        {
          id: "1y_license",
          label: il("营业许可证", "Business license", "営業許可証"),
          required: false,
        },
        {
          id: "1y_qualification",
          label: il("资格证明", "Qualification certificate", "資格証明書"),
          required: false,
        },
        {
          id: "1y_employment",
          label: il(
            "在职 / 离职证明",
            "Employment / resignation proof",
            "在職・離職証明書",
          ),
          required: true,
        },
        {
          id: "1y_address",
          label: il("现住址信息", "Current address", "現住所情報"),
          required: true,
        },
        {
          id: "1y_juminhyo",
          label: il("住民票", "Resident record", "住民票"),
          required: true,
        },
        {
          id: "1y_seal_cert",
          label: il("印鉴证明", "Seal registration certificate", "印鑑証明書"),
          required: true,
        },
      ],
    },
    {
      title: il("资金与来日履历", "Capital & Japan History", "資金と来日履歴"),
      items: [
        {
          id: "1y_capital_balance",
          label: il(
            "资本金余额证明",
            "Capital balance certificate",
            "資本金残高証明書",
          ),
          required: true,
        },
        {
          id: "1y_capital_source",
          label: il(
            "资本金来源证明 / 收入证明",
            "Capital source / income proof",
            "資本金出所証明・収入証明",
          ),
          required: true,
        },
        {
          id: "1y_japan_history",
          label: il("来日履历", "Japan visit history", "来日履歴"),
          required: true,
        },
        {
          id: "1y_entry_exit",
          label: il(
            "最近出入境日期",
            "Recent entry/exit dates",
            "直近の出入国日",
          ),
          required: true,
        },
        {
          id: "1y_coe_denial",
          label: il(
            "在留资格认定申请 / 不许可记录",
            "CoE application / denial record",
            "認定申請・不許可記録",
          ),
          required: true,
        },
        {
          id: "1y_jp_relatives",
          label: il("日本亲属情况", "Relatives in Japan", "日本の親族状況"),
          required: true,
        },
        {
          id: "1y_phone",
          label: il("手机号码", "Mobile number", "携帯電話番号"),
          required: true,
        },
      ],
    },
    {
      title: il(
        "办公场地与在留证明",
        "Office & Residence Proof",
        "事務所・在留証明",
      ),
      items: [
        {
          id: "1y_zairyu",
          label: il("在留卡", "Residence card", "在留カード"),
          required: true,
        },
        {
          id: "1y_office_lease",
          label: il(
            "事务所租赁合同",
            "Office lease contract",
            "事務所賃貸契約書",
          ),
          required: true,
        },
        {
          id: "1y_office_photo_plan",
          label: il(
            "事务所照片 + 平面图",
            "Office photos + floor plan",
            "事務所写真・平面図",
          ),
          required: true,
        },
        {
          id: "1y_company_registry",
          label: il("公司登本", "Company registry", "履歴事項全部証明書"),
          required: true,
        },
        {
          id: "1y_establishment_reports",
          label: il(
            "各类设立申报",
            "Establishment reports (tax)",
            "各種設立届",
          ),
          required: true,
        },
      ],
    },
    {
      title: il("公司法定材料", "Corporate Legal Documents", "法人法定書類"),
      items: [
        {
          id: "1y_articles",
          label: il("定款", "Articles of incorporation", "定款"),
          required: true,
        },
        {
          id: "1y_officer_resolution",
          label: il(
            "役员报酬股东会决议记录",
            "Officer remuneration resolution",
            "役員報酬決議議事録",
          ),
          required: true,
        },
        {
          id: "1y_business_proof",
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
