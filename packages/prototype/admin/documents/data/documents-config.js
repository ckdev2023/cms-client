(function () {
  'use strict';

  /**
   * P0 authoritative document status enum (7 values per P0/03 §3.2).
   *
   * Legacy codes (`done`, `idle`, `submitted`, `reviewed`, `missing`,
   * `pending`, `rejected`) are still present in older data and must pass
   * through COMPAT_STATUS_MAP before consumption.
   */
  var DOCUMENT_STATUS_OPTIONS = [
    { value: 'not_sent',            label: '未発出',       badge: 'badge-gray'   },
    { value: 'waiting_upload',      label: '待提交',       badge: 'badge-orange' },
    { value: 'uploaded_reviewing',  label: '已提交待审核', badge: 'badge-blue'   },
    { value: 'approved',            label: '通过',         badge: 'badge-green'  },
    { value: 'revision_required',   label: '退回补正',     badge: 'badge-red'    },
    { value: 'expired',             label: '过期',         badge: 'badge-red'    },
    { value: 'waived',              label: '无需提供',     badge: 'badge-gray'   },
  ];

  var PROVIDER_OPTIONS = [
    { value: 'main_applicant', label: '主申请人' },
    { value: 'guarantor', label: '扶養者/保証人' },
    { value: 'employer', label: '受入机関/企業担当' },
    { value: 'office', label: '事務所内部' },
  ];

  var WAIVE_REASON_OPTIONS = [
    { value: 'visa-type-exempt', label: '无需提供（该签证类型免除）' },
    { value: 'guarantor-exempt', label: '保证人为配偶/直系亲属（免除）' },
    { value: 'equivalent-exists', label: '客户已在其他案件提供等价材料' },
    { value: 'immigration-confirmed', label: '入管局确认免除' },
    { value: 'other', label: '其他', requiresNote: true },
  ];

  var STATUS_LABEL_MAP = {};
  DOCUMENT_STATUS_OPTIONS.forEach(function (s) { STATUS_LABEL_MAP[s.value] = s.label; });

  var STATUS_BADGE_MAP = {};
  DOCUMENT_STATUS_OPTIONS.forEach(function (s) { STATUS_BADGE_MAP[s.value] = s.badge; });

  var PROVIDER_LABEL_MAP = {};
  PROVIDER_OPTIONS.forEach(function (p) { PROVIDER_LABEL_MAP[p.value] = p.label; });

  var WAIVE_REASON_LABEL_MAP = {};
  WAIVE_REASON_OPTIONS.forEach(function (r) { WAIVE_REASON_LABEL_MAP[r.value] = r.label; });

  var STATUS_TRANSITIONS = {
    not_sent:           ['waiting_upload', 'waived'],
    waiting_upload:     ['uploaded_reviewing', 'waived'],
    uploaded_reviewing: ['approved', 'revision_required', 'waived'],
    approved:           ['expired', 'uploaded_reviewing'],
    revision_required:  ['uploaded_reviewing', 'waived'],
    expired:            ['uploaded_reviewing'],
    waived:             ['not_sent'],
  };

  var NON_SELECTABLE_STATUSES = ['approved', 'waived', 'expired'];

  var TABLE_COLUMNS = [
    { key: 'select', type: 'checkbox', width: '44px' },
    { key: 'docName', label: '资料名称', showAlways: true },
    { key: 'case', label: '所属案件', responsive: 'md' },
    { key: 'provider', label: '由谁提供', responsive: 'lg', width: '120px' },
    { key: 'status', label: '状态', width: '110px' },
    { key: 'deadline', label: '截止日', responsive: 'md', width: '120px' },
    { key: 'lastReminder', label: '最近催办', responsive: 'lg', width: '130px' },
    { key: 'relativePath', label: '归档位置', responsive: 'lg', width: '200px' },
  ];

  var FILTERS = [
    {
      key: 'status',
      allLabel: '全部状态',
      options: DOCUMENT_STATUS_OPTIONS,
    },
    {
      key: 'case',
      allLabel: '全部案件',
      options: [],
    },
    {
      key: 'provider',
      allLabel: '全部提供人',
      options: PROVIDER_OPTIONS,
    },
  ];

  var SEARCH_PLACEHOLDER = '搜索：资料名称 / 案件编号 / 案件名称';

  var BULK_ACTIONS = [
    { key: 'remind', label: '批量催办', btnId: 'bulkRemindBtn', type: 'button' },
    { key: 'approve', label: '批量审核通过', btnId: 'bulkApproveBtn', type: 'button' },
    { key: 'waive', label: '批量标记无需提供', btnId: 'bulkWaiveBtn', type: 'button-with-reason', reasonOptions: WAIVE_REASON_OPTIONS },
  ];

  var REGISTER_FORM_FIELDS = [
    { id: 'fieldRegCaseId', key: 'caseId', label: '关联案件', type: 'select', required: true, grid: 'half' },
    { id: 'fieldDocItemId', key: 'docItemId', label: '关联资料', type: 'select', required: true, grid: 'half' },
    { id: 'fieldRelativePath', key: 'relativePath', label: '归档位置', type: 'text', required: true, grid: 'full' },
    { id: 'fieldFileName', key: 'fileName', label: '资料说明', type: 'text', required: false, grid: 'half' },
    { id: 'fieldVersion', key: 'version', label: '版本号', type: 'readonly', required: false, grid: 'half' },
  ];

  var REGISTER_REQUIRED_IDS = ['fieldRegCaseId', 'fieldDocItemId', 'fieldRelativePath'];

  var RELATIVE_PATH_RULES = {
    forbiddenPatterns: ['..'],
    forbiddenLeadingChars: ['~', '/'],
    forbiddenCharsRegex: /[\x00-\x1f]/,
    allowedSeparator: '/',
    suggestedFormat: '{case_no}/{provider}/{doc_item_name}/{yyyymmdd}_{filename}',
    example: 'A2026-001/main_applicant/passport/20260409_passport.pdf',
    errorMessage: '请输入有效的相对路径（不含 .. 或绝对路径前缀）',
  };

  var TOAST = {
    approve:        { title: '审核通过（示例）', desc: '{docName} 已标记为审核通过' },
    reject:         { title: '退回补正（示例）', desc: '{docName} 已退回，原因已记录' },
    remind:         { title: '催办已发送（示例）', desc: '已发送催办提醒给 {provider}' },
    waive:          { title: '已标记无需提供（示例）', desc: '{docName} 已从完成率分母剔除' },
    register:       { title: '资料已登记（示例）', desc: '{fileName} 已登记，路径已保存' },
    reference:      { title: '使用成功（示例）', desc: '已从 {sourceCase} 带入 {sourceDoc}' },
    bulkRemind:     { title: '批量催办（示例）', desc: '已催办 {n} 项' },
    bulkApprove:    { title: '批量审核通过（示例）', desc: '已审核通过 {n} 项' },
    bulkWaive:      { title: '批量标记（示例）', desc: '已标记 {n} 项为无需提供' },
    copyPath:       { title: '已复制', desc: '归档位置已复制到剪贴板' },
    addItem:        { title: '资料已新增（示例）', desc: '已在 {caseName} 新增资料' },
  };

  var STATUS_SORT_PRIORITY = {
    uploaded_reviewing: 0,
    revision_required:  1,
    expired:            2,
    waiting_upload:     3,
    not_sent:           4,
    approved:           5,
    waived:             6,
  };

  /**
   * Maps legacy document statuses to P0 authoritative keys (P0/03 §3.2).
   *
   * Legacy → P0:
   *   done     → approved            (office internal item completed)
   *   idle     → not_sent            (not started, no request sent)
   *   submitted→ uploaded_reviewing   (uploaded, pending review)
   *   reviewed → approved            (review passed)
   *   rejected → revision_required   (review failed)
   *   pending  → waiting_upload      (requested but not yet uploaded)
   *   missing  → not_sent            (nothing provided)
   *
   * Identity mappings included so the normalizer is idempotent.
   */
  var COMPAT_STATUS_MAP = {
    done:       'approved',
    idle:       'not_sent',
    submitted:  'uploaded_reviewing',
    reviewed:   'approved',
    rejected:   'revision_required',
    pending:    'waiting_upload',
    missing:    'not_sent',
    not_sent:           'not_sent',
    waiting_upload:     'waiting_upload',
    uploaded_reviewing: 'uploaded_reviewing',
    approved:           'approved',
    revision_required:  'revision_required',
    expired:            'expired',
    waived:             'waived',
  };

  /**
   * Normalize a raw document status code through the compat layer.
   *
   * @param {string} raw - raw status from demo data (may be legacy or P0)
   * @returns {string} P0 authoritative status code
   */
  function normalizeDocStatus(raw) {
    if (!raw) return 'not_sent';
    return COMPAT_STATUS_MAP[raw] || raw;
  }

  var P0_NOT_IN_SCOPE = [
    'full-cross-case-center',
    'reuse-management-ui',
    'advanced-filters',
    'file-upload',
    'file-preview',
    'folder-tree',
    'template-management',
    'grid-view',
    'tag-management',
    'batch-export',
  ];

  window.DocumentsConfig = {
    DOCUMENT_STATUS_OPTIONS: DOCUMENT_STATUS_OPTIONS,
    PROVIDER_OPTIONS: PROVIDER_OPTIONS,
    WAIVE_REASON_OPTIONS: WAIVE_REASON_OPTIONS,

    STATUS_LABEL_MAP: STATUS_LABEL_MAP,
    STATUS_BADGE_MAP: STATUS_BADGE_MAP,
    PROVIDER_LABEL_MAP: PROVIDER_LABEL_MAP,
    WAIVE_REASON_LABEL_MAP: WAIVE_REASON_LABEL_MAP,

    STATUS_TRANSITIONS: STATUS_TRANSITIONS,
    NON_SELECTABLE_STATUSES: NON_SELECTABLE_STATUSES,

    TABLE_COLUMNS: TABLE_COLUMNS,
    FILTERS: FILTERS,
    SEARCH_PLACEHOLDER: SEARCH_PLACEHOLDER,
    BULK_ACTIONS: BULK_ACTIONS,

    REGISTER_FORM_FIELDS: REGISTER_FORM_FIELDS,
    REGISTER_REQUIRED_IDS: REGISTER_REQUIRED_IDS,
    RELATIVE_PATH_RULES: RELATIVE_PATH_RULES,

    TOAST: TOAST,
    STATUS_SORT_PRIORITY: STATUS_SORT_PRIORITY,
    COMPAT_STATUS_MAP: COMPAT_STATUS_MAP,
    normalizeDocStatus: normalizeDocStatus,
    P0_NOT_IN_SCOPE: P0_NOT_IN_SCOPE,
  };
})();
