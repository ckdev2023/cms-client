import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const headerSection = fs.readFileSync(
  new URL('../sections/detail-header.html', import.meta.url),
  'utf8'
);
const warningSection = fs.readFileSync(
  new URL('../sections/detail-warning-banner.html', import.meta.url),
  'utf8'
);
const conversionSection = fs.readFileSync(
  new URL('../sections/detail-conversion.html', import.meta.url),
  'utf8'
);
const modalSection = fs.readFileSync(
  new URL('../sections/detail-convert-modals.html', import.meta.url),
  'utf8'
);

test('签约后建档入口在 header 中优先展示案件动作', () => {
  assert.ok(headerSection.indexOf('id="btnConvertCase"') < headerSection.indexOf('id="btnConvertCustomer"'));
  assert.match(headerSection, /签约并开始建档/);
  assert.match(headerSection, /仅转客户/);
});

test('warning banner 直接引导签约后开始建档', () => {
  assert.match(warningSection, /id="warningBannerText"/);
  assert.match(warningSection, /下一步请直接开始建档并创建首个案件/);
  assert.match(warningSection, /id="warningConvertBtn"/);
  assert.match(warningSection, /签约并开始建档/);
});

test('conversion tab 将开始建档动作放在客户转化之前', () => {
  assert.ok(conversionSection.indexOf('id="convertCaseCard"') < conversionSection.indexOf('id="convertCustomerCard"'));
  assert.match(conversionSection, /id="convertCaseTitle"/);
  assert.match(conversionSection, /系统会先创建客户档案，再继续创建首个案件/);
  assert.match(conversionSection, /id="convertCustomerTitle"/);
});

test('案件转化弹窗改为签约并开始建档口径', () => {
  assert.match(modalSection, /id="convertCaseModalTitle"/);
  assert.match(modalSection, /会先创建客户档案，再为此线索创建首个案件/);
  assert.match(modalSection, /确认并开始建档/);
});