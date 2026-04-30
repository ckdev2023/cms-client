# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十轮 / R9 BUG-130 已 land 验收 + 全新偏差扫描）

> 生成日期：2026-04-30（R9 同日 chrome-devtools-mcp UI 端验收 + 新偏差登记）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/15-双层状态机自动化复盘走查Bug清单-第九轮.md` §1 BUG-130（adapter 漏写 `caseNo`，半 land 回归）
> - `packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:241-306` 当前实装
> - `packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.case-no.focused.test.ts:55` 当前实装
> - `packages/admin/src/shared/ui/PageHeader.vue:50-59` 当前实装
> - `packages/admin/src/views/cases/CaseDetailView.vue:160-172, 332` 当前实装
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` + `evaluate_script` + `take_screenshot` + `take_snapshot` + `list_network_requests` + `list_console_messages` + `click` + `fill`） + `curl`（HTTP API） + 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第九轮 (`15-...md`) 互为续篇；本轮**先验 R9 BUG-130 修复，再扫面包屑/语言/网络/a11y**。

---

## 0. 第十轮总结

### 0.1 关键事件

R9 文档 §1 抓出 BUG-130「adapter `buildDetailHeader` 漏写 `caseNo`，导致 BUG-128 在 UI 上不可见」并要求三处一起改（adapter / unskip 测试 / lint）。本轮先用 `chrome-devtools-mcp` 在 admin 真实页面把 R8/R9 的 5 条逐一验收，再扫一遍其他 view 找系统性偏差：

| # | 来源 | R10 UI 验收 | 一句话结论 |
|---|---|---|---|
| BUG-116（`?tab=timeline → log` 别名） | R9 §2.1 ✅ R8 已 land | **✅ PASS（继承）** | `?tab=timeline` → 选中「日志」(`caseTab-log`)；点击日志 tab 后 URL 规范化为 `?tab=log` |
| BUG-127（列表 owner 列回显 `Local Admin`） | R9 §2.2 ✅ R8 已 land | **✅ PASS（继承）** | 19/19 行 owner = `Lo Local Admin`，0 行 NA |
| BUG-128（详情面包屑显示 caseNo） | R9 §2.4 ❌ → BUG-130 | **✅ PASS（R9 修复已 land）** | 面包屑显示 `CASE-202604-0011`，`hasCaseNoFormat=true` / `hasUuidFormat=false` |
| BUG-129（日志时间戳格式化） | R9 §2.3 ✅ R8 已 land | **✅ PASS（继承）** | 22/22 条日志条目时间戳为 `2026/04/29 19:54` 格式 |
| BUG-130（adapter `buildDetailHeader.caseNo` 透传） | R9 §1 P1 | **✅ PASS（已 land）** | adapter 添加 `caseNo: resolveCaseNo(caseRecord)`；`describe.skip` 改为 `describe`，6 个 case 全 active |

### 0.2 新增偏差

| # | 优先级 | 现象 | 根因 |
|---|---|---|---|
| **BUG-131** | P2 [FE/a11y] | 所有用 `<PageHeader :breadcrumbs>` 的页面，**面包屑中间项「业务」**也带 `aria-current="page"`（应仅最后一项），违反 ARIA 1.2 规范 | `PageHeader.vue:50-59` 用 `v-if="crumb.href"` / `v-else` 二分，没有 href 的 crumb 一律标 aria-current；中间分组 crumb（如 `{ label: t('shell.nav.groups.business') }`）也缺 href，被误标 |
| **BUG-132** | P1 [FE/i18n] | 切到 EN/JA 环境后，**案件详情页头部 stage Chip 仍渲染 `刚开始办案`** 等 zh-CN 字面（同行的 phase Chip 已正确显示 `Closed (success)`） | `CaseDetailView.vue:169` 直接 `{{ detail.stage }}`，bypass i18n；同行 `phaseLabel`（line 92-94, 172）走了 `t(getPhaseI18nKey(...))`，pattern 已存在但 stage 未对齐；line 332 `readonlyBanner` 同样把 raw `detail.stage` 插值进 i18n 文案 |

