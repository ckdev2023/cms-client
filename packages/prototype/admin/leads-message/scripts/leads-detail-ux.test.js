import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
window.LeadsDetailPage = {
  setText() {},
  $(id) {
    return this.__elements[id] || null;
  },
  __elements: {},
};

await import('./leads-detail-render.js');

test('resolveConversionCopy 为已签约未转化样本返回一键建档文案', () => {
  var copy = window.LeadsDetailPage.resolveConversionCopy({ buttons: 'signedNotConverted' });

  assert.equal(copy.headerCaseLabel, '签约并开始建档');
  assert.equal(copy.headerCustomerLabel, '仅转客户');
  assert.equal(copy.warningActionLabel, '签约并开始建档');
  assert.equal(copy.caseModalConfirmLabel, '确认并开始建档');
});

test('resolveConversionCopy 为普通样本保留原始转化文案', () => {
  var copy = window.LeadsDetailPage.resolveConversionCopy({ buttons: 'normal' });

  assert.equal(copy.headerCaseLabel, '转案件');
  assert.equal(copy.headerCustomerLabel, '转客户');
  assert.equal(copy.warningActionLabel, '立即转化');
  assert.equal(copy.caseModalConfirmLabel, '确认创建案件');
});