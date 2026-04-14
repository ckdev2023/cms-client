import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const groupMembersPanel = fs.readFileSync(
  new URL('../sections/group-members-panel.html', import.meta.url),
  'utf8'
);
const settingsPage = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stageZeroLabel = ['P', '0'].join('');

test('settings 成员区只读提示不再暴露旧阶段口径', () => {
  [groupMembersPanel, settingsPage].forEach((content) => {
    assert.doesNotMatch(content, new RegExp('title="' + stageZeroLabel + ' 仅展示，不支持增删成员"'));
    assert.match(content, /title="当前仅支持查看，不支持增删成员"/);
  });
});