(function () {
  'use strict';

  var config = window.TasksConfig;
  var ns = (window.TasksModal = {});
  ns.mode = 'create';

  ns.setup = function () {
    var modal = document.getElementById('taskModal');
    var modalTitle = document.getElementById('modalTitle');
    var openBtn = document.getElementById('btnCreateTask');
    var closeBtn = document.getElementById('closeModalBtn');
    var cancelBtn = document.getElementById('cancelModalBtn');
    var submitBtn = document.getElementById('submitTaskBtn');

    var requiredEls = config.CREATE_REQUIRED_IDS.map(function (id) {
      return document.getElementById(id);
    }).filter(Boolean);

    ns.openModal = function (mode) {
      ns.mode = mode || 'create';
      if (modalTitle) {
        modalTitle.textContent = ns.mode === 'edit' ? '编辑任务' : '新建任务';
      }
      if (submitBtn) {
        submitBtn.textContent = ns.mode === 'edit' ? '保存' : '创建任务';
      }
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    };

    ns.closeModal = function () {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    };

    ns.resetForm = function () {
      config.FORM_FIELDS.forEach(function (field) {
        var el = document.getElementById(field.id);
        if (!el) return;
        if (field.defaultValue != null) {
          el.value = field.defaultValue;
        } else if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else {
          el.value = '';
        }
      });
      ns.updateSubmitEnabled();
    };

    ns.updateSubmitEnabled = function () {
      var allFilled = requiredEls.every(function (el) {
        return el && el.value.trim().length > 0;
      });
      if (submitBtn) submitBtn.disabled = !allFilled;
    };

    ns.serializeForm = function () {
      var state = {};
      config.FORM_FIELDS.forEach(function (f) {
        var el = document.getElementById(f.id);
        state[f.key] = el ? el.value : '';
      });
      return state;
    };

    ns.applyState = function (state) {
      if (!state) return;
      config.FORM_FIELDS.forEach(function (f) {
        var el = document.getElementById(f.id);
        if (el && state[f.key] != null) el.value = state[f.key];
      });
      ns.updateSubmitEnabled();
    };

    if (openBtn) {
      openBtn.addEventListener('click', function () {
        ns.resetForm();
        ns.openModal('create');
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', ns.closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', ns.closeModal);

    requiredEls.forEach(function (el) {
      el.addEventListener('input', ns.updateSubmitEnabled);
      el.addEventListener('change', ns.updateSubmitEnabled);
    });

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) ns.closeModal();
      });
    }
  };
})();
