(function () {
  'use strict';

  var TASK_STATUS_OPTIONS = [
    { value: 'todo', label: '待跟进' },
    { value: 'doing', label: '处理中' },
    { value: 'done', label: '已完成' },
    { value: 'canceled', label: '已取消' },
  ];

  var TASK_PRIORITY_OPTIONS = [
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' },
  ];

  var TASK_SOURCE_OPTIONS = [
    { value: 'manual', label: '手动安排' },
    { value: 'template', label: '模板生成' },
    { value: 'reminder', label: '资料催办' },
    { value: 'billing', label: '收费跟进' },
    { value: 'validation-fail', label: '提交前修正' },
    { value: 'correction', label: '补正处理' },
    { value: 'renewal', label: '到期提醒' },
  ];

  var CANCEL_REASON_OPTIONS = [
    { value: 'duplicate', label: '重复生成' },
    { value: 'case-terminated', label: '案件终止/撤回' },
    { value: 'other-process', label: '改由其他流程处理' },
    { value: 'input-error', label: '录入错误' },
    { value: 'other', label: '其他（需备注）' },
  ];

  var REMINDER_TYPE_OPTIONS = [
    { value: 'residence-expiry', label: '在留到期' },
    { value: 'coe-expiry', label: 'COE 有效期' },
    { value: 'supplement-deadline', label: '补件截止' },
    { value: 'submission-deadline', label: '提交截止' },
    { value: 'billing-node', label: '收费节点' },
    { value: 'follow-up', label: '催办' },
  ];

  /**
   * 提醒天数冻结声明（03 §6.3F #6-#10, §11.1, §11.2）
   *
   * 在留到期：固定 180 / 90 / 30 天，不支持事务所自定义（高级配置后置）
   * COE 有效期：固定 30 / 7 天
   *
   * 去重口径（03 §5.3）：同一 case_id + reminder_type + days_before，
   *   若存在 todo/doing 状态的任务则不重复生成
   *
   * 提醒通过独立 Reminder 记录追踪，不在业务实体上加布尔位
   * 提醒生成失败时阻断归档（案件不得进入 S9）
   */
  var RESIDENCE_EXPIRY_REMINDER_DAYS = [180, 90, 30];
  var COE_EXPIRY_REMINDER_DAYS = [30, 7];
  var REMINDER_DEDUPE_KEY_PATTERN = 'case_id + reminder_type + days_before';

  var REMINDER_DAYS_PRESET = {
    'residence-expiry': RESIDENCE_EXPIRY_REMINDER_DAYS,
    'coe-expiry': COE_EXPIRY_REMINDER_DAYS,
  };

  var P0_REMINDER_NOT_IN_SCOPE = [
    'reminder-days-customizable',
    'external-channel-email',
    'external-channel-sms',
    'advanced-escalation-chain',
  ];

  var GROUPS = [
    { value: 'tokyo-1', label: '東京一組' },
    { value: 'tokyo-2', label: '東京二組' },
    { value: 'osaka', label: '大阪組' },
  ];

  var OWNERS = [
    { value: 'admin', label: 'Admin', initials: 'AD', bg: 'bg-gray-200', text: '' },
    { value: 'tom', label: 'Tom', initials: 'T', bg: 'bg-green-100', text: 'text-green-600' },
    { value: 'assistant-a', label: '助理 A', initials: 'A', bg: 'bg-gray-200', text: '' },
  ];

  var GROUP_LABEL_MAP = {};
  GROUPS.forEach(function (g) { GROUP_LABEL_MAP[g.value] = g.label; });

  var STATUS_LABEL_MAP = {};
  TASK_STATUS_OPTIONS.forEach(function (s) { STATUS_LABEL_MAP[s.value] = s.label; });

  var PRIORITY_LABEL_MAP = {};
  TASK_PRIORITY_OPTIONS.forEach(function (p) { PRIORITY_LABEL_MAP[p.value] = p.label; });

  var SOURCE_LABEL_MAP = {};
  TASK_SOURCE_OPTIONS.forEach(function (s) { SOURCE_LABEL_MAP[s.value] = s.label; });

  var REMINDER_TYPE_LABEL_MAP = {};
  REMINDER_TYPE_OPTIONS.forEach(function (r) { REMINDER_TYPE_LABEL_MAP[r.value] = r.label; });

  var STATUS_TRANSITIONS = {
    todo: ['doing', 'done', 'canceled'],
    doing: ['done', 'todo', 'canceled'],
    done: [],
    canceled: [],
  };

  // §5.3 + §6.3F-10: 提醒/任务去重口径
  var REMINDER_DEDUPE_RULE = {
    residence_expiry: 'case_id + reminder_type + days_before',
    coe_expiry: 'case_id + reminder_type + days_before',
    billing_collection: 'case_id + billing_plan_id + overdue_cycle_start',
    general_task: 'case_id + source_type + source_key（todo/doing 状态下不重复生成）',
  };

  window.TasksConfig = {
    TASK_STATUS_OPTIONS: TASK_STATUS_OPTIONS,
    TASK_PRIORITY_OPTIONS: TASK_PRIORITY_OPTIONS,
    TASK_SOURCE_OPTIONS: TASK_SOURCE_OPTIONS,
    CANCEL_REASON_OPTIONS: CANCEL_REASON_OPTIONS,
    REMINDER_TYPE_OPTIONS: REMINDER_TYPE_OPTIONS,

    GROUPS: GROUPS,
    OWNERS: OWNERS,

    GROUP_LABEL_MAP: GROUP_LABEL_MAP,
    STATUS_LABEL_MAP: STATUS_LABEL_MAP,
    PRIORITY_LABEL_MAP: PRIORITY_LABEL_MAP,
    SOURCE_LABEL_MAP: SOURCE_LABEL_MAP,
    REMINDER_TYPE_LABEL_MAP: REMINDER_TYPE_LABEL_MAP,
    STATUS_TRANSITIONS: STATUS_TRANSITIONS,

    RESIDENCE_EXPIRY_REMINDER_DAYS: RESIDENCE_EXPIRY_REMINDER_DAYS,
    COE_EXPIRY_REMINDER_DAYS: COE_EXPIRY_REMINDER_DAYS,
    REMINDER_DAYS_PRESET: REMINDER_DAYS_PRESET,
    REMINDER_DEDUPE_KEY_PATTERN: REMINDER_DEDUPE_KEY_PATTERN,
    REMINDER_DEDUPE_RULE: REMINDER_DEDUPE_RULE,
    P0_REMINDER_NOT_IN_SCOPE: P0_REMINDER_NOT_IN_SCOPE,

    TABLE_COLUMNS: [
      { key: 'taskName', label: '任务名称' },
      { key: 'case', label: '所属案件', responsive: 'md' },
      { key: 'group', label: '所属 Group', responsive: 'lg', width: '100px' },
      { key: 'owner', label: '责任人', responsive: 'md', width: '100px' },
      { key: 'priority', label: '优先级', width: '80px', align: 'center' },
      { key: 'deadline', label: '截止时间', responsive: 'md', width: '140px' },
      { key: 'status', label: '完成状态', width: '100px' },
      { key: 'source', label: '来源', responsive: 'lg', width: '100px' },
    ],

    FILTERS: [
      {
        key: 'status',
        allLabel: '完成状态：全部',
        options: TASK_STATUS_OPTIONS,
      },
      {
        key: 'deadline',
        allLabel: '截止范围：全部',
        options: [
          { value: 'today', label: '今日到期' },
          { value: 'overdue', label: '已逾期' },
        ],
      },
      {
        key: 'owner',
        allLabel: '责任人：全部',
        options: OWNERS,
      },
      {
        key: 'group',
        allLabel: '所属 Group：全部',
        options: GROUPS,
      },
    ],

    SEARCH_PLACEHOLDER: '搜索：任务名称 / 案件编号 / 责任人',

    WORKBENCH_VIEWS: [
      { id: 'my-todo', label: '我的待办', icon: 'clipboard-list', filterPreset: { owner: 'current', status: ['todo', 'doing'] } },
      { id: 'today-due', label: '今日到期', icon: 'clock', filterPreset: { deadline: 'today', status: ['todo', 'doing'] } },
      { id: 'overdue', label: '已逾期', icon: 'alert-triangle', filterPreset: { deadline: 'overdue', status: ['todo', 'doing'] } },
      { id: 'reminder-log', label: '提醒日志', icon: 'bell', switchPanel: true },
    ],

    BULK_ACTIONS: [
      {
        key: 'assign',
        label: '指派责任人',
        type: 'select',
        selectId: 'bulkAssignSelect',
        applyBtnId: 'bulkAssignApplyBtn',
        optionsFrom: 'OWNERS',
        placeholderOption: '选择责任人',
      },
      {
        key: 'deadline',
        label: '批量调整截止日',
        type: 'date',
        inputId: 'bulkDeadlineInput',
        applyBtnId: 'bulkDeadlineApplyBtn',
      },
      {
        key: 'complete',
        label: '批量收口',
        type: 'button',
        btnId: 'bulkCompleteBtn',
      },
      {
        key: 'cancel',
        label: '批量取消',
        type: 'button-with-reason',
        btnId: 'bulkCancelBtn',
        reasonOptions: CANCEL_REASON_OPTIONS,
      },
    ],

    FORM_FIELDS: [
      { id: 'fieldTaskName', key: 'taskName', label: '任务名称', type: 'text', required: true, placeholder: '请输入任务名称', grid: 'full' },
      { id: 'fieldCaseId', key: 'caseId', label: '关联案件', type: 'search-select', required: false, placeholder: '搜索案件编号或名称', grid: 'half' },
      { id: 'fieldGroup', key: 'group', label: '所属 Group', type: 'select', required: true, optionsFrom: 'GROUPS', placeholderOption: '请选择 Group', grid: 'half' },
      { id: 'fieldOwner', key: 'owner', label: '责任人', type: 'select', required: true, optionsFrom: 'OWNERS', placeholderOption: '请选择责任人', grid: 'half' },
      { id: 'fieldPriority', key: 'priority', label: '优先级', type: 'select', required: false, optionsFrom: 'TASK_PRIORITY_OPTIONS', defaultValue: 'medium', grid: 'half' },
      { id: 'fieldDeadline', key: 'deadline', label: '截止时间', type: 'datetime', required: true, grid: 'half' },
      { id: 'fieldSource', key: 'source', label: '来源', type: 'select', required: false, optionsFrom: 'TASK_SOURCE_OPTIONS', defaultValue: 'manual', grid: 'half' },
      { id: 'fieldDescription', key: 'description', label: '任务描述', type: 'textarea', required: false, placeholder: '可选，填写任务详细说明', grid: 'full' },
    ],

    CREATE_REQUIRED_IDS: ['fieldTaskName', 'fieldGroup', 'fieldOwner', 'fieldDeadline'],

    DETAIL_FIELDS: [
      { key: 'taskName', label: '任务名称' },
      { key: 'description', label: '任务描述' },
      { key: 'caseLabel', label: '关联案件', linkable: true },
      { key: 'owner', label: '责任人' },
      { key: 'deadline', label: '截止日' },
      { key: 'status', label: '完成状态' },
      { key: 'priority', label: '优先级' },
      { key: 'group', label: '所属 Group' },
      { key: 'source', label: '来源' },
      { key: 'auditLog', label: '操作记录', type: 'timeline' },
    ],

    REMINDER_LOG_COLUMNS: [
      { key: 'sentAt', label: '发送时间', width: '160px' },
      { key: 'recipient', label: '接收人', width: '100px' },
      { key: 'type', label: '提醒类型', width: '120px' },
      { key: 'status', label: '状态', width: '80px', align: 'center' },
      { key: 'failReason', label: '失败原因', responsive: 'md' },
      { key: 'taskName', label: '关联任务' },
    ],

    DEADLINE_TAG_CONFIG: [
      { id: 'overdue', label: '逾期', badgeClass: 'badge-danger', condition: 'deadline < today && status in [todo, doing]' },
      { id: 'today', label: '今日到期', badgeClass: 'badge-warning', condition: 'deadline == today && status in [todo, doing]' },
      { id: 'week', label: '本周到期', badgeClass: 'badge-blue', condition: 'deadline <= endOfWeek && status in [todo, doing]', note: '行内标签说明，非视图入口' },
    ],

    TOAST: {
      create:        { title: '任务已创建（示例）', desc: '已创建任务并关联案件' },
      complete:      { title: '任务已收口（示例）', desc: '任务已标记为完成' },
      cancel:        { title: '任务已取消（示例）', desc: '任务已取消，原因已记录' },
      bulkAssign:    { title: '批量指派（示例）', desc: '已选择 {count} 条，责任人：{value}' },
      bulkDeadline:  { title: '批量调整截止日（示例）', desc: '已选择 {count} 条，新截止日：{value}' },
      bulkComplete:  { title: '批量收口（示例）', desc: '已将 {count} 条任务标记为完成' },
      bulkCancel:    { title: '批量取消（示例）', desc: '已将 {count} 条任务取消' },
    },

    STATUS_BADGE_MAP: {
      todo: 'badge-gray',
      doing: 'badge-blue',
      done: 'badge-green',
      canceled: 'badge-gray',
    },

    PRIORITY_BADGE_MAP: {
      high: 'badge-danger',
      medium: 'badge-blue',
      low: '',
    },

    WORKBENCH_VIEW_STYLES: {
      active: 'flex items-center justify-between px-3 py-2 bg-white rounded-lg text-[var(--primary)] font-medium shadow-sm border border-[var(--border)]',
      inactive: 'flex items-center justify-between px-3 py-2 text-gray-600 hover:bg-white hover:rounded-lg transition-colors',
      reminderLogInactive: 'flex items-center justify-between px-3 py-2 text-gray-600 hover:bg-white hover:rounded-lg transition-colors mt-4',
    },
  };
})();
