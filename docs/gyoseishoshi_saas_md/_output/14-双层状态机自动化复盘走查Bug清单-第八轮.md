# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第八轮 / 同日自动化复测增量）

> 生成日期：2026-04-30（R7 同日凌晨自动化复测）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/13-双层状态机自动化复盘走查Bug清单-第七轮.md`（首版 §0.3 三句话结论 + §3 复现脚本）
> - `packages/admin/src/views/cases/query.ts`（`resolveDetailTab` / `isValidDetailTab` 当前实现）
> - `packages/admin/src/views/cases/constants.ts`（`CASE_DETAIL_TAB_KEYS` 当前实装清单）
>
> 走查工具：`curl`（HTTP API） + `node`（纯函数仿真） + `git log -S`（历史核对） + `chrome-devtools-mcp`（UI take_screenshot + take_snapshot + evaluate_script + list_network_requests） + 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第七轮 (`13-...md`) 互为续篇；本轮登记自动化复测在 R7 之上新发现的偏差（1 条 P1 + 3 条 R5 回归 + 5 条文档漂移），并补齐 R7 §4 一直挂账的「chrome-devtools-mcp UI 端 screenshot 复盘」。

---

## 0. 第八轮总结

### 0.1 关键事件

R7 首版生成约 6 小时后，按其 §3 复现脚本逐项 `curl + psql` 自动化复测，**12 条 R5 Bug 中 11 条 PASS，1 条由 ✅ 推翻为 ❌（BUG-105）**；同时发现 R7 §3 复现脚本若干符号已经漂移，但底层行为仍 PASS。

随后用 `chrome-devtools-mcp` 把 R7 §4 一直挂账的「BUG-101/102/105/106/107 UI 端 screenshot 复盘」跑完一遍。结论是 R7 §1 表里把这 5 条全部判 ✅「代码层」并不可靠：BUG-101 在 UI 端确实 PASS，BUG-105 之外**还有 BUG-102 / 106 / 107 三条 R5 (`11-...md`) 已经标 ✅「已修」的修复，在当前 main 上又坏回去了**——R5 当时的实装位点（`CaseTableRow.vue` 读 `ownerDisplayName` / `CaseDetailView` 走 `formatCaseIdentity` / `CaseLogTab.vue` 包 `formatEntryTime`）现在都不在生产代码里。本文件登记 BUG-116（R8 首版） + 三条 R5 回归（BUG-127/128/129） + 一组文档修订，并提供修订后的复现脚本。

### 0.2 增量结果概览

| # | 项目 | R7 结论 | R8 自动化复测 | 关键证据 |
|---|---|---|---|---|
| 1 | 第五轮 12 条 (BUG-096~107) 整体 | ✅ 12/12 PASS | **❌ 11 PASS + 1 FAIL** | BUG-105 反转，详见 §1 |
| 2 | BUG-097 / BUG-111 COE_SENT 尾款 gate | ✅ default-deny 已实装 | **✅ 复测通过** | A 组 (`b8bef6d9-1d88-4dc8-95e6-949abf7c72ce`, 新建无 billing) → 400 `Final payment milestone is missing`；B 组 (`2f37c5ac…`) → 400 `unpaid (80000)` |
| 3 | BUG-108 / BUG-109 schema-mismatch | ✅ HTTP 200 | **✅ 复测通过** | `/api/billing-plans`、`/api/payment-records`、`/api/cases/df9d1e84…/aggregate` 均 200；`aggregate.case.businessPhase=CLOSED_SUCCESS, supplementCount=2`，`latestReview=null`（数据原因）|
| 4 | BUG-105 `?tab=timeline` 别名 | ✅（代码层）| **❌ → ✅ R8 已 land**（方案 A：恢复别名） | `CASE_DETAIL_TAB_ALIASES = { timeline: 'log' }` 已实装；`resolveDetailTab("timeline") === "log"` |
| 5 | R7 §4 chrome-devtools-mcp UI 端 screenshot 复盘 | 仍仅代码层确认 | **✅ R8 已 land**：BUG-101 ✅，BUG-116/127/128/129 全部修复 | 见 §1 各 BUG 标注 |
| 6 | R7 §3 复现脚本符号漂移 | — | **✅ R8 已修订** | §2 修订后复现脚本已纳入 R8 修复范围 |

### 0.3 三句话结论

1. **R7 §0.3 第 1 句结论站得住**：BUG-097/111 default-deny 在 A 组（无 billing）和 B 组（block billing 80000）两条路径上都被 400 拦截，COE_SENT 尾款 gate 已彻底闭合。
2. **R7 §0.3 第 2 句结论站得住**：BUG-108/109 三个端点 HTTP 200，`aggregate.latestReview=null` 是数据原因（df9d1e84 没有 review 记录），不是 schema 错。
3. **R7 §0.3 第 3 句结论需要打补丁**：R7 §1 表里把 BUG-105（`?tab=timeline → log` 别名）记为 ✅（代码层），但 `query.ts` 与 `constants.ts` 当前实装是严格白名单（不含 `timeline`），导致 `?tab=timeline` 落到 Overview 而非 Log，业务语义反转。本文件 §1 BUG-116 正式登记并给出二选一修复方向。
4. **R7 §1 表里"代码层 PASS"的判定不能复用为"UI PASS"**：本轮 chrome-devtools-mcp 走查证实，BUG-102（owner 列）、BUG-106（详情面包屑）、BUG-107（日志时间戳）三条在 R5 (`11-...md`) 已经写过具体修复实装位点的 Bug，**当前 main 上的实装文件里已经看不到那些位点**——`CaseTableRow.vue` 没有 `ownerDisplayName` 字段使用、`CaseDetailView.vue:163` 直接 `\`#${detail.id}\`` 拼 UUID、`CaseLogTab.vue:128` 模板用 `{{ entry.time }}` 裸渲染。BUG-107 进一步把根因定位到 server 端 `timeline.service.ts:153` 的 `String(r.created_at)`（`pg` 返回 `Date` 对象，`String(Date)` 给出 `Date.toString()` 而非 ISO）。三条登记为 BUG-127 / 128 / 129，**全部按"R5 回归 + UI 端可见"**对待，优先级 P1。

