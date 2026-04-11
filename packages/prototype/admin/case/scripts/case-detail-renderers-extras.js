/**
 * Case Detail — Renderers (REN-Extras)
 * Log, readonly, UI toggles, messages, and management-only tabs.
 *
 * Depends on: case-detail-runtime.js (ns.esc, ns.chipClass, ns.showToast)
 * Depends on: case-detail-tabs.js (ns.panels)
 * Namespace: window.CaseDetailPage
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  /* ================================================================== */
  /*  LOG TAB                                                            */
  /* ================================================================== */

  function formatObjectType(entry) {
    if (!entry.objectType) return '';
    if (/^操作人/.test(entry.objectType)) return ns.esc(entry.objectType);
    return '对象：' + ns.esc(entry.objectType);
  }

  function applyLogEntries(entries) {
    var container = document.getElementById('logTimeline');
    if (!container || !entries) return;

    container.innerHTML = entries.map(function (entry, idx) {
      var dotColor = entry.dotColor === 'primary' ? 'var(--primary)'
        : entry.dotColor === 'success' ? 'var(--success)'
        : entry.dotColor === 'warning' ? 'var(--warning)'
        : entry.dotColor === 'danger' ? 'var(--danger)'
        : 'var(--border)';

      var avatarBgColor = entry.avatarStyle === 'primary' ? 'bg-[var(--primary)] text-white'
        : entry.avatarStyle === 'success' ? 'bg-[var(--success)] text-white'
        : entry.avatarStyle === 'warning' ? 'bg-[var(--warning)] text-white'
        : entry.avatarStyle === 'danger' ? 'bg-[var(--danger)] text-white'
        : 'bg-[var(--surface-2)] text-[var(--text)]';

      var categoryChipCls = ns.chipClass(entry.categoryChip);
      var isLast = idx === entries.length - 1;
      var borderCls = isLast ? '' : ' border-b border-[var(--border)]';

      var sourceHtml = '';
      if (entry.source_type) {
        sourceHtml = '<span class="text-[10px] text-[var(--muted-2)] font-mono bg-[var(--surface-2)] px-1 py-0.5 rounded ml-1">' +
          ns.esc(entry.source_type) + (entry.source_key ? ':' + ns.esc(entry.source_key) : '') + '</span>';
      }

      return [
        '<div class="relative pl-6 py-4' + borderCls + ' hover:bg-[#fbfbfd] transition-colors group" data-log-type="' + ns.esc(entry.type) + '">',
        '  <div class="timeline-dot" style="background:' + dotColor + '"></div>',
        '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">',
        '    <div class="flex items-center gap-3">',
        '      <div class="w-6 h-6 rounded-full ' + avatarBgColor + ' flex items-center justify-center text-[9px] font-bold">' + ns.esc(entry.avatar) + '</div>',
        '      <div>',
        '        <div class="text-[14px] text-[var(--text)]">' + entry.text + '</div>',
        '        <div class="flex items-center gap-2 mt-1 flex-wrap">',
        '          <span class="chip text-[10px] py-0 px-1.5 ' + categoryChipCls + '">' + ns.esc(entry.category) + '</span>',
        '          <span class="text-[11px] text-[var(--muted-2)]">' + formatObjectType(entry) + '</span>',
                   sourceHtml,
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

  /* ================================================================== */
  /*  LOG — Category Filter                                              */
  /* ================================================================== */

  function resetLogFilter() {
    var filterBtns = document.querySelectorAll('[data-log-category]');
    filterBtns.forEach(function (btn) { btn.classList.remove('active'); });
    var allBtn = document.querySelector('[data-log-category="all"]');
    if (allBtn) allBtn.classList.add('active');

    var items = document.querySelectorAll('[data-log-type]');
    items.forEach(function (item) { item.style.display = ''; });
  }

  var logFilterBtns = document.querySelectorAll('[data-log-category]');

  logFilterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      logFilterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var category = btn.getAttribute('data-log-category');
      var logItems = document.querySelectorAll('[data-log-type]');
      logItems.forEach(function (item) {
        if (category === 'all') {
          item.style.display = '';
        } else {
          item.style.display = item.getAttribute('data-log-type') === category ? '' : 'none';
        }
      });
    });
  });

  /* ================================================================== */
  /*  READONLY CONTROL                                                   */
  /* ================================================================== */

  function applyReadonly(isReadonly) {
    var banner = document.getElementById('readonlyBanner');
    if (banner) banner.classList.toggle('is-visible', isReadonly);

    var actionBtnIds = ['btnEditInfo', 'btnAdvanceStage', 'btnExportZip'];
    actionBtnIds.forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = isReadonly;
      btn.style.opacity = isReadonly ? '0.4' : '';
      btn.style.pointerEvents = isReadonly ? 'none' : '';
    });

    var allInputs = document.querySelectorAll('#tab-info input, #tab-info select, #tab-info textarea');
    allInputs.forEach(function (input) {
      input.disabled = isReadonly;
      if (isReadonly) {
        input.classList.add('cursor-not-allowed', 'opacity-60');
      } else {
        input.classList.remove('cursor-not-allowed', 'opacity-60');
      }
    });

    var allButtons = document.querySelectorAll(
      '#tab-info button, #tab-documents button, #tab-messages button, ' +
      '#tab-forms button, #tab-tasks button, #tab-tasks input, ' +
      '#tab-deadlines button, #tab-validation button, #tab-billing button'
    );
    allButtons.forEach(function (btn) {
      if (isReadonly) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.pointerEvents = 'none';
      } else {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
      }
    });
  }

  /* ================================================================== */
  /*  PROVIDER PROGRESS TOGGLE                                           */
  /* ================================================================== */

  var providerToggle = document.getElementById('providerToggle');
  var providerBody = document.getElementById('providerProgressBody');
  var providerChevron = document.getElementById('providerChevron');

  if (providerToggle && providerBody) {
    providerToggle.addEventListener('click', function () {
      var isHidden = providerBody.style.display === 'none';
      providerBody.style.display = isHidden ? '' : 'none';
      if (providerChevron) {
        providerChevron.style.transform = isHidden ? '' : 'rotate(-90deg)';
      }
    });
  }

  /* ================================================================== */
  /*  TASK TOGGLE                                                        */
  /* ================================================================== */

  document.addEventListener('change', function (e) {
    var toggle = e.target.closest('.task-toggle');
    if (!toggle) return;
    var label = toggle.parentElement.querySelector('span');
    if (!label) return;
    if (toggle.checked) {
      label.classList.add('line-through', 'text-[var(--muted)]');
      label.classList.remove('font-semibold', 'text-[var(--text)]');
    } else {
      label.classList.remove('line-through', 'text-[var(--muted)]');
      label.classList.add('font-semibold', 'text-[var(--text)]');
    }
  });

  /* ================================================================== */
  /*  COMMUNICATION RECORD — channel toggle + publish                    */
  /* ================================================================== */

  var msgChannelSelect = document.getElementById('msgChannelSelect');

  if (msgChannelSelect) {
    msgChannelSelect.addEventListener('change', function () { ns.updateMsgStructuredVisibility(); });
  }

  var msgPublishBtn = document.getElementById('msgPublishBtn');
  if (msgPublishBtn) {
    msgPublishBtn.addEventListener('click', function () {
      var content = (document.getElementById('msgContent') || {}).value || '';
      var conclusion = (document.getElementById('msgConclusion') || {}).value || '';
      var nextAction = (document.getElementById('msgNextAction') || {}).value || '';
      var channel = msgChannelSelect ? msgChannelSelect.options[msgChannelSelect.selectedIndex].text : '内部备注';
      var extraParts = [];
      if (conclusion) extraParts.push('结论：' + conclusion);
      if (nextAction) extraParts.push('下一步：' + nextAction);
      var desc = (content || '（无摘要）') + (extraParts.length ? ' · ' + extraParts.join(' · ') : '');
      ns.showToast('记录已发布（示例）', '[' + channel + '] ' + desc.slice(0, 80));
    });
  }

  /* ================================================================== */
  /*  経営管理専用 — Tab visibility + content                            */
  /* ================================================================== */

  function applyMgmtTabs() {
    var isMgmt = ns.isMgmtCase();
    var mgmtItems = document.querySelectorAll('.mgmt-tab-item');
    mgmtItems.forEach(function (el) {
      el.style.display = isMgmt ? '' : 'none';
    });

    if (!ns.panels['immigration-result']) {
      ns.panels['immigration-result'] = document.getElementById('tab-immigration-result');
    }
    if (!ns.panels['residence-period']) {
      ns.panels['residence-period'] = document.getElementById('tab-residence-period');
    }

    if (isMgmt) {
      applyImmigrationResultContent();
      applyResidencePeriodContent();
    }
  }

  function applyImmigrationResultContent() {
    var panel = document.getElementById('tab-immigration-result');
    if (!panel) return;
    var placeholder = panel.querySelector('#immigration-result-placeholder');
    if (!placeholder) return;

    var s = ns.liveState;
    var outcome = s.resultOutcome || 'pending';
    var immigResult = {
      outcome: outcome,
      supplementCount: s.supplementCount || 0,
      supplementOpen: !!s.supplementOpen,
      supplementDeadline: s.supplementDeadline || null,
    };
    var outcomeHtml = renderImmigrationOutcomeCard(immigResult);
    panel.innerHTML = outcomeHtml;
  }

  function renderImmigrationOutcomeCard(result) {
    var outcome = result.outcome || 'pending';
    var colorMap = { approved: 'green', rejected: 'red', pending: 'gray' };
    var labelMap = {
      approved: '✅ 许可 (approved)',
      rejected: '❌ 拒否 (rejected)',
      pending: '⏳ 审查中',
    };
    var color = colorMap[outcome] || 'gray';
    var label = labelMap[outcome] || outcome;

    var supplementSection = '';
    var isS7WithSupplement = ns.liveState.stageCode === 'S7' && result.supplementCount > 0;
    if (isS7WithSupplement) {
      var count = result.supplementCount;
      var openBadge = result.supplementOpen
        ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">补正进行中</span>'
        : '<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">补正包已提交 · 等待入管回执</span>';
      var deadlineHtml = result.supplementOpen && result.supplementDeadline
        ? '<p class="text-xs text-orange-700 font-medium mt-1">补正截止日：' + ns.esc(result.supplementDeadline) + '</p>'
        : '';
      supplementSection = [
        '<div class="mt-4 p-4 rounded-lg bg-orange-50 border border-orange-200">',
        '  <div class="flex items-center justify-between mb-2">',
        '    <h4 class="text-sm font-semibold text-orange-700">S7 补正循环 — 第 ' + count + ' 次</h4>',
        '    ' + openBadge,
        '  </div>',
        '  <p class="text-xs text-orange-600 mb-1">主阶段保持 S7 不变。补正完成后重新提交，不回退到更早阶段。</p>',
        result.supplementOpen
          ? '  <p class="text-xs text-orange-600">请在「校验与提交」Tab 使用「提交补正包」提交 submission_kind=supplement 包。</p>'
          : '',
        deadlineHtml,
        '</div>',
      ].join('');
    }

    var paymentGateSection = '';
    if (outcome === 'approved' && ns.liveState.postApprovalStage === 'waiting_final_payment') {
      var paid = ns.liveState.finalPaymentPaid || false;
      paymentGateSection = [
        '<div class="mt-4 p-4 rounded-lg ' + (paid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200') + ' border">',
        '  <h4 class="text-sm font-semibold ' + (paid ? 'text-green-700' : 'text-yellow-700') + ' mb-1">尾款门控（sendCoe 前置）</h4>',
        '  <p class="text-xs ' + (paid ? 'text-green-600' : 'text-yellow-600') + '">',
        paid
          ? '✅ 尾款已收，可发送 COE 给客户'
          : '⚠️ 尾款未收。未结清时需完成风险确认留痕后方可执行 sendCoe。',
        '  </p>',
        '</div>',
      ].join('');
    }

    return [
      '<div class="apple-card p-6">',
      '  <h3 class="font-semibold text-[var(--fg)] mb-4">入管审查结果</h3>',
      '  <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-' + color + '-100 text-' + color + '-700 text-sm font-semibold mb-4">',
      '    ' + label,
      '  </div>',
      supplementSection,
      paymentGateSection,
      '  <div class="mt-4 text-xs text-[var(--fg-muted)]">如需修改结果，请在业务系统中更新后刷新本页。</div>',
      '</div>',
    ].join('');
  }

  function applyResidencePeriodContent() {
    var placeholder = document.getElementById('residence-period-placeholder');
    var content = document.getElementById('residence-period-content');
    if (!placeholder || !content) return;

    var s = ns.liveState;
    var showForm = ns.isMgmtCase() && s.stageCode === 'S8' &&
      s.postApprovalStage === 'entry_success';
    var showReadonly = ns.isMgmtCase() && s.residencePeriodRecorded;

    if (!showForm && !showReadonly) {
      placeholder.innerHTML = '<div class="apple-card p-8 text-center text-[var(--fg-muted)] text-sm">' +
        '当前案件非経営管理类型，或尚未进入入境确认阶段，暂无在留期间数据。</div>';
      placeholder.style.display = '';
      content.style.display = 'none';
      return;
    }

    placeholder.style.display = 'none';
    content.style.display = '';

    var recordedBadge = document.getElementById('residence-period-recorded-badge');
    if (recordedBadge) recordedBadge.style.display = s.residencePeriodRecorded ? '' : 'none';

    var rp = s.residencePeriod || {};
    _setInputVal('rpEntryDate', rp.entryDate || '');
    _setInputVal('rpResidenceStatus', rp.residenceStatus || '');
    _setInputVal('rpStartDate', rp.startDate || '');
    _setInputVal('rpEndDate', rp.endDate || '');
    _setInputVal('rpZairyuCard', rp.zairyuCardNumber || '');
    _setInputVal('rpAddress', rp.addressInJapan || '');
    _setInputVal('rpNote', rp.note || '');

    var saveBtn = document.getElementById('rpSaveBtn');
    if (saveBtn) {
      saveBtn.disabled = !!s.residencePeriodRecorded;
      saveBtn.textContent = s.residencePeriodRecorded ? '已保存' : '保存在留期间';
    }

    _applyRenewalRemindersSection();
  }

  function _setInputVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  function _applyRenewalRemindersSection() {
    var s = ns.liveState;
    var contentEl = document.getElementById('renewal-reminders-content');
    var actionEl = document.getElementById('renewal-reminders-action');
    var createBtn = document.getElementById('rpCreateRemindersBtn');
    if (!contentEl) return;

    if (!s.residencePeriodRecorded) {
      contentEl.innerHTML = '请先保存在留期间信息后，再创建续签提醒。';
      if (actionEl) actionEl.style.display = 'none';
      return;
    }

    if (s.renewalRemindersCreated) {
      var reminders = s.renewalReminders || [];
      var html = reminders.map(function (r) {
        return '<div class="flex items-center gap-2 py-1.5">' +
          '<span class="w-2 h-2 rounded-full bg-green-400"></span>' +
          '<span class="text-sm">' + ns.esc(r.label) + '</span>' +
          '<span class="text-xs text-[var(--fg-muted)] ml-auto">' +
          (r.triggerDate ? ns.esc(r.triggerDate) : '—') + '</span></div>';
      }).join('');
      contentEl.innerHTML = '<div class="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[13px] font-semibold mb-3">' +
        '✅ 续签提醒已创建（180/90/30 天三档）</div>' + html;
      if (actionEl) actionEl.style.display = 'none';
      return;
    }

    if (s.renewalRemindersFailed) {
      contentEl.innerHTML =
        '<div class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold mb-3">' +
        '⚠️ 续签提醒创建失败 · S8→S9 归档已阻断</div>' +
        '<p class="text-sm text-[var(--fg-muted)]">请检查在留期间数据后点击下方按钮重试。成功归档要求三档提醒（180/90/30 天）全部创建完成。</p>';
      if (actionEl) actionEl.style.display = '';
      if (createBtn) {
        createBtn.disabled = false;
        createBtn.textContent = '重试创建续签提醒';
        createBtn.className = createBtn.className.replace(/bg-\[var\(--primary\)\]/g, '') + ' bg-red-600';
      }
      return;
    }

    contentEl.innerHTML = '在留期间已保存，可创建续签提醒。';
    if (actionEl) actionEl.style.display = '';
    if (createBtn) {
      createBtn.disabled = false;
      createBtn.textContent = '创建续签提醒（180/90/30 天）';
    }
  }

  /* ================================================================== */
  /*  EXPORTS                                                            */
  /* ================================================================== */

  ns.formatObjectType = formatObjectType;
  ns.applyLogEntries = applyLogEntries;
  ns.resetLogFilter = resetLogFilter;
  ns.applyReadonly = applyReadonly;
  ns.applyMgmtTabs = applyMgmtTabs;
  ns.applyImmigrationResultContent = applyImmigrationResultContent;
  ns.applyResidencePeriodContent = applyResidencePeriodContent;
  ns._applyRenewalRemindersSection = _applyRenewalRemindersSection;
})();
