/**
 * Case Detail — Documents renderers.
 * Document list HTML builders and full list re-render.
 *
 * Depends on: case-detail-runtime.js (ns.esc),
 *             case-detail-renderers.js (ns.applyDocsProgress, ns.docStatusIcon,
 *               ns.docBadgeClass, ns.reviewActionLabel, ns.reviewActionBadge)
 * Namespace: window.CaseDetailPage
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  function renderVersionTable(versions) {
    if (!versions || !versions.length) return '';
    var rows = versions.map(function (v) {
      var refBadge = v.referenceSource
        ? '<span class="chip text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">引用自 ' + ns.esc(v.referenceSource.caseId) + '</span>'
        : '<span class="text-[var(--muted-2)]">本资料项登记</span>';
      var pathCell = v.path
        ? '<code class="text-[11px] font-mono bg-[var(--surface-2)] px-1 py-0.5 rounded select-all truncate max-w-[180px] inline-block align-middle" title="' + ns.esc(v.path) + '">' + ns.esc(v.path) + '</code>'
        : '<span class="text-[var(--muted-2)]">—</span>';
      return [
        '<tr class="border-t border-[var(--border)]">',
        '  <td class="py-1.5 pr-3 font-semibold text-[var(--text)] whitespace-nowrap">' + ns.esc(v.no) + '</td>',
        '  <td class="py-1.5 pr-3 text-[var(--text)] truncate max-w-[140px]">' + ns.esc(v.fileName) + '</td>',
        '  <td class="py-1.5 pr-3">' + pathCell + '</td>',
        '  <td class="py-1.5 pr-3 whitespace-nowrap text-[var(--muted-2)]">' + ns.esc(v.date) + '</td>',
        '  <td class="py-1.5">' + refBadge + '</td>',
        '</tr>',
      ].join('');
    }).join('');
    return [
      '<div class="mb-3">',
      '  <div class="text-[12px] font-bold text-[var(--muted)] mb-1.5">附件版本</div>',
      '  <table class="w-full text-[12px]">',
      '    <thead><tr class="text-left text-[var(--muted-2)]">',
      '      <th class="py-1 font-semibold pr-3">版本</th>',
      '      <th class="py-1 font-semibold pr-3">文件名</th>',
      '      <th class="py-1 font-semibold pr-3">归档路径</th>',
      '      <th class="py-1 font-semibold pr-3">登记时间</th>',
      '      <th class="py-1 font-semibold">来源</th>',
      '    </tr></thead>',
      '    <tbody>' + rows + '</tbody>',
      '  </table>',
      '</div>',
    ].join('');
  }

  function renderReferenceInfo(item) {
    var parts = [];
    if (item.referenceSource) {
      parts.push(
        '<span class="chip text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">' +
        '引用自：' + ns.esc(item.referenceSource.caseName) + ' · ' + ns.esc(item.referenceSource.docName) +
        '</span>'
      );
    }
    if (item.sharedCaseCount && item.sharedCaseCount > 1) {
      parts.push(
        '<span class="text-[11px] text-[var(--muted-2)]">当前 ' + item.sharedCaseCount + ' 个案件引用此版本</span>'
      );
    }
    if (item.expiryImpact) {
      parts.push(
        '<span class="text-[11px] text-[var(--danger)] font-semibold">' + ns.esc(item.expiryImpact) + '</span>'
      );
    }
    if (!parts.length) return '';
    return '<div class="flex flex-wrap items-center gap-2 mb-3">' + parts.join('') + '</div>';
  }

  function renderReviewHistory(history) {
    if (!history || !history.length) return '';
    var items = history.map(function (r) {
      var commentHtml = r.comment
        ? '<div class="text-[11px] text-[var(--muted)] mt-0.5">' + ns.esc(r.comment) + '</div>'
        : '';
      return [
        '<div class="flex items-start gap-2">',
        '  <span class="chip text-[10px] py-0 px-1.5 ' + ns.reviewActionBadge(r.action) + ' shrink-0">' + ns.esc(ns.reviewActionLabel(r.action)) + '</span>',
        '  <div class="min-w-0">',
        '    <span class="text-[12px] text-[var(--text)]">' + ns.esc(r.operator) + '</span>',
        '    <span class="text-[11px] text-[var(--muted-2)] ml-1">' + ns.esc(r.time) + '</span>',
        '    ' + commentHtml,
        '  </div>',
        '</div>',
      ].join('');
    }).join('');
    return [
      '<div class="mb-3">',
      '  <div class="text-[12px] font-bold text-[var(--muted)] mb-1.5">审核记录</div>',
      '  <div class="space-y-2">' + items + '</div>',
      '</div>',
    ].join('');
  }

  function renderReminderHistory(history) {
    if (!history || !history.length) return '';
    var items = history.map(function (r) {
      return [
        '<div class="flex items-center gap-2 text-[12px]">',
        '  <svg class="w-3 h-3 text-[var(--warning)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>',
        '  <span class="text-[var(--muted-2)]">' + ns.esc(r.time) + '</span>',
        '  <span class="text-[var(--text)]">' + ns.esc(r.method) + '</span>',
        '  <span class="text-[var(--muted-2)]">' + ns.esc(r.operator) + ' → ' + ns.esc(r.recipient) + '</span>',
        '</div>',
      ].join('');
    }).join('');
    return [
      '<div class="mb-3">',
      '  <div class="text-[12px] font-bold text-[var(--muted)] mb-1.5">催办记录</div>',
      '  <div class="space-y-1.5">' + items + '</div>',
      '</div>',
    ].join('');
  }

  function renderInlineActions(item) {
    var btns = [];
    var st = ns.normalizeDocStatus ? ns.normalizeDocStatus(item.status) : item.status;
    if (st === 'waiting_upload' || st === 'not_sent' || st === 'revision_required' || st === 'expired') {
      btns.push('<button class="btn-primary text-[11px] py-1 px-2.5" type="button" data-action="register" data-doc="' + ns.esc(item.name) + '">登记资料</button>');
    }
    if (st === 'uploaded_reviewing') {
      btns.push('<button class="btn-primary text-[11px] py-1 px-2.5" type="button" data-action="approve" data-doc="' + ns.esc(item.name) + '">审核通过</button>');
      btns.push('<button class="btn-pill text-[11px] py-1 px-2.5 text-[var(--danger)]" type="button" data-action="reject" data-doc="' + ns.esc(item.name) + '">退回补正</button>');
    }
    if (st === 'waiting_upload' || st === 'revision_required') {
      btns.push('<button class="btn-pill text-[11px] py-1 px-2.5" type="button" data-action="remind" data-doc="' + ns.esc(item.name) + '">发送催办</button>');
    }
    if (item.canWaive || st === 'waiting_upload' || st === 'not_sent' || st === 'uploaded_reviewing' || st === 'revision_required') {
      btns.push('<button class="text-[11px] text-[var(--muted-2)] hover:text-[var(--text)] font-semibold underline" type="button" data-action="waive" data-doc="' + ns.esc(item.name) + '">标记无需提供</button>');
    }
    if (st === 'waiting_upload' || st === 'not_sent' || st === 'revision_required' || st === 'expired') {
      btns.push('<button class="text-[11px] text-[var(--primary)] hover:underline font-semibold" type="button" data-action="reference" data-doc="' + ns.esc(item.name) + '">引用既有版本</button>');
    }
    if (!btns.length) return '';
    return '<div class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border)]">' + btns.join('') + '</div>';
  }

  function renderDetailPanel(item) {
    var sections = [
      renderReferenceInfo(item),
      renderVersionTable(item.versions),
      renderReviewHistory(item.reviewHistory),
      renderReminderHistory(item.reminderHistory),
      renderInlineActions(item),
    ].filter(Boolean).join('');
    if (!sections) return '';
    return '<div class="doc-detail-panel px-6 py-3 bg-[#fbfbfd] border-t border-dashed border-[var(--border)]" style="display:none">' + sections + '</div>';
  }

  function itemHasExpandable(item) {
    if (item.versions || item.reviewHistory || item.reminderHistory) return true;
    if (item.referenceSource || item.expiryImpact) return true;
    var st = ns.normalizeDocStatus ? ns.normalizeDocStatus(item.status) : item.status;
    if (st === 'waived' || st === 'approved') return false;
    return true;
  }

  function applyDocumentItems(docs) {
    var container = document.getElementById('documentsByProvider');
    if (!container || !docs) return;

    var allHeaders = container.querySelectorAll('.px-6.py-5.border-b');
    var headerFragment = allHeaders.length ? allHeaders[0].outerHTML : '';

    var groupsHtml = docs.map(function (group, gi) {
      var borderTop = gi > 0 ? ' border-t border-[var(--border)]' : '';
      var isEmployerGroup = group.group && (group.group.indexOf('雇主') >= 0 || group.group.indexOf('扶養者') >= 0);
      var reuseGroupBtn = isEmployerGroup
        ? '<button class="link-apple text-[11px] font-semibold flex items-center gap-1 ml-auto doc-reuse-group-btn" type="button" data-reuse-group="' + ns.esc(group.group) + '">' +
          '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>' +
          '复用此组资料</button>'
        : '';

      var itemsHtml = group.items.map(function (item, ii) {
        var isLast = ii === group.items.length - 1 && gi === docs.length - 1;
        var borderB = isLast ? ' border-b-0' : '';
        var _nStatus = ns.normalizeDocStatus ? ns.normalizeDocStatus(item.status) : item.status;
        var isWaived = _nStatus === 'waived';
        var waivedCls = isWaived ? ' is-waived' : '';
        var nameCls = isWaived
          ? 'text-[14px] font-semibold text-[var(--muted)] truncate line-through'
          : 'text-[14px] font-semibold text-[var(--text)] truncate';
        var metaCls = _nStatus === 'expired'
          ? 'text-[12px] text-[var(--danger)]'
          : 'text-[12px] text-[var(--muted-2)]';

        var actionHtml = '';
        if (item.canWaive) {
          actionHtml = '<button class="text-[11px] text-[var(--muted-2)] hover:text-[var(--text)] font-semibold underline waive-btn" type="button" data-waive-item="' + ns.esc(item.name) + '">标记无需提供</button>';
        }
        var reuseItemBtn = '';
        if (item.reusable || (isEmployerGroup && (_nStatus === 'approved' || _nStatus === 'uploaded_reviewing'))) {
          reuseItemBtn = '<button class="text-[11px] text-[var(--primary)] hover:underline font-semibold doc-reuse-item-btn" type="button" data-reuse-item="' + ns.esc(item.name) + '" title="从其他案件复用此资料">复用</button>';
        }

        var hasExpandable = itemHasExpandable(item);
        var chevronHtml = hasExpandable
          ? '<svg class="w-3.5 h-3.5 text-[var(--muted-2)] shrink-0 doc-expand-chevron transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'
          : '';
        var cursorCls = hasExpandable ? ' cursor-pointer hover:bg-[#fbfbfd]' : '';

        var refChip = '';
        if (item.referenceSource) {
          refChip = '<span class="chip text-[9px] py-0 px-1 bg-blue-50 text-blue-600 border-blue-200 shrink-0">引用</span>';
        }
        var sharedChip = '';
        if (item.sharedCaseCount && item.sharedCaseCount > 1) {
          sharedChip = '<span class="text-[10px] text-[var(--muted-2)] shrink-0">' + item.sharedCaseCount + '案引用</span>';
        }
        var expiryChip = '';
        if (item.expiryImpact) {
          expiryChip = '<span class="chip text-[9px] py-0 px-1 bg-red-50 text-red-600 border-red-200 shrink-0">过期影响</span>';
        }

        var rowHtml = [
          '<div class="doc-item px-6 py-3 flex items-center justify-between transition-colors' + borderB + waivedCls + cursorCls + '" data-doc-name="' + ns.esc(item.name) + '" data-expandable="' + (hasExpandable ? '1' : '0') + '">',
          '  <div class="flex items-center gap-3 flex-1 min-w-0">',
          '    ' + ns.docStatusIcon(item.status),
          '    <div class="min-w-0 flex-1">',
          '      <div class="flex items-center gap-2">',
          '        <span class="' + nameCls + '">' + ns.esc(item.name) + '</span>',
          '        ' + refChip + sharedChip + expiryChip,
          '      </div>',
          '      <div class="' + metaCls + '">' + ns.esc(item.meta) + '</div>',
          '    </div>',
          '  </div>',
          '  <div class="flex items-center gap-2">',
          '    <span class="status-badge ' + ns.docBadgeClass(item.status) + ' text-[11px]">' + ns.esc(ns.docStatusLabel ? ns.docStatusLabel(item.status) : (item.statusLabel || item.status)) + '</span>',
          '    ' + reuseItemBtn,
          '    ' + actionHtml,
          '    ' + chevronHtml,
          '  </div>',
          '</div>',
        ].join('');

        return rowHtml + renderDetailPanel(item);
      }).join('');

      return [
        '<div class="px-6 pt-5 pb-2' + borderTop + '">',
        '  <div class="flex items-center gap-2">',
        '    <div class="section-kicker">' + ns.esc(group.group) + '（' + ns.esc(group.count) + ' 完成）</div>',
        '    ' + reuseGroupBtn,
        '  </div>',
        '</div>',
        itemsHtml,
      ].join('');
    }).join('');

    container.innerHTML = headerFragment + groupsHtml;
  }

  ns.applyDocumentItems = applyDocumentItems;
})();
