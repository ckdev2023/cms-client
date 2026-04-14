import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  '../index.html',
  '../detail.html',
  '../shell/side-nav.html',
  '../shell/mobile-nav.html',
].map((path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const headerSection = fs.readFileSync(new URL('../sections/header.html', import.meta.url), 'utf8');
const stageZeroLabel = ['P', '0'].join('');

test('leads-message 导航不再包含越界入口', () => {
  files.forEach((content) => {
    assert.doesNotMatch(content, /\.\.\/forms\.html/);
    assert.doesNotMatch(content, /\.\.\/reports\.html/);
    assert.doesNotMatch(content, /\.\.\/\.\.\/src\/index\.html/);
  });
});

test('leads-message 页头不再暴露内部阶段口径', () => {
  assert.match(headerSection, /聚焦线索录入、跟进与签约后转化闭环/);
  assert.doesNotMatch(headerSection, new RegExp(stageZeroLabel + ' 聚焦'));
});