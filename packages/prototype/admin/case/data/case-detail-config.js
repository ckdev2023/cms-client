/**
 * Case Detail — declarative config, sample data, permission model & tab definitions.
 * Source of truth for detail.html; scripts/case-detail-page.js reads this at runtime.
 *
 * Covers:
 *   - Tab definitions & DOM mapping
 *   - Stage lifecycle (S1–S9)
 *   - Gate definitions (A/B/C)
 *   - Billing status enum
 *   - Role / permission model (demo-only)
 *   - Log category taxonomy
 *   - Toast feedback templates
 *   - 6 required demo scenarios with per-tab inline data
 */

/* ------------------------------------------------------------------ */
/*  TABS                                                               */
/* ------------------------------------------------------------------ */

var DETAIL_TABS = [
  { key: 'overview',   label: '概览',       icon: 'chart-bar' },
  { key: 'validation', label: '提交前检查', icon: 'shield-check' },
  { key: 'documents',  label: '资料清单',   icon: 'document-text' },
  { key: 'tasks',      label: '任务',       icon: 'clipboard-check' },
  { key: 'info',       label: '基础信息',   icon: 'identification' },
  { key: 'forms',      label: '文书',       icon: 'document-duplicate' },
  { key: 'deadlines',  label: '期限',       icon: 'clock' },
  { key: 'billing',    label: '收费',       icon: 'currency-yen' },
  { key: 'messages',   label: '沟通记录',   icon: 'chat-alt-2' },
  { key: 'log',        label: '日志',       icon: 'document-report' },
];

/* ------------------------------------------------------------------ */
/*  STAGES (S1–S9)                                                     */
/* ------------------------------------------------------------------ */

var DETAIL_STAGES = {
  S1: { code: 'S1', label: '刚开始办案',    badge: 'badge-gray'   },
  S2: { code: 'S2', label: '资料收集中',    badge: 'badge-green'  },
  S3: { code: 'S3', label: '资料待补 / 审核中', badge: 'badge-orange' },
  S4: { code: 'S4', label: '文书制作中',    badge: 'badge-blue'   },
  S5: { code: 'S5', label: '提交前检查',    badge: 'badge-orange' },
  S6: { code: 'S6', label: '可安排提交',    badge: 'badge-orange' },
  S7: { code: 'S7', label: '已提交待回执',  badge: 'badge-blue'   },
  S8: { code: 'S8', label: '结果待确认',    badge: 'badge-blue'   },
  S9: { code: 'S9', label: '已归档',     badge: 'badge-gray'   },
};

/* ------------------------------------------------------------------ */
/*  GATE DEFINITIONS (Gate-A / B / C)                                  */
/* ------------------------------------------------------------------ */

var DETAIL_GATES = {
  A: { id: 'A', label: '必须先处理', chip: 'gate-chip-a', severity: 'blocking',      desc: '必须先处理的问题' },
  B: { id: 'B', label: '建议补强',   chip: 'gate-chip-b', severity: 'warning',       desc: '建议补强的风险项' },
  C: { id: 'C', label: '补充说明',   chip: 'gate-chip-c', severity: 'informational', desc: '不阻断但建议了解' },
};

/* ------------------------------------------------------------------ */
/*  BILLING STATUS ENUM  (aligned with 03 §3.5)                       */
/* ------------------------------------------------------------------ */

var BILLING_STATUS = {
  paid:       { label: '已结清',   badge: 'badge-green'  },
  partial:    { label: '部分回款', badge: 'badge-orange' },
  unpaid:     { label: '应收',     badge: 'badge-orange' },
  arrears:    { label: '欠款',     badge: 'badge-red'    },
  waived:     { label: '免除',     badge: 'badge-gray'   },
};

/* ------------------------------------------------------------------ */
/*  LOG CATEGORIES (三分类)                                            */
/* ------------------------------------------------------------------ */

var LOG_CATEGORIES = [
  { key: 'all',       label: '全部' },
  { key: 'operation', label: '操作日志' },
  { key: 'review',    label: '审核日志' },
  { key: 'status',    label: '状态变更日志' },
];

/* ------------------------------------------------------------------ */
/*  ROLES / PERMISSIONS (demo-only, 文案说明)                          */
/* ------------------------------------------------------------------ */

var DETAIL_ROLES = [
  { key: 'admin',    label: '管理员', scope: '全所案件',             canEdit: '全部字段',               canExport: true,  auditRequired: true  },
  { key: 'owner',    label: '主办人', scope: '本组 + 负责/协作案件', canEdit: '负责案件全部字段',       canExport: true,  auditRequired: true  },
  { key: 'assistant',label: '助理',   scope: '操作字段',             canEdit: '资料、沟通、任务',       canExport: false, auditRequired: false },
  { key: 'finance',  label: '财务',   scope: '仅收费相关',           canEdit: '收费 Tab',               canExport: true,  auditRequired: true  },
];

/* ------------------------------------------------------------------ */
/*  TOAST TEMPLATES                                                    */
/* ------------------------------------------------------------------ */

var DETAIL_TOASTS = {
  exportZip:      { title: '已导出（示例）',           desc: '案件资料 ZIP 已生成' },
  waived:         { title: '已标记无需提供（示例）',   desc: '{item} 已从完成率分母剔除' },
  paymentLogged:  { title: '回款已登记（示例）',       desc: '{amount} 已记录到收费节点' },
  riskConfirmed:  { title: '风险确认已留痕（示例）',   desc: '欠款继续提交已记录确认人与原因' },
  archived:       { title: '案件已归档（示例）',       desc: '案件进入归档只读状态，字段已锁定' },
  stageAdvanced:  { title: '阶段已更新（示例）',       desc: '已从 {from} 推进到 {to}' },
};

/* ------------------------------------------------------------------ */
/*  SAMPLE SCENARIOS  (base P0 + 经营管理签后半段映射样例)              */
/*                                                                     */
/*  Each sample carries:                                               */
/*    header  — breadcrumb / title / badge / owner / agency            */
/*    overview — 4 summary cards + provider progress + risk + timeline */
/*    info    — case attributes + related parties                      */
/*    documents — per-provider grouped checklist items                 */
/*    billing — total / received / outstanding + payment rows          */
/*    deadlines — 4 deadline items                                     */
/*    validation — gate items + submission pkgs + correction + review  */
/*    log     — log entries with category tags                         */
/*    tasks   — task items                                             */
/*    readonly — whether the case is S9-locked                         */
/* ------------------------------------------------------------------ */

function cloneDetailData(value) {
  return JSON.parse(JSON.stringify(value));
}

var BUSINESS_POST_APPROVAL_BASE = {
  caseType: '经营管理签（経営・管理）',
  applicationType: '认定（在留資格認定）',
  acceptedDate: '2026-05-18',
  targetDate: '2026-09-01',
  providerProgress: [
    { label: '主申请人',       done: 4, total: 4 },
    { label: '扶養者/保証人',  done: 0, total: 0 },
    { label: '公司/出资主体',  done: 4, total: 4 },
    { label: '事務所内部',     done: 5, total: 5 },
  ],
  risk: {
    blockingCount: '当前卡点：无',
    blockingDetail: '认定阶段已通过，当前转入下签后处理',
    arrearsStatus: '收费情况：已结清',
    arrearsDetail: '尾款已确认，可继续出件与返签跟进',
    deadlineAlert: '时限提醒：关注返签回传与到期提醒',
    deadlineAlertDetail: '需在返签成功后登记新在留期间并设置提醒',
    lastValidation: '最近一次检查：2026/08/12 11:20',
    reviewStatus: '复核进度：认定阶段已通过',
  },
  billing: {
    total: '¥1,200,000',
    received: '¥1,200,000',
    outstanding: '¥0',
    payments: [
      { date: '2026/05/20', type: '着手金', amount: '¥600,000', status: 'paid', statusLabel: '已结清' },
      { date: '2026/08/14', type: '成功酬金（尾款）', amount: '¥600,000', status: 'paid', statusLabel: '已结清' },
    ],
  },
  validation: {
    lastTime: '最近一次检查：2026/08/12 11:20 · Tanaka',
    blocking: [],
    warnings: [],
    info: [],
    retriggerNote: '当前主要用于留痕下签后处理进度，不再阻断前序认定提交。',
  },
  submissionPackages: [
    { id: 'SUB-001', status: '认定许可', locked: true, date: '2026/08/12', summary: '认定申请已许可 · 审查结果已回传 · 负责人：Tanaka' },
  ],
  correctionPackage: null,
  doubleReview: [
    { initials: 'TN', name: 'Tanaka', verdict: '通过', verdictBadge: 'badge-green', time: '2026/08/12 10:40', comment: '认定阶段收尾完毕，可转 COE / 返签跟进', rejectReason: null },
  ],
  riskConfirmationRecord: null,
  team: [
    { initials: 'TN', name: 'Tanaka', role: '负责人', subtitle: '经营管理签主担当', gradient: 'from-[var(--primary)] to-[var(--primary-hover)]' },
    { initials: 'AK', name: 'Aki', role: '运营', subtitle: '返签与提醒跟进', gradient: 'from-[#14b8a6] to-[#0f766e]' },
  ],
  relatedParties: [
    { initials: 'SM', name: '佐藤美咲', role: '主申请人', detail: '日本国内设立公司代表预定者 · 经营管理签认定', avatarStyle: 'gradient' },
    { initials: 'BM', name: 'Blue Maple 合同会社', role: '设立后公司主体', detail: '東京都中央区 · 资本金 500 万日元', avatarStyle: 'surface' },
  ],
  docsCounter: '13/13',
  overviewActions: {
    primary: { label: '查看下签后处理', tab: 'validation' },
    secondary: { label: '查看文书与出件记录', tab: 'forms' },
  },
};

function buildBusinessDocuments(postApprovalGroup) {
  return [
    { group: '主申请人提供', count: '4/4', items: [
      { name: '护照复印件', meta: 'passport_misaki.pdf · v2', status: 'approved', statusLabel: '通过' },
      { name: '履歴書', meta: 'cv_misaki.pdf · v1', status: 'approved', statusLabel: '通过' },
      { name: '经历史说明', meta: 'career_note.pdf · v1', status: 'approved', statusLabel: '通过' },
      { name: '照片', meta: 'photo_misaki.jpg · v1', status: 'approved', statusLabel: '通过' },
    ]},
    { group: '公司/出资主体提供', count: '4/4', items: [
      { name: '事业计划书', meta: 'business_plan.pdf · v3', status: 'approved', statusLabel: '通过' },
      { name: '办公室赁约资料', meta: 'office_contract.pdf · v1', status: 'approved', statusLabel: '通过' },
      { name: '资本金证明', meta: 'capital_proof.pdf · v1', status: 'approved', statusLabel: '通过' },
      { name: '登記事項', meta: 'registry_extract.pdf · v1', status: 'approved', statusLabel: '通过' },
    ]},
    { group: '事務所内部准备', count: '5/5', items: [
      { name: '申請理由書', meta: 'reason_business.pdf · v2', status: 'approved', statusLabel: '通过' },
      { name: '質問応答记录', meta: 'qa_log.pdf · v1', status: 'approved', statusLabel: '通过' },
      { name: '提交用封筒', meta: '完了', status: 'approved', statusLabel: '通过' },
      { name: '认定结果通知截图', meta: 'coe_notice.png · v1', status: 'approved', statusLabel: '通过' },
      { name: '尾款回款凭证', meta: 'receipt_final.pdf · v1', status: 'approved', statusLabel: '通过' },
    ]},
    postApprovalGroup,
  ];
}

function buildBusinessSample(overrides) {
  var sample = Object.assign({}, BUSINESS_POST_APPROVAL_BASE, overrides);
  sample.providerProgress = cloneDetailData(overrides.providerProgress || BUSINESS_POST_APPROVAL_BASE.providerProgress);
  sample.risk = cloneDetailData(overrides.risk || BUSINESS_POST_APPROVAL_BASE.risk);
  sample.billing = cloneDetailData(overrides.billing || BUSINESS_POST_APPROVAL_BASE.billing);
  sample.validation = cloneDetailData(overrides.validation || BUSINESS_POST_APPROVAL_BASE.validation);
  sample.submissionPackages = cloneDetailData(overrides.submissionPackages || BUSINESS_POST_APPROVAL_BASE.submissionPackages);
  sample.correctionPackage = cloneDetailData(
    Object.prototype.hasOwnProperty.call(overrides, 'correctionPackage')
      ? overrides.correctionPackage
      : BUSINESS_POST_APPROVAL_BASE.correctionPackage
  );
  sample.doubleReview = cloneDetailData(overrides.doubleReview || BUSINESS_POST_APPROVAL_BASE.doubleReview);
  sample.riskConfirmationRecord = cloneDetailData(
    Object.prototype.hasOwnProperty.call(overrides, 'riskConfirmationRecord')
      ? overrides.riskConfirmationRecord
      : BUSINESS_POST_APPROVAL_BASE.riskConfirmationRecord
  );
  sample.team = cloneDetailData(overrides.team || BUSINESS_POST_APPROVAL_BASE.team);
  sample.relatedParties = cloneDetailData(overrides.relatedParties || BUSINESS_POST_APPROVAL_BASE.relatedParties);
  sample.timeline = cloneDetailData(overrides.timeline || []);
  sample.documents = cloneDetailData(overrides.documents || []);
  sample.forms = cloneDetailData(overrides.forms || { templates: [], generated: [] });
  sample.deadlines = cloneDetailData(overrides.deadlines || []);
  sample.tasks = cloneDetailData(overrides.tasks || []);
  sample.logEntries = cloneDetailData(overrides.logEntries || []);
  sample.postApprovalFlow = cloneDetailData(overrides.postApprovalFlow || null);
  sample.residencePeriod = cloneDetailData(overrides.residencePeriod || null);
  sample.reminderSchedule = cloneDetailData(overrides.reminderSchedule || null);
  sample.overviewActions = cloneDetailData(overrides.overviewActions || BUSINESS_POST_APPROVAL_BASE.overviewActions);
  return sample;
}

var BUSINESS_FLOW_BASE = {
  caseType: '经营管理签（経営・管理）',
  applicationType: '认定（在留資格認定）',
  acceptedDate: '2026-05-18',
  targetDate: '2026-08-12',
  team: [
    { initials: 'TN', name: 'Tanaka', role: '负责人', subtitle: '经营管理签主担当', gradient: 'from-[var(--primary)] to-[var(--primary-hover)]' },
    { initials: 'AK', name: 'Aki', role: '运营', subtitle: '资料推进与客户跟进', gradient: 'from-[#14b8a6] to-[#0f766e]' },
  ],
  relatedParties: [
    { initials: 'SM', name: '佐藤美咲', role: '主申请人', detail: '日本国内设立公司代表预定者 · 经营管理签认定', avatarStyle: 'gradient' },
    { initials: 'BM', name: 'Blue Maple 合同会社', role: '公司主体', detail: '東京都中央区 · 资本金 500 万日元', avatarStyle: 'surface' },
  ],
  billing: {
    total: '¥1,200,000',
    received: '¥600,000',
    outstanding: '¥600,000',
    payments: [
      { date: '2026/05/20', type: '着手金', amount: '¥600,000', status: 'paid', statusLabel: '已结清' },
      { date: '2026/08/14', type: '成功酬金（尾款）', amount: '¥600,000', status: 'pending', statusLabel: '待收取' },
    ],
  },
  submissionPackages: [],
  correctionPackage: null,
  doubleReview: [],
  riskConfirmationRecord: null,
  overviewActions: {
    primary: { label: '查看当前步骤资料', tab: 'documents' },
    secondary: { label: '查看任务与节点', tab: 'tasks' },
  },
};

function buildBusinessFlowSample(overrides) {
  var sample = Object.assign({}, BUSINESS_FLOW_BASE, overrides);
  sample.providerProgress = cloneDetailData(overrides.providerProgress || []);
  sample.risk = cloneDetailData(overrides.risk || {});
  sample.billing = cloneDetailData(overrides.billing || BUSINESS_FLOW_BASE.billing);
  sample.validation = cloneDetailData(overrides.validation || { blocking: [], warnings: [], info: [] });
  sample.submissionPackages = cloneDetailData(overrides.submissionPackages || BUSINESS_FLOW_BASE.submissionPackages);
  sample.correctionPackage = cloneDetailData(
    Object.prototype.hasOwnProperty.call(overrides, 'correctionPackage')
      ? overrides.correctionPackage
      : BUSINESS_FLOW_BASE.correctionPackage
  );
  sample.doubleReview = cloneDetailData(overrides.doubleReview || BUSINESS_FLOW_BASE.doubleReview);
  sample.riskConfirmationRecord = cloneDetailData(
    Object.prototype.hasOwnProperty.call(overrides, 'riskConfirmationRecord')
      ? overrides.riskConfirmationRecord
      : BUSINESS_FLOW_BASE.riskConfirmationRecord
  );
  sample.team = cloneDetailData(overrides.team || BUSINESS_FLOW_BASE.team);
  sample.relatedParties = cloneDetailData(overrides.relatedParties || BUSINESS_FLOW_BASE.relatedParties);
  sample.timeline = cloneDetailData(overrides.timeline || []);
  sample.documents = cloneDetailData(overrides.documents || []);
  sample.forms = cloneDetailData(overrides.forms || { templates: [], generated: [] });
  sample.deadlines = cloneDetailData(overrides.deadlines || []);
  sample.tasks = cloneDetailData(overrides.tasks || []);
  sample.logEntries = cloneDetailData(overrides.logEntries || []);
  sample.postApprovalFlow = cloneDetailData(overrides.postApprovalFlow || null);
  sample.residencePeriod = cloneDetailData(overrides.residencePeriod || null);
  sample.reminderSchedule = cloneDetailData(overrides.reminderSchedule || null);
  sample.overviewActions = cloneDetailData(overrides.overviewActions || BUSINESS_FLOW_BASE.overviewActions);
  return sample;
}