### 0.3 三句话结论

1. **R9 BUG-130 修复链路三处全到位**：adapter（`buildDetailHeader` 加 `caseNo: resolveCaseNo(caseRecord)` / `resolveCaseNo` helper trim/空串语义）、测试（`describe.skip` 改 `describe`，原 5 用例 + 1 条 R10/130 关联用例共 6 个全 active）、消费方（`CaseDetailView.vue:164` 已稳定）。R8 → R9 → R10 三轮链路修复闭环。
2. **R10 新发的两条偏差是「修一个 BUG-128 暴露了同一组件 PageHeader 的另一处遗留」**：BUG-131 是 PageHeader 自身的语义错误（无 href 不等于「当前页」），BUG-132 是 `CaseDetailView.vue` 同一头部里 stage / phase 双 Chip 仅一边走 i18n。这类「同位置不同字段同步度不一致」的偏差，建议 P0/P1 admin UI 回归冲刺收尾时统一扫一遍。
3. **测试覆盖盲区延续 R9 §0.2 第 3 句**：当前没有 i18n 切换的 e2e/integration 测试（切语言 → 关键页面 → 抓中文残留），也没有 a11y 走查（如 `[aria-current=page]` 唯一性断言）。R10 BUG-131 / 132 都属于「单个组件单测全 PASS，但跨组件/跨语言切换没断言」的盲区，与 R9 BUG-130 同根。

---

## 1. 新增 Bug

### BUG-131 [P2][FE/a11y] `PageHeader` 面包屑把所有无 href 的中间 crumb 都标 `aria-current="page"`，违反 ARIA 1.2 唯一性

- **优先级**：P2（语义错误，屏幕阅读器用户会被告知存在多个「当前页」；视觉无差异，但 axe-core / Lighthouse 会标红；影响 8+ 个 view）
- **现象**：访问 `#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=log`，整页 `[aria-current=page]` 计数 = 3：
  1. 侧边栏「案件」link（**正确**，对应当前路由）
  2. 面包屑「**业务**」span（**错误**，是 section 分组而非当前页）
  3. 面包屑「**CASE-202604-0011**」span（**正确**，是当前页）
- **UI 端取证（chrome-devtools-mcp `evaluate_script`）**：

  ```js
  // querySelectorAll('[aria-current=page]') → 3
  {
    breadcrumbs: [
      { text: "案件",            aria: "page" },   // ← 侧边栏 (正确)
      { text: "仪表盘",          aria: null   },
      { text: "业务",            aria: "page" },   // ← BUG-131 (错误，aria 应为 null)
      { text: "案件",            aria: null   },
      { text: "CASE-202604-0011", aria: "page" }   // ← 正确
    ],
    totalAriaCurrentPage: 3
  }
  ```

- **根因**：

  ```50:60:packages/admin/src/shared/ui/PageHeader.vue
  <a
    v-if="crumb.href"
    :href="crumb.href"
    class="ui-page-header__crumb ui-page-header__crumb--link"
  >
    {{ crumb.label }}
  </a>
  <span v-else class="ui-page-header__crumb" aria-current="page">
    {{ crumb.label }}
  </span>
  ```

  逻辑「crumb 没 href 就标 aria-current=page」与调用方约定不符。`CaseDetailView.vue:160-165`、`CaseListView.vue:66-70`、`BillingListView.vue:248-252`、`TaskListView.vue:95-99`、`CustomerListView.vue:305-309`、`ConversationsListView.vue:173-177`、`ConversationDetailView.vue:73-78`、`LeadsListView.vue:370-374`、`CaseCreateView.vue:227-232` 都使用 `{ label: t('shell.nav.groups.business') }`（无 href）作为中间 section 分组 crumb，全部受影响（**9 个 view，全部含 ARIA 重复 aria-current**）。

