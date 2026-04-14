import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = {
  addEventListener() {},
};

await import('./case-create-helpers.js');
await import('./case-create-view-models.js');
await import('./case-create-page.js');

const helpers = globalThis.CaseCreateHelpers;
const utils = globalThis.CaseCreatePageUtils;

test('createEmptyWorkDetails 返回完整的技人国雇主字段骨架', () => {
  assert.deepEqual(helpers.createEmptyWorkDetails(), {
    companyName: '',
    positionTitle: '',
    annualSalary: '',
    contactEmail: '',
    contactPhone: '',
  });
});

test('buildWorkScenarioStatus 会提示已填数量与待补字段', () => {
  const message = helpers.buildWorkScenarioStatus({
    companyName: '株式会社 Future Link',
    positionTitle: '系统工程师',
    annualSalary: '',
    contactEmail: 'hr@future-link.jp',
    contactPhone: '',
  });

  assert.match(message, /已填写 3 \/ 5 项/);
  assert.match(message, /待补：年薪、联系人电话/);
});

test('buildWorkScenarioStatus 在空雇主信息时提示先补齐基础雇主字段', () => {
  assert.match(
    helpers.buildWorkScenarioStatus(helpers.createEmptyWorkDetails()),
    /便于事务所分派催件/
  );
});

test('buildSubmitHint 使用确认后开始办案口径', () => {
  assert.equal(
    helpers.buildSubmitHint({
      isFamilyBulk: false,
      isWorkTemplate: true,
    }),
    '确认后会自动生成资料清单与初始任务；公司、职位与联系人会随案件一起沉淀。'
  );
});

test('buildWorkSummary 会汇总雇主信息与联系人', () => {
  const summary = helpers.buildWorkSummary(
    {
      companyName: '株式会社 Future Link',
      positionTitle: '系统工程师',
      annualSalary: '420 万日元',
      contactEmail: 'hr@future-link.jp',
      contactPhone: '03-1234-5678',
    },
    [{ name: '佐藤 花子', role: '雇主联系人' }]
  );

  assert.match(summary, /公司：株式会社 Future Link/);
  assert.match(summary, /职位：系统工程师/);
  assert.match(summary, /雇主联系人：佐藤 花子（雇主联系人）/);
  assert.match(summary, /联系方式：hr@future-link.jp \/ 03-1234-5678/);
});

test('buildWorkMaterialSummary 在缺少主体信息时给出待补提示', () => {
  assert.equal(
    helpers.buildWorkMaterialSummary({ contactEmail: 'hr@future-link.jp' }),
    '资料清单已生成，待补录雇主基础信息与材料'
  );
});

test('sanitizeWorkDetails 会裁剪空白并保留完整字段结构', () => {
  assert.deepEqual(
    helpers.sanitizeWorkDetails({
      companyName: '  株式会社 Future Link  ',
      positionTitle: ' 系统工程师 ',
      annualSalary: ' 420 万日元 ',
    }),
    {
      companyName: '株式会社 Future Link',
      positionTitle: '系统工程师',
      annualSalary: '420 万日元',
      contactEmail: '',
      contactPhone: '',
    }
  );
});

test('buildCaseTitle 会根据是否批量模式生成标题', () => {
  assert.equal(
    helpers.buildCaseTitle('陈美', '家族滞在', '认定', true),
    '陈美 - 家族滞在认定批次'
  );
  assert.equal(
    helpers.buildCaseTitle('', '技人国', '更新', false),
    '未选择客户 - 技人国更新'
  );
});

test('buildFamilyDraftParty 会补齐家族批量草稿默认字段', () => {
  assert.deepEqual(
    helpers.buildFamilyDraftParty({
      name: '  陈小花 ',
      role: '子女',
      contact: '',
      reuseDocs: ['passport'],
    }, 2, {
      group: 'tokyo-1',
      groupLabel: '东京一部',
    }),
    {
      id: 'family-draft-2',
      mode: 'related',
      name: '陈小花',
      role: '子女',
      group: 'tokyo-1',
      groupLabel: '东京一部',
      contact: '待补充联系方式',
      note: '',
      relation: '',
      reuseDocs: ['passport'],
      staleDocWarning: '',
      initials: '陈小',
    }
  );
});

