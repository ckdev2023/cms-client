# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第九轮 / R8 已 land 修复 UI 端验收）

> 生成日期：2026-04-30（R8 同日 chrome-devtools-mcp UI 端验收）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/14-双层状态机自动化复盘走查Bug清单-第八轮.md` §0.2 表第 4–5 行（R8 自报已 land：BUG-116 / 127 / 128 / 129）
> - `packages/admin/src/views/cases/{query.ts, caseIdentity.ts, CaseDetailView.vue}` 当前实装
> - `packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts:256-296` `buildDetailHeader`
> - `packages/server/src/modules/core/timeline/timeline.service.ts` 当前实装
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` + `evaluate_script` + `take_screenshot` + `list_network_requests` + `list_console_messages`） + `curl`（HTTP API） + 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第八轮 (`14-...md`) 互为续篇；本轮**只对 R8 自报已 land 的 4 条 (BUG-116 / 127 / 128 / 129) 做 UI 端验收**，并在 BUG-128 处发现 1 条新偏差（登记为 BUG-130）。

---

## 0. 第九轮总结

### 0.1 关键事件

R8 文档 §0.2 表第 4–5 行把 BUG-116 / 127 / 128 / 129 全部标 ✅「R8 已 land」，§4 也明确「已合并为 P0/P1 admin UI 回归冲刺一次性 land」。本轮按 R8 文档 §1 给出的复现路径，用 `chrome-devtools-mcp` 在真实 admin (`:5173`) 走一遍 UI 验收：

| # | R8 自报状态 | R9 UI 验收 | 一句话结论 |
|---|---|---|---|
| BUG-116（`?tab=timeline → log` 别名） | ✅ R8 已 land | **✅ PASS** | `resolveDetailTab` 中 `CASE_DETAIL_TAB_ALIASES` 已实装；`?tab=timeline` 选中「日志」tab |
| BUG-127（列表 owner 列回显 `Local Admin`） | ✅ R8 已 land | **✅ PASS** | 19/19 行 owner 列均显示 `Lo Local Admin`，`case-row__na` owner 列计数 = 0 |
| BUG-128（详情面包屑显示 `CASE-XXXXXX-XXXX`） | ✅ R8 已 land | **❌ FAIL（半 land）** | 消费方接入了 `formatCaseIdentity`，但 adapter `buildDetailHeader` 漏写 `caseNo`，UI 仍显示 UUID（已登记为 BUG-130）|
| BUG-129（日志时间戳格式化） | ✅ R8 已 land | **✅ PASS** | 22/22 条日志条目时间戳为 `2026/04/29 19:54` 格式；server `/api/timeline.createdAt` 返回 ISO `2026-04-29T10:54:27.171Z` |

### 0.2 三句话结论

1. **R8 自报「4 条已 land」中 3 条 UI 端验收通过**（BUG-116 / 127 / 129），且 server 与 admin 两层修复都到位（BUG-129 同时切了 `timeline.service.ts` 的 ISO 序列化与 `CaseLogTab` 的格式化兜底）。
2. **BUG-128 是「半 land」**：`CaseDetailView.vue:164` 已经 `formatCaseIdentity(detail.caseNo, detail.id)`、`caseIdentity.ts` 与新加的 `CaseDetailView.breadcrumb.test.ts`（6 个用例，全 PASS）都已落地，但**适配器 `CaseAdapterDetailAggregate.buildDetailHeader()` 没把 `caseNo` 写进 `detail`**，且 `CaseAdapterDetailAggregate.case-no.focused.test.ts` 整组用 `describe.skip` 跳过——相当于「helper 修了 / 单元测试加了 / 集成链断在 adapter 这一层」。本文件 §1 BUG-130 正式登记。
3. **测试覆盖呈现一类系统性盲区**：`CaseDetailView.breadcrumb.test.ts` 直接 mock `createMockDetail({ caseNo: "..." })` → `formatCaseIdentity(detail.caseNo, detail.id)`，**没有任何用例验证 adapter 输出的 detail 是否真的带 caseNo**；与此同时唯一一个本来该覆盖此链路的 `CaseAdapterDetailAggregate.case-no.focused.test.ts` 又被 `describe.skip` 关掉。这是 R5 BUG-106 → R8 BUG-128 → R9 BUG-130 三轮回归同一条链路的根因，建议补一条 lint：禁止 `describe.skip` 被合入 main（或要求 skip 必须挂跟踪 issue）。

---

## 1. 新增 Bug

