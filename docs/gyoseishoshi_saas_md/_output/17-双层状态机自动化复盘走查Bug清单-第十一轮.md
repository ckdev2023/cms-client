# 客户/案件模块（admin）— 双层状态机自动化复盘走查 Bug 清单（第十一轮 / R10 BUG-131 / 132 已 land 验收 + 跨页面 i18n & 数据契约系统性扫描）

> 生成日期：2026-04-30（R10 同日 chrome-devtools-mcp UI 端验收 + 跨页面新偏差登记）
> 走查依据：
> - `docs/gyoseishoshi_saas_md/_output/16-双层状态机自动化复盘走查Bug清单-第十轮.md` §1 BUG-131 / 132（同位置不同字段同步度不一致）
> - `packages/admin/src/shared/ui/PageHeader.vue:50-66` 当前实装（R10 已 land）
> - `packages/admin/src/views/cases/CaseDetailView.vue:103-107, 169-184, 332` 当前实装（R10 已 land）
> - `packages/admin/src/views/cases/components/CaseOverviewTab.vue:63-89` 当前实装
> - `packages/admin/src/views/billing/components/BillingTable.vue:51-55, 124-127, 200-208` + `packages/admin/src/views/billing/fixtures.ts:43` 当前实装
> - `packages/admin/src/shared/model/useGroupOptions.ts:75-82, 121-128, 175-184` 当前实装
> - `packages/server/src/modules/core/groups/groups.service.ts:43, 239-241` + 同模式 7 处其它服务当前实装
>
> 走查工具：`chrome-devtools-mcp`（`navigate_page` / `take_snapshot` / `evaluate_script` / `take_screenshot` / `fill` / `list_console_messages` / `list_network_requests`） + `curl`（HTTP API） + 代码审查
> 走查环境：`http://localhost:5173/api`，本地 admin（`admin@local.test` / `Admin123!`）；后端 NestJS `:3300`，Vite 反代 `:5173`，PostgreSQL `cms-client-postgres-1` `:5433`
> 与第十轮 (`16-...md`) 互为续篇；本轮**先验 R10 BUG-131 / 132 修复，再扫 5 个权威 view × 3 locale 找跨页面系统性偏差**。

---

## 0. 第十一轮总结

### 0.1 关键事件

R10 文档 §1 抓出 BUG-131（PageHeader `aria-current=page` 唯一性）/ BUG-132（CaseDetailView stage Chip 未 i18n）。R10 当晚两条都改了代码（git status 标 `M packages/admin/src/shared/ui/PageHeader.vue`、`M packages/admin/src/views/cases/CaseDetailView.vue` 等），但 R10 文档只把 BUG-132 标 ✅，BUG-131 漏标。本轮先用 `chrome-devtools-mcp` 在三个 locale 把 R10/R8 五条逐一验收，再扫 admin 列表/详情/收费/Settings 找跨页面系统性偏差：

| # | 来源 | R11 UI 验收 | 一句话结论 |
|---|---|---|---|
| BUG-130（adapter `buildDetailHeader.caseNo` 透传） | R9 §1 / R10 §2.1 ✅ | **✅ PASS（继承）** | 面包屑显示 `CASE-202604-0011`，`hasCaseNoFormat=true` |
| BUG-131（PageHeader 中间 crumb 误标 aria-current） | R10 §1 P2 → R10 已 land（文档漏标） | **✅ PASS（R10 已 land）** | `[aria-current=page]` 计数 = 2（侧栏 1 + 末尾 crumb 1），不再含中间「业务」分组 |
| BUG-132（CaseDetailView stage Chip 未 i18n） | R10 §1 P1 ✅ R10 已 land | **✅ PASS（继承）** | header chip = `Case opened` (EN) / `案件開始` (JA) / `刚开始办案` (zh) 全 i18n |
| BUG-127（列表 owner 列回归 `Local Admin`） | R8 ✅ | **✅ PASS（继承）** | 19/19 行 owner = `Lo Local Admin` |
| BUG-129（日志时间戳格式化 + server ISO） | R8 ✅ | **✅ PASS（核心 PASS，但发现家族未完工，详见 §1 BUG-135）** | timeline 22/22 条 PASS；但 groups/feature-flags/tasks/customers/communication-logs 等 8 处仍走 `String(row.created_at)`，已通过 `/api/groups` 复现 |

### 0.2 新增偏差

