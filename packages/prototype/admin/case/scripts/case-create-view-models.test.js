import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = { addEventListener() {} };

await import('./case-create-helpers.js');
await import('./case-create-view-models.js');
await import('./case-create-page.js');

const helpers = globalThis.CaseCreateHelpers;
const utils = globalThis.CaseCreatePageUtils;

test('buildDynamicCopyViewModel 会按家族批量场景切换 copy', () => {
  const viewModel = helpers.buildDynamicCopyViewModel({ isFamilyBulk: true, isWorkTemplate: false });
  assert.equal(viewModel.caseNameLabel, '批量建案批次名称');
  assert.equal(viewModel.primaryModalDefaultRole, '扶养者');
  assert.equal(viewModel.showSupportingPartyButton, true);
});

test('buildDynamicCopyViewModel 会为客户来源场景生成顺路化提示', () => {
  const viewModel = helpers.buildDynamicCopyViewModel({
    isFamilyBulk: false,
    isWorkTemplate: false,
    hasSourceCustomer: true,
    sourceCustomerName: '陈美',
    sourceCustomerGroupLabel: '东京一部',
  });

  assert.equal(viewModel.primaryCustomerSelectLabel, '确认主申请人');
  assert.equal(viewModel.primaryModalButtonText, '补录主申请人');
  assert.equal(viewModel.sourceContextTitle, '已从客户档案继续开始办案');
  assert.match(viewModel.sourceContextHint, /陈美/);
  assert.match(viewModel.sourceContextHint, /东京一部/);
});

test('buildPrimaryCustomerViewModel 会生成单案主申请人展示字段', () => {
  const viewModel = helpers.buildPrimaryCustomerViewModel({
    isFamilyBulk: false,
    primaryCustomer: {
      name: '李四',
      kana: 'リ シ',
      groupLabel: '东京一部',
      roleHint: '主申请人',
      summary: '在留资格：技人国',
      contact: '090-1111-2222',
    },
  });
  assert.equal(viewModel.name, '李四');
  assert.match(viewModel.meta, /东京一部/);
  assert.equal(viewModel.shouldSyncInheritedGroup, true);
});

test('buildAdditionalPartiesViewModel 会生成关联人卡片 HTML 与空态文案', () => {
  const withParties = helpers.buildAdditionalPartiesViewModel({
    isFamilyBulk: false,
    parties: [{
      originalIndex: 0,
      initials: '佐藤',
      name: '佐藤花子',
      role: '雇主联系人',
      groupLabel: '东京一部',
      contact: 'hr@future-link.jp',
      relation: '',
      note: '优先通过邮件联系',
      staleDocWarning: '',
    }],
  });
  const emptyState = helpers.buildAdditionalPartiesViewModel({ isFamilyBulk: true, parties: [] });
  assert.match(withParties.additionalPartiesHtml, /佐藤花子/);
  assert.match(withParties.additionalPartiesHtml, /优先通过邮件联系/);
  assert.match(emptyState.additionalPartiesHtml, /当前还没有办理对象/);
});

test('CaseCreatePageUtils 继续对外暴露新增的 create view-model helpers', () => {
  assert.equal(utils.buildDynamicCopyViewModel, helpers.buildDynamicCopyViewModel);
  assert.equal(utils.buildPrimaryCustomerViewModel, helpers.buildPrimaryCustomerViewModel);
  assert.equal(utils.buildAdditionalPartiesViewModel, helpers.buildAdditionalPartiesViewModel);
});