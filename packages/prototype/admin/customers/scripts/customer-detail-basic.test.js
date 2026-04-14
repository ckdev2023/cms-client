import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;

await import('./customer-detail-core.js');
await import('./customer-detail-basic.js');

const app = globalThis.CustomerDetailPage;

test('getLatestCaseCreatedAt 返回案件列表中的最新建案日期', () => {
  const value = app.getLatestCaseCreatedAt([
    { id: 'case-1', createdAt: '2026-02-26', updatedAt: '2026-03-22' },
    { id: 'case-2', createdAt: '2026-03-05', updatedAt: '2026-03-18' },
  ]);

  assert.equal(value, '2026-03-05');
});

test('getLatestCaseCreatedAt 在缺少 createdAt 时回退到 updatedAt 并截取日期', () => {
  const value = app.getLatestCaseCreatedAt([{ id: 'case-1', updatedAt: '2026-04-09T10:20' }]);

  assert.equal(value, '2026-04-09');
});

test('buildCreateCaseUrl 仅保留客户与模式参数，不透传额外模板字段', () => {
  const url = app.buildCreateCaseUrl(
    {
      id: 'CUS-2026-0102',
      group: 'tokyo-1',
      legacyTemplate: { code: 'work_standard', label: '技人国' },
    },
    'single'
  );

  assert.equal(url, '../case/create.html?customer_id=CUS-2026-0102&group=tokyo-1&mode=single');
});

test('buildCreateCaseUrl 支持批量开始办案模式参数', () => {
  const url = app.buildCreateCaseUrl(
    {
      id: 'CUS-2026-0102',
      group: 'tokyo-1',
    },
    'batch'
  );

  assert.equal(url, '../case/create.html?customer_id=CUS-2026-0102&group=tokyo-1&mode=batch');
});

test('getCreateCaseBlockedMessage 对已有客户不返回额外门禁提示', () => {
  assert.equal(app.getCreateCaseBlockedMessage({ id: 'CUS-2026-0102' }), '');
  assert.equal(app.getCreateCaseBlockedMessage(null), '请先选择客户');
});

test('经营管理签客户在签约前会阻止建案，签约后放行', () => {
  const pendingCustomer = {
    id: 'CUS-BMV-1',
    bmvProfile: { questionnaireStatus: 'returned', quoteStatus: 'generated', signStatus: 'pending' },
  };
  const signedCustomer = {
    id: 'CUS-BMV-2',
    bmvProfile: { questionnaireStatus: 'returned', quoteStatus: 'confirmed', signStatus: 'signed' },
  };

  assert.equal(app.canCreateCaseFromCustomer(pendingCustomer), false);
  assert.equal(app.getCreateCaseBlockedMessage(pendingCustomer), '经营管理签需先完成签约');
  assert.equal(app.canCreateCaseFromCustomer(signedCustomer), true);
  assert.equal(app.getCreateCaseBlockedMessage(signedCustomer), '');
});

test('经营管理签状态与发送方式提示按阶段解析', () => {
  const profile = app.createBmvProfile({ questionnaireStatus: 'returned', quoteStatus: 'generated', signStatus: 'pending', deliveryChannel: 'line' });
  const customer = { email: 'demo@example.jp', phone: '070-0000-0000', bmvProfile: profile };

  assert.equal(app.getBmvIntakeStatusLabel(profile), '待签约');
  assert.equal(app.resolveBmvNextStep(profile), '与客户确认签约时间');
  assert.equal(app.getBmvRecipientHint(customer, profile), '将通过 LINE 发送链接（示意），联系号码：070-0000-0000');
});

test('发送问卷前会校验邮箱或电话是否齐全', () => {
  const emailBlocked = app.getBmvSendBlockedMessage(
    { id: 'CUS-BMV-3', email: '', phone: '070-1111-1111', bmvProfile: { deliveryChannel: 'email' } },
    { deliveryChannel: 'email', signStatus: 'pending' }
  );
  const lineBlocked = app.getBmvSendBlockedMessage(
    { id: 'CUS-BMV-4', email: 'demo@example.jp', phone: '', bmvProfile: { deliveryChannel: 'line' } },
    { deliveryChannel: 'line', signStatus: 'pending' }
  );

  assert.match(emailBlocked, /缺少邮箱/);
  assert.match(lineBlocked, /缺少电话/);
});