| # | 优先级 | 现象 | 根因 |
|---|---|---|---|
| **BUG-133** | P1 [FE/i18n] | `CaseOverviewTab` 「当前办案进度」卡片在 EN/JA 下值显示 `资料收集中` 等 raw zh-CN 字面；终态案件下值变成硬编码字面常量 `"S9"`（不分 locale） | `CaseOverviewTab.vue:67-68` `{{ props.isTerminal ? "S9" : detail.stage }}`；`detail.stage` 来自 adapter `resolveStageLabel(stageId)`（`CaseAdapterShared.ts:108-110` 注释「不经过 i18n」），与 R10 BUG-132 修复完全同根，但只改了头部 chip，没改 overview |
| **BUG-134** | P1 [FE/i18n] | `BillingListView` 收费列表「所属 Group」筛选下拉，在 zh-CN / en-US 下选项仍显示 `東京一組` / `東京二組`（JA 字面） | `packages/admin/src/views/billing/fixtures.ts:43` `export const GROUP_OPTIONS: SelectOption[] = getActiveGroupOptions();` 在模块加载期调用，无 locale 参数；`useGroupOptions.ts:88` `normalizeGroupLocale(undefined) → "ja-JP"`，于是固化 JA 标签；切换语言后该常量不重新计算 |
| **BUG-135** | P1 [Server/data] | `/api/groups` 等 8 处接口 `createdAt` 字段返回 `"Mon Apr 27 2026 20:40:49 GMT+0900 (Japan Standard Time)"`（即 `Date.prototype.toString()`），违反 ISO 8601 契约；admin Settings → Group 管理表格直接展示原文（与 R8 BUG-129 同根） | `packages/server/src/modules/core/groups/groups.service.ts:43, 239, 241` 等 8 处仍写 `String(row.created_at)`；R8 已为 timeline 引入 `toTimestampString` / `requireTimestampString` (`packages/server/src/modules/core/model/timestamps.ts`)，但未横向迁移其它服务 |
| **BUG-136** | P1 [FE/data] | `CustomerListView` 「所属分组」列在 zh-CN 下显示 `ef21fdd2-1ffc-4a27-8b47-a640d6bd021c`（真实 DB Group UUID） | `shared/model/useGroupOptions.ts:175-184` `resolveGroupLabel` 仅匹配静态 catalog 三项 (`tokyo-1` / `tokyo-2` / `osaka`)；`/api/customers` 返回的 `group` 字段是真实 DB UUID（与 `/api/groups[].id` 对齐），未通过任何 join 翻译为 group name → 落入 `if (!found) return idOrLabel` 分支 |

### 0.3 三句话结论

1. **R10 修了一半，文档漏标了一半**：BUG-131 实测已 land（PageHeader.vue + 13 条单测，含「中间无 href crumb 不带 aria-current」用例），但 R10 doc §0.1 表格只标了 BUG-132，BUG-131 仍写「BUG-131 ❌ FAIL」。R11 把 BUG-131 实测结果（aria-current 计数 = 2）补回闭环。
2. **R10 BUG-132 修了头部 chip，没修 overview 卡（BUG-133 是 132 的镜像）**：相同的「raw `detail.stage` 插值」泄漏出现在 `CaseOverviewTab.vue:67-68`，并且因为 `props.isTerminal ? "S9" : detail.stage` 还引入了「终态硬编码代码字面」分支——同一案件页面会同时出现「Case opened」（chip）+「S9」（overview），是直观可见的双口径分裂。本轮扫描进一步抓出 BUG-134（billing GROUP_OPTIONS 静态化）和 BUG-136（customer group UUID 直显），三者同属「资源齐全 / view 层未消费」的同根问题。
3. **服务端 ISO 时间戳契约只完成了 1/8**：R8 引入 `toTimestampString` helper 后只迁移了 timeline / cases / case-parties / document-items / document-files / residence-periods / submission-packages / reminders 等 ~7 处；本轮 grep `String(.*created_at)` 仍命中 groups / feature-flags / tasks / customers / communication-logs / contact-persons / companies 共 7 个文件 ~12 处，已用 `/api/groups` UI 端复现「Mon Apr 27 ...」的浏览器侧文本。建议把 `no-string-cast-on-timestamp` 列为 server lint 红线。

---

## 1. 新增 Bug

### BUG-133 [P1][FE/i18n] `CaseOverviewTab` 「当前办案进度」卡片未 i18n + 终态硬编码 `"S9"`，与 R10 已 land 的 BUG-132 头部 chip 双口径不一致

- **优先级**：P1（每个非 zh-CN 用户进任一案件详情第一眼都中；与 BUG-132 同样属于 EN/JA 体验破坏；额外引入「同页两口径」误导）
- **现象**：
  - 取 CASE-202604-0004 (`ea8b75b0-…`)，stage=S2 / phase=NEW_INTAKE：

    | locale | header chip | overview 值 | overview 副 |
    |---|---|---|---|
    | zh-CN | 资料收集中 | 资料收集中 | S2 |
    | en-US | Collecting documents | **资料收集中** ❌ | S2 |
    | ja-JP | 資料収集中 | **资料收集中** ❌ | S2 |

  - 取 CASE-202604-0011 (`df9d1e84-…`)，stage=S1 / phase=CLOSED_SUCCESS（数据上 stage 与 phase 失配，是 R10 §4「stage / phase 终态联动」遗留，本轮不在此立项；但下面是 view 层暴露的偏差）：

    | locale | header chip | overview 值 | overview 副 |
    |---|---|---|---|
    | zh-CN | 刚开始办案 | **S9** ❌ | 已结案 |
    | en-US | Case opened | **S9** ❌ | Closed |
    | ja-JP | 案件開始 | **S9** ❌ | 結案済み |

    > 同一头部里 chip 显示「Case opened」（=S1 i18n 译文），同页下方 overview 卡却显示硬编码 `"S9"`（不带 label，不分 locale）。

- **chrome-devtools-mcp 取证**：

  ```js
  // navigate_page → /#/cases/df9d1e84-… ; locale=en-US
  {
    headerChips: ["Case opened","Closed (success)"],
    overviewStageValue: "S9",     // ← 硬编码字面常量，不带 label，不分 locale
    overviewStageMeta:  "Closed", // ← 这一项已正确 i18n
  }

  // navigate_page → /#/cases/ea8b75b0-… ; locale=ja-JP
  {
    headerChips: ["資料収集中","資料待ち"],     // ← 头部 chip OK（R10 BUG-132 fix）
    overviewStageValue: "资料收集中",          // ← BUG-133，raw zh-CN fallback
    overviewStageMeta:  "S2",
  }
  ```

