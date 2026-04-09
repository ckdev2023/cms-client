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
  { key: 'info',       label: '基础信息',   icon: 'identification' },
  { key: 'documents',  label: '資料清單',   icon: 'document-text' },
  { key: 'messages',   label: '沟通记录',   icon: 'chat-alt-2' },
  { key: 'forms',      label: '文書',       icon: 'document-duplicate' },
  { key: 'tasks',      label: '任务',       icon: 'clipboard-check' },
  { key: 'deadlines',  label: '期限',       icon: 'clock' },
  { key: 'validation', label: '校验与提交', icon: 'shield-check' },
  { key: 'billing',    label: '收費',       icon: 'currency-yen' },
  { key: 'log',        label: '日志',       icon: 'document-report' },
];

/* ------------------------------------------------------------------ */
/*  STAGES (S1–S9)                                                     */
/* ------------------------------------------------------------------ */

var DETAIL_STAGES = {
  S1: { code: 'S1', label: '初始',       badge: 'badge-gray'   },
  S2: { code: 'S2', label: '资料收集',   badge: 'badge-green'  },
  S3: { code: 'S3', label: '审核补正',   badge: 'badge-orange' },
  S4: { code: 'S4', label: '文书生成',   badge: 'badge-blue'   },
  S5: { code: 'S5', label: '校验准备',   badge: 'badge-orange' },
  S6: { code: 'S6', label: '待提交',     badge: 'badge-orange' },
  S7: { code: 'S7', label: '已提交待回执', badge: 'badge-blue' },
  S8: { code: 'S8', label: '结果待定',   badge: 'badge-blue'   },
  S9: { code: 'S9', label: '已归档',     badge: 'badge-gray'   },
};

/* ------------------------------------------------------------------ */
/*  GATE DEFINITIONS (Gate-A / B / C)                                  */
/* ------------------------------------------------------------------ */

var DETAIL_GATES = {
  A: { id: 'A', label: 'Gate-A', chip: 'gate-chip-a', severity: 'blocking',      desc: '硬性阻断（必须修复）' },
  B: { id: 'B', label: 'Gate-B', chip: 'gate-chip-b', severity: 'warning',       desc: '软性提示（风险建议）' },
  C: { id: 'C', label: 'Gate-C', chip: 'gate-chip-c', severity: 'informational', desc: '信息提示' },
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
  archived:       { title: '案件已归档（示例）',       desc: '案件进入 S9，全量字段已锁定' },
  stageAdvanced:  { title: '阶段已更新（示例）',       desc: '已从 {from} 推进到 {to}' },
};

