/**
 * Case Detail — Document action modal state and mutations.
 * Owns modal open/close, document state transitions, and re-render sync.
 *
 * Depends on: case-detail-runtime.js (ns.esc, ns.setText, ns.showToast, ns.liveState),
 *             case-detail-renderers.js (ns.applyDocsProgress, ns.applyLogEntries),
 *             case-detail-documents-renderers.js (ns.applyDocumentItems)
 * Namespace: window.CaseDetailPage
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  var docActionModal = (function () {
    var _docName = null;

    function _showModal(el) {
      if (el) el.style.display = '';
      document.body.style.overflow = 'hidden';
    }

    function _hideModal(el) {
      if (el) el.style.display = 'none';
      document.body.style.overflow = '';
    }

    function _bindClose(actionAttr, modalEl) {
      document.addEventListener('click', function (e) {
        if (e.target.closest('[data-action="' + actionAttr + '"]')) {
          _hideModal(modalEl);
          _docName = null;
        }
      });
      if (modalEl) {
        modalEl.addEventListener('click', function (e) {
          if (e.target === modalEl) {
            _hideModal(modalEl);
            _docName = null;
          }
        });
      }
    }

    function _findDocItem(docName) {
      var s = DETAIL_SAMPLES[ns.liveState.sampleKey];
      if (!s || !s.documents) return null;
      for (var g = 0; g < s.documents.length; g++) {
        for (var i = 0; i < s.documents[g].items.length; i++) {
          if (s.documents[g].items[i].name === docName) return s.documents[g].items[i];
        }
      }
      return null;
    }

    function _reRender() {
      var s = DETAIL_SAMPLES[ns.liveState.sampleKey];
      if (!s) return;
      ns.applyDocumentItems(s.documents);
      ns.applyDocsProgress(s);
      ns.setText('docsNavCounter', s.docsCounter);
      ns.setText('overviewProgressPercent', s.progressPercent + '%');
      ns.setText('overviewProgressCount', s.progressCount);
      var bar = document.getElementById('overviewProgressBar');
      if (bar) bar.style.width = s.progressPercent + '%';
    }

    function _recalcProgress() {
      var s = DETAIL_SAMPLES[ns.liveState.sampleKey];
      if (!s || !s.documents) return;
      var total = 0;
      var done = 0;
      var _norm = ns.normalizeDocStatus || function (s) { return s; };
      s.documents.forEach(function (group) {
        group.items.forEach(function (item) {
          var _st = _norm(item.status);
          if (_st === 'waived') return;
          total++;
          if (_st === 'approved' || _st === 'uploaded_reviewing') done++;
        });
        var gDone = 0;
        var gTotal = 0;
        group.items.forEach(function (item) {
          var _st = _norm(item.status);
          if (_st === 'waived') return;
          gTotal++;
          if (_st === 'approved') gDone++;
        });
        group.count = gDone + '/' + gTotal;
      });
      var pct = total > 0 ? Math.round((done / total) * 100) : 0;
      s.progressPercent = pct;
      s.progressCount = done + '/' + total + ' 项已收集';
      s.docsCounter = done + '/' + total;
    }

    function _addLogEntry(entry) {
      ns.liveState.logEntries.unshift(entry);
      ns.applyLogEntries(ns.liveState.logEntries);
    }

    var approveModal = document.getElementById('docApproveModal');
    var approveDocNameEl = document.getElementById('docApproveDocName');
    var approveConfirmBtn = document.getElementById('docApproveConfirmBtn');

    function openApprove(docName) {
      _docName = docName;
      if (approveDocNameEl) approveDocNameEl.textContent = docName;
      _showModal(approveModal);
    }

    if (approveConfirmBtn) {
      approveConfirmBtn.addEventListener('click', function () {
        if (!_docName) return;
        var item = _findDocItem(_docName);
        if (item) {
          item.status = 'approved';
          item.statusLabel = ns.docStatusLabel ? ns.docStatusLabel('approved') : '通过';
          if (!item.reviewHistory) item.reviewHistory = [];
          item.reviewHistory.unshift({
            action: 'approved',
            operator: '当前操作人',
            time: new Date().toLocaleString('zh-CN'),
            comment: null,
          });
        }
        _addLogEntry({
          type: 'review',
          avatar: 'U',
          avatarStyle: 'success',
          text: '审核通过：<b>' + ns.esc(_docName) + '</b>',
          category: '审核日志',
          categoryChip: 'green',
          objectType: '资料项',
          time: '刚刚',
          dotColor: 'success',
          source_type: 'document', source_key: 'doc_approve',
        });
        _recalcProgress();
        _reRender();
        _hideModal(approveModal);
        ns.showToast('审核通过（示例）', _docName + ' 已标记为审核通过');
        _docName = null;
      });
    }

    _bindClose('close-doc-approve-modal', approveModal);

    var rejectModal = document.getElementById('docRejectModal');
    var rejectDocNameEl = document.getElementById('docRejectDocName');
    var rejectReasonText = document.getElementById('docRejectReasonText');
    var rejectConfirmBtn = document.getElementById('docRejectConfirmBtn');

    function openReject(docName) {
      _docName = docName;
      if (rejectDocNameEl) rejectDocNameEl.textContent = docName;
      if (rejectReasonText) rejectReasonText.value = '';
      if (rejectConfirmBtn) rejectConfirmBtn.disabled = true;
      _showModal(rejectModal);
    }

    if (rejectReasonText) {
      rejectReasonText.addEventListener('input', function () {
        if (rejectConfirmBtn) rejectConfirmBtn.disabled = !rejectReasonText.value.trim();
      });
    }

    if (rejectConfirmBtn) {
      rejectConfirmBtn.addEventListener('click', function () {
        if (!_docName) return;
        var reason = rejectReasonText ? rejectReasonText.value.trim() : '';
        var item = _findDocItem(_docName);
        if (item) {
          item.status = 'rejected';
          item.statusLabel = ns.docStatusLabel ? ns.docStatusLabel('rejected') : '退回补正';
          item.meta = (item.meta || '').split(' · ')[0] + ' · 退回原因：' + reason;
          if (!item.reviewHistory) item.reviewHistory = [];
          item.reviewHistory.unshift({
            action: 'rejected',
            operator: '当前操作人',
            time: new Date().toLocaleString('zh-CN'),
            comment: reason,
          });
        }
        _addLogEntry({
          type: 'review',
          avatar: 'U',
          avatarStyle: 'danger',
          text: '退回补正：<b>' + ns.esc(_docName) + '</b>',
          category: '审核日志',
          categoryChip: 'red',
          objectType: '资料项',
          time: '刚刚',
          dotColor: 'danger',
          source_type: 'document', source_key: 'doc_reject',
        });
        _recalcProgress();
        _reRender();
        _hideModal(rejectModal);
        ns.showToast('退回补正（示例）', _docName + ' 已退回，原因已记录');
        _docName = null;
      });
    }

    _bindClose('close-doc-reject-modal', rejectModal);

    var waiveModal = document.getElementById('docWaiveModal');
    var waiveDocLabel = document.getElementById('docWaiveDocLabel');
    var waiveReasonSelect = document.getElementById('docWaiveReasonSelect');
    var waiveNoteWrap = document.getElementById('docWaiveNoteWrap');
    var waiveReasonNote = document.getElementById('docWaiveReasonNote');
    var waiveConfirmBtn = document.getElementById('docWaiveConfirmBtn');

    function openWaive(docName) {
      _docName = docName;
      if (waiveDocLabel) waiveDocLabel.textContent = '将「' + docName + '」标记为无需提供，从完成率分母中剔除。';
      if (waiveReasonSelect) waiveReasonSelect.selectedIndex = 0;
      if (waiveReasonNote) waiveReasonNote.value = '';
      if (waiveNoteWrap) waiveNoteWrap.classList.add('hidden');
      if (waiveConfirmBtn) waiveConfirmBtn.disabled = true;
      _showModal(waiveModal);
    }

    function _updateWaiveEnabled() {
      if (!waiveConfirmBtn) return;
      var val = waiveReasonSelect ? waiveReasonSelect.value : '';
      if (!val) {
        waiveConfirmBtn.disabled = true;
        return;
      }
      waiveConfirmBtn.disabled = val === 'other' && !(waiveReasonNote && waiveReasonNote.value.trim());
    }

    if (waiveReasonSelect) {
      waiveReasonSelect.addEventListener('change', function () {
        var needsNote = waiveReasonSelect.value === 'other';
        if (waiveNoteWrap) waiveNoteWrap.classList.toggle('hidden', !needsNote);
        _updateWaiveEnabled();
      });
    }

    if (waiveReasonNote) {
      waiveReasonNote.addEventListener('input', _updateWaiveEnabled);
    }

    if (waiveConfirmBtn) {
      waiveConfirmBtn.addEventListener('click', function () {
        if (!_docName) return;
        var reasonCode = waiveReasonSelect ? waiveReasonSelect.value : '';
        var reasonLabel = (typeof DETAIL_WAIVE_REASONS !== 'undefined' && DETAIL_WAIVE_REASONS[reasonCode])
          ? DETAIL_WAIVE_REASONS[reasonCode]
          : reasonCode;
        var noteText = (reasonCode === 'other' && waiveReasonNote) ? waiveReasonNote.value.trim() : '';
        var item = _findDocItem(_docName);
        if (item) {
          item.status = 'waived';
          item.statusLabel = ns.docStatusLabel ? ns.docStatusLabel('waived') : '无需提供';
          item.meta = '无需提供 · 原因：' + reasonLabel + (noteText ? '（' + noteText + '）' : '') + ' · 当前操作人 · ' + new Date().toLocaleDateString('zh-CN');
          item.canWaive = false;
          if (!item.reviewHistory) item.reviewHistory = [];
          item.reviewHistory.unshift({
            action: 'waived',
            operator: '当前操作人',
            time: new Date().toLocaleString('zh-CN'),
            comment: reasonLabel + (noteText ? '：' + noteText : ''),
          });
        }
        _addLogEntry({
          type: 'review',
          avatar: 'U',
          avatarStyle: 'surface',
          text: '标记无需提供：<b>' + ns.esc(_docName) + '</b>（' + ns.esc(reasonLabel) + '）',
          category: '审核日志',
          categoryChip: '',
          objectType: '资料项',
          time: '刚刚',
          dotColor: 'border',
          source_type: 'document', source_key: 'doc_waive',
        });
        _recalcProgress();
        _reRender();
        _hideModal(waiveModal);
        ns.showToast('已标记无需提供（示例）', _docName + ' 已从完成率分母剔除');
        _docName = null;
      });
    }

    _bindClose('close-doc-waive-modal', waiveModal);

    var registerModal = document.getElementById('docRegisterModal');
    var registerItemName = document.getElementById('docRegisterItemName');
    var registerPath = document.getElementById('docRegisterPath');
    var registerPathHint = document.getElementById('docRegisterPathHint');
    var registerPathError = document.getElementById('docRegisterPathError');
    var registerFileName = document.getElementById('docRegisterFileName');
    var registerVersion = document.getElementById('docRegisterVersion');
    var registerConfirmBtn = document.getElementById('docRegisterConfirmBtn');

    function _validatePath(val) {
      if (!val) return false;
      var rules = (typeof DETAIL_PATH_RULES !== 'undefined') ? DETAIL_PATH_RULES : null;
      if (!rules) return val.length > 0;
      for (var i = 0; i < rules.forbiddenPatterns.length; i++) {
        if (val.indexOf(rules.forbiddenPatterns[i]) !== -1) return false;
      }
      for (var j = 0; j < rules.forbiddenLeadingChars.length; j++) {
        if (val.charAt(0) === rules.forbiddenLeadingChars[j]) return false;
      }
      if (rules.forbiddenCharsRegex && rules.forbiddenCharsRegex.test(val)) return false;
      return true;
    }

    function _updateRegisterEnabled() {
      if (!registerConfirmBtn) return;
      var pathVal = registerPath ? registerPath.value.trim() : '';
      registerConfirmBtn.disabled = !(pathVal && _validatePath(pathVal));
    }

    function openRegister(docName) {
      _docName = docName;
      if (registerItemName) registerItemName.value = docName;
      if (registerPath) registerPath.value = '';
      if (registerFileName) {
        registerFileName.value = '';
        registerFileName._userEdited = false;
      }
      if (registerPathError) registerPathError.classList.add('hidden');
      if (registerPathHint) registerPathHint.classList.remove('hidden');

      var item = _findDocItem(docName);
      var nextVer = 1;
      if (item && item.versions) nextVer = item.versions.length + 1;
      if (registerVersion) registerVersion.value = 'v' + nextVer + '（系统自动递增）';
      if (registerConfirmBtn) registerConfirmBtn.disabled = true;
      _showModal(registerModal);
    }

    if (registerPath) {
      registerPath.addEventListener('input', function () {
        var val = registerPath.value.trim();
        var valid = !val || _validatePath(val);
        if (registerPathError) registerPathError.classList.toggle('hidden', valid);
        if (registerPathHint) registerPathHint.classList.toggle('hidden', !valid && val.length > 0);
        if (val && registerFileName && !registerFileName._userEdited) {
          var parts = val.split('/');
          registerFileName.value = parts[parts.length - 1] || '';
        }
        _updateRegisterEnabled();
      });
    }

    if (registerFileName) {
      registerFileName.addEventListener('input', function () {
        registerFileName._userEdited = true;
      });
    }

    if (registerConfirmBtn) {
      registerConfirmBtn.addEventListener('click', function () {
        if (!_docName) return;
        var pathVal = registerPath ? registerPath.value.trim() : '';
        var fileNameVal = registerFileName ? registerFileName.value.trim() : '';
        if (!fileNameVal) {
          var parts = pathVal.split('/');
          fileNameVal = parts[parts.length - 1] || 'file';
        }
        var item = _findDocItem(_docName);
        if (item) {
          var nextVer = (item.versions ? item.versions.length : 0) + 1;
          item.status = 'uploaded_reviewing';
          item.statusLabel = ns.docStatusLabel ? ns.docStatusLabel('uploaded_reviewing') : '已提交待审核';
          item.meta = fileNameVal + ' · v' + nextVer + ' · 催办：—';
          if (!item.versions) item.versions = [];
          item.versions.unshift({
            no: 'v' + nextVer,
            fileName: fileNameVal,
            path: pathVal,
            date: new Date().toLocaleDateString('zh-CN'),
            operator: '当前操作人',
          });
          if (!item.reviewHistory) item.reviewHistory = [];
          item.reviewHistory.unshift({
            action: 'uploaded',
            operator: '当前操作人',
            time: new Date().toLocaleString('zh-CN'),
            comment: null,
          });
        }
        _addLogEntry({
          type: 'operation',
          avatar: 'U',
          avatarStyle: 'primary',
          text: '登记资料：<b>' + ns.esc(_docName) + '</b>（' + ns.esc(fileNameVal) + '）',
          category: '操作日志',
          categoryChip: '',
          objectType: '资料项',
          time: '刚刚',
          dotColor: 'primary',
          source_type: 'document', source_key: 'doc_register',
        });
        _recalcProgress();
        _reRender();
        _hideModal(registerModal);
        ns.showToast('资料已登记（示例）', _docName + ' · ' + fileNameVal + ' 路径已保存');
        _docName = null;
      });
    }

    _bindClose('close-doc-register-modal', registerModal);

    var referenceModal = document.getElementById('docReferenceModal');
    var referenceDocLabel = document.getElementById('docReferenceDocLabel');
    var referenceCandidateList = document.getElementById('docReferenceCandidateList');
    var referenceCandidateEmpty = document.getElementById('docReferenceCandidateEmpty');
    var referenceConfirmBtn = document.getElementById('docReferenceConfirmBtn');

    function openReference(docName) {
      _docName = docName;
      var candidates = (typeof DETAIL_REFERENCE_CANDIDATES !== 'undefined') ? DETAIL_REFERENCE_CANDIDATES : [];

      if (referenceDocLabel) {
        referenceDocLabel.textContent = '为「' + docName + '」选择一个已审核通过的版本进行引用。引用后状态独立维护。';
      }

      if (referenceCandidateList) {
        referenceCandidateList.innerHTML = '';
        if (candidates.length > 0) {
          candidates.forEach(function (c) {
            var label = document.createElement('label');
            label.className = 'block apple-card p-4 cursor-pointer hover:shadow-[var(--shadow-hover)] transition-shadow border-2 border-transparent has-[:checked]:border-[var(--primary)]';
            label.innerHTML =
              '<div class="flex items-start gap-3">' +
                '<input type="radio" name="docRefCandidate" value="' + ns.esc(c.id) + '" class="mt-1 accent-[var(--primary)]" />' +
                '<div class="flex-1 min-w-0">' +
                  '<div class="flex items-center gap-2">' +
                    '<span class="text-sm font-semibold text-[var(--text)]">' + ns.esc(c.sourceDocName) + '</span>' +
                    '<span class="chip text-[10px] py-0 px-1 bg-green-50 text-green-700 border-green-200">通过</span>' +
                  '</div>' +
                  '<div class="text-[12px] text-[var(--muted-2)] mt-1">来源案件：' + ns.esc(c.sourceCaseLabel) + '</div>' +
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
        } else if (referenceCandidateEmpty) {
          referenceCandidateEmpty.classList.remove('hidden');
        }
      }

      if (referenceConfirmBtn) referenceConfirmBtn.disabled = true;
      _showModal(referenceModal);
    }

    if (referenceCandidateList) {
      referenceCandidateList.addEventListener('change', function (e) {
        if (e.target.name === 'docRefCandidate') {
          if (referenceConfirmBtn) referenceConfirmBtn.disabled = false;
        }
      });
    }

    if (referenceConfirmBtn) {
      referenceConfirmBtn.addEventListener('click', function () {
        if (!_docName) return;
        var candidates = (typeof DETAIL_REFERENCE_CANDIDATES !== 'undefined') ? DETAIL_REFERENCE_CANDIDATES : [];
        var selected = referenceCandidateList
          ? referenceCandidateList.querySelector('input[name="docRefCandidate"]:checked')
          : null;
        if (!selected) return;
        var refId = selected.value;
        var candidate = null;
        for (var ci = 0; ci < candidates.length; ci++) {
          if (candidates[ci].id === refId) {
            candidate = candidates[ci];
            break;
          }
        }

        var item = _findDocItem(_docName);
        if (item && candidate) {
          item.status = 'uploaded_reviewing';
          item.statusLabel = ns.docStatusLabel ? ns.docStatusLabel('uploaded_reviewing') : '已提交待审核';
          item.meta = candidate.sourceDocName + ' · 引用自 ' + candidate.sourceCase;
          item.referenceSource = {
            caseId: candidate.sourceCase,
            caseName: candidate.sourceCaseLabel,
            docName: candidate.sourceDocName,
          };
          item.sharedCaseCount = (item.sharedCaseCount || 0) + 1;
          if (!item.versions) item.versions = [];
          item.versions.unshift({
            no: 'v' + (item.versions.length + 1),
            fileName: candidate.sourceDocName,
            path: '',
            date: new Date().toLocaleDateString('zh-CN'),
            operator: '引用',
            referenceSource: { caseId: candidate.sourceCase },
          });
          if (!item.reviewHistory) item.reviewHistory = [];
          item.reviewHistory.unshift({
            action: 'uploaded',
            operator: '当前操作人（引用）',
            time: new Date().toLocaleString('zh-CN'),
            comment: '引用自 ' + candidate.sourceCaseLabel,
          });
        }

        var sourceLabel = candidate ? candidate.sourceCase + ' · ' + candidate.sourceDocName : '';
        _addLogEntry({
          type: 'operation',
          avatar: 'U',
          avatarStyle: 'primary',
          text: '引用既有版本到 <b>' + ns.esc(_docName) + '</b>（来源：' + ns.esc(sourceLabel) + '）',
          category: '操作日志',
          categoryChip: '',
          objectType: '资料项',
          time: '刚刚',
          dotColor: 'primary',
          source_type: 'document', source_key: 'doc_reuse',
        });
        _recalcProgress();
        _reRender();
        _hideModal(referenceModal);
        ns.showToast('引用成功（示例）', '已引用既有版本到 ' + _docName);
        _docName = null;
      });
    }

    _bindClose('close-doc-reference-modal', referenceModal);

    function doRemind(docName) {
      var item = _findDocItem(docName);
      if (item) {
        if (!item.reminderHistory) item.reminderHistory = [];
        item.reminderHistory.unshift({
          time: new Date().toLocaleString('zh-CN'),
          method: '站内通知',
          operator: '当前操作人',
          recipient: '客户',
        });
      }
      _addLogEntry({
        type: 'operation',
        avatar: 'U',
        avatarStyle: 'warning',
        text: '发送催办：<b>' + ns.esc(docName) + '</b>',
        category: '操作日志',
        categoryChip: '',
        objectType: '沟通',
        time: '刚刚',
        dotColor: 'warning',
        source_type: 'document', source_key: 'doc_remind',
      });
      _reRender();
      ns.showToast('催办已发送（示例）', '已发送催办提醒给 ' + docName);
    }

    return {
      openApprove: openApprove,
      openReject: openReject,
      openWaive: openWaive,
      openRegister: openRegister,
      openReference: openReference,
      doRemind: doRemind,
    };
  })();

  ns.docActionModal = docActionModal;
})();
