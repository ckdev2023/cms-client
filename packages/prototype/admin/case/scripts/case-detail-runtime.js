/**
 * Case Detail — Runtime foundation.
 *
 * DOM helpers, CSS mappers, toast, session/URL context,
 * liveState lifecycle, sync utilities.
 *
 * Loaded first among the split scripts. All public symbols are
 * exposed on window.CaseDetailPage for cross-file access.
 *
 * External config consumed (read-only, from data/case-detail-config.js):
 *   BILLING_STATUS, CASE_ID_MAP, DETAIL_SAMPLES, DETAIL_STAGES, POST_APPROVAL_STAGES
 */

(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  /* ================================================================== */
  /*  DOM HELPERS                                                        */
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

  /* ================================================================== */
  /*  CSS / BADGE HELPERS                                                */
  /* ================================================================== */

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
  /*  SESSION STORAGE & URL CONTEXT                                      */
  /* ================================================================== */

  var CASE_DETAIL_CONTEXT_KEY = 'prototype.caseDetailContext';
  var CASE_LIST_DRAFTS_KEY = 'prototype.caseListDrafts';
  var CASE_DETAIL_STATES_KEY = 'prototype.caseDetailStates';

  function readSessionJson(key) {
    try { var r = window.sessionStorage.getItem(key); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }

  function writeSessionJson(key, val) {
    try { window.sessionStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { /* noop */ }
  }

  function resolveUrlCaseContext() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return null; }
    var caseId = params.get('caseId');
    if (!caseId) return null;

    if (typeof CASE_ID_MAP !== 'undefined' && CASE_ID_MAP[caseId]) {
      var m = CASE_ID_MAP[caseId];
      return {
        id: m.id,
        name: m.title,
        applicant: m.client,
        ownerId: m.owner,
        agency: m.agency,
        stageId: m.stageCode,
        stageLabel: m.stage,
        stageMeta: m.stageMeta,
        statusBadge: m.statusBadge,
        detailSample: m.sampleKey,
      };
    }

    var ctx = readSessionJson(CASE_DETAIL_CONTEXT_KEY);
    if (ctx && ctx.id === caseId) return ctx;

    var drafts = readSessionJson(CASE_LIST_DRAFTS_KEY);
    if (Array.isArray(drafts)) {
      for (var i = 0; i < drafts.length; i++) {
        if (drafts[i].id === caseId) return drafts[i];
      }
    }
    return { id: caseId, detailSample: 'work' };
  }

  /* ================================================================== */
  /*  LIVE STATE — mutable runtime state for action-driven changes       */
  /* ================================================================== */

  var liveState = {};

  /**
   * Deep-copy sample data into liveState.
   * Uses clear-and-populate (not reassignment) so that all external
   * references to the liveState object stay valid across resets.
   *
   * @param {string} sampleKey - key into DETAIL_SAMPLES
   * @param {boolean} [forceClean] - skip persisted state restore and clear stored snapshot
   */
  function initLiveState(sampleKey, forceClean) {
    var s = DETAIL_SAMPLES[sampleKey];
    var k;
    for (k in liveState) {
      if (liveState.hasOwnProperty(k)) delete liveState[k];
    }
    if (!s) return;

    if (!forceClean) {
      var states = readSessionJson(CASE_DETAIL_STATES_KEY);
      var persisted = states && states[s.id];
      if (persisted && persisted.sampleKey === sampleKey) {
        for (k in persisted) {
          if (!persisted.hasOwnProperty(k)) continue;
          var pv = persisted[k];
          liveState[k] = (pv !== null && typeof pv === 'object')
            ? JSON.parse(JSON.stringify(pv))
            : pv;
        }
        liveState._restoredFromStore = true;
        return;
      }
    } else {
      clearPersistedState(s.id);
    }

    liveState.sampleKey = sampleKey;
    liveState.id = s.id;
    liveState.title = s.title;
    liveState.stageCode = s.stageCode;
    liveState.stage = s.stage;
    liveState.stageMeta = s.stageMeta;
    liveState.statusBadge = s.statusBadge;
    liveState.progressPercent = s.progressPercent;
    liveState.progressCount = s.progressCount;
    liveState.billing = JSON.parse(JSON.stringify(s.billing || {}));
    liveState.logEntries = JSON.parse(JSON.stringify(s.logEntries || []));
    liveState.riskConfirmationRecord = s.riskConfirmationRecord
      ? JSON.parse(JSON.stringify(s.riskConfirmationRecord))
      : null;
    liveState.submissionPackages = JSON.parse(JSON.stringify(s.submissionPackages || []));
    liveState.validation = JSON.parse(JSON.stringify(s.validation || {}));
    liveState.readonly = !!s.readonly;
    liveState.isMgmtCase = !!s.isMgmtCase;
    liveState.postApprovalStage = s.postApprovalStage || null;
    liveState.resultOutcome = s.resultOutcome || null;
    liveState.applicationFlowType = s.applicationFlowType || null;
    liveState.finalPaymentPaid = !!(s.finalPaymentPaid);
    liveState.riskConfirmedForCoeSend = !!(s.riskConfirmedForCoeSend);
    liveState.supplementCount = s.supplementCount || 0;
    liveState.supplementOpen = !!(s.supplementOpen);
    liveState.supplementDeadline = s.supplementDeadline || null;
    liveState.caseType = s.caseType || '';
    liveState.residencePeriodRecorded = !!(s.residencePeriod && s.residencePeriod.recorded);
    liveState.renewalRemindersCreated = !!(s.renewalReminders && s.renewalReminders.length && s.renewalReminders[0].status === 'scheduled');
    liveState.renewalRemindersFailed = false;
    liveState.coeIssuedAt = s.coeIssuedAt || null;
    liveState.coeExpiryDate = s.coeExpiryDate || null;
    liveState.coeSentAt = s.coeSentAt || null;
    liveState.overseasVisaStartAt = s.overseasVisaStartAt || null;
    liveState.entryConfirmedAt = s.entryConfirmedAt || null;
    liveState.immigrationResult = s.immigrationResult
      ? JSON.parse(JSON.stringify(s.immigrationResult))
      : null;
    liveState.residencePeriod = s.residencePeriod
      ? JSON.parse(JSON.stringify(s.residencePeriod))
      : null;
    liveState.renewalReminders = s.renewalReminders
      ? JSON.parse(JSON.stringify(s.renewalReminders))
      : [];
    liveState.tasks = JSON.parse(JSON.stringify(s.tasks || []));
    liveState.correctionPackage = s.correctionPackage
      ? JSON.parse(JSON.stringify(s.correctionPackage))
      : null;

    var _norm = ns.normalizeDocStatus || function (v) { return v; };
    if (s.documents) {
      s.documents.forEach(function (group) {
        group.items.forEach(function (item) {
          item.status = _norm(item.status);
        });
      });
    }
  }

  function applyCaseOverrides(ctx) {
    if (!ctx) return;
    if (ctx.id) {
      liveState.id = ctx.id;
      setText('breadcrumbCaseId', ctx.id);
    }
    if (ctx.name) {
      liveState.title = ctx.name;
      setText('caseTitle', ctx.name);
    }
    if (!liveState._restoredFromStore && ctx.stageId && DETAIL_STAGES[ctx.stageId]) {
      var st = DETAIL_STAGES[ctx.stageId];
      liveState.stageCode = ctx.stageId;
      liveState.stage = st.label;
      liveState.statusBadge = ctx.statusBadge || st.badge;
      setText('caseStatusText', ctx.stageLabel || st.label);
      setText('overviewStageText', ctx.stageLabel || st.label);
      setText('overviewStageMeta', ctx.stageMeta || (st.code + ' ' + st.label));
      var badge = document.getElementById('caseStatusBadge');
      if (badge) badge.className = 'status-badge text-[13px] ' + (ctx.statusBadge || st.badge);
    }
    if (ctx.applicant) setText('caseClientName', ctx.applicant);
    if (ctx.ownerId) setText('caseOwnerName', ctx.ownerId);
    if (ctx.agency) setText('caseAgencyName', ctx.agency);

    var chip = document.getElementById('caseContextChip');
    if (chip) {
      chip.textContent = '来自列表 · ' + esc(ctx.id);
      chip.classList.remove('hidden');
    }
  }

  function syncToListStore() {
    var stageLabel = liveState.stageCode + ' ' + (DETAIL_STAGES[liveState.stageCode] || {}).label;
    var postLabel = null;
    if (liveState.postApprovalStage && typeof POST_APPROVAL_STAGES !== 'undefined') {
      var pas = POST_APPROVAL_STAGES[liveState.postApprovalStage];
      if (pas) postLabel = pas.label;
    }

    var patch = {
      stageId: liveState.stageCode,
      stageLabel: stageLabel,
      postApprovalStage: liveState.postApprovalStage || null,
      postApprovalLabel: postLabel,
      resultOutcome: liveState.resultOutcome || null,
      supplementCount: liveState.supplementCount || 0,
      supplementOpen: !!liveState.supplementOpen,
      supplementDeadline: liveState.supplementDeadline || null,
    };

    var ctx = readSessionJson(CASE_DETAIL_CONTEXT_KEY);
    if (ctx && ctx.id === liveState.id) {
      ctx.stageId = patch.stageId;
      ctx.stageLabel = patch.stageLabel;
      ctx.postApprovalStage = patch.postApprovalStage;
      ctx.postApprovalLabel = patch.postApprovalLabel;
      ctx.resultOutcome = patch.resultOutcome;
      writeSessionJson(CASE_DETAIL_CONTEXT_KEY, ctx);
    }

    var drafts = readSessionJson(CASE_LIST_DRAFTS_KEY);
    var patchedDrafts = false;
    if (Array.isArray(drafts)) {
      for (var i = 0; i < drafts.length; i++) {
        if (drafts[i].id === liveState.id) {
          drafts[i].stageId = patch.stageId;
          drafts[i].stageLabel = patch.stageLabel;
          drafts[i].postApprovalStage = patch.postApprovalStage;
          drafts[i].postApprovalLabel = patch.postApprovalLabel;
          drafts[i].resultOutcome = patch.resultOutcome;
          writeSessionJson(CASE_LIST_DRAFTS_KEY, drafts);
          patchedDrafts = true;
          break;
        }
      }
    }

    if (!patchedDrafts) {
      var overrides = readSessionJson('prototype.caseListOverrides') || {};
      overrides[liveState.id] = patch;
      writeSessionJson('prototype.caseListOverrides', overrides);
    }

    persistDetailState();
  }

  /* ================================================================== */
  /*  TOAST                                                              */
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
  /*  COPY HELPER                                                        */
  /* ================================================================== */

  function bindCopyBtn(btnId, sourceId) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var el = document.getElementById(sourceId);
      var text = el ? (el.value || el.textContent || '').trim() : '';
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showToast('已复制', text.slice(0, 60) + (text.length > 60 ? '…' : ''));
        });
      } else {
        var tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
        showToast('已复制', text.slice(0, 60) + (text.length > 60 ? '…' : ''));
      }
    });
  }

  /* ================================================================== */
  /*  MESSAGE STRUCTURED FIELDS VISIBILITY                               */
  /* ================================================================== */

  function updateMsgStructuredVisibility() {
    var sel = document.getElementById('msgChannelSelect');
    var fields = document.getElementById('msgStructuredFields');
    if (!sel || !fields) return;
    var val = sel.value;
    if (val === 'phone' || val === 'meeting') {
      fields.style.setProperty('display', 'grid', 'important');
    } else {
      fields.style.setProperty('display', 'none', 'important');
    }
  }

  /* ================================================================== */
  /*  DETAIL STATE PERSISTENCE                                           */
  /* ================================================================== */

  /**
   * Persist the full liveState snapshot to sessionStorage keyed by case id.
   * Called automatically from syncToListStore after every action.
   */
  function persistDetailState() {
    if (!liveState.id) return;
    var states = readSessionJson(CASE_DETAIL_STATES_KEY) || {};
    var snapshot = {};
    for (var k in liveState) {
      if (!liveState.hasOwnProperty(k) || k === '_restoredFromStore') continue;
      var v = liveState[k];
      snapshot[k] = (v !== null && typeof v === 'object')
        ? JSON.parse(JSON.stringify(v))
        : v;
    }
    states[liveState.id] = snapshot;
    writeSessionJson(CASE_DETAIL_STATES_KEY, states);
  }

  /**
   * Remove persisted detail state for a given case id.
   * @param {string} caseId
   */
  function clearPersistedState(caseId) {
    if (!caseId) return;
    var states = readSessionJson(CASE_DETAIL_STATES_KEY);
    if (!states || !states[caseId]) return;
    delete states[caseId];
    writeSessionJson(CASE_DETAIL_STATES_KEY, states);
  }

  /**
   * Re-render all dynamic UI sections from liveState.
   * Call after restoring persisted state so the page reflects the
   * stored snapshot instead of the static DETAIL_SAMPLES defaults.
   *
   * Safe to call after all renderer scripts have loaded (i.e. from
   * case-detail-page.js which is the last bootstrap script).
   */
  function reapplyFromLiveState() {
    var ls = liveState;

    setText('caseStatusText', ls.stage);
    setText('overviewStageText', ls.stage);
    setText('overviewStageMeta', ls.stageMeta);

    var badge = document.getElementById('caseStatusBadge');
    if (badge) badge.className = 'status-badge text-[13px] ' + (ls.statusBadge || '');

    var mgmtBadge = document.getElementById('mgmtPostApprovalBadge');
    if (mgmtBadge) {
      if (ls.postApprovalStage && typeof POST_APPROVAL_STAGES !== 'undefined') {
        var pas = POST_APPROVAL_STAGES[ls.postApprovalStage];
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

    if (ls.billing) {
      var outstandingNum = parseInt(String(ls.billing.outstanding || '0').replace(/[^0-9]/g, ''), 10) || 0;
      setText('overviewBillingAmount', ls.billing.outstanding);
      setText('overviewBillingMeta', outstandingNum > 0 ? '未收 ' + ls.billing.outstanding : '已结清');
    }

    if (ns.applyLogEntries) ns.applyLogEntries(ls.logEntries);
    if (ns.applyBillingSummary) ns.applyBillingSummary(ls.billing);
    if (ns.applyBillingTable) ns.applyBillingTable(ls.billing);
    if (ns.applyTasks) ns.applyTasks(ls.tasks);
    if (ns.applySubmissionPackages) ns.applySubmissionPackages(ls.submissionPackages);
    if (ns.applyCorrectionPackage) ns.applyCorrectionPackage(ls.correctionPackage || null);
    if (ns.applyRiskConfirmationRecord) ns.applyRiskConfirmationRecord(ls.riskConfirmationRecord);
    if (ns.applyGateStatusSummary) ns.applyGateStatusSummary(ls);
    if (ns.applyReadonly) ns.applyReadonly(ls.readonly);
    if (ns.applyImmigrationResultContent) ns.applyImmigrationResultContent();
    if (ls.postApprovalStage === 'entry_success' && ns.applyResidencePeriodContent) {
      ns.applyResidencePeriodContent();
    }
  }

  /* ================================================================== */
  /*  DOCUMENT STATUS NORMALIZATION (COMPAT BRIDGE)                      */
  /*  Legacy sample data uses keys like done/idle/submitted/reviewed.    */
  /*  This map aligns them with the unified P0 document status enum     */
  /*  defined in documents-config.js (DOCUMENT_STATUS_OPTIONS).          */
  /* ================================================================== */

  var COMPAT_STATUS_MAP = {
    done:       'approved',
    idle:       'not_sent',
    submitted:  'uploaded_reviewing',
    reviewed:   'approved',
    rejected:   'revision_required',
    pending:    'waiting_upload',
    missing:    'not_sent',
    not_sent:           'not_sent',
    waiting_upload:     'waiting_upload',
    uploaded_reviewing: 'uploaded_reviewing',
    approved:           'approved',
    revision_required:  'revision_required',
    expired:            'expired',
    waived:             'waived',
  };

  var UNIFIED_STATUS_LABELS = {
    not_sent:           '未発出',
    waiting_upload:     '待提交',
    uploaded_reviewing: '已提交待审核',
    approved:           '通过',
    revision_required:  '退回补正',
    expired:            '过期',
    waived:             '无需提供',
  };

  /**
   * Normalize a raw document status code through the compat layer.
   * @param {string} raw - raw status from demo data
   * @returns {string} P0 authoritative status code
   */
  function normalizeDocStatus(raw) {
    if (!raw) return 'not_sent';
    return COMPAT_STATUS_MAP[raw] || raw;
  }

  /**
   * Get unified label for a document status.
   * @param {string} raw - raw or unified status code
   * @returns {string} display label
   */
  function docStatusLabel(raw) {
    var unified = normalizeDocStatus(raw);
    return UNIFIED_STATUS_LABELS[unified] || unified;
  }

  /* ================================================================== */
  /*  MGMT CASE CHECK                                                    */
  /* ================================================================== */

  function isMgmtCase() {
    var s = liveState;
    return !!(s && (s.isMgmtCase ||
      (s.caseType && s.caseType.indexOf('経営') >= 0) ||
      (s.sampleKey && s.sampleKey.indexOf('management') === 0)));
  }

  /* ================================================================== */
  /*  NAMESPACE EXPORTS                                                  */
  /* ================================================================== */

  ns.setText = setText;
  ns.setHtml = setHtml;
  ns.esc = esc;
  ns.avatarBg = avatarBg;
  ns.avatarTextColor = avatarTextColor;
  ns.severityColor = severityColor;
  ns.severityBgClass = severityBgClass;
  ns.chipClass = chipClass;
  ns.billingBadge = billingBadge;
  ns.CASE_DETAIL_CONTEXT_KEY = CASE_DETAIL_CONTEXT_KEY;
  ns.CASE_LIST_DRAFTS_KEY = CASE_LIST_DRAFTS_KEY;
  ns.readSessionJson = readSessionJson;
  ns.writeSessionJson = writeSessionJson;
  ns.resolveUrlCaseContext = resolveUrlCaseContext;
  ns.liveState = liveState;
  ns.initLiveState = initLiveState;
  ns.applyCaseOverrides = applyCaseOverrides;
  ns.syncToListStore = syncToListStore;
  ns.showToast = showToast;
  ns.bindCopyBtn = bindCopyBtn;
  ns.updateMsgStructuredVisibility = updateMsgStructuredVisibility;
  ns.isMgmtCase = isMgmtCase;
  ns.persistDetailState = persistDetailState;
  ns.clearPersistedState = clearPersistedState;
  ns.reapplyFromLiveState = reapplyFromLiveState;
  ns.CASE_DETAIL_STATES_KEY = CASE_DETAIL_STATES_KEY;
  ns.normalizeDocStatus = normalizeDocStatus;
  ns.docStatusLabel = docStatusLabel;
  ns.COMPAT_STATUS_MAP = COMPAT_STATUS_MAP;
})();
