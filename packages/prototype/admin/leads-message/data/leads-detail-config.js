/**
 * Leads Detail — declarative config, sample data, tab definitions & demo scenarios.
 * Source of truth for detail.html; scripts/leads-detail-page.js reads this at runtime.
 *
 * Covers:
 *   - Tab definitions & DOM mapping
 *   - Lead status badge (shared with list; re-declared for standalone use)
 *   - Follow-up channel types
 *   - Log category taxonomy
 *   - Toast feedback templates
 *   - 8 required demo scenarios with per-tab inline data
 *     (P0-CONTRACT-DETAIL §9 / SPEC-GAP-MATRIX-DETAIL §6)
 */

/* ------------------------------------------------------------------ */
/*  TABS                                                               */
/* ------------------------------------------------------------------ */

var DETAIL_TABS = [
  { key: 'info',       label: '基础信息',   icon: 'identification' },
  { key: 'followups',  label: '跟进记录',   icon: 'chat-alt-2' },
  { key: 'conversion', label: '转化信息',   icon: 'switch-horizontal' },
  { key: 'log',        label: '日志',       icon: 'document-report' },
];

/* ------------------------------------------------------------------ */
/*  LEAD STATUS BADGE  (03 §3.6, shared enum)                          */
/* ------------------------------------------------------------------ */

var DETAIL_STATUSES = {
  new:          { label: '新咨询',   badge: 'badge-warning' },
  following:    { label: '跟进中',   badge: 'badge-primary' },
  pending_sign: { label: '待签约',   badge: 'badge-purple' },
  signed:       { label: '已签约',   badge: 'badge-success' },
  lost:         { label: '已流失',   badge: 'badge-gray' },
};

/* ------------------------------------------------------------------ */
/*  FOLLOW-UP CHANNEL TYPES                                            */
/* ------------------------------------------------------------------ */

var FOLLOWUP_CHANNELS = [
  { value: 'phone',   label: '电话',   chipClass: 'bg-sky-100 text-sky-700' },
  { value: 'email',   label: '邮件',   chipClass: 'bg-emerald-100 text-emerald-700' },
  { value: 'meeting', label: '面谈',   chipClass: 'bg-violet-100 text-violet-700' },
  { value: 'im',      label: 'IM',     chipClass: 'bg-amber-100 text-amber-700' },
];

/* ------------------------------------------------------------------ */
/*  LOG CATEGORIES  (四分类: 全部 + 三种变更)                           */
/* ------------------------------------------------------------------ */

var LOG_CATEGORIES = [
  { key: 'all',     label: '全部' },
  { key: 'status',  label: '状态变更' },
  { key: 'owner',   label: '人员变更' },
  { key: 'group',   label: 'Group 变更' },
];

/* ------------------------------------------------------------------ */
/*  TOAST TEMPLATES                                                    */
/* ------------------------------------------------------------------ */

var DETAIL_TOASTS = {
  followUpAdded:      { title: '跟进已记录（示例）',     desc: '已添加一条 {channel} 跟进记录' },
  taskCreated:        { title: '已创建任务（示例）',     desc: '跟进结论已转为待办任务' },
  convertCustomer:    { title: '客户已创建（示例）',     desc: '{name} 已转为正式客户，可在客户详情中查看' },
  convertCase:        { title: '案件已创建（示例）',     desc: '{title} 已创建，可在案件详情中查看' },
  statusChanged:      { title: '状态已更新（示例）',     desc: '已从 {from} 更新为 {to}' },
  infoUpdated:        { title: '信息已更新（示例）',     desc: '基础信息已保存' },
  markedLost:         { title: '已标记流失（示例）',     desc: '该线索已标记为流失，保留历史记录' },
};

/* ------------------------------------------------------------------ */
/*  BANNER PRESETS                                                     */
/* ------------------------------------------------------------------ */

