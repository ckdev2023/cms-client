var DocumentsRegisterModal = (function () {
  'use strict';

  var ns = {};

  function init() {
    var CFG = window.DocumentsConfig;
    var DATA = window.DocumentsDemoData;

    var modal = document.getElementById('registerDocModal');
    var caseSelect = document.getElementById('registerCaseSelect');
    var docItemSelect = document.getElementById('registerDocItemSelect');
    var pathInput = document.getElementById('registerRelativePath');
    var pathError = document.getElementById('registerPathError');
    var pathHint = document.getElementById('registerPathHint');
    var fileNameInput = document.getElementById('registerFileName');
    var versionInput = document.getElementById('registerVersion');
    var confirmBtn = document.getElementById('registerConfirmBtn');
    var rules = CFG.RELATIVE_PATH_RULES;

    if (caseSelect) {
      DATA.DEMO_CASES.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.value;
        opt.textContent = c.label;
        caseSelect.appendChild(opt);
      });
    }

    if (caseSelect) {
      caseSelect.addEventListener('change', function () {
        populateDocItems(caseSelect.value);
        updateConfirmEnabled();
      });
    }

    function populateDocItems(caseNo) {
      if (!docItemSelect) return;
      docItemSelect.innerHTML = '<option value="" disabled selected>请选择资料</option>';
      docItemSelect.disabled = !caseNo;
      if (!caseNo) return;

      var items = DATA.DEMO_DOCUMENT_ROWS.filter(function (d) {
        var ns = CFG.normalizeDocStatus(d.status);
        return d.caseNo === caseNo && CFG.NON_SELECTABLE_STATUSES.indexOf(ns) === -1;
      });
      items.forEach(function (d) {
        var opt = document.createElement('option');
        opt.value = d.id;
        var ns = CFG.normalizeDocStatus(d.status);
        opt.textContent = d.docName + ' (' + (CFG.STATUS_LABEL_MAP[ns] || ns) + ')';
        docItemSelect.appendChild(opt);
      });
    }

    if (docItemSelect) {
      docItemSelect.addEventListener('change', function () {
        autoFillFromDocItem(docItemSelect.value);
        updateConfirmEnabled();
      });
    }

    function autoFillFromDocItem(docId) {
      var doc = DATA.DEMO_DOCUMENT_ROWS.find(function (d) { return d.id === docId; });
      if (!doc) return;
      var nextVersion = (doc.versions ? doc.versions.length : 0) + 1;
      if (versionInput) versionInput.value = 'v' + nextVersion + '（系统自动递增）';
    }

    function validatePath(val) {
      if (!val) return false;
      for (var i = 0; i < rules.forbiddenPatterns.length; i++) {
        if (val.indexOf(rules.forbiddenPatterns[i]) !== -1) return false;
      }
      for (var j = 0; j < rules.forbiddenLeadingChars.length; j++) {
        if (val.charAt(0) === rules.forbiddenLeadingChars[j]) return false;
      }
      if (rules.forbiddenCharsRegex.test(val)) return false;
      return true;
    }

    if (pathInput) {
      pathInput.addEventListener('input', function () {
        var val = pathInput.value.trim();
        var valid = !val || validatePath(val);
        if (pathError) pathError.classList.toggle('hidden', valid);
        if (pathHint) pathHint.classList.toggle('hidden', !valid && val.length > 0);

        if (val && fileNameInput && !fileNameInput._userEdited) {
          var parts = val.split('/');
          fileNameInput.value = parts[parts.length - 1] || '';
        }
        updateConfirmEnabled();
      });
    }

    if (fileNameInput) {
      fileNameInput.addEventListener('input', function () {
        fileNameInput._userEdited = true;
      });
    }

    function updateConfirmEnabled() {
      if (!confirmBtn) return;
      var caseVal = caseSelect ? caseSelect.value : '';
      var docVal = docItemSelect ? docItemSelect.value : '';
      var pathVal = pathInput ? pathInput.value.trim() : '';
      confirmBtn.disabled = !(caseVal && docVal && pathVal && validatePath(pathVal));
    }

    ns.open = function () {
      resetForm();
      if (modal) {
        modal.style.display = '';
        modal.classList.add('show');
      }
      document.body.style.overflow = 'hidden';
    };

    ns.close = function () {
      if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
      }
      document.body.style.overflow = '';
    };

    ns.openForDoc = function (doc) {
      resetForm();
      if (caseSelect) {
        caseSelect.value = doc.caseNo;
        populateDocItems(doc.caseNo);
      }
      if (docItemSelect) {
        docItemSelect.value = doc.id;
        autoFillFromDocItem(doc.id);
      }
      updateConfirmEnabled();
      if (modal) {
        modal.style.display = '';
        modal.classList.add('show');
      }
      document.body.style.overflow = 'hidden';
    };

    function resetForm() {
      if (caseSelect) caseSelect.selectedIndex = 0;
      if (docItemSelect) {
        docItemSelect.innerHTML = '<option value="" disabled selected>请先选择案件</option>';
        docItemSelect.disabled = true;
      }
      if (pathInput) pathInput.value = '';
      if (fileNameInput) { fileNameInput.value = ''; fileNameInput._userEdited = false; }
      if (versionInput) versionInput.value = 'v1（系统自动递增）';
      if (pathError) pathError.classList.add('hidden');
      if (pathHint) pathHint.classList.remove('hidden');
      if (confirmBtn) confirmBtn.disabled = true;
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="close-register-modal"]')) ns.close();
      if (e.target.closest('[data-action="open-register-modal"]')) ns.open();
    });

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) ns.close();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        var fileName = fileNameInput ? fileNameInput.value.trim() : '';
        var pathVal = pathInput ? pathInput.value.trim() : '';
        var docId = docItemSelect ? docItemSelect.value : '';

        var doc = DATA.DEMO_DOCUMENT_ROWS.find(function (d) { return d.id === docId; });
        if (doc) {
          doc.status = 'uploaded_reviewing';
          doc.relativePath = pathVal || doc.relativePath;
          var nextVer = (doc.versions ? doc.versions.length : 0) + 1;
          if (!doc.versions) doc.versions = [];
          doc.versions.unshift({
            version: nextVer,
            fileName: fileName || pathVal.split('/').pop() || 'file',
            relativePath: pathVal,
            registeredAt: new Date().toISOString().split('T')[0],
            registeredBy: 'Admin',
            source: 'self',
            expiryDate: null,
          });
          if (!doc.reviewRecords) doc.reviewRecords = [];
          doc.reviewRecords.unshift({
            action: 'uploaded',
            actor: 'Admin',
            timestamp: new Date().toISOString(),
            note: '',
          });
        }

        var fn = window.__docsPage && window.__docsPage.showToastPreset;
        if (fn) fn('register', { fileName: fileName || '文件' });
        ns.close();

        if (window.DocumentsPage && window.DocumentsPage.refreshTable) {
          window.DocumentsPage.refreshTable();
        }
      });
    }
  }

  ns.init = init;
  document.addEventListener('DOMContentLoaded', init);

  return ns;
})();
