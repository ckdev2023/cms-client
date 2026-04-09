(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var store = window.CaseListData || { owners: {}, cases: [] };
    var CASE_LIST_DRAFTS_KEY = 'prototype.caseListDrafts';
    var CASE_LIST_FLASH_KEY = 'prototype.caseListFlash';
    var cases = Array.isArray(store.cases) ? store.cases.slice() : [];
    var owners = store.owners || {};

    var state = {
      scope: 'mine',
      filters: {
        search: '',
        stage: 'all',
        owner: 'all',
        group: 'all',
        risk: 'all',
        validation: 'all',
      },
      selectedIds: new Set(),
      focusIds: null,
      latestFlash: null,
    };

    var elements = {
      tbody: document.getElementById('caseTableBody'),
      paginationSummary: document.getElementById('paginationSummary'),
      searchInput: document.getElementById('searchInput'),
      filterStage: document.getElementById('filterStage'),
      filterOwner: document.getElementById('filterOwner'),
      filterGroup: document.getElementById('filterGroup'),
      filterRisk: document.getElementById('filterRisk'),
      filterValidation: document.getElementById('filterValidation'),
      resetFiltersBtn: document.getElementById('resetFiltersBtn'),
      selectAllCases: document.getElementById('selectAllCases'),
      bulkActionBar: document.getElementById('bulkActionBar'),
      selectedCount: document.getElementById('selectedCount'),
      bulkClearBtn: document.getElementById('bulkClearBtn'),
      bulkOwnerSelect: document.getElementById('bulkOwnerSelect'),
      bulkOwnerApplyBtn: document.getElementById('bulkOwnerApplyBtn'),
      bulkCollaboratorSelect: document.getElementById('bulkCollaboratorSelect'),
      bulkCollaboratorApplyBtn: document.getElementById('bulkCollaboratorApplyBtn'),
      bulkDueDateInput: document.getElementById('bulkDueDateInput'),
      bulkDueDateApplyBtn: document.getElementById('bulkDueDateApplyBtn'),
      bulkTaskSelect: document.getElementById('bulkTaskSelect'),
      bulkTaskApplyBtn: document.getElementById('bulkTaskApplyBtn'),
      toast: document.getElementById('toast'),
      toastTitle: document.getElementById('toastTitle'),
      toastDesc: document.getElementById('toastDesc'),
      summaryActiveCases: document.getElementById('summaryActiveCases'),
      summaryFailedValidations: document.getElementById('summaryFailedValidations'),
      summaryDueSoon: document.getElementById('summaryDueSoon'),
      summaryUnpaidTotal: document.getElementById('summaryUnpaidTotal'),
      creationFlashBanner: document.getElementById('creationFlashBanner'),
      creationFlashTitle: document.getElementById('creationFlashTitle'),
      creationFlashDesc: document.getElementById('creationFlashDesc'),
      creationFlashFilterBtn: document.getElementById('creationFlashFilterBtn'),
      creationFlashDismiss: document.getElementById('creationFlashDismiss'),
    };

    function formatCurrency(value) {
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        maximumFractionDigits: 0,
      }).format(value || 0);
    }

    function stageClass(stageId) {
      if (stageId === 'S9') return 'status-stage-done';
      if (stageId === 'S5' || stageId === 'S7') return 'status-stage-waiting';
      return 'status-stage-active';
    }

    function validationClass(status) {
      if (status === 'passed') return 'status-validation-passed';
      if (status === 'failed') return 'status-validation-failed';
      return 'status-validation-pending';
    }

    function riskClass(status) {
      if (status === 'critical') return 'status-risk-critical';
      if (status === 'attention') return 'status-risk-attention';
      return 'status-risk-normal';
    }

    function readSessionJson(key) {
      try {
        var raw = window.sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    }

    function removeSessionKey(key) {
      try {
        window.sessionStorage.removeItem(key);
      } catch (error) {
        return;
      }
    }

    function bootstrapDraftCases() {
      var draftCases = readSessionJson(CASE_LIST_DRAFTS_KEY);
      if (!Array.isArray(draftCases) || !draftCases.length) return;

      var seenIds = new Set(cases.map(function (item) { return item.id; }));
      draftCases.slice().reverse().forEach(function (item) {
        if (!seenIds.has(item.id)) {
          cases.unshift(item);
          seenIds.add(item.id);
        }
      });
    }

    function loadFlash() {
      var flash = readSessionJson(CASE_LIST_FLASH_KEY);
      if (!flash) return null;
      removeSessionKey(CASE_LIST_FLASH_KEY);
      return flash;
    }

    function getFilteredCases() {
      return cases.filter(function (item) {
        if (state.focusIds && !state.focusIds.has(item.id)) return false;
        if (!item.visibleScopes.includes(state.scope)) return false;
        if (state.filters.stage !== 'all' && item.stageId !== state.filters.stage) return false;
        if (state.filters.owner !== 'all' && item.ownerId !== state.filters.owner) return false;
        if (state.filters.group !== 'all' && item.groupId !== state.filters.group) return false;
        if (state.filters.risk !== 'all' && item.riskStatus !== state.filters.risk) return false;
        if (state.filters.validation !== 'all' && item.validationStatus !== state.filters.validation) return false;

        var keyword = state.filters.search.trim().toLowerCase();
        if (!keyword) return true;

        var haystack = [item.id, item.name, item.type, item.applicant, item.groupLabel].join(' ').toLowerCase();
        return haystack.includes(keyword);
      });
    }

    function pruneSelection(filteredCases) {
      var visibleIds = new Set(filteredCases.map(function (item) { return item.id; }));
      Array.from(state.selectedIds).forEach(function (id) {
        if (!visibleIds.has(id)) state.selectedIds.delete(id);
      });
    }

    function renderSummary(filteredCases) {
      var activeCases = filteredCases.filter(function (item) { return item.stageId !== 'S9'; }).length;
      var failedValidations = filteredCases.filter(function (item) { return item.validationStatus === 'failed'; }).length;
      var dueSoon = filteredCases.filter(function (item) {
        if (!item.dueDate) return false;
        var today = new Date('2026-04-09T00:00:00');
        var dueDate = new Date(item.dueDate + 'T00:00:00');
        var diff = Math.ceil((dueDate - today) / 86400000);
        return diff >= 0 && diff <= 7;
      }).length;
      var unpaidTotal = filteredCases.reduce(function (sum, item) { return sum + (item.unpaidAmount || 0); }, 0);

      elements.summaryActiveCases.textContent = String(activeCases);
      elements.summaryFailedValidations.textContent = String(failedValidations);
      elements.summaryDueSoon.textContent = String(dueSoon);
      elements.summaryUnpaidTotal.textContent = formatCurrency(unpaidTotal);
    }

    function renderRows(filteredCases) {
      if (!filteredCases.length) {
        elements.tbody.innerHTML =
          '<tr><td colspan="14">' +
          '<div class="px-6 py-14 text-center">' +
          '<div class="text-lg font-extrabold text-[var(--text)]">暂无符合条件的案件</div>' +
          '<div class="text-sm text-[var(--muted-2)] mt-2">可以调整筛选条件，或从“新建案件 / 家族签批量建案”入口继续。</div>' +
          '</div></td></tr>';
        elements.paginationSummary.textContent = '显示 0 条';
        return;
      }

      elements.tbody.innerHTML = filteredCases.map(function (item) {
        var owner = owners[item.ownerId] || { name: '未指派', initial: '?', avatarClass: 'bg-slate-100 text-slate-600' };
        var checked = state.selectedIds.has(item.id) ? 'checked' : '';
        var dueClass = item.riskStatus === 'critical' ? 'text-red-600' : item.riskStatus === 'attention' ? 'text-amber-600' : 'text-[var(--text)]';
        var metaBits = [item.id];
        if (item.batchLabel) metaBits.push(item.batchLabel);
        if (item.isDraft) metaBits.push('本次新建');

        return [
          '<tr>',
          '<td class="text-center"><input type="checkbox" class="accent-[var(--primary)] table-checkbox" data-case-select value="' + item.id + '" aria-label="选择 ' + item.name + '" ' + checked + ' /></td>',
          '<td>',
          '<div class="font-semibold text-[var(--text)]">' + item.name + '</div>',
          '<div class="table-meta mt-1">' + metaBits.join(' · ') + '</div>',
          (item.casePartySummary ? '<div class="table-meta mt-1">' + item.casePartySummary + '</div>' : ''),
          (item.materialSummary ? '<div class="table-meta mt-1">' + item.materialSummary + '</div>' : ''),
          '</td>',
          '<td><div class="font-semibold text-[var(--text)]">' + item.type + '</div></td>',
          '<td><div class="font-semibold text-[var(--text)]">' + item.applicant + '</div></td>',
          '<td><span class="chip">' + item.groupLabel + '</span></td>',
          '<td><span class="status-pill ' + stageClass(item.stageId) + '">' + item.stageLabel + '</span></td>',
          '<td>',
          '<div class="flex items-center gap-2">',
          '<div class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold ' + owner.avatarClass + '">' + owner.initial + '</div>',
          '<span class="font-semibold text-[var(--text)]">' + owner.name + '</span>',
          '</div>',
          '</td>',
          '<td>',
          '<div class="text-[13px] font-semibold text-[var(--text)] mb-2">' + item.completionLabel + '</div>',
          '<div class="progress-track"><div class="progress-fill" style="width:' + item.completionPercent + '%"></div></div>',
          '</td>',
          '<td>',
          '<div class="flex items-center gap-2 flex-wrap">',
          '<span class="status-pill ' + validationClass(item.validationStatus) + '">' + item.validationLabel + '</span>',
          '<span class="table-meta">阻断 ' + item.blockerCount + '</span>',
          '</div>',
          '</td>',
          '<td class="text-right"><div class="font-semibold text-[var(--text)]">' + formatCurrency(item.unpaidAmount) + '</div></td>',
          '<td><div class="font-semibold text-[var(--text)]">' + item.updatedAtLabel + '</div></td>',
          '<td><div class="font-semibold ' + dueClass + '">' + item.dueDateLabel + '</div><div class="table-meta mt-1">' + item.dueDate + '</div></td>',
          '<td><span class="status-pill ' + riskClass(item.riskStatus) + '">' + item.riskLabel + '</span></td>',
          '<td class="text-right"><div class="table-actions"><button class="table-icon-btn" type="button" data-navigate="detail.html" title="查看详情"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0A9 9 0 113 12a9 9 0 0118 0z"></path></svg></button></div></td>',
          '</tr>',
        ].join('');
      }).join('');

      elements.paginationSummary.textContent = '显示 1 - ' + filteredCases.length + ' 条，共 ' + filteredCases.length + ' 条';
    }

    function syncSelectionUi(filteredCases) {
      var visibleIds = filteredCases.map(function (item) { return item.id; });
      var selectedVisibleCount = visibleIds.filter(function (id) { return state.selectedIds.has(id); }).length;

      elements.selectedCount.textContent = String(state.selectedIds.size);
      elements.bulkActionBar.classList.toggle('hidden', state.selectedIds.size === 0);

      elements.selectAllCases.checked = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
      elements.selectAllCases.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
    }

    function showToast(title, desc) {
      elements.toastTitle.textContent = title;
      elements.toastDesc.textContent = desc;
      elements.toast.classList.remove('hidden');
      window.clearTimeout(showToast._timer);
      showToast._timer = window.setTimeout(function () {
        elements.toast.classList.add('hidden');
      }, 2200);
    }

    function render() {
      var filteredCases = getFilteredCases();
      pruneSelection(filteredCases);
      renderSummary(filteredCases);
      renderRows(filteredCases);
      syncSelectionUi(filteredCases);
    }

    function setScope(nextScope) {
      state.scope = nextScope;
      document.querySelectorAll('[data-scope-btn]').forEach(function (button) {
        var isActive = button.getAttribute('data-scope-btn') === nextScope;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      render();
    }

    function applyOwner(ownerId) {
      var owner = owners[ownerId];
      if (!owner || state.selectedIds.size === 0) return;
      cases.forEach(function (item) {
        if (state.selectedIds.has(item.id)) item.ownerId = ownerId;
      });
      render();
      showToast('批量指派负责人（示例）', '已选择 ' + state.selectedIds.size + ' 条，负责人：' + owner.name);
    }

    function applyDueDate(dueDate) {
      if (!dueDate || state.selectedIds.size === 0) return;
      var shortLabel = dueDate.slice(5);
      cases.forEach(function (item) {
        if (state.selectedIds.has(item.id)) {
          item.dueDate = dueDate;
          item.dueDateLabel = shortLabel;
        }
      });
      render();
      showToast('批量调整截止日（示例）', '已选择 ' + state.selectedIds.size + ' 条，截止日：' + dueDate);
    }

    document.querySelectorAll('[data-scope-btn]').forEach(function (button) {
      button.addEventListener('click', function () {
        setScope(button.getAttribute('data-scope-btn'));
      });
    });

    elements.searchInput.addEventListener('input', function (event) {
      state.filters.search = event.target.value;
      render();
    });

    [
      ['filterStage', 'stage'],
      ['filterOwner', 'owner'],
      ['filterGroup', 'group'],
      ['filterRisk', 'risk'],
      ['filterValidation', 'validation'],
    ].forEach(function (entry) {
      var elementKey = entry[0];
      var filterKey = entry[1];
      elements[elementKey].addEventListener('change', function (event) {
        state.filters[filterKey] = event.target.value;
        render();
      });
    });

    elements.resetFiltersBtn.addEventListener('click', function () {
      state.filters = {
        search: '',
        stage: 'all',
        owner: 'all',
        group: 'all',
        risk: 'all',
        validation: 'all',
      };
      elements.searchInput.value = '';
      elements.filterStage.value = 'all';
      elements.filterOwner.value = 'all';
      elements.filterGroup.value = 'all';
      elements.filterRisk.value = 'all';
      elements.filterValidation.value = 'all';
      render();
    });

    elements.tbody.addEventListener('change', function (event) {
      var checkbox = event.target.closest('[data-case-select]');
      if (!checkbox) return;
      if (checkbox.checked) state.selectedIds.add(checkbox.value);
      else state.selectedIds.delete(checkbox.value);
      syncSelectionUi(getFilteredCases());
    });

    elements.selectAllCases.addEventListener('change', function (event) {
      var filteredCases = getFilteredCases();
      filteredCases.forEach(function (item) {
        if (event.target.checked) state.selectedIds.add(item.id);
        else state.selectedIds.delete(item.id);
      });
      render();
    });

    elements.bulkClearBtn.addEventListener('click', function () {
      state.selectedIds.clear();
      render();
    });

    elements.bulkOwnerApplyBtn.addEventListener('click', function () {
      applyOwner(elements.bulkOwnerSelect.value);
    });

    elements.bulkCollaboratorApplyBtn.addEventListener('click', function () {
      var collaboratorLabel = elements.bulkCollaboratorSelect.options[elements.bulkCollaboratorSelect.selectedIndex].text;
      if (!elements.bulkCollaboratorSelect.value || state.selectedIds.size === 0) return;
      showToast('批量指派协作者（示例）', '已选择 ' + state.selectedIds.size + ' 条，协作者：' + collaboratorLabel);
    });

    elements.bulkDueDateApplyBtn.addEventListener('click', function () {
      applyDueDate(elements.bulkDueDateInput.value);
    });

    elements.bulkTaskApplyBtn.addEventListener('click', function () {
      var taskType = elements.bulkTaskSelect.value;
      if (!taskType || state.selectedIds.size === 0) return;
      showToast('批量生成任务（示例）', '已选择 ' + state.selectedIds.size + ' 条，任务：' + taskType);
    });

    if (elements.creationFlashFilterBtn) {
      elements.creationFlashFilterBtn.addEventListener('click', function () {
        if (!state.latestFlash || !Array.isArray(state.latestFlash.caseIds)) return;
        var isFocused = !!state.focusIds;
        state.focusIds = isFocused ? null : new Set(state.latestFlash.caseIds);
        elements.creationFlashFilterBtn.textContent = isFocused ? '仅看本次结果' : '查看全部案件';
        render();
      });
    }

    if (elements.creationFlashDismiss) {
      elements.creationFlashDismiss.addEventListener('click', function () {
        if (elements.creationFlashBanner) elements.creationFlashBanner.classList.add('hidden');
      });
    }

    bootstrapDraftCases();
    state.latestFlash = loadFlash();
    if (state.latestFlash && elements.creationFlashBanner) {
      elements.creationFlashBanner.classList.remove('hidden');
      elements.creationFlashTitle.textContent = state.latestFlash.isFamilyBulk
        ? '家族批量建案已进入列表'
        : '新建案件已进入列表';
      elements.creationFlashDesc.textContent = state.latestFlash.isFamilyBulk
        ? '刚刚为 ' + state.latestFlash.primaryName + ' 创建了 ' + state.latestFlash.count + ' 个“' + state.latestFlash.templateLabel + ' / ' + state.latestFlash.applicationType + '”案件，可继续补录资料与分派任务。'
        : '刚刚创建了 1 个“' + state.latestFlash.templateLabel + ' / ' + state.latestFlash.applicationType + '”案件，可继续补录资料与分派任务。';
      showToast(elements.creationFlashTitle.textContent, elements.creationFlashDesc.textContent);
    }

    render();
  });
})();
