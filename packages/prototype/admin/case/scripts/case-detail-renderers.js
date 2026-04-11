/**
 * Case Detail — Renderers (REN)
 * All apply/render display functions for overview, info, tasks, and deadlines.
 *
 * Depends on: case-detail-runtime.js (ns.setText, ns.esc, ns.liveState, ...)
 * Namespace: window.CaseDetailPage
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  /* ================================================================== */
  /*  SAMPLE SWITCHING — master renderer                                 */
  /* ================================================================== */

  function applySample(key) {
    var s = DETAIL_SAMPLES[key];
    if (!s) return;

    ns.setText('breadcrumbCaseId', s.id);
    ns.setText('caseTitle', s.title);
    ns.setText('caseStatusText', s.stage);
    ns.setText('caseClientName', s.client);
    ns.setText('caseOwnerName', s.owner);
    ns.setText('caseAgencyName', s.agency);
    ns.setText('overviewStageText', s.stage);
    ns.setText('overviewStageMeta', s.stageMeta);
    ns.setText('overviewDeadlineDate', s.deadline);
    ns.setText('overviewDeadlineMeta', s.deadlineMeta);
    ns.setText('overviewProgressPercent', s.progressPercent + '%');
    ns.setText('overviewProgressCount', s.progressCount);
    ns.setText('overviewBillingAmount', s.billingAmount);
    ns.setText('overviewBillingMeta', s.billingMeta);
    ns.setText('docsNavCounter', s.docsCounter);

    var badge = document.getElementById('caseStatusBadge');
    if (badge) badge.className = 'status-badge text-[13px] ' + s.statusBadge;

    var mgmtBadge = document.getElementById('mgmtPostApprovalBadge');
    if (mgmtBadge) {
      if (s.postApprovalStage && typeof POST_APPROVAL_STAGES !== 'undefined') {
        var pas = POST_APPROVAL_STAGES[s.postApprovalStage];
        if (pas) {
          mgmtBadge.textContent = pas.label;
          mgmtBadge.className = 'status-badge text-[11px] ml-2 ' + pas.badge;
          mgmtBadge.style.display = '';
        } else {
          mgmtBadge.style.display = 'none';
        }
      } else {
        mgmtBadge.style.display = 'none';
      }
    }

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
    ns.applyDocumentItems(s.documents);
    applyTasks(s.tasks);
    applyDeadlines(s.deadlines);
    ns.applyValidation(s);
    ns.applyBillingSummary(s.billing);
    ns.applyBillingTable(s.billing);
    ns.applyLogEntries(s.logEntries);
    ns.applyRiskConfirmationRecord(s.riskConfirmationRecord);
    ns.applyReadonly(s.readonly);
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
    ns.setText('riskBlockingCount', risk.blockingCount);
    ns.setText('riskArrearsStatus', risk.arrearsStatus);
    var arrearsDetailEl = document.getElementById('riskArrearsDetail');
    if (arrearsDetailEl && risk.arrearsDetail) arrearsDetailEl.textContent = risk.arrearsDetail;
    ns.setText('riskDeadlineAlert', risk.deadlineAlert);
    var deadlineDetailEl = document.getElementById('riskDeadlineAlertDetail');
    if (deadlineDetailEl && risk.deadlineAlertDetail) deadlineDetailEl.textContent = risk.deadlineAlertDetail;
    var blockingDetailEl = document.getElementById('riskBlockingDetail');
    if (blockingDetailEl && risk.blockingDetail) blockingDetailEl.textContent = risk.blockingDetail;
    ns.setText('riskLastValidation', risk.lastValidation);
    ns.setText('riskReviewStatus', risk.reviewStatus);

    var blockingItemsEl = document.getElementById('riskBlockingItems');
    if (blockingItemsEl) {
      var sample = ns.liveState;
      var blockers = (sample && sample.validation && sample.validation.blocking) || [];
      if (blockers.length > 0) {
        blockingItemsEl.innerHTML = blockers.map(function (b) {
          return [
            '<div class="flex items-center justify-between gap-1 text-[11px] text-[var(--muted-2)] py-0.5">',
            '  <span class="truncate">\u300c' + ns.esc(b.title) + '\u300d</span>',
            '  <button class="text-[var(--primary)] hover:underline font-semibold shrink-0 blocker-jump-doc" type="button"',
            '    data-doc-target="' + ns.esc(b.docTarget || b.title) + '">',
            '    \u2192 \u5b9a\u4f4d',
            '  </button>',
            '</div>',
          ].join('');
        }).join('');
      } else {
        blockingItemsEl.innerHTML = '';
      }
    }
  }

  /* ================================================================== */
  /*  OVERVIEW — Hints                                                   */
  /* ================================================================== */

  function applyOverviewHints(s) {
    ns.setText('overviewNextActionText', s.nextAction || '');
    ns.setText('overviewValidationHint', s.validationHint || '');
  }

  /* ================================================================== */
  /*  OVERVIEW — Timeline                                                */
  /* ================================================================== */

  function applyTimeline(timeline) {
    var container = document.getElementById('overviewTimeline');
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
        '  <div class="text-[14px] font-semibold ' + textCls + '">' + ns.esc(item.text) + '</div>',
        '  <div class="text-[12px] text-[var(--muted-2)] mt-1">' + ns.esc(item.meta) + '</div>',
        '</div>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  OVERVIEW — Team                                                    */
  /* ================================================================== */

  function applyTeam(team) {
    var container = document.getElementById('overviewTeamCard');
    if (!container || !team) return;

    var listEl = container.querySelector('.space-y-3');
    if (!listEl) return;

    listEl.innerHTML = team.map(function (m) {
      var roleChip = m.role
        ? ' <span class="chip text-[10px] py-0 px-1.5">' + ns.esc(m.role) + '</span>'
        : '';
      return [
        '<div class="flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors">',
        '  <div class="flex items-center gap-3">',
        '    <div class="w-9 h-9 rounded-full bg-gradient-to-br ' + (m.gradient || 'from-[var(--primary)] to-[var(--primary-hover)]') + ' text-white flex items-center justify-center text-[13px] font-bold">' + ns.esc(m.initials) + '</div>',
        '    <div>',
        '      <div class="text-[13px] font-bold text-[var(--text)] flex items-center gap-2">' + ns.esc(m.name) + roleChip + '</div>',
        '      <div class="text-[12px] text-[var(--muted-2)]">' + ns.esc(m.subtitle) + '</div>',
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
        '    <div class="w-8 h-8 rounded-full ' + bgCls + ' flex items-center justify-center text-[11px] font-bold">' + ns.esc(p.initials) + '</div>',
        '    <div>',
        '      <div class="text-[13px] font-bold text-[var(--text)]">' + ns.esc(p.name) + '</div>',
        '      <div class="text-[11px] text-[var(--muted-2)]">' + ns.esc(p.role) + '</div>',
        '    </div>',
        '  </div>',
        '  <div class="text-[12px] text-[var(--muted)] pl-11">' + ns.esc(p.detail) + '</div>',
        '</div>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  DOCUMENTS TAB — Progress                                           */
  /* ================================================================== */

  function applyDocsProgress(s) {
    if (s.documents && s.documents.length) {
      var total = 0;
      var done = 0;
      s.documents.forEach(function (group) {
        var gDone = 0;
        var gTotal = 0;
        group.items.forEach(function (item) {
          var st = normalizeDocStatus(item.status);
          if (st === 'waived') return;
          total++;
          gTotal++;
          if (st === 'approved' || st === 'uploaded_reviewing') done++;
          if (st === 'approved') gDone++;
        });
        group.count = gDone + '/' + gTotal;
      });
      var pct = total > 0 ? Math.round((done / total) * 100) : 0;
      s.progressPercent = pct;
      s.progressCount = done + '/' + total + ' 项已收集';
      s.docsCounter = done + '/' + total;
    }
    var docsBar = document.getElementById('docsProgressBar');
    var docsLabel = document.getElementById('docsProgressLabel');
    if (docsBar) docsBar.style.width = s.progressPercent + '%';
    if (docsLabel) docsLabel.textContent = s.docsCounter + ' 项已收集（' + s.progressPercent + '%）';
  }

  /* ================================================================== */
  /*  DOCUMENTS — Status helpers (consumed by DOC via namespace)         */
  /* ================================================================== */

  var _COMPAT = {
    done: 'approved', idle: 'not_sent', submitted: 'uploaded_reviewing',
    reviewed: 'approved', rejected: 'revision_required',
    pending: 'waiting_upload', missing: 'not_sent',
  };

  /**
   * Normalize a raw document status through the compat mapping layer.
   * Accepts both legacy (`done`, `idle`, …) and unified P0 codes.
   */
  function normalizeDocStatus(raw) {
    return _COMPAT[raw] || raw || 'not_sent';
  }

  var _ICON_CHECK = '<svg class="w-4 h-4 text-[var(--success)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path></svg>';
  var _ICON_CLOCK = '<svg class="w-4 h-4 text-[var(--primary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  var _ICON_WARN = '<svg class="w-4 h-4 text-[var(--danger)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  var _ICON_BAN = '<svg class="w-4 h-4 text-[var(--muted-2)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>';
  var _ICON_PENDING = '<svg class="w-4 h-4 text-[var(--warning)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"></path></svg>';
  var _ICON_NEUTRAL = '<svg class="w-4 h-4 text-[var(--muted-2)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"></path></svg>';

  var _STATUS_ICON_MAP = {
    approved: _ICON_CHECK,
    uploaded_reviewing: _ICON_CLOCK,
    revision_required: _ICON_WARN,
    expired: _ICON_WARN,
    waived: _ICON_BAN,
    waiting_upload: _ICON_PENDING,
    not_sent: _ICON_NEUTRAL,
  };

  var _STATUS_BADGE_MAP = {
    approved: 'badge-green',
    uploaded_reviewing: 'badge-blue',
    revision_required: 'badge-red',
    expired: 'badge-red',
    waived: 'badge-gray',
    waiting_upload: 'badge-orange',
    not_sent: 'badge-gray',
  };

  function docStatusIcon(status) {
    var s = normalizeDocStatus(status);
    return _STATUS_ICON_MAP[s] || _ICON_NEUTRAL;
  }

  function docBadgeClass(status) {
    var s = normalizeDocStatus(status);
    return _STATUS_BADGE_MAP[s] || '';
  }

  function reviewActionLabel(action) {
    if (action === 'approved') return '审核通过';
    if (action === 'rejected') return '退回补正';
    if (action === 'uploaded') return '提交版本';
    if (action === 'waived') return '标记无需提供';
    return action;
  }

  function reviewActionBadge(action) {
    if (action === 'approved') return 'bg-green-50 text-green-700 border-green-200';
    if (action === 'rejected') return 'bg-red-50 text-red-700 border-red-200';
    if (action === 'uploaded') return 'bg-blue-50 text-blue-700 border-blue-200';
    return '';
  }

  /* ================================================================== */
  /*  TASKS TAB                                                          */
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
    return '<span class="' + cls + '">' + ns.esc(due) + '</span>';
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
        '    <span class="' + textCls + '">' + ns.esc(t.label) + '</span>',
        '  </div>',
        '  <div class="flex items-center gap-4">',
        '    ' + taskDueBadge(t.due, t.dueColor),
        '    <div class="w-7 h-7 rounded-full ' + taskAvatarColor(t.color) + ' flex items-center justify-center text-[11px] font-bold">' + ns.esc(t.assignee) + '</div>',
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
      var borderColor = ns.severityColor(sev);

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
        dateEl.style.color = ns.severityColor(sev);
      }
      if (remainEl) {
        remainEl.textContent = dl.remaining;
        remainEl.style.color = ns.severityColor(sev);
        remainEl.className = 'text-[12px] font-bold mt-1 px-2 py-0.5 rounded-md inline-block ' + ns.severityBgClass(sev);
      }
    });
  }

  /* ================================================================== */
  /*  EXPORTS                                                            */
  /* ================================================================== */

  ns.applySample = applySample;
  ns.applyProviderProgress = applyProviderProgress;
  ns.applyRiskSummary = applyRiskSummary;
  ns.applyOverviewHints = applyOverviewHints;
  ns.applyTimeline = applyTimeline;
  ns.applyTeam = applyTeam;
  ns.applyInfoFields = applyInfoFields;
  ns.applyRelatedParties = applyRelatedParties;
  ns.applyDocsProgress = applyDocsProgress;
  ns.normalizeDocStatus = normalizeDocStatus;
  ns.docStatusIcon = docStatusIcon;
  ns.docBadgeClass = docBadgeClass;
  ns.reviewActionLabel = reviewActionLabel;
  ns.reviewActionBadge = reviewActionBadge;
  ns.taskAvatarColor = taskAvatarColor;
  ns.taskDueBadge = taskDueBadge;
  ns.applyTasks = applyTasks;
  ns.applyDeadlines = applyDeadlines;
})();
