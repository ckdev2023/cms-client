import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const overviewSection = fs.readFileSync(
  new URL('../sections/detail-overview.html', import.meta.url),
  'utf8'
);
const tabsSection = fs.readFileSync(
  new URL('../sections/detail-tabs.html', import.meta.url),
  'utf8'
);
const messagesSection = fs.readFileSync(
  new URL('../sections/detail-messages.html', import.meta.url),
  'utf8'
);
const billingSection = fs.readFileSync(
  new URL('../sections/detail-billing.html', import.meta.url),
  'utf8'
);
const stageOneLabel = ['P', '1'].join('');
const validationSection = fs.readFileSync(
  new URL('../sections/detail-validation.html', import.meta.url),
  'utf8'
);
const formsSection = fs.readFileSync(
  new URL('../sections/detail-forms.html', import.meta.url),
  'utf8'
);
const deadlinesSection = fs.readFileSync(
  new URL('../sections/detail-deadlines.html', import.meta.url),
  'utf8'
);
const headerSection = fs.readFileSync(
  new URL('../sections/detail-header.html', import.meta.url),
  'utf8'
);
const riskConfirmationSection = fs.readFileSync(
  new URL('../sections/detail-risk-confirmation.html', import.meta.url),
  'utf8'
);
const documentsSection = fs.readFileSync(
  new URL('../sections/detail-documents.html', import.meta.url),
  'utf8'
);
const detailConfig = fs.readFileSync(
  new URL('../data/case-detail-config.js', import.meta.url),
  'utf8'
);
const detailPage = fs.readFileSync(
  new URL('../detail.html', import.meta.url),
  'utf8'
);
const detailStyles = fs.readFileSync(
  new URL('../styles/case-detail.css', import.meta.url),
  'utf8'
);
const listPage = fs.readFileSync(
  new URL('../index.html', import.meta.url),
  'utf8'
);
const detailPageScript = fs.readFileSync(
  new URL('../scripts/case-detail-page.js', import.meta.url),
  'utf8'
);

test('detail 风险确认 section 仅保留当前已接线的欠款确认弹窗', () => {
  assert.match(riskConfirmationSection, /id="riskConfirmModal"/);
  assert.doesNotMatch(riskConfirmationSection, /id="coeRiskConfirmModal"/);
  assert.match(detailPage, /sections\/detail-risk-confirmation\.html/);
});

