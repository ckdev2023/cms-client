(function () {
  'use strict';

  var app = window.CustomerDetailPage;
  if (!app) return;

  app.getLogTypeLabel = function (type) {
    return String(type) === 'relation'
      ? '关系变更'
      : String(type) === 'case'
        ? '案件'
        : String(type) === 'comm'
          ? '沟通'
          : '信息变更';
  };

  app.getLogTypeChipClass = function (type) {
    return String(type) === 'relation'
      ? 'chip bg-[rgba(168,85,247,0.08)] border-[rgba(168,85,247,0.18)] text-[rgb(147,51,234)]'
      : String(type) === 'case'
        ? 'chip bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.18)] text-[rgb(22,163,74)]'
        : String(type) === 'comm'
          ? 'chip bg-[rgba(249,115,22,0.08)] border-[rgba(249,115,22,0.18)] text-[rgb(234,88,12)]'
          : 'chip bg-[rgba(0,113,227,0.08)] border-[rgba(0,113,227,0.18)] text-[var(--apple-blue)]';
  };

  app.syncLogFilterUI = function () {
    app.$$('[data-log-filter]').forEach(function (button) {
      var isActive = button.getAttribute('data-log-filter') === app.state.logFilter;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  app.getFilteredLogs = function () {
    var logs = app.state.store && Array.isArray(app.state.store.logs) ? app.state.store.logs : [];
    if (app.state.logFilter === 'all') return logs.slice();
    return logs.filter(function (item) {
      return String(item.type) === String(app.state.logFilter);
    });
  };

  app.clampLogPage = function (page, totalPages) {
    var next = Number(page) || 1;
    if (next < 1) next = 1;
    if (totalPages && next > totalPages) next = totalPages;
    return next;
  };

  app.renderLogs = function () {
    var tbody = app.$('[data-customer-log-body]');
    if (!tbody) return;

    var tableWrap = document.getElementById('customerLogsTableWrap');
    var empty = document.getElementById('customerLogsEmpty');

    tbody.innerHTML = '';

    var list = app
      .getFilteredLogs()
      .slice()
      .sort(function (a, b) {
        return String(b.at || '').localeCompare(String(a.at || ''));
      });

    var total = list.length;
    var totalPages = Math.max(1, Math.ceil(total / app.state.logPageSize));
    app.state.logPage = app.clampLogPage(app.state.logPage, totalPages);

    app.setText('[data-log-total]', String(total));
    app.setText('[data-log-page]', String(app.state.logPage));
    app.setText('[data-log-pages]', String(totalPages));

    var prevBtn = document.getElementById('customerLogPrevBtn');
    var nextBtn = document.getElementById('customerLogNextBtn');
    app.setDisabled(prevBtn, app.state.logPage <= 1);
    app.setDisabled(nextBtn, app.state.logPage >= totalPages);

    if (!total) {
      app.setVisible(tableWrap, false);
      app.setVisible(empty, true);
      return;
    }

    app.setVisible(tableWrap, true);
    app.setVisible(empty, false);

    var start = (app.state.logPage - 1) * app.state.logPageSize;
    list.slice(start, start + app.state.logPageSize).forEach(function (item) {
      var row = document.createElement('tr');
      row.className = 'transition-colors hover:bg-[var(--surface-2)]';

      var atCell = document.createElement('td');
      atCell.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap';
      atCell.textContent = app.formatDateTime(item.at);

      var typeCell = document.createElement('td');
      typeCell.className = 'px-4 py-3';
      var chip = document.createElement('span');
      chip.className = app.getLogTypeChipClass(item.type);
      chip.textContent = app.getLogTypeLabel(item.type);
      typeCell.appendChild(chip);

      var messageCell = document.createElement('td');
      messageCell.className = 'px-4 py-3 text-[var(--muted)] font-semibold leading-6';
      messageCell.textContent = String(item.message || '—');

      var actorCell = document.createElement('td');
      actorCell.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap';
      actorCell.textContent = String(item.actor || '—');

      row.appendChild(atCell);
      row.appendChild(typeCell);
      row.appendChild(messageCell);
      row.appendChild(actorCell);
      tbody.appendChild(row);
    });
  };

  app.setLogFilter = function (filter) {
    app.state.logFilter = filter || 'all';
    app.state.logPage = 1;
    app.syncLogFilterUI();
    app.renderLogs();
  };

  app.initLogs = function () {
    app.$$('[data-log-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        app.setLogFilter(button.getAttribute('data-log-filter'));
      });
    });
    app.syncLogFilterUI();

    var prevBtn = document.getElementById('customerLogPrevBtn');
    var nextBtn = document.getElementById('customerLogNextBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        app.state.logPage = Math.max(1, (app.state.logPage || 1) - 1);
        app.renderLogs();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        app.state.logPage = (app.state.logPage || 1) + 1;
        app.renderLogs();
      });
    }
  };

  app.registerInit(function () {
    app.initLogs();
    app.renderLogs();
  });
})();