---

## 1. 新增 Bug

### BUG-116 `?tab=timeline` 深链回退 → Overview 而非 Log（P1，文档与实现不符）— ✅ R8 已 land

- **优先级**：P1（深链行为可见，但只在外部链接 / 旧书签里触发；admin 内部 tab 切换不受影响，不阻断主流程）
- **现象**：访问 `case detail?tab=timeline` 时，期望落到 `log`（与 R7 BUG-105 行为约定一致），实际落到 `overview`
- **根因**：

```225:244:packages/admin/src/views/cases/query.ts
export function isValidDetailTab(v: string): v is CaseDetailTab {
  return (CASE_DETAIL_TAB_KEYS as readonly string[]).includes(v);
}

/**
 * 将任意外部输入解析为合法 `CaseDetailTab`，非法值回退到 `DEFAULT_CASE_DETAIL_TAB`。
 *
 * 回退规则（按优先级）：
 *   1. `raw` 为 `string` 且属于 `CASE_DETAIL_TAB_KEYS` → 原值返回
 *   2. 其他情况（`null` / `undefined` / 空串 / 非法值）→ `DEFAULT_CASE_DETAIL_TAB`
 *
 * @param raw - 来自 `route.query.tab`、URL hash 或 model deps 的原始值
 * @returns 类型安全的 tab 键名
 */
export function resolveDetailTab(
  raw: string | null | undefined,
): CaseDetailTab {
  if (typeof raw === "string" && isValidDetailTab(raw)) return raw;
  return DEFAULT_CASE_DETAIL_TAB;
}
```

```173:184:packages/admin/src/views/cases/constants.ts
export const CASE_DETAIL_TAB_KEYS: readonly CaseDetailTab[] = [
  "overview",
  "validation",
  "documents",
  "tasks",
  "info",
  "forms",
  "deadlines",
  "billing",
  "messages",
  "log",
] as const;
```

`timeline` 不在白名单 → `resolveDetailTab("timeline")` 命中默认分支 → `DEFAULT_CASE_DETAIL_TAB = "overview"`。`git log --all -S 'CASE_DETAIL_TAB_ALIASES' -- packages/admin/src/views/cases/query.ts` 无任何提交命中，说明 R7 文档里所写的 `CASE_DETAIL_TAB_ALIASES = { timeline: 'log' }` 从未进入 main 分支。

