import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dashboardPage = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const filtersSection = fs.readFileSync(new URL('../sections/filters.html', import.meta.url), 'utf8');
const dashboardConfig = fs.readFileSync(new URL('../data/dashboard-config.js', import.meta.url), 'utf8');
const worklistsSection = fs.readFileSync(new URL('../sections/worklists.html', import.meta.url), 'utf8');

test('dashboard 导航与快捷入口统一指向目录化页面', () => {
  assert.match(dashboardPage, /\.\.\/tasks\/index\.html/);
  assert.match(dashboardPage, /\.\.\/documents\/index\.html/);
  assert.match(dashboardPage, /\.\.\/billing\/index\.html/);
  assert.match(dashboardPage, /\.\.\/settings\/index\.html/);
  assert.doesNotMatch(dashboardPage, /\.\.\/tasks\.html/);
  assert.doesNotMatch(dashboardPage, /\.\.\/documents\.html/);
  assert.doesNotMatch(dashboardPage, /\.\.\/billing\.html/);
  assert.doesNotMatch(dashboardPage, /\.\.\/settings\.html/);
});

test('dashboard 不再暴露 forms/reports 等后续入口', () => {
  assert.doesNotMatch(dashboardPage, /\.\.\/forms\.html/);
  assert.doesNotMatch(dashboardPage, /\.\.\/reports\.html/);
});

test('dashboard 快捷入口跳转到 tasks 目录页', () => {
  assert.match(filtersSection, /\.\.\/tasks\/index\.html/);
  assert.doesNotMatch(filtersSection, /\.\.\/tasks\.html/);
});

test('dashboard 风险与回款摘要不再包含经营管理样例', () => {
  assert.doesNotMatch(dashboardConfig, /经营管理/);
  assert.match(dashboardConfig, /高度人才更新/);
});

test('dashboard 首页聚焦今天先要处理的四类工作', () => {
  assert.match(dashboardPage, /data-card-id="todayTasks"/);
  assert.match(dashboardPage, /data-card-id="upcomingCases"/);
  assert.match(dashboardPage, /data-card-id="pendingSubmissions"/);
  assert.match(dashboardPage, /data-card-id="riskCases"/);
  assert.doesNotMatch(dashboardPage, /data-card-id="pendingDocuments"/);
  assert.doesNotMatch(dashboardPage, /data-card-id="pendingBilling"/);
  assert.doesNotMatch(dashboardPage, /data-card-id="inReview"/);
  assert.match(dashboardPage, /已逾期 \/ 即将到期/);
  assert.match(worklistsSection, /已逾期 \/ 即将到期/);
  assert.doesNotMatch(worklistsSection, /id="documentList"/);
  assert.doesNotMatch(worklistsSection, /id="billingList"/);
});