function buildBusinessStepProviderProgress(applicant, dependant, company, office) {
  return [
    { done: applicant[0], total: applicant[1] },
    { done: dependant[0], total: dependant[1] },
    { done: company[0], total: company[1] },
    { done: office[0], total: office[1] },
  ];
}

function buildBusinessStepSample(config) {
  return buildBusinessFlowSample({
    id: config.id,
    title: config.title || '经营管理签（认定）- 佐藤美咲',
    client: config.client || '佐藤美咲',
    owner: config.owner || 'Tanaka',
    agency: '东京出入国在留管理局（品川）',
    stage: config.stage,
    stageCode: config.stageCode,
    stageMeta: config.stageMeta,
    statusBadge: config.statusBadge || 'badge-blue',
    deadline: config.deadline,
    deadlineMeta: config.deadlineMeta,
    deadlineDanger: !!config.deadlineDanger,
    progressPercent: config.progressPercent,
    progressCount: config.progressCount,
    billingAmount: '¥1,200,000',
    billingMeta: config.billingMeta || '着手金已收 · 尾款待收',
    billingStatusKey: config.billingStatusKey || 'partial',
    docsCounter: config.docsCounter,
    readonly: false,
    nextAction: config.nextAction,
    validationHint: config.validationHint,
    providerProgress: config.providerProgress,
    risk: config.risk,
    validation: config.validation,
    timeline: config.timeline,
    documents: config.documents,
    forms: config.forms,
    deadlines: config.deadlines,
    tasks: config.tasks,
    logEntries: config.logEntries,
    submissionPackages: config.submissionPackages || [],
    correctionPackage: Object.prototype.hasOwnProperty.call(config, 'correctionPackage')
      ? config.correctionPackage
      : null,
    doubleReview: config.doubleReview || [],
  });
}

var BUSINESS_STEP_06 = buildBusinessStepSample({
  id: 'CAS-2026-0231',
  stage: '已发送资料清单',
  stageCode: 'S2',
  stageMeta: '等待客户回传第一批资料',
  statusBadge: 'badge-green',
  deadline: '2026/05/28',
  deadlineMeta: '首批资料回收截止',
  progressPercent: 31,
  progressCount: '4 / 13 资料已收齐',
  docsCounter: '4/13',
  nextAction: '跟进客户按资料清单回传身份资料、资金说明与办公室赁约。',
  validationHint: '当前以资料回收为主，暂未进入提交前检查。',
  providerProgress: buildBusinessStepProviderProgress([2, 4], [0, 0], [1, 4], [1, 5]),
  risk: {
    blockingCount: '0',
    blockingDetail: '当前卡点：无',
    arrearsStatus: '欠款状态：着手金已收',
    arrearsDetail: '尾款将在认定结果通过后收取',
    deadlineAlert: '资料回收中',
    deadlineAlertDetail: '首批资料回收截止 2026/05/28',
    lastValidation: '最近一次检查：尚未触发提交前检查',
    reviewStatus: '待进入制作阶段',
  },
  validation: {
    lastTime: '最近一次检查：尚未触发提交前检查',
    blocking: [],
    warnings: [{ gate: 'B', title: '建议先确认办公室赁约签约日', note: '避免后续事业计划书中的地址与赁约日期不一致。' }],
    info: [{ gate: 'C', title: '已发送资料清单', note: '客户当前应优先回传护照、履历书与资本金来源说明。' }],
  },
  timeline: [
    { color: 'primary', text: '已发送经营管理签资料清单', meta: 'Aki · 2026/05/18 15:20' },
    { color: 'success', text: '着手金已到账', meta: '系统 · 2026/05/20 10:05' },
    { color: 'border', text: '案件创建', meta: 'Tanaka · 2026/05/18 11:00' },
  ],
  documents: [
    { group: '主申请人提供', count: '2/4', items: [
      { name: '护照复印件', meta: 'passport_misaki.pdf · 2026/05/19', status: 'approved', statusLabel: '已上传' },
      { name: '履歴書', meta: 'cv_misaki.docx · 2026/05/19', status: 'approved', statusLabel: '已上传' },
      { name: '经历史说明', meta: '待上传', status: 'waiting_upload', statusLabel: '待上传' },
    ]},
    { group: '公司/出资主体提供', count: '1/4', items: [
      { name: '资本金证明', meta: 'capital_note.pdf · 2026/05/20', status: 'approved', statusLabel: '已上传' },
      { name: '事业计划书', meta: '待客户补充说明', status: 'waiting_upload', statusLabel: '待上传' },
      { name: '办公室赁约资料', meta: '待客户补充', status: 'waiting_upload', statusLabel: '待上传' },
    ]},
    { group: '事務所内部准备', count: '1/5', items: [
      { name: '资料清单发送记录', meta: 'mail_log_20260518.eml', status: 'approved', statusLabel: '已留痕' },
      { name: '申請理由書', meta: '等待资料齐备后生成', status: 'waiting_upload', statusLabel: '待生成' },
      { name: '事业计划书校对稿', meta: '等待客户说明', status: 'waiting_upload', statusLabel: '待生成' },
    ]},
  ],
  forms: {
    templates: [{ name: '经营管理签资料清单', meta: '事务所模板 · PDF', actionLabel: '查看' }],
    generated: [{ name: '经营管理签资料清单_佐藤美咲.pdf', meta: 'v1 · 2026/05/18 生成', tone: 'success', statusLabel: '已发送' }],
  },
  deadlines: [
    { id: '1', title: '首批资料回收', desc: '客户需回传身份资料与资金说明', date: '2026/05/28', remaining: '剩余 10 天', severity: 'warning' },
    { id: '2', title: '补件截止日', desc: '当前尚未触发补正', date: '待触发', remaining: '未开始', severity: 'primary' },
    { id: '3', title: '内部制作启动', desc: '资料达 70% 后开始制作', date: '2026/06/03', remaining: '剩余 16 天', severity: 'primary' },
    { id: '4', title: '结果预计日', desc: '基于认定流程预估', date: '2026/08/12', remaining: '预计 86 天', severity: 'primary' },
  ],
  tasks: [
    { label: '发送资料清单并电话说明重点', done: true, due: '05/18', assignee: 'AK', color: 'primary', dueColor: 'normal' },
    { label: '跟进客户首批资料回传', done: false, due: '05/24', assignee: 'AK', color: 'primary', dueColor: 'warning' },
    { label: '确认办公室赁约可提供版本', done: false, due: '05/27', assignee: 'TN', color: 'warning', dueColor: 'warning' },
  ],
  logEntries: [{ type: 'operation', avatar: 'AK', avatarStyle: 'primary', text: '已发送资料清单并说明优先级', category: '操作日志', categoryChip: '', objectType: '资料推进', time: '2026/05/18 15:20', dotColor: 'primary' }],
});

var BUSINESS_STEP_07 = buildBusinessStepSample({
  id: 'CAS-2026-0232',
  stage: '客户已提交首批资料',
  stageCode: 'S3',
  stageMeta: '仍缺公司资料与办公室赁约',
  statusBadge: 'badge-orange',
  deadline: '2026/06/03',
  deadlineMeta: '等待补齐公司资料',
  progressPercent: 54,
  progressCount: '7 / 13 资料已收齐',
  docsCounter: '7/13',
  nextAction: '优先补齐办公室赁约与事业计划书，再交行政书士制作。',
  validationHint: '当前已进入资料审核，缺件会影响后续文书制作。',
  providerProgress: buildBusinessStepProviderProgress([4, 4], [0, 0], [2, 4], [1, 5]),
  risk: {
    blockingCount: '1',
    blockingDetail: '当前卡点：办公室赁约资料未齐',
    arrearsStatus: '欠款状态：着手金已收',
    arrearsDetail: '尾款仍待认定结果后收取',
    deadlineAlert: '资料缺件',
    deadlineAlertDetail: '若 2026/06/03 前未补齐，将推迟制作',
    lastValidation: '最近一次检查：2026/05/30 10:30 · Aki',
    reviewStatus: '待补齐后进入制作',
  },
  validation: {
    lastTime: '最近一次检查：2026/05/30 10:30 · Aki',
    blocking: [{ gate: 'A', title: '办公室赁约资料未上传', fix: '补充已签署赁约或使用承诺书', assignee: 'Aki', deadline: '2026/06/03', actionTab: 'documents', actionLabel: '去资料区补件' }],
    warnings: [{ gate: 'B', title: '事业计划书收入预测尚未确认', note: '建议先补齐营业额与人员计划。' }],
    info: [{ gate: 'C', title: '主申请人资料已齐', note: '可先启动主申请人简历与经历史说明整理。' }],
  },
  timeline: [
    { color: 'success', text: '客户已回传首批资料 7 份', meta: 'Aki · 2026/05/30 10:15' },
    { color: 'warning', text: '识别缺件：办公室赁约资料', meta: 'Aki · 2026/05/30 10:30' },
    { color: 'primary', text: '已发送经营管理签资料清单', meta: 'Aki · 2026/05/18 15:20' },
  ],
  documents: [
    { group: '主申请人提供', count: '4/4', items: [
      { name: '护照复印件', meta: '已审核', status: 'approved', statusLabel: '通过' },
      { name: '履歴書', meta: '已审核', status: 'approved', statusLabel: '通过' },
      { name: '经历史说明', meta: '已上传', status: 'approved', statusLabel: '通过' },
    ]},
    { group: '公司/出资主体提供', count: '2/4', items: [
      { name: '资本金证明', meta: '已审核', status: 'approved', statusLabel: '通过' },
      { name: '事业计划书', meta: '客户说明版待补强', status: 'revision_required', statusLabel: '待补强' },
      { name: '办公室赁约资料', meta: '尚未上传', status: 'waiting_upload', statusLabel: '待上传' },
    ]},
    { group: '事務所内部准备', count: '1/5', items: [
      { name: '资料清单发送记录', meta: '已留痕', status: 'approved', statusLabel: '已留痕' },
      { name: '申請理由書', meta: '待进入制作', status: 'waiting_upload', statusLabel: '待生成' },
      { name: '質問応答记录', meta: '访谈预约 2026/06/01', status: 'waiting_upload', statusLabel: '待整理' },
    ]},
  ],
  forms: {
    templates: [{ name: '事业计划书访谈提纲', meta: '事务所模板 · Docx', actionLabel: '生成' }],
    generated: [{ name: '访谈问题清单_佐藤美咲.docx', meta: 'v1 · 2026/05/30', tone: 'warning', statusLabel: '待访谈' }],
  },
  deadlines: [
    { id: '1', title: '补齐公司资料', desc: '事业计划书与办公室赁约需先补齐', date: '2026/06/03', remaining: '剩余 4 天', severity: 'danger' },
    { id: '2', title: '补件截止日', desc: '用于锁定首轮资料包', date: '2026/06/05', remaining: '剩余 6 天', severity: 'warning' },
    { id: '3', title: '内部制作启动', desc: '资料齐备后即可交行政书士起草', date: '2026/06/06', remaining: '剩余 7 天', severity: 'primary' },
    { id: '4', title: '结果预计日', desc: '基于认定流程预估', date: '2026/08/12', remaining: '预计 74 天', severity: 'primary' },
  ],
  tasks: [
    { label: '回收并归档首批客户资料', done: true, due: '05/30', assignee: 'AK', color: 'primary', dueColor: 'normal' },
    { label: '催收办公室赁约或使用承诺书', done: false, due: '06/03', assignee: 'AK', color: 'primary', dueColor: 'danger' },
    { label: '确认事业计划书营业额假设', done: false, due: '06/02', assignee: 'TN', color: 'warning', dueColor: 'warning' },
  ],
  logEntries: [{ type: 'status', avatar: 'AK', avatarStyle: 'warning', text: '识别缺件：办公室赁约资料', category: '状态变更', categoryChip: 'orange', objectType: '资料检查', time: '2026/05/30 10:30', dotColor: 'warning' }],
});

var BUSINESS_STEP_08 = buildBusinessStepSample({
  id: 'CAS-2026-0233',
  stage: '内部资料制作中',
  stageCode: 'S4',
  stageMeta: '行政书士正在制作理由书与计划书',
  deadline: '2026/06/12',
  deadlineMeta: '计划书与理由书首稿截止',
  progressPercent: 77,
  progressCount: '10 / 13 资料已收齐',
  docsCounter: '10/13',
  nextAction: '完成理由书首稿与事业计划书校对稿，再进入负责人确认。',
  providerProgress: buildBusinessStepProviderProgress([4, 4], [0, 0], [3, 4], [3, 5]),
  risk: {
    blockingCount: '0',
    blockingDetail: '当前卡点：无',
    arrearsStatus: '欠款状态：着手金已收',
    arrearsDetail: '尾款仍待认定结果后收取',
    deadlineAlert: '文书制作中',
    deadlineAlertDetail: '计划书与理由书首稿 2026/06/12 前完成',
    lastValidation: '最近一次检查：2026/06/06 16:40 · Tanaka',
    reviewStatus: '待负责人确认',
  },
  validation: {
    lastTime: '最近一次检查：2026/06/06 16:40 · Tanaka',
    blocking: [],
    warnings: [{ gate: 'B', title: '雇佣计划建议再保守一版', note: '建议把首年雇佣节奏写得更稳妥。' }],
    info: [{ gate: 'C', title: '主申请人资料与资本金证明已齐', note: '当前可并行制作申請理由書与事业计划书。' }],
  },
  timeline: [
    { color: 'primary', text: '行政书士开始制作申請理由書与事业计划书', meta: 'Tanaka · 2026/06/06 13:30' },
    { color: 'success', text: '办公室赁约资料已补齐', meta: 'Aki · 2026/06/04 18:10' },
  ],
  documents: [
    { group: '主申请人提供', count: '4/4', items: [{ name: '护照复印件', meta: '已审核', status: 'approved', statusLabel: '通过' }, { name: '履歴書', meta: '已审核', status: 'approved', statusLabel: '通过' }, { name: '经历史说明', meta: '已审核', status: 'approved', statusLabel: '通过' }]},
    { group: '公司/出资主体提供', count: '3/4', items: [{ name: '资本金证明', meta: '已审核', status: 'approved', statusLabel: '通过' }, { name: '事业计划书', meta: '内部制作中', status: 'approved', statusLabel: '已收齐' }, { name: '登記事項', meta: '公司设立登记预计下周出具', status: 'waiting_upload', statusLabel: '待上传' }]},
    { group: '事務所内部准备', count: '3/5', items: [{ name: '申請理由書', meta: 'reason_business_v1.docx · 起草中', status: 'revision_required', statusLabel: '草稿中' }, { name: '質問応答记录', meta: 'qa_log_20260605.docx', status: 'approved', statusLabel: '通过' }, { name: '事业计划书校对稿', meta: 'plan_review_v1.docx · 起草中', status: 'revision_required', statusLabel: '草稿中' }]},
  ],
  forms: {
    templates: [{ name: '申請理由書', meta: '事务所模板 · Word', actionLabel: '查看' }, { name: '事业计划书', meta: '事务所模板 · Word', actionLabel: '查看' }],
    generated: [{ name: '申請理由書_佐藤美咲_v1.docx', meta: '草稿 · 2026/06/06', tone: 'warning', statusLabel: '草稿' }, { name: '事业计划书_BlueMaple_v1.docx', meta: '草稿 · 2026/06/06', tone: 'warning', statusLabel: '草稿' }],
  },
  deadlines: [
    { id: '1', title: '文书首稿完成', desc: '理由书与计划书需先完成初稿', date: '2026/06/12', remaining: '剩余 6 天', severity: 'warning' },
    { id: '2', title: '登記事項补齐', desc: '登记摘本到位后可进入最终确认', date: '2026/06/13', remaining: '剩余 7 天', severity: 'primary' },
    { id: '3', title: '负责人确认', desc: '初稿完成后安排内部确认', date: '2026/06/15', remaining: '剩余 9 天', severity: 'primary' },
    { id: '4', title: '结果预计日', desc: '基于认定流程预估', date: '2026/08/12', remaining: '预计 67 天', severity: 'primary' },
  ],
  tasks: [{ label: '起草申請理由書 V1', done: true, due: '06/06', assignee: 'TN', color: 'primary', dueColor: 'normal' }, { label: '完成事业计划书校对稿', done: false, due: '06/11', assignee: 'TN', color: 'primary', dueColor: 'warning' }, { label: '确认公司登記事項出具时间', done: false, due: '06/10', assignee: 'AK', color: 'warning', dueColor: 'warning' }],
  logEntries: [{ type: 'operation', avatar: 'TN', avatarStyle: 'primary', text: '已启动经营管理签文书制作', category: '操作日志', categoryChip: '', objectType: '文书制作', time: '2026/06/06 13:30', dotColor: 'primary' }],
});

