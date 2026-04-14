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
    var qi = url.indexOf('?');
    window.location.search = qi >= 0 ? url.slice(qi) : '';
  },
};

await import('../data/leads-config.js');
await import('../data/leads-detail-config.js');
await import('./leads-detail-core.js');

window.LeadsDetailPage.setText = function () {};
window.LeadsDetailPage.$ = function () { return null; };
await import('./leads-detail-render.js');

const listCfg = window.LeadsConfig;
const detailCfg = window.LeadsDetailConfig;

test('状态枚举值在列表与详情配置间完全一致', () => {
  const listKeys = listCfg.LEAD_STATUSES.map((s) => s.value).sort();
  const detailKeys = Object.keys(detailCfg.DETAIL_STATUSES).sort();

  assert.deepStrictEqual(listKeys, detailKeys);
});

test('状态 label 在列表与详情配置间完全一致', () => {
  listCfg.LEAD_STATUSES.forEach((s) => {
    const detail = detailCfg.DETAIL_STATUSES[s.value];
    assert.ok(detail, `detail config 缺少状态 ${s.value}`);
    assert.equal(s.label, detail.label, `状态 ${s.value} 的 label 不一致`);
  });
});

test('状态 badgeClass 在列表与详情配置间完全一致', () => {
  listCfg.LEAD_STATUSES.forEach((s) => {
    const detail = detailCfg.DETAIL_STATUSES[s.value];
    assert.ok(detail, `detail config 缺少状态 ${s.value}`);
    assert.equal(s.badgeClass, detail.badgeClass, `状态 ${s.value} 的 badgeClass 不一致`);
  });
});

test('getStatusBadgeClass 从 DETAIL_STATUSES 读取与列表页一致的 badgeClass', () => {
  const app = window.LeadsDetailPage;
  listCfg.LEAD_STATUSES.forEach((s) => {
    assert.equal(
      app.getStatusBadgeClass(s.value),
      s.badgeClass,
      `getStatusBadgeClass('${s.value}') 应返回 '${s.badgeClass}'`
    );
  });
});

test('DEMO_NOTICE 在列表与详情配置间文案一致', () => {
  assert.ok(listCfg.DEMO_NOTICE, '列表配置缺少 DEMO_NOTICE');
  assert.ok(detailCfg.DEMO_NOTICE, '详情配置缺少 DEMO_NOTICE');
  assert.equal(listCfg.DEMO_NOTICE, detailCfg.DEMO_NOTICE);
});

test('模拟后端操作的 toast 标题均包含（示例）后缀', () => {
  const simulatedKeys = [
    'leadCreated', 'bulkAssign', 'bulkFollowUp', 'bulkStatus',
    'dedupViewRecord', 'conversionSuccess',
  ];
  simulatedKeys.forEach((key) => {
    const toast = listCfg.TOASTS[key];
    assert.ok(toast, `列表 TOASTS 缺少 ${key}`);
    assert.match(toast.title, /（示例）/, `TOASTS.${key}.title 缺少（示例）后缀`);
  });
});

test('详情页 toast 标题均包含（示例）后缀', () => {
  Object.entries(detailCfg.DETAIL_TOASTS).forEach(([key, toast]) => {
    assert.match(toast.title, /（示例）/, `DETAIL_TOASTS.${key}.title 缺少（示例）后缀`);
  });
});

test('列表样本 D.4/D.6 的 lead id 在详情 DETAIL_SAMPLES 中可找到', () => {
  const signedSamples = listCfg.LEAD_SAMPLES.filter((s) => s.status === 'signed');
  assert.ok(signedSamples.length >= 2, '至少需要 2 条 signed 样本');

  signedSamples.forEach((row) => {
    const found = Object.values(detailCfg.DETAIL_SAMPLES).some((s) => s.id === row.id);
    assert.ok(found, `列表 signed 样本 ${row.id} 在详情配置中未找到`);
  });
});

test('BANNERS.signedNotConverted 文案与 resolveConversionCopy 一致', () => {
  const banner = detailCfg.BANNERS.signedNotConverted;
  const app = window.LeadsDetailPage;
  const copy = app.resolveConversionCopy({ buttons: 'signedNotConverted' });

  assert.equal(banner.text, copy.warningText);
  assert.equal(banner.actionLabel, copy.warningActionLabel);
});

test('列表行跳转路径格式与详情 resolveInitialSampleKey 兼容', () => {
  const app = window.LeadsDetailPage;
  const detailIds = new Set(Object.values(detailCfg.DETAIL_SAMPLES).map((s) => s.id));

  listCfg.LEAD_SAMPLES
    .filter((row) => detailIds.has(row.id))
    .forEach((row) => {
      window.location.search = '?id=' + encodeURIComponent(row.id);
      const key = app.resolveInitialSampleKey();
      const sample = detailCfg.DETAIL_SAMPLES[key];
      assert.ok(sample, `id=${row.id} 应解析到有效详情样本`);
      assert.equal(sample.id, row.id, `跳转路径 id=${row.id} 应解析到正确详情样本`);
    });
});
