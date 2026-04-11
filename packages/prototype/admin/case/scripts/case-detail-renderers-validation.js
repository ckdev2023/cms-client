/**
 * Case Detail — Renderers (REN-Validation)
 * Validation, package, risk confirmation, and billing renderers.
 *
 * P0 refs:
 *   03-业务规则与不变量.md §3.0F — 补正不是独立主阶段
 *   04-核心流程与状态流转.md §4.4 — Gate-A/B/C 触发点
 *
 * Depends on: case-detail-runtime.js (ns.setText, ns.esc, ns.billingBadge)
 * Namespace: window.CaseDetailPage
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  /** @type {Record<string, string>} Gate → stage guard label */
  var GATE_STAGE_GUARDS = {
    A: 'S3→S4',
    B: 'S4→S5 / S7 内补正',
    C: 'S6→S7 / S7 内补正',
  };

  /**
   * Toggle supplement-specific UI hints based on current stage.
   *
   * @param {string} stageCode - Current case stage code
   * @param {boolean} supplementOpen - Whether a supplement cycle is active
   */
  function _updateSupplementHints(stageCode, supplementOpen) {
    var show = stageCode === 'S7' && supplementOpen;
    var noteEl = document.getElementById('supplementGateNote');
    if (noteEl) noteEl.style.display = show ? '' : 'none';
    var retriggerNote = document.getElementById('supplementRetriggerNote');
    if (retriggerNote) retriggerNote.style.display = show ? '' : 'none';
  }

  /**
   * Build a gate chip with stage guard annotation.
   *
   * @param {string} gate - Gate identifier (A, B, C)
   * @returns {string} HTML string
   */
  function _gateChipHtml(gate) {
    if (!gate) return '';
    var guard = GATE_STAGE_GUARDS[gate.toUpperCase()] || '';
    return '<span class="chip text-[10px] py-0 px-1.5 font-bold gate-chip-' + gate.toLowerCase() + '">' +
      'Gate-' + ns.esc(gate) + '</span>' +
      (guard ? ' <span class="text-[10px] text-[var(--muted-2)]">' + ns.esc(guard) + '</span> ' : ' ');
  }

  /* ================================================================== */
  /*  VALIDATION TAB                                                     */
  /* ================================================================== */

  function applyValidation(s) {
    var val = s.validation;
    if (!val) return;

    _updateSupplementHints(s.stageCode, s.supplementOpen);

    ns.setText('lastValidationTime', val.lastTime || '');

    var blockingList = document.getElementById('validationBlockingList');
    if (blockingList) {
      blockingList.innerHTML = val.blocking.length
        ? val.blocking.map(function (item) {
          var gateChip = _gateChipHtml(item.gate);
          var docTarget = item.docName ? ns.esc(item.docName) : '';
          var jumpLink = docTarget
            ? '<button class="text-[11px] text-[var(--primary)] hover:underline font-semibold flex items-center gap-1 mt-1 blocker-jump-doc" type="button" data-doc-target="' + docTarget + '">' +
              '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>' +
              '前往资料清单 →</button>'
            : '<button class="text-[11px] text-[var(--primary)] hover:underline font-semibold flex items-center gap-1 mt-1 blocker-goto-docs" type="button">' +
              '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>' +
              '前往资料清单 →</button>';
          return [
            '<div class="p-4 rounded-xl border border-[var(--danger)]/20 bg-red-50/30">',
            '  <div class="flex items-start justify-between gap-3">',
            '    <div class="flex items-start gap-3">',
            '      <svg class="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            '      <div>',
            '        <div class="flex items-center gap-2">' + gateChip +
            '          <span class="chip text-[10px] py-0 px-1.5 bg-red-50 text-red-700 border-red-200 font-bold">硬性阻断</span>',
            '        </div>',
            '        <div class="text-[14px] font-bold text-[var(--text)] mt-1">' + ns.esc(item.title) + '</div>',
            '        <div class="text-[12px] text-[var(--muted)] mt-1">修复建议：' + ns.esc(item.fix) + '</div>',
            '        <div class="text-[12px] text-[var(--muted-2)] mt-1">责任人：' + ns.esc(item.assignee) + ' · 截止：' + ns.esc(item.deadline) + '</div>',
            '        ' + jumpLink,
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
          var gateChip = _gateChipHtml(item.gate);
          return [
            '<div class="p-4 rounded-xl border border-[var(--warning)]/20 bg-amber-50/30">',
            '  <div class="flex items-start gap-3">',
            '    <svg class="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"></path></svg>',
            '    <div>',
            '      <div class="flex items-center gap-2">' + gateChip +
            '        <span class="chip text-[10px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200 font-bold">提交前校验</span>',
            '      </div>',
            '      <div class="text-[14px] font-bold text-[var(--text)] mt-1">' + ns.esc(item.title) + '</div>',
            '      <div class="text-[12px] text-[var(--muted)] mt-1">建议：' + ns.esc(item.note) + '</div>',
            '    </div>',
            '  </div>',
            '</div>',
          ].join('');
        }).join('')
        : '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">无提交前校验项</div>';
    }

    applyGateStatusSummary(s);
    applySubmissionPackages(s.submissionPackages);
    applyCorrectionPackage(s.correctionPackage);
    applyDoubleReview(s.doubleReview);
  }

  /* ================================================================== */
  /*  VALIDATION — Gate Status Summary (A / B / C)                       */
  /* ================================================================== */

  function applyGateStatusSummary(s) {
    var container = document.getElementById('gateStatusSummary');
    if (!container) return;

    var ls = ns.liveState;
    var val = s.validation || {};
    var blocking = val.blocking || [];
    var stageCode = ls.stageCode;
    var isS7Supplement = stageCode === 'S7' && ls.supplementOpen;

    var gateABlocking = blocking.filter(function (b) { return b.gate === 'A'; });

    var hasDebt = ls.billing &&
      parseInt(String(ls.billing.outstanding || '0').replace(/[^0-9]/g, ''), 10) > 0;
    var hasRiskConfirm = !!ls.riskConfirmationRecord;

    var gateAStatus, gateBStatus, gateCStatus;

    if (stageCode === 'S1' || stageCode === 'S2') {
      gateAStatus = 'pending'; gateBStatus = 'pending'; gateCStatus = 'pending';
    } else if (stageCode === 'S3') {
      gateAStatus = gateABlocking.length ? 'fail' : 'ready';
      gateBStatus = 'pending'; gateCStatus = 'pending';
    } else if (stageCode === 'S4' || stageCode === 'S5') {
      gateAStatus = 'pass';
      gateBStatus = blocking.length ? 'fail' : (stageCode === 'S5' ? 'ready' : 'pending');
      gateCStatus = 'pending';
    } else if (stageCode === 'S6') {
      gateAStatus = 'pass'; gateBStatus = 'pass';
      gateCStatus = (blocking.length || (hasDebt && !hasRiskConfirm)) ? 'fail' : 'ready';
    } else if (stageCode === 'S7' || stageCode === 'S8' || stageCode === 'S9') {
      gateAStatus = 'pass'; gateBStatus = 'pass'; gateCStatus = 'pass';
      if (isS7Supplement) {
        gateBStatus = blocking.length ? 'fail' : 'ready';
        gateCStatus = (blocking.length || (hasDebt && !hasRiskConfirm)) ? 'fail' : 'ready';
      }
    } else {
      gateAStatus = 'pending'; gateBStatus = 'pending'; gateCStatus = 'pending';
    }

    var gates = [
      { label: 'Gate-A', desc: GATE_STAGE_GUARDS.A, status: gateAStatus },
      { label: 'Gate-B', desc: isS7Supplement ? 'S7 内补正重校验' : 'S4→S5', status: gateBStatus },
      { label: 'Gate-C', desc: isS7Supplement ? 'S7 内补正重校验' : 'S6→S7', status: gateCStatus },
    ];

    var statusMap = {
      pass:    { chip: 'bg-green-50 text-green-700 border-green-200', icon: '✓', text: '已通过' },
      ready:   { chip: 'bg-blue-50 text-blue-700 border-blue-200',   icon: '→', text: '可执行' },
      fail:    { chip: 'bg-red-50 text-red-700 border-red-200',      icon: '✗', text: '未通过' },
      pending: { chip: 'bg-gray-50 text-gray-500 border-gray-200',   icon: '—', text: '待触发' },
    };

    var html = '<div class="flex gap-3 flex-wrap">' + gates.map(function (g) {
      var st = statusMap[g.status] || statusMap.pending;
      return [
        '<div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[#fbfbfd]">',
        '  <span class="chip text-[10px] py-0 px-1.5 ' + st.chip + '">' + st.icon + '</span>',
        '  <div>',
        '    <div class="text-[13px] font-bold text-[var(--text)]">' + ns.esc(g.label) + '</div>',
        '    <div class="text-[11px] text-[var(--muted-2)]">' + ns.esc(g.desc) + ' · ' + ns.esc(st.text) + '</div>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('') + '</div>';

    if (stageCode === 'S6' || isS7Supplement) {
      var prereqs = [];
      if (blocking.length) prereqs.push('阻断项 ' + blocking.length + ' 个未修复');
      if (hasDebt && !hasRiskConfirm) prereqs.push('欠款风险未确认（Gate-C 要求）');
      if (prereqs.length) {
        html += '<div class="mt-3 p-3 rounded-lg border border-[var(--danger)]/20 bg-red-50/30 text-[12px] text-[var(--danger)] font-semibold">' +
          (isS7Supplement ? '补正提交前置条件（Gate-B/C 在 S7 内重新校验）：' : 'Gate-C 前置条件（S6→S7）：') +
          ns.esc(prereqs.join('；')) + '</div>';
      } else {
        html += '<div class="mt-3 p-3 rounded-lg border border-green-200 bg-green-50/30 text-[12px] text-green-700 font-semibold">' +
          (isS7Supplement ? '补正校验就绪：Gate-B/C 可在 S7 内重新执行 → 生成 SubmissionPackage(supplement)' : 'Gate-C 就绪：可生成 SubmissionPackage(initial) 并进入 S7') +
          '</div>';
      }
    }

    container.innerHTML = html;
  }

  /* ================================================================== */
  /*  VALIDATION — Submission Packages                                   */
  /* ================================================================== */

  function applySubmissionPackages(packages) {
    var container = document.getElementById('submissionPackages');
    if (!container) return;

    if (!packages || !packages.length) {
      container.innerHTML = '<div class="text-[13px] text-[var(--muted-2)] font-semibold py-2">暂无提交包</div>';
      return;
    }

    container.innerHTML = packages.map(function (pkg, idx) {
      var lockChip = pkg.locked ? '<span class="chip text-[10px] py-0 px-1.5">🔒 已锁定</span>' : '';
      var kindChip = pkg.submission_kind === 'supplement'
        ? '<span class="chip text-[10px] py-0 px-1.5 bg-orange-50 text-orange-700 border-orange-200">补正</span>'
        : '<span class="chip text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">初回</span>';
      var relatedChip = pkg.related_submission_id
        ? '<span class="chip text-[10px] py-0 px-1.5 bg-gray-50 text-gray-600 border-gray-200">关联 ' + ns.esc(pkg.related_submission_id) + '</span>'
        : '';
      var receiptChip = pkg.receiptDate
        ? '<span class="chip text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">回执 ' + ns.esc(pkg.receiptDate) + '</span>'
        : '';
      var receiptNumberHtml = '';
      if (pkg.locked) {
        if (pkg.receiptNumber) {
          receiptNumberHtml = [
            '<div class="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-3">',
            '  <div>',
            '    <div class="text-[11px] font-bold text-[var(--muted-2)] mb-1">受理番号</div>',
            '    <div class="text-[13px] font-mono font-semibold text-[var(--text)]">' + ns.esc(pkg.receiptNumber) + '</div>',
            '  </div>',
            '  <div>',
            '    <div class="text-[11px] font-bold text-[var(--muted-2)] mb-1">受理日</div>',
            '    <div class="text-[13px] font-semibold text-[var(--text)]">' + ns.esc(pkg.receiptDate || '—') + '</div>',
            '  </div>',
            '  <div>',
            '    <div class="text-[11px] font-bold text-[var(--muted-2)] mb-1">凭证</div>',
            '    <div class="text-[13px] font-semibold text-[var(--text)]">' + ns.esc(pkg.voucherRef || '—') + '</div>',
            '  </div>',
            '</div>',
          ].join('');
        } else {
          receiptNumberHtml = [
            '<div class="mt-3 pt-3 border-t border-[var(--border)]">',
            '  <div class="text-[11px] font-bold text-[var(--muted-2)] mb-2">补录回执信息（S7 阶段）</div>',
            '  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">',
            '    <input type="text" placeholder="受理番号" class="apple-input text-[12px] font-mono" data-receipt-field="receiptNumber" data-pkg-idx="' + idx + '">',
            '    <input type="date" class="apple-input text-[12px]" data-receipt-field="receiptDate" data-pkg-idx="' + idx + '" value="' + ns.esc(pkg.receiptDate || '') + '">',
            '    <input type="text" placeholder="凭证编号（可选）" class="apple-input text-[12px]" data-receipt-field="voucherRef" data-pkg-idx="' + idx + '">',
            '  </div>',
            '  <button class="btn-primary text-[12px] py-1.5 px-3 mt-2" type="button" data-save-receipt-idx="' + idx + '">保存回执</button>',
            '</div>',
          ].join('');
        }
      }
      var versionDiffBtn = (packages.length > 1 && idx > 0)
        ? '<button class="text-[12px] text-[var(--muted)] hover:text-[var(--primary)] font-semibold flex items-center gap-1" type="button" data-diff-idx="' + idx + '">' +
          '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>' +
          '与前一版对比</button>'
        : '';
      var receiptBtn = pkg.receiptDate && pkg.receiptNumber
        ? ''
        : (!pkg.locked ? '<button class="text-[12px] text-[var(--primary)] hover:underline font-semibold receipt-btn" type="button" data-receipt-idx="' + idx + '">登记回执</button>' : '');
      return [
        '<div class="p-4 rounded-xl border border-[var(--border)] bg-[#fbfbfd]">',
        '  <div class="flex items-center justify-between mb-2">',
        '    <div class="flex items-center gap-2 flex-wrap">',
        '      <span class="text-[14px] font-bold text-[var(--text)]">' + ns.esc(pkg.id) + '</span>',
        '      <span class="chip text-[10px] py-0 px-1.5 bg-green-50 text-green-700 border-green-200">' + ns.esc(pkg.status) + '</span>',
        '      ' + kindChip + lockChip + relatedChip + receiptChip,
        '    </div>',
        '    <span class="text-[12px] text-[var(--muted-2)] font-semibold">' + ns.esc(pkg.date) + '</span>',
        '  </div>',
        '  <div class="text-[12px] text-[var(--muted)]">' + ns.esc(pkg.summary) + '</div>',
        '  <div class="flex gap-3 mt-2">',
        '    <button class="text-[12px] text-[var(--primary)] hover:underline font-semibold" type="button">查看内容</button>',
        '    ' + versionDiffBtn,
        '    ' + receiptBtn,
        '  </div>',
        receiptNumberHtml,
        '</div>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  VALIDATION — Correction Package                                    */
  /* ================================================================== */

  function applyCorrectionPackage(corr) {
    var container = document.getElementById('correctionPackage');
    if (!container) return;
    if (!corr) { container.style.display = 'none'; return; }
    container.style.display = '';
    var kindChip = corr.submission_kind === 'supplement'
      ? '<span class="chip text-[10px] py-0 px-1.5 bg-orange-50 text-orange-700 border-orange-200">submission_kind=supplement</span>'
      : '';
    var relatedChip = (corr.related_submission_id || corr.relatedSub)
      ? '<span class="chip text-[10px] py-0 px-1.5 bg-gray-50 text-gray-600 border-gray-200">related_submission_id=' + ns.esc(corr.related_submission_id || corr.relatedSub) + '</span>'
      : '';
    var relatedId = corr.relatedSub || corr.related_submission_id || '—';
    container.innerHTML = [
      '<div class="section-kicker mb-2 !text-[var(--warning)]">补正包（submission_kind=supplement · S7 内补正循环 · 阶段不回退）</div>',
      '<h2 class="section-title mb-4">补正通知关联</h2>',
      '<div class="p-4 rounded-xl border border-[var(--warning)]/20 bg-amber-50/30 mb-3">',
      '  <div class="flex items-center justify-between mb-2">',
      '    <div class="flex items-center gap-2 flex-wrap">',
      '      <span class="text-[14px] font-bold text-[var(--text)]">' + ns.esc(corr.id) + '</span>',
      '      <span class="chip text-[10px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200">' + ns.esc(corr.status) + '</span>',
      '      <span class="chip text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">阶段保持 S7</span>',
      '      ' + kindChip + relatedChip,
      '    </div>',
      '    <span class="text-[12px] text-[var(--muted-2)] font-semibold">通知日：' + ns.esc(corr.noticeDate) + '</span>',
      '  </div>',
      '  <div class="text-[12px] text-[var(--muted)] mb-2">关联原提交包：' + ns.esc(relatedId) + ' · 补正截止：' + ns.esc(corr.corrDeadline) + '</div>',
      '  <div class="text-[12px] text-[var(--muted)] mb-2">补正项：' + ns.esc(corr.items) + '</div>',
      '  <div class="text-[11px] text-blue-600 bg-blue-50 rounded-lg p-2 mb-2">',
      '    提交补正包流程：Gate-B（S7 内重新执行）→ Gate-C（S7 内重新执行）→ 生成 SubmissionPackage（submission_kind=supplement, related_submission_id=' + ns.esc(relatedId) + '）',
      '  </div>',
      '  <div class="flex gap-2 mt-3">',
      '    <button class="btn-pill text-[12px] py-1 px-3" type="button">与原提交包对比</button>',
      '    <button class="text-[12px] text-[var(--primary)] hover:underline font-semibold" type="button">查看补正通知</button>',
      '  </div>',
      '</div>',
      '<div class="text-[12px] text-[var(--muted-2)]">' + ns.esc(corr.note) + '</div>',
    ].join('');
  }

  /* ================================================================== */
  /*  VALIDATION — Double Review                                         */
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
          '  <div class="text-[12px] text-[var(--text)]">' + ns.esc(r.rejectReason) + '</div>',
          '</div>',
        ].join('')
        : '';
      var commentLine = r.comment
        ? '<div class="text-[12px] text-[var(--muted)]">' + ns.esc(r.time) + ' · ' + ns.esc(r.comment) + '</div>'
        : '<div class="text-[12px] text-[var(--muted)]">' + ns.esc(r.time) + '</div>';
      var avatarColor = r.verdictBadge === 'badge-green' ? 'var(--success)' : 'var(--danger)';
      return [
        '<div class="p-3 rounded-xl border border-[var(--border)]">',
        '  <div class="flex items-center gap-2 mb-2">',
        '    <div class="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold" style="background:' + avatarColor + '">' + ns.esc(r.initials) + '</div>',
        '    <span class="text-[13px] font-bold text-[var(--text)]">' + ns.esc(r.name) + '</span>',
        '    <span class="chip text-[10px] py-0 px-1.5 ' + verdictChip + '">' + ns.esc(r.verdict) + '</span>',
        '  </div>',
        '  ' + commentLine,
        '  ' + rejectBlock,
        '</div>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  VALIDATION — Risk Confirmation Record                              */
  /* ================================================================== */

  function applyRiskConfirmationRecord(record) {
    var contentEl = document.getElementById('riskConfirmationContent');
    if (!contentEl) return;

    if (!record) {
      contentEl.innerHTML = [
        '<div class="text-center py-4">',
        '  <div class="text-[13px] text-[var(--muted-2)] font-semibold mb-3">当前无欠款风险确认</div>',
        '  <button class="btn-pill text-[12px] py-1.5 px-3" type="button" id="triggerRiskConfirm">模拟欠款确认</button>',
        '</div>',
      ].join('');
      ns.rebindRiskTrigger();
      return;
    }

    var contextLabel = record.context === 'sendCoe'
      ? '（COE 发送前确认）'
      : '';
    var evidenceHtml = record.evidence
      ? '<span class="font-semibold text-[var(--primary)]">📎 ' + ns.esc(record.evidence) + '</span>'
      : '<span class="text-[var(--muted-2)]">—</span>';

    contentEl.innerHTML = [
      '<div class="p-3 rounded-xl border border-amber-200 bg-amber-50/40">',
      '  <div class="flex items-center gap-2 mb-2">',
      '    <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"></path></svg>',
      '    <span class="text-[13px] font-bold text-amber-700">欠款风险已确认' + ns.esc(contextLabel) + '（warn 模式 · 不阻断提交）</span>',
      '  </div>',
      '  <div class="text-[12px] text-[var(--muted)] space-y-1">',
      '    <div>确认人：<span class="font-semibold">' + ns.esc(record.confirmedBy) + '</span></div>',
      '    <div>确认原因：' + ns.esc(record.reason) + '</div>',
      '    <div>凭证：' + evidenceHtml + '</div>',
      '    <div>确认时间：<span class="font-semibold">' + ns.esc(record.time) + '</span></div>',
      '    <div>未结清金额：<span class="font-semibold">' + ns.esc(record.amount) + '</span></div>',
      '  </div>',
      '</div>',
      '<div class="mt-3">',
      '  <button class="btn-pill text-[12px] py-1.5 px-3" type="button" id="triggerRiskConfirm">再次模拟欠款确认</button>',
      '</div>',
    ].join('');
    ns.rebindRiskTrigger();
  }

  /* ================================================================== */
  /*  BILLING TAB                                                        */
  /* ================================================================== */

  function applyBillingSummary(billing) {
    if (!billing) return;
    ns.setText('billingTotal', billing.total);
    ns.setText('billingReceived', billing.received);
    ns.setText('billingOutstanding', billing.outstanding);
  }

  function applyBillingTable(billing) {
    if (!billing || !billing.payments) return;
    var tbody = document.getElementById('billingTableBody');
    if (!tbody) return;
    var thead = tbody.parentElement ? tbody.parentElement.querySelector('thead tr') : null;
    if (thead) {
      var existingThs = thead.querySelectorAll('th');
      if (existingThs.length < 7) {
        thead.innerHTML = [
          '<th>\u65e5\u671f</th>',
          '<th>\u7c7b\u578b</th>',
          '<th class="text-right">\u91d1\u989d</th>',
          '<th class="text-center">\u72b6\u6001</th>',
          '<th>\u9636\u6bb5\u7ed1\u5b9a</th>',
          '<th class="text-left">\u51ed\u8bc1</th>',
          '<th class="text-right">\u64cd\u4f5c</th>',
        ].join('');
      }
    }
    tbody.innerHTML = billing.payments.map(function (p) {
      var badgeCls = ns.billingBadge(p.status);
      var isTerminal = p.status === 'voided' || p.status === 'reversed';
      var actionLabel = p.status === 'paid' ? '查看回款' : (isTerminal ? '' : '登记回款');
      var actionHtml = actionLabel
        ? '<button class="text-[var(--primary)] text-[13px] font-semibold hover:underline row-quick-action' + (isTerminal ? ' opacity-50 pointer-events-none' : '') + '" type="button">' + actionLabel + '</button>'
        : '<span class="text-[12px] text-[var(--muted-2)]">—</span>';
      var stageHtml = p.stage
        ? '<span class="chip text-[10px] py-0 px-1.5">' + ns.esc(p.stage) + '</span>'
        : '<span class="text-[12px] text-[var(--muted-2)]">—</span>';
      var voucherHtml = p.voucher
        ? '<a href="#" class="text-[12px] text-[var(--primary)] hover:underline font-semibold">' + ns.esc(p.voucher) + '</a>'
        : '<span class="text-[12px] text-[var(--muted-2)]">—</span>';
      var rowCls = isTerminal ? ' opacity-60' : '';
      return [
        '<tr class="' + rowCls + '">',
        '  <td class="font-semibold text-[var(--text)]">' + ns.esc(p.date) + '</td>',
        '  <td>' + ns.esc(p.type) + '</td>',
        '  <td class="text-right font-semibold text-[var(--text)]">' + ns.esc(p.amount) + '</td>',
        '  <td class="text-center"><span class="status-badge ' + badgeCls + ' text-[11px]">' + ns.esc(p.statusLabel) + '</span></td>',
        '  <td>' + stageHtml + '</td>',
        '  <td>' + voucherHtml + '</td>',
        '  <td class="text-right">' + actionHtml + '</td>',
        '</tr>',
      ].join('');
    }).join('');
  }

  /* ================================================================== */
  /*  EXPORTS                                                            */
  /* ================================================================== */

  ns.applyValidation = applyValidation;
  ns.applyGateStatusSummary = applyGateStatusSummary;
  ns.applySubmissionPackages = applySubmissionPackages;
  ns.applyCorrectionPackage = applyCorrectionPackage;
  ns.applyDoubleReview = applyDoubleReview;
  ns.applyRiskConfirmationRecord = applyRiskConfirmationRecord;
  ns._updateSupplementHints = _updateSupplementHints;
  ns.applyBillingSummary = applyBillingSummary;
  ns.applyBillingTable = applyBillingTable;
})();