var BUSINESS_STEP_09 = buildBusinessStepSample({
  id: 'CAS-2026-0234',
  stage: '行政书士制作完成',
  stageCode: 'S4',
  stageMeta: '等待负责人首次确认',
  deadline: '2026/06/18',
  deadlineMeta: '负责人首次确认截止',
  progressPercent: 85,
  progressCount: '11 / 13 资料已收齐',
  docsCounter: '11/13',
  nextAction: '由负责人先做首轮确认，标记需客户确认的点。',
  providerProgress: buildBusinessStepProviderProgress([4, 4], [0, 0], [4, 4], [3, 5]),
  risk: {
    blockingCount: '0', blockingDetail: '当前卡点：无', arrearsStatus: '欠款状态：着手金已收', arrearsDetail: '尾款仍待认定结果后收取', deadlineAlert: '待负责人确认', deadlineAlertDetail: '首轮确认截止 2026/06/18', lastValidation: '最近一次检查：2026/06/14 11:20 · Tanaka', reviewStatus: '负责人初审中',
  },
  validation: { lastTime: '最近一次检查：2026/06/14 11:20 · Tanaka', blocking: [], warnings: [{ gate: 'B', title: '建议补一句办公室实际使用场景', note: '负责人要求在理由书中说明会议/接待用途。' }], info: [{ gate: 'C', title: '行政书士首稿已完成', note: '当前进入负责人首次确认。' }] },
  timeline: [{ color: 'success', text: '行政书士完成申請理由書与事业计划书首稿', meta: 'Tanaka · 2026/06/14 10:45' }, { color: 'primary', text: '安排负责人首次确认', meta: 'Aki · 2026/06/14 11:00' }],
  documents: BUSINESS_STEP_08.documents,
  forms: { templates: [{ name: '负责人确认清单', meta: '事务所模板 · Word', actionLabel: '生成' }], generated: [{ name: '申請理由書_佐藤美咲_v1.docx', meta: '已完成首稿 · 2026/06/14', tone: 'success', statusLabel: '待确认' }] },
  deadlines: [{ id: '1', title: '负责人首次确认', desc: '确认首稿是否可进入客户确认', date: '2026/06/18', remaining: '剩余 4 天', severity: 'warning' }, { id: '2', title: '客户确认预定日', desc: '负责人确认后发送客户确认版', date: '2026/06/20', remaining: '剩余 6 天', severity: 'primary' }, { id: '3', title: '提交前检查预留', desc: '客户确认后安排最终检查', date: '2026/06/24', remaining: '剩余 10 天', severity: 'primary' }, { id: '4', title: '结果预计日', desc: '基于认定流程预估', date: '2026/08/12', remaining: '预计 59 天', severity: 'primary' }],
  tasks: [{ label: '完成行政书士文书首稿', done: true, due: '06/14', assignee: 'TN', color: 'primary', dueColor: 'normal' }, { label: '负责人首次确认并批注意见', done: false, due: '06/18', assignee: 'TN', color: 'warning', dueColor: 'warning' }, { label: '整理客户确认问题点', done: false, due: '06/18', assignee: 'AK', color: 'primary', dueColor: 'warning' }],
  logEntries: [{ type: 'review', avatar: 'TN', avatarStyle: 'warning', text: '要求在理由书中补充办公室实际使用场景', category: '审核日志', categoryChip: 'orange', objectType: '负责人备注', time: '2026/06/14 11:20', dotColor: 'warning' }],
});

var BUSINESS_STEP_10 = buildBusinessStepSample({
  id: 'CAS-2026-0235',
  stage: '客户最终确认中',
  stageCode: 'S5',
  stageMeta: '等待客户确认最终送件版本',
  statusBadge: 'badge-orange',
  deadline: '2026/06/24',
  deadlineMeta: '客户最终确认截止',
  progressPercent: 92,
  progressCount: '12 / 13 资料已收齐',
  docsCounter: '12/13',
  nextAction: '收回客户确认后即可进入提交前检查与负责人复核。',
  providerProgress: buildBusinessStepProviderProgress([4, 4], [0, 0], [4, 4], [4, 5]),
  risk: { blockingCount: '0', blockingDetail: '当前卡点：无', arrearsStatus: '欠款状态：着手金已收', arrearsDetail: '尾款仍待认定结果后收取', deadlineAlert: '待客户确认', deadlineAlertDetail: '最终送件版确认截止 2026/06/24', lastValidation: '最近一次检查：2026/06/20 17:10 · Tanaka', reviewStatus: '客户确认中' },
  validation: { lastTime: '最近一次检查：2026/06/20 17:10 · Tanaka', blocking: [], warnings: [{ gate: 'B', title: '建议让客户再确认资本金来源描述', note: '确保客户确认版与银行流水表述一致。' }], info: [{ gate: 'C', title: '负责人已完成内审', note: '当前等待客户做最终确认。' }] },
  doubleReview: [{ initials: 'TN', name: 'Tanaka', verdict: '通过', verdictBadge: 'badge-green', time: '2026/06/20 16:40', comment: '内审完成，可发送客户确认版', rejectReason: null }],
  timeline: [{ color: 'primary', text: '客户确认版已发送', meta: 'Aki · 2026/06/20 17:00' }, { color: 'success', text: '负责人首次确认通过', meta: 'Tanaka · 2026/06/20 16:40' }],
  documents: BUSINESS_STEP_09.documents,
  forms: { templates: [{ name: '客户确认发送模板', meta: '事务所模板 · Email', actionLabel: '查看' }], generated: [{ name: '申請理由書_佐藤美咲_v2.docx', meta: '客户确认版 · 2026/06/20', tone: 'success', statusLabel: '待确认' }] },
  deadlines: [{ id: '1', title: '客户最终确认', desc: '收回最终送件版确认', date: '2026/06/24', remaining: '剩余 4 天', severity: 'warning' }, { id: '2', title: '提交前检查', desc: '客户确认后即可触发', date: '2026/06/25', remaining: '剩余 5 天', severity: 'primary' }, { id: '3', title: '窗口提交预约', desc: '确认后可锁定预约', date: '2026/06/27', remaining: '剩余 7 天', severity: 'primary' }, { id: '4', title: '结果预计日', desc: '基于认定流程预估', date: '2026/08/12', remaining: '预计 53 天', severity: 'primary' }],
  tasks: [{ label: '发送客户确认版', done: true, due: '06/20', assignee: 'AK', color: 'primary', dueColor: 'normal' }, { label: '回收客户最终确认', done: false, due: '06/24', assignee: 'AK', color: 'warning', dueColor: 'warning' }, { label: '准备提交前检查清单', done: false, due: '06/24', assignee: 'TN', color: 'primary', dueColor: 'warning' }],
  logEntries: [{ type: 'operation', avatar: 'AK', avatarStyle: 'primary', text: '已向客户发送最终确认版理由书与事业计划书', category: '操作日志', categoryChip: '', objectType: '客户确认', time: '2026/06/20 17:00', dotColor: 'primary' }],
});

var BUSINESS_STEP_11 = buildBusinessStepSample({
  id: 'CAS-2026-0236',
  stage: '负责人最终确认',
  stageCode: 'S6',
  stageMeta: '资料齐备，可安排提交',
  statusBadge: 'badge-orange',
  deadline: '2026/06/27',
  deadlineMeta: '窗口提交预约日已锁定',
  progressPercent: 100,
  progressCount: '13 / 13 资料已收齐',
  docsCounter: '13/13',
  nextAction: '完成提交前检查，锁定提交包并安排窗口递交。',
  providerProgress: buildBusinessStepProviderProgress([4, 4], [0, 0], [4, 4], [5, 5]),
  risk: { blockingCount: '0', blockingDetail: '当前卡点：无', arrearsStatus: '欠款状态：着手金已收', arrearsDetail: '尾款仍待认定结果后收取', deadlineAlert: '可安排提交', deadlineAlertDetail: '提交预约日 2026/06/27', lastValidation: '最近一次检查：2026/06/24 14:40 · Tanaka', reviewStatus: '双重复核通过' },
  validation: { lastTime: '最近一次检查：2026/06/24 14:40 · Tanaka', blocking: [], warnings: [], info: [{ gate: 'C', title: '负责人最终确认完成', note: '当前进入第 11 步，可进入入管提交。' }] },
  doubleReview: [{ initials: 'TN', name: 'Tanaka', verdict: '通过', verdictBadge: 'badge-green', time: '2026/06/20 16:40', comment: '内审完成，可发送客户确认版', rejectReason: null }, { initials: 'MG', name: 'Manager', verdict: '通过', verdictBadge: 'badge-green', time: '2026/06/24 14:35', comment: '客户确认回收完毕，允许安排提交', rejectReason: null }],
  timeline: [{ color: 'success', text: '客户最终确认已回收', meta: 'Aki · 2026/06/24 13:10' }, { color: 'success', text: '负责人最终确认通过', meta: 'Manager · 2026/06/24 14:35' }, { color: 'primary', text: '已锁定 2026/06/27 提交预约', meta: 'Aki · 2026/06/24 14:45' }],
  documents: BUSINESS_STEP_10.documents,
  forms: { templates: [{ name: '提交包封面', meta: '事务所模板 · PDF', actionLabel: '生成' }], generated: [{ name: '提交前检查清单_20260624.pdf', meta: '已完成 · Manager', tone: 'success', statusLabel: '已通过' }] },
  deadlines: [{ id: '1', title: '窗口提交预约', desc: '已锁定入管窗口提交日', date: '2026/06/27', remaining: '剩余 3 天', severity: 'warning' }, { id: '2', title: '补件截止日', desc: '当前无补件要求', date: '—', remaining: '未触发', severity: 'primary' }, { id: '3', title: '结果预计日', desc: '提交后约 6 周反馈', date: '2026/08/12', remaining: '预计 49 天', severity: 'primary' }, { id: '4', title: '尾款跟进日', desc: '认定后立即跟进尾款', date: '2026/08/14', remaining: '预计 51 天', severity: 'primary' }],
  tasks: [{ label: '回收客户最终确认', done: true, due: '06/24', assignee: 'AK', color: 'primary', dueColor: 'normal' }, { label: '负责人最终确认', done: true, due: '06/24', assignee: 'TN', color: 'warning', dueColor: 'normal' }, { label: '准备提交包并预约递交', done: false, due: '06/27', assignee: 'AK', color: 'primary', dueColor: 'warning' }],
  logEntries: [{ type: 'review', avatar: 'MG', avatarStyle: 'warning', text: '最终确认通过，可安排提交', category: '审核日志', categoryChip: 'green', objectType: 'Manager', time: '2026/06/24 14:35', dotColor: 'success' }],
});

var BUSINESS_STEP_12 = buildBusinessStepSample({
  id: 'CAS-2026-0237',
  stage: '已提交入管',
  stageCode: 'S7',
  stageMeta: '等待入管回执与审查反馈',
  deadline: '2026/08/12',
  deadlineMeta: '预计认定结果回传日',
  progressPercent: 100,
  progressCount: '13 / 13 资料已收齐',
  docsCounter: '13/13',
  nextAction: '等待入管审查反馈，必要时准备补资料。',
  providerProgress: buildBusinessStepProviderProgress([4, 4], [0, 0], [4, 4], [5, 5]),
  risk: { blockingCount: '0', blockingDetail: '当前卡点：无', arrearsStatus: '欠款状态：着手金已收', arrearsDetail: '尾款将在认定结果通过后收取', deadlineAlert: '已提交待结果', deadlineAlertDetail: '预计结果日 2026/08/12', lastValidation: '最近一次检查：2026/06/27 10:05 · Aki', reviewStatus: '提交完成，等待审查' },
  validation: { lastTime: '最近一次检查：2026/06/27 10:05 · Aki', blocking: [], warnings: [], info: [{ gate: 'C', title: '提交包已锁定', note: '后续重点转为回执与审查反馈跟进。' }] },
  submissionPackages: [{ id: 'SUB-BIZ-001', status: '已提交', locked: true, date: '2026/06/27', summary: '包含 13 份资料 · 提交人：Aki · 东京出入国在留管理局（品川）' }],
  timeline: [{ color: 'success', text: '已向入管递交认定申请', meta: 'Aki · 2026/06/27 09:40' }, { color: 'primary', text: '提交包 SUB-BIZ-001 已锁定', meta: '系统 · 2026/06/27 09:30' }],
  documents: BUSINESS_STEP_10.documents,
  forms: { templates: [{ name: '补正预案清单', meta: '事务所模板 · Checklist', actionLabel: '生成' }], generated: [{ name: 'SUB-BIZ-001_提交包清单.pdf', meta: '2026/06/27 09:30 · 已锁定', tone: 'success', statusLabel: '已提交' }, { name: '入管提交回执扫描件.pdf', meta: '2026/06/27 10:00 · Aki', tone: 'success', statusLabel: '已回执' }] },
  deadlines: [{ id: '1', title: '结果预计日', desc: '提交后等待入管认定结果', date: '2026/08/12', remaining: '剩余 46 天', severity: 'primary' }, { id: '2', title: '补件截止日', desc: '如收到补正通知，再按通知更新', date: '待触发', remaining: '未触发', severity: 'primary' }, { id: '3', title: '尾款跟进日', desc: '认定通过后跟进尾款', date: '2026/08/14', remaining: '剩余 48 天', severity: 'primary' }, { id: '4', title: '客户结果沟通', desc: '结果回传当日同步客户', date: '2026/08/12', remaining: '剩余 46 天', severity: 'primary' }],
  tasks: [{ label: '提交认定申请并上传回执', done: true, due: '06/27', assignee: 'AK', color: 'primary', dueColor: 'normal' }, { label: '建立审查跟进节点', done: false, due: '07/10', assignee: 'AK', color: 'warning', dueColor: 'normal' }, { label: '准备补正预案', done: false, due: '07/03', assignee: 'TN', color: 'primary', dueColor: 'warning' }],
  logEntries: [{ type: 'status', avatar: 'AK', avatarStyle: 'primary', text: '提交包 SUB-BIZ-001 已提交', category: '状态变更', categoryChip: 'blue', objectType: '操作人：Aki', time: '2026/06/27 09:40', dotColor: 'success' }],
});

var BUSINESS_STEP_13 = buildBusinessStepSample({
  id: 'CAS-2026-0238',
  stage: '收到入管反馈',
  stageCode: 'S8',
  stageMeta: '需要补正说明与追加资料',
  statusBadge: 'badge-orange',
  deadline: '2026/07/29',
  deadlineMeta: '入管补正截止日',
  progressPercent: 100,
  progressCount: '13 / 13 资料已收齐',
  docsCounter: '13/13',
  nextAction: '核对补正通知，按项准备补正说明和附件。',
  providerProgress: buildBusinessStepProviderProgress([4, 4], [0, 0], [4, 4], [5, 5]),
  risk: { blockingCount: '1', blockingDetail: '当前卡点：收到补正通知', arrearsStatus: '欠款状态：着手金已收', arrearsDetail: '尾款仍待认定结果通过后收取', deadlineAlert: '补正待处理', deadlineAlertDetail: '补正截止 2026/07/29', lastValidation: '最近一次检查：2026/07/22 15:10 · Aki', reviewStatus: '等待补正材料归齐' },
  validation: { lastTime: '最近一次检查：2026/07/22 15:10 · Aki', blocking: [{ gate: 'A', title: '入管要求补充办公室实际使用说明', fix: '补交补正说明书，并附办公室照片与使用计划', assignee: 'Tanaka', deadline: '2026/07/29', actionTab: 'validation', actionLabel: '看补正包' }], warnings: [], info: [{ gate: 'C', title: '入管已反馈需补资料', note: '后续进入补正处理。' }] },
  correctionPackage: { id: 'COR-BIZ-001', status: '待补正', noticeDate: '2026/07/22', relatedSub: 'SUB-BIZ-001', corrDeadline: '2026/07/29', items: '办公室使用场景说明、办公室照片、来客接待动线补充说明', note: '该补正包关联原 SUB-BIZ-001。' },
  timeline: [{ color: 'warning', text: '收到入管补正通知', meta: 'Aki · 2026/07/22 14:50' }, { color: 'success', text: '已向入管递交认定申请', meta: 'Aki · 2026/06/27 09:40' }],
  documents: BUSINESS_STEP_10.documents,
  forms: { templates: [{ name: '补正说明书', meta: '事务所模板 · Word', actionLabel: '生成' }], generated: [{ name: '入管补正通知_20260722.pdf', meta: '已归档 · 2026/07/22', tone: 'warning', statusLabel: '待处理' }] },
  deadlines: [{ id: '1', title: '补正截止日', desc: '必须在此之前完成补正寄送', date: '2026/07/29', remaining: '剩余 7 天', severity: 'danger' }, { id: '2', title: '客户补件回收', desc: '办公室照片与说明须先到位', date: '2026/07/25', remaining: '剩余 3 天', severity: 'warning' }, { id: '3', title: '补正说明定稿', desc: 'Tanaka 完成补正说明书', date: '2026/07/27', remaining: '剩余 5 天', severity: 'primary' }, { id: '4', title: '结果预计日', desc: '补正后重新等待入管反馈', date: '2026/08/18', remaining: '预计 27 天', severity: 'primary' }],
  tasks: [{ label: '归档补正通知并拆解补正项', done: true, due: '07/22', assignee: 'AK', color: 'primary', dueColor: 'normal' }, { label: '回收办公室照片与动线说明', done: false, due: '07/25', assignee: 'AK', color: 'warning', dueColor: 'danger' }, { label: '起草补正说明书', done: false, due: '07/27', assignee: 'TN', color: 'primary', dueColor: 'warning' }],
  logEntries: [{ type: 'operation', avatar: 'AK', avatarStyle: 'warning', text: '收到入管补正通知：办公室使用说明不足', category: '操作日志', categoryChip: '', objectType: '补正通知', time: '2026/07/22 14:50', dotColor: 'warning' }],
});