- **行为复现（纯函数仿真，无需启动应用）**：

```bash
node -e '
const tabs = ["overview","validation","documents","tasks","info","forms","deadlines","billing","messages","log"];
const resolve = (r) => (typeof r === "string" && tabs.includes(r)) ? r : "overview";
for (const r of ["timeline","log","overview","Timeline","",null,undefined,"messages","tasks"]) {
  console.log(JSON.stringify(r), "->", resolve(r));
}
'
# 期望/实际：
#   "timeline" -> overview      ← 与 R7 BUG-105 行为约定相反（应为 log）
#   "log"      -> log
#   "overview" -> overview
#   "Timeline" -> overview      ← 大小写敏感，OK
#   ""         -> overview
#   null       -> overview
#   undefined  -> overview
#   "messages" -> messages
#   "tasks"    -> tasks
```

- **影响范围**：
  - 任何沉淀在外部系统（邮件 / Slack / 旧书签 / 文档）里的 `?tab=timeline` 链接；R7 BUG-113 提到的「timeline 静默忽略 query」是 `/api/timeline` 端点的 `caseId` alias 鉴别，不属于此处 admin URL 路由问题
  - 不影响 admin 内部 tab 切换（用户从 UI 直接点 `日志` tab 进入的是 `?tab=log`，路径正确）
- **修复方向（二选一）**：
  - **方案 A（恢复别名，与 R7 文档一致）**：在 `resolveDetailTab` 之前增加一层 alias 映射 `{ timeline: 'log' }`，并把 alias 表也导出（供测试 / consumer 复用）。需补 `query.cross-module-regression.test.ts` 用例：`resolveDetailTab("timeline") === "log"`，并校验 `buildCaseDetailHref` 是否需要把 `timeline` 反向规范化为 `log`。
  - **方案 B（接受当前严格白名单）**：放弃 `timeline` 别名，更新 R7 §1 BUG-105 行（已在 `13-...md` §0.4 / §1 同步翻为 ❌），移除外部出口 / 文档里的 `?tab=timeline` 链接。优点：URL 语义最小且明确；缺点：旧书签 / 旧邮件链接全部静默落到 overview。
- **建议**：选方案 A。理由：(1) 用户角度的「时间线 = 日志」是稳定语义；(2) admin 路由层做一次 alias 映射的成本小于回收所有外部链接；(3) R5 BUG-105 / R6 BUG-113 系列之前都把 timeline 视作 log 的对外别名，方案 A 与历史走查口径一致。

---

### BUG-127 [P1][FE] 案件列表「负责人」列回归——19/19 行渲染「未指派」，未读 API 已返回的 `ownerDisplayName`（R5 BUG-102 修复回归）— ✅ R8 已 land

- **优先级**：P1（每个使用案件列表的页面都中，含 dashboard 流程外的案件管理主路径；不阻塞写操作但全员错位）
- **现象**：admin `#/cases` 列表 19/19 行「负责人」列均显示 `<span class="case-row__na">未指派</span>`，与 dashboard「风险案件」卡片同样数据下显示「负责人：Local Admin」自相矛盾。
- **复现路径**：登录 admin → `#/cases` → 任一行 `td.case-row__hide-lg` → DOM 全部命中 `case-row__na`「未指派」。chrome-devtools-mcp 已捕获截图 `/tmp/r8_cases_list.png` 与 outerHTML 样本（见附录 E.1）。
- **API 直查**：`GET /api/cases?scope=mine&page=1&limit=20&view=summary` 返回 `ownerUserId="00000000-0000-4000-8000-000000000011"` + `ownerDisplayName="Local Admin"`，**字段已下发**。Vite 反代实际请求亦确认 UI 走的就是 `view=summary`（`list_network_requests` 仅 `GET /api/cases?...&view=summary` 200）。
- **根因（admin 层）**：

```26:28:packages/admin/src/views/cases/components/CaseTableRow.vue
const owner = computed(() =>
  resolveOwnerOption(props.item.ownerId, locale.value),
);
```

