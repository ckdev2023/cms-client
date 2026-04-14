import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  './side-nav.html',
  './mobile-nav.html',
].map((path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8'));

test('shared shell 导航仅保留当前入口并使用规范路径', () => {
  files.forEach((content) => {
    assert.match(content, /href="case\/index\.html"/);
    assert.match(content, /href="billing\/index\.html"/);
    assert.match(content, /href="settings\/index\.html"/);
    assert.doesNotMatch(content, /href="cases\/index\.html"/);
    assert.doesNotMatch(content, /href="billing\.html"/);
    assert.doesNotMatch(content, /href="forms\.html"/);
    assert.doesNotMatch(content, /href="reports\.html"/);
    assert.doesNotMatch(content, /\.\.\/src\/index\.html/);
  });
});