- **修复方向**：把「是否当前页」改为按索引判定，独立于 `href` 是否存在：

  ```vue
  <template v-for="(crumb, i) in breadcrumbs" :key="i">
    <span v-if="i > 0" class="ui-page-header__sep" aria-hidden="true">…</span>
    <a
      v-if="crumb.href"
      :href="crumb.href"
      class="ui-page-header__crumb ui-page-header__crumb--link"
    >{{ crumb.label }}</a>
    <span
      v-else-if="i === breadcrumbs.length - 1"
      class="ui-page-header__crumb"
      aria-current="page"
    >{{ crumb.label }}</span>
    <span v-else class="ui-page-header__crumb">{{ crumb.label }}</span>
  </template>
  ```

  CSS 选择器 `.ui-page-header__crumb[aria-current="page"]` (line 110-112) 可保留，专用于 last-crumb 视觉强调，行为与之前完全一致；中间 crumb 不再有粗体效果（如需保留视觉，可单独加 modifier class）。

- **测试补强（防回归）**：

  1. `PageHeader.test.ts` 加用例：传入 `[{ label: 'A', href: '/a' }, { label: 'B' }, { label: 'C', href: '/c' }, { label: 'D' }]`，断言 `wrapper.findAll('[aria-current=page]').length === 1` 且唯一命中是 D（最后一项）。
  2. `CaseDetailView.test.ts` 加 a11y 用例：`expect(wrapper.findAll('[aria-current=page]').length).toBe(1)`（断言面包屑作用域内）。
  3. （可选）admin 引入 `axe-core` 跑一次 e2e 视图扫描，把 `[aria-current=page]` 唯一性纳入门禁。

- **关联**：与 R9 §0.2 第 3 句「测试覆盖系统性盲区」同根；helper 单测（PageHeader）与 view 单测（CaseDetailView）单独跑都 PASS，但**没有「PageHeader 在真实 breadcrumbs 输入下 a11y 是否合规」的契约测试**。

### BUG-132 [P1][FE/i18n] `CaseDetailView` 头部 stage Chip 直接渲染 `detail.stage`（hardcoded zh-CN），切语言后中文残留 ✅ R10 已 land

- **优先级**：P1（每个非 zh-CN 用户进案件详情第一眼都中；仅头部 Chip 一行，但与同行 phase Chip 显著割裂，破坏 EN/JA 一致性）
- **现象**：`fill(uid="lang-combobox", value="English")` 后，`document.documentElement.lang = "en-US"`，但案件头部仍出现 `刚开始办案` 字面：

  ```js
  // body.innerText 抽取（EN locale）
  "...CASE-202604-0011\nR6 supplement probe\n刚开始办案\nClosed (success)\n..."
  //                                       ↑ stage chip      ↑ phase chip
  //                                       BUG-132（zh-CN 残留）  正确（已 i18n）
  ```

  其中 `R6 supplement probe`（case name）与 `R6试探客户`（customer name）属于业务数据，不参与 i18n（正确）；而 stage 标签 `刚开始办案` 与 phase 标签 `Closed (success)` 都是**枚举常量**，应一致走 i18n。

- **根因（同一文件、相邻 5 行内的不一致）**：

  ```167:173:packages/admin/src/views/cases/CaseDetailView.vue
  <template #badge>
    <Chip :tone="badgeToTone(detail.statusBadge)" size="sm" dot>
      {{ detail.stage }}
    </Chip>
    <Chip :tone="phaseTone" size="sm" dot>
      {{ phaseLabel }}
    </Chip>
  ```

  - `detail.stage` 来自 adapter `resolveStageLabel(stageId)` (`CaseAdapterShared.ts:108-110`)，注释明写「**fallback 标签（不经过 i18n）**」、`return CASE_STAGES[stageId]?.label ?? stageId;`（zh-CN 字面常量）。
  - 而 `phaseLabel` 是 view 内 `computed` (`CaseDetailView.vue:92-94`) `t(getPhaseI18nKey(detail.value.businessPhase))`，正确走 i18n。

  同样的问题出现在 readonlyBanner：

  ```330:333:packages/admin/src/views/cases/CaseDetailView.vue
  <span>
    {{ t("cases.detail.readonlyBanner", { stage: detail.stage }) }}
  </span>
  ```

  `t()` 的插值参数 `{ stage: detail.stage }` 把 raw zh-CN 标签塞进了任何语言下的 banner（如 EN 文案 `"Read-only because case is in stage {stage}"` 会出现 `Read-only because case is in stage 刚开始办案`）。