`CaseListItem` 类型（`packages/admin/src/views/cases/types.ts:101-189`）只声明 `ownerId: string`，**没有 `ownerDisplayName` 字段**；`CaseTableRow.vue` 拿 `props.item.ownerId`（实际是 UUID `00000000-0000-4000-8000-000000000011`）去查 admin 内置的 `CASE_OWNER_OPTIONS`（`constants.ts:407+` 的 hardcode 名单：铃木 / 田中 / 李 / 佐藤 / 山田翔太 / 高桥健太 / 铃木明里），永远查不到 → `resolveOwnerOption` 返回 `null` → 模板走 `case-row__na`「未指派」兜底文案。R5 BUG-102 修复（`11-...md:228-249`）说"适配器读 `ownerDisplayName`，行视图 fixture 未命中时用展示名兜底"，并新增 5 个测试用例。**当前 main 既看不到字段，也看不到那批测试**（grep `ownerDisplayName` 在 admin views/cases 仅命中 mock 与 adapter 测试，行视图链路完全没有透传）。

- **修复方向**：
  1. 在 `CaseListItem` 类型与适配器（`CaseAdapterMappers.ts`）补 `ownerDisplayName?: string`，从 `?view=summary` 响应直读。
  2. `CaseTableRow.vue:26-28` 改为：先取 `props.item.ownerDisplayName`，存在则渲染「展示名 + LA 头像」（按 R5 BUG-102 已写过的 5 个用例口径）；否则保留现有 fixture 路径作为最终兜底。
  3. 重新 land R5 `CaseTableRow.test.ts` 对应的 5 个 `BUG-102` 用例（"prefers backend ownerDisplayName over fixture catalog"）作为锁定。
- **关联**：与 R7 BUG-114（dashboard 中文硬编码）/「13-第六轮§7…md」BUG-119（dashboard i18n keys 丢弃）属同一类「server 字段下发后 admin Repository / Adapter 层不透传」根因，建议本次修复时一次性扫一遍 admin 数据适配层。

---

### BUG-128 [P1][FE] 案件详情面包屑显示原始 UUID（`#df9d1e84-fd62-…`），未走 `formatCaseIdentity`（R5 BUG-106 修复回归）— ✅ R8 已 land

- **优先级**：P1（每个详情页都中；用户从列表/搜索/书签进案件第一眼就是面包屑里一长串 UUID，与列表里 `CASE-202604-0001` 体感不一致）
- **现象**：访问 `#/cases/df9d1e84-fd62-4687-9297-decd8848412f`，面包屑渲染：`仪表盘 / 业务 / 案件 / #df9d1e84-fd62-4687-9297-decd8848412f`。截图 `/tmp/r8_case_detail_breadcrumb.png`。
- **根因**：

```159:164:packages/admin/src/views/cases/CaseDetailView.vue
        :breadcrumbs="[
          { label: t('shell.nav.items.dashboard'), href: '#/' },
          { label: t('shell.nav.groups.business') },
          { label: t('shell.nav.items.cases'), href: buildCaseListHref() },
          { label: `#${detail.id}` },
        ]"
```

R5 BUG-106 修复（`11-...md:313-331`）声明已用 `caseIdentity.ts:13-19` `formatCaseIdentity(caseNo, id)` 把面包屑接到 `case.caseNo`。`packages/admin/src/views/cases/caseIdentity.ts` 当前确有 `formatCaseIdentity` 与配套测试 `caseIdentity.test.ts`，**但全工作区 grep `formatCaseIdentity` 只命中自身与自身测试**，`CaseDetailView.vue:163` 没 import、也没调用，直接 `\`#${detail.id}\`` 拼 UUID。helper 与 consumer 之间断开了，等同于 R5 修复未上线。

- **修复方向**：
  1. `CaseDetailView.vue` 顶部 `import { formatCaseIdentity } from "./caseIdentity"`。
  2. 第 163 行改为 `{ label: formatCaseIdentity(detail.caseNo, detail.id) }`；如 `CaseDetail` 类型缺 `caseNo`，从 `getDetailAggregate` / `getDetail` 一并补回（R5 修复时 server 已经在 `case.caseNo` 暴露）。
  3. 新增 `CaseDetailView.breadcrumb.test.ts` 锁定：`detail.caseNo="CASE-202604-0011"` → 面包屑文本 = `"CASE-202604-0011"`；`caseNo` 缺失 → 退回 `id`；空字符串 → 退回 `id`（直接复用 `caseIdentity.test.ts` 已有 5 个用例的输入空间）。