test('buildSummaryPartiesText / buildChecklistSummary 会生成汇总区文案', () => {
  assert.equal(
    helpers.buildSummaryPartiesText({
      isFamilyBulk: true,
      applicants: [{ name: '陈美', role: '配偶' }],
      supporters: [{ name: '王强', role: '扶养者' }],
    }),
    '办理对象：陈美（配偶）；关联人：王强（扶养者）'
  );
  assert.equal(
    helpers.buildChecklistSummary({
      createChecklist: true,
      createTasks: false,
      isWorkTemplate: true,
      isFamilyBulk: false,
    }),
    '自动生成资料清单 / 不创建跟进任务 / 雇主信息随案件沉淀'
  );
});

test('buildRequirementsViewModel 会生成单案资料区汇总与清单 HTML', () => {
  const requirements = helpers.buildRequirementsViewModel({
    template: {
      requirementSummary: '默认资料包',
      helper: '开始办案后可继续补录',
      sections: [{
        title: '基础资料',
        items: [
          { label: '在留卡', required: true },
          { label: '护照', required: false },
        ],
      }],
    },
    isFamilyBulk: false,
    applicantCount: 0,
  });

  assert.equal(requirements.requirementsMeta, '默认资料包 · 开始办案后可继续补录');
  assert.match(requirements.requirementsListHtml, /在留卡/);
  assert.match(requirements.requirementsListHtml, /护照/);
  assert.equal(requirements.requirementsProgress, '默认生成 1 / 2 个必交资料项');
});

test('buildRequirementsViewModel 会生成家族批量资料进度文案', () => {
  const requirements = helpers.buildRequirementsViewModel({
    template: {
      sections: [{
        title: '基础资料',
        items: [
          { label: '在留卡', required: true },
          { label: '户口誊本', required: true },
          { label: '说明书', required: false },
        ],
      }],
    },
    isFamilyBulk: true,
    applicantCount: 2,
  });

  assert.equal(
    requirements.requirementsProgress,
    '预计为 2 个办理对象分别生成资料清单；每案默认 2 / 3 个必交项，扶养者材料按共享附件版本引用。'
  );
});

test('buildCaseCreateSummaryViewModel 会生成家族批量汇总文案', () => {
  const summary = helpers.buildCaseCreateSummaryViewModel({
    templateLabel: '家族滞在',
    applicationType: '认定',
    primaryCustomerName: '王强',
    applicants: [{ name: '陈美', role: '配偶' }],
    supporters: [{ name: '王强', role: '扶养者' }],
    additionalParties: [],
    isFamilyBulk: true,
    isWorkTemplate: false,
    ownerLabel: '铃木顾问',
    groupLabel: '东京一部',
    dueDate: '2026-04-22',
    amount: '180000',
    createChecklist: true,
    createTasks: true,
  });

  assert.equal(summary.summaryTemplate, '家族滞在 / 认定');
  assert.equal(summary.summaryCustomer, '王强（关键关系人）');
  assert.equal(summary.summaryParties, '办理对象：陈美（配偶）；关联人：王强（扶养者）');
  assert.equal(summary.summaryChecklist, '自动生成资料清单 / 创建跟进任务 / 自动绑定关联人与补齐任务');
  assert.equal(summary.successBannerTitle, '已开始办理 1 个家族案件');
  assert.equal(summary.viewCreatedCasesButtonText, '查看案件列表中的 1 个结果');
});