var BUSINESS_STEP_14 = buildBusinessStepSample({
  id: 'CAS-2026-0239',
  stage: '补资料处理中',
  stageCode: 'S8',
  stageMeta: '补正材料已回收，等待寄送/再提交',
  deadline: '2026/07/29',
  deadlineMeta: '补正包需在 2 天内寄送',
  progressPercent: 100,
  progressCount: '13 / 13 资料已收齐',
  docsCounter: '13/13',
  nextAction: '完成补正说明定稿并将补正包寄送入管。',
  providerProgress: buildBusinessStepProviderProgress([4, 4], [0, 0], [4, 4], [5, 5]),
  risk: { blockingCount: '0', blockingDetail: '当前卡点：无', arrearsStatus: '欠款状态：着手金已收', arrearsDetail: '尾款仍待认定结果通过后收取', deadlineAlert: '补正处理中', deadlineAlertDetail: '补正包寄送截止 2026/07/29', lastValidation: '最近一次检查：2026/07/27 18:20 · Tanaka', reviewStatus: '待补正寄送' },
  validation: { lastTime: '最近一次检查：2026/07/27 18:20 · Tanaka', blocking: [], warnings: [{ gate: 'B', title: '建议再附一页办公室平面图', note: '增强办公室用途说明的完整性。' }], info: [{ gate: 'C', title: '补正所需资料已回收', note: '正在整理并准备寄送。' }] },
  correctionPackage: { id: 'COR-BIZ-001', status: '补正处理中', noticeDate: '2026/07/22', relatedSub: 'SUB-BIZ-001', corrDeadline: '2026/07/29', items: '办公室照片 6 张、办公室平面图、来客接待说明、补正说明书', note: '补正材料已回收完毕，等待最终确认后寄送。' },
  timeline: [{ color: 'primary', text: '客户已回传办公室照片与说明材料', meta: 'Aki · 2026/07/25 18:20' }, { color: 'success', text: '补正说明书首稿完成', meta: 'Tanaka · 2026/07/27 17:40' }],
  documents: BUSINESS_STEP_10.documents,
  forms: { templates: [{ name: '补正寄送封面', meta: '事务所模板 · PDF', actionLabel: '生成' }], generated: [{ name: '补正说明书_COR-BIZ-001_v1.docx', meta: '2026/07/27 17:40 · Tanaka', tone: 'warning', statusLabel: '待定稿' }] },
  deadlines: [{ id: '1', title: '补正寄送截止', desc: '必须在此之前将补正包寄送入管', date: '2026/07/29', remaining: '剩余 2 天', severity: 'danger' }, { id: '2', title: '补正说明定稿', desc: '确认平面图与说明页是否附齐', date: '2026/07/28', remaining: '剩余 1 天', severity: 'warning' }, { id: '3', title: '再提交回执上传', desc: '寄送后需同步回执', date: '2026/07/30', remaining: '剩余 3 天', severity: 'primary' }, { id: '4', title: '结果预计日', desc: '补正完成后重新等待认定结果', date: '2026/08/18', remaining: '预计 22 天', severity: 'primary' }],
  tasks: [{ label: '回收办公室照片与动线说明', done: true, due: '07/25', assignee: 'AK', color: 'primary', dueColor: 'normal' }, { label: '完成补正说明书定稿', done: false, due: '07/28', assignee: 'TN', color: 'warning', dueColor: 'danger' }, { label: '寄送补正包并上传回执', done: false, due: '07/29', assignee: 'AK', color: 'primary', dueColor: 'danger' }],
  logEntries: [{ type: 'status', avatar: 'SYS', avatarStyle: 'surface', text: '补正包 COR-BIZ-001 状态更新为：补正处理中', category: '状态变更', categoryChip: 'blue', objectType: '补正', time: '2026/07/27 18:00', dotColor: 'primary' }],
});

var BUSINESS_STEP_15 = buildBusinessStepSample({
  id: 'CAS-2026-0240',
  stage: '认定通过待收尾款',
  stageCode: 'S8',
  stageMeta: '可先跟进尾款，再发送 COE',
  statusBadge: 'badge-green',
  deadline: '2026/08/14',
  deadlineMeta: '尾款跟进截止',
  progressPercent: 100,
  progressCount: '13 / 13 资料已收齐',
  docsCounter: '13/13',
  billingMeta: '认定通过 · 尾款待收',
  nextAction: '先回收尾款，完成后进入 COE 发送与海外贴签阶段。',
  providerProgress: buildBusinessStepProviderProgress([4, 4], [0, 0], [4, 4], [5, 5]),
  risk: { blockingCount: '0', blockingDetail: '当前卡点：无', arrearsStatus: '欠款状态：尾款待收 ¥600,000', arrearsDetail: '认定结果已通过，可先跟进收尾款', deadlineAlert: '认定已通过', deadlineAlertDetail: '建议 2026/08/14 前完成尾款与 COE 发送准备', lastValidation: '最近一次检查：2026/08/12 09:30 · 系统', reviewStatus: '待进入下签后流程' },
  validation: { lastTime: '最近一次检查：2026/08/12 09:30 · 系统', blocking: [], warnings: [], info: [{ gate: 'C', title: '认定结果已通过', note: '下一步先收尾款，再进入 COE 发送。' }] },
  timeline: [{ color: 'success', text: '认定结果已通过（APPROVED）', meta: '系统 · 2026/08/12 09:30' }, { color: 'success', text: '补正包已寄送并回执归档', meta: 'Aki · 2026/07/29 16:10' }, { color: 'primary', text: '等待财务跟进尾款', meta: 'Tanaka · 2026/08/12 10:00' }],
  documents: BUSINESS_STEP_10.documents,
  forms: { templates: [{ name: '尾款通知模板', meta: '事务所模板 · Email', actionLabel: '查看' }], generated: [{ name: '认定结果通知截图.png', meta: '2026/08/12 09:30 · 系统回传', tone: 'success', statusLabel: 'APPROVED' }, { name: '尾款通知邮件草稿.eml', meta: '2026/08/12 10:10 · Aki', tone: 'warning', statusLabel: '待发送' }] },
  deadlines: [{ id: '1', title: '尾款跟进', desc: '认定通过后优先完成尾款回收', date: '2026/08/14', remaining: '剩余 2 天', severity: 'warning' }, { id: '2', title: 'COE 发送准备', desc: '尾款完成后即可发送 COE', date: '2026/08/15', remaining: '剩余 3 天', severity: 'primary' }, { id: '3', title: '海外贴签预约', desc: '客户收到 COE 后安排', date: '2026/08/20', remaining: '剩余 8 天', severity: 'primary' }, { id: '4', title: '结果归档', desc: '尾款与 COE 完成后进入下签后流程', date: '2026/08/15', remaining: '剩余 3 天', severity: 'primary' }],
  tasks: [{ label: '补正包寄送并回执归档', done: true, due: '07/29', assignee: 'AK', color: 'primary', dueColor: 'normal' }, { label: '发送尾款通知', done: false, due: '08/12', assignee: 'AK', color: 'warning', dueColor: 'warning' }, { label: '尾款到账后准备发送 COE', done: false, due: '08/15', assignee: 'TN', color: 'primary', dueColor: 'warning' }],
  logEntries: [{ type: 'status', avatar: 'SYS', avatarStyle: 'surface', text: '认定结果回传：APPROVED', category: '状态变更', categoryChip: 'green', objectType: '结果', time: '2026/08/12 09:30', dotColor: 'success' }],
});

