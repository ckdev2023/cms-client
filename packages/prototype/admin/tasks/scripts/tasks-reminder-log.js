(function () {
  'use strict';

  var ns = (window.TasksReminderLog = {});

  ns.setup = function (callbacks) {
    var reminderLogPanel = document.getElementById('reminderLogPanel');
    var taskTableCard = document.getElementById('taskTableCard');
    var filtersToolbar = document.getElementById('filtersToolbar');
    var closeBtn = document.getElementById('closeReminderLogBtn');

    ns.showLogPanel = function () {
      if (reminderLogPanel) reminderLogPanel.classList.remove('hidden');
      if (taskTableCard) taskTableCard.classList.add('hidden');
      if (filtersToolbar) filtersToolbar.classList.add('hidden');
    };

    ns.hideLogPanel = function () {
      if (reminderLogPanel) reminderLogPanel.classList.add('hidden');
      if (taskTableCard) taskTableCard.classList.remove('hidden');
      if (filtersToolbar) filtersToolbar.classList.remove('hidden');
    };

    ns.isVisible = function () {
      return reminderLogPanel && !reminderLogPanel.classList.contains('hidden');
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        ns.hideLogPanel();
        if (callbacks && callbacks.onClose) callbacks.onClose();
      });
    }

    var logBody = document.getElementById('reminderLogBody');
    if (logBody) {
      logBody.addEventListener('click', function (e) {
        var link = e.target.closest('[data-navigate-task]');
        if (!link) return;
        e.preventDefault();
        var taskId = link.getAttribute('data-navigate-task');
        ns.hideLogPanel();
        if (callbacks && callbacks.onNavigateTask) callbacks.onNavigateTask(taskId);
      });
    }
  };
})();
