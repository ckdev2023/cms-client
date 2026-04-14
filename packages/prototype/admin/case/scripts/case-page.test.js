import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
globalThis.document = {
  addEventListener() {},
};

await import('../data/case-list.js');
await import('./case-page.js');

const caseData = globalThis.CaseListData;
const utils = globalThis.CaseListPageUtils;
const casePageSource = fs.readFileSync(new URL('./case-page.js', import.meta.url), 'utf8');
const listPageSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stageZeroLabel = ['P', '0'].join('');

test('formatValidationLabel 返回事务所可读的中文状态', () => {
  assert.equal(utils.formatValidationLabel('passed'), '已通过');
  assert.equal(utils.formatValidationLabel('pending'), '待检查');
  assert.equal(utils.formatValidationLabel('failed'), '需先处理');
});

test('formatValidationMeta 对阻断案件优先提示修复数量', () => {
  assert.equal(utils.formatValidationMeta('failed', 2), '2 项待处理');
  assert.equal(utils.formatValidationMeta('passed', 0), '可安排提交');
  assert.equal(utils.formatValidationMeta('pending', 0), '建议先做提交前复核');
});

test('case 列表首列标题统一为主申请人加案件类型', () => {
  assert.equal(
    utils.formatCaseListTitle({ applicant: '佐藤美咲', type: '经营管理签 / 入境后', name: '旧标题' }),
    '佐藤美咲 · 经营管理签 / 入境后',
  );
  assert.equal(utils.formatCaseListTitle({ applicant: 'Liu Chen' }), 'Liu Chen');
});

test('case 列表样本仅保留标准范围内的案件模板', () => {
  const templateTypes = caseData.cases.map((item) => item.type.split(' / ')[0]);

  assert.ok(templateTypes.length > 0);
  assert.deepEqual(new Set(templateTypes), new Set(['家族滞在', '技人国', '经营管理签']));
});

test('case 列表为经营管理签全流程样例保留 sampleKey 跳转参数', () => {
  const bizCases = caseData.cases.filter((item) => item.sampleKey && item.sampleKey.indexOf('biz-') === 0);

  assert.equal(bizCases.length, 15);
  assert.ok(bizCases.every((item) => utils.resolveCaseDetailHref(item) === 'detail.html?sample=' + encodeURIComponent(item.sampleKey)));
  assert.equal(utils.resolveCaseDetailHref({}), 'detail.html');
});

test('case 列表空态文案不再暴露内部阶段口径', () => {
  assert.match(casePageSource, /继续处理/);
  assert.doesNotMatch(casePageSource, new RegExp('继续进入 ' + stageZeroLabel + ' 模板'));
});

test('case 列表页对外文案使用事务所口径而非内部阶段编码', () => {
  assert.match(listPageSource, /开始办案/);
  assert.match(listPageSource, /提交前检查/);
  assert.doesNotMatch(listPageSource, /Gate 校验/);
  assert.doesNotMatch(listPageSource, />S1 建档</);
  assert.doesNotMatch(listPageSource, />S5 校验提交</);
});

test('case 列表样本阶段标签不直接暴露 S 编码', () => {
  caseData.cases.forEach((item) => {
    assert.doesNotMatch(item.stageLabel, /^S[0-9]/);
  });
});

test('case 列表样本仍覆盖提交后与归档态', () => {
  const stageIds = new Set(caseData.cases.map((item) => item.stageId));

  assert.ok(stageIds.has('S7'));
  assert.ok(stageIds.has('S9'));
});

test('case 列表顶部汇总卡使用资料中心同款标准卡片结构', () => {
  assert.match(listPageSource, /summary-card__label/);
  assert.match(listPageSource, /summary-card__value/);
  assert.match(listPageSource, /summary-card__hint/);
  assert.match(listPageSource, /summary-card--primary/);
  assert.match(listPageSource, /summary-card--risk/);
  assert.match(listPageSource, /summary-card--warning/);
  assert.match(listPageSource, /summary-card--neutral/);
  assert.doesNotMatch(listPageSource, /class="summary-label"/);
  assert.doesNotMatch(listPageSource, /class="summary-value/);
});

test('case 列表去掉重复的案件类型列，保留更宽的首列摘要', () => {
  assert.match(listPageSource, /案件摘要/);
  assert.doesNotMatch(listPageSource, /<th class="min-w-\[120px\]">案件类型<\/th>/);
  assert.match(listPageSource, /min-w-\[1240px\]/);
});

test('case 列表首列直接作为详情入口，不再保留操作列', () => {
  assert.match(casePageSource, /aria-label="进入 ' \+ caseTitle \+ ' 详情"/);
  assert.doesNotMatch(casePageSource, /table-icon-btn/);
  assert.doesNotMatch(listPageSource, />操作</);
});

test('case 列表字段按处理优先级前置排序', () => {
  assert.match(
    listPageSource,
    /案件摘要[\s\S]*当前进度[\s\S]*当前检查[\s\S]*风险状态[\s\S]*截止日[\s\S]*资料完成率[\s\S]*未收金额[\s\S]*最近更新/,
  );
});

test('case 列表将负责人和承接组合并进第一列摘要', () => {
  assert.match(casePageSource, /负责人 /);
  assert.match(casePageSource, /承接组 /);
  assert.doesNotMatch(listPageSource, />负责人</);
  assert.doesNotMatch(listPageSource, />主申请人</);
  assert.doesNotMatch(listPageSource, />承接组</);
});

test('case 列表批量建案样例只保留关联人摘要，不展示资料摘要', () => {
  assert.match(casePageSource, /casePartySummary/);
  assert.doesNotMatch(casePageSource, /materialSummary \? '<div class="table-meta mt-1">' \+ item\.materialSummary/);
});