test('buildCaseCreateSummaryViewModel 会生成技人国单案汇总文案', () => {
  const summary = helpers.buildCaseCreateSummaryViewModel({
    templateLabel: '技人国',
    applicationType: '更新',
    primaryCustomerName: '李四',
    applicants: [],
    supporters: [],
    additionalParties: [{ name: '佐藤花子', role: '雇主联系人' }],
    isFamilyBulk: false,
    isWorkTemplate: true,
    workDetails: {
      companyName: 'Future Link',
      positionTitle: '系统工程师',
      annualSalary: '420 万日元',
    },
    ownerLabel: '铃木顾问',
    groupLabel: '东京一部',
    dueDate: '2026-04-22',
    amount: '180000',
    createChecklist: true,
    createTasks: false,
  });

  assert.equal(summary.summaryTemplate, '技人国 / 更新');
  assert.equal(summary.summaryCustomer, '李四');
  assert.match(summary.summaryParties, /公司：Future Link/);
  assert.match(summary.summaryParties, /雇主联系人：佐藤花子（雇主联系人）/);
  assert.equal(summary.summaryAmount, '¥180,000');
  assert.equal(summary.successBannerTitle, '技人国案件已创建');
  assert.match(summary.successBannerDesc, /Future Link \/ 系统工程师/);
});

test('buildSuccessBannerCopy / buildSubmitHint 会根据场景切换提交反馈', () => {
  assert.deepEqual(
    helpers.buildSuccessBannerCopy({
      isFamilyBulk: true,
      applicantCount: 2,
      supporterCount: 1,
    }),
    {
      title: '已开始办理 2 个家族案件',
      desc: '已同步绑定 1 位关键关系人，资料清单与补齐任务已按每人一案生成。',
    }
  );
  assert.equal(
    helpers.buildSubmitHint({
      isFamilyBulk: false,
      isWorkTemplate: true,
    }),
    '确认后会自动生成资料清单与初始任务；公司、职位与联系人会随案件一起沉淀。'
  );
});

test('buildFamilyScenarioViewModel 会生成家族批量预览文案与 HTML', () => {
  const viewModel = helpers.buildFamilyScenarioViewModel({
    title: '家族滞在批量开始办案',
    summary: '默认说明',
    roles: ['扶养者', '配偶', '子女'],
    gateChecks: ['确认扶养关系', '核对共享材料'],
    reuseNotes: ['提交后自动生成补齐任务'],
    applicants: [{ name: '陈美', role: '配偶', reuseDocs: ['在留卡'] }],
    supporters: [{ name: '王强', role: '扶养者', groupLabel: '东京一部', contact: '090-1111-2222', source: 'primary' }],
    familyBulkMode: true,
    templateLabel: '家族滞在',
    applicationType: '认定',
    groupLabel: '东京一部',
    ownerLabel: '铃木顾问',
  });

  assert.equal(viewModel.familyScenarioTitle, '家族滞在批量开始办案（已开启）');
  assert.match(viewModel.familyRoleChipsHtml, /扶养者/);
  assert.match(viewModel.familyKeyPartyListHtml, /已复用客户档案/);
  assert.match(viewModel.familyCaseMatrixHtml, /陈美 - 家族滞在认定/);
  assert.equal(viewModel.familyCreationSummary, '提交后将一次创建 1 个案件，并自动继承 东京一部 \/ 铃木顾问。');
});

test('buildWorkScenarioViewModel 会生成雇主字段进度与状态', () => {
  const viewModel = helpers.buildWorkScenarioViewModel({
    fields: ['公司名称', '职位', '年薪', '联系人邮箱'],
    workDetails: {
      companyName: 'Future Link',
      positionTitle: '系统工程师',
      annualSalary: '',
      contactEmail: 'hr@future-link.jp',
      contactPhone: '',
    },
  });

  assert.match(viewModel.workFieldListHtml, /公司名称 · 已填/);
  assert.match(viewModel.workFieldListHtml, /年薪 · 待补/);
  assert.match(viewModel.workScenarioStatus, /已填写 3 \/ 5 项/);
});

