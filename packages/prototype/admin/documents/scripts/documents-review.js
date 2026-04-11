var DocumentsReview = (function () {
  'use strict';

  var ns = {};
  var _activeDoc = null;
  var _bulkWaiveIds = null;
  var DOCUMENTS_STATE_KEY = 'prototype.documentsDemoState';

  function readJson(key) {
    try {
      var raw = window.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_err) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (_err) {
      /* noop */
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function rebuildDerivedCollections(DATA) {
    if (!DATA || !Array.isArray(DATA.DEMO_DOCUMENT_ROWS)) return;

    var reviewRecords = [];
    var reminderRecords = [];

    DATA.DEMO_DOCUMENT_ROWS.forEach(function (doc) {
      if (Array.isArray(doc.reviewRecords)) {
        doc.reviewRecords.forEach(function (record) {
          reviewRecords.push({
            docId: doc.id,
            action: record.action,
            actor: record.actor,
            timestamp: record.timestamp,
            note: record.note || '',
          });
        });
      }
      if (Array.isArray(doc.reminderRecords)) {
        doc.reminderRecords.forEach(function (record) {
          reminderRecords.push({
            docId: doc.id,
            sentAt: record.sentAt,
            sentBy: record.sentBy,
            method: record.method,
            target: record.target,
          });
        });
      }
    });

    reviewRecords.sort(function (a, b) {
      return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
    });
    reminderRecords.sort(function (a, b) {
      return String(b.sentAt || '').localeCompare(String(a.sentAt || ''));
    });

    DATA.DEMO_REVIEW_RECORDS = reviewRecords;
    DATA.DEMO_REMINDER_RECORDS = reminderRecords;
  }

  function restorePersistedState(DATA) {
    var persisted = readJson(DOCUMENTS_STATE_KEY);
    if (!persisted || !Array.isArray(persisted.rows)) return false;

    DATA.DEMO_DOCUMENT_ROWS = clone(persisted.rows);
    rebuildDerivedCollections(DATA);
    return true;
  }

  function persistState(DATA) {
    if (!DATA || !Array.isArray(DATA.DEMO_DOCUMENT_ROWS)) return;
    rebuildDerivedCollections(DATA);
    writeJson(DOCUMENTS_STATE_KEY, {
      rows: clone(DATA.DEMO_DOCUMENT_ROWS),
    });
  }

  function init() {
    var DATA = window.DocumentsDemoData;

    /* ---- DOM refs ---- */
    var approveModal = document.getElementById('approveModal');
    var approveDocName = document.getElementById('approveDocName');
    var approveConfirmBtn = document.getElementById('approveConfirmBtn');

    var rejectModal = document.getElementById('rejectModal');
    var rejectDocName = document.getElementById('rejectDocName');
    var rejectReasonText = document.getElementById('rejectReasonText');
    var rejectConfirmBtn = document.getElementById('rejectConfirmBtn');

    var waiveModal = document.getElementById('waiveModal');
    var waiveModalTitle = document.getElementById('waiveModalTitle');
    var waiveDocLabel = document.getElementById('waiveDocLabel');
    var waiveReasonSelect = document.getElementById('waiveReasonSelect');
    var waiveNoteWrap = document.getElementById('waiveNoteWrap');
    var waiveReasonNote = document.getElementById('waiveReasonNote');
    var waiveConfirmBtn = document.getElementById('waiveConfirmBtn');

    var referenceModal = document.getElementById('referenceVersionModal');
    var referenceDocLabel = document.getElementById('referenceDocLabel');
    var referenceCandidateList = document.getElementById('referenceCandidateList');
    var referenceCandidateEmpty = document.getElementById('referenceCandidateEmpty');
    var referenceConfirmBtn = document.getElementById('referenceConfirmBtn');

    function toast(key, replacements) {
      var fn = window.__docsPage && window.__docsPage.showToastPreset;
      if (fn) fn(key, replacements);
    }

    function refreshPage() {
      if (window.DocumentsPage && window.DocumentsPage.refreshTable) {
        window.DocumentsPage.refreshTable();
      }
    }

    if (restorePersistedState(DATA)) {
      refreshPage();
    }

    /* ================================================================ */
    /*  Approve                                                         */
    /* ================================================================ */

    ns.openApprove = function (doc) {
      _activeDoc = doc;
      if (approveDocName) approveDocName.textContent = doc.docName;
      showModal(approveModal);
    };

    if (approveConfirmBtn) {
      approveConfirmBtn.addEventListener('click', function () {
        if (_activeDoc) {
          _activeDoc.status = 'approved';
          if (!_activeDoc.reviewRecords) _activeDoc.reviewRecords = [];
          _activeDoc.reviewRecords.unshift({
            action: 'approved',
            actor: 'Admin',
            timestamp: new Date().toISOString(),
            note: '',
          });
          persistState(DATA);
          toast('approve', { docName: _activeDoc.docName });
          refreshPage();
        }
        hideModal(approveModal);
        _activeDoc = null;
      });
    }

    bindClose('close-approve-modal', approveModal);

    /* ================================================================ */
    /*  Reject                                                          */
    /* ================================================================ */

    ns.openReject = function (doc) {
      _activeDoc = doc;
      if (rejectDocName) rejectDocName.textContent = doc.docName;
      if (rejectReasonText) rejectReasonText.value = '';
      if (rejectConfirmBtn) rejectConfirmBtn.disabled = true;
      showModal(rejectModal);
    };

    if (rejectReasonText) {
      rejectReasonText.addEventListener('input', function () {
        if (rejectConfirmBtn) rejectConfirmBtn.disabled = !rejectReasonText.value.trim();
      });
    }

    if (rejectConfirmBtn) {
      rejectConfirmBtn.addEventListener('click', function () {
        if (_activeDoc) {
          var reason = rejectReasonText ? rejectReasonText.value.trim() : '';
          _activeDoc.status = 'revision_required';
          _activeDoc.rejectionReason = reason;
          if (!_activeDoc.reviewRecords) _activeDoc.reviewRecords = [];
          _activeDoc.reviewRecords.unshift({
            action: 'rejected',
            actor: 'Admin',
            timestamp: new Date().toISOString(),
            note: reason,
          });
          persistState(DATA);
          toast('reject', { docName: _activeDoc.docName });
          refreshPage();
        }
        hideModal(rejectModal);
        _activeDoc = null;
      });
    }

    bindClose('close-reject-modal', rejectModal);

    /* ================================================================ */
    /*  Waive (single + bulk)                                           */
    /* ================================================================ */

    ns.openWaive = function (doc) {
      _activeDoc = doc;
      _bulkWaiveIds = null;
      if (waiveModalTitle) waiveModalTitle.textContent = '标记无需提供';
      if (waiveDocLabel) waiveDocLabel.textContent = '将「' + doc.docName + '」标记为无需提供，从完成率分母中剔除。';
      resetWaiveForm();
      showModal(waiveModal);
    };

    ns.openBulkWaive = function (ids) {
      _activeDoc = null;
      _bulkWaiveIds = ids;
      if (waiveModalTitle) waiveModalTitle.textContent = '批量标记无需提供';
      if (waiveDocLabel) waiveDocLabel.textContent = '将选中的 ' + ids.length + ' 项资料标记为无需提供，从完成率分母中剔除。';
      resetWaiveForm();
      showModal(waiveModal);
    };

    function resetWaiveForm() {
      if (waiveReasonSelect) waiveReasonSelect.selectedIndex = 0;
      if (waiveReasonNote) waiveReasonNote.value = '';
      if (waiveNoteWrap) waiveNoteWrap.classList.add('hidden');
      if (waiveConfirmBtn) waiveConfirmBtn.disabled = true;
    }

    if (waiveReasonSelect) {
      waiveReasonSelect.addEventListener('change', function () {
        var needsNote = waiveReasonSelect.value === 'other';
        if (waiveNoteWrap) waiveNoteWrap.classList.toggle('hidden', !needsNote);
        updateWaiveEnabled();
      });
    }

    if (waiveReasonNote) {
      waiveReasonNote.addEventListener('input', updateWaiveEnabled);
    }

    function updateWaiveEnabled() {
      if (!waiveConfirmBtn) return;
      var val = waiveReasonSelect ? waiveReasonSelect.value : '';
      if (!val) { waiveConfirmBtn.disabled = true; return; }
      waiveConfirmBtn.disabled = val === 'other' && !(waiveReasonNote && waiveReasonNote.value.trim());
    }

    if (waiveConfirmBtn) {
      waiveConfirmBtn.addEventListener('click', function () {
        var reasonCode = waiveReasonSelect ? waiveReasonSelect.value : '';
        var noteText = (reasonCode === 'other' && waiveReasonNote) ? waiveReasonNote.value.trim() : '';
        var now = new Date().toISOString();

        if (_bulkWaiveIds) {
          var rows = DATA.DEMO_DOCUMENT_ROWS;
          _bulkWaiveIds.forEach(function (id) {
            var doc = rows.find(function (d) { return d.id === id; });
            if (doc) {
              doc.status = 'waived';
              doc.waiveReason = reasonCode;
              doc.waivedBy = 'Admin';
              doc.waivedAt = now.split('T')[0];
            }
          });
          persistState(DATA);
          toast('bulkWaive', { n: _bulkWaiveIds.length });
          if (window.DocumentsBulkActions) window.DocumentsBulkActions.clearSelection();
          refreshPage();
        } else if (_activeDoc) {
          _activeDoc.status = 'waived';
          _activeDoc.waiveReason = reasonCode;
          _activeDoc.waivedBy = 'Admin';
          _activeDoc.waivedAt = now.split('T')[0];
          persistState(DATA);
          toast('waive', { docName: _activeDoc.docName });
          refreshPage();
        }
        hideModal(waiveModal);
        _activeDoc = null;
        _bulkWaiveIds = null;
      });
    }

    bindClose('close-waive-modal', waiveModal);

    /* ================================================================ */
    /*  Reference version                                               */
    /* ================================================================ */

    ns.openReference = function (doc) {
      _activeDoc = doc;
      var CFG = window.DocumentsConfig;
      var candidates = DATA.DEMO_REFERENCE_CANDIDATES || [];

      if (referenceDocLabel) {
        referenceDocLabel.textContent = '为「' + doc.docName + '」选择其他案件里已审核通过、且仍在有效期内的同类资料。';
      }

      if (referenceCandidateList) {
        referenceCandidateList.innerHTML = '';
        if (candidates.length > 0) {
          candidates.forEach(function (c) {
            var nStatus = CFG.normalizeDocStatus(c.status);
            var statusLabel = CFG.STATUS_LABEL_MAP[nStatus] || nStatus;
            var statusBadge = CFG.STATUS_BADGE_MAP[nStatus] || '';
            var tagCls = statusBadge.replace('badge-', 'tag-');
            var label = document.createElement('label');
            label.className = 'block apple-card p-4 cursor-pointer hover:shadow-[var(--shadow-hover)] transition-shadow border-2 border-transparent has-[:checked]:border-[var(--primary)]';
            label.innerHTML =
              '<div class="flex items-start gap-3">' +
                '<input type="radio" name="referenceCandidate" value="' + c.id + '" class="mt-1 accent-[var(--primary)]" />' +
                '<div class="flex-1 min-w-0">' +
                  '<div class="flex items-center gap-2">' +
                    '<span class="text-sm font-semibold text-[var(--text)]">' + esc(c.sourceDocName) + '</span>' +
                    '<span class="tag ' + tagCls + ' text-[11px]">' + esc(statusLabel) + '</span>' +
                  '</div>' +
                  '<div class="text-[12px] text-[var(--muted-2)] mt-1">来源案件：' + esc(c.sourceCaseLabel) + '</div>' +
                  '<div class="flex items-center gap-4 text-[12px] text-[var(--muted-2)] mt-1">' +
                    '<span>版本：v' + c.version + '</span>' +
                    '<span>审核日期：' + (c.reviewedAt || '') + '</span>' +
                    '<span>有效期至：' + (c.expiryDate || '') + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>';
            referenceCandidateList.appendChild(label);
          });
          if (referenceCandidateEmpty) referenceCandidateEmpty.classList.add('hidden');
        } else {
          if (referenceCandidateEmpty) referenceCandidateEmpty.classList.remove('hidden');
        }
      }

      if (referenceConfirmBtn) referenceConfirmBtn.disabled = true;
      showModal(referenceModal);
    };

    if (referenceCandidateList) {
      referenceCandidateList.addEventListener('change', function (e) {
        if (e.target.name === 'referenceCandidate') {
          if (referenceConfirmBtn) referenceConfirmBtn.disabled = false;
        }
      });
    }

    if (referenceConfirmBtn) {
      referenceConfirmBtn.addEventListener('click', function () {
        var selected = referenceCandidateList
          ? referenceCandidateList.querySelector('input[name="referenceCandidate"]:checked')
          : null;
        if (!selected) return;
        var refId = selected.value;
        var candidate = (DATA.DEMO_REFERENCE_CANDIDATES || []).find(function (c) { return c.id === refId; });
        if (_activeDoc && candidate) {
          _activeDoc.status = 'uploaded_reviewing';
          _activeDoc.referenceSource = {
            caseNo: candidate.sourceCase,
            docName: candidate.sourceDocName,
            version: candidate.version,
          };
          var nextVer = (_activeDoc.versions ? _activeDoc.versions.length : 0) + 1;
          if (!_activeDoc.versions) _activeDoc.versions = [];
          _activeDoc.versions.unshift({
            version: nextVer,
            fileName: candidate.sourceDocName,
            relativePath: '',
            registeredAt: new Date().toISOString().split('T')[0],
            registeredBy: 'Admin（引用）',
            source: 'reference',
            expiryDate: candidate.expiryDate || null,
          });
          persistState(DATA);
          toast('reference', { sourceCase: candidate.sourceCase, sourceDoc: candidate.sourceDocName });
          refreshPage();
        }
        hideModal(referenceModal);
        _activeDoc = null;
      });
    }

    bindClose('close-reference-modal', referenceModal);
  }

  /* ------------------------------------------------------------------ */
  /*  Modal helpers                                                      */
  /* ------------------------------------------------------------------ */

  function showModal(el) {
    if (el) el.style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function hideModal(el) {
    if (el) el.style.display = 'none';
    document.body.style.overflow = '';
  }

  function bindClose(actionName, modalEl) {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="' + actionName + '"]')) {
        hideModal(modalEl);
        _activeDoc = null;
        _bulkWaiveIds = null;
      }
    });
    if (modalEl) {
      modalEl.addEventListener('click', function (e) {
        if (e.target === modalEl) {
          hideModal(modalEl);
          _activeDoc = null;
          _bulkWaiveIds = null;
        }
      });
    }
  }

  function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  ns.init = init;
  document.addEventListener('DOMContentLoaded', init);

  return ns;
})();
