(function () {
  var config = window.DashboardConfig;

  if (!config) {
    return;
  }

  var state = {
    scope: config.defaultScope,
    windowDays: config.defaultWindow,
  };

  var renderTimer = null;
  var toastTimer = null;

  var cardNodes = [];
  var scopeButtons = [];
  var windowButtons = [];
  var scopeSummaryNode = null;
  var scopeVisibilityChipNode = null;
  var visibilityNotesNode = null;
  var toastNode = null;
  var toastTitleNode = null;
  var toastDescNode = null;
  var listNodes = {};

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getListData(key) {
    var scopeData = config.lists[state.scope] || {};
    var items = scopeData[key] || [];

    if (key === "deadlines") {
      return items.filter(function (item) {
        return item.daysLeft <= state.windowDays;
      });
    }

    return items;
  }

  function buildItemMarkup(item) {
    var meta = (item.meta || [])
      .map(function (entry) {
        return "<span>" + escapeHtml(entry) + "</span>";
      })
      .join("");

    return [
      '<article class="work-item">',
      '  <div class="work-item-head">',
      "    <div>",
      '      <h3 class="work-item-title">' + escapeHtml(item.title) + "</h3>",
      '      <div class="work-item-meta">' + meta + "</div>",
      "    </div>",
      '    <span class="status-pill ' + escapeHtml(item.status || "status-muted") + '">' + escapeHtml(item.statusLabel || "处理中") + "</span>",
      "  </div>",
      '  <p class="work-item-desc">' + escapeHtml(item.desc || "") + "</p>",
      '  <div class="work-item-actions">',
      '    <button class="mini-btn" type="button" data-row-action="true">' + escapeHtml(item.action || "查看案件") + "</button>",
      "  </div>",
      "</article>",
    ].join("");
  }

  function buildEmptyMarkup(message) {
    return '<div class="empty-state">' + escapeHtml(message) + "</div>";
  }

  function buildSkeletonMarkup(count) {
    var blocks = [];
    for (var index = 0; index < count; index += 1) {
      blocks.push('<div class="skeleton-block"></div>');
    }
    return blocks.join("");
  }

  function renderCards() {
    var scopeMetrics = config.metrics[state.scope] || {};

    cardNodes.forEach(function (cardNode) {
      var cardId = cardNode.getAttribute("data-card-id");
      var metric = scopeMetrics[cardId] || { value: "0", helper: "暂无数据", meta: "demo-only" };
      var metricValue = metric.value;
      var metricHelper = metric.helper;

      if (metric.valueByWindow) {
        metricValue = metric.valueByWindow[state.windowDays] || metric.valueByWindow[7] || "0";
      }

      if (metric.helperByWindow) {
        metricHelper = metric.helperByWindow[state.windowDays] || metric.helperByWindow[7] || "";
      }

      var valueNode = cardNode.querySelector("[data-card-value]");
      var helperNode = cardNode.querySelector("[data-card-helper]");
      var metaNode = cardNode.querySelector("[data-card-meta]");

      if (valueNode) {
        valueNode.textContent = metricValue;
      }
      if (helperNode) {
        helperNode.textContent = metricHelper;
      }
      if (metaNode) {
        metaNode.textContent = metric.meta;
      }
    });
  }

  function renderLists() {
    var listConfig = [
      {
        key: "todo",
        node: listNodes.todo,
        emptyMessage: "暂无今日待办，去查看全部案件继续排期。",
      },
      {
        key: "deadlines",
        node: listNodes.deadlines,
        emptyMessage: "当前窗口内暂无逾期或临期案件，可切换到 30 天视图继续查看。",
      },
      {
        key: "submissions",
        node: listNodes.submissions,
        emptyMessage: "暂无待提交案件，可回到案件列表继续推进前置步骤。",
      },
      {
        key: "risks",
        node: listNodes.risks,
        emptyMessage: "当前视角暂无风险案件，继续关注期限与待提交节奏。",
      },
    ];

    listConfig.forEach(function (entry) {
      if (!entry.node) {
        return;
      }

      var items = getListData(entry.key);
      entry.node.innerHTML = items.length
        ? items.map(buildItemMarkup).join("")
        : buildEmptyMarkup(entry.emptyMessage);
    });
  }

  function renderScopeNotes() {
    if (scopeSummaryNode) {
      scopeSummaryNode.textContent = config.scopeSummary[state.scope] || "";
    }

    if (scopeVisibilityChipNode) {
      var scopeLabel = config.scopeLabels[state.scope] || "";
      scopeVisibilityChipNode.textContent = scopeLabel;
    }

    if (visibilityNotesNode) {
      var notes = config.visibilityNotes[state.scope] || [];
      visibilityNotesNode.innerHTML = notes
        .map(function (note) {
          return "<div>" + escapeHtml(note) + "</div>";
        })
        .join("");
    }
  }

  function setButtonState(buttons, selectedValue, attrName) {
    buttons.forEach(function (button) {
      var isActive = button.getAttribute(attrName) === String(selectedValue);
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function renderToolbarState() {
    setButtonState(scopeButtons, state.scope, "data-scope-btn");
    setButtonState(windowButtons, state.windowDays, "data-window-btn");
  }

  function showLoadingState() {
    cardNodes.forEach(function (cardNode) {
      var valueNode = cardNode.querySelector("[data-card-value]");
      var helperNode = cardNode.querySelector("[data-card-helper]");

      if (valueNode) {
        valueNode.innerHTML = '<span class="skeleton-line" style="display:block;height:28px;width:84px;"></span>';
      }
      if (helperNode) {
        helperNode.innerHTML = '<span class="skeleton-line" style="display:block;width:100%;"></span><span class="skeleton-line" style="display:block;margin-top:8px;width:76%;"></span>';
      }
    });

    Object.keys(listNodes).forEach(function (key) {
      if (listNodes[key]) {
        listNodes[key].innerHTML = buildSkeletonMarkup(2);
      }
    });
  }

  function renderDashboard() {
    renderCards();
    renderLists();
    renderScopeNotes();
    renderToolbarState();
  }

  function scheduleRender(delay) {
    window.clearTimeout(renderTimer);
    showLoadingState();
    renderTimer = window.setTimeout(renderDashboard, delay);
  }

  function showToast(presetId) {
    var preset = config.toasts[presetId] || config.toasts.rowAction;
    if (!toastNode || !toastTitleNode || !toastDescNode) {
      return;
    }

    toastTitleNode.textContent = preset.title;
    toastDescNode.textContent = preset.desc;
    toastNode.setAttribute("data-open", "true");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastNode.setAttribute("data-open", "false");
    }, 2200);
  }

  function bindToolbar() {
    scopeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var nextScope = button.getAttribute("data-scope-btn");
        if (!nextScope || nextScope === state.scope) {
          return;
        }

        state.scope = nextScope;
        scheduleRender(180);
      });
    });

    windowButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var nextWindow = Number(button.getAttribute("data-window-btn"));
        if (!nextWindow || nextWindow === state.windowDays) {
          return;
        }

        state.windowDays = nextWindow;
        scheduleRender(180);
      });
    });

  }

  function bindActions() {
    document.addEventListener("click", function (event) {
      var actionTrigger = event.target.closest("[data-action-id]");
      if (actionTrigger) {
        var actionId = actionTrigger.getAttribute("data-action-id");
        if (actionId === "payment") {
          window.location.href = "../billing/index.html";
          return;
        }
        showToast(actionId);
        return;
      }

      var rowTrigger = event.target.closest("[data-row-action]");
      if (rowTrigger) {
        showToast("rowAction");
      }
    });
  }

  function cacheDom() {
    cardNodes = Array.prototype.slice.call(document.querySelectorAll("[data-card-id]"));
    scopeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-scope-btn]"));
    windowButtons = Array.prototype.slice.call(document.querySelectorAll("[data-window-btn]"));
    scopeSummaryNode = document.getElementById("scopeSummary");
    scopeVisibilityChipNode = document.getElementById("scopeVisibilityChip");
    visibilityNotesNode = document.getElementById("visibilityNotes");
    toastNode = document.getElementById("toast");
    toastTitleNode = document.getElementById("toastTitle");
    toastDescNode = document.getElementById("toastDesc");
    listNodes = {
      todo: document.getElementById("todoList"),
      deadlines: document.getElementById("deadlineList"),
      submissions: document.getElementById("submissionList"),
      risks: document.getElementById("riskList"),
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    cacheDom();
    bindToolbar();
    bindActions();
    scheduleRender(120);
  });
})();
