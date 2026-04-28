import type {
  CaseCreateCustomerOption,
  CaseTemplateDef,
  FamilyScenario,
} from "./types";
import type { I18nLabel } from "./types-create";
import {
  TMPL_BMV,
  TMPL_BMV_CERT_4M,
  TMPL_BMV_CERT_1Y,
} from "./fixtures-create-bmv";
import { TMPL_BMV_RENEWAL } from "./fixtures-create-bmv-renewal";
import {
  TMPL_ENG_CERT,
  TMPL_ENG_RENEWAL,
  TMPL_INTRA,
} from "./fixtures-create-eng-intra";
import { TMPL_COMPANY_SETUP } from "./fixtures-create-company-setup";

function il(zh: string, en: string, ja: string): I18nLabel {
  return { zh, en, ja };
}

// ─── Create: Customer Options ───────────────────────────────────

export const SAMPLE_CREATE_CUSTOMERS: CaseCreateCustomerOption[] = [
  {
    id: "cust-001",
    name: "李娜",
    kana: "リ ナ",
    group: "tokyo-1",
    groupLabel: "东京一组",
    roleHint: "主申请人",
    summary: "家族滞在更新，已有客户档案与联系方式",
    contact: "li.na@email.com / 080-1111-2222",
  },
  {
    id: "cust-002",
    name: "陈美",
    kana: "チン メイ",
    group: "tokyo-1",
    groupLabel: "东京一组",
    roleHint: "扶养者",
    summary: "适合家族签批量建案，已存在关联人",
    contact: "chen.mei@email.com / 080-3333-4444",
  },
  {
    id: "cust-003",
    name: "王浩",
    kana: "オウ コウ",
    group: "tokyo-2",
    groupLabel: "东京二组",
    roleHint: "主申请人",
    summary: "技人国认定案件高频申请人画像",
    contact: "wang.hao@email.com / 090-5555-6666",
  },
];

// ─── Create: Templates ──────────────────────────────────────────

const TMPL_FAMILY: CaseTemplateDef = {
  id: "family",
  label: il("家族滞在", "Dependent Visa", "家族滞在"),
  badge: "popular",
  applicationTypes: ["certification", "change_of_status", "renewal"],
  subtitle: il(
    "适合配偶/子女批量建案，自动展开扶养者/保证人资料。",
    "Ideal for batch creation of spouse/child cases with auto-expanded supporter documents.",
    "配偶者・子女の一括建案に最適。扶養者・保証人資料を自動展開します。",
  ),
  sections: [
    {
      title: il("主申请人提供", "Applicant Documents", "申請者提出書類"),
      items: [
        {
          id: "app_passport",
          label: il(
            "护照首页",
            "Passport (front page)",
            "パスポート（顔写真ページ）",
          ),
          required: true,
        },
        {
          id: "app_photo",
          label: il("证件照", "ID photo", "証明写真"),
          required: true,
        },
        {
          id: "app_relation",
          label: il(
            "亲属关系证明",
            "Family relationship certificate",
            "親族関係証明書",
          ),
          required: true,
        },
        {
          id: "app_marriage_cert",
          label: il(
            "结婚证公证件",
            "Marriage certificate (notarized)",
            "婚姻証明書（公証）",
          ),
          required: true,
          conditionalTag: "仅配偶",
        },
        {
          id: "app_birth_cert",
          label: il(
            "出生证明公证件",
            "Birth certificate (notarized)",
            "出生証明書（公証）",
          ),
          required: true,
          conditionalTag: "仅子女",
        },
      ],
    },
    {
      title: il(
        "扶养者 / 保证人提供",
        "Supporter / Guarantor Documents",
        "扶養者・保証人提出書類",
      ),
      items: [
        {
          id: "sponsor_residence",
          label: il("在留卡", "Residence card", "在留カード"),
          required: true,
        },
        {
          id: "sponsor_income",
          label: il(
            "课税/纳税证明",
            "Tax / payment certificate",
            "課税・納税証明書",
          ),
          required: true,
        },
        {
          id: "sponsor_employer",
          label: il("在职证明", "Employment certificate", "在職証明書"),
          required: false,
        },
      ],
    },
    {
      title: il(
        "事务所内部产出",
        "Office-Produced Documents",
        "事務所作成書類",
      ),
      items: [
        {
          id: "office_cover",
          label: il(
            "理由书草稿",
            "Statement of reasons (draft)",
            "理由書（草案）",
          ),
          required: true,
        },
        {
          id: "office_checklist",
          label: il(
            "提交包检查单",
            "Submission package checklist",
            "提出パッケージチェックリスト",
          ),
          required: true,
        },
      ],
    },
  ],
};