test('detail 配置移除未接线的 post-approval 残留字段', () => {
  assert.match(detailConfig, /family:\s*\{/);
  assert.match(detailConfig, /'gate-fail':\s*\{/);
  assert.doesNotMatch(detailConfig, /POST_APPROVAL_STAGES/);
  assert.doesNotMatch(detailConfig, /applicationFlowType/);
  assert.doesNotMatch(detailConfig, /postApprovalStage/);
  assert.doesNotMatch(detailConfig, /finalPaymentPaid/);
});

test('detail 概览与校验区保留对事务所更明确的动作入口', () => {
  assert.match(overviewSection, /id="overviewPrimaryAction"/);
  assert.match(overviewSection, /id="overviewSecondaryAction"/);
  assert.match(overviewSection, /data-target-tab="messages"/);
  assert.match(overviewSection, /查看提交前检查/);
  assert.match(validationSection, /去资料区补件/);
  assert.doesNotMatch(validationSection, />修复</);
});

test('detail 概览与提交前检查默认文案不暴露 Gate 或阶段编码', () => {
  assert.doesNotMatch(overviewSection, /S2 资料收集/);
  assert.doesNotMatch(overviewSection, /S5 校验准备/);
  assert.doesNotMatch(validationSection, /Gate-A/);
  assert.doesNotMatch(validationSection, /Gate-B/);
  assert.doesNotMatch(validationSection, /Gate-C/);
  assert.match(validationSection, /提交前检查/);
  assert.match(validationSection, /当前卡点/);
});

test('detail 风险摘要区提供可更新的人话文案挂点', () => {
  assert.match(overviewSection, /id="riskBlockingDetail"/);
  assert.match(overviewSection, /id="riskArrearsDetail"/);
  assert.match(overviewSection, /id="riskDeadlineAlertDetail"/);
  assert.doesNotMatch(overviewSection, /Gate-A 阻断，需修复后提交/);
});

test('detail tab 与沟通区补上事务所常用入口提示', () => {
  assert.match(tabsSection, /id="tasksNavCounter"/);
  assert.match(tabsSection, /id="validationNavCounter"/);
  assert.match(messagesSection, /id="btnPublishMessageRecord"/);
  assert.match(messagesSection, /data-target-tab="tasks"/);
});

test('detail 收费与沟通占位文案不再暴露后续阶段口径', () => {
  assert.match(billingSection, /当前原型暂不展示发票详情/);
  assert.doesNotMatch(billingSection, new RegExp('后续版本上线（' + stageOneLabel + '）'));
  assert.match(messagesSection, /当前原型暂不支持从沟通直接转任务/);
  assert.doesNotMatch(messagesSection, new RegExp('后续版本上线（' + stageOneLabel + '）'));
});

test('detail tab 顺序优先暴露校验、资料与任务入口', () => {
  var validationIndex = tabsSection.indexOf('data-tab="validation"');
  var documentsIndex = tabsSection.indexOf('data-tab="documents"');
  var tasksIndex = tabsSection.indexOf('data-tab="tasks"');
  var infoIndex = tabsSection.indexOf('data-tab="info"');

  assert.notEqual(validationIndex, -1);
  assert.notEqual(documentsIndex, -1);
  assert.notEqual(tasksIndex, -1);
  assert.notEqual(infoIndex, -1);
  assert.ok(validationIndex < documentsIndex);
  assert.ok(documentsIndex < tasksIndex);
  assert.ok(tasksIndex < infoIndex);
});

test('detail tab 片段保持 10 个可加载标签且不使用内联 svg', () => {
  assert.equal((tabsSection.match(/data-tab="/g) || []).length, 10);
  assert.doesNotMatch(tabsSection, /<svg[\s>]/i);
});

test('detail tab 栏在窄屏下仍保持多项直接可见', () => {
  assert.match(detailStyles, /\.detail-tabs\s*\{[^}]*overflow:\s*visible;/s);
  assert.match(detailStyles, /\.detail-tabs nav\s*\{[^}]*flex-wrap:\s*wrap;/s);
  assert.match(detailStyles, /\.detail-tabs nav\s*\{[^}]*width:\s*100%;/s);
});

test('detail 提交前检查使用更紧凑的主卡片与辅助区布局', () => {
  assert.match(validationSection, /class="validation-layout"/);
  assert.match(validationSection, /class="validation-support-grid"/);
  assert.match(validationSection, /id="validationInfoList"/);
  assert.match(detailStyles, /\.validation-overview-head\s*\{/);
  assert.match(detailStyles, /\.validation-support-grid\s*\{/);
});

test('case 页面导航统一指向目录化 index 路径且不再暴露后续入口', () => {
  [detailPage, listPage].forEach((content) => {
    assert.doesNotMatch(content, /\.\.\/tasks\.html/);
    assert.doesNotMatch(content, /\.\.\/documents\.html/);
    assert.doesNotMatch(content, /\.\.\/billing\.html/);
    assert.doesNotMatch(content, /\.\.\/settings\.html/);
    assert.doesNotMatch(content, /\.\.\/forms\.html/);
    assert.doesNotMatch(content, /\.\.\/reports\.html/);
    assert.doesNotMatch(content, /\.\.\/\.\.\/src\/index\.html/);
  });

  assert.match(detailPage, /\.\.\/tasks\/index\.html/);
  assert.match(detailPage, /\.\.\/documents\/index\.html/);
  assert.match(detailPage, /\.\.\/billing\/index\.html/);
  assert.match(detailPage, /\.\.\/settings\/index\.html/);
});

test('case 资料区跳转改为目录化 documents 入口', () => {
  assert.match(documentsSection, /data-navigate="\.\.\/documents\/index\.html"/);
  assert.doesNotMatch(documentsSection, /data-navigate="\.\.\/documents\.html"/);
});

test('case 详情为经营管理签后半段补齐样例切换与展示挂点', () => {
  assert.match(headerSection, /biz-coe-sent/);
  assert.match(headerSection, /biz-visa-applying/);
  assert.match(headerSection, /biz-visa-rejected/);
  assert.match(headerSection, /biz-residence-recorded/);
  assert.match(headerSection, /biz-reminder-scheduled/);

  assert.match(validationSection, /id="postApprovalFlowCard"/);
  assert.match(formsSection, /id="formsTemplateList"/);
  assert.match(formsSection, /id="formsGeneratedList"/);
  assert.match(deadlinesSection, /id="residencePeriodSummary"/);
  assert.match(deadlinesSection, /id="reminderScheduleSummary"/);

  assert.match(detailConfig, /经营管理签（认定）- 佐藤美咲/);
  assert.match(detailConfig, /COE_SENT/);
  assert.match(detailConfig, /VISA_APPLYING/);
  assert.match(detailConfig, /VISA_REJECTED/);
  assert.match(detailConfig, /RESIDENCE_PERIOD_RECORDED/);
  assert.match(detailConfig, /REMINDER_SCHEDULED/);
});

test('case 详情为经营管理签中段流程补齐样例切换，且支持按 URL sample 自动落位', () => {
  assert.match(headerSection, /biz-material-list-sent/);
  assert.match(headerSection, /biz-client-material-submitted/);
  assert.match(headerSection, /biz-material-drafting/);
  assert.match(headerSection, /biz-draft-completed/);
  assert.match(headerSection, /biz-client-final-review/);
  assert.match(headerSection, /biz-manager-final-review/);
  assert.match(headerSection, /biz-submitted-to-immigration/);
  assert.match(headerSection, /biz-immigration-feedback/);
  assert.match(headerSection, /biz-correction-processing/);
  assert.match(headerSection, /biz-final-payment-pending/);

  assert.match(detailConfig, /'biz-material-list-sent': BUSINESS_STEP_06/);
  assert.match(detailConfig, /'biz-final-payment-pending': BUSINESS_STEP_15/);
  assert.match(detailPageScript, /params\.get\('sample'\)/);
  assert.match(detailPageScript, /window\.history\.replaceState/);
  assert.match(detailPageScript, /resolveRequestedSampleKey\(window\.location\.search/);
});