var BANNERS = {
  lost: {
    type: 'readonly',
    bgClass: 'bg-[var(--surface-2)]',
    icon: 'lock-closed',
    text: '该线索已标记为流失，仅供查阅。',
    actionLabel: null,
  },
  signedNotConverted: {
    type: 'warning',
    bgClass: 'bg-[rgba(245,158,11,0.1)]',
    icon: 'exclamation',
    text: '该线索已签约但尚未创建客户/案件，请完成转化。',
    actionLabel: '立即转化',
  },
};

/* ------------------------------------------------------------------ */
/*  HEADER BUTTON STATE MATRIX  (P0-CONTRACT-DETAIL §3.1)              */
/*                                                                     */
/*  Values: 'enabled' | 'highlighted' | 'hidden' | 'disabled'         */
/*          | 'view-customer' | 'view-case'                            */
/* ------------------------------------------------------------------ */

var HEADER_BUTTONS = {
  normal:             { convertCustomer: 'enabled',       convertCase: 'enabled',   markLost: 'enabled',  editInfo: 'enabled',  changeStatus: 'enabled' },
  signedNotConverted: { convertCustomer: 'highlighted',   convertCase: 'highlighted', markLost: 'enabled', editInfo: 'enabled',  changeStatus: 'enabled' },
  convertedCustomer:  { convertCustomer: 'view-customer', convertCase: 'enabled',   markLost: 'hidden',   editInfo: 'disabled', changeStatus: 'hidden' },
  convertedCase:      { convertCustomer: 'view-customer', convertCase: 'view-case', markLost: 'hidden',   editInfo: 'disabled', changeStatus: 'hidden' },
  lost:               { convertCustomer: 'disabled',      convertCase: 'disabled',  markLost: 'hidden',   editInfo: 'disabled', changeStatus: 'hidden' },
};

/* ------------------------------------------------------------------ */
/*  SAMPLE SCENARIOS  (8 required by P0-CONTRACT-DETAIL §9)            */
/*                                                                     */
/*  Each sample carries:                                               */
/*    header    — breadcrumb / title / badge / owner / group            */
/*    info      — Tab 1 fields                                         */
/*    followups — Tab 2 timeline items                                 */
/*    conversion— Tab 3 dedup panel + conversion cards                 */
/*    log       — Tab 4 change log entries                             */
/*    banner    — readonly / warning banner (or null)                  */
/*    buttons   — header button state key                              */
/*    readonly  — whether the detail is fully locked                   */
/* ------------------------------------------------------------------ */

