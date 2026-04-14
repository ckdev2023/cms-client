import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
window.LeadsDetailPage = {};
window.location = {
  pathname: '/packages/prototype/admin/leads-message/detail.html',
  search: '',
};
window.history = {
  replaceState(_state, _title, url) {
    var queryIndex = url.indexOf('?');
    window.location.search = queryIndex >= 0 ? url.slice(queryIndex) : '';
  },
};

await import('../data/leads-detail-config.js');
await import('./leads-detail-core.js');

test('resolveInitialSampleKey 根据 id 命中正确样例', () => {
  window.location.search = '?id=LEAD-2026-0042';

  assert.equal(window.LeadsDetailPage.resolveInitialSampleKey(), 'empty-followups');
});

test('resolveInitialSampleKey 优先使用 sample 参数', () => {
  window.location.search = '?id=LEAD-2026-0015&sample=converted-case';

  assert.equal(window.LeadsDetailPage.resolveInitialSampleKey(), 'converted-case');
});

test('syncLocationForSampleKey 同步 sample 与 id 到地址栏', () => {
  window.location.search = '';

  window.LeadsDetailPage.syncLocationForSampleKey('empty-followups');

  assert.equal(window.location.search, '?sample=empty-followups&id=LEAD-2026-0042');
});
