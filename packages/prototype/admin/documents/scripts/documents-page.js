var DocumentsPage = (function () {
  'use strict';

  var CFG, DATA;
  var _toastTimer;

  function init() {
    CFG = window.DocumentsConfig;
    DATA = window.DocumentsDemoData;

    initToast();
    renderTable(DATA.DEMO_DOCUMENT_ROWS);
    updateSummaryCards(DATA.DEMO_DOCUMENT_ROWS);
    populateCaseFilter();
    initSummaryCardClicks();
    initRiskPanel();
    initRowActions();
    initCopyPath();
  }

  /* ------------------------------------------------------------------ */
  /*  Toast                                                              */
  /* ------------------------------------------------------------------ */

  function initToast() {
    var el = document.getElementById('toast');
    if (!el) return;
    window.__docsPage = window.__docsPage || {};
    window.__docsPage.showToast = showToast;
    window.__docsPage.showToastPreset = showToastPreset;
  }

  function showToast(title, desc) {
    var el = document.getElementById('toast');
    var titleEl = document.getElementById('toastTitle');
    var descEl = document.getElementById('toastDesc');
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (el) el.classList.remove('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      if (el) el.classList.add('hidden');
    }, 2800);
  }

  function showToastPreset(key, replacements) {
    var preset = CFG.TOAST[key];
    if (!preset) return;
    var title = preset.title;
    var desc = preset.desc;
    if (replacements) {
      Object.keys(replacements).forEach(function (k) {
        title = title.replace('{' + k + '}', String(replacements[k]));
        desc = desc.replace('{' + k + '}', String(replacements[k]));
      });
    }
    showToast(title, desc);
  }

  /* ------------------------------------------------------------------ */
  /*  Table rendering                                                    */
  /* ------------------------------------------------------------------ */

  function renderTable(rows) {
    var tbody = document.getElementById('docTableBody');
    var emptyState = document.getElementById('docEmptyState');
    var table = document.querySelector('#docTableCard table');
    var pagination = document.getElementById('docPagination');
    var paginationInfo = document.getElementById('docPaginationInfo');
    var tableCount = document.getElementById('docTableCount');

    if (!tbody) return;

    var sorted = rows.slice().sort(function (a, b) {
      var sa = CFG.normalizeDocStatus(a.status);
      var sb = CFG.normalizeDocStatus(b.status);
      var pa = CFG.STATUS_SORT_PRIORITY[sa] != null ? CFG.STATUS_SORT_PRIORITY[sa] : 99;
      var pb = CFG.STATUS_SORT_PRIORITY[sb] != null ? CFG.STATUS_SORT_PRIORITY[sb] : 99;
      return pa - pb;
    });

    tbody.innerHTML = '';

    if (sorted.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (table) table.style.display = 'none';
      if (pagination) pagination.style.display = 'none';
      if (tableCount) tableCount.textContent = '0';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (table) table.style.display = '';
    if (pagination) pagination.style.display = '';

    sorted.forEach(function (doc) {
      tbody.appendChild(buildRow(doc));
    });

    if (paginationInfo) {
      paginationInfo.textContent = '显示 1 - ' + sorted.length + ' 条，共 ' + sorted.length + ' 条';
    }
    if (tableCount) tableCount.textContent = String(sorted.length);
  }

  function buildRow(doc) {
    var nStatus = CFG.normalizeDocStatus(doc.status);
    var tr = document.createElement('tr');
    tr.setAttribute('data-doc-id', doc.id);
    tr.setAttribute('data-doc-status', nStatus);
    tr.setAttribute('data-doc-case', doc.caseNo);
    tr.setAttribute('data-doc-provider', doc.provider);
    tr.className = 'doc-table-row';
    if (nStatus === 'expired') tr.style.background = 'rgba(220,38,38,0.04)';

    var nonSelectable = CFG.NON_SELECTABLE_STATUSES.indexOf(nStatus) !== -1;
    var isWaived = nStatus === 'waived';
    var statusLabel = CFG.STATUS_LABEL_MAP[nStatus] || nStatus;
    var providerLabel = CFG.PROVIDER_LABEL_MAP[doc.provider] || doc.provider;

    var actions = getRowActions(doc);
    var actionsHtml = actions.map(function (a) {
      return '<button class="doc-inline-link" type="button" ' +
        'data-row-action="' + a.action + '" data-target-doc="' + doc.id + '">' + a.label + '</button>';
    }).join('');

    var badges = '';
    if (doc.sharedRefCount && doc.sharedRefCount > 1) {
      badges += '<span class="tag text-[11px]">共用×' + doc.sharedRefCount + '</span>';
    }
    if (doc.referenceSource) {
      badges += '<span class="tag tag-blue text-[11px]">引自 ' + esc(doc.referenceSource.caseNo) + '</span>';
    }
    if (doc.sharedVersionExpiry) {
      badges += '<span class="inline-flex items-center gap-0.5 text-[11px] text-red-600 font-semibold">' +
        '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' +
        '共享过期</span>';
    }

    var pathHtml = '<span class="doc-cell-quiet">未登记</span>';
    if (doc.relativePath) {
      pathHtml =
        '<div class="doc-path">' +
          '<span class="truncate doc-path__value" title="' + esc(doc.relativePath) + '">' + esc(doc.relativePath) + '</span>' +
          '<button class="doc-path__copy flex-shrink-0" type="button" data-copy-path="' + esc(doc.relativePath) + '" title="复制路径">' +
            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>' +
          '</button>' +
        '</div>';
    }

    var deadlineHtml = doc.deadline
      ? '<span class="doc-cell-primary">' + esc(doc.deadline) + '</span>'
      : '<span class="doc-cell-quiet">—</span>';
    if (doc.deadline && nStatus !== 'approved' && nStatus !== 'waived') {
      var today = new Date().toISOString().split('T')[0];
      if (doc.deadline < today) {
        deadlineHtml = '<span class="tag tag-red text-[11px]">已过期</span>';
      } else {
        var diff = Math.ceil((new Date(doc.deadline) - new Date(today)) / 86400000);
        if (diff <= 7) {
          deadlineHtml = '<span class="doc-deadline-warning">还有 ' + diff + ' 天</span>';
        }
      }
    }

    var nameCls = isWaived ? 'doc-row-title is-waived' : 'doc-row-title';
    var cbExtraCls = nonSelectable ? ' opacity-60' : '';
    var caseHtml =
      '<div class="doc-cell-stack">' +
        '<span class="doc-cell-primary">' + esc(doc.caseLabel) + '</span>' +
        '<span class="doc-cell-secondary">' + esc(doc.caseNo) + '</span>' +
      '</div>';
    var providerHtml = '<span class="doc-cell-primary">' + esc(providerLabel) + '</span>';
    var reminderHtml = doc.lastReminder
      ? '<span class="doc-cell-primary">' + esc(doc.lastReminder) + '</span>'
      : '<span class="doc-cell-quiet">—</span>';

    tr.innerHTML =
      '<td class="text-center">' +
        '<input type="checkbox" data-doc-select value="' + doc.id + '" class="accent-[var(--primary)] table-checkbox' + cbExtraCls + '"' +
        (nonSelectable ? ' disabled' : '') +
        ' aria-label="选择 ' + esc(doc.docName) + '" />' +
      '</td>' +
      '<td class="doc-name-cell">' +
        '<div class="doc-row-title-wrap">' +
          '<div class="' + nameCls + '">' + esc(doc.docName) + '</div>' +
          (badges ? '<div class="doc-row-badges">' + badges + '</div>' : '') +
        '</div>' +
        (actionsHtml ? '<div class="doc-row-actions">' + actionsHtml + '</div>' : '') +
      '</td>' +
      '<td class="hidden md:table-cell">' + caseHtml + '</td>' +
      '<td class="hidden lg:table-cell">' + providerHtml + '</td>' +
      '<td><span class="tag ' + statusTagCls(nStatus) + '">' + esc(statusLabel) + '</span></td>' +
      '<td class="hidden md:table-cell">' + deadlineHtml + '</td>' +
      '<td class="hidden lg:table-cell">' + reminderHtml + '</td>' +
      '<td class="hidden lg:table-cell">' + pathHtml + '</td>';

    return tr;
  }

  var TAG_CLS = {
    not_sent:           'tag-gray',
    waiting_upload:     'tag-orange',
    uploaded_reviewing: 'tag-blue',
    approved:           'tag-green',
    revision_required:  'tag-red',
    expired:            'tag-red',
    waived:             'tag-gray',
  };

  function statusTagCls(status) { return TAG_CLS[status] || ''; }

  function getRowActions(doc) {
    var st = CFG.normalizeDocStatus(doc.status);
    switch (st) {
      case 'not_sent':
        return [
          { action: 'register', label: '登记' },
          { action: 'waive', label: '无需提供' },
          { action: 'reference', label: '使用已存' },
        ];
      case 'waiting_upload':
        return [
          { action: 'register', label: '登记' },
          { action: 'remind', label: '催办' },
          { action: 'waive', label: '无需提供' },
          { action: 'reference', label: '使用已存' },
        ];
      case 'uploaded_reviewing':
        return [
          { action: 'approve', label: '审核通过' },
          { action: 'reject', label: '退回补正' },
          { action: 'waive', label: '无需提供' },
        ];
      case 'revision_required':
        return [
          { action: 'register', label: '重新登记' },
          { action: 'remind', label: '催办' },
          { action: 'waive', label: '无需提供' },
        ];
      case 'expired':
        return [
          { action: 'register', label: '登记' },
          { action: 'remind', label: '催办' },
        ];
      default:
        return [];
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Summary cards                                                      */
  /* ------------------------------------------------------------------ */

  function updateSummaryCards(rows) {
    var counts = { reviewing: 0, missing: 0, expired: 0, sharedExpiry: 0 };
    rows.forEach(function (doc) {
      var st = CFG.normalizeDocStatus(doc.status);
      if (st === 'uploaded_reviewing') counts.reviewing++;
      if (st === 'not_sent' || st === 'waiting_upload' || st === 'revision_required') counts.missing++;
      if (st === 'expired') counts.expired++;
      if (doc.sharedVersionExpiry) counts.sharedExpiry++;
    });
    setText('reviewingCount', counts.reviewing);
    setText('missingCount', counts.missing);
    setText('expiredCount', counts.expired);
    setText('sharedExpiryCount', counts.sharedExpiry);
  }

  function initSummaryCardClicks() {
    document.querySelectorAll('[data-action="filter-by-card"]').forEach(function (card) {
      card.addEventListener('click', function () {
        var cardStatus = card.getAttribute('data-card-status');
        setActiveSummaryCard(cardStatus);
        if (cardStatus === 'shared_expired') {
          openRiskPanel();
          return;
        }
        if (window.DocumentsFilters && window.DocumentsFilters.setCardFilter) {
          window.DocumentsFilters.setCardFilter(cardStatus);
        }
      });
    });
  }

  function setActiveSummaryCard(cardStatus) {
    document.querySelectorAll('[data-action="filter-by-card"]').forEach(function (card) {
      var isActive = card.getAttribute('data-card-status') === cardStatus && cardStatus !== 'shared_expired';
      card.classList.toggle('is-active', isActive);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Case filter population                                             */
  /* ------------------------------------------------------------------ */

  function populateCaseFilter() {
    var caseSelect = document.querySelector('[data-filter="case"]');
    if (!caseSelect) return;
    DATA.DEMO_CASES.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.value;
      opt.textContent = c.label;
      caseSelect.appendChild(opt);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Risk panel                                                         */
  /* ------------------------------------------------------------------ */

  function initRiskPanel() {
    renderRiskPanel();
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="close-risk-panel"]')) {
        closeRiskPanel();
      }
    });
  }

  function openRiskPanel() {
    var panel = document.getElementById('riskLogPanel');
    if (!panel) return;
    panel.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeRiskPanel() {
    var panel = document.getElementById('riskLogPanel');
    if (panel) panel.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderRiskPanel() {
    var body = document.getElementById('riskLogBody');
    if (!body) return;
    var risks = DATA.DEMO_SHARED_EXPIRY_RISKS;

    if (!risks || risks.length === 0) {
      body.innerHTML =
        '<div class="py-12 text-center" id="riskLogEmpty">' +
          '<svg class="w-12 h-12 mx-auto text-green-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' +
          '<p class="text-[15px] font-semibold text-[var(--muted)]">暂无共用资料到期影响</p>' +
          '<p class="text-[13px] text-[var(--muted-2)] mt-1">当前所有被多个案件共用的资料都还在有效期内</p>' +
        '</div>';
      return;
    }

    var html = '';
    risks.forEach(function (risk) {
      var casesHtml = '';
      risk.affectedCases.forEach(function (c) {
        casesHtml += '<a href="../case/detail.html" class="block text-[13px] text-[var(--primary)] hover:underline font-semibold">' + esc(c.caseLabel) + '</a>';
      });
      html +=
        '<div class="apple-card p-4 border-l-[3px] border-l-[var(--danger)]">' +
          '<div class="flex items-start gap-3">' +
            '<div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">' +
              '<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' +
            '</div>' +
            '<div class="flex-1 min-w-0">' +
              '<p class="text-sm font-semibold text-[var(--text)]">' + esc(risk.docName) + ' — v' + risk.version + '</p>' +
              '<p class="text-[12px] text-red-600 font-semibold mt-0.5">已过期（有效期至 ' + esc(risk.expiryDate) + '）</p>' +
              '<div class="mt-3 space-y-1.5">' +
                '<p class="text-[12px] font-semibold text-[var(--muted-2)] uppercase tracking-wider">受影响案件</p>' +
                '<div class="space-y-1">' + casesHtml + '</div>' +
              '</div>' +
              '<div class="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">' +
                '<p class="text-[12px] text-amber-800 font-semibold">' +
                  '<svg class="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' +
                  '建议操作：' + esc(risk.suggestedAction) +
                '</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
    body.innerHTML = html;
  }

  /* ------------------------------------------------------------------ */
  /*  Row actions (delegated from table body)                            */
  /* ------------------------------------------------------------------ */

  function initRowActions() {
    var tbody = document.getElementById('docTableBody');
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-row-action]');
      if (!btn) return;
      e.preventDefault();
      var action = btn.getAttribute('data-row-action');
      var docId = btn.getAttribute('data-target-doc');
      var doc = findDoc(docId);
      if (!doc) return;

      switch (action) {
        case 'approve':
          if (window.DocumentsReview) window.DocumentsReview.openApprove(doc);
          break;
        case 'reject':
          if (window.DocumentsReview) window.DocumentsReview.openReject(doc);
          break;
        case 'waive':
          if (window.DocumentsReview) window.DocumentsReview.openWaive(doc);
          break;
        case 'reference':
          if (window.DocumentsReview) window.DocumentsReview.openReference(doc);
          break;
        case 'register':
          if (window.DocumentsRegisterModal) window.DocumentsRegisterModal.openForDoc(doc);
          break;
        case 'remind':
          doc.lastReminder = new Date().toISOString().split('T')[0];
          if (!doc.reminderRecords) doc.reminderRecords = [];
          doc.reminderRecords.unshift({
            sentAt: new Date().toISOString(),
            sentBy: 'Admin',
            method: 'in-app',
            target: doc.provider,
          });
          showToastPreset('remind', { provider: CFG.PROVIDER_LABEL_MAP[doc.provider] || doc.provider });
          refreshTable();
          break;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Copy path                                                          */
  /* ------------------------------------------------------------------ */

  function initCopyPath() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy-path]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var path = btn.getAttribute('data-copy-path');
      if (navigator.clipboard && path) {
        navigator.clipboard.writeText(path).then(function () {
          showToastPreset('copyPath');
        });
      } else {
        showToastPreset('copyPath');
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function findDoc(id) {
    return DATA.DEMO_DOCUMENT_ROWS.find(function (d) { return d.id === id; });
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function syncAggregates() {
    var rows = DATA.DEMO_DOCUMENT_ROWS;
    var counts = { reviewing: 0, missing: 0, expired: 0, sharedExpiryRisk: 0 };
    rows.forEach(function (doc) {
      var st = CFG.normalizeDocStatus(doc.status);
      if (st === 'uploaded_reviewing') counts.reviewing++;
      if (st === 'not_sent' || st === 'waiting_upload' || st === 'revision_required') counts.missing++;
      if (st === 'expired') counts.expired++;
      if (doc.sharedVersionExpiry) counts.sharedExpiryRisk++;
    });
    DATA.DEMO_SUMMARY = counts;

    var reviewRecords = [];
    var reminderRecords = [];
    rows.forEach(function (doc) {
      if (doc.reviewRecords) {
        doc.reviewRecords.forEach(function (r) {
          reviewRecords.push({
            docId: doc.id, action: r.action, actor: r.actor,
            timestamp: r.timestamp, note: r.note || '',
          });
        });
      }
      if (doc.reminderRecords) {
        doc.reminderRecords.forEach(function (r) {
          reminderRecords.push({
            docId: doc.id, sentAt: r.sentAt, sentBy: r.sentBy,
            method: r.method, target: r.target,
          });
        });
      }
    });
    reviewRecords.sort(function (a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
    reminderRecords.sort(function (a, b) { return (b.sentAt || '').localeCompare(a.sentAt || ''); });
    DATA.DEMO_REVIEW_RECORDS = reviewRecords;
    DATA.DEMO_REMINDER_RECORDS = reminderRecords;
  }

  function refreshTable() {
    syncAggregates();
    renderTable(DATA.DEMO_DOCUMENT_ROWS);
    updateSummaryCards(DATA.DEMO_DOCUMENT_ROWS);
    if (window.DocumentsFilters && window.DocumentsFilters.applyFilters) {
      window.DocumentsFilters.applyFilters();
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    init: init,
    showToast: showToast,
    showToastPreset: showToastPreset,
    findDoc: findDoc,
    setActiveSummaryCard: setActiveSummaryCard,
    refreshTable: refreshTable,
  };
})();