/* ------------------------------------------------------------------ */
/*  SAMPLE SCENARIOS  (6 required by P0-CONTRACT-DETAIL §16)           */
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
      blockingCount: '校验阻断项：2 项',
      blockingDetail: 'Gate-A 阻断，需修复后提交',
      arrearsStatus: '欠款状态：应收',
      arrearsDetail: '着手金已收，尾款待收',
      deadlineAlert: '期限风险：在留到期 ≤21天',
      deadlineAlertDetail: '2026/04/28 到期',
      lastValidation: '最新校验：2026/04/06 15:30',
      reviewStatus: '复核状态：待复核',
    },

    nextAction: '补齐雇主侧材料（在职证明/雇用契約書），并执行提交前校验。',
    validationHint: '当前存在 2 个硬性阻断项，建议先修复再提交。',

    timeline: [
      { color: 'primary', text: '收到客户上传：护照复印件',                          meta: 'Suzuki · 今天 14:30' },
      { color: 'warning', text: '发送催办：纳税証明書',                              meta: '系统自动 · 昨天 09:00' },
      { color: 'success', text: '案件阶段推进：S2 资料收集 → S5 校验准备',           meta: 'Suzuki · 2026/04/05' },
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
      lastTime: '最后校验：2026/04/06 15:30 · Suzuki',
      blocking: [
        { gate: 'A', title: '在職証明書未提供',   fix: '联系雇主 HR 部门获取最新在職証明書',                       assignee: 'Suzuki', deadline: '2026/04/15' },
        { gate: 'A', title: '源泉徴収票年份不符', fix: '退回项需要 2025 年度源泉徴収票，当前为 2024 年度',         assignee: 'Tanaka', deadline: '2026/04/12' },
      ],
      warnings: [
        { gate: 'B', title: '纳税証明書逾期未提供', note: '非必交项但强烈建议提供以增强申请竞争力' },
      ],
      info: [
        { gate: 'C', title: '申請理由書尚未完成', note: '不阻断提交，但建议在提交前完善' },
      ],
      retriggerNote: '重新校验触发条件：当任意必交资料项状态变更、或手动点击「重新校验」按钮时自动执行。',
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
        { name: '护照复印件', meta: 'passport_copy.pdf · v2 · 催办：—', status: 'submitted', statusLabel: '已提交' },
        { name: '在留カード（表裏）', meta: 'residence_card.pdf · v1 · 催办：—', status: 'reviewed', statusLabel: '已审核' },
        { name: '履歴書', meta: '未上传 · 催办：2026/04/05', status: 'pending', statusLabel: '待提供', canWaive: true },
        { name: '纳税証明書', meta: '逾期未提供 · 催办：2026/04/03 · 截止已过', status: 'expired', statusLabel: '逾期' },
        { name: '証件照（4×3cm）', meta: 'photo_4x3.jpg · v1 · 催办：—', status: 'submitted', statusLabel: '已提交' },
      ]},
      { group: '扶養者/保証人提供', count: '2/3', items: [
        { name: '身元保証書', meta: 'guarantor_form.pdf · v1 · 催办：—', status: 'reviewed', statusLabel: '已审核' },
        { name: '住民票', meta: 'resident_cert.pdf · v1 · 催办：—', status: 'submitted', statusLabel: '已提交' },
        { name: '課税証明書（保証人）', meta: '无需提供 · 原因：保証人为配偶，免除 · Suzuki · 2026/04/03', status: 'waived', statusLabel: '无需提供' },
      ]},
      { group: '雇主/所属機構提供', count: '2/5', items: [
        { name: '法人登記簿謄本', meta: 'corp_registry.pdf · v1 · 催办：—', status: 'reviewed', statusLabel: '已审核' },
        { name: '決算書（直近 2 期）', meta: 'financial_stmt.pdf · v2 · 催办：2026/04/01', status: 'submitted', statusLabel: '已提交' },
        { name: '在職証明書', meta: '未上传 · 催办：2026/04/05', status: 'pending', statusLabel: '待提供', canWaive: true },
        { name: '雇用契約書', meta: '未上传 · 催办：2026/04/05', status: 'pending', statusLabel: '待提供', canWaive: true },
        { name: '源泉徴収票', meta: 'withheld_tax.pdf · v1 退回 · 审核意见：年份不符，需提交 2025 年度', status: 'rejected', statusLabel: '已退回' },
      ]},
      { group: '事務所内部準備', count: '1/3', items: [
        { name: '委任状', meta: 'poa.pdf · v1 · 催办：—', status: 'done', statusLabel: '已完成' },
        { name: '申請理由書', meta: '起草中 · 催办：—', status: 'pending', statusLabel: '起草中' },
        { name: '質問書', meta: '未開始 · 催办：—', status: 'idle', statusLabel: '未开始' },
      ]},
    ],

    tasks: [
      { label: '发送资料收集清单给客户', done: true, due: '04/01', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
      { label: '初审护照复印件与在留卡', done: true, due: '04/05', assignee: 'TN', color: 'success', dueColor: 'muted' },
      { label: '起草申请理由书', done: false, due: '04/20', assignee: 'TN', color: 'success', dueColor: 'danger' },
      { label: '催办雇主材料（在職証明書 + 雇用契約書）', done: false, due: '04/12', assignee: 'SZ', color: 'primary', dueColor: 'warning' },
      { label: '执行提交前 Gate 校验', done: false, due: '04/22', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
    ],

    logEntries: [
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '更新了文件 <b class="text-[var(--primary)]">决算書2023.pdf</b> 的状态为：已提交待审核', category: '操作日志', categoryChip: '',      objectType: '资料项', time: '今天 10:45',       dotColor: 'primary' },
      { type: 'review',    avatar: 'TN',  avatarStyle: 'success', text: '审核通过了文件 <b>法人登記簿謄本</b>',                                                  category: '审核日志', categoryChip: 'green', objectType: '操作人：Tanaka · 结论：通过', time: '今天 09:20',       dotColor: 'success' },
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '案件阶段变更：<b>S2 资料收集 → S5 校验准备</b>',                                        category: '状态变更', categoryChip: 'blue',  objectType: '操作人：Suzuki', time: '2026/04/05 16:00', dotColor: 'warning' },
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '触发自动提醒规则：发送纳税証明書催办邮件给客户',                                          category: '操作日志', categoryChip: '',      objectType: '沟通', time: '2026/04/05 09:00', dotColor: 'border' },
      { type: 'review',    avatar: 'MG',  avatarStyle: 'danger',  text: '复核驳回提交包 SUB-001：<b class="text-[var(--danger)]">源泉徴収票年份有误</b>',          category: '审核日志', categoryChip: 'red',   objectType: '操作人：Manager · 结论：驳回', time: '2026/04/06 17:30', dotColor: 'danger' },
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '案件创建：<b>S1 初始</b>',                                                               category: '状态变更', categoryChip: 'blue',  objectType: '操作人：Suzuki', time: '2026/04/01 10:00', dotColor: 'border' },
    ],
  },

  /* ====== D.2  家族签案件（认定） ====== */
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
      blockingCount: '校验阻断项：0 项',
      blockingDetail: '暂无阻断',
      arrearsStatus: '欠款状态：应收',
      arrearsDetail: '着手金尚未到账',
      deadlineAlert: '期限风险：无紧急',
      deadlineAlertDetail: '距最近截止还有 38 天',
      lastValidation: '最新校验：尚未执行',
      reviewStatus: '复核状态：—',
    },

    nextAction: '继续收集主申请人和扶養者的材料，重点催办亲属关系证明。',
    validationHint: '资料收集阶段，暂无校验结果。',

    timeline: [
      { color: 'primary', text: '扶養者提交了在留卡影像',                   meta: 'Tanaka · 今天 10:15' },
      { color: 'warning', text: '催办：亲属关系证明',                        meta: '系统自动 · 昨天 09:00' },
      { color: 'border',  text: '案件创建（家族签批量建案）',                meta: 'Tanaka · 2026/04/03' },
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
        { name: '护照复印件', meta: '未上传 · 催办：—', status: 'pending', statusLabel: '待提供', canWaive: true },
        { name: '在留資格認定証明書（如有）', meta: '未上传', status: 'idle', statusLabel: '未开始' },
        { name: '証件照（4×3cm）', meta: 'photo.jpg · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '履歴書', meta: '未上传', status: 'pending', statusLabel: '待提供', canWaive: true },
        { name: '出生证明（翻译件）', meta: '未上传', status: 'pending', statusLabel: '待提供', canWaive: true },
      ]},
      { group: '扶養者/保証人提供', count: '3/8', items: [
        { name: '在留卡（表裏）', meta: 'zairyu_card.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '住民票', meta: 'resident_cert.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '纳税証明書', meta: '未上传 · 催办：2026/04/05', status: 'pending', statusLabel: '待提供', canWaive: true },
        { name: '課税証明書', meta: '未上传', status: 'pending', statusLabel: '待提供', canWaive: true },
        { name: '身元保証書', meta: '未上传', status: 'pending', statusLabel: '待提供', canWaive: true },
        { name: '親族関係公証書', meta: '未上传 · 催办中', status: 'pending', statusLabel: '待提供' },
        { name: '収入証明', meta: '未上传', status: 'pending', statusLabel: '待提供', canWaive: true },
        { name: '戸籍謄本', meta: 'koseki.pdf · v1', status: 'submitted', statusLabel: '已提交' },
      ]},
      { group: '事務所内部準備', count: '1/7', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '申請理由書', meta: '未開始', status: 'idle', statusLabel: '未开始' },
        { name: '質問書', meta: '未開始', status: 'idle', statusLabel: '未开始' },
        { name: '身分関係図', meta: '未開始', status: 'idle', statusLabel: '未开始' },
        { name: '送金記録', meta: '未開始', status: 'idle', statusLabel: '未开始' },
        { name: '写真一覧', meta: '未開始', status: 'idle', statusLabel: '未开始' },
        { name: '翻訳証明', meta: '未開始', status: 'idle', statusLabel: '未开始' },
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
      { type: 'status',    avatar: 'TN',  avatarStyle: 'success', text: '案件创建（家族签批量建案）：<b>S1 → S2</b>', category: '状态变更', categoryChip: 'blue', objectType: '操作人：Tanaka', time: '2026/04/03 14:00', dotColor: 'success' },
    ],
  },

  /* ====== D.3  Gate 失败态 ====== */
  'gate-fail': {
    id: 'CAS-2026-0117',
    title: '特定技能（认定）- Global Tech KK',
    client: 'Global Tech KK',
    owner: 'Tom',
    agency: '大阪入国管理局',
    stage: '校验失败',
    stageCode: 'S5',
    stageMeta: 'Gate-A 阻断 · 2 项待修复',
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
      blockingCount: '校验阻断项：2 项',
      blockingDetail: 'Gate-A 硬性阻断，必须修复',
      arrearsStatus: '欠款状态：应收',
      arrearsDetail: '着手金已收，尾款待收',
      deadlineAlert: '期限风险：在留到期 ≤11天',
      deadlineAlertDetail: '2026/04/20 到期，极紧急',
      lastValidation: '最新校验：2026/04/08 11:00',
      reviewStatus: '复核状态：阻断中（无法复核）',
    },

    nextAction: '修复 2 个 Gate-A 硬性阻断项后重新执行校验。',
    validationHint: 'Gate-A 存在 2 个硬性阻断项，无法进入复核/提交。',

    timeline: [
      { color: 'danger',  text: 'Gate-A 校验失败：2 项硬性阻断',             meta: '系统 · 2026/04/08 11:00' },
      { color: 'warning', text: '催办：雇用条件書',                           meta: '系统自动 · 2026/04/07' },
      { color: 'success', text: '阶段推进：S2 → S5',                         meta: 'Tom · 2026/04/06' },
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
      lastTime: '最后校验：2026/04/08 11:00 · Tom',
      blocking: [
        { gate: 'A', title: '雇用条件書缺失',       fix: '向雇主 HR 索取雇用条件書原件',                           assignee: 'Tom',    deadline: '2026/04/12' },
        { gate: 'A', title: '技能検定合格証明未上传', fix: '确认申请人是否已通过技能検定并获取合格証明',             assignee: 'Li',     deadline: '2026/04/14' },
      ],
      warnings: [
        { gate: 'B', title: '決算書仅 1 期', note: '建议提供直近 2 期決算書以增强材料说服力' },
      ],
      info: [
        { gate: 'C', title: '質問書可后补', note: '質問書非认定必交项，可提交后补充' },
      ],
      retriggerNote: '修复阻断项后可手动重新校验。',
    },

    submissionPackages: [],
    correctionPackage: null,
    doubleReview: [],
    riskConfirmationRecord: null,

    documents: [
      { group: '主申请人提供', count: '4/5', items: [
        { name: '护照复印件', meta: 'passport.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '在留カード', meta: 'zairyu.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '証件照', meta: 'photo.jpg · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '履歴書', meta: 'cv.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '技能検定合格証明', meta: '未上传 · Gate-A 阻断项', status: 'expired', statusLabel: '阻断' },
      ]},
      { group: '雇主/所属機構提供', count: '5/7', items: [
        { name: '法人登記簿謄本', meta: 'corp_registry.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '決算書', meta: 'financial.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '特定技能雇用契約書', meta: 'contract.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '支援計画書', meta: 'support_plan.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '賃金台帳', meta: 'payroll.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '雇用条件書', meta: '未上传 · Gate-A 阻断项', status: 'expired', statusLabel: '阻断' },
        { name: '質問書', meta: '未上传', status: 'pending', statusLabel: '待提供', canWaive: true },
      ]},
      { group: '事務所内部準備', count: '3/4', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '申請理由書', meta: 'reason.docx · v1', status: 'done', statusLabel: '已完成' },
        { name: '翻訳証明', meta: 'translation.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '送出機関証明', meta: '未上传', status: 'pending', statusLabel: '待提供', canWaive: true },
      ]},
    ],

    tasks: [
      { label: '向雇主 HR 索取雇用条件書原件', done: false, due: '04/12', assignee: 'TM', color: 'warning', dueColor: 'danger' },
      { label: '确认技能検定合格証明', done: false, due: '04/14', assignee: 'LI', color: 'primary', dueColor: 'danger' },
      { label: '修复 Gate-A 后重新校验', done: false, due: '04/16', assignee: 'TM', color: 'warning', dueColor: 'danger' },
    ],

    logEntries: [
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: 'Gate-A 校验失败：<b class="text-[var(--danger)]">2 项硬性阻断</b>', category: '操作日志', categoryChip: '',     objectType: '校验', time: '2026/04/08 11:00', dotColor: 'danger' },
      { type: 'status',    avatar: 'TM',  avatarStyle: 'warning', text: '阶段推进：<b>S2 → S5 校验准备</b>',                                 category: '状态变更', categoryChip: 'blue', objectType: '操作人：Tom', time: '2026/04/06 14:00', dotColor: 'warning' },
      { type: 'status',    avatar: 'TM',  avatarStyle: 'warning', text: '案件创建：<b>S1 初始</b>',                                           category: '状态变更', categoryChip: 'blue', objectType: '操作人：Tom', time: '2026/03/20 10:00', dotColor: 'border' },
    ],
  },

  /* ====== D.4  欠款继续提交 ====== */
  arrears: {
    id: 'CAS-2026-0099',
    title: '经营管理（更新）- 田中建设株式会社',
    client: '田中建设株式会社',
    owner: 'Rina',
    agency: '东京入国管理局（品川）',
    stage: '待提交（欠款）',
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
      blockingCount: '校验阻断项：0 项',
      blockingDetail: '校验通过',
      arrearsStatus: '欠款状态：欠款 ¥120,000',
      arrearsDetail: '需经风险确认后方可提交',
      deadlineAlert: '期限风险：在留到期 ≤9天',
      deadlineAlertDetail: '2026/04/18 到期，紧急',
      lastValidation: '最新校验：2026/04/07 16:00',
      reviewStatus: '复核状态：通过（含欠款风险确认）',
    },

    nextAction: '欠款 ¥120,000 需经风险确认后方可继续提交。',
    validationHint: '校验通过，但存在欠款。需完成风险确认后才能生成提交包。',

    timeline: [
      { color: 'danger',  text: '欠款提醒：尾款 ¥120,000 逾期',                    meta: '系统 · 今天 08:00' },
      { color: 'success', text: '校验通过（Gate-A/B/C 全部通过）',                   meta: '系统 · 2026/04/07 16:00' },
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
      lastTime: '最后校验：2026/04/07 16:00 · Rina',
      blocking: [],
      warnings: [
        { gate: 'B', title: '存在未结清费用 ¥120,000', note: '提交前需完成欠款风险确认' },
      ],
      info: [],
      retriggerNote: '校验已通过。欠款状态不阻断 Gate，但需风险确认后提交。',
    },

    submissionPackages: [],
    correctionPackage: null,

    doubleReview: [
      { initials: 'MG', name: 'Manager', verdict: '通过', verdictBadge: 'badge-green', time: '2026/04/07 17:30', comment: '材料齐备，但需先完成欠款确认', rejectReason: null },
    ],

    riskConfirmationRecord: {
      confirmedBy: 'Manager',
      reason: '客户承诺本周内付清尾款，因期限紧迫优先提交',
      time: '2026/04/08 09:00',
      amount: '¥120,000',
    },

    documents: [
      { group: '主申请人提供', count: '5/5', items: [
        { name: '护照复印件', meta: 'passport.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '在留カード', meta: 'zairyu.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '証件照', meta: 'photo.jpg · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '履歴書', meta: 'cv.pdf · v2', status: 'reviewed', statusLabel: '已审核' },
        { name: '卒業証明書', meta: 'degree.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
      ]},
      { group: '雇主/所属機構提供', count: '7/8', items: [
        { name: '法人登記簿謄本', meta: 'corp_registry.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '決算書（直近 3 期）', meta: 'financial.pdf · v3', status: 'reviewed', statusLabel: '已审核' },
        { name: '事業計画書', meta: 'bizplan.pdf · v2', status: 'reviewed', statusLabel: '已审核' },
        { name: '役員名簿', meta: 'directors.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '会社案内', meta: 'company_intro.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '納税証明書', meta: 'tax_cert.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '雇用保険関連', meta: 'insurance.pdf · v1', status: 'submitted', statusLabel: '已提交' },
        { name: '源泉徴収票', meta: '未上传 · 催办中', status: 'pending', statusLabel: '待提供', canWaive: true },
      ]},
      { group: '事務所内部準備', count: '3/3', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '申請理由書', meta: 'reason.docx · v2', status: 'done', statusLabel: '已完成' },
        { name: '質問書', meta: 'questionnaire.pdf · v1', status: 'done', statusLabel: '已完成' },
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
      { type: 'status',    avatar: 'RN',  avatarStyle: 'primary', text: '案件创建：<b>S1 初始</b>',                                             category: '状态变更', categoryChip: 'blue',  objectType: '操作人：Rina', time: '2026/03/10 11:00', dotColor: 'border' },
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
      blockingCount: '校验阻断项：0 项（补正待提出）',
      blockingDetail: '原提交包已通过校验；补正项单独处理',
      arrearsStatus: '欠款状态：已结清',
      arrearsDetail: '全额已收',
      deadlineAlert: '期限风险：补正截止 ≤6天',
      deadlineAlertDetail: '2026/04/15 截止',
      lastValidation: '最新校验：2026/03/20 14:00（原提交）',
      reviewStatus: '复核状态：通过（原提交）',
    },

    nextAction: '在补正截止日（04/15）前补齐源泉徴収票（2025 年度）并提交补正包。',
    validationHint: '原提交已通过校验。当前处于补正状态，需在截止前提交补正材料。',

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
      lastTime: '最后校验（原提交）：2026/03/20 14:00 · Aki',
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
        { name: '护照复印件', meta: 'passport.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '在留カード', meta: 'zairyu.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '証件照', meta: 'photo.jpg · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '婚姻証明書', meta: 'marriage.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '履歴書', meta: 'cv.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
      ]},
      { group: '扶養者/保証人提供', count: '5/6', items: [
        { name: '在留卡', meta: 'zairyu_spouse.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '住民票', meta: 'resident.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '戸籍謄本', meta: 'koseki.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '課税証明書', meta: 'tax_cert.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '納税証明書', meta: 'notax.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '源泉徴収票', meta: 'withheld_2024.pdf · v1 退回（补正项）· 需 2025 年度', status: 'rejected', statusLabel: '补正中' },
      ]},
      { group: '事務所内部準備', count: '4/5', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '申請理由書', meta: 'reason.docx · v1', status: 'done', statusLabel: '已完成' },
        { name: '質問書', meta: 'questionnaire.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '身分関係図', meta: 'relation.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '补正说明书', meta: '起草中 · 随补正包一并提交', status: 'pending', statusLabel: '起草中' },
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
      { type: 'status',    avatar: 'AK',  avatarStyle: 'primary', text: '案件创建：<b>S1 初始</b>',                                                     category: '状态变更', categoryChip: 'blue', objectType: '操作人：Aki', time: '2026/02/15 09:00', dotColor: 'border' },
    ],
  },

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
      blockingCount: '校验阻断项：0 项',
      blockingDetail: '全部通过',
      arrearsStatus: '欠款状态：已结清',
      arrearsDetail: '全额已收',
      deadlineAlert: '期限风险：无',
      deadlineAlertDetail: '案件已归档',
      lastValidation: '最新校验：2026/01/10 09:00',
      reviewStatus: '复核状态：通过',
    },

    nextAction: '案件已归档，无后续动作。',
    validationHint: '案件已归档。所有字段为只读（日志仍可查看）。',

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
      lastTime: '最后校验：2026/01/10 09:00 · Suzuki',
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
        { name: '护照复印件', meta: 'passport.pdf · v2', status: 'reviewed', statusLabel: '已审核' },
        { name: '在留カード', meta: 'zairyu.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '証件照', meta: 'photo.jpg · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '履歴書', meta: 'cv.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '卒業証明書', meta: 'degree.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
      ]},
      { group: '雇主/所属機構提供', count: '5/5', items: [
        { name: '法人登記簿謄本', meta: 'corp_registry.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '決算書', meta: 'financial.pdf · v2', status: 'reviewed', statusLabel: '已审核' },
        { name: '在職証明書', meta: 'employment.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '雇用契約書', meta: 'contract.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
        { name: '源泉徴収票', meta: 'withheld.pdf · v1', status: 'reviewed', statusLabel: '已审核' },
      ]},
      { group: '事務所内部準備', count: '6/6', items: [
        { name: '委任状', meta: 'poa.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '申請理由書', meta: 'reason.docx · v2', status: 'done', statusLabel: '已完成' },
        { name: '質問書', meta: 'questionnaire.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '翻訳証明', meta: 'translation.pdf · v1', status: 'done', statusLabel: '已完成' },
        { name: '提出用封筒', meta: '完了', status: 'done', statusLabel: '已完成' },
        { name: '控え書類', meta: '完了', status: 'done', statusLabel: '已完成' },
      ]},
    ],

    tasks: [
      { label: '发送资料收集清单', done: true, due: '11/10', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
      { label: '执行 Gate 校验', done: true, due: '01/10', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
      { label: '窗口提交申请', done: true, due: '01/15', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
      { label: '归档案件', done: true, due: '02/20', assignee: 'SZ', color: 'primary', dueColor: 'muted' },
    ],

    logEntries: [
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '案件归档：<b>S8 → S9 已归档</b>',      category: '状态变更', categoryChip: 'blue', objectType: '操作人：Suzuki', time: '2026/02/20 14:00', dotColor: 'border' },
      { type: 'operation', avatar: 'SYS', avatarStyle: 'surface', text: '收到在留卡更新完成通知',                  category: '操作日志', categoryChip: '',     objectType: '结果', time: '2026/02/15 10:00', dotColor: 'success' },
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '提交包 SUB-001 已提交',                  category: '状态变更', categoryChip: 'blue', objectType: '操作人：Suzuki', time: '2026/01/15 11:00', dotColor: 'success' },
      { type: 'review',    avatar: 'MG',  avatarStyle: 'warning', text: '复核通过',                                category: '审核日志', categoryChip: 'green', objectType: '操作人：Manager · 结论：通过', time: '2026/01/14 16:00', dotColor: 'success' },
      { type: 'status',    avatar: 'SZ',  avatarStyle: 'primary', text: '案件创建：<b>S1 初始</b>',               category: '状态变更', categoryChip: 'blue', objectType: '操作人：Suzuki', time: '2025/11/01 10:00', dotColor: 'border' },
    ],
  },
};
