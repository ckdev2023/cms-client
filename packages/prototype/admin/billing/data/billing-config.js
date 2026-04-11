(function () {
  'use strict';

  // P0 §3.5 + P0-CONTRACT §12.4: key 以数据模型 §3.20 为权威（due/partial/paid/overdue）
  var BILLING_STATUS_OPTIONS = [
    { value: 'paid', label: '已回款', badge: 'tag-green' },
    { value: 'partial', label: '部分回款', badge: 'tag-blue' },
    { value: 'due', label: '未回款', badge: 'tag-orange' },
    { value: 'overdue', label: '欠款', badge: 'tag-red' },
  ];

  // P0 §3.5 收费节点状态（权威枚举）
  var NODE_STATUS_OPTIONS = [
    { value: 'due', label: '应收', badge: 'tag-orange' },
    { value: 'partial', label: '部分回款', badge: 'tag-blue' },
    { value: 'paid', label: '已回款', badge: 'tag-green' },
    { value: 'overdue', label: '欠款', badge: 'tag-red' },
  ];

  var PAYMENT_RECORD_STATUS = [
    { value: 'valid', label: '有效', badge: 'tag-green' },
    { value: 'voided', label: '已作废', badge: 'tag-red' },
    { value: 'reversed', label: '已冲正', badge: 'tag-orange' },
  ];

  var GROUPS = [
    { value: 'tokyo-1', label: '東京一組' },
    { value: 'tokyo-2', label: '東京二組' },
    { value: 'osaka', label: '大阪組' },
  ];

  var OWNERS = [
    { value: 'admin', label: 'Admin', initials: 'AD' },
    { value: 'suzuki', label: 'Suzuki', initials: 'SZ' },
    { value: 'tanaka', label: 'Tanaka', initials: 'TN' },
  ];

  var STATUS_LABEL_MAP = {};
  BILLING_STATUS_OPTIONS.forEach(function (s) { STATUS_LABEL_MAP[s.value] = s.label; });

  var NODE_STATUS_LABEL_MAP = {};
  NODE_STATUS_OPTIONS.forEach(function (s) { NODE_STATUS_LABEL_MAP[s.value] = s.label; });

  var RECORD_STATUS_LABEL_MAP = {};
  PAYMENT_RECORD_STATUS.forEach(function (s) { RECORD_STATUS_LABEL_MAP[s.value] = s.label; });

  var GROUP_LABEL_MAP = {};
  GROUPS.forEach(function (g) { GROUP_LABEL_MAP[g.value] = g.label; });

  var OWNER_LABEL_MAP = {};
  OWNERS.forEach(function (o) { OWNER_LABEL_MAP[o.value] = o.label; });

  var STATUS_BADGE_MAP = {};
  BILLING_STATUS_OPTIONS.forEach(function (s) { STATUS_BADGE_MAP[s.value] = s.badge; });

  var NODE_STATUS_TAG_MAP = {};
  NODE_STATUS_OPTIONS.forEach(function (s) {
    NODE_STATUS_TAG_MAP[s.value] = { label: s.label, cls: s.badge };
  });

  var RECORD_STATUS_TAG_MAP = {};
  PAYMENT_RECORD_STATUS.forEach(function (s) {
    RECORD_STATUS_TAG_MAP[s.value] = { label: s.label, cls: s.badge };
  });

  var TABLE_COLUMNS = [
    { id: 'select', type: 'checkbox', width: '44px' },
    { id: 'caseName', label: '案件名称', showAlways: true },
    { id: 'client', label: '客户', responsive: 'md' },
    { id: 'group', label: '所属 Group', responsive: 'lg', width: '100px' },
    { id: 'amountDue', label: '应收(¥)', width: '100px', align: 'right' },
    { id: 'amountReceived', label: '已收(¥)', width: '100px', align: 'right' },
    { id: 'amountOutstanding', label: '未收(¥)', width: '100px', align: 'right' },
    { id: 'nextNode', label: '下一收款节点', responsive: 'md', width: '160px' },
    { id: 'status', label: '回款状态', width: '100px' },
  ];

  var PAYMENT_LOG_COLUMNS = [
    { id: 'amount', label: '回款金额', width: '120px', align: 'right' },
    { id: 'date', label: '回款日期', width: '120px' },
    { id: 'case', label: '关联案件' },
    { id: 'node', label: '关联收费节点', width: '140px' },
    { id: 'receipt', label: '凭证', width: '80px' },
    { id: 'recordStatus', label: '记录状态', width: '100px' },
    { id: 'operator', label: '操作人', width: '100px' },
    { id: 'note', label: '备注' },
  ];

  var BILLING_PLAN_COLUMNS = [
    { id: 'nodeName', label: '收费节点' },
    { id: 'amount', label: '应收(¥)', width: '120px', align: 'right' },
    { id: 'dueDate', label: '到期日', responsive: 'md', width: '160px' },
    { id: 'status', label: '节点状态', width: '100px' },
  ];

  var FILTERS = [
    { id: 'status', label: '回款状态', options: BILLING_STATUS_OPTIONS, defaultValue: '' },
    { id: 'group', label: '所属 Group', options: GROUPS, defaultValue: '' },
    { id: 'owner', label: '负责人', options: OWNERS, defaultValue: '' },
  ];

  var SEARCH_PLACEHOLDER = '搜索：案件名称 / 客户名称 / 案件编号';

  var SEGMENTS = [
    { id: 'billing-list', label: '案件收费列表' },
    { id: 'payment-log', label: '回款流水记录' },
  ];

  var BULK_ACTIONS = [
    { id: 'createCollection', label: '批量生成催款任务', type: 'button' },
  ];

  var COLLECTION_SKIP_REASONS = [
    { value: 'no-permission', label: '无权限' },
    { value: 'duplicate-task', label: '已存在未完成催款任务（同案同节点同逾期周期）' },
    { value: 'not-overdue', label: '不满足欠款条件（节点已回款或到期日未到）' },
    { value: 'no-assignee', label: '无可用负责人（案件负责人缺失且 Group 未配置默认负责人）' },
    { value: 'system-error', label: '创建失败（系统错误/并发冲突）' },
  ];

  var PAYMENT_FORM_FIELDS = [
    { id: 'amount', label: '金额', type: 'number', required: true },
    { id: 'date', label: '日期', type: 'date', required: true },
    { id: 'billingPlanId', label: '关联收费节点', type: 'select', required: 'conditional' },
    { id: 'receipt', label: '付款凭证', type: 'file', required: false },
    { id: 'note', label: '备注', type: 'textarea', required: false },
  ];

  var PAYMENT_REQUIRED_IDS = ['amount', 'date'];

  var PLAN_FORM_FIELDS = [
    { id: 'nodeName', label: '收费节点名称', type: 'text', required: true, placeholder: '例如：着手金 (50%)' },
    { id: 'amount', label: '应收金额', type: 'number', required: true },
    { id: 'dueDate', label: '到期日', type: 'date', required: true },
    { id: 'note', label: '备注', type: 'textarea', required: false },
  ];

  var PLAN_REQUIRED_IDS = ['nodeName', 'amount', 'dueDate'];

  var RISK_ACK_FIELDS = [
    { id: 'reasonCode', label: '原因', type: 'text', required: true, placeholder: '例如：客户承诺本周内付清' },
    { id: 'reasonNote', label: '补充说明', type: 'textarea', required: false },
    { id: 'receipt', label: '凭证', type: 'file', required: false },
  ];

  var SUMMARY_CARDS = [
    { id: 'totalDue', label: '总应收 (JPY)', key: 'totalDue', variant: 'default' },
    { id: 'totalReceived', label: '总已收 (JPY)', key: 'totalReceived', variant: 'default' },
    { id: 'totalOutstanding', label: '总未收 (JPY)', key: 'totalOutstanding', variant: 'primary' },
    { id: 'overdueAmount', label: '逾期欠款 (JPY)', key: 'overdueAmount', variant: 'danger' },
  ];

  var AMOUNT_DISPLAY = {
    received: 'text-green-600',
    outstandingOverdue: 'text-red-600',
    outstandingNormal: 'text-orange-600',
    zero: 'text-gray-400',
    overdueRowBg: 'bg-[rgba(220,38,38,0.04)]',
  };

  var TOAST = {
    paymentLogged:     { title: '回款已登记（示例）', desc: '已登记 ¥{amount} 回款到 {caseName}' },
    paymentCorrected:  { title: '回款已更正（示例）', desc: '回款记录已{action}，原因已记录' },
    receiptUploaded:   { title: '凭证已上传（示例）', desc: '付款凭证已关联到回款记录' },
    collectionSingle:  { title: '催款任务已创建（示例）', desc: '已为 {caseName} 创建催款任务' },
    collectionBulk:    { title: '批量催款（示例）', desc: '成功 {s} 条 · 跳过 {k} 条 · 失败 {f} 条' },
    riskConfirmed:     { title: '风险确认已记录（示例）', desc: '欠款风险确认已留痕' },
    planConfigured:    { title: '功能占位（示例）', desc: '收费计划配置将在案件详情「收费」Tab 中完成' },
  };

  var EMPTY_STATES = {
    noBillingPlan: {
      title: '尚未配置收费计划',
      desc: '请先为该案件配置收费节点与金额',
      action: '配置收费计划',
    },
    noBillingRows: {
      title: '暂无收费记录',
      desc: '请先在案件中配置收费计划',
    },
    noFilterResults: {
      title: '未找到匹配的收费记录',
      desc: '请调整筛选条件或关键词后重试',
    },
    noPaymentLogs: {
      title: '暂无回款流水',
      desc: '登记回款后，流水记录将显示在此处',
    },
    allSettled: {
      nextNodeLabel: '无（已回款）',
    },
  };

  var GATE_EFFECT_MODES = ['off', 'warn'];

  /**
   * P0 收费事实来源声明（03 §6.3F 冻结口径）
   *
   * BillingPlan + PaymentRecord 是收费状态的唯一事实来源。
   * Case 上的 deposit_paid_cached / final_payment_paid_cached 仅为展示与守卫的布尔缓存，
   * 不可作为结清判断的权威依据。最终结清状态以 BillingPlan.status 和关联
   * PaymentRecord 的有效回款汇总为准。
   *
   * 缓存字段由服务端在 BillingPlan 节点结清时同步更新，页面不得直接写入。
   */
  var BILLING_TRUTH_SOURCE = {
    authoritative: ['BillingPlan', 'PaymentRecord'],
    cached: [
      { field: 'deposit_paid_cached', source: 'BillingPlan 签约节点 status=paid' },
      { field: 'final_payment_paid_cached', source: 'BillingPlan 结果后节点 status=paid' },
      { field: 'billing_unpaid_amount_cached', source: 'SUM(BillingPlan.amount) - SUM(valid PaymentRecord.amount)' },
    ],
    riskAckFields: [
      'billing_risk_acknowledged_by',
      'billing_risk_acknowledged_at',
      'billing_risk_ack_reason_code',
      'billing_risk_ack_reason_note',
    ],
  };

  /**
   * COE 尾款守卫（03 §6.3F #4, §3.8, §15.2）
   *
   * coe_sent 前系统校验结果后收费节点（尾款）是否已结清：
   *   已结清 → 允许执行发送 COE
   *   未结清 → warn 模式：风险提示 + 风险确认留痕后方可继续（不做 hard block）
   *
   * post_approval_stage 成功路径：
   *   waiting_final_payment → coe_sent → overseas_visa_applying → entry_success
   */
  var COE_TAIL_PAYMENT_GUARD = {
    gateMode: 'warn',
    triggerStage: 'waiting_final_payment',
    guardAction: 'coe_sent',
    checkField: 'final_payment_paid_cached',
    truthSource: 'BillingPlan 结果后节点 status',
    onUnpaid: 'risk-confirm-then-proceed',
  };

  var POST_APPROVAL_STAGES = [
    { value: 'none', label: '不适用' },
    { value: 'waiting_final_payment', label: '待收尾款' },
    { value: 'coe_sent', label: 'COE 已发送' },
    { value: 'overseas_visa_applying', label: '海外返签中' },
    { value: 'entry_success', label: '成功入境' },
    { value: 'overseas_visa_rejected', label: '海外返签拒签' },
  ];

  var DEFAULT_SORT = {
    description: 'overdue first → outstanding desc → due date asc',
    statusPriority: { overdue: 0, partial: 1, due: 2, paid: 3 },
  };

  var P0_NOT_IN_SCOPE = [
    'invoice-management',
    'financial-reports',
    'auto-reconciliation',
    'batch-export',
    'client-portal-reminder',
    'gate-effect-block',
    'amount-range-filter',
    'reminder-days-customizable',
  ];

  window.BillingConfig = {
    BILLING_STATUS_OPTIONS: BILLING_STATUS_OPTIONS,
    NODE_STATUS_OPTIONS: NODE_STATUS_OPTIONS,
    BILLING_PLAN_STATUS: NODE_STATUS_OPTIONS,
    PAYMENT_RECORD_STATUS: PAYMENT_RECORD_STATUS,

    STATUS_LABEL_MAP: STATUS_LABEL_MAP,
    STATUS_BADGE_MAP: STATUS_BADGE_MAP,
    NODE_STATUS_TAG_MAP: NODE_STATUS_TAG_MAP,
    NODE_STATUS_LABEL_MAP: NODE_STATUS_LABEL_MAP,
    RECORD_STATUS_TAG_MAP: RECORD_STATUS_TAG_MAP,
    RECORD_STATUS_LABEL_MAP: RECORD_STATUS_LABEL_MAP,

    GROUPS: GROUPS,
    OWNERS: OWNERS,
    GROUP_LABEL_MAP: GROUP_LABEL_MAP,
    OWNER_LABEL_MAP: OWNER_LABEL_MAP,

    TABLE_COLUMNS: TABLE_COLUMNS,
    PAYMENT_LOG_COLUMNS: PAYMENT_LOG_COLUMNS,
    BILLING_PLAN_COLUMNS: BILLING_PLAN_COLUMNS,

    FILTERS: FILTERS,
    SEARCH_PLACEHOLDER: SEARCH_PLACEHOLDER,

    SEGMENTS: SEGMENTS,
    SEGMENTED_VIEWS: SEGMENTS,

    BULK_ACTIONS: BULK_ACTIONS,
    COLLECTION_SKIP_REASONS: COLLECTION_SKIP_REASONS,

    PAYMENT_FORM_FIELDS: PAYMENT_FORM_FIELDS,
    PAYMENT_REQUIRED_IDS: PAYMENT_REQUIRED_IDS,
    PLAN_FORM_FIELDS: PLAN_FORM_FIELDS,
    PLAN_REQUIRED_IDS: PLAN_REQUIRED_IDS,
    RISK_ACK_FIELDS: RISK_ACK_FIELDS,

    SUMMARY_CARDS: SUMMARY_CARDS,
    AMOUNT_DISPLAY: AMOUNT_DISPLAY,
    DEFAULT_SORT: DEFAULT_SORT,
    TOAST: TOAST,
    EMPTY_STATES: EMPTY_STATES,
    GATE_EFFECT_MODES: GATE_EFFECT_MODES,
    BILLING_TRUTH_SOURCE: BILLING_TRUTH_SOURCE,
    COE_TAIL_PAYMENT_GUARD: COE_TAIL_PAYMENT_GUARD,
    POST_APPROVAL_STAGES: POST_APPROVAL_STAGES,
    P0_NOT_IN_SCOPE: P0_NOT_IN_SCOPE,
  };
})();
