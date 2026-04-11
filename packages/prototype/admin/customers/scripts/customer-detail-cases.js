(function () {
  'use strict';

  var app = window.CustomerDetailPage;
  if (!app) return;

  app.getCaseAnchorId = function (caseId) {
    return 'case-row-' + String(caseId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  };

  app.focusAndHighlight = function (element) {
    if (!element) return;

    var prefersReducedMotion = false;
    try {
      prefersReducedMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (error) {
      prefersReducedMotion = false;
    }

    element.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });
    element.classList.add('ring-2', 'ring-[var(--apple-blue)]', 'bg-[#eef2ff]');
    window.setTimeout(function () {
      element.classList.remove('ring-2', 'ring-[var(--apple-blue)]', 'bg-[#eef2ff]');
    }, 1400);
  };

  app.navigateToCase = function (caseId) {
    app.requestTabChange('cases');
    window.setTimeout(function () {
      var row = document.getElementById(app.getCaseAnchorId(caseId));
      if (row) app.focusAndHighlight(row);
    }, 0);
  };

  app.getFilteredCases = function () {
    var cases = app.state.store && Array.isArray(app.state.store.cases) ? app.state.store.cases : [];
    if (app.state.caseFilter === 'active') {
      return cases.filter(function (item) {
        return String(item.status) === 'active';
      });
    }
    if (app.state.caseFilter === 'archived') {
      return cases.filter(function (item) {
        return String(item.status) === 'archived';
      });
    }
    return cases.slice();
  };

  app.renderCasesTable = function () {
    var tbody = app.$('[data-cases-table-body]');
    if (!tbody) return;

    tbody.innerHTML = '';

    var cases = app.getFilteredCases();
    if (!cases.length) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 6;
      emptyCell.className = 'px-6 py-10 text-center text-[13px] text-[var(--muted-2)] font-semibold';
      emptyCell.textContent =
        app.state.caseFilter === 'active'
          ? '暂无活跃案件'
          : app.state.caseFilter === 'archived'
            ? '暂无已归档案件'
            : '暂无关联案件';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    cases.forEach(function (caseItem) {
      var row = document.createElement('tr');
      row.id = app.getCaseAnchorId(caseItem.id);
      row.setAttribute('data-case-id', caseItem.id);
      row.className = 'transition-colors hover:bg-[var(--surface-2)]';

      var idCell = document.createElement('td');
      idCell.className = 'px-4 py-3 font-extrabold text-[var(--apple-text-main)] whitespace-nowrap';
      idCell.textContent = caseItem.id;

      var nameCell = document.createElement('td');
      nameCell.className = 'px-4 py-3';
      var nameButton = document.createElement('button');
      nameButton.type = 'button';
      nameButton.className = 'text-left font-extrabold text-[var(--apple-blue)] hover:underline';
      nameButton.textContent = caseItem.name;
      nameButton.addEventListener('click', function () {
        window.location.href = '../case/detail.html?id=' + encodeURIComponent(caseItem.id);
      });
      nameCell.appendChild(nameButton);

      var typeCell = document.createElement('td');
      typeCell.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap hidden md:table-cell';
      typeCell.textContent = caseItem.type || '—';

      var stageCell = document.createElement('td');
      stageCell.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap';
      var stageLine = document.createElement('div');
      stageLine.textContent = caseItem.stage || '—';
      var ownerLine = document.createElement('div');
      ownerLine.className = 'mt-0.5 text-[12px] text-[var(--apple-text-tert)] font-semibold';
      ownerLine.textContent = '主办：' + String(caseItem.owner || '—');
      stageCell.appendChild(stageLine);
      stageCell.appendChild(ownerLine);

      var statusCell = document.createElement('td');
      statusCell.className = 'px-4 py-3';
      var statusChip = document.createElement('span');
      statusChip.className = 'chip';
      statusChip.textContent = caseItem.status === 'active' ? '活跃' : '归档';
      statusCell.appendChild(statusChip);

      var updatedAtCell = document.createElement('td');
      updatedAtCell.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap hidden lg:table-cell';
      updatedAtCell.textContent = caseItem.updatedAt || '—';

      var actionCell = document.createElement('td');
      actionCell.className = 'px-4 py-3';
      var actions = document.createElement('div');
      actions.className = 'table-actions';

      var openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'table-icon-btn row-quick-action';
      openBtn.setAttribute('aria-label', '打开案件');
      openBtn.innerHTML =
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8L13 15m-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v6"></path></svg>';
      openBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        window.location.href = '../case/detail.html?id=' + encodeURIComponent(String(caseItem.id || ''));
      });

      var toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'table-icon-btn row-quick-action';
      toggleBtn.setAttribute('aria-label', caseItem.status === 'active' ? '归档' : '恢复');
      toggleBtn.innerHTML =
        caseItem.status === 'active'
          ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7m16 0h-5m-6 0H4"></path></svg>'
          : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v16h16M8 16l3-3 2 2 5-5"></path></svg>';
      toggleBtn.addEventListener('click', function (event) {
        event.stopPropagation();

        var nextStatus = caseItem.status === 'active' ? 'archived' : 'active';
        app.openConfirm({
          title: nextStatus === 'archived' ? '归档案件？' : '恢复案件？',
          desc: '该操作仅为原型演示，会写入本地记录。',
          okText: nextStatus === 'archived' ? '归档' : '恢复',
          cancelText: '取消',
          triggerEl: toggleBtn,
          onOk: function () {
            if (!app.state.store) return;

            var caseId = String(caseItem.id || '');
            app.state.store.cases = (app.state.store.cases || []).map(function (item) {
              if (String(item.id) !== caseId) return item;

              var next = app.clone(item) || item;
              next.status = nextStatus;
              next.stage =
                nextStatus === 'archived'
                  ? '已归档'
                  : String(next.stage || '办理中').replace('已归档', '办理中');
              next.updatedAt = new Date().toISOString().slice(0, 10);
              return next;
            });

            app.persistStore();
            app.addLogEntry({
              type: 'case',
              actor: 'Admin',
              message:
                (nextStatus === 'archived' ? '归档案件：' : '恢复案件：') +
                String(caseItem.name || '') +
                '（' +
                String(caseItem.id || '') +
                '）',
              at: new Date().toISOString().slice(0, 16),
            });

            app.renderOverview();
            app.renderCasesTable();
            app.renderCasePopover();
            if (app.renderLogs) app.renderLogs();
            app.closeConfirm();
            app.showToast({
              title: '已更新（示例）',
              desc: nextStatus === 'archived' ? '案件已归档' : '案件已恢复',
            });
          },
        });
      });

      actions.appendChild(openBtn);
      actions.appendChild(toggleBtn);
      actionCell.appendChild(actions);

      row.addEventListener('click', function () {
        window.location.href = '../case/detail.html?id=' + encodeURIComponent(String(caseItem.id || ''));
      });

      row.appendChild(idCell);
      row.appendChild(nameCell);
      row.appendChild(typeCell);
      row.appendChild(stageCell);
      row.appendChild(statusCell);
      row.appendChild(updatedAtCell);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
  };

  app.renderCasePopover = function () {
    var api = app.state.casePopoverApi;
    if (!api) return;

    var cases = app.state.store && Array.isArray(app.state.store.cases) ? app.state.store.cases : [];
    if (api.title) api.title.textContent = '全部案件（' + String(cases.length) + '）';
    api.list.innerHTML = '';

    cases.forEach(function (caseItem) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className =
        'w-full text-left px-2 py-2 rounded-xl hover:bg-[var(--surface)] flex items-start justify-between gap-3';
      button.setAttribute('data-case-jump', 'true');
      button.setAttribute('data-case-id', String(caseItem.id || ''));

      var left = document.createElement('div');
      left.className = 'min-w-0';
      var name = document.createElement('div');
      name.className = 'text-[13px] font-extrabold text-[var(--apple-text-main)] truncate';
      name.textContent = String(caseItem.name || '—');
      var idLine = document.createElement('div');
      idLine.className = 'mt-0.5 text-[12px] text-[var(--apple-text-tert)] font-semibold';
      idLine.textContent = String(caseItem.id || '—');
      left.appendChild(name);
      left.appendChild(idLine);

      var right = document.createElement('div');
      right.className = 'shrink-0';
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = String(caseItem.status) === 'active' ? '活跃' : '归档';
      right.appendChild(chip);

      button.appendChild(left);
      button.appendChild(right);
      button.addEventListener('click', function () {
        api.close();
        app.navigateToCase(caseItem.id);
      });

      api.list.appendChild(button);
    });

    if (api.isOpen && api.isOpen()) api.position();
  };

  app.initCasePopover = function () {
    var moreToggle = app.$('[data-case-more-toggle]');
    var popover = document.getElementById('caseNamePopover');
    var backdrop = app.$('[data-case-more-backdrop]');
    var closeBtn = app.$('[data-case-more-close]');
    var list = app.$('[data-case-list]');
    var title = app.$('[data-case-popover-title]');

    if (!moreToggle || !popover || !backdrop || !closeBtn || !list) return;

    function isOpen() {
      return !popover.classList.contains('hidden');
    }

    function positionPopover() {
      var rect = moreToggle.getBoundingClientRect();
      var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      popover.style.left = '16px';
      popover.style.top = '16px';

      var popoverWidth = popover.offsetWidth;
      var popoverHeight = popover.offsetHeight;
      var left = Math.min(Math.max(16, rect.left), viewportWidth - popoverWidth - 16);
      var top = rect.bottom + 8;

      if (top + popoverHeight > viewportHeight - 16) {
        top = rect.top - popoverHeight - 8;
      }

      popover.style.left = left + 'px';
      popover.style.top = Math.max(16, top) + 'px';
    }

    function closePopover() {
      if (!isOpen()) return;
      app.setVisible(backdrop, false);
      app.setVisible(popover, false);
      moreToggle.setAttribute('aria-expanded', 'false');
      popover.setAttribute('aria-hidden', 'true');
      if (app.state.lastFocusEl && typeof app.state.lastFocusEl.focus === 'function') {
        app.state.lastFocusEl.focus();
      }
      app.state.lastFocusEl = null;
    }

    function openPopover() {
      if (isOpen()) return;
      app.state.lastFocusEl = document.activeElement;
      app.setVisible(backdrop, true);
      app.setVisible(popover, true);
      moreToggle.setAttribute('aria-expanded', 'true');
      popover.setAttribute('aria-hidden', 'false');
      positionPopover();

      var firstFocusable = popover.querySelector('button[data-case-jump]');
      if (firstFocusable) firstFocusable.focus();
    }

    app.state.casePopoverApi = {
      moreToggle: moreToggle,
      popover: popover,
      backdrop: backdrop,
      closeBtn: closeBtn,
      list: list,
      title: title,
      open: openPopover,
      close: closePopover,
      isOpen: isOpen,
      position: positionPopover,
    };

    moreToggle.addEventListener('click', function (event) {
      event.stopPropagation();
      if (isOpen()) closePopover();
      else openPopover();
    });

    closeBtn.addEventListener('click', closePopover);
    backdrop.addEventListener('click', closePopover);

    window.addEventListener('resize', function () {
      if (isOpen()) positionPopover();
    });

    document.addEventListener('keydown', function (event) {
      if (isOpen() && event.key === 'Escape') closePopover();
    });

    document.addEventListener('click', function (event) {
      if (!isOpen()) return;
      var target = event.target;
      if (popover.contains(target) || target === moreToggle) return;
      closePopover();
    });

    app.renderCasePopover();
  };

  app.syncCaseFilterUI = function () {
    app.$$('[data-case-filter]').forEach(function (button) {
      var isActive = button.getAttribute('data-case-filter') === app.state.caseFilter;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  app.setCaseFilter = function (filter) {
    app.state.caseFilter = filter;
    app.syncCaseFilterUI();
    app.renderCasesTable();
  };

  app.initCasesFilter = function () {
    app.$$('[data-case-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        app.setCaseFilter(button.getAttribute('data-case-filter'));
      });
    });
    app.syncCaseFilterUI();
  };

  app.registerInit(function () {
    app.initCasePopover();
    app.initCasesFilter();
    app.renderCasesTable();
  });
})();
