# 案件详情页 — 可测试面分析

> Produced by `plan-test-surface` task.
> Input: 6 个拆分后脚本 (`RT` / `TAB` / `REN` / `DOC` / `ACT` / `BOOT`).

---

## 1 纯函数清单

下列函数输入确定、输出确定、无 DOM 副作用，理论上可脱离浏览器独立测试。

### 1.1 Runtime (RT) — `case-detail-runtime.js`

| Function | Signature | 可测等级 | 说明 |
|---|---|---|---|
| `esc(str)` | `string → string` | ★★★ | HTML 实体转义，纯字符串变换 |
| `avatarBg(style)` | `string → string` | ★★★ | CSS class 映射 |
| `avatarTextColor(style)` | `string → string` | ★★★ | CSS class 映射 |
| `severityColor(severity)` | `string → string` | ★★★ | CSS var 映射 |
| `severityBgClass(severity)` | `string → string` | ★★★ | CSS class 映射 |
| `chipClass(color)` | `string → string` | ★★★ | CSS class 映射 |
| `billingBadge(status)` | `string → string` | ★★☆ | 依赖 `BILLING_STATUS` config 全局 |

### 1.2 Renderers (REN) — `case-detail-renderers.js`

| Function | Signature | 可测等级 | 说明 |
|---|---|---|---|
| `docStatusIcon(status)` | `string → string(SVG)` | ★★★ | 状态 → SVG HTML 映射 |
| `docBadgeClass(status)` | `string → string` | ★★★ | 状态 → CSS badge 映射 |
| `reviewActionLabel(action)` | `string → string` | ★★★ | 审核动作 → 文案映射 |
| `reviewActionBadge(action)` | `string → string` | ★★★ | 审核动作 → badge 映射 |
| `taskAvatarColor(color)` | `string → string` | ★★★ | CSS class 映射 |
| `taskDueBadge(due, dueColor)` | `(string, string) → string(HTML)` | ★★☆ | 返回 HTML 片段 |
| `formatObjectType(entry)` | `object → string` | ★★★ | 日志对象类型格式化，依赖 `ns.esc` |

### 1.3 Documents (DOC) — `case-detail-documents.js`

| Function | Signature | 可测等级 | 说明 |
|---|---|---|---|
| `itemHasExpandable(item)` | `object → boolean` | ★★★ | 资料项是否有可展开面板 |
| `_validatePath(val)` | `string → boolean` | ★★☆ | 归档路径校验，依赖 `DETAIL_PATH_RULES` config |
| `renderVersionTable(versions)` | `array → string(HTML)` | ★★☆ | HTML builder，依赖 `ns.esc` |
| `renderReferenceInfo(item)` | `object → string(HTML)` | ★★☆ | HTML builder |
| `renderReviewHistory(item)` | `object → string(HTML)` | ★★☆ | HTML builder |
| `renderReminderHistory(item)` | `object → string(HTML)` | ★★☆ | HTML builder |
| `renderInlineActions(item)` | `object → string(HTML)` | ★★☆ | HTML builder |
| `renderDetailPanel(item)` | `object → string(HTML)` | ★★☆ | 组合多个 sub-renderer |
| `_recalcProgress()` | `() → void` | ★☆☆ | 读 `DETAIL_SAMPLES` + 写 DOM，需重构后可测 |

### 1.4 Stage Actions (ACT) — `case-detail-stage-actions.js`

| Function | Signature | 可测等级 | 说明 |
|---|---|---|---|
| `_getStageActions()` | `() → Array<{icon, label, handler}>` | ★★☆ | S1–S9 + 经管签后置动作映射，依赖 `ns.liveState` |
| `_refreshActionLabel()` | `() → void` | ★☆☆ | 读 `liveState` + 写 DOM，需重构后可测 |

---

## 2 测试基础设施现状

| 项目 | 现状 |
|---|---|
| Test runner | Node.js 内置 `node:test`（无 vitest/jest） |
| 已有测试 | `packages/prototype/src/pages/admin/case-create.page.test.js`（1 个文件，ES module import） |
| 脚本模块格式 | IIFE + `window.CaseDetailPage` 命名空间（非 ES module） |
| DOM 依赖 | 大部分函数通过 `document.getElementById` 读写 DOM |

**核心障碍：** 详情页脚本使用 IIFE 挂载到 `window`，不导出 ES module 符号。现有 `node:test` 方案无法直接 `import` 这些函数，除非：

1. 将纯函数抽离为独立 ES module 工具文件并 re-export
2. 或在测试中模拟 `window` / `document` 全局对象后 `eval` 脚本

方案 1 需要修改脚本结构（从 IIFE 中抽出纯函数层），方案 2 脆弱且维护成本高。

---

## 3 结论与建议

### 3.1 当前阶段：以页面级回归为主

鉴于以下因素，P0 阶段不建议投入构建测试适配层：

- 原型脚本以 IIFE + 全局变量方式运行，非 ES module 导出
- 纯函数大多是简单的映射表（3–5 行 if/return），出错概率低
- 拆分后每个脚本职责单一，手动回归可覆盖绝大多数交互
- 原型代码不会直接进入生产；生产侧有独立的 domain/model 层和正式测试

**回归覆盖重点（参照 P0-CONTRACT-DETAIL.md）：**

1. Tab 切换 — 10 个 Tab 全部可切换且内容不为空
2. 样本切换 — 6 种场景（work / family / gate-failed / debt-submit / correction / archived）
3. 资料动作 — approve / reject / waive / register / reference / remind 六种 modal
4. 风险确认 — 弹窗触发、确认提交、记录展示
5. 阶段推进 — S1→S9 全流程 + 经管签后置分支
6. 只读态 — S9 banner + 字段/按钮禁用
7. 日志筛选 — 三分类切换
8. 收费入口 — 登记回款 + 回执
9. 概览跳转 — validation/billing/deadlines/log 快捷链接
10. 资料完成率 — 操作后进度条与数字同步

### 3.2 生产落地时可测的重点逻辑

以下逻辑在迁入生产 domain/model 层时应优先补单测：

| 生产目标 | 源函数 | 测试要点 |
|---|---|---|
| `caseConstants.ts` | `docBadgeClass`, `billingBadge` 等映射 | 所有状态枚举 → 正确 class/label |
| `useCaseDocumentList.ts` | `_recalcProgress`, `itemHasExpandable` | 完成率计算边界（0/全部/含 waived） |
| `useCaseStageActions.ts` | `_getStageActions` | 每阶段 × 每 postApproval 子状态 → 正确动作列表 |
| `domain/case` validators | `_validatePath` | 禁止字符、前缀、空值 |
