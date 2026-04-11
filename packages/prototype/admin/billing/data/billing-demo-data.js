(function () {
  'use strict';

  var DEMO_BILLING_ROWS = [
    {
      id: 'bill-002',
      caseName: '经营管理签证 新规',
      caseNo: 'CAS-2026-0191',
      client: { name: 'Global Tech KK', type: '企业' },
      group: 'tokyo-1',
      owner: 'admin',
      amountDue: 500000,
      amountReceived: 0,
      amountOutstanding: 500000,
      status: 'overdue',
      nextNode: { name: '首付款 (100%)', dueDate: '已逾期 5 天 (2026-04-04)' },
    },
    {
      id: 'bill-001',
      caseName: '高度人才 (HSP) 申请',
      caseNo: 'CAS-2026-0181',
      client: { name: 'Michael T.', type: '个人' },
      group: 'tokyo-1',
      owner: 'suzuki',
      amountDue: 350000,
      amountReceived: 175000,
      amountOutstanding: 175000,
      status: 'partial',
      nextNode: { name: '尾款 (50%)', dueDate: '申请获批后 7 天内' },
    },
    {
      id: 'bill-004',
      caseName: '就劳签证 变更',
      caseNo: 'CAS-2026-0204',
      client: { name: 'Li M.', type: '个人' },
      group: 'osaka',
      owner: 'tanaka',
      amountDue: 120000,
      amountReceived: 0,
      amountOutstanding: 120000,
      status: 'due',
      nextNode: { name: '全款 (100%)', dueDate: '资料收集齐后 3 天内' },
    },
    {
      id: 'bill-003',
      caseName: '家族滞在签证 续签',
      caseNo: 'CAS-2026-0156',
      client: { name: 'Sarah W.', type: '个人' },
      group: 'tokyo-2',
      owner: 'suzuki',
      amountDue: 80000,
      amountReceived: 80000,
      amountOutstanding: 0,
      status: 'paid',
      nextNode: null,
    },
    {
      id: 'bill-005',
      caseName: '经营管理签 新規 (COE)',
      caseNo: 'CAS-2026-0215',
      client: { name: '王建国', type: '个人' },
      group: 'tokyo-1',
      owner: 'admin',
      amountDue: 600000,
      amountReceived: 300000,
      amountOutstanding: 300000,
      status: 'partial',
      nextNode: { name: '尾款 (COE下発後)', dueDate: '结果获批后 7 天内' },
      caseStage: 'S8',
      postApprovalStage: 'waiting_final_payment',
      applicationFlowType: 'coe_overseas',
      coeIssuedAt: '2026/04/05',
      coeExpiryDate: '2026/07/05',
    },
  ];

  var DEMO_PAYMENT_LOGS = [
    {
      id: 'pay-001',
      date: '2026/04/01',
      caseNo: 'CAS-2026-0181',
      caseName: '高度人才 (HSP) 申请',
      amount: 175000,
      node: '着手金 (50%)',
      receipt: true,
      recordStatus: 'valid',
      operator: 'Admin',
      note: '',
    },
    {
      id: 'pay-002',
      date: '2026/03/25',
      caseNo: 'CAS-2026-0156',
      caseName: '家族滞在签证 续签',
      amount: 80000,
      node: '全款 (100%)',
      receipt: false,
      recordStatus: 'valid',
      operator: 'Suzuki',
      note: '',
    },
    {
      id: 'pay-003',
      date: '2026/03/20',
      caseNo: 'CAS-2026-0181',
      caseName: '高度人才 (HSP) 申请',
      amount: 30000,
      node: '着手金 (50%)',
      receipt: false,
      recordStatus: 'voided',
      operator: 'Admin',
      note: '金额录入错误，已作废',
      voidedBy: 'Admin',
      voidedAt: '2026/03/21',
    },
    {
      id: 'pay-004',
      date: '2026/03/18',
      caseNo: 'CAS-2026-0156',
      caseName: '家族滞在签证 续签',
      amount: 80000,
      node: '全款 (100%)',
      receipt: true,
      recordStatus: 'reversed',
      operator: 'Suzuki',
      note: '重复入账，已冲正 → pay-002',
      reversedBy: 'Admin',
      reversedAt: '2026/03/24',
      refPaymentId: 'pay-002',
    },
    {
      id: 'pay-005',
      date: '2026/03/15',
      caseNo: 'CAS-2026-0215',
      caseName: '经营管理签 新規 (COE)',
      amount: 300000,
      node: '着手金 (签约时)',
      receipt: true,
      recordStatus: 'valid',
      operator: 'Admin',
      note: '签约时收取着手金（BillingPlan node-006 → paid, Case.deposit_paid_cached → true）',
    },
  ];

  var DEMO_SUMMARY = {
    totalDue: 1650000,
    totalReceived: 555000,
    totalOutstanding: 1095000,
    overdueAmount: 500000,
    overdueCount: 1,
  };

  var DEMO_BILLING_PLAN = {
    caseNo: 'CAS-2026-0181',
    nodes: [
      { name: '着手金 (50%)', amount: 175000, dueDate: '2026/04/01', status: 'paid' },
      { name: '尾款 (50%)', amount: 175000, dueDate: '申请获批后 7 天内', status: 'due' },
    ],
  };

  var DEMO_BILLING_PLANS = {
    'bill-001': {
      billingId: 'bill-001',
      caseNo: 'CAS-2026-0181',
      caseName: '高度人才 (HSP) 申请',
      totalDue: 350000,
      totalReceived: 175000,
      totalOutstanding: 175000,
      nodes: [
        { id: 'node-001', name: '着手金 (50%)', amount: 175000, dueDate: '2026/04/01', status: 'paid' },
        { id: 'node-002', name: '尾款 (50%)', amount: 175000, dueDate: '申请获批后 7 天内', status: 'due' },
      ],
      nextNode: { name: '尾款 (50%)', dueDate: '申请获批后 7 天内' },
    },
    'bill-002': {
      billingId: 'bill-002',
      caseNo: 'CAS-2026-0191',
      caseName: '经营管理签证 新规',
      totalDue: 500000,
      totalReceived: 0,
      totalOutstanding: 500000,
      nodes: [
        { id: 'node-003', name: '首付款 (100%)', amount: 500000, dueDate: '2026/04/04', status: 'overdue' },
      ],
      nextNode: { name: '首付款 (100%)', dueDate: '已逾期 5 天 (2026-04-04)' },
    },
    'bill-003': {
      billingId: 'bill-003',
      caseNo: 'CAS-2026-0156',
      caseName: '家族滞在签证 续签',
      totalDue: 80000,
      totalReceived: 80000,
      totalOutstanding: 0,
      nodes: [
        { id: 'node-004', name: '全款 (100%)', amount: 80000, dueDate: '2026/03/25', status: 'paid' },
      ],
      nextNode: null,
    },
    'bill-004': {
      billingId: 'bill-004',
      caseNo: 'CAS-2026-0204',
      caseName: '就劳签证 变更',
      totalDue: 120000,
      totalReceived: 0,
      totalOutstanding: 120000,
      nodes: [
        { id: 'node-005', name: '全款 (100%)', amount: 120000, dueDate: '资料收集齐后 3 天内', status: 'due' },
      ],
      nextNode: { name: '全款 (100%)', dueDate: '资料收集齐后 3 天内' },
    },
    /**
     * 经营管理签 COE 案件 — 演示 BillingPlan 驱动的尾款守卫场景
     *
     * 事实来源：BillingPlan 节点 status（此处 node-007 status=due 表示尾款未结清）
     * 缓存字段：Case.deposit_paid_cached=true, Case.final_payment_paid_cached=false
     * 守卫规则：coe_sent 前校验尾款节点是否 paid；未 paid 则 warn + 风险确认留痕
     */
    'bill-005': {
      billingId: 'bill-005',
      caseNo: 'CAS-2026-0215',
      caseName: '经营管理签 新規 (COE)',
      totalDue: 600000,
      totalReceived: 300000,
      totalOutstanding: 300000,
      applicationFlowType: 'coe_overseas',
      postApprovalStage: 'waiting_final_payment',
      depositPaidCached: true,
      finalPaymentPaidCached: false,
      nodes: [
        { id: 'node-006', name: '着手金 (签约时)', amount: 300000, dueDate: '2026/03/15', status: 'paid', gateBinding: 'deposit' },
        { id: 'node-007', name: '尾款 (COE下発後)', amount: 300000, dueDate: '结果获批后 7 天内', status: 'due', gateBinding: 'final_payment' },
      ],
      nextNode: { name: '尾款 (COE下発後)', dueDate: '结果获批后 7 天内' },
    },
  };

  var DEMO_RISK_ACK = {
    confirmedBy: 'Manager',
    confirmedAt: '2026/04/08 09:00',
    reasonCode: '客户承诺本周内付清',
    reasonNote: '因期限紧迫优先提交',
    receipt: false,
    amount: 120000,
    caseNo: 'CAS-2026-0204',
    caseName: '就劳签证 变更',
  };

  /**
   * COE 尾款守卫风险确认演示（03 §6.3F #4, §15.2）
   *
   * 场景：经营管理签 COE 已下发，进入 waiting_final_payment，
   * 事务所决定先发送 COE 再补收尾款 → warn 模式 → 风险确认留痕
   */
  var DEMO_COE_GUARD_RISK = {
    confirmedBy: 'Admin',
    confirmedAt: '2026/04/10 10:30',
    reasonCode: '客户已确认尾款将于本周汇入，先行发送COE以赶海外签证预约',
    reasonNote: '客户出示了汇款预约凭证截图',
    receipt: true,
    amount: 300000,
    caseNo: 'CAS-2026-0215',
    caseName: '经营管理签 新規 (COE)',
    guardAction: 'coe_sent',
    postApprovalStage: 'waiting_final_payment',
  };

  var DEMO_COLLECTION_RESULT = {
    success: 1,
    skipped: 1,
    failed: 0,
    details: [
      { caseNo: 'CAS-2026-0191', result: 'success', taskId: 'TSK-0099' },
      { caseNo: 'CAS-2026-0204', result: 'skipped', reason: 'not-overdue' },
    ],
  };

  var DEMO_AUDIT_LOG = [
    {
      timestamp: '2026/04/01 10:00',
      action: 'payment-logged',
      actor: 'Admin',
      detail: '登记回款 ¥175,000 → 着手金 (50%)，案件 CAS-2026-0181',
    },
    {
      timestamp: '2026/03/25 14:30',
      action: 'payment-logged',
      actor: 'Suzuki',
      detail: '登记回款 ¥80,000 → 全款 (100%)，案件 CAS-2026-0156',
    },
    {
      timestamp: '2026/03/24 09:15',
      action: 'payment-reversed',
      actor: 'Admin',
      detail: '冲正回款 pay-004 → pay-002，原因：重复入账，案件 CAS-2026-0156',
    },
    {
      timestamp: '2026/03/21 11:00',
      action: 'payment-voided',
      actor: 'Admin',
      detail: '作废回款 pay-003，原因：金额录入错误，案件 CAS-2026-0181',
    },
    {
      timestamp: '2026/04/08 09:00',
      action: 'risk-acknowledged',
      actor: 'Manager',
      detail: '欠款风险确认：CAS-2026-0204 就劳签证 变更，原因：客户承诺本周内付清',
    },
    {
      timestamp: '2026/04/09 08:00',
      action: 'collection-created',
      actor: 'Admin',
      detail: '催款任务 TSK-0099 已创建，案件 CAS-2026-0191 经营管理签证 新规',
    },
    // P0-CONTRACT §7.4: 收费计划创建/编辑事件
    {
      timestamp: '2026/03/10 11:00',
      action: 'plan-created',
      actor: 'Admin',
      detail: '创建收费计划：CAS-2026-0191 经营管理签证 新规，节点数 1，总金额 ¥500,000',
    },
    {
      timestamp: '2026/03/15 14:20',
      action: 'plan-edited',
      actor: 'Suzuki',
      detail: '编辑收费计划：CAS-2026-0181 高度人才 (HSP) 申请，变更「尾款到期日」2026/04/30 → 申请获批后 7 天内',
    },
    {
      timestamp: '2026/04/05 16:00',
      action: 'plan-created',
      actor: 'Admin',
      detail: '创建收费计划：CAS-2026-0215 经营管理签 新規 (COE)，节点数 2（着手金 + 尾款），总金额 ¥600,000',
    },
    {
      timestamp: '2026/04/05 16:05',
      action: 'payment-logged',
      actor: 'Admin',
      detail: '登记回款 ¥300,000 → 着手金 (签约时)，案件 CAS-2026-0215（BillingPlan 节点 node-006 → paid，Case.deposit_paid_cached → true）',
    },
    {
      timestamp: '2026/04/10 10:30',
      action: 'risk-acknowledged',
      actor: 'Admin',
      detail: 'COE 尾款守卫风险确认：CAS-2026-0215 经营管理签 新規 (COE)，尾款 ¥300,000 未结清，确认先行发送 COE（warn 模式）',
    },
  ];

  window.BillingDemoData = {
    DEMO_BILLING_ROWS: DEMO_BILLING_ROWS,
    DEMO_PAYMENT_LOGS: DEMO_PAYMENT_LOGS,
    DEMO_SUMMARY: DEMO_SUMMARY,
    DEMO_BILLING_PLAN: DEMO_BILLING_PLAN,
    DEMO_BILLING_PLANS: DEMO_BILLING_PLANS,
    DEMO_RISK_ACK: DEMO_RISK_ACK,
    DEMO_RISK_RECORD: DEMO_RISK_ACK,
    DEMO_COE_GUARD_RISK: DEMO_COE_GUARD_RISK,
    DEMO_COLLECTION_RESULT: DEMO_COLLECTION_RESULT,
    DEMO_AUDIT_LOG: DEMO_AUDIT_LOG,
  };
})();
