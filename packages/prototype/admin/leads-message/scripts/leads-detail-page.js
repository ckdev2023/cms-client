/**
 * Leads Detail Page — runtime behaviour (demo-only).
 * Reads window.LeadsDetailConfig and wires tab switching, sample switching,
 * banner visibility, header button matrix, follow-up form, conversion modals,
 * log category filter, and toast feedback.
 */
(function () {
  'use strict';

  var CFG = window.LeadsDetailConfig;
  if (!CFG) return;

  /* ------------------------------------------------------------------ */
  /*  DOM refs                                                           */
  /* ------------------------------------------------------------------ */

  var $  = function (id) { return document.getElementById(id); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var breadcrumbName    = $('breadcrumbName');
  var detailTitle       = $('detailTitle');
  var detailStatusBadge = $('detailStatusBadge');
  var detailLeadId      = $('detailLeadId');
  var detailOwnerAvatar = $('detailOwnerAvatar');
  var detailOwnerName   = $('detailOwnerName');
  var detailGroup       = $('detailGroup');

  var readonlyBanner    = $('readonlyBanner');
  var warningBanner     = $('warningBanner');

  var sampleSelect      = $('leadSampleSelect');
  var tabBtns           = $$('[data-tab]');
  var tabPanels         = $$('.tab-panel');

  var btnEditInfo       = $('btnEditInfo');
  var btnChangeStatus   = $('btnChangeStatus');
  var btnConvertCustomer = $('btnConvertCustomer');
  var btnConvertCase    = $('btnConvertCase');
  var btnMarkLost       = $('btnMarkLost');

  var toastEl           = $('toast');
  var toastTitle        = $('toastTitle');
  var toastDesc         = $('toastDesc');

  var currentSampleKey  = 'following';

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  var BADGE_CLASS_MAP = {
    new:          'lead-badge-new',
    following:    'lead-badge-following',
    pending_sign: 'lead-badge-pending_sign',
    signed:       'lead-badge-signed',
    lost:         'lead-badge-lost',
  };

  function showToast(title, desc) {
    if (!toastEl) return;
    toastTitle.textContent = title;
    toastDesc.textContent = desc || '';
    toastEl.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toastEl.classList.add('hidden'); }, 2800);
  }

  function openModal(id) {
    var el = $(id);
    if (el) el.classList.add('show');
  }

  function closeModal(id) {
    var el = $(id);
    if (el) el.classList.remove('show');
  }

  /* ------------------------------------------------------------------ */
  /*  Tab switching                                                      */
  /* ------------------------------------------------------------------ */

  function activateTab(key) {
    tabBtns.forEach(function (btn) {
      var isActive = btn.getAttribute('data-tab') === key;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    tabPanels.forEach(function (panel) {
      panel.classList.toggle('is-active', panel.id === 'tab-' + key);
    });
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activateTab(btn.getAttribute('data-tab'));
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Sample switching (core render)                                     */
  /* ------------------------------------------------------------------ */

  function renderSample(key) {
    var sample = CFG.DETAIL_SAMPLES[key];
    if (!sample) return;
    currentSampleKey = key;

    var sts = CFG.DETAIL_STATUSES[sample.status] || {};

    if (breadcrumbName) breadcrumbName.textContent = sample.name;
    if (detailTitle)    detailTitle.textContent = sample.name;
    if (detailLeadId)   detailLeadId.textContent = sample.id;

    if (detailStatusBadge) {
      detailStatusBadge.className = 'lead-badge text-[13px] ' + (BADGE_CLASS_MAP[sample.status] || '');
      detailStatusBadge.textContent = sts.label || sample.status;
    }

    if (detailOwnerAvatar) {
      detailOwnerAvatar.textContent = sample.ownerInitials;
      detailOwnerAvatar.className = 'w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ' + (sample.ownerAvatarClass || '');
    }
    if (detailOwnerName) detailOwnerName.textContent = sample.ownerLabel;
    if (detailGroup) detailGroup.textContent = sample.groupLabel;

    renderBanners(sample);
    renderHeaderButtons(sample);
    renderInfo(sample);
    renderFollowups(sample);
    renderConversion(sample);
    renderLog(sample);

    var mainEl = document.getElementById('main');
    if (mainEl) {
      mainEl.classList.toggle('detail-readonly', !!sample.readonly);
    }

    activateTab('info');
  }

  /* ------------------------------------------------------------------ */
  /*  Banners                                                            */
  /* ------------------------------------------------------------------ */

  function renderBanners(sample) {
    if (readonlyBanner) {
      readonlyBanner.classList.toggle('is-visible', sample.banner === 'lost');
    }
    if (warningBanner) {
      warningBanner.classList.toggle('is-visible', sample.banner === 'signedNotConverted');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Header button matrix                                               */
  /* ------------------------------------------------------------------ */

  function renderHeaderButtons(sample) {
    var matrix = CFG.HEADER_BUTTONS[sample.buttons] || CFG.HEADER_BUTTONS.normal;

    applyBtnState(btnConvertCustomer, matrix.convertCustomer, '转客户', '查看客户');
    applyBtnState(btnConvertCase, matrix.convertCase, '转案件', '查看案件');

    if (btnMarkLost) {
      btnMarkLost.style.display = matrix.markLost === 'hidden' ? 'none' : '';
      btnMarkLost.disabled = matrix.markLost === 'disabled';
      btnMarkLost.style.opacity = matrix.markLost === 'disabled' ? '0.4' : '';
    }

    if (btnEditInfo) {
      btnEditInfo.disabled = matrix.editInfo === 'disabled';
      btnEditInfo.style.opacity = matrix.editInfo === 'disabled' ? '0.4' : '';
    }

    if (btnChangeStatus) {
      btnChangeStatus.style.display = matrix.changeStatus === 'hidden' ? 'none' : '';
    }
  }

  function applyBtnState(btn, state, defaultLabel, viewLabel) {
    if (!btn) return;
    btn.style.display = state === 'hidden' ? 'none' : '';
    btn.disabled = state === 'disabled';
    btn.style.opacity = state === 'disabled' ? '0.4' : '';
    btn.classList.toggle('btn-highlight', state === 'highlighted');

    if (state === 'view-customer' || state === 'view-case') {
      btn.textContent = viewLabel;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
    } else {
      btn.textContent = defaultLabel;
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Tab 1 — Info                                                       */
  /* ------------------------------------------------------------------ */

  function renderInfo(sample) {
    var info = sample.info || {};
    setText('infoId', info.id);
    setText('infoName', info.name);
    setText('infoPhone', info.phone || '—');
    setText('infoEmail', info.email || '—');
    setText('infoSource', info.source || '—');
    setText('infoReferrer', info.referrer || '—');
    setText('infoBusinessType', info.businessType || '—');
    setText('infoNote', info.note || '—');

    var infoGroup = $('infoGroup');
    if (infoGroup) infoGroup.innerHTML = '<span class="chip">' + esc(info.group || '—') + '</span>';

    var infoOwner = $('infoOwner');
    if (infoOwner) {
      infoOwner.innerHTML =
        '<span class="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ' +
        esc(sample.ownerAvatarClass || '') + '">' + esc(sample.ownerInitials || '') + '</span> ' +
        esc(info.owner || '—');
    }

    var refField = $('infoReferrer');
    if (refField) {
      var refWrap = refField.closest('div');
      if (refWrap && refWrap.parentElement) {
        refWrap.style.display = info.referrer ? '' : 'none';
      }
    }
  }

  function setText(id, val) {
    var el = $(id);
    if (el) {
      el.textContent = val || '';
      el.classList.toggle('is-empty', !val || val === '—');
    }
  }

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab 2 — Follow-ups                                                 */
  /* ------------------------------------------------------------------ */

  var CHANNEL_DOT_COLOR = { phone: 'bg-sky-500', email: 'bg-emerald-500', meeting: 'bg-violet-500', im: 'bg-amber-500' };
  var CHANNEL_CHIP_BG   = { phone: 'bg-sky-100 text-sky-700', email: 'bg-emerald-100 text-emerald-700', meeting: 'bg-violet-100 text-violet-700', im: 'bg-amber-100 text-amber-700' };

  function renderFollowups(sample) {
    var list = sample.followups || [];
    var timelineEl = $('followupTimelineList');
    var emptyEl    = $('followupEmptyState');
    var formCard   = $('followupFormCard');

    if (!timelineEl) return;

    if (list.length === 0) {
      timelineEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (formCard) formCard.classList.remove('hidden');
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    if (formCard) formCard.classList.toggle('hidden', !!sample.readonly);

    var html = '';
    list.forEach(function (fu) {
      var dotColor = CHANNEL_DOT_COLOR[fu.channel] || 'bg-gray-400';
      var chipCls  = CHANNEL_CHIP_BG[fu.channel] || '';
      html += '<div class="timeline-item">' +
        '<div class="timeline-dot ' + dotColor + '"></div>' +
        '<div class="apple-card p-4"><div class="flex items-start justify-between gap-3"><div class="flex-1">' +
        '<div class="flex items-center gap-2 mb-2">' +
        '<span class="channel-chip ' + chipCls + '">' + esc(fu.channelLabel) + '</span>' +
        '<span class="text-[12px] text-[var(--muted-2)] font-semibold">' + esc(fu.time) + '</span>' +
        '<span class="text-[12px] text-[var(--muted-2)]">· ' + esc(fu.operator) + '</span></div>' +
        '<div class="text-[13px] text-[var(--text)] font-semibold leading-relaxed">' + esc(fu.summary) + '</div>' +
        '<div class="mt-2 text-[12px] text-[var(--muted-2)] space-y-0.5">' +
        (fu.conclusion ? '<div><span class="font-bold">结论：</span>' + esc(fu.conclusion) + '</div>' : '') +
        (fu.nextAction ? '<div><span class="font-bold">下一步：</span>' + esc(fu.nextAction) + '</div>' : '') +
        (fu.nextFollowUp ? '<div><span class="font-bold">下次跟进：</span>' + esc(fu.nextFollowUp) + '</div>' : '') +
        '</div></div>' +
        (sample.readonly ? '' :
          '<button class="btn-secondary px-2 py-1 text-[11px] flex-shrink-0 whitespace-nowrap" type="button" data-action="convert-task" title="一键转任务（demo-only）">' +
          '<svg class="w-3 h-3 mr-0.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>转任务</button>') +
        '</div></div></div>';
    });
    timelineEl.innerHTML = html;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab 3 — Conversion                                                 */
  /* ------------------------------------------------------------------ */

  function renderConversion(sample) {
    var conv = sample.conversion || {};

    var noMatch   = $('dedupNoMatch');
    var hitPanel  = $('dedupHitPanel');

    if (conv.dedupResult) {
      if (noMatch)  noMatch.classList.add('hidden');
      if (hitPanel) {
        hitPanel.classList.remove('hidden');
        setText('dedupHitMessage', conv.dedupResult.message);
        var mr = conv.dedupResult.matchedRecord || {};
        setText('dedupMatchName', mr.name || mr.id || '—');
        var meta = [];
        if (mr.id) meta.push(mr.id);
        if (mr.phone) meta.push(mr.phone);
        if (mr.email) meta.push(mr.email);
        if (mr.group) meta.push(mr.group);
        if (mr.statusLabel) meta.push(mr.statusLabel);
        if (mr.summary) meta.push(mr.summary);
        setText('dedupMatchMeta', meta.join(' · '));

        setText('dedupHitTitle', conv.dedupResult.type === 'lead'
          ? '检测到重复线索（电话匹配）'
          : '检测到重复客户（邮箱匹配）');
      }
    } else {
      if (noMatch)  noMatch.classList.remove('hidden');
      if (hitPanel) hitPanel.classList.add('hidden');
    }

    var convertedRecords = $('convertedRecords');
    var cusCard = $('convertedCustomerCard');
    var caseCard = $('convertedCaseCard');
    var historyWrap = $('conversionHistory');

    var hasConverted = conv.convertedCustomer || conv.convertedCase;

    if (convertedRecords) convertedRecords.classList.toggle('hidden', !hasConverted);

    if (cusCard) {
      if (conv.convertedCustomer) {
        cusCard.classList.remove('hidden');
        setText('convertedCusName', conv.convertedCustomer.name + ' (' + conv.convertedCustomer.id + ')');
        setText('convertedCusMeta', '归属 ' + conv.convertedCustomer.group + ' · 转化于 ' + conv.convertedCustomer.convertedAt + ' · ' + conv.convertedCustomer.convertedBy);
      } else {
        cusCard.classList.add('hidden');
      }
    }

    if (caseCard) {
      if (conv.convertedCase) {
        caseCard.classList.remove('hidden');
        setText('convertedCaseName', conv.convertedCase.title + ' (' + conv.convertedCase.id + ')');
        setText('convertedCaseMeta', conv.convertedCase.type + ' · 归属 ' + conv.convertedCase.group + ' · 转化于 ' + conv.convertedCase.convertedAt + ' · ' + conv.convertedCase.convertedBy);
      } else {
        caseCard.classList.add('hidden');
      }
    }

    if (historyWrap) {
      var conversions = conv.conversions || [];
      if (conversions.length > 0) {
        historyWrap.classList.remove('hidden');
        var listEl = $('conversionHistoryList');
        if (listEl) {
          var hhtml = '';
          conversions.forEach(function (c) {
            hhtml += '<div class="flex items-center gap-3 text-[13px] py-2 border-b border-[var(--border)] last:border-0">' +
              '<span class="chip text-[11px]">' + (c.type === 'customer' ? '客户' : '案件') + '</span>' +
              '<span class="font-semibold text-[var(--text)]">' + esc(c.label) + '</span>' +
              '<span class="text-[var(--muted-2)] text-[12px] ml-auto">' + esc(c.time) + ' · ' + esc(c.operator) + '</span>' +
              '</div>';
          });
          listEl.innerHTML = hhtml;
        }
      } else {
        historyWrap.classList.add('hidden');
      }
    }

    var actionsEl = $('conversionActions');
    if (actionsEl) {
      actionsEl.classList.toggle('hidden', !!sample.readonly);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Tab 4 — Log                                                        */
  /* ------------------------------------------------------------------ */

  var LOG_TYPE_LABEL = { status: '状态变更', owner: '人员变更', group: 'Group 变更' };
  var LOG_TYPE_CHIP  = { status: 'bg-sky-100 text-sky-700', owner: 'bg-emerald-100 text-emerald-700', group: 'bg-violet-100 text-violet-700' };
  var LOG_DOT_COLOR  = { status: 'bg-sky-500', owner: 'bg-emerald-500', group: 'bg-violet-500' };

  function renderLog(sample) {
    var list = sample.log || [];
    var el = $('logTimelineList');
    if (!el) return;

    var html = '';
    list.forEach(function (log) {
      var chipCls = log.chipClass || LOG_TYPE_CHIP[log.type] || '';
      var dotCls  = LOG_DOT_COLOR[log.type] || 'bg-gray-400';
      var label   = LOG_TYPE_LABEL[log.type] || log.type;

      html += '<div class="timeline-item" data-log-type="' + esc(log.type) + '">' +
        '<div class="timeline-dot ' + dotCls + '"></div>' +
        '<div class="flex flex-col gap-1">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
        '<span class="log-type-chip ' + chipCls + '">' + esc(label) + '</span>' +
        '<span class="text-[12px] text-[var(--muted-2)] font-semibold">' + esc(log.time) + '</span>' +
        '<span class="text-[12px] text-[var(--muted-2)]">· ' + esc(log.operator) + '</span></div>' +
        '<div class="text-[13px] text-[var(--text)] font-semibold">' +
        '<span class="text-[var(--muted-2)]">' + esc(log.fromValue) + '</span>' +
        '<svg class="w-3 h-3 inline mx-1 text-[var(--muted-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>' +
        '<span>' + esc(log.toValue) + '</span></div></div></div>';
    });
    el.innerHTML = html;

    $$('[data-log-cat]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-log-cat') === 'all');
      btn.setAttribute('aria-pressed', btn.getAttribute('data-log-cat') === 'all' ? 'true' : 'false');
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Log category filter                                                */
  /* ------------------------------------------------------------------ */

  $$('[data-log-cat]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-log-cat');

      $$('[data-log-cat]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });

      var items = $$('#logTimelineList .timeline-item');
      items.forEach(function (item) {
        if (cat === 'all') {
          item.style.display = '';
        } else {
          item.style.display = item.getAttribute('data-log-type') === cat ? '' : 'none';
        }
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Sample switcher                                                    */
  /* ------------------------------------------------------------------ */

  if (sampleSelect) {
    sampleSelect.addEventListener('change', function () {
      renderSample(sampleSelect.value);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Action buttons (demo-only)                                         */
  /* ------------------------------------------------------------------ */

  if (btnEditInfo) {
    btnEditInfo.addEventListener('click', function () {
      showToast(CFG.DETAIL_TOASTS.infoUpdated.title, CFG.DETAIL_TOASTS.infoUpdated.desc);
    });
  }

  var btnEditInfoTab = $('btnEditInfoTab');
  if (btnEditInfoTab) {
    btnEditInfoTab.addEventListener('click', function () {
      showToast(CFG.DETAIL_TOASTS.infoUpdated.title, CFG.DETAIL_TOASTS.infoUpdated.desc);
    });
  }

  if (btnChangeStatus) {
    btnChangeStatus.addEventListener('click', function () {
      showToast(CFG.DETAIL_TOASTS.statusChanged.title, '已从当前状态更新（demo-only）');
    });
  }

  if (btnMarkLost) {
    btnMarkLost.addEventListener('click', function () {
      showToast(CFG.DETAIL_TOASTS.markedLost.title, CFG.DETAIL_TOASTS.markedLost.desc);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Conversion modals (demo-only)                                      */
  /* ------------------------------------------------------------------ */

  function prefillConvertCustomerModal() {
    var sample = CFG.DETAIL_SAMPLES[currentSampleKey];
    if (!sample) return;
    var info = sample.info || {};
    var el;
    el = $('modalCusName');  if (el) el.value = info.name || '';
    el = $('modalCusPhone'); if (el) el.value = info.phone || '';
    el = $('modalCusEmail'); if (el) el.value = info.email || '';
    el = $('modalCusGroup'); if (el) el.value = sample.groupLabel || '';
  }

  function prefillConvertCaseModal() {
    var sample = CFG.DETAIL_SAMPLES[currentSampleKey];
    if (!sample) return;
    var info = sample.info || {};
    var el;
    el = $('modalCaseApplicant'); if (el) el.value = info.name || '';
    el = $('modalCaseType');      if (el) el.value = info.businessType || '';
    el = $('modalCaseOwner');     if (el) el.value = sample.ownerLabel || '';
    el = $('modalCaseGroup');     if (el) el.value = sample.groupLabel || '';
  }

  if (btnConvertCustomer) {
    btnConvertCustomer.addEventListener('click', function () {
      var sample = CFG.DETAIL_SAMPLES[currentSampleKey];
      var matrix = CFG.HEADER_BUTTONS[sample ? sample.buttons : 'normal'] || {};
      if (matrix.convertCustomer === 'view-customer') {
        window.location.href = '../customers/index.html';
        return;
      }
      prefillConvertCustomerModal();
      openModal('convertCustomerModal');
    });
  }

  var btnConvertCustomerTab = $('btnConvertCustomerTab');
  if (btnConvertCustomerTab) {
    btnConvertCustomerTab.addEventListener('click', function () {
      prefillConvertCustomerModal();
      openModal('convertCustomerModal');
    });
  }

  if (btnConvertCase) {
    btnConvertCase.addEventListener('click', function () {
      var sample = CFG.DETAIL_SAMPLES[currentSampleKey];
      var matrix = CFG.HEADER_BUTTONS[sample ? sample.buttons : 'normal'] || {};
      if (matrix.convertCase === 'view-case') {
        window.location.href = '../case/detail.html';
        return;
      }
      prefillConvertCaseModal();
      openModal('convertCaseModal');
    });
  }

  var btnConvertCaseTab = $('btnConvertCaseTab');
  if (btnConvertCaseTab) {
    btnConvertCaseTab.addEventListener('click', function () {
      prefillConvertCaseModal();
      openModal('convertCaseModal');
    });
  }

  var confirmConvertCustomer = $('confirmConvertCustomer');
  if (confirmConvertCustomer) {
    confirmConvertCustomer.addEventListener('click', function () {
      closeModal('convertCustomerModal');
      var sample = CFG.DETAIL_SAMPLES[currentSampleKey];
      var name = sample ? sample.name : '';
      showToast(CFG.DETAIL_TOASTS.convertCustomer.title, CFG.DETAIL_TOASTS.convertCustomer.desc.replace('{name}', name));
    });
  }

  var confirmConvertCase = $('confirmConvertCase');
  if (confirmConvertCase) {
    confirmConvertCase.addEventListener('click', function () {
      closeModal('convertCaseModal');
      var sample = CFG.DETAIL_SAMPLES[currentSampleKey];
      var title = sample ? sample.name + ' ' + (sample.info ? sample.info.businessType : '') : '';
      showToast(CFG.DETAIL_TOASTS.convertCase.title, CFG.DETAIL_TOASTS.convertCase.desc.replace('{title}', title));
    });
  }

  $$('[data-modal-close]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeModal(btn.getAttribute('data-modal-close'));
    });
  });

  $$('.modal-backdrop').forEach(function (backdrop) {
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) backdrop.classList.remove('show');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Warning banner action                                              */
  /* ------------------------------------------------------------------ */

  var warningConvertBtn = $('warningConvertBtn');
  if (warningConvertBtn) {
    warningConvertBtn.addEventListener('click', function () {
      activateTab('conversion');
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Follow-up form submit (demo-only)                                  */
  /* ------------------------------------------------------------------ */

  var submitFollowup = $('submitFollowup');
  if (submitFollowup) {
    submitFollowup.addEventListener('click', function () {
      var channelEl = $('fuChannel');
      var summaryEl = $('fuSummary');
      if (!channelEl || !channelEl.value) {
        showToast('请选择渠道', '');
        return;
      }
      if (!summaryEl || !summaryEl.value.trim()) {
        showToast('请填写跟进摘要', '');
        return;
      }

      var ch = CFG.FOLLOWUP_CHANNELS.filter(function (c) { return c.value === channelEl.value; })[0];
      var chLabel = ch ? ch.label : channelEl.value;
      showToast(
        CFG.DETAIL_TOASTS.followUpAdded.title,
        CFG.DETAIL_TOASTS.followUpAdded.desc.replace('{channel}', chLabel)
      );

      channelEl.value = '';
      summaryEl.value = '';
      var c = $('fuConclusion'); if (c) c.value = '';
      var n = $('fuNextAction'); if (n) n.value = '';
      var d = $('fuNextFollowUp'); if (d) d.value = '';
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Convert-to-task buttons (delegated, demo-only)                     */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action="convert-task"]');
    if (btn) {
      showToast(CFG.DETAIL_TOASTS.taskCreated.title, CFG.DETAIL_TOASTS.taskCreated.desc);
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Dedup buttons (demo-only)                                          */
  /* ------------------------------------------------------------------ */

  var dedupContinue = $('dedupContinueBtn');
  if (dedupContinue) {
    dedupContinue.addEventListener('click', function () {
      showToast('已确认继续创建（示例）', '去重确认操作完成');
    });
  }

  var dedupView = $('dedupViewBtn');
  if (dedupView) {
    dedupView.addEventListener('click', function () {
      showToast('查看已有记录（示例）', '将跳转至匹配记录详情页');
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Init                                                               */
  /* ------------------------------------------------------------------ */

  renderSample('following');

})();