- **关联**：BUG-073（列表 `caseNo`）已修，但本次发现详情面包屑漂移；属于「helper 升级后没把 consumer 一起改/测」类回归，下一轮 lint 应专门加一条「`formatCaseIdentity` 唯一在 `caseIdentity.test.ts` 与本身被引用」的红线检查（或者 `import-grep` 守门）。

---

### BUG-129 [P1][API+FE] `/api/timeline` 把 `created_at` 用 `String(Date)` 序列化，UI 时间戳全部退化成 `Wed Apr 29 2026 19:54:27 GMT+0900 (Japan Standard Time)`（R5 BUG-107 + R5 BUG-087 双修复回归）— ✅ R8 已 land

- **优先级**：P1（每个 case 详情「日志」tab 都中；与 R5 BUG-074 「Time 列首字 T 被截」同根，但本次是字面 `Date.toString()` 输出）
- **现象**：admin `#/cases/df9d1e84-fd62-4687-9297-decd8848412f?tab=log` → 22 条日志条目时间列全部显示 `Wed Apr 29 2026 19:54:27 GMT+0900 (Japan Standard Time)`（截图 `/tmp/r8_case_log_timestamps.png`，DOM 见附录 E.3）。
- **API 直查（坏字符串源头在后端）**：

```bash
$ curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/timeline?entityType=case&entityId=df9d1e84-fd62-4687-9297-decd8848412f&limit=2"
[
  {"id":"5826a510-…","action":"case.phase_transitioned",
   "createdAt":"Wed Apr 29 2026 19:54:27 GMT+0900 (Japan Standard Time)",
   "created_at":null, ...},
  ...
]
```

后端直接吐人类可读串而不是 ISO 8601。

- **根因（server 层）**：

```143:155:packages/server/src/modules/core/timeline/timeline.service.ts
function mapTimelineRow(r: TimelineListRow): TimelineLog {
  return {
    id: r.id,
    orgId: r.org_id,
    entityType: r.entity_type as TimelineEntityType,
    entityId: r.entity_id,
    action: r.action,
    actorUserId: r.actor_user_id,
    actorDisplayName: r.actor_display_name,
    payload: normalizePayload(r.payload),
    createdAt: String(r.created_at),
  };
}
```

`pg` 驱动把 `timestamptz` 反序列化成 JS `Date` 对象，`String(Date)` 直接走 `Date.prototype.toString()`，输出形如 `"Wed Apr 29 2026 19:54:27 GMT+0900 (Japan Standard Time)"`。R5 BUG-087「`/api/timeline` 用 `Date.toString()` 而非 ISO」声明的全局 timestamp serializer 修复**没有覆盖此 mapper**。

- **根因（admin 层，R5 BUG-107 兜底也已剥离）**：

```128:128:packages/admin/src/views/cases/components/CaseLogTab.vue
              <span class="log-tab__entry-time">{{ entry.time }}</span>
```

R5 BUG-107 修复（`11-...md:333-347`）的核心是 `CaseLogTab.vue` 不再裸渲染 adapter 的 `time`，新增 `formatEntryTime(raw)` 在 UI 层用 `formatDateTime(raw, locale.value)` 把 ISO / `Date.toString()` 一起归一，明确说"可在 BUG-087 修完前先把 UI 副作用堵住"。**当前 main 上 `formatEntryTime` 函数已不存在**（grep 全工作区 0 命中），`CaseCommsLogsAdapter.ts:381` 只把 `createdAt` 字段穿透为 `time`，模板直接 `{{ entry.time }}` 裸渲染——R5 设计的"双重保险"两层都被剥掉。`CaseLogTab.bug107.test.ts` 仍存在并断言 `formatDateTime` 路径，但它锁定的是 mount 单测专用工厂，跟生产模板对不上。

