import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;

await import('./customer-page.js');

const utils = globalThis.CustomerPageUtils;

test('buildCreateCaseUrl 会统一使用 single 模式进入开始办案页', () => {
  const url = utils.buildCreateCaseUrl({ id: 'CUS-2026-0102', group: 'tokyo-1' });

  assert.equal(url, '../case/create.html?customer_id=CUS-2026-0102&group=tokyo-1&mode=single');
});

test('matchesFilters 支持 mine 范围 + 搜索命中', () => {
  const viewer = utils.buildViewer({ owner: 'tom', group: 'tokyo-1' });
  const filters = utils.buildFilterState({ scope: 'mine', search: 'chen.li@email.com' });
  const row = utils.buildRowMeta({
    rowKind: 'customer',
    customerOwner: 'tom',
    customerGroup: 'tokyo-2',
    activeCases: '2',
    customerSearch: '陈丽 チン リ 080-2222-3333 chen.li@email.com',
  });

  assert.equal(utils.matchesFilters(row, filters, viewer), true);
});

test('matchesFilters 会排除不在当前 scope 的客户', () => {
  const viewer = utils.buildViewer({ owner: 'tom', group: 'tokyo-1' });
  const filters = utils.buildFilterState({ scope: 'group', activeCases: 'none' });
  const row = utils.buildRowMeta({
    rowKind: 'customer',
    customerOwner: 'admin',
    customerGroup: 'osaka',
    activeCases: '0',
    customerSearch: '大阪客户',
  });

  assert.equal(utils.matchesFilters(row, filters, viewer), false);
});

test('deriveOverviewStats 正确统计事务所常用客户概览', () => {
  const stats = utils.deriveOverviewStats(
    [
      { rowKind: 'customer', customerOwner: 'tom', customerGroup: 'tokyo-1', activeCases: '2' },
      { rowKind: 'customer', customerOwner: 'tom', customerGroup: 'tokyo-2', activeCases: '0' },
      { rowKind: 'customer', customerOwner: 'admin', customerGroup: 'tokyo-1', activeCases: '0' },
      { rowKind: 'draft', customerOwner: 'tom', customerGroup: 'tokyo-1', activeCases: '0' },
    ],
    { owner: 'tom', group: 'tokyo-1' },
  );

  assert.deepEqual(stats, { total: 3, mine: 2, group: 2, active: 1, noActive: 2 });
});

test('经营管理签客户的列表搜索词和门禁提示会包含前置承接状态', () => {
  const customer = {
    id: 'CUS-2026-0128',
    displayName: '佐藤美咲（经营管理签）',
    legalName: '佐藤美咲',
    kana: 'サトウ ミサキ',
    phone: '070-8888-1208',
    email: 'misaki.sato@example.jp',
    referrer: '广告投放（经营管理签）',
    bmvProfile: { questionnaireStatus: 'sent', quoteStatus: 'pending', signStatus: 'pending' },
  };

  assert.deepEqual(utils.buildBmvListTags(customer), ['经营管理签', '问卷准备中']);
  assert.equal(utils.canCreateCaseFromCustomer(customer), false);
  assert.equal(utils.getCreateCaseBlockedMessage(customer), '经营管理签需先完成签约');
  assert.match(utils.buildCustomerSearchText(customer, '东京一组'), /经营管理签/);
});