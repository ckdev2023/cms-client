import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const filtersSection = fs.readFileSync(new URL('../sections/filters.html', import.meta.url), 'utf8');
const tableSection = fs.readFileSync(new URL('../sections/table.html', import.meta.url), 'utf8');
const detailSection = fs.readFileSync(new URL('../sections/detail-content.html', import.meta.url), 'utf8');
const customerConfig = fs.readFileSync(new URL('../data/customer-config.js', import.meta.url), 'utf8');
const customerDetailBasic = fs.readFileSync(new URL('./customer-detail-basic.js', import.meta.url), 'utf8');

test('customers 列表页不暴露 BMV 专项筛选入口，但保留经营管理签样例客户', () => {
  assert.doesNotMatch(filtersSection, /data-bmv-focus/);
  assert.doesNotMatch(filtersSection, /专项筛选/);
  assert.match(tableSection, /CUS-2026-0128/);
  assert.match(tableSection, /CUS-2026-0136/);
  assert.match(tableSection, /经营管理签/);
});

test('customers 演示数据包含经营管理签样例及前置承接配置', () => {
  assert.match(customerConfig, /CUS-2026-0128/);
  assert.match(customerConfig, /CUS-2026-0136/);
  assert.match(customerConfig, /bmvProfile/);
  assert.match(customerConfig, /发送问卷并等待客户回填/);
});

test('customers 详情页暴露经营管理签前置承接区块与脚本', () => {
  assert.match(detailSection, /customerBmvIntakeCard/);
  assert.match(detailSection, /发送问卷/);
  assert.match(detailSection, /确认签约/);
  assert.match(customerDetailBasic, /bmvProfile/);
  assert.match(customerDetailBasic, /经营管理签/);
});

test('customers 页入口文案改为顺路开始办案', () => {
  assert.match(detailSection, /开始办案/);
  assert.match(detailSection, /批量开始办案/);
  assert.match(tableSection, /从该客户开始办案/);
  assert.doesNotMatch(detailSection, /一键建案/);
  assert.doesNotMatch(tableSection, /为该客户建案/);
});