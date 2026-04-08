(function () {
  'use strict';

  var GROUPS = [
    { value: 'tokyo-1', label: '东京一组' },
    { value: 'tokyo-2', label: '东京二组' },
    { value: 'osaka', label: '大阪组' },
  ];

  var OWNERS = [
    { value: 'admin', label: 'Admin', initials: 'AD', bg: 'bg-gray-200', text: '' },
    { value: 'tom', label: 'Tom', initials: 'T', bg: 'bg-green-100', text: 'text-green-600' },
    { value: 'assistant-a', label: '助理 A', initials: 'A', bg: 'bg-gray-200', text: '' },
  ];

  var GROUP_LABEL_MAP = {};
  GROUPS.forEach(function (g) { GROUP_LABEL_MAP[g.value] = g.label; });

  window.CustomerConfig = {
    STORAGE_KEY: 'gyosei_os_customer_drafts_v1',
    DRAFT_ROW_ID_PREFIX: 'draft-row-',

    GROUPS: GROUPS,
    OWNERS: OWNERS,
    GROUP_LABEL_MAP: GROUP_LABEL_MAP,

    SCOPE_OPTIONS: [
      { value: 'mine', label: '我的', default: true },
      { value: 'group', label: '本组' },
      { value: 'all', label: '全所（管理员）' },
    ],

    TABLE_COLUMNS: [
      { key: 'customer', label: '客户' },
      { key: 'kana', label: 'フリガナ', responsive: 'md' },
      { key: 'totalCases', label: '累计案件', width: '80px', align: 'center' },
      { key: 'activeCases', label: '活跃案件', width: '80px', align: 'center' },
      { key: 'lastContact', label: '最近联系', responsive: 'md', width: '120px' },
      { key: 'owner', label: '负责人', responsive: 'md', width: '100px' },
      { key: 'referrer', label: '介绍人/来源', responsive: 'lg', width: '110px' },
      { key: 'group', label: '所属分组', responsive: 'lg', width: '100px' },
    ],

    FILTERS: [
      {
        key: 'group',
        allLabel: '所属分组：全部',
        options: GROUPS,
      },
      {
        key: 'owner',
        allLabel: '负责人：全部',
        options: OWNERS,
      },
      {
        key: 'activeCases',
        allLabel: '活跃案件：全部',
        options: [
          { value: 'has', label: '有活跃案件' },
          { value: 'none', label: '无活跃案件' },
        ],
      },
    ],

    SEARCH_PLACEHOLDER: '搜索：客户名 / フリガナ / 电话 / 邮箱',

    FORM_FIELDS: [
      { id: 'quickDisplayName', key: 'displayName', label: '识别名（对内显示）', type: 'text', required: false, placeholder: '例如：王伟（就劳）', grid: 'half' },
      { id: 'quickGroup', key: 'group', label: '所属 Group', type: 'select', required: true, optionsFrom: 'GROUPS', placeholderOption: '请选择 Group', grid: 'half' },
      { id: 'quickLegalName', key: 'legalName', label: '姓名（法定）', type: 'text', required: true, placeholder: '请输入姓名', grid: 'half' },
      { id: 'quickKana', key: 'kana', label: '假名（片假名）', type: 'text', required: false, placeholder: '例如：ワン ウェイ', grid: 'half' },
      { id: 'quickGender', key: 'gender', label: '性別', type: 'select', required: false, options: [{ value: '', label: '不限' }, { value: '男', label: '男' }, { value: '女', label: '女' }], grid: 'half' },
      { id: 'quickBirthDate', key: 'birthDate', label: '生年月日', type: 'date', required: false, grid: 'half' },
      { id: 'quickNationality', key: 'nationality', label: '国籍', type: 'text', required: false, placeholder: '例如：中国 / 日本', grid: 'full' },
      { id: 'quickPhone', key: 'phone', label: '电话', type: 'tel', required: 'conditional', placeholder: '手机/座机', hint: '电话/邮箱至少填写一项（用于去重与联系）', grid: 'half' },
      { id: 'quickEmail', key: 'email', label: '邮箱', type: 'email', required: 'conditional', placeholder: '邮箱地址', grid: 'half' },
      { id: 'quickReferrer', key: 'referrer', label: '来源 / 介绍人', type: 'text', required: false, placeholder: '例如：推荐 / 介绍人', grid: 'full' },
      { id: 'quickAvatar', key: 'avatar', label: '头像', type: 'file', required: false, grid: 'half' },
      { id: 'quickNote', key: 'note', label: '备注（可搜索）', type: 'text', required: false, placeholder: '例如：交接事项、偏好、注意点...', grid: 'half' },
    ],

    SERIALIZE_FIELDS: [
      { id: 'quickDisplayName', key: 'displayName' },
      { id: 'quickLegalName', key: 'legalName' },
      { id: 'quickKana', key: 'kana' },
      { id: 'quickGroup', key: 'group' },
      { id: 'quickGender', key: 'gender' },
      { id: 'quickBirthDate', key: 'birthDate' },
      { id: 'quickNationality', key: 'nationality' },
      { id: 'quickPhone', key: 'phone' },
      { id: 'quickEmail', key: 'email' },
      { id: 'quickReferrer', key: 'referrer' },
      { id: 'quickNote', key: 'note' },
    ],

    CREATE_REQUIRED_IDS: ['quickLegalName', 'quickGroup'],
    CREATE_CONTACT_IDS: ['quickPhone', 'quickEmail'],
    DEDUPE_TRIGGER_IDS: ['quickPhone', 'quickEmail'],

    BULK_ACTIONS: [
      {
        key: 'assign',
        label: '指派负责人',
        selectId: 'bulkAssignSelect',
        applyBtnId: 'bulkAssignApplyBtn',
        optionsFrom: 'OWNERS',
        placeholderOption: '选择负责人',
        toastTitle: '批量指派（示例）',
        toastDescTpl: '已选择 {count} 条，负责人：{value}',
      },
      {
        key: 'group',
        label: '调整分组',
        selectId: 'bulkGroupSelect',
        applyBtnId: 'bulkGroupApplyBtn',
        optionsFrom: 'GROUPS',
        placeholderOption: '选择分组',
        toastTitle: '批量调整分组（示例）',
        toastDescTpl: '已选择 {count} 条，分组：{value}（需留痕）',
      },
    ],

    TOAST: {
      customerCreated: { title: '客户已创建（示例）', desc: '已生成客户档案，可继续建案' },
      draftSaved: { title: '草稿已保存', desc: '可在客户列表中点击"继续"完成建档' },
      draftLoaded: { title: '已载入草稿', desc: '继续完善后即可完成建档' },
    },
  };
})();