test('buildCreatedCaseRecord 会生成技人国草稿记录并保留雇主信息', () => {
  const record = helpers.buildCreatedCaseRecord({
    item: { name: '李四' },
    index: 0,
    createdAt: 1710000123456,
    supporters: [{ name: '佐藤花子', role: '雇主联系人' }],
    dueDate: '2026-04-22',
    templateLabel: '技人国',
    applicationType: '更新',
    groupId: 'tokyo-1',
    groupLabel: '东京一部',
    ownerId: 'suzuki',
    amount: '180000',
    isFamilyBulk: false,
    isWorkTemplate: true,
    additionalParties: [{ name: '佐藤花子', role: '雇主联系人' }],
    workDetails: {
      companyName: '  Future Link ',
      positionTitle: '系统工程师 ',
      annualSalary: '420 万日元',
    },
  });

  assert.equal(record.id, 'CAS-DEMO-123456-01');
  assert.equal(record.name, '李四 技人国更新');
  assert.equal(record.unpaidAmount, 180000);
  assert.match(record.casePartySummary, /雇主联系人：佐藤花子（雇主联系人）/);
  assert.deepEqual(record.workDetails, {
    companyName: 'Future Link',
    positionTitle: '系统工程师',
    annualSalary: '420 万日元',
    contactEmail: '',
    contactPhone: '',
  });
});

test('buildCreatedCaseDrafts 会为家族批量场景生成多条草稿案件', () => {
  const drafts = helpers.buildCreatedCaseDrafts({
    createdAt: 1710000123456,
    familyApplicants: [
      { name: '陈美', role: '配偶' },
      { name: '陈小宝', role: '子女' },
    ],
    supporters: [{ name: '王强', role: '扶养者' }],
    dueDate: '2026-04-22',
    templateLabel: '家族滞在',
    applicationType: '认定',
    groupId: 'tokyo-1',
    groupLabel: '东京一部',
    ownerId: 'suzuki',
    amount: '180000',
    isFamilyBulk: true,
    additionalParties: [],
  });

  assert.deepEqual(drafts.map((item) => item.id), ['CAS-DEMO-123456-01', 'CAS-DEMO-123456-02']);
  assert.equal(drafts[0].name, '陈美 家族滞在认定');
  assert.match(drafts[0].casePartySummary, /关联人：王强（扶养者）/);
  assert.equal(drafts[1].batchLabel, '家族批量开始办案');
});

test('buildCreatedCaseDrafts 会为单案场景生成主申请人草稿并归一化雇主信息', () => {
  const drafts = helpers.buildCreatedCaseDrafts({
    createdAt: 1710000123456,
    primaryCustomer: { name: '李四' },
    additionalParties: [{ name: '佐藤花子', role: '雇主联系人' }],
    dueDate: '2026-04-22',
    templateLabel: '技人国',
    applicationType: '更新',
    groupId: 'tokyo-1',
    groupLabel: '东京一部',
    ownerId: 'suzuki',
    amount: '180000',
    isFamilyBulk: false,
    isWorkTemplate: true,
    workDetails: {
      companyName: '  Future Link ',
      positionTitle: ' 系统工程师 ',
      annualSalary: '420 万日元',
    },
  });

  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].name, '李四 技人国更新');
  assert.deepEqual(drafts[0].workDetails, {
    companyName: 'Future Link',
    positionTitle: '系统工程师',
    annualSalary: '420 万日元',
    contactEmail: '',
    contactPhone: '',
  });
  assert.match(drafts[0].casePartySummary, /雇主联系人：佐藤花子（雇主联系人）/);
});