- **根因**：

  ```63:89:packages/admin/src/views/cases/components/CaseOverviewTab.vue
  <div class="overview-tab__stat" data-testid="overview-card-stage">
    <span class="overview-tab__stat-label">{{
      t("cases.detail.overview.cards.stage")
    }}</span>
    <span class="overview-tab__stat-value">{{
      props.isTerminal ? "S9" : detail.stage
    }}</span>
    <span class="overview-tab__stat-meta">
      ...
      {{
        props.isTerminal
          ? t("cases.detail.terminalStage.label")
          : detail.stageMeta
      }}
    </span>
  ```

  - `detail.stage` 来自 `CaseAdapterDetailAggregate.ts:280` `stage: resolveStageLabel(stageId)`，注释明写「fallback 标签（不经过 i18n）」（同 R10 BUG-132 §「根因」结论）。
  - `props.isTerminal ? "S9" : detail.stage` 把「终态」与「非终态」分别走两个不同的取值口径：终态时强行展示**代码 `"S9"`**，非终态时展示 zh-CN fallback 标签——两条路径都没经过 i18n。
  - 而 R10 已为 `CaseDetailView.vue:103-107` 引入了正确版本：

    ```103:107:packages/admin/src/views/cases/CaseDetailView.vue
    const stageLabel = computed(() => {
      if (!detail.value) return "";
      const key = getStageI18nKey(detail.value.stageCode);
      return key ? t(key) : detail.value.stage;
    });
    ```

    overview 卡片完全可以镜像同款 `stageLabel` 计算属性即修。

- **修复方向**（与 R10 BUG-132 修复对齐，最小变更，不引入新数据通路）：

  ```ts
  // CaseOverviewTab.vue <script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { getStageI18nKey } from "../constants";

  const { t } = useI18n();
  const props = defineProps<{ detail: CaseDetail; isTerminal: boolean }>();

  const stageValue = computed(() => {
    if (props.isTerminal) {
      // 「终态」可继续展示「已结案 / Closed / 結案済み」一致译文
      return t("cases.detail.terminalStage.label");
    }
    const key = getStageI18nKey(props.detail.stageCode);
    return key ? t(key) : props.detail.stage;
  });
  ```

  ```vue
  <span class="overview-tab__stat-value">{{ stageValue }}</span>
  ```

  > 副本（meta）侧已正确 i18n（`t("cases.detail.terminalStage.label")`），值（value）侧无须再保留 `"S9"` 硬编码：副本里再展示「Closed / 結案済み」即同一信息，而值显示 i18n 化阶段名更符合 chip 一致性。

- **测试补强（防回归）**：
  1. `CaseOverviewTab.test.ts` 新增 zh-CN / en-US / ja-JP × {S2 非终态, CLOSED 终态} = 6 用例：断言 stage 值不等于硬编码 zh-CN 字面、不等于 `"S9"`、且与 `t(getStageI18nKey(stageCode))` 一致。
  2. `CaseDetailView.bug132.test.ts`（R10 已存在）扩 1 句：mount 详情页后断言 header chip 与 overview 卡 stage 文本同 i18n key 来源（避免再次出现「同页双口径」）。
  3. （可选）admin lint：禁止在 `views/cases/**` 内出现 `{{ \w*detail\.stage }}` 直接插值（必须走 computed）。

- **关联**：BUG-132（R10 已 land 头部 chip）的镜像；与 R9 BUG-128 → 130 → 131/132/133 的链路同根：单组件单测 PASS，但跨组件「同位置不同字段同步度」无契约保护。

---

### BUG-134 [P1][FE/i18n] `BillingListView` 收费列表「所属 Group」筛选下拉永远是 JA 默认（`東京一組` / `東京二組`），不随 i18n 切换

- **优先级**：P1（zh-CN / en-US 用户在收费列表筛选时看到日文标签；admin 三种语言至少有两种命中；与 R10 BUG-132 「raw 字段透传」属同一类「资源齐全 / 调用层错位」偏差）
- **现象**：
  - zh-CN 下：筛选下拉值 = `["所有 Group", "東京一組", "東京二組"]`，期望 `["所有 Group", "东京一组", "东京二组"]`。
  - en-US 下：值 = `["All groups", "東京一組", "東京二組"]`，期望 `["All groups", "Tokyo Team 1", "Tokyo Team 2"]`。
  - ja-JP 下：值 = `["全てのグループ", "東京一組", "東京二組"]`，期望与现状相同（巧合 PASS）。

- **chrome-devtools-mcp 取证（en-US）**：

  ```js
  // navigate_page → /#/billing ; fill(uid="lang-combobox", value="English")
  {
    lang: "en-US",
    filterOptions: [
      ..., "All groups",
      "東京一組",   // ← BUG-134 (期望 "Tokyo Team 1")
      "東京二組",   // ← BUG-134 (期望 "Tokyo Team 2")
      "All owners", ...
    ],
    headers: ["", "Case name", "Customer", "Group", "Due (¥)", "Received (¥)", "Outstanding (¥)", "Next billing node", "Payment status", "Billing Risk Acknowledgement", "Actions"]
  }
  ```