- **可观测条件**：`constants.ts:28-83` 已为 9 个 stage 都填了 `i18nKey: "cases.constants.stages.S1..S9"`，i18n 资源已就绪；`CaseAdapterShared.ts:118-120` 也提供了 `resolveStageI18nKey(stageId)` helper。**资源齐全，仅 view 层未消费**。

- **修复方向**（与 phaseLabel 镜像，最小变更）：

  ```ts
  // CaseDetailView.vue <script setup>
  import { resolveStageId, resolveStageI18nKey } from "./model/CaseAdapterShared";

  const stageLabel = computed(() => {
    if (!detail.value) return "";
    const key = resolveStageI18nKey(resolveStageId(detail.value.stageCode));
    return key ? t(key) : detail.value.stage;
  });
  ```

  ```vue
  <!-- template -->
  <Chip :tone="badgeToTone(detail.statusBadge)" size="sm" dot>
    {{ stageLabel }}
  </Chip>
  ...
  <span>
    {{ t("cases.detail.readonlyBanner", { stage: stageLabel }) }}
  </span>
  ```

- **测试补强（防回归）**：

  1. `CaseDetailView.i18n.test.ts`（新增）：mount 详情页，分别在 zh-CN / en-US / ja-JP locale 下断言 `wrapper.find('.case-header__stage-chip').text()` 来自对应 `cases.constants.stages.{S1..S9}` i18n key（不能等于硬编码 zh-CN 字面）。
  2. 顺手补 `CaseListView.test.ts` 列表 stage 列同等断言；`CaseTableRow.test.ts:75-81` 已经显式 mock zh-CN 标签（`S1: "刚开始办案"`），暗示同样问题可能也在列表页（**列表页本轮未取证**，建议下一轮覆盖）。
  3. （可选）i18n 守门：grep `{{ detail.stage }}` / `{{ stage }}` 等 raw 字段插值，要求都走 `t(...)` helper。

- **关联**：是 R8 / R9 修「面包屑 caseNo」之后暴露的同位置（详情头部）剩余 i18n 缺口；与 R9 §3 留挂的 BUG-112（Tasks 页未 i18n）同类（hardcoded 中文常量泄漏到非 zh-CN 环境）。下一轮可把「按 locale 切换 → 抽 zh-CN 残留」做成公用 e2e helper，配合 `chrome-devtools-mcp` 自动化跑一遍权威页面清单。

- **R10 land 记录**：
  - 代码：`packages/admin/src/views/cases/CaseDetailView.vue` 引入 `getStageI18nKey`（来自 `./constants`，与 `phaseLabel` 同源），新增 `stageLabel = computed(() => key ? t(key) : detail.value.stage)`；模板将 stage Chip 由 `{{ detail.stage }}` 改为 `{{ stageLabel }}`，readonlyBanner 插值由 `{ stage: detail.stage }` 改为 `{ stage: stageLabel }`。
  - 测试：新增 `packages/admin/src/views/cases/CaseDetailView.bug132.test.ts`（33 用例），对 `zh-CN / en-US / ja-JP × S1..S9` 共 27 组断言 stageLabel 匹配 i18n 译文；附 4 条反向断言（EN/JA 不允许 zh-CN fallback `刚开始办案`、stage / stageCode 偏差时以 stageCode 为准），以及 readonlyBanner 跨 locale 文案断言。
  - 守门：`npm run admin:guard` PASS（273 test files / 5122 tests），`npm run guard` 全链 PASS（mobile + admin + server，0 fail）。

