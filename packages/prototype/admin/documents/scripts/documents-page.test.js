import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.document = {
  addEventListener() {},
  getElementById() {
    return null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
};

await import('../data/documents-config.js');
await import('./documents-page.js');

const page = window.DocumentsPage;

test('documents 状态标签使用事务所执行口径', () => {
  assert.equal(window.DocumentsConfig.STATUS_LABEL_MAP.not_sent, '尚未开始');
  assert.equal(window.DocumentsConfig.STATUS_LABEL_MAP.waiting_upload, '等待对方提交');
  assert.equal(window.DocumentsConfig.STATUS_LABEL_MAP.uploaded_reviewing, '已收到待确认');
});

test('resolveRowGuidance 对退回待重交资料返回卡点与下一步', () => {
  const copy = page.resolveRowGuidance({
    status: 'revision_required',
    provider: 'guarantor',
    rejectionReason: '签名处缺失日期',
  }, '2026-04-09');

  assert.equal(copy.blocker, '已退回：签名处缺失日期。');
  assert.equal(copy.nextAction, '今天先把退回原因发给扶養者/保証人，并跟进重新提交时间。');
});

test('resolveRowGuidance 对共享过期资料提示同步受影响案件', () => {
  const copy = page.resolveRowGuidance({
    status: 'expired',
    provider: 'main_applicant',
    sharedVersionExpiry: true,
  }, '2026-04-09');

  assert.equal(copy.blocker, '当前版本已过期，而且会影响其他正在办的案件。');
  assert.equal(copy.nextAction, '今天先联系主申请人补最新版本，并同步受影响案件。');
});

test('getCaseTitle 去掉重复的案件编号前缀', () => {
  assert.equal(
    page.getCaseTitle('CAS-2026-0181', 'CAS-2026-0181 高度人才 (Michael T.)'),
    '高度人才 (Michael T.)',
  );
});

test('buildRowMeta 组合案件、提供方与辅助状态信息', () => {
  const meta = page.buildRowMeta({
    caseNo: 'CAS-2026-0156',
    caseLabel: 'CAS-2026-0156 家族滞在 (李明)',
    provider: 'guarantor',
    relativePath: 'A2026-0156/guarantor/guarantee/20260404_guarantee.pdf',
    lastReminder: '2026-04-06',
  });

  assert.equal(meta.caseTitle, '家族滞在 (李明)');
  assert.equal(meta.providerLabel, '扶養者/保証人');
  assert.equal(
    meta.metaText,
    'CAS-2026-0156 家族滞在 (李明) · 扶養者/保証人 · 已登记 · 最近催办 2026-04-06',
  );
});