/**
 * Leads List — declarative config, sample data & demo scenario matrix.
 * Source of truth for index.html; scripts/leads-page.js reads this at runtime.
 *
 * Covers:
 *   - Lead status enum (6 states, 03 §3.6)
 *   - Groups / Owners
 *   - Table column definitions (11 columns, 咨询线索.md §2.1)
 *   - Filter options (§2.2)
 *   - Batch action definitions (§2.3)
 *   - Create-lead form field schema (§4)
 *   - Dedup hint presets (03 §2.6)
 *   - Toast feedback templates
 *   - 8 required demo scenario rows (SPEC-GAP-MATRIX §8)
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  LEAD STATUS ENUM  (03 §3.6)                                        */
  /* ------------------------------------------------------------------ */

  var LEAD_STATUSES = [
    { value: 'new',          label: '新咨询',       badge: 'badge-warning',  dotColor: 'warning',  textClass: 'text-amber-600' },
    { value: 'following',    label: '跟进中',       badge: 'badge-primary',  dotColor: 'primary',  textClass: 'text-sky-600' },
    { value: 'pending_sign', label: '待签约',       badge: 'badge-purple',   dotColor: 'purple',   textClass: 'text-violet-600' },
    { value: 'signed',       label: '已签约',       badge: 'badge-success',  dotColor: 'success',  textClass: 'text-emerald-600' },
    { value: 'lost',         label: '已流失',       badge: 'badge-gray',     dotColor: 'muted',    textClass: 'text-gray-400' },
  ];

  var LEAD_STATUS_MAP = {};
  LEAD_STATUSES.forEach(function (s) { LEAD_STATUS_MAP[s.value] = s; });

  /* ------------------------------------------------------------------ */
  /*  GROUPS & OWNERS                                                     */
  /* ------------------------------------------------------------------ */

  var GROUPS = [
    { value: 'tokyo-1', label: '东京一组' },
    { value: 'tokyo-2', label: '东京二组' },
    { value: 'osaka',   label: '大阪组' },
  ];

  var OWNERS = [
    { value: 'suzuki', label: 'Suzuki', initials: 'S',  avatarClass: 'bg-sky-100 text-sky-700' },
    { value: 'tanaka', label: 'Tanaka', initials: 'T',  avatarClass: 'bg-emerald-100 text-emerald-700' },
    { value: 'sato',   label: 'Sato',   initials: 'Sa', avatarClass: 'bg-amber-100 text-amber-700' },
  ];

  var GROUP_LABEL_MAP = {};
  GROUPS.forEach(function (g) { GROUP_LABEL_MAP[g.value] = g.label; });

  var OWNER_MAP = {};
  OWNERS.forEach(function (o) { OWNER_MAP[o.value] = o; });

  /* ------------------------------------------------------------------ */
  /*  BUSINESS TYPES                                                      */
  /* ------------------------------------------------------------------ */

  var BUSINESS_TYPES = [
    { value: 'highly-skilled',   label: '高度人才' },
    { value: 'work-visa',        label: '技人国' },
    { value: 'family-stay',      label: '家族滞在' },
    { value: 'business-manager', label: '设立法人' },
    { value: 'permanent',        label: '永住' },
    { value: 'other',            label: '其他' },
  ];

  /* ------------------------------------------------------------------ */
  /*  LEAD SOURCES                                                        */
  /* ------------------------------------------------------------------ */

  var LEAD_SOURCES = [
    { value: 'web',      label: 'Web' },
    { value: 'referral', label: '介绍' },
    { value: 'walkin',   label: '来访' },
    { value: 'phone',    label: '电话' },
    { value: 'other',    label: '其他' },
  ];

  /* ------------------------------------------------------------------ */
  /*  PREFERRED LANGUAGES  (demo extra, not spec-required)                */
  /* ------------------------------------------------------------------ */

  var LANGUAGES = [
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
    { value: 'vi', label: 'Tiếng Việt' },
  ];

  /* ------------------------------------------------------------------ */
  /*  TABLE COLUMNS  (咨询线索.md §2.1, 11 columns)                      */
  /* ------------------------------------------------------------------ */

  var TABLE_COLUMNS = [
    { key: 'id',             label: '线索编号',       width: '120px' },
    { key: 'name',           label: '联系人姓名' },
    { key: 'contact',        label: '电话 / 邮箱',    responsive: 'md' },
    { key: 'businessType',   label: '意向业务',       responsive: 'md', width: '100px' },
    { key: 'source',         label: '来源',           responsive: 'lg', width: '100px' },
    { key: 'status',         label: '当前状态',       width: '110px' },
    { key: 'owner',          label: '负责人',         responsive: 'md', width: '100px' },
    { key: 'group',          label: '所属 Group',     responsive: 'lg', width: '100px' },
    { key: 'nextAction',     label: '下一步动作',     responsive: 'lg' },
    { key: 'nextFollowUp',   label: '下次跟进',       responsive: 'md', width: '110px' },
    { key: 'updatedAt',      label: '最近更新',       width: '110px' },
  ];

  /* ------------------------------------------------------------------ */
  /*  FILTERS  (咨询线索.md §2.2)                                        */
  /* ------------------------------------------------------------------ */

  var FILTERS = [
    {
      key: 'status',
      allLabel: '状态：全部',
      options: LEAD_STATUSES,
    },
    {
      key: 'owner',
      allLabel: '负责人：全部',
      options: OWNERS,
    },
    {
      key: 'group',
      allLabel: 'Group：全部',
      options: GROUPS,
    },
    {
      key: 'businessType',
      allLabel: '业务类型：全部',
      options: BUSINESS_TYPES,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  BATCH ACTIONS  (咨询线索.md §2.3)                                   */
  /* ------------------------------------------------------------------ */

  var BULK_ACTIONS = [
    {
      key: 'assign',
      label: '批量指派负责人',
      controlType: 'select',
      controlId: 'bulkAssignSelect',
      applyBtnId: 'bulkAssignApplyBtn',
      optionsFrom: 'OWNERS',
      placeholderOption: '选择负责人',
      toastTitle: '批量指派负责人（示例）',
      toastDescTpl: '已选择 {count} 条，负责人：{value}',
    },
    {
      key: 'followUpDate',
      label: '批量调整跟进时间',
      controlType: 'datetime',
      controlId: 'bulkFollowUpInput',
      applyBtnId: 'bulkFollowUpApplyBtn',
      toastTitle: '批量调整跟进时间（示例）',
      toastDescTpl: '已选择 {count} 条，下次跟进：{value}',
    },
    {
      key: 'status',
      label: '批量标记状态',
      controlType: 'select',
      controlId: 'bulkStatusSelect',
      applyBtnId: 'bulkStatusApplyBtn',
      optionsFrom: 'LEAD_STATUSES',
      placeholderOption: '选择状态',
      toastTitle: '批量标记状态（示例）',
      toastDescTpl: '已选择 {count} 条，状态已更新为：{value}',
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  CREATE-LEAD FORM FIELDS  (咨询线索.md §4 + P0-CONTRACT §5)          */
  /* ------------------------------------------------------------------ */

  var FORM_FIELDS = [
    { id: 'leadName',           key: 'name',           label: '联系人姓名',     type: 'text',           required: true,          placeholder: '请输入姓名',            grid: 'full' },
    { id: 'leadPhone',          key: 'phone',          label: '电话',           type: 'tel',            required: 'conditional', placeholder: '手机/座机',              grid: 'half', hint: '电话/邮箱至少填写一项' },
    { id: 'leadEmail',          key: 'email',          label: '邮箱',           type: 'email',          required: 'conditional', placeholder: '邮箱地址',               grid: 'half' },
    { id: 'leadSource',         key: 'source',         label: '来源',           type: 'select',         required: false,         optionsFrom: 'LEAD_SOURCES',           placeholderOption: '请选择来源', grid: 'half' },
    { id: 'leadReferrer',       key: 'referrer',       label: '介绍人',         type: 'text',           required: false,         placeholder: '介绍人名称',             grid: 'half', showWhen: { field: 'source', value: 'referral' } },
    { id: 'leadBusinessType',   key: 'businessType',   label: '意向业务类型',   type: 'select',         required: false,         optionsFrom: 'BUSINESS_TYPES',         placeholderOption: '请选择业务类型', grid: 'half' },
    { id: 'leadGroup',          key: 'group',          label: '归属 Group',     type: 'select',         required: false,         optionsFrom: 'GROUPS',                 placeholderOption: '请选择 Group', grid: 'half' },
    { id: 'leadOwner',          key: 'owner',          label: '负责人',         type: 'select',         required: false,         optionsFrom: 'OWNERS',                 placeholderOption: '请选择负责人', grid: 'half' },
    { id: 'leadNextAction',     key: 'nextAction',     label: '下一步动作',     type: 'text',           required: false,         placeholder: '例如：电话确认意向',     grid: 'full' },
    { id: 'leadNextFollowUp',   key: 'nextFollowUp',   label: '下次跟进时间',   type: 'datetime-local', required: false,         grid: 'half' },
    { id: 'leadLanguage',       key: 'language',        label: '首选语言',       type: 'select',         required: false,         optionsFrom: 'LANGUAGES',              placeholderOption: '请选择语言', grid: 'half' },
    { id: 'leadNote',           key: 'note',           label: '备注',           type: 'textarea',       required: false,         placeholder: '例如：紧急度、特殊情况', grid: 'full' },
  ];

  var CREATE_REQUIRED_IDS = ['leadName'];
  var CREATE_CONTACT_IDS  = ['leadPhone', 'leadEmail'];
  var DEDUPE_TRIGGER_IDS  = ['leadPhone', 'leadEmail'];

  /* ------------------------------------------------------------------ */
  /*  DEDUP PRESETS  (03 §2.6, SPEC-GAP-MATRIX §3.4 M.12)                */
  /* ------------------------------------------------------------------ */

  var DEDUP_PRESETS = {
    phoneMatchLead: {
      type: 'lead',
      matchField: 'phone',
      matchValue: '080-1234-5678',
      matchedRecord: {
        id: 'LEAD-2026-0023',
        name: '田中 花子',
        phone: '080-1234-5678',
        group: '东京一组',
        status: 'following',
        statusLabel: '跟进中',
      },
      message: '该电话号码已存在于线索 LEAD-2026-0023（田中 花子），请确认是否继续创建。',
    },
    emailMatchCustomer: {
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
      message: '该邮箱已存在于客户 CUS-2026-0181（李娜），请确认是否继续创建新线索。',
    },
  };

  /* ------------------------------------------------------------------ */
  /*  TOAST PRESETS                                                       */
  /* ------------------------------------------------------------------ */

  var TOASTS = {
    leadCreated:       { title: '已创建',                      desc: '新线索已添加到列表' },
    contactMissing:    { title: '无法创建',                    desc: '请至少填写电话或邮箱' },
    nameMissing:       { title: '无法创建',                    desc: '请填写联系人姓名' },
    bulkAssign:        { title: '批量指派负责人（示例）',      desc: '已选择 {count} 条，负责人：{value}' },
    bulkFollowUp:      { title: '批量调整跟进时间（示例）',    desc: '已选择 {count} 条，下次跟进：{value}' },
    bulkStatus:        { title: '批量标记状态（示例）',        desc: '已选择 {count} 条，状态已更新为：{value}' },
    dedupHit:          { title: '检测到可能重复',              desc: '电话/邮箱匹配到已有记录，请确认' },
    conversionSuccess: { title: '转化成功（示例）',            desc: '已创建客户/案件，可在详情页查看' },
    detailUnavailable: { title: '详情页建设中',                desc: '详情页尚未就绪，请稍后再试' },
  };

  /* ------------------------------------------------------------------ */
  /*  SEARCH CONFIG                                                       */
  /* ------------------------------------------------------------------ */

  var SEARCH_PLACEHOLDER = '搜索：姓名 / 电话 / 邮箱 / 编号';

  var SEARCH_FIELDS = ['id', 'name', 'phone', 'email', 'businessTypeLabel'];

  /* ------------------------------------------------------------------ */
  /*  DEMO SCENARIO MATRIX  (SPEC-GAP-MATRIX §8 — 8 required rows)       */
  /*                                                                      */
  /*  Row highlight rules:                                                */
  /*    - signed + !convertedCustomerId → warning highlight row           */
  /*    - lost → dimmed row (opacity 0.55)                                */
  /* ------------------------------------------------------------------ */

  var LEAD_SAMPLES = [

    /* D.1 — 新咨询 */
    {
      id: 'LEAD-2026-0042',
      name: 'Michael Thompson',
      phone: '090-8765-4321',
      email: 'michael.t@email.com',
      businessType: 'work-visa',
      businessTypeLabel: '技人国',
      source: 'web',
      sourceLabel: 'Web',
      referrer: '',
      status: 'new',
      ownerId: 'suzuki',
      groupId: 'tokyo-1',
      nextAction: '电话确认意向与签证类别',
      nextFollowUp: '2026-04-10',
      nextFollowUpLabel: '04-10',
      updatedAt: '2026-04-08',
      updatedAtLabel: '今天 15:30',
      convertedCustomerId: null,
      convertedCaseId: null,
      dedupHint: null,
      rowHighlight: null,
    },

    /* D.2 — 跟进中 */
    {
      id: 'LEAD-2026-0035',
      name: '李华',
      phone: '080-2222-3333',
      email: 'li.hua@email.com',
      businessType: 'family-stay',
      businessTypeLabel: '家族滞在',
      source: 'referral',
      sourceLabel: '介绍',
      referrer: '佐藤弁護士',
      status: 'following',
      ownerId: 'tanaka',
      groupId: 'tokyo-1',
      nextAction: '邮件发送材料清单，确认扶养者信息',
      nextFollowUp: '2026-04-12',
      nextFollowUpLabel: '04-12',
      updatedAt: '2026-04-07',
      updatedAtLabel: '昨天 11:20',
      convertedCustomerId: null,
      convertedCaseId: null,
      dedupHint: null,
      rowHighlight: null,
    },

    /* D.3 — 待签约 */
    {
      id: 'LEAD-2026-0028',
      name: '田中 太郎',
      phone: '070-5555-6666',
      email: 'tanaka.t@email.com',
      businessType: 'business-manager',
      businessTypeLabel: '设立法人',
      source: 'walkin',
      sourceLabel: '来访',
      referrer: '',
      status: 'pending_sign',
      ownerId: 'sato',
      groupId: 'osaka',
      nextAction: '面谈确认签约条件与费用',
      nextFollowUp: '2026-04-11',
      nextFollowUpLabel: '04-11',
      updatedAt: '2026-04-06',
      updatedAtLabel: '04-06 17:00',
      convertedCustomerId: null,
      convertedCaseId: null,
      dedupHint: null,
      rowHighlight: null,
    },

    /* D.4 — 已签约（正常转化完成） */
    {
      id: 'LEAD-2026-0015',
      name: '王 明',
      phone: '080-7777-8888',
      email: 'wang.ming@email.com',
      businessType: 'work-visa',
      businessTypeLabel: '技人国',
      source: 'referral',
      sourceLabel: '介绍',
      referrer: '山田商事',
      status: 'signed',
      ownerId: 'suzuki',
      groupId: 'tokyo-2',
      nextAction: '',
      nextFollowUp: '',
      nextFollowUpLabel: '—',
      updatedAt: '2026-04-02',
      updatedAtLabel: '04-02',
      convertedCustomerId: 'CUS-2026-0195',
      convertedCaseId: 'CAS-2026-0210',
      dedupHint: null,
      rowHighlight: null,
    },

    /* D.5 — 已流失 */
    {
      id: 'LEAD-2026-0019',
      name: '佐藤 美咲',
      phone: '090-4444-1111',
      email: 'sato.misaki@email.com',
      businessType: 'permanent',
      businessTypeLabel: '永住',
      source: 'phone',
      sourceLabel: '电话',
      referrer: '',
      status: 'lost',
      ownerId: 'tanaka',
      groupId: 'tokyo-1',
      nextAction: '',
      nextFollowUp: '',
      nextFollowUpLabel: '—',
      updatedAt: '2026-03-28',
      updatedAtLabel: '03-28',
      convertedCustomerId: null,
      convertedCaseId: null,
      dedupHint: null,
      rowHighlight: 'dimmed',
    },

    /* D.6 — 已签约未转化 (warning highlight) */
    {
      id: 'LEAD-2026-0022',
      name: '陈 大伟',
      phone: '080-9999-0000',
      email: 'chen.dw@email.com',
      businessType: 'family-stay',
      businessTypeLabel: '家族滞在',
      source: 'web',
      sourceLabel: 'Web',
      referrer: '',
      status: 'signed',
      ownerId: 'suzuki',
      groupId: 'tokyo-1',
      nextAction: '请尽快完成客户建档与案件创建',
      nextFollowUp: '2026-04-09',
      nextFollowUpLabel: '04-09',
      updatedAt: '2026-04-05',
      updatedAtLabel: '04-05',
      convertedCustomerId: null,
      convertedCaseId: null,
      dedupHint: null,
      rowHighlight: 'warning',
      warningText: '已签约未转化：请完成客户/案件创建',
    },

    /* D.7 — 新建时触发去重：电话匹配已有 Lead */
    {
      id: 'LEAD-2026-0046',
      name: '田中 花子',
      phone: '080-1234-5678',
      email: '',
      businessType: 'highly-skilled',
      businessTypeLabel: '高度人才',
      source: 'phone',
      sourceLabel: '电话',
      referrer: '',
      status: 'new',
      ownerId: 'sato',
      groupId: 'osaka',
      nextAction: '确认重复后联系本人',
      nextFollowUp: '2026-04-14',
      nextFollowUpLabel: '04-14',
      updatedAt: '2026-04-09',
      updatedAtLabel: '今天 09:15',
      convertedCustomerId: null,
      convertedCaseId: null,
      dedupHint: 'phoneMatchLead',
      rowHighlight: null,
    },

    /* D.8 — 新建时触发去重：邮箱匹配已有 Customer */
    {
      id: 'LEAD-2026-0047',
      name: '李娜（重复确认）',
      phone: '',
      email: 'li.na@email.com',
      businessType: 'family-stay',
      businessTypeLabel: '家族滞在',
      source: 'web',
      sourceLabel: 'Web',
      referrer: '',
      status: 'new',
      ownerId: 'tanaka',
      groupId: 'tokyo-1',
      nextAction: '与既有客户合并确认',
      nextFollowUp: '2026-04-13',
      nextFollowUpLabel: '04-13',
      updatedAt: '2026-04-09',
      updatedAtLabel: '今天 10:00',
      convertedCustomerId: null,
      convertedCaseId: null,
      dedupHint: 'emailMatchCustomer',
      rowHighlight: null,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  SCOPE OPTIONS  (demo-only visibility)                               */
  /* ------------------------------------------------------------------ */

  var SCOPE_OPTIONS = [
    { value: 'mine',  label: '我的',           default: true },
    { value: 'group', label: '本组' },
    { value: 'all',   label: '全所（管理员）' },
  ];

  /* ------------------------------------------------------------------ */
  /*  EXPORT                                                              */
  /* ------------------------------------------------------------------ */

  window.LeadsConfig = {
    LEAD_STATUSES: LEAD_STATUSES,
    LEAD_STATUS_MAP: LEAD_STATUS_MAP,

    GROUPS: GROUPS,
    OWNERS: OWNERS,
    GROUP_LABEL_MAP: GROUP_LABEL_MAP,
    OWNER_MAP: OWNER_MAP,

    BUSINESS_TYPES: BUSINESS_TYPES,
    LEAD_SOURCES: LEAD_SOURCES,
    LANGUAGES: LANGUAGES,

    TABLE_COLUMNS: TABLE_COLUMNS,
    FILTERS: FILTERS,
    BULK_ACTIONS: BULK_ACTIONS,

    FORM_FIELDS: FORM_FIELDS,
    CREATE_REQUIRED_IDS: CREATE_REQUIRED_IDS,
    CREATE_CONTACT_IDS: CREATE_CONTACT_IDS,
    DEDUPE_TRIGGER_IDS: DEDUPE_TRIGGER_IDS,

    DEDUP_PRESETS: DEDUP_PRESETS,
    TOASTS: TOASTS,

    SEARCH_PLACEHOLDER: SEARCH_PLACEHOLDER,
    SEARCH_FIELDS: SEARCH_FIELDS,
    SCOPE_OPTIONS: SCOPE_OPTIONS,

    LEAD_SAMPLES: LEAD_SAMPLES,
  };
})();
