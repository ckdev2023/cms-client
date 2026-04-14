import type {
  CaseCreateCustomerOption,
  CaseTemplateDef,
  FamilyScenario,
} from "./types";

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

export const SAMPLE_CREATE_TEMPLATES: CaseTemplateDef[] = [
  {
    id: "family",
    label: "家族滞在",
    badge: "常用模板",
    applicationTypes: ["认定", "变更", "更新"],
    subtitle: "适合配偶/子女批量建案，自动展开扶养者/保证人资料。",
    sections: [
      {
        title: "主申请人提供",
        items: [
          { id: "app_passport", label: "护照首页", required: true },
          { id: "app_photo", label: "证件照", required: true },
          { id: "app_relation", label: "亲属关系证明", required: true },
        ],
      },
      {
        title: "扶养者 / 保证人提供",
        items: [
          { id: "sponsor_residence", label: "在留卡", required: true },
          { id: "sponsor_income", label: "课税/纳税证明", required: true },
          { id: "sponsor_employer", label: "在职证明", required: false },
        ],
      },
      {
        title: "事务所内部产出",
        items: [
          { id: "office_cover", label: "理由书草稿", required: true },
          { id: "office_checklist", label: "提交包检查单", required: true },
        ],
      },
    ],
  },
  {
    id: "work",
    label: "技人国",
    badge: "常用模板",
    applicationTypes: ["认定", "变更", "更新"],
    subtitle: "适合雇主/职位信息驱动的工作类新案。",
    sections: [
      {
        title: "主申请人提供",
        items: [
          { id: "work_passport", label: "护照首页", required: true },
          { id: "work_resume", label: "履历书", required: true },
          { id: "work_diploma", label: "学历/资格证明", required: true },
        ],
      },
      {
        title: "雇主提供",
        items: [
          { id: "employer_offer", label: "雇佣合同", required: true },
          { id: "employer_profile", label: "公司概要", required: true },
          { id: "employer_finance", label: "决算资料", required: false },
        ],
      },
      {
        title: "事务所内部产出",
        items: [
          { id: "office_reason", label: "申请理由书", required: true },
          {
            id: "office_cover_work",
            label: "提出资料封面",
            required: true,
          },
        ],
      },
    ],
  },
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