test('mergeCreatedDraftCases / buildCaseListFlashPayload 会生成列表页所需草稿上下文', () => {
  const merged = helpers.mergeCreatedDraftCases(
    [{ id: 'OLD-1' }],
    [{ id: 'NEW-1' }, { id: 'NEW-2' }]
  );

  assert.deepEqual(merged.map((item) => item.id), ['NEW-1', 'NEW-2', 'OLD-1']);
  assert.deepEqual(
    helpers.buildCaseListFlashPayload({
      draftCases: merged.slice(0, 2),
      templateLabel: '家族滞在',
      applicationType: '认定',
      primaryName: '  陈美 ',
      isFamilyBulk: true,
    }),
    {
      caseIds: ['NEW-1', 'NEW-2'],
      count: 2,
      templateLabel: '家族滞在',
      applicationType: '认定',
      primaryName: '陈美',
      isFamilyBulk: true,
    }
  );
});

test('persistCreatedCaseArtifacts 会写入草稿列表与 flash 提示', () => {
  const storage = {
    values: {
      drafts: JSON.stringify([{ id: 'OLD-1' }]),
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null;
    },
    setItem(key, value) {
      this.values[key] = value;
    },
  };
  const draftCases = [{ id: 'NEW-1' }, { id: 'NEW-2' }];

  assert.deepEqual(
    helpers.persistCreatedCaseArtifacts({
      storage,
      draftsKey: 'drafts',
      flashKey: 'flash',
      draftCases,
      templateLabel: '技人国',
      applicationType: '更新',
      primaryName: '李四',
      isFamilyBulk: false,
    }),
    draftCases
  );

  assert.deepEqual(JSON.parse(storage.values.drafts), [{ id: 'NEW-1' }, { id: 'NEW-2' }, { id: 'OLD-1' }]);
  assert.deepEqual(JSON.parse(storage.values.flash), {
    caseIds: ['NEW-1', 'NEW-2'],
    count: 2,
    templateLabel: '技人国',
    applicationType: '更新',
    primaryName: '李四',
    isFamilyBulk: false,
  });
});

test('readStorageJson / writeStorageJson 使用外部 storage 读写草稿', () => {
  const storage = {
    values: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null;
    },
    setItem(key, value) {
      this.values[key] = value;
    },
  };

  helpers.writeStorageJson(storage, 'draft', { count: 2, ids: ['A', 'B'] });

  assert.deepEqual(helpers.readStorageJson(storage, 'draft'), {
    count: 2,
    ids: ['A', 'B'],
  });
});

test('CaseCreatePageUtils 继续对外暴露技人国纯函数以兼容现有入口', () => {
  assert.equal(utils.buildCaseListFlashPayload, helpers.buildCaseListFlashPayload);
  assert.equal(utils.buildCaseCreateSummaryViewModel, helpers.buildCaseCreateSummaryViewModel);
  assert.equal(utils.buildChecklistSummary, helpers.buildChecklistSummary);
  assert.equal(utils.buildFamilyScenarioViewModel, helpers.buildFamilyScenarioViewModel);
  assert.equal(utils.buildRequirementsViewModel, helpers.buildRequirementsViewModel);
  assert.equal(utils.buildCreatedCaseRecord, helpers.buildCreatedCaseRecord);
  assert.equal(utils.buildFamilyDraftParty, helpers.buildFamilyDraftParty);
  assert.equal(utils.mergeCreatedDraftCases, helpers.mergeCreatedDraftCases);
  assert.equal(utils.persistCreatedCaseArtifacts, helpers.persistCreatedCaseArtifacts);
  assert.equal(utils.buildSubmitHint, helpers.buildSubmitHint);
  assert.equal(utils.buildSuccessBannerCopy, helpers.buildSuccessBannerCopy);
  assert.equal(utils.buildSummaryPartiesText, helpers.buildSummaryPartiesText);
  assert.equal(utils.buildWorkScenarioViewModel, helpers.buildWorkScenarioViewModel);
  assert.equal(utils.buildWorkSummary, helpers.buildWorkSummary);
  assert.equal(utils.buildWorkScenarioStatus, helpers.buildWorkScenarioStatus);
  assert.equal(utils.sanitizeWorkDetails, helpers.sanitizeWorkDetails);
});