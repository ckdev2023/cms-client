import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const demoData = fs.readFileSync(new URL('../data/tasks-demo-data.js', import.meta.url), 'utf8');
const tasksConfig = fs.readFileSync(new URL('../data/tasks-config.js', import.meta.url), 'utf8');
const tableSection = fs.readFileSync(new URL('../sections/task-table.html', import.meta.url), 'utf8');
const reminderLogPanel = fs.readFileSync(new URL('../sections/reminder-log-panel.html', import.meta.url), 'utf8');
const stageZeroLabel = ['P', '0'].join('');

test('tasks 演示数据与任务展示不再包含经营管理样例', () => {
  [demoData, tableSection, reminderLogPanel].forEach((content) => {
    assert.doesNotMatch(content, /经营管理/);
    assert.doesNotMatch(content, /経営管理/);
  });
  assert.match(demoData, /技术人文国际/);
  assert.match(tableSection, /技术人文国际/);
});

test('tasks 配置不再保留旧行内标签字面量', () => {
  assert.doesNotMatch(tasksConfig, new RegExp(stageZeroLabel + ' 行内标签仅'));
});