### BUG-130 [P1][FE] `CaseAdapterDetailAggregate.buildDetailHeader` 未透传 `caseNo`，导致 BUG-128 修复在 UI 上不可见（半 land 回归）

- **优先级**：P1（每个详情页都中；BUG-128 修复链路上 helper / 消费方 / 单元测试都到位，但 adapter 这一层断了 → 用户从列表/搜索/书签进案件第一眼仍是 UUID）
- **现象**：访问 `#/cases/df9d1e84-fd62-4687-9297-decd8848412f`，面包屑渲染：`仪表盘 / 业务 / 案件 / df9d1e84-fd62-4687-9297-decd8848412f`（与 R8 BUG-128 §「现象」唯一不同的是没了 `#` 前缀，但仍是 UUID 而非 `CASE-202604-0011`）。
- **API 直查（数据下发已正确）**：

```bash
$ curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/cases/df9d1e84-fd62-4687-9297-decd8848412f/aggregate" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);c=d.get("case",{});print({k:c.get(k) for k in ["id","caseNo","caseName"]})'
{'id': 'df9d1e84-fd62-4687-9297-decd8848412f', 'caseNo': 'CASE-202604-0011', 'caseName': 'R6 supplement probe'}
```

- **UI 端取证（chrome-devtools-mcp `evaluate_script`）**：

```js
// 走 querySelectorAll('.ui-page-header__crumb') 抓面包屑
{
  crumbs: ["仪表盘", "业务", "案件", "df9d1e84-fd62-4687-9297-decd8848412f"],
  hasCaseNoFormat: false,   // ← 期望 true
  hasUuidFormat:   true     // ← 期望 false
}
```

- **根因（admin adapter 层）**：

```256:296:packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.ts
function buildDetailHeader(
  id: string,
  stageId: CaseStageId,
  dueAt: string | null,
  m: DerivedMetrics,
  caseRecord: Record<string, unknown>,
  deepLink: Record<string, unknown> | null,
) {
  return {
    id,
    title: resolveTitle(caseRecord, id),
    client: dlStr(deepLink, "customerName"),
    owner: dlStr(deepLink, "ownerDisplayName"),
    agency: "",
    stage: resolveStageLabel(stageId),
    stageCode: stageId,
    stageMeta: stageId,
    statusBadge: resolveStageBadge(stageId),
    deadline: formatDate(dueAt),
    deadlineMeta: dueAt ? `Due: ${formatDate(dueAt)}` : "",
    deadlineDanger: isDeadlineDanger(dueAt),
    progressPercent: m.progressPercent,
    progressCount: `${m.docDone}/${m.docTotal}`,
    billingAmount: m.quotePrice ? `¥${m.quotePrice.toLocaleString()}` : "—",
    billingMeta: formatYen(m.unpaidAmount) || "",
    billingMetaKey: m.unpaidAmount > 0 ? "cases.detail.unpaidLabel" : "",
    billingMetaParams:
      m.unpaidAmount > 0 ? { amount: formatYen(m.unpaidAmount) } : undefined,
    billingStatusKey: m.unpaidAmount > 0 ? "unpaid" : "paid",
    docsCounter: `${m.docDone}/${m.docTotal}`,
    readonly: stageId === "S9",
    customerId: dlStr(deepLink, "customerId"),
    groupId: dlStr(deepLink, "groupId"),
    groupName: dlStr(deepLink, "groupName"),
    caseType: readString(caseRecord, "caseTypeCode"),
    applicationType: readString(caseRecord, "applicationType"),
    businessPhase: readString(caseRecord, "businessPhase"),
    acceptedDate: formatDate(readNullableString(caseRecord, "acceptedAt")),
    targetDate: formatDate(dueAt),
  };
}
```

`buildDetailHeader` 返回对象**没有 `caseNo` 字段**。`caseRecord` 入参里有 `caseNo`（已 server 端验证），但被 `resolveTitle` 仅用于 title 兜底（`caseName || caseNo || id`），未单独透传。`CaseDetail` 类型在 `types-detail.ts:1115-1123` 已经声明 `caseNo?: string`，意味着字段位是预留好了的，但 adapter 没填；UI 走 `formatCaseIdentity(detail.caseNo, detail.id)`，因 `detail.caseNo === undefined` → 直接走 `id` 兜底分支，与 R8 BUG-128 修复前的视觉效果除了少一个 `#` 完全一样。

