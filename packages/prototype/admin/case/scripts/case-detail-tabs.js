/**
 * Case Detail — Tab switching, hash sync, More menu, and navigation shortcuts.
 *
 * Depends on: DETAIL_TABS (from case-detail-config.js).
 * Exposes on window.CaseDetailPage: panels, setActiveTab, resolveHashTab, setHash.
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  /* ================================================================== */
  /*  TAB SWITCHING                                                      */
  /* ================================================================== */

  var primaryTabs = Array.from(document.querySelectorAll('.detail-tab[data-tab]'));
  var secondaryTabs = Array.from(document.querySelectorAll('.more-tabs-menu-item[data-tab]'));
  var allTabLinks = primaryTabs.concat(secondaryTabs);
  var panels = {};
  var ACTIVE_TAB_CLS = 'is-active';

  var SECONDARY_TAB_KEYS = { info: 1, forms: 1, tasks: 1, deadlines: 1, messages: 1, 'immigration-result': 1, 'residence-period': 1, log: 1 };
  var moreWrapper = document.getElementById('moreTabsWrapper');
  var moreTrigger = document.getElementById('moreTabsTrigger');

  DETAIL_TABS.forEach(function (t) {
    panels[t.key] = document.getElementById('tab-' + t.key);
  });

  function setActiveTab(key) {
    primaryTabs.forEach(function (a) {
      a.classList.toggle(ACTIVE_TAB_CLS, a.getAttribute('data-tab') === key);
    });
    secondaryTabs.forEach(function (a) {
      a.classList.toggle(ACTIVE_TAB_CLS, a.getAttribute('data-tab') === key);
    });
    Object.keys(panels).forEach(function (k) {
      if (panels[k]) {
        panels[k].classList.toggle(ACTIVE_TAB_CLS, k === key);
      }
    });
    if (moreTrigger) {
      moreTrigger.classList.toggle('has-active-child', !!SECONDARY_TAB_KEYS[key]);
    }
  }

  function resolveHashTab() {
    var raw = window.location.hash ? window.location.hash.slice(1) : '';
    if (!raw) return null;
    if (!panels[raw]) return null;
    return raw;
  }

  function setHash(key) {
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#' + key);
      } else {
        window.location.hash = key;
      }
    } catch (e) {
      // Silently ignore – hash update is non-critical for prototype
    }
  }

  /* ---- Tab click handlers ---- */

  allTabLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var key = a.getAttribute('data-tab');
      if (!key) return;
      setActiveTab(key);
      setHash(key);
      if (moreWrapper) moreWrapper.classList.remove('is-open');
    });
  });

  if (moreTrigger && moreWrapper) {
    moreTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      moreWrapper.classList.toggle('is-open');
    });
    document.addEventListener('click', function (e) {
      if (!moreWrapper.contains(e.target)) {
        moreWrapper.classList.remove('is-open');
      }
    });
  }

  window.addEventListener('hashchange', function () {
    var key = resolveHashTab();
    if (key) setActiveTab(key);
  });

  /* ---- Overview → tab navigation shortcuts ---- */

  var openValBtn = document.getElementById('openValidationTab');
  if (openValBtn) {
    openValBtn.addEventListener('click', function () {
      setActiveTab('validation');
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('.overview-goto-validation')) {
      setActiveTab('validation');
      return;
    }
    if (e.target.closest('.overview-goto-billing')) {
      setActiveTab('billing');
      return;
    }
    if (e.target.closest('.overview-goto-deadlines')) {
      setActiveTab('deadlines');
      return;
    }
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (btn && btn.textContent.trim() === '查看完整日志 →') {
      setActiveTab('log');
    }
  });

  /* ---- Validation blocker → document / task jump ---- */

  document.addEventListener('click', function (e) {
    var jumpDoc = e.target.closest('.blocker-jump-doc');
    if (jumpDoc) {
      var docTarget = jumpDoc.getAttribute('data-doc-target');
      setActiveTab('documents');
      setTimeout(function () {
        var rows = document.querySelectorAll('.doc-item');
        rows.forEach(function (row) {
          var docName = row.getAttribute('data-doc-name') || '';
          if (docName === docTarget) {
            row.style.transition = 'background 0.3s';
            row.style.background = 'rgba(var(--primary-rgb, 0,113,227), 0.07)';
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function () { row.style.background = ''; }, 2000);
          }
        });
      }, 120);
      return;
    }
    var jumpDocs = e.target.closest('.blocker-goto-docs');
    if (jumpDocs) {
      setActiveTab('documents');
      return;
    }

    var createTaskBtn = e.target.closest('.blocker-create-task');
    if (createTaskBtn) {
      var taskTitle = createTaskBtn.getAttribute('data-task-title') || '补交缺失资料';
      var taskAssignee = createTaskBtn.getAttribute('data-task-assignee') || '';
      var taskDue = createTaskBtn.getAttribute('data-task-due') || '';
      var taskMeta = [taskAssignee, taskDue].filter(Boolean).join(' · ');
      setActiveTab('tasks');
      ns.showToast(
        '催办任务已创建',
        '\u300c' + taskTitle + '\u300d\u5df2\u751f\u6210\u5e76\u5206\u914d\u7ed9' + (taskMeta ? ' ' + taskMeta : '') + '\u3002'
      );
      return;
    }
  });

  /* ---- Namespace exports ---- */

  ns.panels = panels;
  ns.setActiveTab = setActiveTab;
  ns.resolveHashTab = resolveHashTab;
  ns.setHash = setHash;
})();
