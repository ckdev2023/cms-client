import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadBrowserScript(relativePath, context) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  vm.runInNewContext(source, context, { filename: relativePath });
}

const context = {
  console,
  URL,
  URLSearchParams,
  document: {
    addEventListener() {},
  },
};

context.window = context;

loadBrowserScript('../data/case-list.js', context);
loadBrowserScript('../data/case-detail-config.js', context);

const caseData = context.CaseListData;
const detailSamples = context.DETAIL_SAMPLES;

function getBizCase(id) {
  return caseData.cases.find((item) => item.id === id);
}

function getDetailSample(id) {
  const listItem = getBizCase(id);
  return listItem ? detailSamples[listItem.sampleKey] : null;
}

test('经营管理签后半段样例保持列表与详情阶段一致', () => {
  ['CAS-2026-0241', 'CAS-2026-0242', 'CAS-2026-0244', 'CAS-2026-0245'].forEach((id) => {
    const listItem = getBizCase(id);
    const detailSample = getDetailSample(id);

    assert.ok(listItem, id + ' should exist in case list');
    assert.ok(detailSample, id + ' should map to detail sample');
    assert.equal(detailSample.id, listItem.id);
    assert.equal(detailSample.stage, listItem.stageLabel);
    assert.equal(detailSample.stageCode, listItem.stageId);
  });
});

test('经营管理签拒签样例保持拒签结果态而非归档态', () => {
  const listItem = getBizCase('CAS-2026-0243');
  const detailSample = getDetailSample('CAS-2026-0243');

  assert.ok(listItem);
  assert.ok(detailSample);
  assert.equal(detailSample.id, listItem.id);
  assert.equal(listItem.stageLabel, '返签结果（拒签）');
  assert.equal(detailSample.stage, '返签结果（拒签）');
  assert.equal(detailSample.stageCode, 'S8');
  assert.notEqual(detailSample.stageCode, 'S9');
  assert.notEqual(detailSample.readonly, true);
});

test('经营管理签提醒建档样例明确归档为只读', () => {
  const detailSample = getDetailSample('CAS-2026-0245');

  assert.ok(detailSample);
  assert.equal(detailSample.stage, '已设置到期提醒');
  assert.equal(detailSample.stageCode, 'S9');
  assert.equal(detailSample.readonly, true);
});
