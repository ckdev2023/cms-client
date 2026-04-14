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

  var CUSTOMERS = [
    {
      id: 'CUS-2026-0102',
      displayName: '张伟（就劳）',
      legalName: '张伟',
      kana: 'チョウ イ',
      nationality: '中国',
      phone: '090-1234-5678',
      email: 'zhang.w@email.com',
      referrer: '客户推荐',
      group: 'tokyo-1',
      owner: 'admin',
      note: '偏好 WeChat 联系；当前有更新与永住两条案件。',
      gender: '男',
      birthDate: '1991-03-14',
      avatar: { initials: '张', bg: 'bg-blue-100', text: 'text-blue-600' },
      lastContact: { date: '2026-03-28', channel: 'WeChat' },
      cases: { total: 2, active: 1, tags: ['技人国更新', '永住申请'] },
    },
    {
      id: 'CUS-2026-0120',
      displayName: '陈丽',
      legalName: '陈丽',
      kana: 'チン リ',
      nationality: '中国',
      phone: '080-2222-3333',
      email: 'chen.li@email.com',
      referrer: '紹介（渡辺様）',
      group: 'tokyo-2',
      owner: 'tom',
      note: '家族案件并行办理，偏好电话确认。',
      gender: '女',
      birthDate: '1993-08-22',
      avatar: { initials: '陈', bg: 'bg-emerald-100', text: 'text-emerald-700' },
      lastContact: { date: '2026-03-22', channel: '电话沟通' },
      cases: { total: 2, active: 2, tags: ['家族滞在更新', '资格外活动许可'] },
    },
    {
      id: 'CUS-2026-0128',
      displayName: '佐藤美咲（经营管理签）',
      legalName: '佐藤美咲',
      kana: 'サトウ ミサキ',
      nationality: '日本',
      phone: '070-8888-1208',
      email: 'misaki.sato@example.jp',
      referrer: '广告投放（经营管理签）',
      group: 'tokyo-1',
      owner: 'tom',
      note: '签约前承接客户；默认先发《2025M_C经管签信息表》。',
      gender: '女',
      birthDate: '1990-11-08',
      avatar: { initials: '佐', bg: 'bg-amber-100', text: 'text-amber-700' },
      lastContact: { date: '2026-04-09', channel: '邮件' },
      cases: { total: 0, active: 0, tags: [] },
      bmvProfile: {
        questionnaireName: '《2025M_C经管签信息表》',
        questionnaireStatus: 'not_sent',
        quoteStatus: 'pending',
        signStatus: 'pending',
        sourceLeadId: 'LEAD-BMV-2026-0031',
        visaPlan: '4年 + 1年经营计划',
        quoteAmount: '',
        nextStep: '发送问卷并等待客户回填',
        deliveryChannel: 'email',
      },
    },
    {
      id: 'CUS-2026-0136',
      displayName: '王欣怡（经营管理签）',
      legalName: '王欣怡',
      kana: 'オウ キンイ',
      nationality: '中国',
      phone: '080-5566-8899',
      email: 'xinyi.wang@example.com',
      referrer: '合作渠道（经营管理签）',
      group: 'tokyo-1',
      owner: 'tom',
      note: '已回收问卷，待确认报价与签约时间。',
      gender: '女',
      birthDate: '1988-06-17',
      avatar: { initials: '王', bg: 'bg-violet-100', text: 'text-violet-700' },
      lastContact: { date: '2026-04-11', channel: 'LINE' },
      cases: { total: 0, active: 0, tags: [] },
      bmvProfile: {
        questionnaireName: '《2025M_C经管签信息表》',
        questionnaireStatus: 'returned',
        quoteStatus: 'generated',
        signStatus: 'pending',
        sourceLeadId: 'LEAD-BMV-2026-0039',
        visaPlan: '4年 + 1年经营计划',
        quoteAmount: '¥420,000',
        nextStep: '确认报价并安排签约',
        deliveryChannel: 'line',
      },
    },
  ];

  var DETAIL = {
    relationTypes: [
      { value: 'spouse', label: '配偶' },
      { value: 'parent', label: '父母' },
      { value: 'child', label: '子女' },
      { value: 'agent', label: '代理 / 顾问' },
      { value: 'other', label: '其他' },
    ],
    commTypes: [
      { value: 'wechat', label: 'WeChat' },
      { value: 'phone', label: '电话' },
      { value: 'email', label: '邮件' },
      { value: 'meeting', label: '面谈' },
      { value: 'line', label: 'LINE' },
    ],
    visibilityOptions: [
      { value: 'internal', label: '仅内部' },
      { value: 'customer', label: '客户可见' },
    ],
    casesByCustomerId: {
      'CUS-2026-0102': [
        {
          id: 'CASE-2026-0412',
          name: '张伟｜技人国更新',
          type: '技人国更新',
          stage: '资料收集中',
          status: 'active',
          owner: '山田',
          createdAt: '2026-03-12',
          updatedAt: '2026-03-28',
        },
        {
          id: 'CASE-2025-1188',
          name: '张伟｜永住申请',
          type: '永住申请',
          stage: '已归档',
          status: 'archived',
          owner: '佐藤',
          createdAt: '2025-11-20',
          updatedAt: '2026-01-12',
        },
      ],
      'CUS-2026-0120': [
        {
          id: 'CASE-2026-0503',
          name: '陈丽｜家族滞在更新',
          type: '家族滞在更新',
          stage: '提交前确认',
          status: 'active',
          owner: '鈴木',
          createdAt: '2026-02-26',
          updatedAt: '2026-03-22',
        },
        {
          id: 'CASE-2026-0521',
          name: '陈丽｜资格外活动许可',
          type: '资格外活动许可',
          stage: '办理中',
          status: 'active',
          owner: '山田',
          createdAt: '2026-03-05',
          updatedAt: '2026-03-18',
        },
      ],
    },
    relationsByCustomerId: {
      'CUS-2026-0102': [
        {
          id: 'REL-0102-1',
          name: '刘婷',
          kana: 'リュウ テイ',
          relationType: 'spouse',
          phone: '080-1111-2233',
          email: 'liu.ting@email.com',
          tags: ['家属', '紧急联系人'],
          note: '可协助补件联络。',
        },
      ],
      'CUS-2026-0120': [
        {
          id: 'REL-0120-1',
          name: '渡辺一郎',
          kana: 'ワタナベ イチロウ',
          relationType: 'agent',
          phone: '03-4444-2211',
          email: 'watanabe@example.jp',
          tags: ['介绍人'],
          note: '持续转介绍家族案件。',
        },
      ],
    },
    commsByCustomerId: {
      'CUS-2026-0102': [
        {
          id: 'COM-0102-1',
          type: 'wechat',
          visibility: 'customer',
          occurredAt: '2026-03-28T11:30',
          actor: 'Admin',
          summary: '确认补件时间表',
          detail: '客户承诺下周前补齐在职证明与住民税课税证明。',
          nextAction: '2026-04-02 跟进资料到齐情况',
        },
      ],
      'CUS-2026-0120': [
        {
          id: 'COM-0120-1',
          type: 'phone',
          visibility: 'internal',
          occurredAt: '2026-03-22T16:10',
          actor: 'Tom',
          summary: '确认家属在留卡有效期',
          detail: '电话核对配偶及子女现有在留卡到期日。',
          nextAction: '等待扫描件上传',
        },
      ],
      'CUS-2026-0128': [
        {
          id: 'COM-0128-1',
          type: 'email',
          visibility: 'internal',
          occurredAt: '2026-04-09T10:20',
          actor: 'Tom',
          summary: '从线索池转入经营管理签客户详情',
          detail: '已确认客户进入签约前承接阶段，下一步发送《2025M_C经管签信息表》。',
          nextAction: '发送问卷并等待回收',
        },
      ],
      'CUS-2026-0136': [
        {
          id: 'COM-0136-1',
          type: 'line',
          visibility: 'customer',
          occurredAt: '2026-04-11T15:40',
          actor: 'Tom',
          summary: '确认问卷已回收并发送报价说明',
          detail: '客户已通过 LINE 回传信息表，现阶段等待确认报价与签约时间。',
          nextAction: '2 个工作日内确认签约安排',
        },
      ],
    },
    logsByCustomerId: {
      'CUS-2026-0102': [
        { id: 'LOG-0102-1', type: 'info', actor: 'Admin', at: '2026-03-28T11:35', message: '更新基础信息：电话、邮箱' },
      ],
      'CUS-2026-0120': [
        { id: 'LOG-0120-1', type: 'comm', actor: 'Tom', at: '2026-03-22T16:15', message: '新增沟通记录：电话 · 确认家属在留卡有效期（内部）' },
      ],
      'CUS-2026-0128': [
        { id: 'LOG-0128-1', type: 'info', actor: 'Tom', at: '2026-04-09T10:25', message: '初始化经营管理签签约前承接卡片' },
      ],
      'CUS-2026-0136': [
        { id: 'LOG-0136-1', type: 'info', actor: 'Tom', at: '2026-04-11T15:45', message: '经营管理签客户已进入报价待确认阶段' },
      ],
    },
  };

  window.CustomerConfig = {
    STORAGE_KEY: 'gyosei_os_customer_drafts_v1',
    DRAFT_ROW_ID_PREFIX: 'draft-row-',
    DETAIL_STORAGE_KEY: 'gyosei_os_customer_detail_store_v1',

    GROUPS: GROUPS,
    OWNERS: OWNERS,
    GROUP_LABEL_MAP: GROUP_LABEL_MAP,
    CUSTOMERS: CUSTOMERS,
    DETAIL: DETAIL,
    CURRENT_VIEWER: {
      role: 'owner',
      owner: 'tom',
      group: 'tokyo-1',
      label: 'Tom',
    },

    SCOPE_OPTIONS: [
      { value: 'mine', label: '我的', default: true },
      { value: 'group', label: '本组' },
      { value: 'all', label: '全所（管理员）' },
    ],

    TABLE_COLUMNS: [
      { key: 'customer', label: '客户' },
      { key: 'kana', label: 'フリガナ', responsive: 'md' },
      { key: 'cases', label: '案件', width: '140px', align: 'center' },
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
      { id: 'quickNationality', key: 'nationality', label: '国籍', type: 'text', required: true, placeholder: '例如：中国 / 日本', grid: 'full' },
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

    CREATE_REQUIRED_IDS: ['quickLegalName', 'quickGroup', 'quickNationality'],
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
