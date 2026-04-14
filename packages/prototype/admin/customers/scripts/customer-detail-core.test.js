import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;

const storage = new Map();
globalThis.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
  clear() {
    storage.clear();
  },
};

await import('../data/customer-config.js');
await import('./customer-detail-core.js');

const app = globalThis.CustomerDetailPage;
const storageKey = globalThis.CustomerConfig.DETAIL_STORAGE_KEY;

test('loadStore 会为旧版空缓存回填种子沟通记录与操作日志', () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      'CUS-2026-0120': {
        customer: { id: 'CUS-2026-0120', displayName: '陈丽' },
        comms: [],
        logs: [],
      },
    })
  );

  const store = app.loadStore('CUS-2026-0120');

  assert.ok(store.comms.length > 0);
  assert.ok(store.logs.length > 0);
});

test('loadStore 对当前版本显式保存的空数组保持原样', () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      'CUS-2026-0120': {
        __version: app.DETAIL_STORE_VERSION,
        customer: { id: 'CUS-2026-0120', displayName: '陈丽' },
        comms: [],
        logs: [],
      },
    })
  );

  const store = app.loadStore('CUS-2026-0120');

  assert.equal(store.comms.length, 0);
  assert.ok(store.logs.length > 0);
});

test('loadStore 对当前版本已有操作日志的缓存保持原样', () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      'CUS-2026-0120': {
        __version: app.DETAIL_STORE_VERSION,
        customer: { id: 'CUS-2026-0120', displayName: '陈丽' },
        comms: [],
        logs: [{ id: 'LOG-CACHED-1', type: 'info', actor: 'Tom', at: '2026-04-10T08:30', message: '缓存日志' }],
      },
    })
  );

  const store = app.loadStore('CUS-2026-0120');

  assert.equal(store.logs.length, 1);
  assert.equal(store.logs[0].id, 'LOG-CACHED-1');
});

test('loadStore 会为仅存在本地存储的客户生成默认操作日志', () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      'CUS-LOCAL-9001': {
        __version: app.DETAIL_STORE_VERSION,
        customer: {
          id: 'CUS-LOCAL-9001',
          displayName: '本地客户',
          owner: 'tom',
          lastContact: { date: '2026-04-12', channel: '电话' },
        },
        comms: [],
        logs: [],
      },
    })
  );

  const store = app.loadStore('CUS-LOCAL-9001');

  assert.equal(store.logs.length, 1);
  assert.equal(store.logs[0].type, 'info');
  assert.equal(store.logs[0].actor, 'Tom');
  assert.match(store.logs[0].message, /初始化客户档案：本地客户/);
});