- **测试盲区（双重错过）**：

  1. `packages/admin/src/views/cases/CaseDetailView.breadcrumb.test.ts`（R8 新增，6 个用例，全 PASS）测的是 `formatCaseIdentity(detail.caseNo, detail.id)`，但 `detail` 通过 `createMockDetail({ caseNo: "..." })` 直接构造，**没经过 adapter**——即 helper 单测 100% 通过，但与生产数据流脱节。
  2. `packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.case-no.focused.test.ts`（5 个用例，覆盖 caseNo / trim / 空串 / 空白 / 缺失）**整组 `describe.skip`**：

```55:55:packages/admin/src/views/cases/model/CaseAdapterDetailAggregate.case-no.focused.test.ts
describe.skip("BUG-106: detail header exposes caseNo for breadcrumb parity", () => {
```

  这组测试如果开启，第一个用例 `expect(result.detail.caseNo).toBe("CASE-202604-0003")` 就会立刻失败（因为 adapter 根本不写 caseNo），从而在 R8 land 之前就把 BUG-130 拦下来。

- **修复方向（强烈建议三处一起改，避免再回归）**：

  1. **adapter（根因）**：`CaseAdapterDetailAggregate.ts:264-295` `buildDetailHeader` 返回对象添加：

     ```ts
     caseNo: (() => {
       const raw = readString(caseRecord, "caseNo");
       const trimmed = typeof raw === "string" ? raw.trim() : "";
       return trimmed || undefined;
     })(),
     ```

     与 `caseIdentity.ts:13-19` 的 trim/空串/undefined 语义对齐；同时确保 `CaseDetail.caseNo` 永远是 `string | undefined`，不会出现空白串。

  2. **测试（防止 skip 再次合入）**：把 `CaseAdapterDetailAggregate.case-no.focused.test.ts` 第 55 行的 `describe.skip` 改为 `describe`，5 个用例转为正式 case；新增 1 条 mount-生产模板用例（`CaseDetailView.breadcrumb.integration.test.ts`），通过完整 adapter 链路 mount `<CaseDetailView>`，断言面包屑文本以 `"CASE-"` 开头。

  3. **lint / 守门**：`packages/admin/.eslintrc` 加一条 `vitest/no-disabled-tests`（或自定义 `no-skipped-test-blocks`），禁止 `describe.skip` / `it.skip` 直接合入 main；存量例外用 `// eslint-disable-next-line` + 跟踪 issue 注释作为豁免。

- **关联**：与 R5 BUG-106 → R8 BUG-128 → R9 BUG-130 三轮回归同一条链路（详情面包屑 caseNo 透传），每轮只修了链路上的一个点：R5 修了 `formatCaseIdentity` helper（PASS）；R8 修了 `CaseDetailView.vue` 消费方（PASS，但 detail 数据没源头）；R9 暴露 adapter 这一层从未被打通，且测试链路被 `describe.skip` 默默关掉。下一轮 lint 应专门加一条「`detail.caseNo` 端到端契约测试」的红线（不依赖 mock helper，直接走 `adaptCaseDetailAggregate`）。

---

## 2. UI 端验收证据（BUG-116 / 127 / 129）

本节登记 R8 自报已 land 的 3 条 UI 端验收原始数据，与 R9 BUG-130 形成对照。

### 2.1 BUG-116 ✅ `?tab=timeline` 深链落到「日志」tab

- **走查路径**：`navigate_page → http://localhost:5173/#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=timeline`
- **DOM 取证**：

  ```js
  {
    finalUrl: "#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=timeline",
    selectedTabText: "日志",
    selectedTabId:   "caseTab-log",
    allTabsText: [
      { text: "概览",       selected: false },
      { text: "提交前检查", selected: false },
      { text: "资料清单 0/0", selected: false },
      { text: "任务",       selected: false },
      { text: "基础信息",   selected: false },
      { text: "文书",       selected: false },
      { text: "期限",       selected: false },
      { text: "收费",       selected: false },
      { text: "沟通记录",   selected: false },
      { text: "日志",       selected: true }  // ← BUG-116 PASS
    ]
  }
  ```

- **代码层位点**：`packages/admin/src/views/cases/query.ts:237-243` `resolveDetailTab` 已读 `CASE_DETAIL_TAB_ALIASES`；`?tab=timeline → log` alias 生效。
- **截图**：`/tmp/r9_tab_timeline_alias_pass.png`
- **小遗留（非阻塞）**：URL 仍保留 `?tab=timeline`，未规范化为 `?tab=log`。R8 文档方案 A 没要求 URL 改写，可接受；如需进一步规范化，可在 `useCaseDetailModel` 监听 alias 命中时 `router.replace({ query: { tab: 'log' } })`。