---

## 2. UI 端验收证据（BUG-116 / 127 / 128 / 129 / 130）

### 2.1 BUG-130 ✅ 案件详情面包屑显示 caseNo（R9 §1 修复已 land）

- **走查路径**：`navigate_page → http://localhost:5173/#/cases/df9d1e84-fd62-4687-9297-decd8848412f`
- **DOM 取证（与 R9 §2.4 / BUG-130 §「现象」对照）**：

  ```js
  {
    crumbs: [
      { text: "仪表盘",           aria: null   },
      { text: "业务",             aria: "page" }, // ← BUG-131（详见 §1）
      { text: "案件",             aria: null   },
      { text: "CASE-202604-0011", aria: "page" }  // ← BUG-130 PASS
    ],
    lastText:        "CASE-202604-0011",
    hasCaseNoFormat: true,    // ← 期望 true，PASS
    hasUuidFormat:   false    // ← 期望 false，PASS
  }
  ```

- **代码层位点（adapter 已写 caseNo）**：

  ```241:275:packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts
  function resolveCaseNo(
    caseRecord: Record<string, unknown>,
  ): string | undefined {
    const trimmed = readString(caseRecord, "caseNo").trim();
    return trimmed || undefined;
  }
  ...
  function buildDetailHeader(...) {
    return {
      id,
      caseNo: resolveCaseNo(caseRecord),  // ← R9 BUG-130 修复点
      title: resolveTitle(caseRecord, id),
      ...
  ```

- **代码层位点（焦点测试已 unskip）**：

  ```55:55:packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.case-no.focused.test.ts
  describe("BUG-106 / BUG-128 / BUG-130: detail header exposes caseNo for breadcrumb parity", () => {
  ```

  6 个用例（caseNo 透传 / trim / 空串 / 空白串 / missing / detail.id 不被覆盖）全 active。
- **截图**：`/tmp/r10_case_detail_breadcrumb_PASS.png`

### 2.2 BUG-116 ✅ `?tab=timeline` 深链落到「日志」tab（继承 R9 §2.1）

- **走查路径**：`navigate_page → http://localhost:5173/#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=timeline`
- **DOM 取证**：

  ```js
  {
    finalUrl: "#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=timeline",
    selected: { id: "caseTab-log", text: "日志", selected: true },
    allTabs: [10 个 tab，仅 "日志" selected]
  }
  ```

- **补充观测**：随后 `click(uid=caseTab-log)` 后，URL 规范化为 `?tab=log`（与 R9 §2.1「小遗留」描述的「URL 仍保留 `?tab=timeline`」对齐——只在 alias 命中时不规范化，用户主动点击是规范化的）。

### 2.3 BUG-127 ✅ 案件列表 owner 列回归 `Local Admin`（继承 R9 §2.2）

- **走查路径**：`navigate_page → http://localhost:5173/#/cases`
- **DOM 取证**：

  ```js
  {
    rowCount: 19,
    headers: ["案件","阶段","申请人","类型","负责人","到期日","待收","检查","风险",""],
    ownerNa: 0,    // ← 0/19 NA，PASS
    ownerOk: 19,
    sample: [
      {
        text: "Lo Local Admin",
        html: '<div data-v-7fa9c4f9="" class="case-row__owner">'
            + '<span class="case-row__owner-avatar case-row__owner-avatar--la">Lo</span>'
            + ' Local Admin</div>'
      }
    ]
  }
  ```

- **截图**：`/tmp/r10_cases_list_owner_PASS.png`

### 2.4 BUG-129 ✅ 日志 tab 时间戳格式化 + server ISO 序列化（继承 R9 §2.3）

