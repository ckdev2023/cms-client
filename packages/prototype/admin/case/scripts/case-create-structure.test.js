import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const createPage = fs.readFileSync(
  new URL('../create.html', import.meta.url),
  'utf8'
);
const createHeaderSection = fs.readFileSync(
  new URL('../sections/create-header.html', import.meta.url),
  'utf8'
);
const businessFormSection = fs.readFileSync(
  new URL('../sections/business-form.html', import.meta.url),
  'utf8'
);
const relatedPartiesSection = fs.readFileSync(
  new URL('../sections/related-parties.html', import.meta.url),
  'utf8'
);
const stageZeroLabel = ['P', '0'].join('');
const stageOneLabel = ['P', '1'].join('');

test('create 页头与步骤说明不再暴露内部阶段口径', () => {
  [createPage, createHeaderSection].forEach((content) => {
    assert.match(content, /当前范围：标准模板/);
    assert.match(content, /开始办案/);
    assert.doesNotMatch(content, new RegExp('当前向导：仅 ' + stageZeroLabel + ' 模板'));
  });

  [createPage, businessFormSection, relatedPartiesSection].forEach((content) => {
    assert.doesNotMatch(content, new RegExp('\\b' + stageZeroLabel + '\\b'));
    assert.doesNotMatch(content, new RegExp('\\b' + stageOneLabel + '\\b'));
    assert.doesNotMatch(content, /经营管理签/);
  });

  assert.match(createPage, /下一步：确认主申请人与资料/);
  assert.match(createPage, /开始办案并生成案件/);
});

test('create 页导航不再引用旧的 admin 根路径 html', () => {
  assert.match(createPage, /\.\.\/tasks\/index\.html/);
  assert.match(createPage, /\.\.\/documents\/index\.html/);
  assert.match(createPage, /\.\.\/billing\/index\.html/);
  assert.match(createPage, /\.\.\/settings\/index\.html/);
  assert.doesNotMatch(createPage, /\.\.\/tasks\.html/);
  assert.doesNotMatch(createPage, /\.\.\/documents\.html/);
  assert.doesNotMatch(createPage, /\.\.\/billing\.html/);
  assert.doesNotMatch(createPage, /\.\.\/settings\.html/);
  assert.doesNotMatch(createPage, /\.\.\/forms\.html/);
  assert.doesNotMatch(createPage, /\.\.\/reports\.html/);
});

test('create 页会先加载 helpers 与 view-models，再加载 page 脚本', () => {
  assert.match(createPage, /scripts\/case-create-helpers\.js[\s\S]*scripts\/case-create-view-models\.js[\s\S]*scripts\/case-create-page\.js/);
});