var DETAIL_SAMPLES = {

  /* ====== D.1  普通工作签案件（技人国 更新） ====== */
  work: {
    id: 'CAS-2026-0142',
    title: '就労ビザ更新（技術・人文知識・国際業務）',
    client: '株式会社BlueWave',
    owner: 'Suzuki',
    agency: '东京入国管理局（品川）',
    stage: '待提交',
    stageCode: 'S6',
    stageMeta: '已停留 2 天',
    statusBadge: 'badge-orange',
    deadline: '2026/04/28',
    deadlineMeta: '距今还有 21 天',
    deadlineDanger: true,
    progressPercent: 50,
    progressCount: '8/16 项已收集',
    billingAmount: '¥480,000',
    billingMeta: '应收 · 着手金已收',
    billingStatusKey: 'partial',
    docsCounter: '8/16',
    readonly: false,

    caseType: '就労ビザ（技術・人文知識・国際業務）',
    applicationType: '更新（在留期間更新）',
    acceptedDate: '2026-04-01',
    targetDate: '2026-04-20',

    providerProgress: [
      { label: '主申请人',       done: 3, total: 5 },
      { label: '扶養者/保証人',  done: 2, total: 3 },
      { label: '雇主/所属機構',  done: 2, total: 5 },
      { label: '事務所内部',     done: 1, total: 3 },
    ],

    risk: {
      blockingCount: '当前卡点：2 项',
      blockingDetail: '还有资料缺口，处理完后才能提交',
      arrearsStatus: '收费情况：应收',
      arrearsDetail: '着手金已收，尾款待收',
      deadlineAlert: '时限提醒：在留到期 ≤21天',
      deadlineAlertDetail: '2026/04/28 到期',
      lastValidation: '最近一次检查：2026/04/06 15:30',
      reviewStatus: '复核进度：待复核',
    },

    nextAction: '先补齐雇主侧 2 项资料（在職証明書、2025 年源泉徴収票），再重新检查。',
    validationHint: '当前有 2 项必须先处理的问题，建议先在提交前检查里确认缺件，再安排补件。',
    overviewActions: {
      primary: { label: '查看提交前检查', tab: 'validation' },
      secondary: { label: '去资料清单补件', tab: 'documents' },
    },

    timeline: [
      { color: 'primary', text: '收到客户上传：护照复印件',                          meta: 'Suzuki · 今天 14:30' },
      { color: 'warning', text: '发送催办：纳税証明書',                              meta: '系统自动 · 昨天 09:00' },
      { color: 'success', text: '案件阶段推进：资料收集中 → 提交前检查',             meta: 'Suzuki · 2026/04/05' },
      { color: 'border',  text: '案件创建',                                           meta: 'Suzuki · 2026/04/01' },
    ],

    team: [
      { initials: 'SZ', name: 'Suzuki', role: '负责人',           subtitle: '资深行政书士',       gradient: 'from-[var(--primary)] to-[var(--primary-hover)]' },
      { initials: 'TN', name: 'Tanaka', role: null,               subtitle: '材料初审（助理）',   gradient: 'from-[var(--success)] to-[#28a745]' },
    ],

    relatedParties: [
      { initials: 'KS', name: '金 秀明',           role: '主申请人',         detail: '韩国籍 · 1990/03/15 · 在留カード 1234-5678-9012', avatarStyle: 'gradient' },
      { initials: 'BW', name: '株式会社BlueWave',  role: '雇主（所属機構）', detail: '法人番号 1234567890123 · 東京都渋谷区',             avatarStyle: 'surface' },
    ],

    deadlines: [
      { id: 1, title: '在留期限到期日（最终提交底线）', desc: '必须在此之前向入管局提交申请', date: '2026/04/28', remaining: '剩余 21 天', severity: 'danger'  },
      { id: 2, title: '补件截止日',                     desc: '入管局要求补充材料的截止期',   date: '—',          remaining: '暂无',       severity: 'muted'   },
      { id: 3, title: '提交预约日',                     desc: '向入管局预约的窗口提交日期',   date: '2026/04/22', remaining: '剩余 13 天', severity: 'warning' },
      { id: 4, title: '结果预计日',                     desc: '入管局审查结果预计出示日',     date: '2026/06/15', remaining: '约 67 天后', severity: 'primary' },
    ],

    billing: {
      total: '¥480,000',
      received: '¥240,000',
      outstanding: '¥240,000',
      payments: [
        { date: '2026/04/01', type: '着手金',           amount: '¥240,000', status: 'paid',   statusLabel: '已结清' },
        { date: '2026/06/30', type: '成功酬金（尾款）', amount: '¥240,000', status: 'unpaid',  statusLabel: '待收' },
      ],
    },

    validation: {
      lastTime: '最近一次检查：2026/04/06 15:30 · Suzuki',
      blocking: [
        { gate: 'A', title: '在職証明書未提供',   fix: '联系雇主 HR 部门获取最新在職証明書',                       assignee: 'Suzuki', deadline: '2026/04/15', actionLabel: '去资料区补件', actionTab: 'documents' },
        { gate: 'A', title: '源泉徴収票年份不符', fix: '退回项需要 2025 年度源泉徴収票，当前为 2024 年度',         assignee: 'Tanaka', deadline: '2026/04/12', actionLabel: '去资料区补件', actionTab: 'documents' },
      ],
      warnings: [
        { gate: 'B', title: '纳税証明書逾期未提供', note: '非必交项但强烈建议提供以增强申请竞争力' },
      ],
      info: [
        { gate: 'C', title: '申請理由書尚未完成', note: '不阻断提交，但建议在提交前完善' },
      ],
      retriggerNote: '重新检查触发条件：当任意必交资料项状态变更、或手动点击「重新检查」按钮时自动执行。',
    },

    submissionPackages: [
      { id: 'SUB-001', status: '已提交', locked: true, date: '2026/04/06', summary: '包含 12 份资料 · 校验通过 · 提交人：Suzuki' },
    ],

    correctionPackage: {
      id: 'COR-001',
      status: '补正处理中',
      noticeDate: '2026/04/01',
      relatedSub: 'SUB-001',
      corrDeadline: '2026/04/15',
      items: '源泉徴収票年份不符（需 2025 年度）',
      note: '补正包提交后将自动关联到原 SUB-001，且不会覆盖已锁定的原始提交包。',
    },

    doubleReview: [
      { initials: 'TN', name: 'Tanaka',  verdict: '通过', verdictBadge: 'badge-green', time: '2026/04/06 16:00', comment: '材料齐备，建议提交', rejectReason: null },
      { initials: 'MG', name: 'Manager', verdict: '驳回', verdictBadge: 'badge-red',   time: '2026/04/06 17:30', comment: null,               rejectReason: '源泉徴収票年份有误，需确认后重新提交' },
    ],

    riskConfirmationRecord: null,

    documents: [
      { group: '主申请人提供', count: '3/5', items: [
        { name: '护照复印件', meta: 'passport_copy.pdf · v2 · 催办：—', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '在留カード（表裏）', meta: 'residence_card.pdf · v1 · 催办：—', status: 'approved', statusLabel: '通过' },
        { name: '履歴書', meta: '未上传 · 催办：2026/04/05', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
        { name: '纳税証明書', meta: '逾期未提供 · 催办：2026/04/03 · 截止已过', status: 'expired', statusLabel: '过期' },
        { name: '証件照（4×3cm）', meta: 'photo_4x3.jpg · v1 · 催办：—', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
      ]},
      { group: '扶養者/保証人提供', count: '2/3', items: [
        { name: '身元保証書', meta: 'guarantor_form.pdf · v1 · 催办：—', status: 'approved', statusLabel: '通过' },
        { name: '住民票', meta: 'resident_cert.pdf · v1 · 催办：—', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '課税証明書（保証人）', meta: '无需提供 · 原因：保証人为配偶，免除 · Suzuki · 2026/04/03', status: 'waived', statusLabel: '无需提供' },
      ]},
      { group: '雇主/所属機構提供', count: '2/5', items: [
        { name: '法人登記簿謄本', meta: 'corp_registry.pdf · v1 · 催办：—', status: 'approved', statusLabel: '通过' },
        { name: '決算書（直近 2 期）', meta: 'financial_stmt.pdf · v2 · 催办：2026/04/01', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '在職証明書', meta: '未上传 · 催办：2026/04/05', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
        { name: '雇用契約書', meta: '未上传 · 催办：2026/04/05', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
        { name: '源泉徴収票', meta: 'withheld_tax.pdf · v1 退回 · 审核意见：年份不符，需提交 2025 年度', status: 'revision_required', statusLabel: '退回补正' },
      ]},
      { group: '事務所内部準備', count: '1/3', items: [
        { name: '委任状', meta: 'poa.pdf · v1 · 催办：—', status: 'approved', statusLabel: '通过' },
        { name: '申請理由書', meta: '起草中 · 催办：—', status: 'waiting_upload', statusLabel: '待提交' },
        { name: '質問書', meta: '未開始 · 催办：—', status: 'not_sent', statusLabel: '未発出' },
      ]},
    ],

    tasks: [
      { label: '发送资料收集清单给客户', done: true, due: '04/01', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
      { label: '初审护照复印件与在留卡', done: true, due: '04/05', assignee: 'TN', color: 'success', dueColor: 'muted' },
      { label: '起草申请理由书', done: false, due: '04/20', assignee: 'TN', color: 'success', dueColor: 'danger' },
      { label: '催办雇主材料（在職証明書 + 雇用契約書）', done: false, due: '04/12', assignee: 'SZ', color: 'primary', dueColor: 'warning' },
      { label: '执行提交前检查', done: false, due: '04/22', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
    ],

    logEntries: [
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '更新了文件 <b class="text-[var(--primary)]">决算書2023.pdf</b> 的状态为：已提交待审核', category: '操作日志', categoryChip: '',      objectType: '资料项', time: '今天 10:45',       dotColor: 'primary' },
      { type: 'review',    avatar: 'TN',  avatarStyle: 'success', text: '审核通过了文件 <b>法人登記簿謄本</b>',                                                  category: '审核日志', categoryChip: 'green', objectType: '操作人：Tanaka · 结论：通过', time: '今天 09:20',       dotColor: 'success' },
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '案件阶段变更：<b>资料收集中 → 提交前检查</b>',                                          category: '状态变更', categoryChip: 'blue',  objectType: '操作人：Suzuki', time: '2026/04/05 16:00', dotColor: 'warning' },
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '触发自动提醒规则：发送纳税証明書催办邮件给客户',                                          category: '操作日志', categoryChip: '',      objectType: '沟通', time: '2026/04/05 09:00', dotColor: 'border' },
      { type: 'review',    avatar: 'MG',  avatarStyle: 'danger',  text: '复核驳回提交包 SUB-001：<b class="text-[var(--danger)]">源泉徴収票年份有误</b>',          category: '审核日志', categoryChip: 'red',   objectType: '操作人：Manager · 结论：驳回', time: '2026/04/06 17:30', dotColor: 'danger' },
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '案件创建：<b>刚开始办案</b>',                                                             category: '状态变更', categoryChip: 'blue',  objectType: '操作人：Suzuki', time: '2026/04/01 10:00', dotColor: 'border' },
    ],
  },

  /* ====== D.2  家族签案件（认定 · COE 海外） ====== */
  family: {
    id: 'CAS-2026-0156',
    title: '家族滞在（认定）- 陈 麗華',
    client: '陈 麗華',
    owner: 'Tanaka',
    agency: '东京入国管理局（品川）',
    stage: '资料收集',
    stageCode: 'S2',
    stageMeta: '已停留 5 天',
    statusBadge: 'badge-green',
    deadline: '2026/05/15',
    deadlineMeta: '距今还有 38 天',
    deadlineDanger: false,
    progressPercent: 30,
    progressCount: '6/20 项已收集',
    billingAmount: '¥200,000',
    billingMeta: '应收 · 未回款',
    billingStatusKey: 'unpaid',
    docsCounter: '6/20',
    readonly: false,

    caseType: '家族滞在',
    applicationType: '认定（在留資格認定）',
    acceptedDate: '2026-04-03',
    targetDate: '2026-05-10',

    providerProgress: [
      { label: '主申请人',       done: 2, total: 5 },
      { label: '扶養者/保証人',  done: 3, total: 8 },
      { label: '雇主/所属機構',  done: 0, total: 0 },
      { label: '事務所内部',     done: 1, total: 7 },
    ],

    risk: {
      blockingCount: '当前卡点：无',
      blockingDetail: '暂无阻断',
      arrearsStatus: '收费情况：应收',
      arrearsDetail: '着手金尚未到账',
      deadlineAlert: '时限提醒：无紧急',
      deadlineAlertDetail: '距最近截止还有 38 天',
      lastValidation: '最近一次检查：尚未执行',
      reviewStatus: '复核进度：—',
    },

    nextAction: '先催回亲属关系证明，再检查扶養者材料是否齐全。',
    validationHint: '当前仍在资料收集阶段，可先看资料清单并安排催办任务。',
    overviewActions: {
      primary: { label: '查看资料清单', tab: 'documents' },
      secondary: { label: '去任务区跟进', tab: 'tasks' },
    },

    timeline: [
      { color: 'primary', text: '扶養者提交了在留卡影像',                   meta: 'Tanaka · 今天 10:15' },
      { color: 'warning', text: '催办：亲属关系证明',                        meta: '系统自动 · 昨天 09:00' },
      { color: 'border',  text: '案件创建（家族批量开始办案）',              meta: 'Tanaka · 2026/04/03' },
    ],

    team: [
      { initials: 'TN', name: 'Tanaka', role: '负责人',  subtitle: '中级行政书士',   gradient: 'from-[var(--success)] to-[#28a745]' },
      { initials: 'SZ', name: 'Suzuki', role: null,       subtitle: '案件协作',       gradient: 'from-[var(--primary)] to-[var(--primary-hover)]' },
    ],

    relatedParties: [
      { initials: 'CL', name: '陈 麗華',  role: '主申请人',    detail: '中国籍 · 1992/08/20',                         avatarStyle: 'gradient' },
      { initials: 'CM', name: '陈美',      role: '扶養者',      detail: '永住者 · 在留カード 9876-5432-1098',          avatarStyle: 'surface' },
      { initials: 'CG', name: '陈建国',    role: '保証人',      detail: '090-2222-8888 · chen.guardian@email.com',     avatarStyle: 'surface' },
    ],

    deadlines: [
      { id: 1, title: '在留期限到期日', desc: '认定案件无在留期限',               date: '—',          remaining: '不适用',     severity: 'muted'   },
      { id: 2, title: '补件截止日',     desc: '入管局要求补充材料的截止期',       date: '—',          remaining: '暂无',       severity: 'muted'   },
      { id: 3, title: '提交预约日',     desc: '向入管局预约的窗口提交日期',       date: '2026/05/10', remaining: '剩余 31 天', severity: 'primary' },
      { id: 4, title: '结果预计日',     desc: '入管局审查结果预计出示日',         date: '2026/07/15', remaining: '约 97 天后', severity: 'primary' },
    ],

    billing: {
      total: '¥200,000',
      received: '¥0',
      outstanding: '¥200,000',
      payments: [
        { date: '2026/04/15', type: '着手金',           amount: '¥100,000', status: 'unpaid', statusLabel: '待收' },
        { date: '2026/08/01', type: '成功酬金（尾款）', amount: '¥100,000', status: 'unpaid', statusLabel: '待收' },
      ],
    },

    validation: {
      lastTime: '尚未执行校验',
      blocking: [],
      warnings: [],
      info: [],
      retriggerNote: '进入校验阶段后自动触发。',
    },

    submissionPackages: [],
    correctionPackage: null,
    doubleReview: [],
    riskConfirmationRecord: null,

    documents: [
      { group: '主申请人提供', count: '2/5', items: [
        { name: '护照复印件', meta: '未上传 · 催办：—', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
        { name: '在留資格認定証明書（如有）', meta: '未上传', status: 'not_sent', statusLabel: '未発出' },
        { name: '証件照（4×3cm）', meta: 'photo.jpg · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '履歴書', meta: '未上传', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
        { name: '出生证明（翻译件）', meta: '未上传', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
      ]},
      { group: '扶養者/保証人提供', count: '3/8', items: [
        { name: '在留卡（表裏）', meta: 'zairyu_card.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '住民票', meta: 'resident_cert.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '纳税証明書', meta: '未上传 · 催办：2026/04/05', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
        { name: '課税証明書', meta: '未上传', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
        { name: '身元保証書', meta: '未上传', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
        { name: '親族関係公証書', meta: '未上传 · 催办中', status: 'waiting_upload', statusLabel: '待提交' },
        { name: '収入証明', meta: '未上传', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
        { name: '戸籍謄本', meta: 'koseki.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
      ]},
      { group: '事務所内部準備', count: '1/7', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '申請理由書', meta: '未開始', status: 'not_sent', statusLabel: '未発出' },
        { name: '質問書', meta: '未開始', status: 'not_sent', statusLabel: '未発出' },
        { name: '身分関係図', meta: '未開始', status: 'not_sent', statusLabel: '未発出' },
        { name: '送金記録', meta: '未開始', status: 'not_sent', statusLabel: '未発出' },
        { name: '写真一覧', meta: '未開始', status: 'not_sent', statusLabel: '未発出' },
        { name: '翻訳証明', meta: '未開始', status: 'not_sent', statusLabel: '未発出' },
      ]},
    ],

    tasks: [
      { label: '催办亲属关系证明', done: false, due: '04/15', assignee: 'TN', color: 'success', dueColor: 'warning' },
      { label: '扶養者 纳税证明収集', done: false, due: '04/20', assignee: 'TN', color: 'success', dueColor: 'muted' },
      { label: '准备申请理由书', done: false, due: '05/01', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
    ],

    logEntries: [
      { type: 'operation', avatar: 'TN',  avatarStyle: 'success', text: '收到扶養者上传：在留卡表裏',           category: '操作日志', categoryChip: '',     objectType: '资料项', time: '今天 10:15',       dotColor: 'primary' },
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '触发催办：亲属关系证明',                category: '操作日志', categoryChip: '',     objectType: '沟通',   time: '昨天 09:00',       dotColor: 'warning' },
      { type: 'status',    avatar: 'TN',  avatarStyle: 'success', text: '案件创建（家族批量开始办案）：<b>刚开始办案 → 资料收集中</b>', category: '状态变更', categoryChip: 'blue', objectType: '操作人：Tanaka', time: '2026/04/03 14:00', dotColor: 'success' },
    ],
  },

  /* ====== D.3  Gate 失败态 ====== */
  'gate-fail': {
    id: 'CAS-2026-0117',
    title: '特定技能（认定）- Global Tech KK',
    client: 'Global Tech KK',
    owner: 'Tom',
    agency: '大阪入国管理局',
    stage: '提交前检查未通过',
    stageCode: 'S5',
    stageMeta: '有 2 项必须先处理的问题',
    statusBadge: 'badge-red',
    deadline: '2026/04/20',
    deadlineMeta: '距今还有 11 天',
    deadlineDanger: true,
    progressPercent: 75,
    progressCount: '12/16 项已收集',
    billingAmount: '¥350,000',
    billingMeta: '应收 · 着手金已收',
    billingStatusKey: 'partial',
    docsCounter: '12/16',
    readonly: false,

    caseType: '特定技能',
    applicationType: '认定（在留資格認定）',
    acceptedDate: '2026-03-20',
    targetDate: '2026-04-18',

    providerProgress: [
      { label: '主申请人',       done: 4, total: 5 },
      { label: '扶養者/保証人',  done: 0, total: 0 },
      { label: '雇主/所属機構',  done: 5, total: 7 },
      { label: '事務所内部',     done: 3, total: 4 },
    ],

    risk: {
      blockingCount: '当前卡点：2 项',
      blockingDetail: '还有 2 项必须问题，处理完后才能复核或提交',
      arrearsStatus: '收费情况：应收',
      arrearsDetail: '着手金已收，尾款待收',
      deadlineAlert: '时限提醒：在留到期 ≤11天',
      deadlineAlertDetail: '2026/04/20 到期，极紧急',
      lastValidation: '最近一次检查：2026/04/08 11:00',
      reviewStatus: '复核进度：暂不能复核',
    },

    nextAction: '先补齐 2 项关键资料，再安排重新检查。',
    validationHint: '当前还有 2 项必须问题，事务所暂时还不能进入复核或提交。',
    overviewActions: {
      primary: { label: '查看提交前检查', tab: 'validation' },
      secondary: { label: '去任务区跟进', tab: 'tasks' },
    },

    timeline: [
      { color: 'danger',  text: '提交前检查未通过：2 项必须先处理',           meta: '系统 · 2026/04/08 11:00' },
      { color: 'warning', text: '催办：雇用条件書',                           meta: '系统自动 · 2026/04/07' },
      { color: 'success', text: '阶段推进：资料收集中 → 提交前检查',           meta: 'Tom · 2026/04/06' },
      { color: 'border',  text: '案件创建',                                   meta: 'Tom · 2026/03/20' },
    ],

    team: [
      { initials: 'TM', name: 'Tom',    role: '负责人',  subtitle: '行政书士',     gradient: 'from-[var(--warning)] to-[#e68a00]' },
      { initials: 'LI', name: 'Li',     role: null,       subtitle: '翻译协作',     gradient: 'from-[var(--primary)] to-[var(--primary-hover)]' },
    ],

    relatedParties: [
      { initials: 'NV', name: 'Nguyen Van',        role: '主申请人',         detail: '越南籍 · 1995/06/10',                      avatarStyle: 'gradient' },
      { initials: 'GT', name: 'Global Tech KK',    role: '雇主（所属機構）', detail: '法人番号 9876543210123 · 大阪市中央区',     avatarStyle: 'surface' },
    ],

    deadlines: [
      { id: 1, title: '在留期限到期日', desc: '必须在此之前提交',             date: '2026/04/20', remaining: '剩余 11 天', severity: 'danger'  },
      { id: 2, title: '补件截止日',     desc: '入管局要求补充材料的截止期',   date: '—',          remaining: '暂无',       severity: 'muted'   },
      { id: 3, title: '提交预约日',     desc: '向入管局预约的窗口提交日期',   date: '2026/04/18', remaining: '剩余 9 天',  severity: 'danger'  },
      { id: 4, title: '结果预计日',     desc: '入管局审查结果预计出示日',     date: '2026/06/30', remaining: '约 82 天后', severity: 'primary' },
    ],

    billing: {
      total: '¥350,000',
      received: '¥175,000',
      outstanding: '¥175,000',
      payments: [
        { date: '2026/03/25', type: '着手金',           amount: '¥175,000', status: 'paid',   statusLabel: '已结清' },
        { date: '2026/07/01', type: '成功酬金（尾款）', amount: '¥175,000', status: 'unpaid',  statusLabel: '待收' },
      ],
    },

    validation: {
      lastTime: '最近一次检查：2026/04/08 11:00 · Tom',
      blocking: [
        { gate: 'A', title: '雇用条件書缺失',       fix: '向雇主 HR 索取雇用条件書原件',                           assignee: 'Tom',    deadline: '2026/04/12', actionLabel: '去资料区补件', actionTab: 'documents' },
        { gate: 'A', title: '技能検定合格証明未上传', fix: '确认申请人是否已通过技能検定并获取合格証明',             assignee: 'Li',     deadline: '2026/04/14', actionLabel: '去任务区跟进', actionTab: 'tasks' },
      ],
      warnings: [
        { gate: 'B', title: '決算書仅 1 期', note: '建议提供直近 2 期決算書以增强材料说服力' },
      ],
      info: [
        { gate: 'C', title: '質問書可后补', note: '質問書非认定必交项，可提交后补充' },
      ],
      retriggerNote: '处理完当前卡点后可手动重新检查。',
    },

    submissionPackages: [],
    correctionPackage: null,
    doubleReview: [],
    riskConfirmationRecord: null,

    documents: [
      { group: '主申请人提供', count: '4/5', items: [
        { name: '护照复印件', meta: 'passport.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '在留カード', meta: 'zairyu.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '証件照', meta: 'photo.jpg · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '履歴書', meta: 'cv.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '技能検定合格証明', meta: '未上传 · 当前必须先补齐', status: 'waiting_upload', statusLabel: '待提交' },
      ]},
      { group: '雇主/所属機構提供', count: '5/7', items: [
        { name: '法人登記簿謄本', meta: 'corp_registry.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '決算書', meta: 'financial.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '特定技能雇用契約書', meta: 'contract.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '支援計画書', meta: 'support_plan.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '賃金台帳', meta: 'payroll.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '雇用条件書', meta: '未上传 · 当前必须先补齐', status: 'waiting_upload', statusLabel: '待提交' },
        { name: '質問書', meta: '未上传', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
      ]},
      { group: '事務所内部準備', count: '3/4', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '申請理由書', meta: 'reason.docx · v1', status: 'approved', statusLabel: '通过' },
        { name: '翻訳証明', meta: 'translation.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '送出機関証明', meta: '未上传', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
      ]},
    ],

    tasks: [
      { label: '向雇主 HR 索取雇用条件書原件', done: false, due: '04/12', assignee: 'TM', color: 'warning', dueColor: 'danger' },
      { label: '确认技能検定合格証明', done: false, due: '04/14', assignee: 'LI', color: 'primary', dueColor: 'danger' },
      { label: '处理完当前卡点后重新检查', done: false, due: '04/16', assignee: 'TM', color: 'warning', dueColor: 'danger' },
    ],

    logEntries: [
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '提交前检查未通过：<b class="text-[var(--danger)]">2 项必须先处理</b>', category: '操作日志', categoryChip: '',     objectType: '检查', time: '2026/04/08 11:00', dotColor: 'danger' },
      { type: 'status',    avatar: 'TM',  avatarStyle: 'warning', text: '阶段推进：<b>资料收集中 → 提交前检查</b>',                           category: '状态变更', categoryChip: 'blue', objectType: '操作人：Tom', time: '2026/04/06 14:00', dotColor: 'warning' },
      { type: 'status',    avatar: 'TM',  avatarStyle: 'warning', text: '案件创建：<b>刚开始办案</b>',                                         category: '状态变更', categoryChip: 'blue', objectType: '操作人：Tom', time: '2026/03/20 10:00', dotColor: 'border' },
    ],
  },

  /* ====== D.4  欠款继续提交 ====== */
  arrears: {
    id: 'CAS-2026-0099',
    title: '高度人才（更新）- 田中建设株式会社',
    client: '田中建设株式会社',
    owner: 'Rina',
    agency: '东京入国管理局（品川）',
    stage: '待提交（待确认收费风险）',
    stageCode: 'S6',
    stageMeta: '欠款 ¥120,000 · 需确认后提交',
    statusBadge: 'badge-red',
    deadline: '2026/04/18',
    deadlineMeta: '距今还有 9 天',
    deadlineDanger: true,
    progressPercent: 94,
    progressCount: '15/16 项已收集',
    billingAmount: '¥600,000',
    billingMeta: '欠款 ¥120,000 · 影响提交',
    billingStatusKey: 'arrears',
    docsCounter: '15/16',
    readonly: false,

    caseType: '経営・管理',
    applicationType: '更新（在留期間更新）',
    acceptedDate: '2026-03-10',
    targetDate: '2026-04-15',

    providerProgress: [
      { label: '主申请人',       done: 5, total: 5 },
      { label: '扶養者/保証人',  done: 0, total: 0 },
      { label: '雇主/所属機構',  done: 7, total: 8 },
      { label: '事務所内部',     done: 3, total: 3 },
    ],

    risk: {
      blockingCount: '当前卡点：无',
      blockingDetail: '校验通过',
      arrearsStatus: '收费情况：欠款 ¥120,000',
      arrearsDetail: '需经风险确认后方可提交',
      deadlineAlert: '时限提醒：在留到期 ≤9天',
      deadlineAlertDetail: '2026/04/18 到期，紧急',
      lastValidation: '最近一次检查：2026/04/07 16:00',
      reviewStatus: '复核进度：通过（含收费风险确认）',
    },

    nextAction: '欠款风险确认完成后，再决定是否现在生成提交包。',
    validationHint: '资料已通过检查，但因存在欠款，需先完成风险确认。',
    overviewActions: {
      primary: { label: '去做欠款风险确认', tab: 'validation' },
      secondary: { label: '查看收费情况', tab: 'billing' },
    },

    timeline: [
      { color: 'danger',  text: '欠款提醒：尾款 ¥120,000 逾期',                    meta: '系统 · 今天 08:00' },
      { color: 'success', text: '提交前检查通过（当前无卡点）',                       meta: '系统 · 2026/04/07 16:00' },
      { color: 'primary', text: '复核通过',                                          meta: 'Manager · 2026/04/07 17:30' },
      { color: 'border',  text: '案件创建',                                          meta: 'Rina · 2026/03/10' },
    ],

    team: [
      { initials: 'RN', name: 'Rina',    role: '负责人',  subtitle: '资深行政书士',     gradient: 'from-[#ec4899] to-[#db2777]' },
      { initials: 'MG', name: 'Manager', role: null,       subtitle: '复核 + 风险确认', gradient: 'from-[var(--warning)] to-[#e68a00]' },
    ],

    relatedParties: [
      { initials: 'TK', name: '田中 太郎',          role: '主申请人',         detail: '日本籍 · 1975/01/20 · 代表取締役',              avatarStyle: 'gradient' },
      { initials: 'TN', name: '田中建设株式会社',   role: '所属企業',         detail: '法人番号 3210987654321 · 東京都新宿区',          avatarStyle: 'surface' },
    ],

    deadlines: [
      { id: 1, title: '在留期限到期日', desc: '必须在此之前提交',             date: '2026/04/18', remaining: '剩余 9 天',  severity: 'danger'  },
      { id: 2, title: '补件截止日',     desc: '入管局要求补充材料的截止期',   date: '—',          remaining: '暂无',       severity: 'muted'   },
      { id: 3, title: '提交预约日',     desc: '向入管局预约的窗口提交日期',   date: '2026/04/15', remaining: '剩余 6 天',  severity: 'danger'  },
      { id: 4, title: '结果预计日',     desc: '入管局审查结果预计出示日',     date: '2026/06/20', remaining: '约 72 天后', severity: 'primary' },
    ],

    billing: {
      total: '¥600,000',
      received: '¥480,000',
      outstanding: '¥120,000',
      payments: [
        { date: '2026/03/15', type: '着手金',     amount: '¥300,000', status: 'paid',    statusLabel: '已结清' },
        { date: '2026/04/01', type: '中间金',     amount: '¥180,000', status: 'paid',    statusLabel: '已结清' },
        { date: '2026/04/10', type: '尾款',       amount: '¥120,000', status: 'arrears', statusLabel: '欠款' },
      ],
    },

    validation: {
      lastTime: '最近一次检查：2026/04/07 16:00 · Rina',
      blocking: [],
      warnings: [
        { gate: 'B', title: '存在未结清费用 ¥120,000', note: '提交前需完成欠款风险确认' },
      ],
      info: [],
      retriggerNote: '提交前检查已通过；收费风险不拦截检查结果，但需先完成确认。',
    },

    submissionPackages: [],
    correctionPackage: null,

    doubleReview: [
      { initials: 'MG', name: 'Manager', verdict: '通过', verdictBadge: 'badge-green', time: '2026/04/07 17:30', comment: '材料齐备，但需先完成欠款确认', rejectReason: null },
    ],

    riskConfirmationRecord: {
      confirmedBy: 'Manager',
      reason: '客户承诺本周内付清尾款，因期限紧迫优先提交',
      evidence: '客户付款承诺书.pdf',
      time: '2026/04/08 09:00',
      amount: '¥120,000',
    },

    documents: [
      { group: '主申请人提供', count: '5/5', items: [
        { name: '护照复印件', meta: 'passport.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '在留カード', meta: 'zairyu.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '証件照', meta: 'photo.jpg · v1', status: 'approved', statusLabel: '通过' },
        { name: '履歴書', meta: 'cv.pdf · v2', status: 'approved', statusLabel: '通过' },
        { name: '卒業証明書', meta: 'degree.pdf · v1', status: 'approved', statusLabel: '通过' },
      ]},
      { group: '雇主/所属機構提供', count: '7/8', items: [
        { name: '法人登記簿謄本', meta: 'corp_registry.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '決算書（直近 3 期）', meta: 'financial.pdf · v3', status: 'approved', statusLabel: '通过' },
        { name: '事業計画書', meta: 'bizplan.pdf · v2', status: 'approved', statusLabel: '通过' },
        { name: '役員名簿', meta: 'directors.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '会社案内', meta: 'company_intro.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '納税証明書', meta: 'tax_cert.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '雇用保険関連', meta: 'insurance.pdf · v1', status: 'uploaded_reviewing', statusLabel: '已提交待审核' },
        { name: '源泉徴収票', meta: '未上传 · 催办中', status: 'waiting_upload', statusLabel: '待提交', canWaive: true },
      ]},
      { group: '事務所内部準備', count: '3/3', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '申請理由書', meta: 'reason.docx · v2', status: 'approved', statusLabel: '通过' },
        { name: '質問書', meta: 'questionnaire.pdf · v1', status: 'approved', statusLabel: '通过' },
      ]},
    ],

    tasks: [
      { label: '催收尾款 ¥120,000', done: false, due: '04/10', assignee: 'RN', color: 'primary', dueColor: 'danger' },
      { label: '完成欠款风险确认', done: true, due: '04/08', assignee: 'MG', color: 'warning', dueColor: 'muted' },
      { label: '生成提交包', done: false, due: '04/12', assignee: 'RN', color: 'primary', dueColor: 'warning' },
    ],

    logEntries: [
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '欠款提醒：尾款 <b class="text-[var(--danger)]">¥120,000</b> 逾期',   category: '操作日志', categoryChip: '',     objectType: '收费', time: '今天 08:00',       dotColor: 'danger' },
      { type: 'review',    avatar: 'MG',  avatarStyle: 'warning', text: '风险确认通过：欠款继续提交',                                           category: '审核日志', categoryChip: 'green', objectType: '操作人：Manager', time: '2026/04/08 09:00', dotColor: 'success' },
      { type: 'review',    avatar: 'MG',  avatarStyle: 'warning', text: '复核通过',                                                             category: '审核日志', categoryChip: 'green', objectType: '操作人：Manager · 结论：通过', time: '2026/04/07 17:30', dotColor: 'success' },
      { type: 'status',    avatar: 'RN',  avatarStyle: 'primary', text: '案件创建：<b>刚开始办案</b>',                                           category: '状态变更', categoryChip: 'blue',  objectType: '操作人：Rina', time: '2026/03/10 11:00', dotColor: 'border' },
    ],
  },

  /* ====== D.5  补正处理中 ====== */
  correction: {
    id: 'CAS-2026-0132',
    title: '家族滞在（更新）- Chen Li（配偶）',
    client: 'Chen Li',
    owner: 'Aki',
    agency: '东京入国管理局（品川）',
    stage: '补正处理中',
    stageCode: 'S7',
    stageMeta: '补正通知 2026/04/01 · 截止 04/15',
    statusBadge: 'badge-orange',
    deadline: '2026/04/15',
    deadlineMeta: '补正截止还有 6 天',
    deadlineDanger: true,
    progressPercent: 88,
    progressCount: '14/16 项已收集（补正中 2 项）',
    billingAmount: '¥250,000',
    billingMeta: '已收 · 补正无额外费用',
    billingStatusKey: 'paid',
    docsCounter: '14/16',
    readonly: false,

    caseType: '家族滞在',
    applicationType: '更新（在留期間更新）',
    acceptedDate: '2026-02-15',
    targetDate: '2026-03-25',

    providerProgress: [
      { label: '主申请人',       done: 5, total: 5 },
      { label: '扶養者/保証人',  done: 5, total: 6 },
      { label: '雇主/所属機構',  done: 0, total: 0 },
      { label: '事務所内部',     done: 4, total: 5 },
    ],

    risk: {
      blockingCount: '当前卡点：无（等待补正提交）',
      blockingDetail: '原提交包已通过校验；补正项单独处理',
      arrearsStatus: '收费情况：已结清',
      arrearsDetail: '全额已收',
      deadlineAlert: '时限提醒：补正截止 ≤6天',
      deadlineAlertDetail: '2026/04/15 截止',
      lastValidation: '最近一次检查：2026/03/20 14:00（原提交）',
      reviewStatus: '复核进度：通过（原提交）',
    },

    nextAction: '先补齐 2025 年度源泉徴収票，再在 04/15 前生成补正包。',
    validationHint: '原提交已通过；当前只需处理补正材料与截止日。',
    overviewActions: {
      primary: { label: '查看补正包', tab: 'validation' },
      secondary: { label: '去任务区跟进', tab: 'tasks' },
    },

    timeline: [
      { color: 'warning', text: '收到入管局补正通知：源泉徴収票年份不符',     meta: '系统 · 2026/04/01' },
      { color: 'success', text: '提交包 SUB-001 提交成功',                    meta: 'Aki · 2026/03/25' },
      { color: 'success', text: '复核通过',                                    meta: 'Manager · 2026/03/24' },
      { color: 'primary', text: '校验通过',                                    meta: '系统 · 2026/03/20' },
      { color: 'border',  text: '案件创建',                                    meta: 'Aki · 2026/02/15' },
    ],

    team: [
      { initials: 'AK', name: 'Aki',     role: '负责人',  subtitle: '行政书士',     gradient: 'from-[#8b5cf6] to-[#7c3aed]' },
      { initials: 'MG', name: 'Manager', role: null,       subtitle: '复核',         gradient: 'from-[var(--warning)] to-[#e68a00]' },
    ],

    relatedParties: [
      { initials: 'CL', name: 'Chen Li',   role: '主申请人',  detail: '中国籍 · 1988/11/05 · 在留カード 5555-6666-7777', avatarStyle: 'gradient' },
      { initials: 'TY', name: '田中 勇',   role: '扶養者',    detail: '日本籍 · 配偶 · 永住者',                            avatarStyle: 'surface' },
    ],

    deadlines: [
      { id: 1, title: '在留期限到期日',   desc: '原到期日已延长（申请中）',       date: '2026/03/31', remaining: '申请中延长', severity: 'muted'   },
      { id: 2, title: '补件截止日',       desc: '入管局补正通知指定截止日',       date: '2026/04/15', remaining: '剩余 6 天',  severity: 'danger'  },
      { id: 3, title: '提交预约日',       desc: '原提交已完成；补正需邮送',       date: '—',          remaining: '邮送即可',   severity: 'muted'   },
      { id: 4, title: '结果预计日',       desc: '补正后审查约需 2–4 周',          date: '2026/05/15', remaining: '约 36 天后', severity: 'primary' },
    ],

    billing: {
      total: '¥250,000',
      received: '¥250,000',
      outstanding: '¥0',
      payments: [
        { date: '2026/02/20', type: '着手金',           amount: '¥125,000', status: 'paid', statusLabel: '已结清' },
        { date: '2026/03/25', type: '成功酬金（尾款）', amount: '¥125,000', status: 'paid', statusLabel: '已结清' },
      ],
    },

    validation: {
      lastTime: '最近一次检查（原提交）：2026/03/20 14:00 · Aki',
      blocking: [],
      warnings: [],
      info: [
        { gate: 'C', title: '补正项不影响原校验结果', note: '补正包提交后需等待入管局确认' },
      ],
      retriggerNote: '补正包提交后自动触发补正校验。',
    },

    submissionPackages: [
      { id: 'SUB-001', status: '已提交', locked: true, date: '2026/03/25', summary: '包含 14 份资料 · 校验通过 · 提交人：Aki' },
    ],

    correctionPackage: {
      id: 'COR-001',
      status: '补正处理中',
      noticeDate: '2026/04/01',
      relatedSub: 'SUB-001',
      corrDeadline: '2026/04/15',
      items: '源泉徴収票年份不符（需 2025 年度）',
      note: '补正包提交后将自动关联到原 SUB-001，且不会覆盖已锁定的原始提交包。',
    },

    doubleReview: [
      { initials: 'MG', name: 'Manager', verdict: '通过', verdictBadge: 'badge-green', time: '2026/03/24 16:00', comment: '材料齐备，已通过复核', rejectReason: null },
    ],

    riskConfirmationRecord: null,

    documents: [
      { group: '主申请人提供', count: '5/5', items: [
        { name: '护照复印件', meta: 'passport.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '在留カード', meta: 'zairyu.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '証件照', meta: 'photo.jpg · v1', status: 'approved', statusLabel: '通过' },
        { name: '婚姻証明書', meta: 'marriage.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '履歴書', meta: 'cv.pdf · v1', status: 'approved', statusLabel: '通过' },
      ]},
      { group: '扶養者/保証人提供', count: '5/6', items: [
        { name: '在留卡', meta: 'zairyu_spouse.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '住民票', meta: 'resident.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '戸籍謄本', meta: 'koseki.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '課税証明書', meta: 'tax_cert.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '納税証明書', meta: 'notax.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '源泉徴収票', meta: 'withheld_2024.pdf · v1 退回（补正项）· 需 2025 年度', status: 'revision_required', statusLabel: '退回补正' },
      ]},
      { group: '事務所内部準備', count: '4/5', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '申請理由書', meta: 'reason.docx · v1', status: 'approved', statusLabel: '通过' },
        { name: '質問書', meta: 'questionnaire.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '身分関係図', meta: 'relation.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '补正说明书', meta: '起草中 · 随补正包一并提交', status: 'waiting_upload', statusLabel: '待提交' },
      ]},
    ],

    tasks: [
      { label: '获取 2025 年度源泉徴収票', done: false, due: '04/12', assignee: 'AK', color: 'primary', dueColor: 'danger' },
      { label: '起草补正说明书', done: false, due: '04/13', assignee: 'AK', color: 'primary', dueColor: 'danger' },
      { label: '邮送补正包', done: false, due: '04/15', assignee: 'AK', color: 'primary', dueColor: 'danger' },
    ],

    logEntries: [
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '收到入管局补正通知：<b class="text-[var(--warning)]">源泉徴収票年份不符</b>', category: '操作日志', categoryChip: '',     objectType: '补正', time: '2026/04/01',       dotColor: 'warning' },
      { type: 'status',    avatar: 'AK',  avatarStyle: 'primary', text: '提交包 SUB-001 已提交',                                                      category: '状态变更', categoryChip: 'blue', objectType: '操作人：Aki', time: '2026/03/25 10:00', dotColor: 'success' },
      { type: 'review',    avatar: 'MG',  avatarStyle: 'warning', text: '复核通过',                                                                     category: '审核日志', categoryChip: 'green', objectType: '操作人：Manager · 结论：通过', time: '2026/03/24 16:00', dotColor: 'success' },
      { type: 'status',    avatar: 'AK',  avatarStyle: 'primary', text: '案件创建：<b>刚开始办案</b>',                                                   category: '状态变更', categoryChip: 'blue', objectType: '操作人：Aki', time: '2026/02/15 09:00', dotColor: 'border' },
    ],
  },

  /* ====== A.6  经营管理签 · 已发送资料清单 ====== */
  'biz-material-list-sent': BUSINESS_STEP_06,

  /* ====== A.7  经营管理签 · 客户已提交首批资料 ====== */
  'biz-client-material-submitted': BUSINESS_STEP_07,

  /* ====== A.8  经营管理签 · 内部资料制作中 ====== */
  'biz-material-drafting': BUSINESS_STEP_08,

  /* ====== A.9  经营管理签 · 行政书士制作完成 ====== */
  'biz-draft-completed': BUSINESS_STEP_09,

  /* ====== A.10  经营管理签 · 客户最终确认中 ====== */
  'biz-client-final-review': BUSINESS_STEP_10,

  /* ====== A.11  经营管理签 · 负责人最终确认 ====== */
  'biz-manager-final-review': BUSINESS_STEP_11,

  /* ====== A.12  经营管理签 · 已提交入管 ====== */
  'biz-submitted-to-immigration': BUSINESS_STEP_12,

  /* ====== A.13  经营管理签 · 收到入管反馈 ====== */
  'biz-immigration-feedback': BUSINESS_STEP_13,

  /* ====== A.14  经营管理签 · 补资料处理中 ====== */
  'biz-correction-processing': BUSINESS_STEP_14,

  /* ====== A.15  经营管理签 · 认定通过待收尾款 ====== */
  'biz-final-payment-pending': BUSINESS_STEP_15,

  /* ====== B.1  经营管理签 · COE 已发送 ====== */
  'biz-coe-sent': buildBusinessSample({
    id: 'CAS-2026-0241',
    title: '经营管理签（认定）- 佐藤美咲',
    client: '佐藤美咲',
    owner: 'Tanaka',
    agency: '东京出入国在留管理局（品川）',
    stage: 'COE 已发送',
    stageCode: 'S8',
    stageMeta: '等待客户海外贴签',
    statusBadge: 'badge-blue',
    deadline: '2026/08/20',
    deadlineMeta: '已发送 COE，等待预约贴签',
    deadlineDanger: false,
    progressPercent: 100,
    progressCount: '13/13 项已收集',
    billingAmount: '¥1,200,000',
    billingMeta: '已结清，可发送 COE',
    billingStatusKey: 'paid',
    nextAction: '确认客户已收到 COE 原件/扫描件，并跟进海外领馆贴签预约。',
    validationHint: '当前不再阻断前序认定，重点转为 COE 发送留痕与贴签跟进。',
    timeline: [
      { color: 'primary', text: 'COE 已发送给客户', meta: 'Tanaka · 2026/08/15 10:20' },
      { color: 'success', text: '认定结果已回传（APPROVED）', meta: '系统 · 2026/08/12 09:30' },
      { color: 'success', text: '尾款已到账', meta: '系统 · 2026/08/14 16:10' },
      { color: 'border', text: '案件创建', meta: 'Tanaka · 2026/05/18 11:00' },
    ],
    documents: buildBusinessDocuments({ group: '下签后出件/返签', count: '2/3', items: [
      { name: 'COE PDF', meta: 'coe_misaki_sato.pdf · 2026/08/15 已发送', status: 'approved', statusLabel: '已发送' },
      { name: '发送邮件回执', meta: 'mail_receipt_coe.eml · v1', status: 'approved', statusLabel: '留痕完成' },
      { name: '贴签回传扫描件', meta: '等待客户回传', status: 'waiting_upload', statusLabel: '待回传' },
    ]}),
    forms: {
      templates: [
        { name: 'COE 发送邮件模板', meta: '事務所模板 · Mail', actionLabel: '生成' },
        { name: '签后到着 안내模板', meta: '事務所模板 · Word', actionLabel: '生成' },
      ],
      generated: [
        { name: 'COE送付状_佐藤美咲.pdf', meta: 'v1 · 生成于 2026/08/15 09:40 · Tanaka', tone: 'success', statusLabel: '已发送' },
        { name: '认定许可 안내邮件.eml', meta: 'v1 · 发送于 2026/08/15 10:20 · Tanaka', tone: 'success', statusLabel: '已发送' },
      ],
    },
    deadlines: [
      { id: 1, title: 'COE 发送日', desc: '尾款确认后发送认定结果与 COE', date: '2026/08/15', remaining: '已发送', severity: 'primary' },
      { id: 2, title: '贴签预约确认', desc: '确认客户已完成海外领馆预约', date: '2026/08/20', remaining: '5 天内', severity: 'warning' },
      { id: 3, title: '返签结果回传', desc: '客户需回传贴签/拒签结果', date: '2026/08/29', remaining: '14 天内', severity: 'primary' },
      { id: 4, title: '入境预计日', desc: '成功贴签后预计赴日', date: '2026/09/05', remaining: '待确认', severity: 'muted' },
    ],
    residencePeriod: null,
    reminderSchedule: null,
    postApprovalFlow: {
      statusLabel: 'COE_SENT',
      tone: 'primary',
      rows: [
        { label: '认定结果', value: '2026/08/12 · APPROVED' },
        { label: '尾款状态', value: '2026/08/14 · 已结清，可发送 COE' },
        { label: 'COE 发送', value: '2026/08/15 · 已邮件发送 coe_misaki_sato.pdf' },
      ],
      note: '文档步骤 16：确认尾款后发送 COE，并保留发送留痕。',
      actions: [{ label: '查看 COE 出件记录' }, { label: '查看客户邮件回执' }],
    },
    tasks: [
      { label: '确认客户已收到 COE 与发送指引', done: true, due: '08/15', assignee: 'TN', color: 'primary', dueColor: 'muted' },
      { label: '跟进海外领馆贴签预约日期', done: false, due: '08/20', assignee: 'AK', color: 'warning', dueColor: 'warning' },
      { label: '提醒客户返签后上传签证页扫描件', done: false, due: '08/29', assignee: 'AK', color: 'primary', dueColor: 'primary' },
    ],
    logEntries: [
      { type: 'operation', avatar: 'TN', avatarStyle: 'primary', text: '发送 COE 与贴签指引：<b>coe_misaki_sato.pdf</b>', category: '操作日志', categoryChip: 'blue', objectType: '操作人：Tanaka', time: '2026/08/15 10:20', dotColor: 'primary' },
      { type: 'billing', avatar: 'SYS', avatarStyle: 'success', text: '尾款到账，已满足发送 COE 前置条件', category: '收费日志', categoryChip: 'green', objectType: '回款', time: '2026/08/14 16:10', dotColor: 'success' },
      { type: 'status', avatar: 'SYS', avatarStyle: 'surface', text: '认定结果回传：<b>APPROVED</b>', category: '状态变更', categoryChip: 'blue', objectType: '结果', time: '2026/08/12 09:30', dotColor: 'success' },
    ],
  }),

  /* ====== B.2  经营管理签 · 海外贴签中 ====== */
  'biz-visa-applying': buildBusinessSample({
    id: 'CAS-2026-0242',
    title: '经营管理签（贴签中）- 佐藤美咲',
    client: '佐藤美咲',
    owner: 'Tanaka',
    agency: '东京出入国在留管理局（品川）',
    stage: '海外贴签中',
    stageCode: 'S8',
    stageMeta: '等待返签结果',
    statusBadge: 'badge-orange',
    deadline: '2026/08/29',
    deadlineMeta: '客户已递交贴签，等待结果回传',
    deadlineDanger: false,
    progressPercent: 100,
    progressCount: '13/13 项已收集',
    billingAmount: '¥1,200,000',
    billingMeta: '已结清',
    billingStatusKey: 'paid',
    nextAction: '等待客户从海外领馆回传贴签结果，并同步准备入境后的在留期间登记。',
    validationHint: '文档步骤 17：原型里通过样例切换演示 VISA_APPLYING 状态。',
    timeline: [
      { color: 'warning', text: '客户已在上海日本领馆递交贴签材料', meta: 'Aki · 2026/08/22 15:00' },
      { color: 'primary', text: 'COE 已发送给客户', meta: 'Tanaka · 2026/08/15 10:20' },
      { color: 'success', text: '认定结果已回传（APPROVED）', meta: '系统 · 2026/08/12 09:30' },
    ],
    documents: buildBusinessDocuments({ group: '下签后出件/返签', count: '3/3', items: [
      { name: 'COE PDF', meta: 'coe_misaki_sato.pdf · 已发送', status: 'approved', statusLabel: '已发送' },
      { name: '贴签申请回执', meta: 'visa_receipt_shanghai.jpg · 2026/08/22', status: 'approved', statusLabel: '已上传' },
      { name: '返签结果扫描件', meta: '等待领馆结果', status: 'waiting_upload', statusLabel: '待结果' },
    ]}),
    forms: {
      templates: [
        { name: '返签结果催办模板', meta: '事務所模板 · Mail', actionLabel: '生成' },
        { name: '入境后在留期间登记模板', meta: '内部登记表 · Sheet', actionLabel: '生成' },
      ],
      generated: [
        { name: '贴签申请回执_佐藤美咲.jpg', meta: 'v1 · 上传于 2026/08/22 15:02 · Aki', tone: 'success', statusLabel: 'VISA_APPLYING' },
        { name: '返签结果催办邮件.eml', meta: 'v1 · 草稿保存于 2026/08/26 10:10 · Aki', tone: 'warning', statusLabel: '待发送' },
      ],
    },
    deadlines: [
      { id: 1, title: '贴签递交日', desc: '客户已向海外领馆提交材料', date: '2026/08/22', remaining: '已递交', severity: 'primary' },
      { id: 2, title: '返签结果回传', desc: '等待客户回传签证页/拒签结果', date: '2026/08/29', remaining: '7 天内', severity: 'warning' },
      { id: 3, title: '入境预计日', desc: '返签成功后赴日', date: '2026/09/05', remaining: '待结果', severity: 'muted' },
      { id: 4, title: '在留期间登记', desc: '返签成功后 1 个工作日内录入', date: '2026/09/08', remaining: '待触发', severity: 'muted' },
    ],
    residencePeriod: null,
    reminderSchedule: null,
    postApprovalFlow: {
      statusLabel: 'VISA_APPLYING',
      tone: 'warning',
      rows: [
        { label: '认定结果', value: '2026/08/12 · APPROVED' },
        { label: 'COE 发送', value: '2026/08/15 · 已发送并确认签收' },
        { label: '贴签状态', value: '2026/08/22 · 已向上海日本领馆递交' },
      ],
      note: '文档步骤 17：客户已在海外申请贴签，等待返签结果。',
      actions: [{ label: '查看贴签回执' }, { label: '发送结果催办' }],
    },
    tasks: [
      { label: '确认贴签回执已上传', done: true, due: '08/22', assignee: 'AK', color: 'primary', dueColor: 'muted' },
      { label: '催回返签结果与签证页', done: false, due: '08/29', assignee: 'AK', color: 'warning', dueColor: 'warning' },
      { label: '准备在留期间登记表', done: false, due: '09/02', assignee: 'TN', color: 'primary', dueColor: 'primary' },
    ],
    logEntries: [
      { type: 'operation', avatar: 'AK', avatarStyle: 'warning', text: '客户回传贴签申请回执，状态更新为 <b>VISA_APPLYING</b>', category: '操作日志', categoryChip: 'blue', objectType: '返签', time: '2026/08/22 15:02', dotColor: 'warning' },
      { type: 'operation', avatar: 'TN', avatarStyle: 'primary', text: 'COE 已发送并完成签收确认', category: '操作日志', categoryChip: 'blue', objectType: '操作人：Tanaka', time: '2026/08/15 10:20', dotColor: 'primary' },
      { type: 'status', avatar: 'SYS', avatarStyle: 'surface', text: '认定结果回传：<b>APPROVED</b>', category: '状态变更', categoryChip: 'green', objectType: '结果', time: '2026/08/12 09:30', dotColor: 'success' },
    ],
  }),

  /* ====== B.3  经营管理签 · 返签拒签 ====== */
  'biz-visa-rejected': buildBusinessSample({
    id: 'CAS-2026-0243',
    title: '经营管理签（返签拒签）- 王欣怡',
    client: '王欣怡',
    owner: 'Aki',
    agency: '东京出入国在留管理局（品川）',
    stage: '返签结果（拒签）',
    stageCode: 'S8',
    stageMeta: '拒签结果已回传，待沟通后续方案',
    statusBadge: 'badge-red',
    deadline: '2026/08/31',
    deadlineMeta: '返签拒签结果已回传',
    deadlineDanger: true,
    progressPercent: 100,
    progressCount: '13/13 项已收集',
    billingAmount: '¥1,200,000',
    billingMeta: '结果已确认',
    billingStatusKey: 'paid',
    nextAction: '返签拒签结果已回传，当前需要完成客户沟通、拒签原因整理与后续建议留痕。',
    validationHint: '当前展示返签结果（拒签）节点，后续若需重申请应另案评估，不在此样例内直接归档。',
    timeline: [
      { color: 'danger', text: '返签结果回传：领馆拒签', meta: 'Aki · 2026/08/31 11:20' },
      { color: 'warning', text: '客户已在海外贴签', meta: 'Aki · 2026/08/24 09:40' },
      { color: 'primary', text: 'COE 已发送给客户', meta: 'Tanaka · 2026/08/18 14:30' },
    ],
    documents: buildBusinessDocuments({ group: '下签后出件/返签', count: '3/3', items: [
      { name: 'COE PDF', meta: 'coe_xinyi_wang.pdf · 已发送', status: 'approved', statusLabel: '已发送' },
      { name: '贴签申请回执', meta: 'visa_receipt_beijing.jpg · 已上传', status: 'approved', statusLabel: '已上传' },
      { name: '拒签通知', meta: 'visa_rejected_notice.pdf · 2026/08/31', status: 'approved', statusLabel: 'VISA_REJECTED' },
    ]}),
    forms: {
      templates: [
        { name: '拒签结果通知模板', meta: '事務所模板 · Mail', actionLabel: '生成' },
        { name: '失败结案复盘模板', meta: '内部模板 · Doc', actionLabel: '生成' },
      ],
      generated: [
        { name: '拒签结果通知_王欣怡.eml', meta: 'v1 · 发送于 2026/08/31 12:05 · Aki', tone: 'danger', statusLabel: 'VISA_REJECTED' },
        { name: '失败结案复盘记录.docx', meta: 'v1 · 生成于 2026/08/31 13:10 · Aki', tone: 'warning', statusLabel: '待确认' },
      ],
    },
    deadlines: [
      { id: 1, title: '返签结果回传', desc: '已收到拒签通知', date: '2026/08/31', remaining: '已回传', severity: 'danger' },
      { id: 2, title: '客户告知', desc: '需确认已完成拒签告知', date: '2026/08/31', remaining: '当天完成', severity: 'warning' },
      { id: 3, title: '失败结案复盘', desc: '整理拒签理由与后续建议', date: '2026/09/02', remaining: '2 天内', severity: 'warning' },
      { id: 4, title: '重申请建议', desc: '如需重启将另开案件', date: '—', remaining: '另案处理', severity: 'muted' },
    ],
    residencePeriod: null,
    reminderSchedule: null,
    postApprovalFlow: {
      statusLabel: 'VISA_REJECTED',
      tone: 'danger',
      rows: [
        { label: '认定结果', value: '2026/08/15 · APPROVED' },
        { label: '贴签状态', value: '2026/08/24 · 已在北京领馆递交' },
        { label: '返签结果', value: '2026/08/31 · 拒签结果已回传' },
      ],
      note: '文档步骤 18（拒签分支）：返签拒签结果已回传，当前待补全客户沟通与后续建议留痕。',
      actions: [{ label: '查看拒签通知' }, { label: '查看失败复盘' }],
    },
    tasks: [
      { label: '告知客户返签拒签结果', done: true, due: '08/31', assignee: 'AK', color: 'danger', dueColor: 'muted' },
      { label: '整理拒签理由与后续建议', done: false, due: '09/02', assignee: 'AK', color: 'warning', dueColor: 'warning' },
      { label: '确认是否另案重启申请', done: false, due: '09/03', assignee: 'AK', color: 'primary', dueColor: 'primary' },
    ],
    logEntries: [
      { type: 'status', avatar: 'AK', avatarStyle: 'danger', text: '返签结果回传：<b class="text-[var(--danger)]">VISA_REJECTED</b>', category: '状态变更', categoryChip: 'red', objectType: '返签', time: '2026/08/31 11:20', dotColor: 'danger' },
      { type: 'operation', avatar: 'AK', avatarStyle: 'warning', text: '向客户发送拒签结果通知与后续建议', category: '操作日志', categoryChip: '', objectType: '操作人：Aki', time: '2026/08/31 12:05', dotColor: 'warning' },
      { type: 'status', avatar: 'TN', avatarStyle: 'primary', text: 'COE 已发送并完成贴签前说明', category: '状态变更', categoryChip: 'blue', objectType: '操作人：Tanaka', time: '2026/08/18 14:30', dotColor: 'primary' },
    ],
  }),

  /* ====== B.4  经营管理签 · 已录入在留期间 ====== */
  'biz-residence-recorded': buildBusinessSample({
    id: 'CAS-2026-0244',
    title: '经营管理签（返签成功）- 佐藤美咲',
    client: '佐藤美咲',
    owner: 'Tanaka',
    agency: '东京出入国在留管理局（品川）',
    stage: '已录入在留期间',
    stageCode: 'S8',
    stageMeta: '等待设置续签提醒',
    statusBadge: 'badge-green',
    deadline: '2027/08/31',
    deadlineMeta: '新在留有效期间已记录',
    deadlineDanger: false,
    progressPercent: 100,
    progressCount: '13/13 项已收集',
    billingAmount: '¥1,200,000',
    billingMeta: '已结清',
    billingStatusKey: 'paid',
    nextAction: '返签成功后已录入新在留有效期间，下一步是建续签提醒。',
    validationHint: '文档步骤 18~19：先确认返签成功，再记录新在留资格与有效期间。',
    timeline: [
      { color: 'success', text: '返签成功，客户已入境', meta: 'Aki · 2026/09/03 18:40' },
      { color: 'success', text: '已录入新在留有效期间', meta: 'Tanaka · 2026/09/04 09:10' },
      { color: 'primary', text: '客户回传签证页与在留卡照片', meta: 'Aki · 2026/09/03 20:10' },
    ],
    documents: buildBusinessDocuments({ group: '下签后出件/返签', count: '3/3', items: [
      { name: 'COE PDF', meta: 'coe_misaki_sato.pdf · 已发送', status: 'approved', statusLabel: '已发送' },
      { name: '签证页扫描件', meta: 'visa_success_scan.pdf · 2026/09/03', status: 'approved', statusLabel: 'SUCCESS' },
      { name: '在留卡正反面', meta: 'zairyu_misaki_20260903.jpg · 已回传', status: 'approved', statusLabel: '已登记' },
    ]}),
    forms: {
      templates: [
        { name: '在留期间登记模板', meta: '内部登记表 · Sheet', actionLabel: '生成' },
        { name: '续签提醒建档模板', meta: '任务模板 · Sheet', actionLabel: '生成' },
      ],
      generated: [
        { name: '返签成功登记_佐藤美咲.xlsx', meta: 'v1 · 生成于 2026/09/04 09:10 · Tanaka', tone: 'success', statusLabel: 'SUCCESS' },
        { name: '在留卡照片归档包.zip', meta: 'v1 · 归档于 2026/09/04 09:18 · Tanaka', tone: 'success', statusLabel: '已归档' },
      ],
    },
    deadlines: [
      { id: 1, title: '返签结果回传', desc: '已收到成功结果与在留卡', date: '2026/09/03', remaining: '已完成', severity: 'success' },
      { id: 2, title: '在留期间登记', desc: '返签成功后 1 个工作日内录入', date: '2026/09/04', remaining: '已完成', severity: 'success' },
      { id: 3, title: '新在留到期日', desc: '后续需基于此设置续签提醒', date: '2027/08/31', remaining: '约 362 天后', severity: 'primary' },
      { id: 4, title: '提醒建档', desc: '建议本周内完成续签提醒设置', date: '2026/09/06', remaining: '待设置', severity: 'warning' },
    ],
    residencePeriod: {
      tone: 'success',
      statusLabel: 'RESIDENCE_PERIOD_RECORDED',
      residenceStatus: '経営・管理',
      startDate: '2026/09/01',
      endDate: '2027/08/31',
      recordMeta: 'Tanaka · 2026/09/04 09:10',
    },
    reminderSchedule: null,
    postApprovalFlow: {
      statusLabel: 'SUCCESS',
      tone: 'success',
      rows: [
        { label: '返签结果', value: '2026/09/03 · SUCCESS' },
        { label: '入境留痕', value: '2026/09/03 · 已收到签证页与在留卡照片' },
        { label: '新在留期间', value: '2026/09/04 · 2026/09/01 〜 2027/08/31' },
      ],
      note: '文档步骤 19：返签成功后记录新在留有效期间。',
      actions: [{ label: '查看返签成功记录' }, { label: '查看在留期间登记表' }],
    },
    tasks: [
      { label: '归档返签成功材料', done: true, due: '09/03', assignee: 'AK', color: 'success', dueColor: 'muted' },
      { label: '录入新在留有效期间', done: true, due: '09/04', assignee: 'TN', color: 'success', dueColor: 'muted' },
      { label: '创建续签提醒任务', done: false, due: '09/06', assignee: 'TN', color: 'warning', dueColor: 'warning' },
    ],
    logEntries: [
      { type: 'status', avatar: 'AK', avatarStyle: 'success', text: '返签结果回传：<b class="text-[var(--success)]">SUCCESS</b>', category: '状态变更', categoryChip: 'green', objectType: '返签', time: '2026/09/03 18:40', dotColor: 'success' },
      { type: 'operation', avatar: 'TN', avatarStyle: 'primary', text: '已记录新在留有效期间：<b>2026/09/01 〜 2027/08/31</b>', category: '操作日志', categoryChip: 'blue', objectType: '在留期间', time: '2026/09/04 09:10', dotColor: 'primary' },
      { type: 'operation', avatar: 'AK', avatarStyle: 'success', text: '收到签证页与在留卡照片并完成归档', category: '操作日志', categoryChip: '', objectType: '资料', time: '2026/09/03 20:10', dotColor: 'success' },
    ],
  }),

  /* ====== B.5  经营管理签 · 已设置到期提醒 ====== */
  'biz-reminder-scheduled': buildBusinessSample({
    id: 'CAS-2026-0245',
    title: '经营管理签（续签提醒已建档）- 佐藤美咲',
    client: '佐藤美咲',
    owner: 'Tanaka',
    agency: '东京出入国在留管理局（品川）',
    stage: '已设置到期提醒',
    stageCode: 'S9',
    stageMeta: '提醒已建档，当前样例进入归档只读',
    statusBadge: 'badge-green',
    deadline: '2027/03/04',
    deadlineMeta: '首个 180 天提醒已建档',
    deadlineDanger: false,
    progressPercent: 100,
    progressCount: '13/13 项已收集',
    billingAmount: '¥1,200,000',
    billingMeta: '已结清',
    billingStatusKey: 'paid',
    readonly: true,
    nextAction: '文档步骤 20 已落地：围绕新在留到期日设置多节点续签提醒。',
    validationHint: '当前样例展示“记录在留期间 → 设置提醒”的完整成功分支收尾。',
    timeline: [
      { color: 'success', text: '已设置 3 个续签提醒节点', meta: 'Tanaka · 2026/09/05 10:00' },
      { color: 'success', text: '已录入新在留有效期间', meta: 'Tanaka · 2026/09/04 09:10' },
      { color: 'success', text: '返签成功，客户已入境', meta: 'Aki · 2026/09/03 18:40' },
    ],
    documents: buildBusinessDocuments({ group: '下签后出件/返签', count: '3/3', items: [
      { name: '签证页扫描件', meta: 'visa_success_scan.pdf · 已归档', status: 'approved', statusLabel: 'SUCCESS' },
      { name: '在留卡正反面', meta: 'zairyu_misaki_20260903.jpg · 已归档', status: 'approved', statusLabel: '已登记' },
      { name: '提醒建档记录', meta: 'renewal_reminders_misaki.xlsx · 2026/09/05', status: 'approved', statusLabel: '已设置' },
    ]}),
    forms: {
      templates: [
        { name: '续签提醒任务模板', meta: '任务模板 · Sheet', actionLabel: '生成' },
        { name: '到期前联系客户模板', meta: '沟通模板 · Mail', actionLabel: '生成' },
      ],
      generated: [
        { name: '续签提醒计划_佐藤美咲.xlsx', meta: 'v1 · 生成于 2026/09/05 10:00 · Tanaka', tone: 'success', statusLabel: 'REMINDER_SCHEDULED' },
        { name: '180天前联系模板.eml', meta: 'v1 · 已生成待发送 · 2027/03/04', tone: 'primary', statusLabel: '待触发' },
      ],
    },
    deadlines: [
      { id: 1, title: '新在留到期日', desc: '基于该日期安排续签提醒', date: '2027/08/31', remaining: '约 361 天后', severity: 'primary' },
      { id: 2, title: '180 天提醒', desc: '首次续签提醒建档日期', date: '2027/03/04', remaining: '已建档', severity: 'success' },
      { id: 3, title: '90 天提醒', desc: '第二次提醒', date: '2027/06/02', remaining: '已建档', severity: 'success' },
      { id: 4, title: '30 天提醒', desc: '最终提醒', date: '2027/08/01', remaining: '已建档', severity: 'success' },
    ],
    residencePeriod: {
      tone: 'success',
      statusLabel: 'RESIDENCE_PERIOD_RECORDED',
      residenceStatus: '経営・管理',
      startDate: '2026/09/01',
      endDate: '2027/08/31',
      recordMeta: 'Tanaka · 2026/09/04 09:10',
    },
    reminderSchedule: {
      tone: 'success',
      statusLabel: 'REMINDER_SCHEDULED',
      owner: 'Tanaka / 系统自动任务',
      items: [
        { label: '到期前 180 天', date: '2027/03/04', statusLabel: '已建档', tone: 'success' },
        { label: '到期前 90 天', date: '2027/06/02', statusLabel: '已建档', tone: 'success' },
        { label: '到期前 30 天', date: '2027/08/01', statusLabel: '已建档', tone: 'success' },
      ],
    },
    postApprovalFlow: {
      statusLabel: 'SUCCESS + REMINDER_SCHEDULED',
      tone: 'success',
      rows: [
        { label: '返签结果', value: '2026/09/03 · SUCCESS' },
        { label: '新在留期间', value: '2026/09/04 · 2026/09/01 〜 2027/08/31' },
        { label: '续签提醒', value: '2026/09/05 · 已创建 180/90/30 天三个节点' },
      ],
      note: '文档步骤 20：围绕新在留到期日设置提醒，为后续更新/续签留出口。',
      actions: [{ label: '查看提醒计划' }, { label: '查看续签任务' }],
    },
    tasks: [
      { label: '录入新在留有效期间', done: true, due: '09/04', assignee: 'TN', color: 'success', dueColor: 'muted' },
      { label: '创建 180/90/30 天续签提醒', done: true, due: '09/05', assignee: 'TN', color: 'success', dueColor: 'muted' },
      { label: '确认长期跟进 owner', done: true, due: '09/05', assignee: 'AK', color: 'primary', dueColor: 'muted' },
    ],
    logEntries: [
      { type: 'operation', avatar: 'TN', avatarStyle: 'success', text: '已创建续签提醒计划：<b>180 / 90 / 30 天</b>', category: '操作日志', categoryChip: 'green', objectType: '提醒', time: '2026/09/05 10:00', dotColor: 'success' },
      { type: 'operation', avatar: 'TN', avatarStyle: 'primary', text: '已记录新在留有效期间：<b>2026/09/01 〜 2027/08/31</b>', category: '操作日志', categoryChip: 'blue', objectType: '在留期间', time: '2026/09/04 09:10', dotColor: 'primary' },
      { type: 'status', avatar: 'AK', avatarStyle: 'success', text: '返签结果回传：<b class="text-[var(--success)]">SUCCESS</b>', category: '状态变更', categoryChip: 'green', objectType: '返签', time: '2026/09/03 18:40', dotColor: 'success' },
    ],
  }),

  /* ====== D.6  S9 已归档只读 ====== */
  archived: {
    id: 'CAS-2025-0891',
    title: '就労ビザ更新（技人国）- 山田 太郎',
    client: '株式会社ABC',
    owner: 'Suzuki',
    agency: '东京入国管理局（品川）',
    stage: '已归档',
    stageCode: 'S9',
    stageMeta: '归档于 2026/02/20',
    statusBadge: 'badge-gray',
    deadline: '—',
    deadlineMeta: '已完结',
    deadlineDanger: false,
    progressPercent: 100,
    progressCount: '16/16 项已收集',
    billingAmount: '¥480,000',
    billingMeta: '已结清',
    billingStatusKey: 'paid',
    docsCounter: '16/16',
    readonly: true,

    caseType: '就労ビザ（技術・人文知識・国際業務）',
    applicationType: '更新（在留期間更新）',
    acceptedDate: '2025-11-01',
    targetDate: '2026-01-15',

    providerProgress: [
      { label: '主申请人',       done: 5, total: 5 },
      { label: '扶養者/保証人',  done: 0, total: 0 },
      { label: '雇主/所属機構',  done: 5, total: 5 },
      { label: '事務所内部',     done: 6, total: 6 },
    ],

    risk: {
      blockingCount: '当前卡点：无',
      blockingDetail: '全部通过',
      arrearsStatus: '收费情况：已结清',
      arrearsDetail: '全额已收',
      deadlineAlert: '时限提醒：无',
      deadlineAlertDetail: '案件已归档',
      lastValidation: '最近一次检查：2026/01/10 09:00',
      reviewStatus: '复核进度：通过',
    },

    nextAction: '案件已归档；如需追溯，请查看提交记录与日志。',
    validationHint: '案件已归档，仅建议查看历史提交、收费与日志。',
    overviewActions: {
      primary: { label: '查看提交与校验记录', tab: 'validation' },
      secondary: { label: '查看完整日志', tab: 'log' },
    },

    timeline: [
      { color: 'border',  text: '案件归档',                                    meta: 'Suzuki · 2026/02/20' },
      { color: 'success', text: '收到在留卡更新完成通知',                       meta: '系统 · 2026/02/15' },
      { color: 'success', text: '提交包 SUB-001 提交成功',                      meta: 'Suzuki · 2026/01/15' },
      { color: 'primary', text: '校验通过',                                     meta: '系统 · 2026/01/10' },
      { color: 'border',  text: '案件创建',                                     meta: 'Suzuki · 2025/11/01' },
    ],

    team: [
      { initials: 'SZ', name: 'Suzuki', role: '负责人',  subtitle: '资深行政书士',   gradient: 'from-[var(--primary)] to-[var(--primary-hover)]' },
    ],

    relatedParties: [
      { initials: 'YT', name: '山田 太郎',       role: '主申请人',         detail: '中国籍 · 1985/07/22 · 在留カード 1111-2222-3333', avatarStyle: 'gradient' },
      { initials: 'AB', name: '株式会社ABC',     role: '雇主（所属機構）', detail: '法人番号 1111222233334 · 東京都千代田区',           avatarStyle: 'surface' },
    ],

    deadlines: [
      { id: 1, title: '在留期限到期日', desc: '已延长',                         date: '2026/01/31', remaining: '已过',       severity: 'muted' },
      { id: 2, title: '补件截止日',     desc: '—',                              date: '—',          remaining: '—',          severity: 'muted' },
      { id: 3, title: '提交预约日',     desc: '已提交',                         date: '2026/01/15', remaining: '已提交',     severity: 'muted' },
      { id: 4, title: '结果预计日',     desc: '已出结果',                       date: '2026/02/10', remaining: '许可',       severity: 'muted' },
    ],

    billing: {
      total: '¥480,000',
      received: '¥480,000',
      outstanding: '¥0',
      payments: [
        { date: '2025/11/05', type: '着手金',           amount: '¥240,000', status: 'paid', statusLabel: '已结清' },
        { date: '2026/02/20', type: '成功酬金（尾款）', amount: '¥240,000', status: 'paid', statusLabel: '已结清' },
      ],
    },

    validation: {
      lastTime: '最近一次检查：2026/01/10 09:00 · Suzuki',
      blocking: [],
      warnings: [],
      info: [],
      retriggerNote: '案件已归档，无法执行校验。',
    },

    submissionPackages: [
      { id: 'SUB-001', status: '已提交', locked: true, date: '2026/01/15', summary: '包含 16 份资料 · 校验通过 · 提交人：Suzuki' },
    ],

    correctionPackage: null,

    doubleReview: [
      { initials: 'MG', name: 'Manager', verdict: '通过', verdictBadge: 'badge-green', time: '2026/01/14 16:00', comment: '材料齐备，可提交', rejectReason: null },
    ],

    riskConfirmationRecord: null,

    documents: [
      { group: '主申请人提供', count: '5/5', items: [
        { name: '护照复印件', meta: 'passport.pdf · v2', status: 'approved', statusLabel: '通过' },
        { name: '在留カード', meta: 'zairyu.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '証件照', meta: 'photo.jpg · v1', status: 'approved', statusLabel: '通过' },
        { name: '履歴書', meta: 'cv.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '卒業証明書', meta: 'degree.pdf · v1', status: 'approved', statusLabel: '通过' },
      ]},
      { group: '雇主/所属機構提供', count: '5/5', items: [
        { name: '法人登記簿謄本', meta: 'corp_registry.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '決算書', meta: 'financial.pdf · v2', status: 'approved', statusLabel: '通过' },
        { name: '在職証明書', meta: 'employment.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '雇用契約書', meta: 'contract.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '源泉徴収票', meta: 'withheld.pdf · v1', status: 'approved', statusLabel: '通过' },
      ]},
      { group: '事務所内部準備', count: '6/6', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '申請理由書', meta: 'reason.docx · v2', status: 'approved', statusLabel: '通过' },
        { name: '質問書', meta: 'questionnaire.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '翻訳証明', meta: 'translation.pdf · v1', status: 'approved', statusLabel: '通过' },
        { name: '提出用封筒', meta: '完了', status: 'approved', statusLabel: '通过' },
        { name: '控え書類', meta: '完了', status: 'approved', statusLabel: '通过' },
      ]},
    ],

    tasks: [
      { label: '发送资料收集清单', done: true, due: '11/10', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
      { label: '执行提交前检查', done: true, due: '01/10', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
      { label: '窗口提交申请', done: true, due: '01/15', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
      { label: '归档案件', done: true, due: '02/20', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
    ],

    logEntries: [
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '案件归档：<b>结果已确认 → 已归档</b>',  category: '状态变更', categoryChip: 'blue', objectType: '操作人：Suzuki', time: '2026/02/20 14:00', dotColor: 'border' },
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '收到在留卡更新完成通知',                  category: '操作日志', categoryChip: '',     objectType: '结果', time: '2026/02/15 10:00', dotColor: 'success' },
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '提交包 SUB-001 已提交',                  category: '状态变更', categoryChip: 'blue', objectType: '操作人：Suzuki', time: '2026/01/15 11:00', dotColor: 'success' },
      { type: 'review',    avatar: 'MG',  avatarStyle: 'warning', text: '复核通过',                                category: '审核日志', categoryChip: 'green', objectType: '操作人：Manager · 结论：通过', time: '2026/01/14 16:00', dotColor: 'success' },
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '案件创建：<b>刚开始办案</b>',           category: '状态变更', categoryChip: 'blue', objectType: '操作人：Suzuki', time: '2025/11/01 10:00', dotColor: 'border' },
    ],
  },
};