- **走查路径**：`navigate_page → http://localhost:5173/#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=timeline`
- **DOM 取证**：

  ```js
  {
    totalEntries:      22,
    dateToStringCount: 0,    // ← 0/22 GMT 字面，PASS
    formattedCount:    22,
    sample: ["2026/04/29 19:54", "2026/04/29 19:54", "2026/04/29 19:54", "2026/04/29 19:54", "2026/04/29 19:54", "2026/04/29 19:54"]
  }
  ```

- **API 直查**：

  ```jsonc
  // GET /api/timeline?entityType=case&entityId=df9d1e84-…&limit=2
  [
    { "id": "5826a510-…", "action": "case.phase_transitioned", "createdAt": "2026-04-29T10:54:27.171Z" },
    { "id": "b4b9a491-…", "action": "case.phase_transitioned", "createdAt": "2026-04-29T10:54:27.144Z" }
  ]
  ```

- **截图**：`/tmp/r10_case_log_timestamps_PASS.png`

---

## 3. 顺手补充观测（不立 bug，但建议跟踪）

### 3.1 顶栏全局搜索框 disabled + description="建设中"

- **位置**：a11y tree `uid=9_5 searchbox "全局搜索" description="建设中" disableable disabled`
- **观察**：与 R9 §3 BUG-112（Tasks 页未 i18n）属同一类「占位组件留在产品环境里」的产品体验偏差；如打算上线前把此类「建设中」标记一并下架，可统一扫一遍。

### 3.2 `/tasks` 路由可达但侧边栏无入口

- **位置**：`navigate_page → http://localhost:5173/#/tasks` → 显示 `任务与提醒` 占位页（"建设中"）；侧边栏「主导航」7 个 link（仪表盘 / 咨询与会话 / 客户 / 案件 / 资料中心 / 收费与财务 / 系统设置）中无 Tasks 入口。
- **观察**：与上一条同类——路由先注册（避免「未匹配告警」）但 UI 入口未挂；属于 R9 §3 BUG-112 的伴生现象。

### 3.3 详情页 11 个聚合接口的「重复请求」误判排查

- **观察**：`list_network_requests` 返回 394 条历史请求中有 25+ 轮相同的 11 接口聚合循环（`reqid=285..633+`）。
- **二次确认**：`navigate_page → about:blank → 再回详情页`，hook `window.fetch` 后 idle 5 秒抓到 0 次 fetch；点击 `caseTab-log` 后抓到 0 次 fetch（详情页一次性预加载所有 tab 数据，tab 切换无网络消耗）。
- **结论**：原 25+ 轮是**长会话累积**（包含 HMR 触发的 re-mount、多次手动 navigate），不是 watcher 死循环；不立 bug，但可作为「请求噪声基线」记下：单次首次进入详情页发 11 个聚合请求，tab 切换不再发请求。如未来 admin 引入 SWR / refetchOnFocus，需重新评估。

### 3.4 `[role=tab]` 不带 `aria-controls` 指向 tabpanel

- **位置**：`take_snapshot` 输出的 10 个 tab（`uid=9_56..9_65`）只有 `tab "概览" selectable selected` 而无对应的 `tabpanel` 关联。
- **观察**：与 BUG-131 同属 a11y 类问题，但优先级更低（屏幕阅读器仍可识别 tab 角色，只是无法跳转到 panel）；仅记录。

---

## 4. 仍未覆盖 / 待立项

本轮**未触及**（沿用 R8 §4 / R9 §3 状态）：

- BUG-110（`tests/integration-pg/` schema-compatibility 测试体系）
- BUG-112（Tasks 页未 i18n） — R10 §3.1 / 3.2 给了占位页伴生证据
- BUG-113 / 114 / 115（timeline query alias / dashboard 文案 / customer backfill）
- stage / phase 终态联动（产品决策）
- CLOSED_FAILED 路径 + closeReason 入参校验
- 案件**列表页** stage 列在 EN/JA 下是否同样泄漏 zh-CN（BUG-132 同根，列表路径未取证）

