(function () {
  'use strict';

  var app = window.CustomerDetailPage;
  if (!app) return;

  app.getFilteredRelations = function () {
    var relations = app.state.store && Array.isArray(app.state.store.relations) ? app.state.store.relations : [];
    var query = String(app.state.relationsSearch || '').trim().toLowerCase();

    return relations.filter(function (relation) {
      if (!query) return true;

      var haystack = [
        relation.name,
        relation.kana,
        relation.phone,
        relation.email,
        Array.isArray(relation.tags) ? relation.tags.join(' ') : '',
        relation.note,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.indexOf(query) >= 0;
    });
  };

  app.renderRelationsTable = function () {
    var tbody = app.$('[data-customer-relations-body]');
    if (!tbody) return;

    tbody.innerHTML = '';

    var filtered = app.getFilteredRelations();
    app.setText('[data-relations-count]', String(filtered.length));

    var selectAll = document.getElementById('customerSelectAllRelations');
    if (selectAll) {
      if (!filtered.length) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        app.setDisabled(selectAll, true);
      } else {
        app.setDisabled(selectAll, false);
        var selectedCount = filtered.filter(function (relation) {
          return Boolean(app.state.relationsSelected[String(relation.id)]);
        }).length;
        selectAll.checked = selectedCount > 0 && selectedCount === filtered.length;
        selectAll.indeterminate = selectedCount > 0 && selectedCount < filtered.length;
      }
    }

    var batchBtn = document.getElementById('customerRelationsBatchCreateBtn');
    var anySelected = filtered.some(function (relation) {
      return Boolean(app.state.relationsSelected[String(relation.id)]);
    });
    app.setDisabled(batchBtn, !anySelected);

    if (!filtered.length) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 6;
      emptyCell.className = 'px-6 py-10';

      var wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center text-center';

      var icon = document.createElement('div');
      icon.className =
        'w-14 h-14 rounded-2xl bg-[#fbfbfd] border border-[var(--border)] flex items-center justify-center text-[var(--muted-2)]';
      icon.innerHTML =
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';

      var title = document.createElement('div');
      title.className = 'mt-4 text-[17px] font-semibold text-[var(--apple-text-main)]';
      title.textContent = app.state.relationsSearch ? '未找到匹配的关联人' : '暂无关联人';

      var desc = document.createElement('div');
      desc.className = 'mt-2 text-[13px] text-[var(--apple-text-tert)] font-semibold max-w-md';
      desc.textContent = app.state.relationsSearch
        ? '尝试更换关键词，或新增关联人。'
        : '先添加关键关系人，后续可基于选中关联人快速建案（示例）。';

      wrapper.appendChild(icon);
      wrapper.appendChild(title);
      wrapper.appendChild(desc);
      emptyCell.appendChild(wrapper);
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    filtered.forEach(function (relation) {
      var row = document.createElement('tr');
      row.className = 'transition-colors hover:bg-[var(--surface-2)]';

      var selectCell = document.createElement('td');
      selectCell.className = 'px-4 py-3';
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'table-checkbox';
      checkbox.checked = Boolean(app.state.relationsSelected[String(relation.id)]);
      checkbox.setAttribute('aria-label', '选择关联人');
      checkbox.addEventListener('change', function () {
        app.state.relationsSelected[String(relation.id)] = checkbox.checked;
        app.renderRelationsTable();
      });
      selectCell.appendChild(checkbox);

      var nameCell = document.createElement('td');
      nameCell.className = 'px-4 py-3';
      var nameLine = document.createElement('div');
      nameLine.className = 'font-extrabold text-[var(--apple-text-main)]';
      nameLine.textContent = String(relation.name || '—');
      var subLine = document.createElement('div');
      subLine.className = 'mt-0.5 text-[12px] text-[var(--apple-text-tert)] font-semibold';
      subLine.textContent = relation.kana ? String(relation.kana) : '—';
      nameCell.appendChild(nameLine);
      nameCell.appendChild(subLine);

      var typeCell = document.createElement('td');
      typeCell.className = 'px-4 py-3 text-[var(--muted)] font-semibold';
      typeCell.textContent = app.getRelationTypeLabel(relation.relationType);

      var contactCell = document.createElement('td');
      contactCell.className = 'px-4 py-3 text-[var(--muted)] font-semibold hidden md:table-cell';
      var phoneLine = document.createElement('div');
      phoneLine.textContent = relation.phone ? String(relation.phone) : '—';
      var emailLine = document.createElement('div');
      emailLine.className = 'mt-0.5 text-[12px] text-[var(--apple-text-tert)] font-semibold';
      emailLine.textContent = relation.email ? String(relation.email) : '—';
      contactCell.appendChild(phoneLine);
      contactCell.appendChild(emailLine);

      var tagsCell = document.createElement('td');
      tagsCell.className = 'px-4 py-3 hidden lg:table-cell';
      var tags = Array.isArray(relation.tags) ? relation.tags : [];
      if (!tags.length) {
        var dash = document.createElement('div');
        dash.className = 'text-[12px] text-[var(--apple-text-tert)] font-semibold';
        dash.textContent = '—';
        tagsCell.appendChild(dash);
      } else {
        var tagWrap = document.createElement('div');
        tagWrap.className = 'flex flex-wrap gap-1.5';
        tags.slice(0, 4).forEach(function (tag) {
          var chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = String(tag);
          tagWrap.appendChild(chip);
        });
        if (tags.length > 4) {
          var more = document.createElement('span');
          more.className = 'chip';
          more.textContent = '+' + String(tags.length - 4);
          tagWrap.appendChild(more);
        }
        tagsCell.appendChild(tagWrap);
      }

      var noteCell = document.createElement('td');
      noteCell.className = 'px-4 py-3 text-[var(--muted)] font-semibold hidden lg:table-cell';
      noteCell.textContent = relation.note ? String(relation.note) : '—';

      var actionCell = document.createElement('td');
      actionCell.className = 'px-4 py-3';
      var actions = document.createElement('div');
      actions.className = 'table-actions';

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'table-icon-btn row-quick-action';
      editBtn.setAttribute('aria-label', '编辑');
      editBtn.innerHTML =
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
      editBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        app.openRelationModal(relation.id, editBtn);
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'table-icon-btn row-quick-action';
      deleteBtn.setAttribute('aria-label', '解绑');
      deleteBtn.innerHTML =
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m3-3h4a1 1 0 011 1v2H9V5a1 1 0 011-1z"></path></svg>';
      deleteBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        app.openConfirm({
          title: '解绑关联人？',
          desc: '解绑后不会删除该人的历史沟通记录（示例）。',
          okText: '解绑',
          cancelText: '取消',
          triggerEl: deleteBtn,
          onOk: function () {
            if (!app.state.store) return;

            var relationId = String(relation.id || '');
            app.state.store.relations = (app.state.store.relations || []).filter(function (item) {
              return String(item.id) !== relationId;
            });
            app.state.relationsSelected[relationId] = false;

            app.persistStore();
            app.addLogEntry({
              type: 'relation',
              actor: 'Admin',
              message: '解绑关联人：' + String(relation.name || '') + '（' + String(relationId) + '）',
              at: new Date().toISOString().slice(0, 16),
            });

            app.renderRelationsTable();
            if (app.renderLogs) app.renderLogs();
            app.closeConfirm();
            app.showToast({ title: '已解绑（示例）', desc: '关联人已移除' });
          },
        });
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      actionCell.appendChild(actions);

      row.appendChild(selectCell);
      row.appendChild(nameCell);
      row.appendChild(typeCell);
      row.appendChild(contactCell);
      row.appendChild(tagsCell);
      row.appendChild(noteCell);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
  };

  app.openRelationModal = function (relationId, triggerEl) {
    var modalEl = document.getElementById('customerRelationDialog');
    if (!modalEl) return;

    var titleEl = document.getElementById('customerRelationDialogTitle');
    var errorEl = document.getElementById('customerRelationError');
    if (errorEl) errorEl.classList.add('hidden');

    app.state.editingRelationId = relationId ? String(relationId) : '';
    var isEdit = Boolean(app.state.editingRelationId);
    if (titleEl) titleEl.textContent = isEdit ? '编辑关联人' : '新增关联人';

    var relation = null;
    if (isEdit && app.state.store && Array.isArray(app.state.store.relations)) {
      relation =
        app.state.store.relations.find(function (item) {
          return String(item.id) === app.state.editingRelationId;
        }) || null;
    }

    app.setValue('customerRelationFieldName', relation ? relation.name : '');
    app.setValue('customerRelationFieldKana', relation ? relation.kana : '');
    app.setValue('customerRelationFieldType', relation ? relation.relationType : '');
    app.setValue('customerRelationFieldPhone', relation ? relation.phone : '');
    app.setValue('customerRelationFieldEmail', relation ? relation.email : '');
    app.setValue('customerRelationFieldTags', relation && Array.isArray(relation.tags) ? relation.tags.join(', ') : '');
    app.setValue('customerRelationFieldNote', relation ? relation.note : '');

    app.openBackdropModal(modalEl, triggerEl);
  };

  app.closeRelationModal = function () {
    app.closeBackdropModal(document.getElementById('customerRelationDialog'));
    app.state.editingRelationId = null;
  };

  app.saveRelation = function () {
    if (!app.state.store) return;

    var errorEl = document.getElementById('customerRelationError');
    if (errorEl) errorEl.classList.add('hidden');

    var name = String(app.getValue('customerRelationFieldName') || '').trim();
    var kana = String(app.getValue('customerRelationFieldKana') || '').trim();
    var relationType = String(app.getValue('customerRelationFieldType') || '').trim();
    var phone = String(app.getValue('customerRelationFieldPhone') || '').trim();
    var email = String(app.getValue('customerRelationFieldEmail') || '').trim();
    var tags = app.uniq(app.parseTags(app.getValue('customerRelationFieldTags')));
    var note = String(app.getValue('customerRelationFieldNote') || '').trim();

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }

    if (!name) return showError('请填写姓名');
    if (!phone && !email) return showError('电话/邮箱至少填写一项');
    if (!relationType) return showError('请选择关系');

    var now = new Date().toISOString().slice(0, 16);
    var isEdit = Boolean(app.state.editingRelationId);
    var id = isEdit ? app.state.editingRelationId : 'REL-' + String(Date.now());
    var item = {
      id: id,
      name: name,
      kana: kana,
      relationType: relationType,
      phone: phone,
      email: email,
      tags: tags,
      note: note,
    };

    if (!Array.isArray(app.state.store.relations)) app.state.store.relations = [];

    if (isEdit) {
      app.state.store.relations = app.state.store.relations.map(function (relation) {
        return String(relation.id) === id ? item : relation;
      });
      app.addLogEntry({ type: 'relation', actor: 'Admin', message: '编辑关联人：' + name + '（' + id + '）', at: now });
      app.showToast({ title: '已保存（示例）', desc: '关联人信息已更新' });
    } else {
      app.state.store.relations = [item].concat(app.state.store.relations);
      app.addLogEntry({ type: 'relation', actor: 'Admin', message: '新增关联人：' + name + '（' + id + '）', at: now });
      app.showToast({ title: '已新增（示例）', desc: '关联人已添加到列表' });
    }

    app.persistStore();
    app.closeRelationModal();
    app.renderRelationsTable();
    if (app.renderLogs) app.renderLogs();
  };

  app.initRelations = function () {
    var searchInput = document.getElementById('customerRelationSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        app.state.relationsSearch = String(searchInput.value || '');
        app.renderRelationsTable();
      });
    }

    var selectAll = document.getElementById('customerSelectAllRelations');
    if (selectAll) {
      selectAll.addEventListener('change', function () {
        app.getFilteredRelations().forEach(function (relation) {
          app.state.relationsSelected[String(relation.id)] = selectAll.checked;
        });
        app.renderRelationsTable();
      });
    }
  };

  app.initRelationDialog = function () {
    var modalEl = document.getElementById('customerRelationDialog');
    if (!modalEl) return;

    app.setupModalDismiss(modalEl, ['customerRelationCloseBtn', 'customerRelationCancelBtn']);

    var saveBtn = document.getElementById('customerRelationSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', app.saveRelation);
  };

  app.registerInit(function () {
    app.initRelations();
    app.initRelationDialog();
    app.renderRelationsTable();
  });
})();
