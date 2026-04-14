(function () {
  'use strict';

  var app = window.CustomerDetailPage;
  if (!app) return;

  app.getCommVisibilityChipClass = function (visibility) {
    return String(visibility) === 'customer'
      ? 'chip bg-[rgba(0,113,227,0.08)] border-[rgba(0,113,227,0.18)] text-[var(--apple-blue)]'
      : 'chip';
  };

  app.getCommTypeChipClass = function (type) {
    var value = String(type || '');
    if (value === 'email') return 'chip bg-[rgba(99,102,241,0.08)] border-[rgba(99,102,241,0.18)] text-[rgb(79,70,229)]';
    if (value === 'meeting') return 'chip bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.18)] text-[rgb(22,163,74)]';
    if (value === 'phone') return 'chip bg-[rgba(249,115,22,0.08)] border-[rgba(249,115,22,0.18)] text-[rgb(234,88,12)]';
    return 'chip bg-[rgba(15,23,42,0.04)] border-[rgba(15,23,42,0.08)] text-[var(--apple-text-main)]';
  };

  app.getCommDotClass = function (visibility) {
    return String(visibility) === 'customer' ? 'bg-[var(--apple-blue)]' : 'bg-[var(--muted-2)]';
  };

  app.renderComms = function () {
    var wrap = app.$('[data-customer-comms-list]');
    var empty = document.getElementById('customerCommsEmpty');
    if (!wrap || !empty) return;

    wrap.innerHTML = '';

    var comms = app.state.store && Array.isArray(app.state.store.comms) ? app.state.store.comms : [];
    app.setText('[data-comm-total]', String(comms.length));
    app.setText(
      '[data-comm-internal]',
      String(
        comms.filter(function (item) {
          return String(item && item.visibility) === 'internal';
        }).length
      )
    );
    app.setText(
      '[data-comm-customer]',
      String(
        comms.filter(function (item) {
          return String(item && item.visibility) === 'customer';
        }).length
      )
    );

    var filtered = comms.filter(function (item) {
      if (app.state.commFilter === 'internal') return String(item.visibility) === 'internal';
      if (app.state.commFilter === 'customer') return String(item.visibility) === 'customer';
      return true;
    });

    app.setVisible(empty, filtered.length === 0);
    if (!filtered.length) return;

    var timeline = document.createElement('div');
    timeline.className = 'relative pl-4 md:pl-5 border border-[var(--border)] rounded-2xl p-4 md:p-5 bg-[var(--surface)]';
    var axis = document.createElement('div');
    axis.className = 'absolute left-[11px] md:left-[15px] top-5 bottom-5 w-px bg-[var(--border)]';
    timeline.appendChild(axis);

    filtered
      .slice()
      .sort(function (a, b) {
        return String(b.occurredAt || '').localeCompare(String(a.occurredAt || ''));
      })
      .forEach(function (item, index, list) {
        var row = document.createElement('div');
        row.className = 'relative pl-7 md:pl-9' + (index < list.length - 1 ? ' pb-4 md:pb-5' : '');

        var dot = document.createElement('div');
        dot.className =
          'absolute left-[2px] md:left-[6px] top-5 w-4 h-4 rounded-full border-4 border-white shadow-sm ' + app.getCommDotClass(item.visibility);
        row.appendChild(dot);

        var card = document.createElement('div');
        card.className = 'rounded-2xl border border-[var(--border)] bg-white px-4 py-4 md:px-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]';

        var header = document.createElement('div');
        header.className = 'flex flex-col gap-3 md:flex-row md:items-start md:justify-between';

        var left = document.createElement('div');
        left.className = 'min-w-0';
        var title = document.createElement('div');
        title.className = 'text-[14px] font-extrabold text-[var(--apple-text-main)] leading-6';
        title.textContent = String(item.summary || '—');
        var meta = document.createElement('div');
        meta.className = 'mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--apple-text-tert)] font-semibold';
        meta.textContent =
          app.formatDateTime(item.occurredAt) +
          ' · ' +
          app.getCommTypeLabel(item.type) +
          ' · ' +
          (item.actor ? String(item.actor) : '—');
        left.appendChild(title);
        left.appendChild(meta);

        var right = document.createElement('div');
        right.className = 'flex flex-wrap items-center gap-2 shrink-0';
        var typeChip = document.createElement('span');
        typeChip.className = app.getCommTypeChipClass(item.type);
        typeChip.textContent = app.getCommTypeLabel(item.type);
        var visibilityChip = document.createElement('span');
        visibilityChip.className = app.getCommVisibilityChipClass(item.visibility);
        visibilityChip.textContent = app.getVisibilityLabel(item.visibility);
        right.appendChild(typeChip);
        right.appendChild(visibilityChip);

        header.appendChild(left);
        header.appendChild(right);
        card.appendChild(header);

        if (item.detail) {
          var detail = document.createElement('div');
          detail.className = 'mt-3 text-[13px] text-[var(--muted)] font-semibold leading-6';
          detail.textContent = String(item.detail);
          card.appendChild(detail);
        }

        var footer = document.createElement('div');
        footer.className = 'mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between';

        if (item.nextAction) {
          var nextActionWrap = document.createElement('div');
          nextActionWrap.className = 'flex-1 rounded-xl bg-[rgba(0,113,227,0.06)] border border-[rgba(0,113,227,0.12)] px-3 py-2.5';
          var nextActionLabel = document.createElement('span');
          nextActionLabel.className = 'block text-[11px] font-extrabold text-[var(--apple-blue)] uppercase tracking-wide';
          nextActionLabel.textContent = '下一步';
          var nextActionText = document.createElement('span');
          nextActionText.className = 'mt-1 block text-[13px] text-[var(--apple-blue)] font-semibold leading-6';
          nextActionText.textContent = String(item.nextAction);
          nextActionWrap.appendChild(nextActionLabel);
          nextActionWrap.appendChild(nextActionText);
          footer.appendChild(nextActionWrap);
        }

        var actions = document.createElement('div');
        actions.className = 'flex items-center justify-end gap-2 md:shrink-0';

        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-secondary px-3 py-2 text-[13px]';
        editBtn.textContent = '编辑';
        editBtn.addEventListener('click', function () {
          app.openCommModal(item.id, editBtn);
        });

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-secondary px-3 py-2 text-[13px]';
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', function () {
          app.openConfirm({
            title: '删除沟通记录？',
            desc: '该操作仅为原型演示，会写入本地记录。',
            okText: '删除',
            cancelText: '取消',
            triggerEl: deleteBtn,
            onOk: function () {
              if (!app.state.store) return;

              var id = String(item.id || '');
              app.state.store.comms = (app.state.store.comms || []).filter(function (comm) {
                return String(comm.id) !== id;
              });

              app.persistStore();
              app.addLogEntry({
                type: 'comm',
                actor: 'Admin',
                message: '删除沟通记录：' + String(item.summary || '') + '（' + String(id) + '）',
                at: new Date().toISOString().slice(0, 16),
              });

              app.renderComms();
              if (app.renderLogs) app.renderLogs();
              app.closeConfirm();
              app.showToast({ title: '已删除（示例）', desc: '沟通记录已移除' });
            },
          });
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        footer.appendChild(actions);
        card.appendChild(footer);
        row.appendChild(card);
        timeline.appendChild(row);
      });

    wrap.appendChild(timeline);
  };

  app.syncCommFilterUI = function () {
    app.$$('[data-comm-filter]').forEach(function (button) {
      var isActive = button.getAttribute('data-comm-filter') === app.state.commFilter;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  app.setCommFilter = function (filter) {
    app.state.commFilter = filter || 'all';
    app.syncCommFilterUI();
    app.renderComms();
  };

  app.openCommModal = function (commId, triggerEl) {
    var modalEl = document.getElementById('customerCommDialog');
    if (!modalEl) return;

    var titleEl = document.getElementById('customerCommDialogTitle');
    var errorEl = document.getElementById('customerCommError');
    if (errorEl) errorEl.classList.add('hidden');

    app.state.editingCommId = commId ? String(commId) : '';
    var isEdit = Boolean(app.state.editingCommId);
    if (titleEl) titleEl.textContent = isEdit ? '编辑沟通记录' : '记录沟通';

    var item = null;
    if (isEdit && app.state.store && Array.isArray(app.state.store.comms)) {
      item =
        app.state.store.comms.find(function (comm) {
          return String(comm.id) === app.state.editingCommId;
        }) || null;
    }

    var now = new Date();
    var nowValue =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0') +
      'T' +
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0');

    app.setValue('customerCommFieldType', item ? item.type : 'wechat');
    app.setValue('customerCommFieldOccurredAt', item ? item.occurredAt : nowValue);
    app.setValue('customerCommFieldVisibility', item ? item.visibility : 'internal');
    app.setValue(
      'customerCommFieldActor',
      item ? item.actor : app.getOwnerLabel(app.state.store && app.state.store.customer ? app.state.store.customer.owner : '') || 'Admin'
    );
    app.setValue('customerCommFieldSummary', item ? item.summary : '');
    var detailEl = document.getElementById('customerCommFieldDetail');
    if (detailEl) detailEl.value = item ? String(item.detail || '') : '';
    app.setValue('customerCommFieldNextAction', item ? item.nextAction || '' : '');

    app.openBackdropModal(modalEl, triggerEl);
  };

  app.closeCommModal = function () {
    app.closeBackdropModal(document.getElementById('customerCommDialog'));
    app.state.editingCommId = null;
  };

  app.saveComm = function () {
    if (!app.state.store) return;

    var errorEl = document.getElementById('customerCommError');
    if (errorEl) errorEl.classList.add('hidden');

    var type = String(app.getValue('customerCommFieldType') || '').trim();
    var occurredAt = String(app.getValue('customerCommFieldOccurredAt') || '').trim();
    var visibility = String(app.getValue('customerCommFieldVisibility') || '').trim();
    var actor = String(app.getValue('customerCommFieldActor') || '').trim();
    var summary = String(app.getValue('customerCommFieldSummary') || '').trim();
    var detailEl = document.getElementById('customerCommFieldDetail');
    var detail = detailEl ? String(detailEl.value || '').trim() : '';
    var nextAction = String(app.getValue('customerCommFieldNextAction') || '').trim();

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }

    if (!type) return showError('请选择渠道');
    if (!occurredAt) return showError('请填写时间');
    if (!visibility) return showError('请选择可见范围');
    if (!summary) return showError('请填写摘要');

    var isEdit = Boolean(app.state.editingCommId);
    var id = isEdit ? app.state.editingCommId : 'COM-' + String(Date.now());
    var item = {
      id: id,
      type: type,
      visibility: visibility,
      occurredAt: occurredAt,
      summary: summary,
      detail: detail,
      nextAction: nextAction,
      actor: actor || 'Admin',
    };

    if (!Array.isArray(app.state.store.comms)) app.state.store.comms = [];

    if (isEdit) {
      app.state.store.comms = app.state.store.comms.map(function (comm) {
        return String(comm.id) === id ? item : comm;
      });
      app.addLogEntry({
        type: 'comm',
        actor: item.actor,
        message: '编辑沟通记录：' + summary + '（' + id + '）',
        at: new Date().toISOString().slice(0, 16),
      });
      app.showToast({ title: '已保存（示例）', desc: '沟通记录已更新' });
    } else {
      app.state.store.comms = [item].concat(app.state.store.comms);
      app.addLogEntry({
        type: 'comm',
        actor: item.actor,
        message:
          '新增沟通记录：' +
          app.getCommTypeLabel(type) +
          ' · ' +
          summary +
          '（' +
          (visibility === 'customer' ? '客户可见' : '内部') +
          '）',
        at: new Date().toISOString().slice(0, 16),
      });
      app.showToast({ title: '已新增（示例）', desc: '沟通记录已添加到时间线' });
    }

    var customer = app.state.store.customer;
    if (customer) {
      customer.lastContact = {
        date: app.toDateOnly(occurredAt),
        channel: app.getCommTypeLabel(type),
      };
      app.state.store.customer = customer;
      app.persistStore();
      if (app.applyHeader) app.applyHeader(customer);
    } else {
      app.persistStore();
    }

    app.closeCommModal();
    app.renderComms();
    if (app.renderLogs) app.renderLogs();
  };

  app.initComms = function () {
    app.$$('[data-comm-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        app.setCommFilter(button.getAttribute('data-comm-filter'));
      });
    });
    app.syncCommFilterUI();
  };

  app.initCommDialog = function () {
    var modalEl = document.getElementById('customerCommDialog');
    if (!modalEl) return;

    app.setupModalDismiss(modalEl, ['customerCommCloseBtn', 'customerCommCancelBtn']);

    var saveBtn = document.getElementById('customerCommSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', app.saveComm);
  };

  app.registerInit(function () {
    app.initComms();
    app.initCommDialog();
    app.renderComms();
  });
})();
