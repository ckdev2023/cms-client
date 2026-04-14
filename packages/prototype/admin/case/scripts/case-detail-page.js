/**
 * Case Detail — page orchestration.
 *
 * Depends on:
 * - scripts/case-detail-runtime.js
 * - scripts/case-detail-renderers.js
 * - scripts/case-detail-documents.js
 */
(function () {
  'use strict';

  var ns = window.CaseDetailPage = window.CaseDetailPage || {};
  var initialized = false;

  function resolveBlockingAction(item) {
    var tab = item && item.actionTab ? item.actionTab : 'documents';
    var defaultLabel = tab === 'tasks' ? '去任务区跟进' : '去资料区补件';

    return {
      label: item && item.actionLabel ? item.actionLabel : defaultLabel,
      tab: tab,
    };
  }

  function resolveTaskNavBadge(tasks) {
    var pendingCount = Array.isArray(tasks)
      ? tasks.filter(function (task) {
        return task && !task.done;
      }).length
      : 0;

    if (!pendingCount) return null;

    return {
      label: '待办' + pendingCount,
      tone: 'warning',
    };
  }

  function resolveValidationNavBadge(validation) {
    var blockingCount = validation && Array.isArray(validation.blocking) ? validation.blocking.length : 0;
    var warningCount = validation && Array.isArray(validation.warnings) ? validation.warnings.length : 0;

    if (blockingCount) {
      return {
        label: '卡点' + blockingCount,
        tone: 'danger',
      };
    }

    if (warningCount) {
      return {
        label: '提醒' + warningCount,
        tone: 'warning',
      };
    }

    return null;
  }

  function applyNavBadge(id, badge) {
    var el = document.getElementById(id);
    if (!el) return;

    el.classList.remove('is-warning', 'is-danger');

    if (!badge) {
      el.hidden = true;
      el.textContent = '';
      return;
    }

    el.hidden = false;
    el.textContent = badge.label;
    if (badge.tone) {
      el.classList.add('is-' + badge.tone);
    }
  }

  function resolveRequestedSampleKey(search, fallbackKey) {
    var params = new URLSearchParams(search || '');
    var requestedKey = params.get('sample');
    return requestedKey && DETAIL_SAMPLES[requestedKey] ? requestedKey : fallbackKey;
  }

  function syncSampleQuery(key) {
    if (!window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    url.searchParams.set('sample', key);
    window.history.replaceState({}, '', url.toString());
  }

  function resolveReadonlyState(sample) {
    var isArchivedStage = !!(sample && sample.stageCode === 'S9');
    return {
      archived: isArchivedStage,
      readonly: isArchivedStage || !!(sample && sample.readonly),
    };
  }

  function init() {
    if (initialized) return;
    initialized = true;

  var sampleSelect = document.getElementById('caseSampleSelect');
  var tabs = Array.from(document.querySelectorAll('[data-tab]'));
  var panels = {};
  var ACTIVE_TAB_CLS = 'is-active';
  var riskModal = document.getElementById('riskConfirmModal');
  var providerToggle = document.getElementById('providerToggle');
  var providerBody = document.getElementById('providerProgressBody');
  var providerChevron = document.getElementById('providerChevron');

  DETAIL_TABS.forEach(function (tab) {
    panels[tab.key] = document.getElementById('tab-' + tab.key);
  });

  function setActiveTab(key) {
    tabs.forEach(function (link) {
      link.classList.toggle(ACTIVE_TAB_CLS, link.getAttribute('data-tab') === key);
    });

    Object.keys(panels).forEach(function (panelKey) {
      if (panels[panelKey]) {
        panels[panelKey].classList.toggle(ACTIVE_TAB_CLS, panelKey === key);
      }
    });
  }

  function resolveHashTab() {
    var raw = window.location.hash ? window.location.hash.slice(1) : '';
    if (!raw || !panels[raw]) return null;
    return raw;
  }

  function applySample(key) {
    var sample = DETAIL_SAMPLES[key];
    if (!sample) return;

    ns.currentSample = sample;

    ns.setText('breadcrumbCaseId', sample.id);
    ns.setText('caseTitle', sample.title);
    ns.setText('caseStatusText', sample.stage);
    ns.setText('caseClientName', sample.client);
    ns.setText('caseOwnerName', sample.owner);
    ns.setText('caseAgencyName', sample.agency);
    ns.setText('overviewStageText', sample.stage);
    ns.setText('overviewStageMeta', ns.resolveOverviewStageMeta ? ns.resolveOverviewStageMeta(sample) : sample.stageMeta);
    ns.setText('overviewDeadlineDate', sample.deadline);
    ns.setText('overviewDeadlineMeta', sample.deadlineMeta);
    ns.setText('overviewProgressPercent', sample.progressPercent + '%');
    ns.setText('overviewProgressCount', sample.progressCount);
    ns.setText('overviewBillingAmount', sample.billingAmount);
    ns.setText('overviewBillingMeta', sample.billingMeta);
    ns.setText('docsNavCounter', sample.docsCounter);
    applyNavBadge('tasksNavCounter', resolveTaskNavBadge(sample.tasks));
    applyNavBadge('validationNavCounter', resolveValidationNavBadge(sample.validation));

    var badge = document.getElementById('caseStatusBadge');
    if (badge) badge.className = 'status-badge text-[13px] ' + sample.statusBadge;

    var progressBar = document.getElementById('overviewProgressBar');
    if (progressBar) progressBar.style.width = sample.progressPercent + '%';

    var deadlineVal = document.getElementById('overviewDeadlineDate');
    var deadlineMeta = document.getElementById('overviewDeadlineMeta');
    if (sample.deadlineDanger) {
      if (deadlineVal) deadlineVal.classList.add('text-[var(--danger)]');
      if (deadlineMeta) deadlineMeta.classList.add('text-[var(--danger)]');
    } else {
      if (deadlineVal) deadlineVal.classList.remove('text-[var(--danger)]');
      if (deadlineMeta) deadlineMeta.classList.remove('text-[var(--danger)]');
    }

    ns.applyProviderProgress(sample.providerProgress);
    ns.applyRiskSummary(sample.risk);
    ns.applyOverviewHints(sample);
    ns.applyTimeline(sample.timeline);
    ns.applyTeam(sample.team);
    ns.applyInfoFields(sample);
    ns.applyRelatedParties(sample.relatedParties);
    ns.applyDocsProgress(sample);
    ns.applyDocumentItems(sample.documents);
    if (ns.applyForms) ns.applyForms(sample.forms);
    ns.applyTasks(sample.tasks);
    ns.applyDeadlines(sample.deadlines);
    if (ns.applyResidencePeriod) ns.applyResidencePeriod(sample.residencePeriod);
    if (ns.applyReminderSchedule) ns.applyReminderSchedule(sample.reminderSchedule);
    applyValidation(sample);
    applyBillingSummary(sample.billing);
    applyBillingTable(sample.billing);
    applyLogEntries(sample.logEntries);
    applyRiskConfirmationRecord(sample.riskConfirmationRecord);
    applyReadonly(resolveReadonlyState(sample));
  }

  function applyValidation(sample) {
    var validation = sample.validation;
    if (!validation) return;

    ns.setText('lastValidationTime', validation.lastTime || '');

    var blockingList = document.getElementById('validationBlockingList');
    if (blockingList) {
      blockingList.innerHTML = validation.blocking.length
        ? validation.blocking.map(function (item) {
          var action = resolveBlockingAction(item);

          return [
            '<div class="validation-item validation-item-danger">',
            '  <div class="validation-item__row">',
            '    <div class="validation-item__main">',
            '      <div class="validation-item__title">' + ns.esc(item.title) + '</div>',
            '      <div class="validation-item__desc">修复建议：' + ns.esc(item.fix) + '</div>',
            '    </div>',
            '    <button class="btn-pill text-[11px] py-1 px-2 shrink-0" type="button" data-target-tab="' + ns.esc(action.tab) + '">' + ns.esc(action.label) + '</button>',
            '  </div>',
            '  <div class="validation-item__meta"><span>责任人：' + ns.esc(item.assignee) + '</span><span>截止：' + ns.esc(item.deadline) + '</span></div>',
            '</div>',
          ].join('');
        }).join('')
        : '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">当前没有必须先处理的问题</div>';
    }

    var warningList = document.getElementById('validationWarningList');
    if (warningList) {
      warningList.innerHTML = validation.warnings.length
        ? validation.warnings.map(function (item) {
          return [
            '<div class="validation-item validation-item-warning">',
            '  <div class="validation-item__title">' + ns.esc(item.title) + '</div>',
            '  <div class="validation-item__desc">建议：' + ns.esc(item.note) + '</div>',
            '</div>',
          ].join('');
        }).join('')
        : '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">当前没有需要补强的提醒</div>';
    }

    var infoList = document.getElementById('validationInfoList');
    if (infoList) {
      infoList.innerHTML = validation.info && validation.info.length
        ? validation.info.map(function (item) {
          return [
            '<div class="validation-item validation-item-info">',
            '  <div class="validation-item__title">' + ns.esc(item.title) + '</div>',
            '  <div class="validation-item__desc">' + ns.esc(item.note) + '</div>',
            '</div>',
          ].join('');
        }).join('')
        : '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">当前没有补充说明</div>';
    }

    applySubmissionPackages(sample.submissionPackages);
    applyPostApprovalFlow(sample.postApprovalFlow);
    applyCorrectionPackage(sample.correctionPackage);
    applyDoubleReview(sample.doubleReview);
  }

  function applyPostApprovalFlow(flow) {
    var container = document.getElementById('postApprovalFlowCard');
    if (!container) return;

    if (!flow) {
      container.innerHTML = [
        '<div class="section-kicker mb-2 !text-[var(--primary)]">下签后处理</div>',
        '<div class="post-approval-head">',
        '  <h2 class="section-title">COE / 海外贴签 / 返签结果</h2>',
        '  <span class="chip post-approval-chip bg-blue-50 text-[var(--primary)] border-blue-200">当前案件未到该阶段</span>',
        '</div>',
        '<div class="text-[13px] text-[var(--muted-2)]">当前案件还在提交前或补正处理阶段，因此这里暂不展示 COE 发送、海外贴签和返签结果。切换到经营管理签后半段样例后可查看完整流程。</div>',
      ].join('');
      return;
    }

    var badgeCls = ns.badgeToneClass ? ns.badgeToneClass(flow.tone || 'primary') : 'bg-blue-50 text-[var(--primary)] border-blue-200';
    var rows = (flow.rows || []).map(function (row) {
      return '<div class="flex items-start justify-between gap-4 py-2 border-b border-[var(--border)] last:border-b-0"><div class="text-[12px] text-[var(--muted-2)] shrink-0">' + ns.esc(row.label) + '</div><div class="text-[13px] font-semibold text-[var(--text)] text-right">' + ns.esc(row.value) + '</div></div>';
    }).join('');
    var actions = (flow.actions || []).map(function (action) {
      return '<button class="btn-pill text-[12px] py-1 px-3" type="button">' + ns.esc(action.label) + '</button>';
    }).join('');

    container.innerHTML = [
      '<div class="section-kicker mb-2 !text-[var(--primary)]">下签后处理</div>',
      '<div class="post-approval-head">',
      '  <h2 class="section-title">COE / 海外贴签 / 返签结果</h2>',
      '  <span class="chip post-approval-chip ' + badgeCls + '">' + ns.esc(flow.statusLabel) + '</span>',
      '</div>',
      '<div class="rounded-xl border border-[var(--border)] bg-[#fbfbfd] px-4">' + rows + '</div>',
      '  <div class="text-[12px] text-[var(--muted)] mt-3">' + ns.esc(flow.note || '') + '</div>',
      (actions ? '  <div class="flex flex-wrap gap-2 mt-3">' + actions + '</div>' : ''),
    ].join('');
  }

  function applySubmissionPackages(packages) {
    var container = document.getElementById('submissionPackages');
    if (!container) return;

    if (!packages || !packages.length) {
      container.innerHTML = '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">暂无提交包</div>';
      return;
    }

    container.innerHTML = packages.map(function (pkg) {
      var lockChip = pkg.locked ? '<span class="chip package-card__chip">🔒 已锁定</span>' : '';

      return [
        '<div class="p-3 rounded-xl border border-[var(--border)] bg-[#fbfbfd]">',
        '  <div class="package-card__head mb-1.5">',
        '    <div class="package-card__title-row">',
        '      <span class="package-card__title">' + ns.esc(pkg.id) + '</span>',
        '      <span class="chip package-card__chip bg-green-50 text-green-700 border-green-200">' + ns.esc(pkg.status) + '</span>',
        '      ' + lockChip,
        '    </div>',
        '    <span class="text-[12px] text-[var(--muted-2)] font-semibold">' + ns.esc(pkg.date) + '</span>',
        '  </div>',
        '  <div class="text-[12px] text-[var(--muted)]">' + ns.esc(pkg.summary) + '</div>',
        '  <div class="flex flex-wrap gap-2 mt-2">',
        '    <button class="text-[12px] text-[var(--primary)] hover:underline font-semibold" type="button">查看内容</button>',
        '    <button class="text-[12px] text-[var(--primary)] hover:underline font-semibold" type="button">上传回执</button>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');
  }

  function applyCorrectionPackage(correction) {
    var container = document.getElementById('correctionPackage');
    if (!container) return;

    if (!correction) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    container.innerHTML = [
      '<div class="section-kicker mb-2 !text-[var(--warning)]">补正包</div>',
      '<h2 class="section-title mb-3">补正通知关联</h2>',
      '<div class="p-3 rounded-xl border border-[var(--warning)]/20 bg-amber-50/30 mb-2">',
      '  <div class="package-card__head mb-1.5">',
      '    <div class="package-card__title-row">',
      '      <span class="package-card__title">' + ns.esc(correction.id) + '</span>',
      '      <span class="chip package-card__chip bg-amber-50 text-amber-700 border-amber-200">' + ns.esc(correction.status) + '</span>',
      '    </div>',
      '    <span class="text-[12px] text-[var(--muted-2)] font-semibold">通知日：' + ns.esc(correction.noticeDate) + '</span>',
      '  </div>',
      '  <div class="text-[12px] text-[var(--muted)] mb-2">关联原提交包：' + ns.esc(correction.relatedSub) + ' · 补正截止：' + ns.esc(correction.corrDeadline) + '</div>',
      '  <div class="text-[12px] text-[var(--muted)]">补正项：' + ns.esc(correction.items) + '</div>',
      '  <div class="flex gap-2 mt-3">',
      '    <button class="btn-pill text-[12px] py-1 px-3" type="button">与原提交包对比</button>',
      '    <button class="text-[12px] text-[var(--primary)] hover:underline font-semibold" type="button">查看补正通知</button>',
      '  </div>',
      '</div>',
      '<div class="text-[12px] text-[var(--muted-2)]">' + ns.esc(correction.note) + '</div>',
    ].join('');
  }

  function applyDoubleReview(reviews) {
    var container = document.getElementById('doubleReview');
    if (!container) return;

    if (!reviews || !reviews.length) {
      container.innerHTML = '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">暂无复核记录</div>';
      return;
    }

    container.innerHTML = reviews.map(function (review) {
      var verdictChip = review.verdictBadge === 'badge-green'
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-red-50 text-red-700 border-red-200';
      var rejectBlock = review.rejectReason
        ? '<div class="mt-2 p-2 rounded-lg bg-red-50/50 border border-[var(--danger)]/10"><div class="text-[11px] font-bold text-[var(--danger)] mb-1">驳回原因</div><div class="text-[12px] text-[var(--text)]">' + ns.esc(review.rejectReason) + '</div></div>'
        : '';
      var commentLine = review.comment
        ? '<div class="text-[12px] text-[var(--muted)]">' + ns.esc(review.time) + ' · ' + ns.esc(review.comment) + '</div>'
        : '<div class="text-[12px] text-[var(--muted)]">' + ns.esc(review.time) + '</div>';
      var avatarColor = review.verdictBadge === 'badge-green' ? 'var(--success)' : 'var(--danger)';

      return [
        '<div class="p-3 rounded-xl border border-[var(--border)]">',
        '  <div class="flex items-center gap-2 mb-1.5 flex-wrap">',
        '    <div class="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold" style="background:' + avatarColor + '">' + ns.esc(review.initials) + '</div>',
        '    <span class="text-[13px] font-bold text-[var(--text)]">' + ns.esc(review.name) + '</span>',
        '    <span class="chip text-[10px] py-0 px-1.5 ' + verdictChip + '">' + ns.esc(review.verdict) + '</span>',
        '  </div>',
        '  ' + commentLine,
        '  ' + rejectBlock,
        '</div>',
      ].join('');
    }).join('');
  }

  function rebindRiskTrigger() {
    var btn = document.getElementById('triggerRiskConfirm');
    if (!btn || !riskModal) return;

    btn.onclick = function () {
      riskModal.classList.add('show');
    };
  }

  function applyRiskConfirmationRecord(record) {
    var container = document.getElementById('riskConfirmation');
    if (!container) return;

    if (!record) {
      container.innerHTML = [
        '<h2 class="text-[15px] font-bold text-[var(--text)] mb-4">欠款风险确认记录</h2>',
        '<div class="text-center py-2">',
        '  <div class="text-[13px] text-[var(--muted-2)] font-semibold mb-2">当前无欠款风险确认</div>',
        '  <button class="btn-pill text-[12px] py-1.5 px-3" type="button" id="triggerRiskConfirm">模拟欠款确认</button>',
        '</div>',
      ].join('');
      rebindRiskTrigger();
      return;
    }

    container.innerHTML = [
      '<h2 class="text-[15px] font-bold text-[var(--text)] mb-4">欠款风险确认记录</h2>',
      '<div class="p-4 rounded-xl border border-[var(--warning)]/20 bg-amber-50/30">',
      '  <div class="flex items-center gap-2 mb-2">',
      '    <svg class="w-5 h-5 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
      '    <span class="text-[14px] font-bold text-[var(--text)]">已确认（欠款继续提交）</span>',
      '  </div>',
      '  <div class="text-[12px] text-[var(--muted)] space-y-1">',
      '    <div>确认人：' + ns.esc(record.confirmedBy) + '</div>',
      '    <div>确认时间：' + ns.esc(record.time) + '</div>',
      '    <div>欠款金额：' + ns.esc(record.amount) + '</div>',
      '    <div>确认原因：' + ns.esc(record.reason) + '</div>',
      '  </div>',
      '</div>',
      '<div class="mt-3"><button class="btn-pill text-[12px] py-1.5 px-3" type="button" id="triggerRiskConfirm">再次模拟欠款确认</button></div>',
    ].join('');
    rebindRiskTrigger();
  }

  function applyBillingSummary(billing) {
    if (!billing) return;
    ns.setText('billingTotal', billing.total);
    ns.setText('billingReceived', billing.received);
    ns.setText('billingOutstanding', billing.outstanding);
  }

  function applyBillingTable(billing) {
    if (!billing || !billing.payments) return;

    var tbody = document.querySelector('#tab-billing tbody');
    if (!tbody) return;

    tbody.innerHTML = billing.payments.map(function (payment) {
      var badgeCls = ns.billingBadge(payment.status);
      var actionLabel = payment.status === 'paid' ? '查看收据' : '登记回款';

      return [
        '<tr>',
        '  <td class="font-semibold text-[var(--text)]">' + ns.esc(payment.date) + '</td>',
        '  <td>' + ns.esc(payment.type) + '</td>',
        '  <td class="text-right font-semibold text-[var(--text)]">' + ns.esc(payment.amount) + '</td>',
        '  <td class="text-center"><span class="status-badge ' + badgeCls + ' text-[11px]">' + ns.esc(payment.statusLabel) + '</span></td>',
        '  <td class="text-right"><button class="text-[var(--primary)] text-[13px] font-semibold hover:underline row-quick-action" type="button">' + actionLabel + '</button></td>',
        '</tr>',
      ].join('');
    }).join('');
  }

  function formatObjectType(entry) {
    if (!entry.objectType) return '';
    if (/^操作人/.test(entry.objectType)) return ns.esc(entry.objectType);
    return '对象：' + ns.esc(entry.objectType);
  }

  function resetLogFilter() {
    var filterBtns = document.querySelectorAll('[data-log-category]');
    filterBtns.forEach(function (btn) {
      btn.classList.remove('active');
    });

    var allBtn = document.querySelector('[data-log-category="all"]');
    if (allBtn) allBtn.classList.add('active');

    var items = document.querySelectorAll('[data-log-type]');
    items.forEach(function (item) {
      item.style.display = '';
    });
  }

  function applyLogEntries(entries) {
    var container = document.querySelector('#tab-log .border-l-2');
    if (!container || !entries) return;

    container.innerHTML = entries.map(function (entry, index) {
      var dotColor = entry.dotColor === 'primary'
        ? 'var(--primary)'
        : entry.dotColor === 'success'
          ? 'var(--success)'
          : entry.dotColor === 'warning'
            ? 'var(--warning)'
            : entry.dotColor === 'danger'
              ? 'var(--danger)'
              : 'var(--border)';

      var avatarBgColor = entry.avatarStyle === 'primary'
        ? 'bg-[var(--primary)] text-white'
        : entry.avatarStyle === 'success'
          ? 'bg-[var(--success)] text-white'
          : entry.avatarStyle === 'warning'
            ? 'bg-[var(--warning)] text-white'
            : entry.avatarStyle === 'danger'
              ? 'bg-[var(--danger)] text-white'
              : 'bg-[var(--surface-2)] text-[var(--text)]';

      var categoryChipCls = ns.chipClass(entry.categoryChip);
      var borderCls = index === entries.length - 1 ? '' : ' border-b border-[var(--border)]';

      return [
        '<div class="relative pl-6 py-4' + borderCls + ' hover:bg-[#fbfbfd] transition-colors group" data-log-type="' + ns.esc(entry.type) + '">',
        '  <div class="timeline-dot" style="background:' + dotColor + '"></div>',
        '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">',
        '    <div class="flex items-center gap-3">',
        '      <div class="w-6 h-6 rounded-full ' + avatarBgColor + ' flex items-center justify-center text-[9px] font-bold">' + ns.esc(entry.avatar) + '</div>',
        '      <div>',
        '        <div class="text-[14px] text-[var(--text)]">' + entry.text + '</div>',
        '        <div class="flex items-center gap-2 mt-1">',
        '          <span class="chip text-[10px] py-0 px-1.5 ' + categoryChipCls + '">' + ns.esc(entry.category) + '</span>',
        '          <span class="text-[11px] text-[var(--muted-2)]">' + formatObjectType(entry) + '</span>',
        '        </div>',
        '      </div>',
        '    </div>',
        '    <div class="text-[12px] font-semibold text-[var(--muted-2)] whitespace-nowrap">' + ns.esc(entry.time) + '</div>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');

    resetLogFilter();
  }

  function applyReadonly(state) {
    var readonlyState = state && typeof state === 'object'
      ? state
      : { archived: !!state, readonly: !!state };
    var isReadonly = !!readonlyState.readonly;
    var banner = document.getElementById('readonlyBanner');
    if (banner) banner.classList.toggle('is-visible', !!readonlyState.archived);

    ['btnEditInfo', 'btnAdvanceStage', 'btnExportZip'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = isReadonly;
      btn.style.opacity = isReadonly ? '0.4' : '';
      btn.style.pointerEvents = isReadonly ? 'none' : '';
    });

    var inputs = document.querySelectorAll('#tab-info input, #tab-info select, #tab-info textarea');
    inputs.forEach(function (input) {
      input.disabled = isReadonly;
      input.classList.toggle('cursor-not-allowed', isReadonly);
      input.classList.toggle('opacity-60', isReadonly);
    });

    var buttons = document.querySelectorAll(
      '#tab-info button, #tab-documents button, #tab-messages button, ' +
      '#tab-forms button, #tab-tasks button, #tab-tasks input, ' +
      '#tab-deadlines button, #tab-validation button, #tab-billing button'
    );
    buttons.forEach(function (btn) {
      btn.disabled = isReadonly;
      btn.style.opacity = isReadonly ? '0.4' : '';
      btn.style.pointerEvents = isReadonly ? 'none' : '';
    });
  }

  tabs.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var key = link.getAttribute('data-tab');
      if (!key) return;
      setActiveTab(key);
      window.location.hash = key;
    });
  });

  window.addEventListener('hashchange', function () {
    var key = resolveHashTab();
    if (key) setActiveTab(key);
  });

  if (providerToggle && providerBody) {
    providerToggle.addEventListener('click', function () {
      var isHidden = providerBody.style.display === 'none';
      providerBody.style.display = isHidden ? '' : 'none';
      if (providerChevron) {
        providerChevron.style.transform = isHidden ? '' : 'rotate(-90deg)';
      }
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close-risk-modal]') && riskModal) {
      riskModal.classList.remove('show');
      return;
    }

    var button = e.target.closest('button');
    if (!button) return;

    var text = button.textContent.trim();

    if (button.id === 'btnExportZip') {
      ns.showToast(DETAIL_TOASTS.exportZip.title, DETAIL_TOASTS.exportZip.desc);
      return;
    }

    if (button.id === 'btnAdvanceStage') {
      var sample = sampleSelect ? DETAIL_SAMPLES[sampleSelect.value] : DETAIL_SAMPLES.work;
      var stage = sample ? DETAIL_STAGES[sample.stageCode] : null;
      var nextCode = stage ? 'S' + (parseInt(stage.code.replace('S', ''), 10) + 1) : '';
      var nextStage = DETAIL_STAGES[nextCode];
      ns.showToast(
        DETAIL_TOASTS.stageAdvanced.title,
        DETAIL_TOASTS.stageAdvanced.desc
          .replace('{from}', stage ? stage.label : '当前阶段')
          .replace('{to}', nextStage ? nextStage.label : '下一阶段')
      );
      return;
    }

    if (button.id === 'btnEditInfo') {
      setActiveTab('info');
      return;
    }

    if (button.id === 'riskConfirmSubmit') {
      if (riskModal) riskModal.classList.remove('show');
      ns.showToast(DETAIL_TOASTS.riskConfirmed.title, DETAIL_TOASTS.riskConfirmed.desc);
      return;
    }

    var waiveBtn = e.target.closest('[data-waive-item]');
    if (waiveBtn) {
      var itemName = waiveBtn.getAttribute('data-waive-item');
      ns.showToast(DETAIL_TOASTS.waived.title, DETAIL_TOASTS.waived.desc.replace('{item}', itemName));

      var row = waiveBtn.closest('.doc-item');
      if (row) {
        row.classList.add('is-waived');
        var nameEl = row.querySelector('.min-w-0 > div:first-child');
        if (nameEl) {
          nameEl.classList.add('line-through');
          nameEl.style.color = 'var(--muted)';
        }
        var badge = row.querySelector('.status-badge');
        if (badge) {
          badge.className = 'status-badge badge-gray text-[11px]';
          badge.textContent = '无需提供';
        }
        waiveBtn.remove();
      }
      return;
    }

    var targetTab = button.getAttribute('data-target-tab');
    if (targetTab && panels[targetTab]) {
      setActiveTab(targetTab);
      window.location.hash = targetTab;
      return;
    }

    if (text === '查看完整日志 →') {
      setActiveTab('log');
      return;
    }

    if (text === '生成文書' || text === '生成') {
      ns.showToast('文書生成（示例）', '已将模板数据填入，可在"已生成文書"查看');
      return;
    }
    if (button.id === 'btnPublishMessageRecord' || text === '记录留痕') {
      ns.showToast('记录已写入时间线（示例）', '沟通记录已添加到时间线');
      return;
    }
    if (text === '手动添加') {
      ns.showToast('添加资料项（示例）', '已添加新的资料项到清单');
      return;
    }
    if (button.classList.contains('add-task-btn') || text === '新增任务') {
      ns.showToast('新增任务（示例）', '已创建新的跟进任务');
    }
  });

  document.addEventListener('change', function (e) {
    var toggle = e.target.closest('.task-toggle');
    if (!toggle) return;

    var label = toggle.parentElement.querySelector('span');
    if (!label) return;

    label.classList.toggle('line-through', toggle.checked);
    label.classList.toggle('text-[var(--muted)]', toggle.checked);
    label.classList.toggle('font-semibold', !toggle.checked);
    label.classList.toggle('text-[var(--text)]', !toggle.checked);
  });

  document.querySelectorAll('[data-log-category]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-log-category]').forEach(function (item) {
        item.classList.remove('active');
      });
      btn.classList.add('active');

      var category = btn.getAttribute('data-log-category');
      document.querySelectorAll('[data-log-type]').forEach(function (logItem) {
        logItem.style.display = category === 'all' || logItem.getAttribute('data-log-type') === category ? '' : 'none';
      });
    });
  });

  rebindRiskTrigger();

  if (sampleSelect) {
    sampleSelect.addEventListener('change', function () {
      applySample(sampleSelect.value);
      syncSampleQuery(sampleSelect.value);
      setActiveTab('overview');
    });
  }

  var initialSampleKey = resolveRequestedSampleKey(window.location.search, sampleSelect ? sampleSelect.value : 'work');
  if (sampleSelect) sampleSelect.value = initialSampleKey;
  applySample(initialSampleKey);
  syncSampleQuery(initialSampleKey);
  setActiveTab(resolveHashTab() || 'overview');

  ns.setActiveTab = setActiveTab;
  ns.resolveHashTab = resolveHashTab;
  ns.applySample = applySample;

  }

  ns.resolveBlockingAction = resolveBlockingAction;
  ns.resolveTaskNavBadge = resolveTaskNavBadge;
  ns.resolveValidationNavBadge = resolveValidationNavBadge;
  ns.resolveRequestedSampleKey = resolveRequestedSampleKey;
  ns.resolveReadonlyState = resolveReadonlyState;

  document.addEventListener('prototype:fragments-ready', init);

  if (window.__prototypeFragmentsReady || !document.querySelector('[data-include-html]')) {
    init();
  }
})();
