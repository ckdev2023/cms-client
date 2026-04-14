import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
window.CaseDetailPage = {
  setText() {},
  esc(value) {
    return String(value || '');
  },
  severityColor() {
    return '#000';
  },
  severityBgClass() {
    return 'bg';
  },
};

globalThis.document = {
  querySelectorAll() {
    return [];
  },
  querySelector() {
    return null;
  },
  getElementById() {
    return null;
  },
};

await import('./case-detail-renderers.js');

test('resolveOverviewCopy 在存在阻断项时返回事务所动作提示', () => {
  var copy = window.CaseDetailPage.resolveOverviewCopy({
    validation: { blocking: [{}, {}] },
    risk: { arrearsStatus: '欠款状态：应收' },
  });

  assert.equal(copy.nextAction, '先处理这 2 项当前卡点，再重新检查是否可以提交。');
  assert.equal(copy.validationHint, '先到提交前检查里确认卡点，再去资料区或任务区逐项补齐。');
});

test('resolveOverviewCopy 在已完成欠款风险确认后提示可继续提交', () => {
  var copy = window.CaseDetailPage.resolveOverviewCopy({
    validation: { blocking: [] },
    risk: { arrearsStatus: '欠款状态：欠款 ¥120,000' },
    riskConfirmationRecord: { confirmedBy: 'Manager' },
  });

  assert.equal(copy.nextAction, '欠款风险确认已完成，可按决定生成提交包并安排提交。');
  assert.equal(copy.validationHint, '资料已通过检查，当前主要关注是否现在提交，以及尾款跟进。');
});

test('resolveOverviewStageMeta 在已完成欠款风险确认后不再显示停留天数', () => {
  var meta = window.CaseDetailPage.resolveOverviewStageMeta({
    stageMeta: '已停留 1 天',
    validation: { blocking: [] },
    risk: { arrearsStatus: '欠款状态：欠款 ¥120,000' },
    riskConfirmationRecord: { confirmedBy: 'Manager' },
  });

  assert.equal(meta, '欠款风险已确认，可继续安排提交');
});

test('badgeToneClass 为经营管理签后半段样例提供统一 badge 样式', () => {
  assert.match(window.CaseDetailPage.badgeToneClass('success'), /bg-green-50/);
  assert.match(window.CaseDetailPage.badgeToneClass('warning'), /bg-amber-50/);
  assert.match(window.CaseDetailPage.badgeToneClass('danger'), /bg-red-50/);
  assert.match(window.CaseDetailPage.badgeToneClass('primary'), /bg-blue-50/);
});