### 2.2 BUG-127 ✅ 案件列表 owner 列回归 `Local Admin`

- **走查路径**：`navigate_page → http://localhost:5173/#/cases`
- **DOM 取证**：

  ```js
  // 抽 5 行 owner 列
  {
    rowCount: 19,
    ownerNa: 0,    // ← BUG-127 PASS（R8 文档 §1 说 19/19 NA → 现 0/19）
    ownerOk: 19,
    sample: [
      {
        ownerCellHTML: '<div class="case-row__owner">'
                     + '<span class="case-row__owner-avatar case-row__owner-avatar--la">Lo</span>'
                     + ' Local Admin</div>',
        ownerCellText: "Lo Local Admin"
      },
      // … 其余 4 行结构相同
    ],
    headers: ["案件","阶段","申请人","类型","负责人","到期日","待收","检查","风险",""]
  }
  ```

- **API 直查（字段已下发）**：

  ```js
  // GET /api/cases?scope=mine&page=1&limit=3&view=summary
  [
    { id: 'b8bef6d9-…', caseNo: 'CASE-202604-0019', ownerUserId: '00000000-…0011', ownerDisplayName: 'Local Admin', businessPhase: 'WAITING_PAYMENT' },
    { id: '9854ce6c-…', caseNo: 'CASE-202604-0018', ownerUserId: '00000000-…0011', ownerDisplayName: 'Local Admin', businessPhase: 'NEED_SUPPLEMENT' },
    { id: '7dc9ae34-…', caseNo: 'CASE-202604-0017', ownerUserId: '00000000-…0011', ownerDisplayName: 'Local Admin', businessPhase: 'WAITING_PAYMENT' }
  ]
  ```

- **截图**：`/tmp/r9_cases_list_owner_pass.png`（fullPage，覆盖 19 行）
- **代码层位点**：`CaseTableRow.vue` 已读 `props.item.ownerDisplayName`；`CaseAdapterMappers.ts` / `types.ts` 已补字段透传（与 R8 文档 §1 BUG-127「修复方向」三项一致）。

### 2.3 BUG-129 ✅ 日志 tab 时间戳格式化 + server ISO 序列化

- **走查路径**：`navigate_page → http://localhost:5173/#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=log`
- **DOM 取证**：

  ```js
  {
    totalEntries:        22,
    dateToStringCount:   0,    // ← BUG-129 PASS（R8 文档 §1 说 22/22 全 Date.toString() → 现 0/22）
    sample: [
      "2026/04/29 19:54",
      "2026/04/29 19:54",
      "2026/04/29 19:54",
      "2026/04/29 19:54",
      "2026/04/29 19:54"
    ]
  }
  ```

- **API 直查（server 已切 ISO）**：

  ```jsonc
  // GET /api/timeline?entityType=case&entityId=df9d1e84-…&limit=2
  [
    {
      "id": "5826a510-b383-422c-8a5b-0519aeb27d45",
      "action": "case.phase_transitioned",
      "createdAt": "2026-04-29T10:54:27.171Z"   // ← ISO 8601，不再是 "Wed Apr 29 2026 19:54:27 GMT+0900 …"
    },
    {
      "id": "b4b9a491-a47c-4975-a433-ef6677d17ad0",
      "action": "case.phase_transitioned",
      "createdAt": "2026-04-29T10:54:27.144Z"
    }
  ]
  ```

- **截图**：`/tmp/r9_case_log_timestamps_pass.png`（fullPage，覆盖 22 条）
- **代码层位点**：`packages/server/src/modules/core/timeline/timeline.service.ts` 已切 `Date.toISOString()`（或 `toIsoOrNull` helper）；`packages/admin/src/views/cases/components/CaseLogTab.vue` 模板已用 `formatEntryTime(entry.time, locale)` 兜底。两层都到位。

### 2.4 BUG-128 ❌ 案件详情面包屑（半 land，详见 §1 BUG-130）

- **走查路径**：`navigate_page → http://localhost:5173/#/cases/df9d1e84-fd62-4687-9297-decd8848412f`
- **DOM 取证**：

  ```js
  {
    crumbs: ["仪表盘", "业务", "案件", "df9d1e84-fd62-4687-9297-decd8848412f"],
    hasCaseNoFormat: false,
    hasUuidFormat:   true
  }
  ```

- **截图**：`/tmp/r9_case_detail_breadcrumb_FAIL.png`
- **结论**：`#` 前缀已去掉（vs R8 §1 BUG-128「现象」字面 `#df9d1e84-…`），但 UUID 仍是 UUID。判定 BUG-128 维持 ❌，根因转交 BUG-130。