- **根因（资源齐全，仅初始化时机错）**：

  ```43:43:packages/admin/src/views/billing/fixtures.ts
  export const GROUP_OPTIONS: SelectOption[] = getActiveGroupOptions();
  ```

  ```83:101:packages/admin/src/shared/model/useGroupOptions.ts
  function normalizeGroupLocale(locale?: string): GroupLocale {
    const normalized = locale?.trim().toLowerCase();
    if (normalized?.startsWith("zh")) return "zh-CN";
    if (normalized?.startsWith("en")) return "en-US";
    if (normalized?.startsWith("ja")) return "ja-JP";
    return "ja-JP";   // ← 不传 locale 时默认 JA
  }
  ...
  export function getActiveGroupOptions(locale?: string): GroupSelectOption[] {
    return GROUP_CATALOG.filter((g) => g.status === "active").map(
      ({ value, labels }) => ({
        value,
        label: labels[normalizeGroupLocale(locale)],
      }),
    );
  }
  ```

  - `getActiveGroupOptions()` 在模块加载期被调用，没有 locale → 走 `"ja-JP"` 默认分支。
  - 该常量被 `BillingListView.vue:45, 269` 复用为 `groupOptions: GROUP_OPTIONS`，也被 `BillingTable.vue` 间接通过 props 渲染。
  - 一旦 `GROUP_OPTIONS` 被冻结成 JA 字面，i18n locale 切换不会触发其重新求值（这是普通 `const`，不是 `computed` / `useI18n` 响应式来源）。

- **修复方向（与 `CustomerListView` / `CustomerTableRow` 已使用 `locale.value` 的写法对齐）**：

  ```ts
  // BillingListView.vue <script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { getActiveGroupOptions } from "../../shared/model/useGroupOptions";

  const { locale } = useI18n();
  const groupOptions = computed(() => getActiveGroupOptions(locale.value));
  ```

  并把 `BillingTable.vue:51-55` 的内部 `GROUP_KEY` 静态映射也改为 `resolveGroupLabel(row.group, t("shared.group.disabledSuffix"), locale.value)`（与 `CustomerTableRow.vue:42-48` 一致），从而让表格行内 Group Chip 同步走 i18n。

  另：`packages/admin/src/views/billing/fixtures.ts:43` 的 `export const GROUP_OPTIONS = getActiveGroupOptions();` 应**删除/改为函数**，避免再被任何模块在 import 时固化语言。

- **测试补强（防回归）**：
  1. `useBillingFilters.test.ts` 已 stub 了 `GROUP_OPTIONS`，需要补一个 mount-level 用例：在 `BillingListView` mount 后切换 `i18n.global.locale`，断言 `groupOptions` 重新计算且首条标签等于 `t("billing.list.groups.tokyo-1")`。
  2. （守门）admin lint 自定义规则：禁止 `views/**/fixtures.ts` 在模块顶层调用 `getActiveGroupOptions(...)` / `getAllGroupOptions(...)` 等带 locale 的 helper（必须延迟到组件层 `computed`）。

- **关联**：与 BUG-133 同属「i18n 资源齐全 / 调用层未消费」；与 BUG-132 不同的是这里是「时机错位」（模块顶层冻结）而非「未走 i18n」。

---

### BUG-135 [P1][Server/data] 服务端 8 处仍用 `String(row.created_at)` 透传 `Date.prototype.toString()`，违反 R8 引入的 ISO 时间戳契约（BUG-129 家族未完工） ✅ R11 已 land

- **状态**：R11 已 land — 7 个文件 13 处全部迁移到 `requireTimestampString` / `toTimestampStringOrNull`（`packages/server/src/modules/core/model/timestamps.ts`）。新增 server lint 红线 `no-restricted-syntax` 锁死 `String(*._at)` 模式；新增 `timestamps.bug135-regression.test.ts`（16 用例 × 7 service）覆盖 `Date` / `string` / `null` 三种 pg 行形态。
- **优先级**：P1（admin Settings → Group 管理表格、CMS 列表/详情多个 view 的时间戳字段都会受影响；与 R8 BUG-129 同根，已在 timeline 完成的迁移没有横向覆盖）
- **现象**：
  - `/api/groups` 直查：

    ```jsonc
    // GET /api/groups?limit=5
    {
      "items": [{
        "id": "ef21fdd2-...",
        "name": "tokyo-1",
        "createdAt": "Mon Apr 27 2026 20:40:49 GMT+0900 (Japan Standard Time)"
      }]
    }
    ```

  - admin Settings → Group 管理表格 UI 端：

    ```js
    // navigate_page → /#/settings ; tbody 第一行
    ["tokyo-1", "启用", "Mon Apr 27 2026 20:40:49 GMT+0900 (Japan Standard Time)", "0", "0"]
    //                  ↑ BUG-135：raw Date.prototype.toString()，应为 "2026/04/27" 之类格式化文案
    ```

- **根因（grep `String\(.*created_at\)` 命中 7 个文件 12+ 处）**：

  | 文件 | 行 | 当前写法 | R11 修复后 |
  |---|---|---|---|
  | `packages/server/src/modules/core/groups/groups.service.ts` | `:43, 79, 239, 241` | `String(row.created_at)` / `String(row.joined_at)` / `String(groupRow.updated_at)` | `requireTimestampString(row.created_at, "created_at")` 等（含 R10 文档漏写的 `joined_at`） |
  | `packages/server/src/modules/core/customers/customers.utils.ts` | `:75-76` | `String(row.created_at)` / `String(row.updated_at)` | `requireTimestampString(...)` |
  | `packages/server/src/modules/core/communication-logs/communicationLogs.shared.ts` | `:147` | `String(row.created_at)` | `requireTimestampString(...)` ＋ 删除模块内重复 helper |
  | `packages/server/src/modules/feature-flags/featureFlags.service.ts` | `:202-203` | 同 | 同 |
  | `packages/server/src/modules/core/contact-persons/contactPersons.service.ts` | `:52-53` | 同 | 同 |
  | `packages/server/src/modules/core/tasks/tasks.service.ts` | `:118-119` | 同 | 同 ＋ 删除模块内重复 helper（统一走 `core/model/timestamps.ts`） |
  | `packages/server/src/modules/core/companies/companies.service.ts` | `:64-65` | 同 | 同 |

  R8 已在 `packages/server/src/modules/core/model/timestamps.ts` 引入 `toTimestampStringOrNull` / `requireTimestampString`：

  ```1:32:packages/server/src/modules/core/model/timestamps.ts
  export function toTimestampStringOrNull(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    return null;
  }
  export function requireTimestampString(value: unknown, field: string): string {
    const s = toTimestampStringOrNull(value);
    if (!s) throw new Error(`Invalid timestamp: ${field}`);
    return s;
  }
  ```

  并已被 `timeline / cases / case-parties / document-items / document-files / residence-periods / submission-packages / reminders / templates` 等 ~9 个模块消费；剩余 7 个模块未迁移。

