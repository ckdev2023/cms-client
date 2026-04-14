import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const billingPage = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const billingConfig = fs.readFileSync(new URL('../data/billing-config.js', import.meta.url), 'utf8');
const demoData = fs.readFileSync(new URL('../data/billing-demo-data.js', import.meta.url), 'utf8');
const tableSection = fs.readFileSync(new URL('../sections/billing-table.html', import.meta.url), 'utf8');

test('billing 页面不再保留 reports 与 portal 静态残留', () => {
  assert.doesNotMatch(billingPage, /\.\.\/reports\.html/);
  assert.doesNotMatch(billingPage, /\.\.\/\.\.\/src\/index\.html/);
  assert.doesNotMatch(billingConfig, /client-portal-reminder/);
});

test('billing 演示数据与表格不再包含经营管理签样例', () => {
  [demoData, tableSection].forEach((content) => {
    assert.doesNotMatch(content, /经营管理签/);
  });
  assert.match(demoData, /技术人文国际/);
  assert.match(tableSection, /技术人文国际/);
});