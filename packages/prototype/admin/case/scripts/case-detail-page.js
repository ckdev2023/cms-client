/**
 * Case Detail — page behaviour (tab switching, sample switching, readonly control,
 * per-tab rendering, risk confirmation modal, stage advance, and validation logic).
 *
 * Reads DETAIL_TABS, DETAIL_SAMPLES, DETAIL_TOASTS, DETAIL_STAGES, BILLING_STATUS
 * from data/case-detail-config.js.
 */

(function () {
  'use strict';

  var currentSample = null;

  /* ================================================================== */
  /*  TAB SWITCHING                                                      */
  /* ================================================================== */

  var tabs = Array.from(document.querySelectorAll('[data-tab]'));
  var panels = {};
  var ACTIVE_TAB_CLS = 'is-active';

  DETAIL_TABS.forEach(function (t) {
    panels[t.key] = document.getElementById('tab-' + t.key);
  });

  function setActiveTab(key) {
    tabs.forEach(function (a) {
      var isActive = a.getAttribute('data-tab') === key;
      a.classList.toggle(ACTIVE_TAB_CLS, isActive);
    });
    Object.keys(panels).forEach(function (k) {
      if (panels[k]) {
        panels[k].classList.toggle(ACTIVE_TAB_CLS, k === key);
      }
    });
  }

  function resolveHashTab() {
    var raw = window.location.hash ? window.location.hash.slice(1) : '';
    if (!raw) return null;
    if (!panels[raw]) return null;
    return raw;
  }

  tabs.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var key = a.getAttribute('data-tab');
      if (!key) return;
      setActiveTab(key);
      window.location.hash = key;
    });
  });

  window.addEventListener('hashchange', function () {
    var key = resolveHashTab();
    if (key) setActiveTab(key);
  });

  /* ================================================================== */
  /*  HELPERS                                                            */
  /* ================================================================== */

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value != null ? value : '';
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html != null ? html : '';
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function avatarBg(style) {
    if (style === 'gradient') return 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)]';
    if (style === 'success') return 'bg-[var(--success)]';
    if (style === 'warning') return 'bg-[var(--warning)]';
    if (style === 'danger') return 'bg-[var(--danger)]';
    return 'bg-[var(--surface-2)] text-[var(--text)]';
  }

  function avatarTextColor(style) {
    return style === 'surface' ? '' : 'text-white';
  }

  function severityColor(severity) {
    if (severity === 'danger') return 'var(--danger)';
    if (severity === 'warning') return 'var(--warning)';
    if (severity === 'primary') return 'var(--primary)';
    return 'var(--muted-2)';
  }

  function severityBgClass(severity) {
    if (severity === 'danger') return 'bg-red-50';
    if (severity === 'warning') return 'bg-amber-50';
    if (severity === 'primary') return 'bg-blue-50';
    return 'bg-[var(--surface-2)]';
  }

  function chipClass(color) {
    if (color === 'green') return 'bg-green-50 text-green-700 border-green-200';
    if (color === 'red') return 'bg-red-50 text-red-700 border-red-200';
    if (color === 'blue') return 'bg-blue-50 text-[var(--primary)] border-blue-200';
    return '';
  }

  function billingBadge(status) {
    var b = BILLING_STATUS[status];
    return b ? b.badge : '';
  }

  /* ================================================================== */
  /*  SAMPLE SWITCHING — header + overview summary cards                 */
  /* ================================================================== */

  var sampleSelect = document.getElementById('caseSampleSelect');

  function applySample(key) {
    var s = DETAIL_SAMPLES[key];
    if (!s) return;
    currentSample = s;

    setText('breadcrumbCaseId', s.id);
    setText('caseTitle', s.title);
    setText('caseStatusText', s.stage);
    setText('caseClientName', s.client);
    setText('caseOwnerName', s.owner);
    setText('caseAgencyName', s.agency);
    setText('overviewStageText', s.stage);
    setText('overviewStageMeta', s.stageMeta);
    setText('overviewDeadlineDate', s.deadline);
    setText('overviewDeadlineMeta', s.deadlineMeta);
    setText('overviewProgressPercent', s.progressPercent + '%');
    setText('overviewProgressCount', s.progressCount);
    setText('overviewBillingAmount', s.billingAmount);
    setText('overviewBillingMeta', s.billingMeta);
    setText('docsNavCounter', s.docsCounter);

    var badge = document.getElementById('caseStatusBadge');
    if (badge) badge.className = 'status-badge text-[13px] ' + s.statusBadge;

    var bar = document.getElementById('overviewProgressBar');
    if (bar) bar.style.width = s.progressPercent + '%';

    var deadlineVal = document.getElementById('overviewDeadlineDate');
    var deadlineMeta = document.getElementById('overviewDeadlineMeta');
    if (s.deadlineDanger) {
      if (deadlineVal) deadlineVal.classList.add('text-[var(--danger)]');
      if (deadlineMeta) deadlineMeta.classList.add('text-[var(--danger)]');
    } else {
      if (deadlineVal) deadlineVal.classList.remove('text-[var(--danger)]');
      if (deadlineMeta) deadlineMeta.classList.remove('text-[var(--danger)]');
    }

    applyProviderProgress(s.providerProgress);
    applyRiskSummary(s.risk);
    applyOverviewHints(s);
    applyTimeline(s.timeline);
    applyTeam(s.team);
    applyInfoFields(s);
    applyRelatedParties(s.relatedParties);
    applyDocsProgress(s);
    applyDocumentItems(s.documents);
    applyTasks(s.tasks);
    applyDeadlines(s.deadlines);
    applyValidation(s);
    applyBillingSummary(s.billing);
    applyBillingTable(s.billing);
    applyLogEntries(s.logEntries);
    applyRiskConfirmationRecord(s.riskConfirmationRecord);
    applyReadonly(s.readonly);
  }

  /* ================================================================== */
  /*  OVERVIEW — Provider Progress                                       */
  /* ================================================================== */

  function applyProviderProgress(providers) {
    if (!providers) return;
    var rows = document.querySelectorAll('.provider-row');
    providers.forEach(function (p, i) {
      if (!rows[i]) return;
      var pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
      var fill = rows[i].querySelector('.provider-bar-fill');
      var count = rows[i].querySelector('.provider-count');
      if (fill) fill.style.width = pct + '%';
      if (count) count.textContent = p.done + '/' + p.total;
    });
  }

  /* ================================================================== */
  /*  OVERVIEW — Risk Summary                                            */
  /* ================================================================== */

  function applyRiskSummary(risk) {
    if (!risk) return;
    setText('riskBlockingCount', risk.blockingCount);
    setText('riskArrearsStatus', risk.arrearsStatus);
    setText('riskDeadlineAlert', risk.deadlineAlert);
    setText('riskLastValidation', risk.lastValidation);
    setText('riskReviewStatus', risk.reviewStatus);
  }

  /* ================================================================== */
  /*  OVERVIEW — Hints (next action + validation hint)                   */
  /* ================================================================== */

  function applyOverviewHints(s) {
    setText('overviewNextActionText', s.nextAction || '');
    setText('overviewValidationHint', s.validationHint || '');
  }

  /* ================================================================== */
  /*  OVERVIEW — Timeline                                                */
  /* ================================================================== */

  function applyTimeline(timeline) {
    var container = document.querySelector('#tab-overview .border-l-2.border-\\[var\\(--border\\)\\]');
    if (!container || !timeline) return;

    container.innerHTML = timeline.map(function (item, idx) {
      var dotColor = item.color === 'primary' ? 'var(--primary)'
        : item.color === 'warning' ? 'var(--warning)'
        : item.color === 'success' ? 'var(--success)'
        : item.color === 'danger' ? 'var(--danger)'
        : 'var(--border)';
      var textCls = idx === timeline.length - 1 ? 'text-[var(--muted)]' : 'text-[var(--text)]';
      return [
        '<div class="relative pl-6' + (idx < timeline.length - 1 ? ' pb-6' : '') + '">',
        '  <div class="timeline-dot" style="background:' + dotColor + '"></div>',
        '  <div class="text-[14px] font-semibold ' + textCls + '">' + esc(item.text) + '</div>',
        '  <div class="text-[12px] text-[var(--muted-2)] mt-1">' + esc(item.meta) + '</div>',
        '</div>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  OVERVIEW — Team                                                    */
  /* ================================================================== */

  function applyTeam(team) {
    var container = document.querySelector('#tab-overview .apple-card:has(.text-\\[15px\\].font-bold)');
    if (!container) {
      var teamCards = document.querySelectorAll('#tab-overview .apple-card');
      for (var i = 0; i < teamCards.length; i++) {
        var heading = teamCards[i].querySelector('h3');
        if (heading && heading.textContent.trim() === '案件团队') {
          container = teamCards[i];
          break;
        }
      }
    }
    if (!container || !team) return;

    var listEl = container.querySelector('.space-y-3');
    if (!listEl) return;

    listEl.innerHTML = team.map(function (m) {
      var roleChip = m.role
        ? ' <span class="chip text-[10px] py-0 px-1.5">' + esc(m.role) + '</span>'
        : '';
      return [
        '<div class="flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors">',
        '  <div class="flex items-center gap-3">',
        '    <div class="w-9 h-9 rounded-full bg-gradient-to-br ' + (m.gradient || 'from-[var(--primary)] to-[var(--primary-hover)]') + ' text-white flex items-center justify-center text-[13px] font-bold">' + esc(m.initials) + '</div>',
        '    <div>',
        '      <div class="text-[13px] font-bold text-[var(--text)] flex items-center gap-2">' + esc(m.name) + roleChip + '</div>',
        '      <div class="text-[12px] text-[var(--muted-2)]">' + esc(m.subtitle) + '</div>',
        '    </div>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  INFO TAB — Form Fields                                             */
  /* ================================================================== */

  function applyInfoFields(s) {
    var infoCaseId = document.getElementById('infoCaseId');
    if (infoCaseId) infoCaseId.value = s.id;

    var infoCaseType = document.getElementById('infoCaseType');
    if (infoCaseType) {
      for (var i = 0; i < infoCaseType.options.length; i++) {
        if (infoCaseType.options[i].text === s.caseType) {
          infoCaseType.selectedIndex = i;
          break;
        }
      }
    }

    var infoApplicationType = document.getElementById('infoApplicationType');
    if (infoApplicationType) {
      for (var j = 0; j < infoApplicationType.options.length; j++) {
        if (infoApplicationType.options[j].text === s.applicationType) {
          infoApplicationType.selectedIndex = j;
          break;
        }
      }
    }

    var infoAcceptedDate = document.getElementById('infoAcceptedDate');
    if (infoAcceptedDate) infoAcceptedDate.value = s.acceptedDate || '';

    var infoTargetDate = document.getElementById('infoTargetDate');
    if (infoTargetDate) infoTargetDate.value = s.targetDate || '';

    var infoJurisdiction = document.getElementById('infoJurisdiction');
    if (infoJurisdiction) infoJurisdiction.value = s.agency || '';
  }

  /* ================================================================== */
  /*  INFO TAB — Related Parties                                         */
  /* ================================================================== */

  function applyRelatedParties(parties) {
    var container = document.getElementById('relatedParties');
    if (!container || !parties) return;

    container.innerHTML = parties.map(function (p) {
      var bgCls = p.avatarStyle === 'gradient'
        ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white'
        : 'bg-[var(--surface-2)] text-[var(--text)]';
      return [
        '<div class="p-3 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">',
        '  <div class="flex items-center gap-3 mb-2">',
        '    <div class="w-8 h-8 rounded-full ' + bgCls + ' flex items-center justify-center text-[11px] font-bold">' + esc(p.initials) + '</div>',
        '    <div>',
        '      <div class="text-[13px] font-bold text-[var(--text)]">' + esc(p.name) + '</div>',
        '      <div class="text-[11px] text-[var(--muted-2)]">' + esc(p.role) + '</div>',
        '    </div>',
        '  </div>',
        '  <div class="text-[12px] text-[var(--muted)] pl-11">' + esc(p.detail) + '</div>',
        '</div>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  DOCUMENTS TAB — Progress + Item Rendering                          */
  /* ================================================================== */

  function applyDocsProgress(s) {
    var docsBar = document.getElementById('docsProgressBar');
    var docsLabel = document.getElementById('docsProgressLabel');
    if (docsBar) docsBar.style.width = s.progressPercent + '%';
    if (docsLabel) docsLabel.textContent = s.docsCounter + ' 项已登记（' + s.progressPercent + '%）';
  }

  function normalizeDocStatusLabel(item) {
    if (!item || !item.statusLabel) return '';
    return item.statusLabel
      .replace('已提交待审核', '已登记待审核')
      .replace('待提交', '待登记');
  }

  function buildArchivePath(fileName) {
    if (!fileName || !currentSample || !currentSample.id) return '';
    return '案件/' + currentSample.id + '/资料/' + fileName;
  }

  function normalizeDocMeta(item) {
    if (!item || !item.meta) return '';
    var meta = item.meta.replace(/未上传/g, '待登记');
    if (meta.indexOf('本地归档相对路径：') >= 0) return meta;

    var fileName = '';
    var token = meta.split(' · ')[0] || '';
    if (/\.(pdf|jpg|jpeg|png|docx|xlsx)$/i.test(token)) fileName = token;

    if (fileName) {
      meta += ' · 本地归档相对路径：' + buildArchivePath(fileName);
    }
    return meta;
  }

  function docStatusIcon(status) {
    if (status === 'reviewed' || status === 'submitted' || status === 'done')
      return '<svg class="w-4 h-4 text-[var(--success)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path></svg>';
    if (status === 'expired' || status === 'rejected')
      return '<svg class="w-4 h-4 text-[var(--danger)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    if (status === 'waived')
      return '<svg class="w-4 h-4 text-[var(--muted-2)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>';
    if (status === 'pending')
      return '<svg class="w-4 h-4 text-[var(--warning)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"></path></svg>';
    return '<svg class="w-4 h-4 text-[var(--muted-2)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"></path></svg>';
  }

  function docBadgeClass(status) {
    if (status === 'reviewed' || status === 'submitted' || status === 'done') return 'badge-green';
    if (status === 'expired' || status === 'rejected') return 'badge-red';
    if (status === 'waived') return 'badge-gray';
    if (status === 'pending') return 'badge-orange';
    return '';
  }

  function applyDocumentItems(docs) {
    var container = document.getElementById('documentsByProvider');
    if (!container || !docs) return;

    var headerHtml = container.querySelector('.px-6.py-5.border-b');
    var headerFragment = headerHtml ? headerHtml.outerHTML : '';

    var groupsHtml = docs.map(function (group, gi) {
      var borderTop = gi > 0 ? ' border-t border-[var(--border)]' : '';
      var itemsHtml = group.items.map(function (item, ii) {
        var isLast = ii === group.items.length - 1 && gi === docs.length - 1;
        var borderB = isLast ? ' border-b-0' : '';
        var isWaived = item.status === 'waived';
        var waivedCls = isWaived ? ' is-waived' : '';
        var nameCls = isWaived
          ? 'text-[14px] font-semibold text-[var(--muted)] truncate line-through'
          : 'text-[14px] font-semibold text-[var(--text)] truncate';
        var metaText = normalizeDocMeta(item);
        var statusLabel = normalizeDocStatusLabel(item);
        var metaCls = item.status === 'expired'
          ? 'text-[12px] text-[var(--danger)]'
          : 'text-[12px] text-[var(--muted-2)]';

        var actionHtml = '';
        if (item.canWaive) {
          actionHtml = '<button class="text-[11px] text-[var(--muted-2)] hover:text-[var(--text)] font-semibold underline waive-btn" type="button" data-waive-item="' + esc(item.name) + '">标记无需提供</button>';
        }

        return [
          '<div class="doc-item px-6 py-3 flex items-center justify-between' + borderB + waivedCls + '">',
          '  <div class="flex items-center gap-3 flex-1 min-w-0">',
          '    ' + docStatusIcon(item.status),
          '    <div class="min-w-0">',
          '      <div class="' + nameCls + '">' + esc(item.name) + '</div>',
          '      <div class="' + metaCls + '">' + esc(metaText) + '</div>',
          '    </div>',
          '  </div>',
          '  <div class="flex items-center gap-2">',
          '    <span class="status-badge ' + docBadgeClass(item.status) + ' text-[11px]">' + esc(statusLabel) + '</span>',
          '    ' + actionHtml,
          '  </div>',
          '</div>',
        ].join('');
      }).join('');

      return [
        '<div class="px-6 pt-5 pb-2' + borderTop + '">',
        '  <div class="section-kicker">' + esc(group.group) + '（' + esc(group.count) + ' 完成）</div>',
        '</div>',
        itemsHtml,
      ].join('');
    }).join('');

    container.innerHTML = headerFragment + groupsHtml;
  }

  /* ================================================================== */
  /*  TASKS TAB — Item Rendering                                         */
  /* ================================================================== */

  function taskAvatarColor(color) {
    if (color === 'success') return 'bg-[var(--success)] text-white';
    if (color === 'warning') return 'bg-[var(--warning)] text-white';
    if (color === 'danger') return 'bg-[var(--danger)] text-white';
    return 'bg-[var(--primary)] text-white';
  }

  function taskDueBadge(due, dueColor) {
    var cls = 'text-[12px] font-semibold px-2 py-1 rounded-md ';
    if (dueColor === 'danger') cls += 'text-[var(--danger)] bg-red-50';
    else if (dueColor === 'warning') cls += 'text-[var(--warning)] bg-amber-50';
    else cls += 'text-[var(--muted-2)] bg-[var(--surface-2)]';
    return '<span class="' + cls + '">' + esc(due) + '</span>';
  }

  function applyTasks(tasks) {
    var panel = document.getElementById('tab-tasks');
    if (!panel || !tasks) return;

    var card = panel.querySelector('.apple-card');
    if (!card) return;

    var header = card.querySelector('.px-6.py-5.border-b');
    var headerHtml = header ? header.outerHTML : '';

    var itemsHtml = tasks.map(function (t) {
      var textCls = t.done
        ? 'text-[14px] text-[var(--muted)] line-through'
        : 'text-[14px] font-semibold text-[var(--text)]';
      var checked = t.done ? ' checked' : '';
      return [
        '<div class="doc-item px-6 py-4 flex items-center justify-between">',
        '  <div class="flex items-center gap-3 flex-1">',
        '    <input type="checkbox" class="w-4 h-4 rounded-full border-[var(--border)] task-toggle"' + checked + '>',
        '    <span class="' + textCls + '">' + esc(t.label) + '</span>',
        '  </div>',
        '  <div class="flex items-center gap-4">',
        '    ' + taskDueBadge(t.due, t.dueColor),
        '    <div class="w-7 h-7 rounded-full ' + taskAvatarColor(t.color) + ' flex items-center justify-center text-[11px] font-bold">' + esc(t.assignee) + '</div>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');

    var addHtml = [
      '<div class="px-6 py-4 border-t-0">',
      '  <button class="w-full text-left flex items-center gap-3 py-1 text-[var(--muted-2)] hover:text-[var(--text)] transition-colors add-task-btn" type="button">',
      '    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>',
      '    <span class="text-[14px] font-semibold">添加新任务...</span>',
      '  </button>',
      '</div>',
    ].join('');

    card.innerHTML = headerHtml + itemsHtml + addHtml;
  }

  /* ================================================================== */
  /*  DEADLINES TAB                                                      */
  /* ================================================================== */

  function applyDeadlines(deadlines) {
    if (!deadlines) return;

    deadlines.forEach(function (dl) {
      var el = document.getElementById('deadline' + dl.id);
      if (!el) return;

      var sev = dl.severity;
      var borderColor = severityColor(sev);

      var stripe = el.querySelector('.absolute.left-0');
      if (stripe) stripe.style.background = borderColor;

      var titleEl = el.querySelector('[id$="Title"]') || el.querySelector('.text-\\[15px\\]');
      var descEl = el.querySelector('[id$="Desc"]') || el.querySelectorAll('.text-\\[13px\\]')[0];
      var dateEl = el.querySelector('[id$="Date"]') || el.querySelector('.text-\\[18px\\]');
      var remainEl = el.querySelector('[id$="Remaining"]') || el.querySelector('.text-\\[12px\\].font-bold');

      if (!titleEl) titleEl = document.getElementById('deadline' + dl.id + 'Title');
      if (!descEl) descEl = document.getElementById('deadline' + dl.id + 'Desc');
      if (!dateEl) dateEl = document.getElementById('deadline' + dl.id + 'Date');
      if (!remainEl) remainEl = document.getElementById('deadline' + dl.id + 'Remaining');

      if (titleEl) titleEl.textContent = dl.title;
      if (descEl) descEl.textContent = dl.desc;

      if (dateEl) {
        dateEl.textContent = dl.date;
        dateEl.style.color = severityColor(sev);
      }
      if (remainEl) {
        remainEl.textContent = dl.remaining;
        remainEl.style.color = severityColor(sev);
        remainEl.className = 'text-[12px] font-bold mt-1 px-2 py-0.5 rounded-md inline-block ' + severityBgClass(sev);
      }
    });
  }

  /* ================================================================== */
  /*  VALIDATION TAB — Gate items                                        */
  /* ================================================================== */

  function applyValidation(s) {
    var val = s.validation;
    if (!val) return;

    setText('lastValidationTime', val.lastTime || '');

    var blockingList = document.getElementById('validationBlockingList');
    if (blockingList) {
      blockingList.innerHTML = val.blocking.length
        ? val.blocking.map(function (item) {
          return [
            '<div class="p-4 rounded-xl border border-[var(--danger)]/20 bg-red-50/30">',
            '  <div class="flex items-start justify-between gap-3">',
            '    <div class="flex items-start gap-3">',
            '      <svg class="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            '      <div>',
            '        <div class="text-[14px] font-bold text-[var(--text)]">' + esc(item.title) + '</div>',
            '        <div class="text-[12px] text-[var(--muted)] mt-1">修复建议：' + esc(item.fix) + '</div>',
            '        <div class="text-[12px] text-[var(--muted-2)] mt-1">责任人：' + esc(item.assignee) + ' · 截止：' + esc(item.deadline) + '</div>',
            '      </div>',
            '    </div>',
            '    <button class="btn-pill text-[11px] py-1 px-2 shrink-0" type="button">修复</button>',
            '  </div>',
            '</div>',
          ].join('');
        }).join('')
        : '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">无硬性阻断项</div>';
    }

    var warningList = document.getElementById('validationWarningList');
    if (warningList) {
      warningList.innerHTML = val.warnings.length
        ? val.warnings.map(function (item) {
          return [
            '<div class="p-4 rounded-xl border border-[var(--warning)]/20 bg-amber-50/30">',
            '  <div class="flex items-start gap-3">',
            '    <svg class="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"></path></svg>',
            '    <div>',
            '      <div class="text-[14px] font-bold text-[var(--text)]">' + esc(item.title) + '</div>',
            '      <div class="text-[12px] text-[var(--muted)] mt-1">建议：' + esc(item.note) + '</div>',
            '    </div>',
            '  </div>',
            '</div>',
          ].join('');
        }).join('')
        : '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">无软性提示</div>';
    }

    applySubmissionPackages(s.submissionPackages);
    applyCorrectionPackage(s.correctionPackage);
    applyDoubleReview(s.doubleReview);
  }

  /* ================================================================== */
  /*  VALIDATION TAB — Submission Packages                               */
  /* ================================================================== */

  function applySubmissionPackages(packages) {
    var container = document.getElementById('submissionPackages');
    if (!container) return;

    if (!packages || !packages.length) {
      container.innerHTML = '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">暂无提交包</div>';
      return;
    }

    container.innerHTML = packages.map(function (pkg) {
      var lockChip = pkg.locked ? '<span class="chip text-[10px] py-0 px-1.5">🔒 已锁定</span>' : '';
      return [
        '<div class="p-4 rounded-xl border border-[var(--border)] bg-[#fbfbfd]">',
        '  <div class="flex items-center justify-between mb-2">',
        '    <div class="flex items-center gap-2">',
        '      <span class="text-[14px] font-bold text-[var(--text)]">' + esc(pkg.id) + '</span>',
        '      <span class="chip text-[10px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200">' + esc(pkg.status) + '</span>',
        '      ' + lockChip,
        '    </div>',
        '    <span class="text-[12px] text-[var(--muted-2)] font-semibold">' + esc(pkg.date) + '</span>',
        '  </div>',
        '  <div class="text-[12px] text-[var(--muted)]">' + esc(pkg.summary) + '</div>',
        '  <div class="flex gap-2 mt-2">',
        '    <button class="text-[12px] text-[var(--primary)] hover:underline font-semibold" type="button">查看内容</button>',
        '    <button class="text-[12px] text-[var(--primary)] hover:underline font-semibold" type="button">上传回执</button>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  VALIDATION TAB — Correction Package                                */
  /* ================================================================== */

  function applyCorrectionPackage(corr) {
    var container = document.getElementById('correctionPackage');
    if (!container) return;

    if (!corr) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    container.innerHTML = [
      '<div class="section-kicker mb-2 !text-[var(--warning)]">补正包</div>',
      '<h2 class="section-title mb-4">补正通知关联</h2>',
      '<div class="p-4 rounded-xl border border-[var(--warning)]/20 bg-amber-50/30 mb-3">',
      '  <div class="flex items-center justify-between mb-2">',
      '    <div class="flex items-center gap-2">',
      '      <span class="text-[14px] font-bold text-[var(--text)]">' + esc(corr.id) + '</span>',
      '      <span class="chip text-[10px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200">' + esc(corr.status) + '</span>',
      '    </div>',
      '    <span class="text-[12px] text-[var(--muted-2)] font-semibold">通知日：' + esc(corr.noticeDate) + '</span>',
      '  </div>',
      '  <div class="text-[12px] text-[var(--muted)] mb-2">关联原提交包：' + esc(corr.relatedSub) + ' · 补正截止：' + esc(corr.corrDeadline) + '</div>',
      '  <div class="text-[12px] text-[var(--muted)]">补正项：' + esc(corr.items) + '</div>',
      '  <div class="flex gap-2 mt-3">',
      '    <button class="btn-pill text-[12px] py-1 px-3" type="button">与原提交包对比</button>',
      '    <button class="text-[12px] text-[var(--primary)] hover:underline font-semibold" type="button">查看补正通知</button>',
      '  </div>',
      '</div>',
      '<div class="text-[12px] text-[var(--muted-2)]">' + esc(corr.note) + '</div>',
    ].join('');
  }

  /* ================================================================== */
  /*  VALIDATION TAB — Double Review                                     */
  /* ================================================================== */

  function applyDoubleReview(reviews) {
    var container = document.getElementById('doubleReview');
    if (!container) return;

    if (!reviews || !reviews.length) {
      container.innerHTML = '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">暂无复核记录</div>';
      return;
    }

    container.innerHTML = reviews.map(function (r) {
      var verdictChip = r.verdictBadge === 'badge-green'
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-red-50 text-red-700 border-red-200';
      var rejectBlock = r.rejectReason
        ? [
          '<div class="mt-2 p-2 rounded-lg bg-red-50/50 border border-[var(--danger)]/10">',
          '  <div class="text-[11px] font-bold text-[var(--danger)] mb-1">驳回原因</div>',
          '  <div class="text-[12px] text-[var(--text)]">' + esc(r.rejectReason) + '</div>',
          '</div>',
        ].join('')
        : '';
      var commentLine = r.comment
        ? '<div class="text-[12px] text-[var(--muted)]">' + esc(r.time) + ' · ' + esc(r.comment) + '</div>'
        : '<div class="text-[12px] text-[var(--muted)]">' + esc(r.time) + '</div>';

      var avatarColor = r.verdictBadge === 'badge-green' ? 'var(--success)' : 'var(--danger)';

      return [
        '<div class="p-3 rounded-xl border border-[var(--border)]">',
        '  <div class="flex items-center gap-2 mb-2">',
        '    <div class="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold" style="background:' + avatarColor + '">' + esc(r.initials) + '</div>',
        '    <span class="text-[13px] font-bold text-[var(--text)]">' + esc(r.name) + '</span>',
        '    <span class="chip text-[10px] py-0 px-1.5 ' + verdictChip + '">' + esc(r.verdict) + '</span>',
        '  </div>',
        '  ' + commentLine,
        '  ' + rejectBlock,
        '</div>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  VALIDATION TAB — Risk Confirmation Record                          */
  /* ================================================================== */

  function applyRiskConfirmationRecord(record) {
    var container = document.getElementById('riskConfirmation');
    if (!container) return;

    if (!record) {
      container.innerHTML = [
        '<h2 class="text-[15px] font-bold text-[var(--text)] mb-4">欠款风险确认记录</h2>',
        '<div class="text-center py-4">',
        '  <div class="text-[13px] text-[var(--muted-2)] font-semibold mb-3">当前无欠款风险确认</div>',
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
      '    <div>确认人：' + esc(record.confirmedBy) + '</div>',
      '    <div>确认时间：' + esc(record.time) + '</div>',
      '    <div>欠款金额：' + esc(record.amount) + '</div>',
      '    <div>确认原因：' + esc(record.reason) + '</div>',
      '  </div>',
      '</div>',
      '<div class="mt-3">',
      '  <button class="btn-pill text-[12px] py-1.5 px-3" type="button" id="triggerRiskConfirm">再次模拟欠款确认</button>',
      '</div>',
    ].join('');
    rebindRiskTrigger();
  }

  /* ================================================================== */
  /*  BILLING TAB — Summary + Payment Table                              */
  /* ================================================================== */

  function applyBillingSummary(billing) {
    if (!billing) return;
    setText('billingTotal', billing.total);
    setText('billingReceived', billing.received);
    setText('billingOutstanding', billing.outstanding);
  }

  function applyBillingTable(billing) {
    if (!billing || !billing.payments) return;

    var tbody = document.querySelector('#tab-billing tbody');
    if (!tbody) return;

    tbody.innerHTML = billing.payments.map(function (p) {
      var badgeCls = billingBadge(p.status);
      var actionLabel = p.status === 'paid' ? '查看收据' : '登记回款';
      return [
        '<tr>',
        '  <td class="font-semibold text-[var(--text)]">' + esc(p.date) + '</td>',
        '  <td>' + esc(p.type) + '</td>',
        '  <td class="text-right font-semibold text-[var(--text)]">' + esc(p.amount) + '</td>',
        '  <td class="text-center"><span class="status-badge ' + badgeCls + ' text-[11px]">' + esc(p.statusLabel) + '</span></td>',
        '  <td class="text-right"><button class="text-[var(--primary)] text-[13px] font-semibold hover:underline row-quick-action" type="button">' + actionLabel + '</button></td>',
        '</tr>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  LOG TAB — Entries                                                  */
  /* ================================================================== */

  function formatObjectType(entry) {
    if (!entry.objectType) return '';
    if (/^操作人/.test(entry.objectType)) return esc(entry.objectType);
    return '对象：' + esc(entry.objectType);
  }

  function applyLogEntries(entries) {
    var container = document.querySelector('#tab-log .border-l-2');
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

      var categoryChipCls = chipClass(entry.categoryChip);
      var isLast = idx === entries.length - 1;
      var borderCls = isLast ? '' : ' border-b border-[var(--border)]';

      return [
        '<div class="relative pl-6 py-4' + borderCls + ' hover:bg-[#fbfbfd] transition-colors group" data-log-type="' + esc(entry.type) + '">',
        '  <div class="timeline-dot" style="background:' + dotColor + '"></div>',
        '  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">',
        '    <div class="flex items-center gap-3">',
        '      <div class="w-6 h-6 rounded-full ' + avatarBgColor + ' flex items-center justify-center text-[9px] font-bold">' + esc(entry.avatar) + '</div>',
        '      <div>',
        '        <div class="text-[14px] text-[var(--text)]">' + entry.text + '</div>',
        '        <div class="flex items-center gap-2 mt-1">',
        '          <span class="chip text-[10px] py-0 px-1.5 ' + categoryChipCls + '">' + esc(entry.category) + '</span>',
        '          <span class="text-[11px] text-[var(--muted-2)]">' + formatObjectType(entry) + '</span>',
        '        </div>',
        '      </div>',
        '    </div>',
        '    <div class="text-[12px] font-semibold text-[var(--muted-2)] whitespace-nowrap">' + esc(entry.time) + '</div>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');

    resetLogFilter();
  }

  /* ================================================================== */
  /*  LOG TAB — Category Filter                                          */
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
  /*  RISK CONFIRMATION MODAL                                            */
  /* ================================================================== */

  var riskModal = document.getElementById('riskConfirmModal');

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close-risk-modal]')) {
      if (riskModal) riskModal.classList.remove('show');
    }
  });

  function rebindRiskTrigger() {
    var btn = document.getElementById('triggerRiskConfirm');
    if (btn && riskModal) {
      btn.addEventListener('click', function () {
        riskModal.classList.add('show');
      });
    }
  }

  rebindRiskTrigger();

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
  /*  OPEN VALIDATION TAB FROM OVERVIEW                                  */
  /* ================================================================== */

  var openValBtn = document.getElementById('openValidationTab');
  if (openValBtn) {
    openValBtn.addEventListener('click', function () {
      setActiveTab('validation');
    });
  }

  var viewFullLogBtn = document.querySelector('#tab-overview [type="button"]');
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (btn && btn.textContent.trim() === '查看完整日志 →') {
      setActiveTab('log');
    }
  });

  /* ================================================================== */
  /*  TOAST HELPER                                                       */
  /* ================================================================== */

  function showToast(title, desc) {
    var toastEl = document.getElementById('toast');
    var toastTitle = document.getElementById('toastTitle');
    var toastDesc = document.getElementById('toastDesc');
    if (!toastEl) return;
    if (toastTitle) toastTitle.textContent = title;
    if (toastDesc) toastDesc.textContent = desc;
    toastEl.classList.remove('hidden');
    window.clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () { toastEl.classList.add('hidden'); }, 3000);
  }

  /* ================================================================== */
  /*  ACTION BUTTONS                                                     */
  /* ================================================================== */

  var exportBtn = document.getElementById('btnExportZip');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var t = DETAIL_TOASTS.exportZip;
      showToast(t.title, t.desc);
    });
  }

  var advanceBtn = document.getElementById('btnAdvanceStage');
  if (advanceBtn) {
    advanceBtn.addEventListener('click', function () {
      var currentKey = sampleSelect ? sampleSelect.value : 'work';
      var s = DETAIL_SAMPLES[currentKey];
      if (!s) return;
      var stage = DETAIL_STAGES[s.stageCode];
      var nextCode = stage ? 'S' + (parseInt(stage.code.replace('S', ''), 10) + 1) : '';
      var nextStage = DETAIL_STAGES[nextCode];
      var t = DETAIL_TOASTS.stageAdvanced;
      var title = t.title;
      var desc = t.desc
        .replace('{from}', stage ? stage.code + ' ' + stage.label : s.stageCode)
        .replace('{to}', nextStage ? nextStage.code + ' ' + nextStage.label : '下一阶段');
      showToast(title, desc);
    });
  }

  var editBtn = document.getElementById('btnEditInfo');
  if (editBtn) {
    editBtn.addEventListener('click', function () {
      setActiveTab('info');
    });
  }

  var riskSubmitBtn = document.getElementById('riskConfirmSubmit');
  if (riskSubmitBtn && riskModal) {
    riskSubmitBtn.addEventListener('click', function () {
      riskModal.classList.remove('show');
      var t = DETAIL_TOASTS.riskConfirmed;
      showToast(t.title, t.desc);
    });
  }

  /* ================================================================== */
  /*  WAIVED ITEM MARKING                                                */
  /* ================================================================== */

  document.addEventListener('click', function (e) {
    var waiveBtn = e.target.closest('[data-waive-item]');
    if (!waiveBtn) return;
    var itemName = waiveBtn.getAttribute('data-waive-item');
    var t = DETAIL_TOASTS.waived;
    showToast(t.title, t.desc.replace('{item}', itemName));
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
  });

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
  /*  PROTOTYPE FEEDBACK — forms / messages / tasks add buttons           */
  /* ================================================================== */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var text = btn.textContent.trim();

    if (text === '生成文書' || text === '生成') {
      showToast('文書生成（示例）', '已将模板数据填入，可在"已生成文書"查看');
      return;
    }
    if (text === '发布记录') {
      showToast('记录已发布（示例）', '沟通记录已添加到时间线');
      return;
    }
    if (text === '手动添加') {
      showToast('添加资料项（示例）', '已添加新的资料项到清单');
      return;
    }
    if (btn.classList.contains('add-task-btn') || text === '新增任务') {
      showToast('新增任务（示例）', '已创建新的跟进任务');
      return;
    }
  });

  /* ================================================================== */
  /*  SAMPLE SELECT EVENT                                                */
  /* ================================================================== */

  if (sampleSelect) {
    sampleSelect.addEventListener('change', function () {
      applySample(sampleSelect.value);
      setActiveTab('overview');
    });
  }

  /* ================================================================== */
  /*  INIT                                                               */
  /* ================================================================== */

  var initialSample = sampleSelect ? sampleSelect.value : 'work';
  applySample(initialSample);
  var initialTab = resolveHashTab() || 'overview';
  setActiveTab(initialTab);
})();