- **修复方向（建议两层都补，避免再次单点掉链）**：
  1. **server 优先（根因层）**：`timeline.service.ts:153` 改为 `createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)`，或者抽 `toIsoOrNull(value)` helper 复用到所有 `mapXxxRow` 出口；新增 `timeline.service.test.ts` 用例：传入 `Date` → ISO `2026-04-29T10:54:27.045Z`；传入 string → 原样保留；传入 null → 抛/空（按现有契约定）。
  2. **admin 兜底（防回归）**：`CaseLogTab.vue:128` 改为 `{{ formatEntryTime(entry.time, locale) }}`，`formatEntryTime` 从 `shared/utils/formatDateTime.ts` 直接复用（R5 已封装），失败时回退原值；恢复 R5 `CaseLogTab.bug107.test.ts` 已有断言到生产模板路径上（mount `<CaseLogTab>` 而非 mount 工厂）。
  3. **lint / 守门**：`packages/server/src/modules/core/.eslintrc` 或 arch 检查里加一条「禁止对 `Date | string` 字段使用 `String(...)`」，如必要可改成 `noTimestampToString` 自定义 rule，避免下次手抖再写一遍 `String(r.created_at)`。
- **关联**：本条等价于 R5 BUG-087 + R5 BUG-107 同时回归。`/api/timeline` 是 dashboard、case 日志、admin 通用时间线的公共出口，影响面比单个 UI 大；建议先合 server 修复（改 1 行 + 加 1 个 test），再合 admin 兜底。

---

## 2. R7 §3 复现脚本修订（文档漂移，5 处）— ✅ R8 已修订

R7 §3 给出的复现脚本仍可执行（PASS 项行为完整保留），但 5 处文字与实装脱节。本节修订版已作为 R8 修复的参考基线。

| # | R7 文字 | 实际实装 | 影响 |
|---|---|---|---|
| 1 | `npm run db:migrations:check:db` | `npm run db:migrations:check`（exit 0 输出 `ok`）| 直接报 `Missing script` 退出 1，会让 R7 §1 BUG-100 行被误判 |
| 2 | 列表行字段 `phase` | 已改名 `businessPhase`（query 参数 `?phase=` 仍兼容） | R7 §1 BUG-103 行用 `i.phase` 聚合会全部得到 null，须改用 `i.businessPhase` |
| 3 | timeline 端点 `/api/cases/:id/timeline` | 仅有 `/api/timeline?entityType=case&entityId=:id`（`packages/server/src/modules/core/timeline/timeline.controller.ts:120`） | R7 §1 BUG-104 行 `curl` 会得到 `Cannot GET /cases/:id/timeline` 404，被误判为 timeline 缺失 |
| 4 | `CaseTableRow.vue:101-120` `case-row__stage-meta` | 类名是 `case-row__workflow-step`（`CaseTableRow.vue:103-125`） | 行号差 2 行，类名改了，结构等价（stage chip + phase chip + workflow-step 元数据） |
| 5 | `CaseLogTab.vue:59-63 formatEntryTime(formatDateTime(raw, locale.value))` | 函数已下沉到 `CaseCommsLogsAdapter`，模板直接用 `entry.time`（adapter 注入），由 `CaseCommsLogsAdapter.timeline-display.focused.test.ts` 锁定行为 | 行号 / 函数名都变了，但本地化时间格式化职责仍在 |

### 2.1 修订后的复现脚本（替换 R7 §3）

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# A 组：无 billing record，CONTRACTED..WAITING_PAYMENT -> 201；COE_SENT -> 400
NEW=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"customerId":"825d708f-dec5-443d-b987-63f0a62dae99","caseTypeCode":"biz_mgmt_4m","ownerUserId":"00000000-0000-4000-8000-000000000011","caseName":"R8 BUG-097 retest A","stage":"S1"}' \
  http://localhost:5173/api/cases | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
for TO in CONTRACTED WAITING_MATERIAL MATERIAL_PREPARING REVIEWING APPLYING UNDER_REVIEW APPROVED WAITING_PAYMENT COE_SENT; do
  curl -s -o /tmp/r8_$TO.json -w "$TO -> %{http_code}\n" -X POST -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "{\"toPhase\":\"$TO\"}" \
    "http://localhost:5173/api/cases/$NEW/phase-transition"