本轮**新增待立项**：

- **BUG-131** — `PageHeader` 面包屑 ARIA `aria-current="page"` 唯一性（详见 §1）
- **BUG-132** — `CaseDetailView` stage Chip / readonlyBanner 未 i18n（详见 §1）
- **a11y 守门补强**：admin 引入 axe-core / @testing-library a11y 检查（CI 跑），把 `aria-current` 唯一性、`role=tab` 关联性等纳入门禁
- **i18n 守门补强**：lint 或 e2e 检查「`{{ rawField }}` 直接插值的枚举字段」必须走 `t()` helper；按 locale 切换跑权威页面清单的 zh-CN 残留扫描
- **测试守门补强**（沿用 R9）：`vitest/no-disabled-tests` / 自定义 lint 禁止 `describe.skip` 直接合入 main

---

## 附录 — 关键证据快照

### A. chrome-devtools-mcp 截图

| 文件 | 内容 | 对应 Bug |
|---|---|---|
| `/tmp/r10_case_detail_breadcrumb_PASS.png` | 详情头部，面包屑显示 `CASE-202604-0011` | BUG-130 ✅ |
| `/tmp/r10_cases_list_owner_PASS.png` | 列表 19 行整页，owner 全 `Lo Local Admin` | BUG-127 ✅ |
| `/tmp/r10_case_log_timestamps_PASS.png` | 日志 tab 整页 22 条均 `2026/04/29 19:54` | BUG-129 ✅ |
| `/tmp/r10_case_detail_breadcrumb_dual_aria_FAIL.png` | 同详情页，DOM 内 `[aria-current=page]` × 3 | BUG-131 ❌ |

### B. 网络请求（详情页 1 次完整加载，hook fetch 抓取）

```
GET /api/cases/df9d1e84-…/aggregate
GET /api/document-items?caseId=df9d1e84-…
GET /api/generated-documents?caseId=df9d1e84-…
GET /api/validation-runs?caseId=df9d1e84-…
GET /api/cases/df9d1e84-…/billing-tab-aggregate
GET /api/submission-packages?caseId=df9d1e84-…
GET /api/review-records?caseId=df9d1e84-…
GET /api/communication-logs?caseId=df9d1e84-…
GET /api/timeline?entityType=case&entityId=df9d1e84-…
GET /api/tasks?caseId=df9d1e84-…
GET /api/reminders?caseId=df9d1e84-…
```

11 个唯一接口；`list_console_messages` 仅 1 条 issue（form field 缺 id/name × 6，列表页 case-filters select 与全局 search input；非阻塞）。

### C. 一键复现脚本（chrome-devtools-mcp + curl）

```bash
# 0) 取 token
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# 1) 后端字段下发（BUG-127 / 130 前提）
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/cases/df9d1e84-fd62-4687-9297-decd8848412f/aggregate" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);c=d.get("case",{});print({k:c.get(k) for k in ["id","caseNo","caseName"]})'
# 期望：{'id': 'df9d1e84-…', 'caseNo': 'CASE-202604-0011', 'caseName': 'R6 supplement probe'}

# 2) BUG-130 UI 端验收
#    navigate_page → /#/cases/df9d1e84-…
#    evaluate_script: 取 .ui-page-header__crumb[aria-current=page] textContent
#    期望：以 "CASE-" 开头（已 PASS）

# 3) BUG-131 a11y 验收
#    evaluate_script: document.querySelectorAll('[aria-current=page]').length
#    期望：=2（侧边栏 1 + 面包屑末尾 1）；当前实测 =3（多了面包屑「业务」）

# 4) BUG-132 i18n 验收
#    fill(uid="lang-combobox", value="English")
#    evaluate_script: 取 stage chip textContent
#    期望：=t("cases.constants.stages.S1") = "Just started" 之类
#    当前实测：="刚开始办案"（zh-CN 残留）
```
