(function () {
  'use strict';

  var groups = [
    { value: 'tokyo-1', label: '东京一组' },
    { value: 'tokyo-2', label: '东京二组' },
    { value: 'osaka', label: '大阪组' },
  ];

  var owners = [
    { value: 'suzuki', label: 'Suzuki', initials: 'S', avatarClass: 'bg-sky-100 text-sky-700' },
    { value: 'tanaka', label: 'Tanaka', initials: 'T', avatarClass: 'bg-emerald-100 text-emerald-700' },
    { value: 'li', label: 'Li', initials: 'L', avatarClass: 'bg-violet-100 text-violet-700' },
    { value: 'sato', label: 'Sato', initials: 'Sa', avatarClass: 'bg-amber-100 text-amber-700' },
  ];

  var customers = [
    {
      id: 'CUS-2026-0181',
      name: '李娜',
      kana: 'リ ナ',
      group: 'tokyo-1',
      groupLabel: '东京一组',
      roleHint: '主申请人',
      summary: '家族滞在更新，已有客户档案与联系方式',
      contact: 'li.na@email.com / 080-1111-2222',
    },
    {
      id: 'CUS-2026-0187',
      name: '陈美',
      kana: 'チン メイ',
      group: 'tokyo-1',
      groupLabel: '东京一组',
      roleHint: '扶养者',
      summary: '适合家族签批量建案，已存在关联人',
      contact: 'chen.mei@email.com / 080-3333-4444',
    },
    {
      id: 'CUS-2026-0191',
      name: '王浩',
      kana: 'オウ コウ',
      group: 'tokyo-2',
      groupLabel: '东京二组',
      roleHint: '主申请人',
      summary: '技人国认定案件高频申请人画像',
      contact: 'wang.hao@email.com / 090-5555-6666',
    },
  ];

  var templates = [
    {
      id: 'family',
      label: '家族滞在',
      badge: 'P0 高频模板',
      applicationTypes: ['认定', '变更', '更新'],
      subtitle: '适合配偶/子女批量建案，自动展开扶养者/保证人资料。',
      helper: '支持 #family-bulk 直接进入批量模式。',
      requirementSummary: '主申请人、扶养者/保证人、事务所内部三段清单',
      exampleNameSuffix: '家族滞在认定',
      defaultDueDate: '2026-04-22',
      sections: [
        {
          title: '主申请人提供',
          items: [
            { id: 'app_passport', label: '护照首页', required: true },
            { id: 'app_photo', label: '证件照', required: true },
            { id: 'app_relation', label: '亲属关系证明', required: true },
          ],
        },
        {
          title: '扶养者 / 保证人提供',
          items: [
            { id: 'sponsor_residence', label: '在留卡', required: true },
            { id: 'sponsor_income', label: '课税/纳税证明', required: true },
            { id: 'sponsor_employer', label: '在职证明', required: false },
          ],
        },
        {
          title: '事务所内部产出',
          items: [
            { id: 'office_cover', label: '理由书草稿', required: true },
            { id: 'office_checklist', label: '提交包检查单', required: true },
          ],
        },
      ],
      familyScenario: {
        title: '家族签批量建案',
        summary: '一次为多个办理对象创建案件，并自动绑定扶养者/保证人。',
        roles: ['配偶', '子女', '扶养者', '保证人'],
        defaultDependents: [
          { name: '陈太太', role: '配偶', relation: '与主申请人共用扶养者材料' },
          { name: '陈小宝', role: '子女', relation: '沿用同一保证人资料清单' },
        ],
      },
    },
    {
      id: 'work',
      label: '技人国',
      badge: 'P0 高频模板',
      applicationTypes: ['认定', '变更', '更新'],
      subtitle: '适合雇主/职位信息驱动的工作类新案。',
      helper: '自动生成雇主资料与文书准备区块。',
      requirementSummary: '主申请人、雇主、事务所内部三段清单',
      exampleNameSuffix: '技人国认定',
      defaultDueDate: '2026-04-18',
      sections: [
        {
          title: '主申请人提供',
          items: [
            { id: 'work_passport', label: '护照首页', required: true },
            { id: 'work_resume', label: '履历书', required: true },
            { id: 'work_diploma', label: '学历/资格证明', required: true },
          ],
        },
        {
          title: '雇主提供',
          items: [
            { id: 'employer_offer', label: '雇佣合同', required: true },
            { id: 'employer_profile', label: '公司概要', required: true },
            { id: 'employer_finance', label: '决算资料', required: false },
          ],
        },
        {
          title: '事务所内部产出',
          items: [
            { id: 'office_reason', label: '申请理由书', required: true },
            { id: 'office_cover_work', label: '提出资料封面', required: true },
          ],
        },
      ],
      workScenario: {
        title: '雇主信息沉淀',
        summary: 'P0 不引入企业客户实体，先把公司与职位信息沉淀在案件字段中。',
        fields: ['公司名称', '职位名称', '年薪', '联系人邮箱', '联系人电话'],
      },
    },
  ];

  window.CaseCreateConfig = {
    groups: groups,
    owners: owners,
    customers: customers,
    templates: templates,
    defaultState: {
      templateId: 'family',
      applicationType: '认定',
      group: 'tokyo-1',
      owner: 'suzuki',
      dueDate: '2026-04-22',
      amount: '180000',
      customerId: 'CUS-2026-0187',
      createChecklist: true,
      createTasks: true,
      crossGroupReason: '',
      familyBulkMode: false,
    },
    toast: {
      created: {
        title: '案件已创建（示例）',
        desc: '已生成 Case 与资料清单草稿，可继续分派任务与补录资料。',
      },
      customerAdded: {
        title: '客户已加入（示例）',
        desc: '已回填到建案流程，可继续完善关联人与资料模板。',
      },
    },
  };
})();