- **修复方向**：把 7 个文件 12+ 处统一替换为：

  ```ts
  // 旧：createdAt: String(row.created_at)
  createdAt: requireTimestampString(row.created_at, "created_at"),
  ```

  对可空字段（`updated_at` / `deleted_at` 之类）使用 `toTimestampStringOrNull(...)`。

- **测试补强（防回归）**：
  1. `packages/server/eslint.config.cjs` 加自定义规则 `no-string-cast-on-timestamp`（或 `no-restricted-syntax`）：

      ```js
      "no-restricted-syntax": ["error", {
        selector: "CallExpression[callee.name='String'][arguments.0.property.name=/.*_at$/]",
        message: "Use toTimestampString helpers from core/model/timestamps.ts instead of String() on timestamp columns.",
      }]
      ```

  2. 对每个被改的服务都补 1 条单测：mock pg 行返回 `created_at: new Date(...)` 与 `created_at: "2026-..."` 两种类型，断言 service 输出始终是 ISO 字符串（与 timeline `timeline.service.test.ts` 相同模式）。
  3. 守门：admin 端的 `dateOnly` / `formatDate` helper 已在 PR 中被 BUG-129 覆盖，但 Settings → Group 管理（`GroupListPanel.vue:160`）目前是裸 `{{ group.createdAt }}`，等 server 修后这里也建议补一个 `{{ formatDate(group.createdAt) }}` 的薄包装。

- **关联**：R8 BUG-129 的家族；当时只覆盖了 timeline + cases，没把整个时间戳契约统一。本轮通过 admin Settings 页面意外暴露。
- **R11 land 摘要**（2026-04-30）：
  - 修改文件：`packages/server/src/modules/core/{groups,customers,communication-logs,contact-persons,tasks,companies}/*` + `packages/server/src/modules/feature-flags/featureFlags.service.ts` + `packages/server/eslint.config.cjs`
  - 新增测试：`packages/server/src/modules/core/model/timestamps.bug135-regression.test.ts`（16 用例，覆盖 7 个 mapper × {Date / string / null}）
  - 守门规则：eslint `no-restricted-syntax` 选择器 `CallExpression[callee.name='String'][arguments.0.type='MemberExpression'][arguments.0.property.name=/^.*_at$/]`，并附带 BUG-135 错误文案；故意构造 `String(row.created_at)` 触发可复现 lint 报错
  - 全量 server unit test：3022 / 3026 PASS（其余 4 个为预存 skip）；typecheck 干净；admin Settings → Group 管理 `createdAt` 字段已恢复 ISO 8601 文本契约

---

### BUG-136 ✅ [P1][FE/data] `CustomerListView` 「所属分组」列在真实 DB Group 下显示原始 UUID，因为 `useGroupOptions.ts` 静态 catalog 与 `/api/groups` 未对齐（R11 已 land）

- **优先级**：P1（每个属于 fixture 之外（即真实创建）的 group 客户都中；当前测试库 1/2 客户命中；产品演示场景必触发）
- **现象**：
  - `navigate_page → /#/customers`，第一行 Group Chip 显示 `ef21fdd2-1ffc-4a27-8b47-a640d6bd021c`：

    ```js
    {
      lang: "zh-CN",
      groupCells: ["ef21fdd2-1ffc-4a27-8b47-a640d6bd021c", ""],
      // 第一行客户 R6试探客户：raw UUID
      // 第二行客户 Tani Keiei Cert4M Test：customer.group = ""，留空（也是问题，但优先级低）
    }
    ```

  - API 端：

    ```jsonc
    // GET /api/customers?limit=2
    [
      { "id": "825d708f-...", "displayName": "R6试探客户", "group": "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c" },
      { "id": "97f1c48d-...", "displayName": "Tani Keiei Cert4M Test", "group": "" }
    ]

    // GET /api/groups
    { "items": [{ "id": "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c", "name": "tokyo-1", ... }] }
    ```

  - 即 `customer.group = group.id`（UUID 对齐）；只是 admin 前端没有做这一步 join。

- **根因**：

  ```45:73:packages/admin/src/shared/model/useGroupOptions.ts
  const GROUP_CATALOG: readonly GroupCatalogEntry[] = [
    { value: "tokyo-1", status: "active", labels: { ... } },
    { value: "tokyo-2", status: "active", labels: { ... } },
    { value: "osaka",   status: "disabled", labels: { ... } },
  ] as const;
  ```

  ```175:184:packages/admin/src/shared/model/useGroupOptions.ts
  export function resolveGroupLabel(idOrLabel: string, disabledSuffix = "（已停用）", locale?: string): string {
    const found = GROUP_CATALOG.find((g) => matchesGroup(g, idOrLabel));
    if (!found) return idOrLabel;          // ← BUG-136：未命中静态 catalog 时直接返回原 UUID
    ...
  }
  ```

  - `GROUP_CATALOG` 是硬编码 fixture（fixture 阶段 OK），但实际 DB groups 用的是真实 UUID + `name="tokyo-1"`（即 `name` 字段恰好等于 catalog 的 `value`）。`matchesGroup` 不检索 UUID，也不通过 `/api/groups` 解析。
  - `CustomerTableRow.vue:42-48` 调用 `resolveGroupLabel(props.customer.group, ...)`，落入 `if (!found) return idOrLabel` 分支。