var DETAIL_SAMPLES = {

  /* ====== S.1  正常跟进态 ====== */
  following: {
    id: 'LEAD-2026-0035',
    name: '李华',
    status: 'following',
    ownerId: 'tanaka',
    ownerLabel: 'Tanaka',
    ownerInitials: 'T',
    ownerAvatarClass: 'bg-emerald-100 text-emerald-700',
    groupId: 'tokyo-1',
    groupLabel: '东京一组',
    banner: null,
    buttons: 'normal',
    readonly: false,

    info: {
      id: 'LEAD-2026-0035',
      name: '李华',
      phone: '080-2222-3333',
      email: 'li.hua@email.com',
      source: '介绍',
      referrer: '佐藤弁護士',
      businessType: '家族滞在',
      group: '东京一组',
      owner: 'Tanaka',
      note: '配偶在日永住者，希望尽快提交认定申请。首选语言中文。',
    },

    followups: [
      {
        channel: 'phone',
        channelLabel: '电话',
        summary: '致电确认意向与基本资料情况，客户表示配偶在日居住 5 年以上。',
        conclusion: '意向明确，进入资料准备阶段',
        nextAction: '邮件发送材料清单',
        nextFollowUp: '2026-04-12',
        time: '2026/04/08 14:30',
        operator: 'Tanaka',
      },
      {
        channel: 'email',
        channelLabel: '邮件',
        summary: '发送家族滞在认定材料清单（主申请人 + 扶养者），附件含示例模板。',
        conclusion: '客户确认收到，预计本周内开始准备',
        nextAction: '跟进材料上传情况',
        nextFollowUp: '2026-04-15',
        time: '2026/04/09 10:00',
        operator: 'Tanaka',
      },
      {
        channel: 'meeting',
        channelLabel: '面谈',
        summary: '初次面谈，了解家庭构成、扶养者在日状况、签约意向。',
        conclusion: '基本信息确认，建议配偶准备纳税/课税证明',
        nextAction: '电话确认意向',
        nextFollowUp: '2026-04-08',
        time: '2026/04/05 15:00',
        operator: 'Tanaka',
      },
    ],

    conversion: {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: null,
      conversions: [],
    },

    log: [
      { type: 'status', operator: 'Tanaka', time: '2026/04/05 16:00', fromValue: '新咨询', toValue: '跟进中',   chipClass: 'bg-sky-100 text-sky-700' },
      { type: 'owner',  operator: 'Admin',  time: '2026/04/05 10:00', fromValue: 'Suzuki', toValue: 'Tanaka',   chipClass: 'bg-emerald-100 text-emerald-700' },
      { type: 'status', operator: 'System', time: '2026/04/04 09:30', fromValue: '—',       toValue: '新咨询',   chipClass: 'bg-amber-100 text-amber-700' },
      { type: 'group',  operator: 'Admin',  time: '2026/04/04 09:30', fromValue: '—',       toValue: '东京一组', chipClass: 'bg-violet-100 text-violet-700' },
    ],
  },

  /* ====== S.2  已流失态 ====== */
  lost: {
    id: 'LEAD-2026-0019',
    name: '佐藤 美咲',
    status: 'lost',
    ownerId: 'tanaka',
    ownerLabel: 'Tanaka',
    ownerInitials: 'T',
    ownerAvatarClass: 'bg-emerald-100 text-emerald-700',
    groupId: 'tokyo-1',
    groupLabel: '东京一组',
    banner: 'lost',
    buttons: 'lost',
    readonly: true,

    info: {
      id: 'LEAD-2026-0019',
      name: '佐藤 美咲',
      phone: '090-4444-1111',
      email: 'sato.misaki@email.com',
      source: '电话',
      referrer: '',
      businessType: '永住',
      group: '东京一组',
      owner: 'Tanaka',
      note: '曾咨询永住申请。三次跟进未回复后标记为流失。',
    },

    followups: [
      {
        channel: 'phone',
        channelLabel: '电话',
        summary: '第三次致电仍无人接听，留言后标记为流失。',
        conclusion: '连续三次无回应，标记流失',
        nextAction: '',
        nextFollowUp: '',
        time: '2026/03/28 15:00',
        operator: 'Tanaka',
      },
      {
        channel: 'phone',
        channelLabel: '电话',
        summary: '第二次致电未接听，留语音留言。',
        conclusion: '未联系上',
        nextAction: '一周后再次致电',
        nextFollowUp: '2026-03-28',
        time: '2026/03/21 10:30',
        operator: 'Tanaka',
      },
      {
        channel: 'phone',
        channelLabel: '电话',
        summary: '初次致电确认永住咨询意向，客户表示考虑中。',
        conclusion: '意向不明确，需再次跟进',
        nextAction: '一周后再致电确认',
        nextFollowUp: '2026-03-21',
        time: '2026/03/14 14:00',
        operator: 'Tanaka',
      },
    ],

    conversion: {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: null,
      conversions: [],
    },

    log: [
      { type: 'status', operator: 'Tanaka', time: '2026/03/28 15:30', fromValue: '跟进中', toValue: '已流失',   chipClass: 'bg-gray-200 text-gray-600' },
      { type: 'status', operator: 'Tanaka', time: '2026/03/14 14:30', fromValue: '新咨询', toValue: '跟进中',   chipClass: 'bg-sky-100 text-sky-700' },
      { type: 'status', operator: 'System', time: '2026/03/14 09:00', fromValue: '—',       toValue: '新咨询',   chipClass: 'bg-amber-100 text-amber-700' },
      { type: 'owner',  operator: 'Admin',  time: '2026/03/14 09:00', fromValue: '—',       toValue: 'Tanaka',   chipClass: 'bg-emerald-100 text-emerald-700' },
      { type: 'group',  operator: 'Admin',  time: '2026/03/14 09:00', fromValue: '—',       toValue: '东京一组', chipClass: 'bg-violet-100 text-violet-700' },
    ],
  },

  /* ====== S.3  已签约未转化态 ====== */
  signed: {
    id: 'LEAD-2026-0022',
    name: '陈 大伟',
    status: 'signed',
    ownerId: 'suzuki',
    ownerLabel: 'Suzuki',
    ownerInitials: 'S',
    ownerAvatarClass: 'bg-sky-100 text-sky-700',
    groupId: 'tokyo-1',
    groupLabel: '东京一组',
    banner: 'signedNotConverted',
    buttons: 'signedNotConverted',
    readonly: false,

    info: {
      id: 'LEAD-2026-0022',
      name: '陈 大伟',
      phone: '080-9999-0000',
      email: 'chen.dw@email.com',
      source: 'Web',
      referrer: '',
      businessType: '家族滞在',
      group: '东京一组',
      owner: 'Suzuki',
      note: '已确认签约意向，合同已签。待创建客户档案与案件。',
    },

    followups: [
      {
        channel: 'meeting',
        channelLabel: '面谈',
        summary: '签约面谈，确认费用与服务范围，签署委任合同。',
        conclusion: '合同已签，转入客户建档',
        nextAction: '创建客户档案并建案',
        nextFollowUp: '2026-04-09',
        time: '2026/04/05 14:00',
        operator: 'Suzuki',
      },
      {
        channel: 'phone',
        channelLabel: '电话',
        summary: '致电确认签约意向，客户同意下周面谈。',
        conclusion: '确认下周三面谈',
        nextAction: '安排面谈',
        nextFollowUp: '2026-04-05',
        time: '2026/04/02 11:00',
        operator: 'Suzuki',
      },
      {
        channel: 'email',
        channelLabel: '邮件',
        summary: '发送服务说明和报价单。',
        conclusion: '客户已收到，表示需要考虑',
        nextAction: '三天后致电跟进',
        nextFollowUp: '2026-04-02',
        time: '2026/03/30 10:00',
        operator: 'Suzuki',
      },
    ],

    conversion: {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: null,
      conversions: [],
    },

    log: [
      { type: 'status', operator: 'Suzuki', time: '2026/04/05 15:00', fromValue: '待签约', toValue: '已签约',   chipClass: 'bg-emerald-100 text-emerald-700' },
      { type: 'status', operator: 'Suzuki', time: '2026/04/02 11:30', fromValue: '跟进中', toValue: '待签约',   chipClass: 'bg-violet-100 text-violet-700' },
      { type: 'owner',  operator: 'Admin',  time: '2026/03/30 09:00', fromValue: 'Tanaka', toValue: 'Suzuki',   chipClass: 'bg-sky-100 text-sky-700' },
      { type: 'status', operator: 'Tanaka', time: '2026/03/29 10:00', fromValue: '新咨询', toValue: '跟进中',   chipClass: 'bg-sky-100 text-sky-700' },
      { type: 'group',  operator: 'Admin',  time: '2026/03/28 09:00', fromValue: '—',       toValue: '东京一组', chipClass: 'bg-violet-100 text-violet-700' },
      { type: 'status', operator: 'System', time: '2026/03/28 09:00', fromValue: '—',       toValue: '新咨询',   chipClass: 'bg-amber-100 text-amber-700' },
    ],
  },

  /* ====== S.4  已转客户态 ====== */
  'converted-customer': {
    id: 'LEAD-2026-0015',
    name: '王 明',
    status: 'signed',
    ownerId: 'suzuki',
    ownerLabel: 'Suzuki',
    ownerInitials: 'S',
    ownerAvatarClass: 'bg-sky-100 text-sky-700',
    groupId: 'tokyo-2',
    groupLabel: '东京二组',
    banner: null,
    buttons: 'convertedCustomer',
    readonly: false,

    info: {
      id: 'LEAD-2026-0015',
      name: '王 明',
      phone: '080-7777-8888',
      email: 'wang.ming@email.com',
      source: '介绍',
      referrer: '山田商事',
      businessType: '技人国',
      group: '东京二组',
      owner: 'Suzuki',
      note: '已转为正式客户。技人国更新申请，公司 BlueWave。',
    },

    followups: [
      {
        channel: 'meeting',
        channelLabel: '面谈',
        summary: '签约面谈完成，合同签署并创建客户档案。',
        conclusion: '已建档，进入案件创建',
        nextAction: '创建技人国更新案件',
        nextFollowUp: '2026-04-03',
        time: '2026/04/01 14:00',
        operator: 'Suzuki',
      },
      {
        channel: 'phone',
        channelLabel: '电话',
        summary: '确认签约意向与所需材料范围。',
        conclusion: '同意签约',
        nextAction: '安排面谈签约',
        nextFollowUp: '2026-04-01',
        time: '2026/03/28 11:00',
        operator: 'Suzuki',
      },
      {
        channel: 'email',
        channelLabel: '邮件',
        summary: '初次联系：介绍人山田商事转介技人国更新咨询。',
        conclusion: '初步意向确认',
        nextAction: '致电详谈',
        nextFollowUp: '2026-03-28',
        time: '2026/03/25 09:30',
        operator: 'Suzuki',
      },
    ],

    conversion: {
      dedupResult: null,
      convertedCustomer: {
        id: 'CUS-2026-0195',
        name: '王 明',
        group: '东京二组',
        link: '../customers/index.html',
        convertedAt: '2026/04/02',
        convertedBy: 'Suzuki',
      },
      convertedCase: null,
      conversions: [
        { type: 'customer', id: 'CUS-2026-0195', label: '王 明 → 客户建档', time: '2026/04/02', operator: 'Suzuki' },
      ],
    },

    log: [
      { type: 'status', operator: 'System', time: '2026/04/02 10:00', fromValue: '已签约',   toValue: '已转客户（CUS-2026-0195）', chipClass: 'bg-emerald-100 text-emerald-700' },
      { type: 'status', operator: 'Suzuki', time: '2026/04/01 15:00', fromValue: '待签约',   toValue: '已签约',   chipClass: 'bg-emerald-100 text-emerald-700' },
      { type: 'status', operator: 'Suzuki', time: '2026/03/28 11:30', fromValue: '跟进中',   toValue: '待签约',   chipClass: 'bg-violet-100 text-violet-700' },
      { type: 'owner',  operator: 'Admin',  time: '2026/03/25 09:00', fromValue: '—',         toValue: 'Suzuki',   chipClass: 'bg-sky-100 text-sky-700' },
      { type: 'group',  operator: 'Admin',  time: '2026/03/25 09:00', fromValue: '—',         toValue: '东京二组', chipClass: 'bg-violet-100 text-violet-700' },
      { type: 'status', operator: 'System', time: '2026/03/25 09:00', fromValue: '—',         toValue: '新咨询',   chipClass: 'bg-amber-100 text-amber-700' },
    ],
  },

  /* ====== S.5  已转案件态 ====== */
  'converted-case': {
    id: 'LEAD-2026-0015',
    name: '王 明',
    status: 'signed',
    ownerId: 'suzuki',
    ownerLabel: 'Suzuki',
    ownerInitials: 'S',
    ownerAvatarClass: 'bg-sky-100 text-sky-700',
    groupId: 'tokyo-2',
    groupLabel: '东京二组',
    banner: null,
    buttons: 'convertedCase',
    readonly: false,

    info: {
      id: 'LEAD-2026-0015',
      name: '王 明',
      phone: '080-7777-8888',
      email: 'wang.ming@email.com',
      source: '介绍',
      referrer: '山田商事',
      businessType: '技人国',
      group: '东京二组',
      owner: 'Suzuki',
      note: '已转客户并建案。技人国更新，CAS-2026-0210 进行中。',
    },

    followups: [
      {
        channel: 'meeting',
        channelLabel: '面谈',
        summary: '签约面谈完成，合同签署并创建客户档案。',
        conclusion: '已建档，进入案件创建',
        nextAction: '创建技人国更新案件',
        nextFollowUp: '2026-04-03',
        time: '2026/04/01 14:00',
        operator: 'Suzuki',
      },
      {
        channel: 'phone',
        channelLabel: '电话',
        summary: '确认签约意向与所需材料范围。',
        conclusion: '同意签约',
        nextAction: '安排面谈签约',
        nextFollowUp: '2026-04-01',
        time: '2026/03/28 11:00',
        operator: 'Suzuki',
      },
    ],

    conversion: {
      dedupResult: null,
      convertedCustomer: {
        id: 'CUS-2026-0195',
        name: '王 明',
        group: '东京二组',
        link: '../customers/index.html',
        convertedAt: '2026/04/02',
        convertedBy: 'Suzuki',
      },
      convertedCase: {
        id: 'CAS-2026-0210',
        title: '王 明 技人国更新',
        type: '技人国 / 更新',
        group: '东京二组',
        link: '../case/detail.html',
        convertedAt: '2026/04/03',
        convertedBy: 'Suzuki',
      },
      conversions: [
        { type: 'customer', id: 'CUS-2026-0195', label: '王 明 → 客户建档',          time: '2026/04/02', operator: 'Suzuki' },
        { type: 'case',     id: 'CAS-2026-0210', label: '王 明 技人国更新 → 案件创建', time: '2026/04/03', operator: 'Suzuki' },
      ],
    },

    log: [
      { type: 'status', operator: 'System', time: '2026/04/03 10:00', fromValue: '已转客户', toValue: '已转案件（CAS-2026-0210）', chipClass: 'bg-emerald-100 text-emerald-700' },
      { type: 'status', operator: 'System', time: '2026/04/02 10:00', fromValue: '已签约',   toValue: '已转客户（CUS-2026-0195）', chipClass: 'bg-emerald-100 text-emerald-700' },
      { type: 'status', operator: 'Suzuki', time: '2026/04/01 15:00', fromValue: '待签约',   toValue: '已签约',   chipClass: 'bg-emerald-100 text-emerald-700' },
      { type: 'owner',  operator: 'Admin',  time: '2026/03/25 09:00', fromValue: '—',         toValue: 'Suzuki',   chipClass: 'bg-sky-100 text-sky-700' },
      { type: 'group',  operator: 'Admin',  time: '2026/03/25 09:00', fromValue: '—',         toValue: '东京二组', chipClass: 'bg-violet-100 text-violet-700' },
      { type: 'status', operator: 'System', time: '2026/03/25 09:00', fromValue: '—',         toValue: '新咨询',   chipClass: 'bg-amber-100 text-amber-700' },
    ],
  },

  /* ====== S.6  去重命中 Lead（电话匹配） ====== */
  'dedup-lead': {
    id: 'LEAD-2026-0046',
    name: '田中 花子',
    status: 'new',
    ownerId: 'sato',
    ownerLabel: 'Sato',
    ownerInitials: 'Sa',
    ownerAvatarClass: 'bg-amber-100 text-amber-700',
    groupId: 'osaka',
    groupLabel: '大阪组',
    banner: null,
    buttons: 'normal',
    readonly: false,

    info: {
      id: 'LEAD-2026-0046',
      name: '田中 花子',
      phone: '080-1234-5678',
      email: '',
      source: '电话',
      referrer: '',
      businessType: '高度人才',
      group: '大阪组',
      owner: 'Sato',
      note: '电话号码与已有线索 LEAD-2026-0023 重复，经人工确认后继续创建。',
    },

    followups: [
      {
        channel: 'phone',
        channelLabel: '电话',
        summary: '来电咨询高度人才签证申请条件与所需材料。',
        conclusion: '初步意向确认，需进一步了解学历和年收入',
        nextAction: '邮件发送高度人才评分表',
        nextFollowUp: '2026-04-14',
        time: '2026/04/09 09:15',
        operator: 'Sato',
      },
    ],

    conversion: {
      dedupResult: {
        type: 'lead',
        matchField: 'phone',
        matchValue: '080-1234-5678',
        matchedRecord: {
          id: 'LEAD-2026-0023',
          name: '田中 花子（既有线索）',
          phone: '080-1234-5678',
          group: '大阪组',
          status: 'following',
          statusLabel: '跟进中',
        },
        message: '电话号码 080-1234-5678 匹配到已有线索 LEAD-2026-0023（田中 花子），该线索当前为"跟进中"状态。',
        userAction: 'confirmed_create',
      },
      convertedCustomer: null,
      convertedCase: null,
      conversions: [],
    },

    log: [
      { type: 'status', operator: 'System', time: '2026/04/09 09:15', fromValue: '—',   toValue: '新咨询（去重确认后创建）', chipClass: 'bg-amber-100 text-amber-700' },
      { type: 'owner',  operator: 'Admin',  time: '2026/04/09 09:15', fromValue: '—',   toValue: 'Sato',                     chipClass: 'bg-amber-100 text-amber-700' },
      { type: 'group',  operator: 'Admin',  time: '2026/04/09 09:15', fromValue: '—',   toValue: '大阪组',                   chipClass: 'bg-violet-100 text-violet-700' },
    ],
  },

  /* ====== S.7  去重命中 Customer（邮箱匹配） ====== */
  'dedup-customer': {
    id: 'LEAD-2026-0047',
    name: '李娜（重复确认）',
    status: 'new',
    ownerId: 'tanaka',
    ownerLabel: 'Tanaka',
    ownerInitials: 'T',
    ownerAvatarClass: 'bg-emerald-100 text-emerald-700',
    groupId: 'tokyo-1',
    groupLabel: '东京一组',
    banner: null,
    buttons: 'normal',
    readonly: false,

    info: {
      id: 'LEAD-2026-0047',
      name: '李娜（重复确认）',
      phone: '',
      email: 'li.na@email.com',
      source: 'Web',
      referrer: '',
      businessType: '家族滞在',
      group: '东京一组',
      owner: 'Tanaka',
      note: '邮箱与已有客户 CUS-2026-0181（李娜）重复，经人工确认后继续创建新线索用于新业务跟进。',
    },

    followups: [
      {
        channel: 'email',
        channelLabel: '邮件',
        summary: '收到 Web 表单咨询：家族滞在更新相关问题。邮箱匹配到已有客户。',
        conclusion: '确认为已有客户的新业务咨询',
        nextAction: '致电确认是否为同一人',
        nextFollowUp: '2026-04-13',
        time: '2026/04/09 10:00',
        operator: 'Tanaka',
      },
    ],

    conversion: {
      dedupResult: {
        type: 'customer',
        matchField: 'email',
        matchValue: 'li.na@email.com',
        matchedRecord: {
          id: 'CUS-2026-0181',
          name: '李娜',
          email: 'li.na@email.com',
          group: '东京一组',
          summary: '已有客户档案，家族滞在更新',
        },
        message: '邮箱 li.na@email.com 匹配到已有客户 CUS-2026-0181（李娜），该客户已有档案。',
        userAction: 'confirmed_create',
      },
      convertedCustomer: null,
      convertedCase: null,
      conversions: [],
    },

    log: [
      { type: 'status', operator: 'System', time: '2026/04/09 10:00', fromValue: '—',   toValue: '新咨询（去重确认后创建）', chipClass: 'bg-amber-100 text-amber-700' },
      { type: 'owner',  operator: 'Admin',  time: '2026/04/09 10:00', fromValue: '—',   toValue: 'Tanaka',                   chipClass: 'bg-emerald-100 text-emerald-700' },
      { type: 'group',  operator: 'Admin',  time: '2026/04/09 10:00', fromValue: '—',   toValue: '东京一组',                 chipClass: 'bg-violet-100 text-violet-700' },
    ],
  },

  /* ====== S.8  空跟进记录态 ====== */
  'empty-followups': {
    id: 'LEAD-2026-0042',
    name: 'Michael Thompson',
    status: 'new',
    ownerId: 'suzuki',
    ownerLabel: 'Suzuki',
    ownerInitials: 'S',
    ownerAvatarClass: 'bg-sky-100 text-sky-700',
    groupId: 'tokyo-1',
    groupLabel: '东京一组',
    banner: null,
    buttons: 'normal',
    readonly: false,

    info: {
      id: 'LEAD-2026-0042',
      name: 'Michael Thompson',
      phone: '090-8765-4321',
      email: 'michael.t@email.com',
      source: 'Web',
      referrer: '',
      businessType: '技人国',
      group: '东京一组',
      owner: 'Suzuki',
      note: '刚录入的新线索，尚未开始跟进。',
    },

    followups: [],

    conversion: {
      dedupResult: null,
      convertedCustomer: null,
      convertedCase: null,
      conversions: [],
    },

    log: [
      { type: 'status', operator: 'System', time: '2026/04/08 15:30', fromValue: '—', toValue: '新咨询', chipClass: 'bg-amber-100 text-amber-700' },
      { type: 'owner',  operator: 'Admin',  time: '2026/04/08 15:30', fromValue: '—', toValue: 'Suzuki', chipClass: 'bg-sky-100 text-sky-700' },
      { type: 'group',  operator: 'Admin',  time: '2026/04/08 15:30', fromValue: '—', toValue: '东京一组', chipClass: 'bg-violet-100 text-violet-700' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  CONVERSION MODAL PRESETS                                           */
/* ------------------------------------------------------------------ */

var CONVERSION_MODALS = {
  toCustomer: {
    title: '转为客户',
    subtitle: '将此线索转为正式客户档案。Group 默认继承线索归属组。',
    fields: [
      { key: 'name',  label: '客户姓名', prefillFrom: 'info.name',  readonly: true },
      { key: 'phone', label: '电话',     prefillFrom: 'info.phone', readonly: true },
      { key: 'email', label: '邮箱',     prefillFrom: 'info.email', readonly: true },
      { key: 'group', label: '归属 Group', prefillFrom: 'groupLabel', readonly: false, hint: '默认继承线索 Group（03 §2.2）。如需变更请说明原因。' },
    ],
    confirmLabel: '确认转为客户',
    cancelLabel: '取消',
  },
  toCase: {
    title: '转为案件',
    subtitle: '为此线索创建案件。主申请人信息将从线索自动预填。',
    fields: [
      { key: 'applicant', label: '主申请人', prefillFrom: 'info.name',         readonly: true },
      { key: 'caseType',  label: '案件类型', prefillFrom: 'info.businessType', readonly: false, hint: '选择签证/业务类型' },
      { key: 'owner',     label: '负责人',   prefillFrom: 'ownerLabel',        readonly: false },
      { key: 'group',     label: '归属 Group', prefillFrom: 'groupLabel',      readonly: false, hint: '默认继承 Customer.group（03 §2.2）' },
    ],
    confirmLabel: '确认创建案件',
    cancelLabel: '取消',
  },
};

/* ------------------------------------------------------------------ */
/*  EXPORT                                                             */
/* ------------------------------------------------------------------ */

window.LeadsDetailConfig = {
  DETAIL_TABS: DETAIL_TABS,
  DETAIL_STATUSES: DETAIL_STATUSES,
  FOLLOWUP_CHANNELS: FOLLOWUP_CHANNELS,
  LOG_CATEGORIES: LOG_CATEGORIES,
  DETAIL_TOASTS: DETAIL_TOASTS,
  BANNERS: BANNERS,
  HEADER_BUTTONS: HEADER_BUTTONS,
  DETAIL_SAMPLES: DETAIL_SAMPLES,
  CONVERSION_MODALS: CONVERSION_MODALS,
};
