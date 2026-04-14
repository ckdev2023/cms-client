import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.sessionStorage = {
  getItem() {
    return null;
  },
  setItem() {},
};

globalThis.document = {
  addEventListener() {},
  getElementById() {
    return null;
  },
  querySelector() {
    return null;
  },
};

window.TasksModal = {
  setup() {},
  closeModal() {},
  openModal() {},
  resetForm() {},
  updateSubmitEnabled() {},
};
window.TasksFilters = {
  setup() {},
  applyViewPreset() {},
};
window.TasksBulkActions = {
  setup() {},
  updateBulkState() {},
  openCancelDialog() {},
};
window.TasksReminderLog = {
  setup() {},
  showLogPanel() {},
  hideLogPanel() {},
};
window.location = { hash: '' };

await import('../data/tasks-config.js');
await import('../data/tasks-demo-data.js');
await import('./tasks-page.js');

const page = window.__tasksPage;

test('tasks 配置使用事务所执行口径标签', () => {
  assert.equal(window.TasksConfig.STATUS_LABEL_MAP.todo, '待跟进');
  assert.equal(window.TasksConfig.STATUS_LABEL_MAP.doing, '处理中');
  assert.equal(window.TasksConfig.SOURCE_LABEL_MAP.reminder, '资料催办');
  assert.equal(window.TasksConfig.SOURCE_LABEL_MAP['validation-fail'], '提交前修正');
});

test('资料催办任务优先给出今天动作提示', () => {
  const copy = page.getTaskExecutionCopy(
    {
      status: 'todo',
      source: 'reminder',
      deadline: '2026-04-09T18:00:00',
    },
    '2026-04-09'
  );

  assert.equal(copy.blocker, '还在等对方回传资料，所以这项任务暂时卡住。');
  assert.equal(copy.nextAction, '今天先继续催办，并确认对方最晚什么时候提交。');
});

test('提交前修正任务突出案件当前卡点', () => {
  const copy = page.getTaskExecutionCopy(
    {
      status: 'doing',
      source: 'validation-fail',
      deadline: '2026-04-14T18:00:00',
    },
    '2026-04-09'
  );

  assert.equal(copy.blocker, '提交前校验还没通过，案件暂时不能继续提交。');
  assert.equal(copy.nextAction, '先修正申请书与附件清单，再重新做一次提交前确认。');
});