- **修复方向**（两段渐进）：

  1. **短期（不改架构）**：让 `resolveGroupLabel` 在未命中时降级显示「未知分组」或空串，至少不暴露 UUID：

      ```ts
      if (!found) return disabledSuffix ? "—" : idOrLabel.length === 36 ? "—" : idOrLabel;
      ```

  2. **中期（正解）**：把 `useGroupOptions.ts` 的 `GROUP_CATALOG` 改为「fixture + 运行期合并 `/api/groups` 结果」的双源结构：
      - 新增 `useGroupsRepository` (`packages/admin/src/shared/data/groupsRepository.ts`)，封装 `GET /api/groups`；
      - app shell 启动时 prefetch 一次，写到 Pinia store；
      - `resolveGroupLabel(idOrLabel)` 先在 store 里查，找不到再回落到静态 catalog。
      - 对应 `customer.group = UUID` 时 → store 里找到 `name="tokyo-1"` → `resolveGroupLabel("tokyo-1")` → 显示 zh-CN「东京一组」。

  > 当前 `Settings → Group 管理` 已经有 `/api/groups` 数据通路（`GroupsRepository.ts` 存在），可直接复用，不必新增接口。

- **测试补强（防回归）**：
  1. `CustomerTableRow.test.ts` 新增 1 用例：`customer.group = "<uuid>"` 时，期望 chip 文本不是 UUID（短期方案下 = `"—"`，中期方案下 = group name 译文）。
  2. `useGroupOptions.test.ts` 新增反向断言：`resolveGroupLabel("<random-uuid>")` 不允许返回入参 UUID。
  3. （守门）admin lint：cell 渲染层禁止透传未经 `resolve*` 的 ID 字段（与 BUG-133 同款规则共用）。

- **关联**：与 R9 BUG-127（owner 列直显 raw `''`）同根：admin 长期把 fixture 当真实数据源；一旦 server 喂入真实 UUID，前端 join 缺失立刻显形。

- **R11 修复落点（已 land）**：
  1. `packages/admin/src/shared/model/useGroupOptions.ts`：新增基于 Vue `ref` 的运行期别名表 `groupAliasesRef: ReadonlyMap<string, string>`，并暴露 `registerGroupAliases({ id, name }[])` 与 `clearGroupAliases()` 两个 helper。`matchesGroup` 在 catalog 直匹配后通过 `lookupAlias` 把 UUID 翻译成 catalog `value`，因此 `resolveGroupLabel` / `resolveGroupValue` / `isGroupDisabled` 全部透明地走别名；同时新增 UUID 形态识别（`/^[0-9a-f]{8}-…$/i`），未命中且非别名时回落到占位符 `"—"`，绝不直显 UUID。
  2. `packages/admin/src/shared/model/groupOptions.ts`：补充 `registerGroupAliases` / `clearGroupAliases` 与 `GroupAliasEntry` 的 re-export，保持与 `useGroupOptions` 入口一致。
  3. `packages/admin/src/App.vue`：复用既有 `createGroupsRepository`（`views/settings/model/GroupsRepository`），在 `isAuthenticated` 切换为 true 时调用 `refreshGroupAliases() → listGroups() → registerGroupAliases(items.map(...))`；登出时 `clearGroupAliases()`，与 `refreshOrgSettings` 同生命周期。这条 prefetch 仅依赖 admin shell（不是任何 feature 内部），因此所有列表/详情页（customers / leads / billing / cases）首屏即可命中翻译。
  4. **测试**：
     - `useGroupOptions.test.ts` 新增 `describe("registerGroupAliases (BUG-136)", ...)`，9 条用例覆盖：UUID → catalog 译文 / 跨 locale / disabled 后缀传播 / catalog 外原名回落 / `resolveGroupValue` 反解 / 空白 entry 忽略 / `clearGroupAliases` 重置 / 重复注册覆盖 / 反向断言「输出永不等于输入 UUID」。
     - 新增 `CustomerTableRow.bug136.test.ts`（7 用例）锁定 group cell `.ui-chip` 渲染契约：UUID 未注册 = `"—"`、UUID 注册到 catalog 内 = 本地化标签、UUID 注册到 catalog 外 = 服务端原名、注册后即时 re-render（验证响应式）、locale 切换跟随、catalog `value` 直接传入仍按旧行为渲染、disabled 别名传 `disabledSuffix`。
  5. **验证**：`npx vitest run --no-coverage src/views/customers src/views/cases src/views/leads src/views/billing src/shared/`：219 文件 × 4350 用例 0 fail（含上述新增 16 条）。

---

## 2. UI 端验收证据（BUG-130 / 131 / 132 / 127 / 129）

### 2.1 BUG-131 ✅ `PageHeader` 中间无 href crumb 不再误标 `aria-current="page"`（R10 已 land，文档漏标）