---

## 3. 仍未覆盖 / 待立项

本轮**未触及**（沿用 R8 §4 状态）：

- BUG-110（`tests/integration-pg/` schema-compatibility 测试体系）
- BUG-112（Tasks 页未 i18n）
- BUG-113 / 114 / 115（timeline query alias / dashboard 文案 / customer backfill）
- stage / phase 终态联动（产品决策）
- CLOSED_FAILED 路径 + closeReason 入参校验

本轮**新增待立项**：

- **BUG-130** — adapter 漏写 `caseNo`，导致 BUG-128 半 land 回归（详见 §1）
- **测试守门补强**：`vitest/no-disabled-tests` 或自定义 lint 禁止 `describe.skip` 直接合入 main（R9 §0.2 第 3 句结论指出此为系统性盲区）

---

## 附录 — 关键证据快照

### A. chrome-devtools-mcp 截图

| 文件 | 内容 | 对应 Bug |
|---|---|---|
| `/tmp/r9_cases_list_owner_pass.png` | 案件列表 19 行整页（fullPage），owner 列全部 `Lo Local Admin` | BUG-127 ✅ |
| `/tmp/r9_case_log_timestamps_pass.png` | 日志 tab 整页（fullPage），22 条均 `2026/04/29 19:54` | BUG-129 ✅ |
| `/tmp/r9_tab_timeline_alias_pass.png` | `?tab=timeline` 选中「日志」tab | BUG-116 ✅ |
| `/tmp/r9_case_detail_breadcrumb_FAIL.png` | 详情头部，面包屑显示 UUID | BUG-128 ❌ → BUG-130 |

### B. 网络请求（详情页 1 次完整加载）

```
GET /api/cases/df9d1e84-…/aggregate                  → 200 / 304
GET /api/document-items?caseId=df9d1e84-…            → 200 / 304
GET /api/generated-documents?caseId=df9d1e84-…       → 200
GET /api/validation-runs?caseId=df9d1e84-…           → 200 / 304
GET /api/cases/df9d1e84-…/billing-tab-aggregate      → 200
GET /api/submission-packages?caseId=df9d1e84-…       → 200 / 304
GET /api/review-records?caseId=df9d1e84-…            → 200 / 304
GET /api/communication-logs?caseId=df9d1e84-…        → 200 / 304
GET /api/timeline?entityType=case&entityId=df9d1e84… → 200 / 304
GET /api/tasks?caseId=df9d1e84-…                     → 200 / 304
GET /api/reminders?caseId=df9d1e84-…                 → 200 / 304
```

无 4xx / 5xx；`list_console_messages` 返回 `<no console messages found>`，无 runtime warning / error。

### C. 一键复现脚本（chrome-devtools-mcp + curl）

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# BUG-127 / 128 后端字段下发（前提）
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/cases?scope=mine&page=1&limit=3&view=summary" \
  | python3 -m json.tool | head -40
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/cases/df9d1e84-fd62-4687-9297-decd8848412f/aggregate" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print({k:d.get("case",{}).get(k) for k in ["id","caseNo","caseName"]})'

# BUG-129 server 端 ISO
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/timeline?entityType=case&entityId=df9d1e84-fd62-4687-9297-decd8848412f&limit=2" \
  | python3 -c 'import sys,json;[print(i["createdAt"]) for i in json.load(sys.stdin)]'
# 期望：ISO 8601（含 T 与 Z）

# UI 端走查 (chrome-devtools-mcp)
# 1) BUG-116:  navigate_page http://localhost:5173/#/cases/df9d1e84-…?tab=timeline
#    evaluate_script: 取 [role="tab"][aria-selected=true] → 期望 "日志" / id="caseTab-log"
# 2) BUG-127:  navigate_page http://localhost:5173/#/cases
#    evaluate_script: 取每行 td:nth-child(5)，断言 case-row__na 计数 = 0
# 3) BUG-128 (FAIL → BUG-130): navigate_page http://localhost:5173/#/cases/df9d1e84-…
#    evaluate_script: 取 .ui-page-header__crumb[aria-current=page]
#                     断言 textContent 以 "CASE-" 开头（当前 fail：UUID）
# 4) BUG-129:  navigate_page http://localhost:5173/#/cases/df9d1e84-…?tab=log
#    evaluate_script: 取 .log-tab__entry-time
#                     断言无 "GMT+0900" / "Japan Standard Time" 字面
```