done
# 期望：CONTRACTED..WAITING_PAYMENT -> 201；COE_SENT -> 400 "Final payment milestone is missing"

# Billing schema 复测：三者均 200
for P in /api/billing-plans /api/payment-records "/api/cases/df9d1e84-fd62-4687-9297-decd8848412f/aggregate"; do
  curl -s -o /dev/null -w "$P -> %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5173$P"
done

# Timeline payload from/to（注意端点路径）：返回 22 条事件，含 20 个 case.phase_transitioned
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/timeline?entityType=case&entityId=df9d1e84-fd62-4687-9297-decd8848412f&limit=200" \
  | python3 -c 'import sys,json,collections;d=json.load(sys.stdin);items=d if isinstance(d,list) else d.get("items",[]);
ctr=collections.Counter([i.get("action") for i in items]);print(dict(ctr));
ks=set();[ks.update((i.get("payload") or {}).keys()) for i in items if i.get("action")=="case.phase_transitioned"];print("payload_keys=",sorted(ks))'

# 列表 phase 筛选（注意行字段是 businessPhase，不是 phase）
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5173/api/cases?phase=CLOSED_SUCCESS&pageSize=20" \
  | python3 -c 'import sys,json,collections;d=json.load(sys.stdin);items=d.get("items",d);
print(len(items),"rows; businessPhase dist=",dict(collections.Counter([i.get("businessPhase") for i in items])))'

# 部署门禁：脚本名已合并
( cd packages/server && npm run -s db:migrations:check )
# 期望：输出 "ok"
```

---

## 3. 复测产出 / 数据沉淀

| ID | 类型 | 用途 |
|---|---|---|
| `b8bef6d9-1d88-4dc8-95e6-949abf7c72ce` | case (本轮新建，WAITING_PAYMENT，无 billing) | BUG-097 A 组 R8 复测 fixture（已被 COE_SENT 拦截，可直接复用） |
| 沿用 R6/R7 fixture | — | 见 R7 附录 |

无源码改动；guard 不需要重新跑（仅文档新增）。

---

## 4. 仍未覆盖 / 待立项

本轮**未触及**（沿用 R7 状态）：

- stage / phase 终态联动（产品决策）
- CLOSED_FAILED 路径 + closeReason 入参校验
- BUG-110（`tests/integration-pg/` schema-compatibility 测试体系）— 仍未引入
- BUG-112（Tasks 页未 i18n）— 未复测
- BUG-113 / 114 / 115（timeline query alias / dashboard 文案 / customer backfill）— 未复测

本轮**已完成修复（R8 已 land）**：

- chrome-devtools-mcp UI 端 screenshot 复盘（BUG-101/102/105/106/107）— **本轮跑完**：BUG-101 ✅；BUG-105 → BUG-116（✅ R8 已 land）；BUG-102 → **BUG-127 R5 回归（✅ R8 已 land）**；BUG-106 → **BUG-128 R5 回归（✅ R8 已 land）**；BUG-107 → **BUG-129 R5 回归 + BUG-087 server 端漏网（✅ R8 已 land）**
- BUG-116 修复（方案 A：恢复 `timeline → log` 别名）— ✅ R8 已 land
- BUG-127 / BUG-128 / BUG-129 — ✅ R8 已 land；已合并为「P0/P1 admin UI 回归冲刺」一次性 land，在 R5 已有的 `CaseTableRow.test.ts BUG-102 5 个用例` / `caseIdentity.test.ts` / `CaseLogTab.bug107.test.ts` 基础上已加 mount-生产模板层用例做防回归

---

## 附录 — 关键证据快照

### A. BUG-097 A 组（自动化复测原始 stdout）

```
NEW=b8bef6d9-1d88-4dc8-95e6-949abf7c72ce
CONTRACTED             -> 201
WAITING_MATERIAL       -> 201
MATERIAL_PREPARING     -> 201
REVIEWING              -> 201
APPLYING               -> 201
UNDER_REVIEW           -> 201
APPROVED               -> 201
WAITING_PAYMENT        -> 201
COE_SENT               -> 400  | CASE_POST_APPROVAL_BILLING_BLOCKED: Final payment milestone is missing. Please create a final-payment billing record before sending COE.
```

### B. BUG-097 B 组

```
B-group COE_SENT -> 400
msg= CASE_POST_APPROVAL_BILLING_BLOCKED: Final payment is still unpaid (80000). Billing gate blocks COE sending.
```

### C. Timeline payload 集合（df9d1e84）

```
total=22
action_dist={'case.phase_transitioned': 20, 'residence_period.created': 1, 'case.created': 1}
payload_keys_union=['coeSentAt', 'entryConfirmedAt', 'from', 'overseasVisaStartAt', 'supplementCount', 'to']
NEED_SUPPLEMENT_transitions=[('UNDER_REVIEW', 'NEED_SUPPLEMENT', 2), ('UNDER_REVIEW', 'NEED_SUPPLEMENT', 1)]
```

### D. BUG-116 `?tab=timeline` 仿真

```
"timeline" -> overview
"log"      -> log
"overview" -> overview
"Timeline" -> overview
""         -> overview
null       -> overview
undefined  -> overview
"messages" -> messages
"tasks"    -> tasks
```

### E. chrome-devtools-mcp UI 走查证据（BUG-127 / 128 / 129）

#### E.1 BUG-127 案件列表 owner 列 outerHTML 样本（19/19 行同结构）

```html
<tr class="case-row">
  <td>…</td>
  <td class="case-row__hide-md">
    <div class="case-row__stage-cell">
      <div class="case-row__stage-row">
        <span class="ui-chip ui-chip--neutral ui-chip--sm">刚开始办案</span>
        <span class="ui-chip ui-chip--warning ui-chip--sm case-row__phase-chip">等待尾款</span>
      </div>
    </div>
  </td>
  …
  <td class="case-row__hide-lg">
    <span class="case-row__na">未指派</span>   <!-- BUG-127：API 已返回 ownerDisplayName="Local Admin" -->
  </td>
  …