- **走查路径**：`navigate_page → /#/cases/df9d1e84-fd62-4687-9297-decd8848412f`
- **DOM 取证（与 R10 §1 BUG-131「现象」对照）**：

  ```js
  {
    totalAriaCurrentPage: 2,                                           // ← 期望 2，PASS（R10 文档写「实测 = 3」即未更新）
    breadcrumbs: [
      { text: "仪表盘",            aria: null,   href: "#/" },
      { text: "业务",              aria: null,   href: null  },        // ← R10 修复：不再 aria-current
      { text: "案件",              aria: null,   href: "#/cases" },
      { text: "CASE-202604-0011",  aria: "page", href: null  }         // ← 唯一 aria-current=page (PASS)
    ]
  }
  ```

- **代码层位点（已 land）**：

  ```57:66:packages/admin/src/shared/ui/PageHeader.vue
  <span
    v-else-if="i === breadcrumbs.length - 1"
    class="ui-page-header__crumb ui-page-header__crumb--current"
    aria-current="page"
  >
    {{ crumb.label }}
  </span>
  <span v-else class="ui-page-header__crumb ui-page-header__crumb--group">
    {{ crumb.label }}
  </span>
  ```

  与 R10 §1「修复方向」的伪代码完全一致，并且新增了 `--group` modifier class 便于视觉差异化。

- **测试覆盖（已 land）**：`packages/admin/src/shared/ui/PageHeader.test.ts:65-100` 共 4 条与 BUG-131 直接相关的用例（`only the last breadcrumb gets aria-current` / `middle non-href crumb is rendered as a plain group label without aria-current` / `falls back to current span when only one non-href crumb is provided` / 默认 4-crumb 渲染数量）。

### 2.2 BUG-132 ✅ `CaseDetailView` 头部 stage Chip i18n（R10 已 land）

- **走查路径**：`navigate_page → /#/cases/df9d1e84-…` × 3 locale。
- **DOM 取证**：

  | locale | header chip[0] (stage) | header chip[1] (phase) |
  |---|---|---|
  | zh-CN | 刚开始办案 | 成功归档 |
  | en-US | Case opened | Closed (success) |
  | ja-JP | 案件開始 | 成功クローズ |

  与 R10 BUG-132 §「修复方向」结果完全一致。`CaseDetailView.vue:103-107` 引入的 `stageLabel` computed 是 R10 land 点。

- **附加证据**：`packages/admin/src/views/cases/CaseDetailView.bug132.test.ts:1-200`（R10 新增 33 用例）已为 `zh-CN / en-US / ja-JP × S1..S9` 共 27 组 stageLabel 译文 + 4 反向 + 2 readonlyBanner 共 33 用例提供契约保护。

### 2.3 BUG-130 ✅ 案件详情面包屑 caseNo（R9 已 land）

- 与 R10 §2.1 完全一致，PASS 继承。

### 2.4 BUG-127 ✅ 列表 owner 列回显 `Local Admin`（R8 已 land）

- 19/19 行 owner 字段 = `Lo Local Admin`，0 行 NA；与 R10 §2.3 一致。

### 2.5 BUG-129 ✅ 日志 tab 时间戳格式化（R8 已 land，**核心 PASS 但家族未完工**）

- 案件日志 tab 22/22 条时间戳 = `"2026/04/29 19:54"` 格式（与 R10 §2.4 一致），**timeline 路径 PASS**。
- 但本轮在 Settings 页扫到 groups 路径仍走 raw `String(Date)` —— 详见 §1 BUG-135。

---

## 3. 顺手补充观测（不立 bug，但建议跟踪）

### 3.1 `customer.group = ""` 留空显示

- BUG-136 同行：第二行客户 `Tani Keiei Cert4M Test` 的 group cell 完全空（无 chip、无 `—`）。视觉上让用户误以为「所属分组」列对该行不适用。建议用 `t("shared.group.unassigned")` 之类显式占位。

### 3.2 `[role=tab]` 仍未关联 `aria-controls=tabpanelId`

- 与 R10 §3.4 同；本轮再次确认 10 个详情 tab 的 a11y 关联仍缺。优先级低于 BUG-131，记录续延。

### 3.3 zh-CN 下「フリガナ」未本地化

- 顾客列表第二列 header / 搜索 placeholder / 过滤标签都是 `フリガナ`（JA 字面）；i18n 资源 `packages/admin/src/i18n/messages/zh-CN.ts:146-158` 中 `searchPlaceholder` 和 `filters.furigana` 显式写了 `"フリガナ"`。这一项与表单字段中 `kana: "假名（片假名）"`（zh-CN 字面）写法不一致，但可能是产品有意保留 JA 业务术语；**不立 bug**，建议产品确认。

### 3.4 收费表「下一收款节点」cell 直显 zh-CN `尾款`（all locale）

- `BillingTable.vue:243-264` 直接渲染 server 返回的 `row.nextNode.name`（DB 字段，zh-CN 字面 `尾款` / `着手金`）。与 BUG-135 同属「server 直接返回 zh-CN 业务字面」，但优先级低（业务里程碑命名通常是 admin 录入文案，不是枚举），**不立 bug**，先记观测；若产品要求多语言，server 应返回 `i18nKey` + `name` 两字段。

### 3.5 CASE-202604-0011 stage=S1 & phase=CLOSED_SUCCESS（数据失配）

- `/api/cases/df9d1e84-…/aggregate` 返回 `stage: "S1", businessPhase: "CLOSED_SUCCESS"`；R10 §4 已记「stage / phase 终态联动 — 产品决策」。本轮通过 `CaseOverviewTab` 的硬编码 `"S9"` 分支再次浮出水面。**不立 bug**，但 BUG-133 修完后这个数据失配会**直接对用户可见**（chip "Case opened" + meta "Closed"），需要产品尽快定调 stage 自动跃迁规则。

