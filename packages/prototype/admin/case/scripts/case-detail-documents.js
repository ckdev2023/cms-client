/**
 * Case Detail — document list renderers.
 *
 * Depends on:
 * - scripts/case-detail-runtime.js
 */
(function () {
  'use strict';

  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  function applyDocsProgress(sample) {
    var docsBar = document.getElementById('docsProgressBar');
    var docsLabel = document.getElementById('docsProgressLabel');

    if (docsBar) docsBar.style.width = sample.progressPercent + '%';
    if (docsLabel) docsLabel.textContent = sample.docsCounter + ' 项已登记（' + sample.progressPercent + '%）';
  }

  function normalizeDocStatusLabel(item) {
    if (!item || !item.statusLabel) return '';

    return item.statusLabel
      .replace('已提交待审核', '已登记待审核')
      .replace('待提交', '待登记');
  }

  function buildArchivePath(fileName) {
    if (!fileName || !ns.currentSample || !ns.currentSample.id) return '';
    return '案件/' + ns.currentSample.id + '/资料/' + fileName;
  }

  function normalizeDocMeta(item) {
    if (!item || !item.meta) return '';

    var meta = item.meta.replace(/未上传/g, '待登记');
    if (meta.indexOf('本地归档相对路径：') >= 0) return meta;

    var token = meta.split(' · ')[0] || '';
    if (/\.(pdf|jpg|jpeg|png|docx|xlsx)$/i.test(token)) {
      meta += ' · 本地归档相对路径：' + buildArchivePath(token);
    }

    return meta;
  }

  function docStatusIcon(status) {
    if (status === 'reviewed' || status === 'submitted' || status === 'done') {
      return '<svg class="w-4 h-4 text-[var(--success)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path></svg>';
    }
    if (status === 'expired' || status === 'rejected') {
      return '<svg class="w-4 h-4 text-[var(--danger)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    }
    if (status === 'waived') {
      return '<svg class="w-4 h-4 text-[var(--muted-2)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>';
    }
    if (status === 'pending') {
      return '<svg class="w-4 h-4 text-[var(--warning)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"></path></svg>';
    }
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

    var groupsHtml = docs.map(function (group, groupIndex) {
      var borderTop = groupIndex > 0 ? ' border-t border-[var(--border)]' : '';

      var itemsHtml = group.items.map(function (item, itemIndex) {
        var isLast = itemIndex === group.items.length - 1 && groupIndex === docs.length - 1;
        var borderB = isLast ? ' border-b-0' : '';
        var isWaived = item.status === 'waived';
        var waivedCls = isWaived ? ' is-waived' : '';
        var nameCls = isWaived
          ? 'text-[14px] font-semibold text-[var(--muted)] truncate line-through'
          : 'text-[14px] font-semibold text-[var(--text)] truncate';
        var metaCls = item.status === 'expired'
          ? 'text-[12px] text-[var(--danger)]'
          : 'text-[12px] text-[var(--muted-2)]';
        var actionHtml = '';

        if (item.canWaive) {
          actionHtml = '<button class="text-[11px] text-[var(--muted-2)] hover:text-[var(--text)] font-semibold underline" type="button" data-waive-item="' + ns.esc(item.name) + '">标记无需提供</button>';
        }

        return [
          '<div class="doc-item px-6 py-3 flex items-center justify-between' + borderB + waivedCls + '">',
          '  <div class="flex items-center gap-3 flex-1 min-w-0">',
          '    ' + docStatusIcon(item.status),
          '    <div class="min-w-0">',
          '      <div class="' + nameCls + '">' + ns.esc(item.name) + '</div>',
          '      <div class="' + metaCls + '">' + ns.esc(normalizeDocMeta(item)) + '</div>',
          '    </div>',
          '  </div>',
          '  <div class="flex items-center gap-2">',
          '    <span class="status-badge ' + docBadgeClass(item.status) + ' text-[11px]">' + ns.esc(normalizeDocStatusLabel(item)) + '</span>',
          '    ' + actionHtml,
          '  </div>',
          '</div>',
        ].join('');
      }).join('');

      return [
        '<div class="px-6 pt-5 pb-2' + borderTop + '">',
        '  <div class="section-kicker">' + ns.esc(group.group) + '（' + ns.esc(group.count) + ' 完成）</div>',
        '</div>',
        itemsHtml,
      ].join('');
    }).join('');

    container.innerHTML = headerFragment + groupsHtml;
  }

  ns.applyDocsProgress = applyDocsProgress;
  ns.docStatusIcon = docStatusIcon;
  ns.docBadgeClass = docBadgeClass;
  ns.applyDocumentItems = applyDocumentItems;
})();