const TMPL_WORK: CaseTemplateDef = {
  id: "work",
  label: il(
    "技人国",
    "Engineer/Specialist in Humanities/Int'l Services",
    "技術・人文知識・国際業務",
  ),
  badge: "popular",
  applicationTypes: ["certification", "change_of_status", "renewal"],
  subtitle: il(
    "适合雇主/职位信息驱动的工作类新案。",
    "For employer/position-driven work visa cases.",
    "雇用主・職位情報に基づく就労ビザ案件向け。",
  ),
  sections: [
    {
      title: il("主申请人提供", "Applicant Documents", "申請者提出書類"),
      items: [
        {
          id: "work_passport",
          label: il(
            "护照首页",
            "Passport (front page)",
            "パスポート（顔写真ページ）",
          ),
          required: true,
        },
        {
          id: "work_resume",
          label: il("履历书", "CV / resume", "経歴書・履歴書"),
          required: true,
        },
        {
          id: "work_diploma",
          label: il(
            "学历/资格证明",
            "Degree / qualification certificate",
            "学歴・資格証明書",
          ),
          required: true,
        },
      ],
    },
    {
      title: il("雇主提供", "Employer Documents", "雇用主提出書類"),
      items: [
        {
          id: "employer_offer",
          label: il("雇佣合同", "Employment contract", "雇用契約書"),
          required: true,
        },
        {
          id: "employer_profile",
          label: il("公司概要", "Company profile", "会社概要"),
          required: true,
        },
        {
          id: "employer_finance",
          label: il("决算资料", "Financial statements", "決算資料"),
          required: false,
        },
      ],
    },
    {
      title: il(
        "事务所内部产出",
        "Office-Produced Documents",
        "事務所作成書類",
      ),
      items: [
        {
          id: "office_reason",
          label: il("申请理由书", "Statement of reasons", "申請理由書"),
          required: true,
        },
        {
          id: "office_cover_work",
          label: il("提出资料封面", "Submission cover sheet", "提出書類表紙"),
          required: true,
        },
      ],
    },
  ],
};

export const SAMPLE_CREATE_TEMPLATES: CaseTemplateDef[] = [
  TMPL_FAMILY,
  TMPL_WORK,
  TMPL_BMV,
  TMPL_BMV_CERT_4M,
  TMPL_BMV_CERT_1Y,
  TMPL_BMV_RENEWAL,
  TMPL_COMPANY_SETUP,
  TMPL_ENG_CERT,
  TMPL_ENG_RENEWAL,
  TMPL_INTRA,
];

// ─── Create: Family Scenario ────────────────────────────────────

export const FAMILY_SCENARIO: FamilyScenario = {
  title: "家族签批量建案",
  summary: "先锁定扶养者/保证人，再为多个配偶/子女按每人一案批量创建 Case。",
  roles: ["配偶", "子女", "扶养者", "保证人"],
  defaultDraftParties: [
    {
      name: "陈太太",
      role: "配偶",
      relation: "作为主申请人独立成案，共用扶养者材料",
      contact: "待补充联系方式",
      note: "亲属关系证明待上传，创建后自动生成补齐任务",
      reuseDocs: ["在留卡", "课税/纳税证明"],
      staleDocWarning: "扶养者在留卡影像距今 132 天，提交前需确认是否更新",
    },
    {
      name: "陈小宝",
      role: "子女",
      relation: "未成年人独立成案，可暂不填写联系方式",
      contact: "未成年人联系方式可后补",
      note: "出生证明待确认，系统先允许建档建案",
      reuseDocs: ["在留卡", "课税/纳税证明"],
      staleDocWarning: "若共用历史附件版本，提交包会锁定引用版本",
    },
    {
      name: "陈建国",
      role: "保证人",
      relation: "全部案件共享保证人角色",
      contact: "chen.guardian@email.com / 090-2222-8888",
      note: "收入证明将标记为待更新",
      reuseDocs: ["保证书", "收入证明"],
    },
  ],
  reuseNotes: [
    "同一扶养者材料可跨案复用，多个案件引用同一附件版本。",
    "若历史证件附件超过时效阈值，会在资料清单中标记为待更新。",
    "提交包生成后会锁定被引用的附件版本与文书版本。",
  ],
  gateChecks: [
    "向导阶段允许先建档 + 建案，不在此页阻塞缺失字段。",
    "进入生成文书 / 提交前校验时，会校验扶养者在留资格、到期日与在留卡影像。",
    '创建后自动生成"关键关系人信息补齐"任务，并提示更新住址 / 联系方式 / 收入类字段。',
  ],
};