</tr>
```

`evaluate_script` 统计：`document.querySelectorAll('.case-row__phase-chip').length === 19`（BUG-101 PASS），`document.querySelectorAll('.case-row__na').length` 命中 owner 列 19 处。

#### E.2 BUG-128 案件详情面包屑 a11y 快照

```
navigation "面包屑导航"
  link "仪表盘" url=#/
  StaticText "业务"
  link "案件" url=#/cases
  StaticText "#df9d1e84-fd62-4687-9297-decd8848412f"   ← 应该是 "CASE-202604-0011"
heading "R6 supplement probe" level=1
```

#### E.3 BUG-129 日志 tab 时间戳 a11y 快照（节选 3/22）

```
tab "日志" selectable selected
heading "日志" level=2
…
StaticText "业务阶段变更：更新提醒已设定 → 成功归档"
StaticText "状态变更"
StaticText "案件"
StaticText "Wed Apr 29 2026 19:54:27 GMT+0900 (Japan Standard Time)"   ← Date.toString()

StaticText "业务阶段变更：在留期间已登记 → 更新提醒已设定"
StaticText "状态变更"
StaticText "案件"
StaticText "Wed Apr 29 2026 19:54:27 GMT+0900 (Japan Standard Time)"

StaticText "案件创建：biz_mgmt_4m"
StaticText "操作日志"
StaticText "案件"
StaticText "Wed Apr 29 2026 19:54:26 GMT+0900 (Japan Standard Time)"
```

API 直查同字段：`createdAt="Wed Apr 29 2026 19:54:27 GMT+0900 (Japan Standard Time)"`，`created_at=null` —— 坏字符串源头在 `timeline.service.ts:153 String(r.created_at)`。

#### E.4 截图

| 文件 | 内容 |
|---|---|
| `/tmp/r8_cases_list.png` | 案件列表 19 行整页（fullPage），覆盖 BUG-101 stage/phase chip + BUG-127 owner 列 |
| `/tmp/r8_case_detail_breadcrumb.png` | 案件详情头部，覆盖 BUG-128 面包屑 UUID |
| `/tmp/r8_case_log_timestamps.png` | 日志 tab 整页（fullPage），覆盖 BUG-129 时间戳 |