---

## 4. 仍未覆盖 / 待立项

本轮**未触及**（沿用 R10 §4 状态）：

- BUG-110（`tests/integration-pg/` schema-compatibility 测试体系）
- BUG-112（Tasks 页未 i18n）
- BUG-113 / 114 / 115（timeline query alias / dashboard 文案 / customer backfill）
- stage / phase 终态联动（产品决策；本轮 §3.5 再次出证）
- CLOSED_FAILED 路径 + closeReason 入参校验
- a11y `[role=tab]` ↔ `[role=tabpanel]` 关联（R10 §3.4 / R11 §3.2）

本轮**新增待立项**：

- **BUG-133** — `CaseOverviewTab` stage 卡片 i18n + 终态硬编码（详见 §1）
- **BUG-134** — `BillingListView` GROUP_OPTIONS 模块级 JA 默认（详见 §1）
- **BUG-135** — server 7 文件 `String(Date)` 时间戳契约违反（详见 §1）
- **BUG-136** — `CustomerListView` group 列直显真实 DB UUID（详见 §1）
- **i18n 守门补强**：admin lint 自定义规则禁止 `views/**/fixtures.ts` 模块顶层调用 `getActiveGroupOptions(...)` / `getAllGroupOptions(...)`；禁止 `views/**` 直接 `{{ \w*detail\.stage }}` 之类 raw 枚举字段插值
- **server 守门补强**：lint 禁止 `String(...created_at)` / `String(...updated_at)` / `String(..._at)` 模式；强制使用 `toTimestampString` 系列 helper
- **数据 join 守门**：admin shell 启动时 prefetch `/api/groups`，统一 `useGroupOptions` 数据源（消除 fixture / DB 双口径）

---

## 附录 — 关键证据快照

### A. chrome-devtools-mcp 截图

| 文件 | 内容 | 对应 Bug |
|---|---|---|
| `/tmp/r11_case_detail_ja.png` | 详情页 JA locale 头部 + 概览卡同框，可见 chip `案件開始` / overview value `S9` 双口径 | BUG-133 ❌ |
| `/tmp/r11_bug133_overview_stage_raw_label_en.png` | 案件 ea8b75b0-… EN locale 概览，chip `Collecting documents` / overview value `资料收集中` | BUG-133 ❌ |
| `/tmp/r11_bug133_stage_inconsistency_zh.png` | 案件 df9d1e84-… zh-CN 概览，chip `刚开始办案` / overview value `S9` | BUG-133 ❌ |
| `/tmp/r11_billing_list_zh.png` | 收费列表 zh-CN，过滤下拉 `東京一組` / `東京二組` JA 残留 | BUG-134 ❌ |
| `/tmp/r11_settings_groups_zh.png` | Settings → Group 管理表格，第一行 createdAt 为 `Mon Apr 27 ... GMT+0900` 原文 | BUG-135 ❌ |
| `/tmp/r11_customers_list_zh.png` | 客户列表 zh-CN，第一行 group cell 为 raw UUID `ef21fdd2-...` | BUG-136 ❌ |

### B. API 直查证据（BUG-135 / 136）

```bash
# BUG-135：/api/groups 返回 raw Date.toString()
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/groups
# {"items":[{"id":"ef21fdd2-...","name":"tokyo-1","createdAt":"Mon Apr 27 2026 20:40:49 GMT+0900 (Japan Standard Time)",...}]}

# BUG-136：/api/customers 返回 group=DB UUID
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/customers?limit=2
# {"items":[{"id":"825d708f-...","group":"ef21fdd2-1ffc-4a27-8b47-a640d6bd021c"}, ...]}
```

### C. 一键复现脚本（chrome-devtools-mcp + curl）

```bash
# 0) 取 token
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"Admin123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# 1) BUG-133 验证（终态分支硬编码 + 非终态 zh-CN 残留）
#    navigate_page → /#/cases/df9d1e84-fd62-4687-9297-decd8848412f
#    fill(uid="lang-combobox", value="English")
#    evaluate_script: 取 [data-testid=overview-card-stage] .overview-tab__stat-value textContent
#    期望：="Closed" 之类 i18n 译文；当前实测："S9"

# 2) BUG-134 验证（billing GROUP 下拉 JA 残留）
#    navigate_page → /#/billing
#    fill(uid="lang-combobox", value="English")
#    evaluate_script: 取所有 <option> textContent
#    期望：含 "Tokyo Team 1"；当前实测：含 "東京一組"

# 3) BUG-135 验证（server raw Date.toString()）
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/groups \
  | python3 -c 'import sys,json;print("createdAt:", json.load(sys.stdin)["items"][0]["createdAt"])'
# 期望：以 "2026-..." (ISO 8601) 开头；当前实测：以 "Mon Apr 27 2026 ..." 开头

# 4) BUG-136 验证（customer 列显示 raw UUID）
#    navigate_page → /#/customers
#    evaluate_script: 取 tbody 第一行倒数第二列 textContent
#    期望：="东京一组"；当前实测："ef21fdd2-1ffc-4a27-8b47-a640d6bd021c"
```

### D. 网络与 console 噪声基线（保持 R10 §3.3 结论）

- 详情页一次完整加载：11 个聚合接口（与 R10 完全相同，未发现新接口）
- 列表 / 收费 / 客户 / Settings 切换：无 console 报错（`list_console_messages → <no console messages>`）
- 与 R10 §3.3 一致，无网络噪声回归
