# 83 — 资料清单功能流程 / UI 字体回归走查（2026-05-09 第十二轮 / chrome-devtools-mcp）

> 日期：2026-05-09（第十二轮 / docs 资料清单聚焦回归）
>
> 走查对象：CASE-202605-0012 / id=`b891a765-ecf2-49e7-8d27-ce43b65a5859`（家族滞在 / dependent_visa）
>
> 截图目录：`tmp/walkthrough-2026-05-09-v12-docs-list/`
>
> 上游权威：
>
> - [82-MCP-docs-walkthrough-2026-05-09-v11.md](./82-MCP-docs-walkthrough-2026-05-09-v11.md)（V11 写后回流契约）
> - [81-MCP-docs-walkthrough-2026-05-09-v10.md](./81-MCP-docs-walkthrough-2026-05-09-v10.md)（V10 资料分组一致性）
>
> 走查后端服务状态：server 3300 / admin 5173 / worker 在线。

---

## 0. 总结

第十一轮 V11 修了「写后顶部卡 + Tab 计数器全局回流」。本轮 V12 聚焦**「按提供方完成率」卡片标签 vs 详情列表分组标题**的口径分裂以及 Japanese 模板字符（在留カードコピー 等）字体回归，发现 **1 条 P1** 问题并**已修复并端到端验证（zh-CN / ja-JP / en-US 三语）**：

| ID | 现象 | 优先级 | 处理 |
|---|---|---|---|
| NEW-V12-1 | 同一份资料项的「提供方角色」在两个视图中显示不同的中文/日文/英文字面值：<br>① 案件 ▶ 概览 ▶「按提供方完成率」 + 案件 ▶ 资料清单 ▶ 顶部「按提供方完成率」卡 → `cases.detail.providers.*` → **「申请人 / 事务所 / 雇主 / 扶养者/保证人」**<br>② 资料清单 ▶ 详情列表分组标题 → `documents.providers.*` → **「主申请人 / 事务所内部 / 受入机构/企业担当 / 扶养者/保证人」**<br><br>用户在同一页面同时看到 `申请人 0/4` 与 `主申请人 0/4` 两种说法，破坏「同一字段单一权威表述」契约 | **P1** | ✅ 已修：将 `cases.detail.providers.{applicant,office,employer}` 三语 i18n 字面值统一对齐到更具体的 `documents.providers.{mainApplicant,officeInternal,employerOrg}` 口径；`supporter` 在 ja-JP 的 `/` 也对齐到 `・`。 |

资料清单 Tab 的核心交互（登记 / 审核 / 退回 / 引用 / 豁免 / 取消豁免 / 手动添加）端到端可用；本轮回归确认顶部进度卡 + 详情列表分组标签 + Tab 计数器 + 全局完成率 + 概览页提供者卡，**全部口径与字面值均一致**。Japanese 模板字符（`在留カードコピー` / `パスポートコピー` / `婚姻証明書（戸籍謄本）` / `申請理由書` / `在留資格認定/変更許可申請書` / `扶養者の在職証明書` / `身元保証書` / `扶養者の納税証明書` / `扶養者の在留カードコピー`）字体回退路径正常（macOS 下 PingFang SC fallback 至 Hiragino Sans），未发现豆腐字 / 缺失字形 / 不正常断行。

---

## 1. 本轮新发现与修复

### 1.1 NEW-V12-1 — provider 角色 i18n 口径分裂（P1）

| 项 | 内容 |
|---|---|
| 现象 | 同一案件同一份资料的「提供方角色」标签出现两套字面值：<br>① 案件 ▶ 概览 ▶「按提供方完成率」+ 资料清单 ▶ 顶部进度卡：**`申请人 / 事务所 / 雇主 / 扶养者/保证人`**<br>② 资料清单 ▶ 详情列表分组标题：**`主申请人 / 事务所内部 / 受入机构/企业担当 / 扶养者/保证人`**<br><br>同一份角色在卡片层是「申请人」，在列表层就变成「主申请人」；同一份角色在卡片层是「事务所」，在列表层就变成「事务所内部」。一屏同显两套口径，违反「同一字段单一权威表述」契约。 |
| 截图 | `01-initial-state.png` / `02-top-card-vs-list-labels.png`（修复前 zh-CN）<br>`03-overview-tab-providers.png`（修复前 zh-CN 概览页同源问题）<br>`04-after-fix-aligned-labels.png`（修复后 zh-CN）<br>`05-overview-after-fix.png`（修复后概览页）<br>`06-after-fix-ja-locale.png`（修复后 ja-JP）<br>`07-after-fix-en-locale.png`（修复后 en-US）<br>`08-after-fix-zh-full.png`（修复后 zh-CN 全页）<br>`09-forms-tab.png`（文书 Tab 健康度回归） |
| 关键代码 | `packages/admin/src/i18n/messages/cases/zh-CN.ts`（`detail.providers.*`）<br>`packages/admin/src/i18n/messages/cases/ja-JP.ts`（`detail.providers.*`）<br>`packages/admin/src/i18n/messages/cases/en-US.ts`（`detail.providers.*`） |
| 根因 | 案件域有两套独立的 provider 标签 i18n：<br>**namespace A — `cases.detail.providers.*`**：用于 `providerProgress.labelKey`，由 `CaseAdapterDetailAggregate.adaptProviderProgress` 拼接。`CaseProviderProgress.vue`（概览页）+ `CaseDocumentsTab.vue`（资料清单顶部卡）共用。历史值偏短：`{applicant: "申请人", office: "事务所", employer: "雇主", supporter: "扶养者/保证人"}`。<br>**namespace B — `documents.providers.*`**：用于资料中心 4 类 provider 枚举，`useCaseDocumentsTab.ts` 在 `buildGrouping(...)` 通过 `t(getProviderLabelKey(provider))` 解析详情列表分组标题。值更具体：`{mainApplicant: "主申请人", officeInternal: "事务所内部", employerOrg: "受入机构/企业担当", dependentGuarantor: "扶养者/保证人"}`。<br><br>两条通道在 V10 修分组归一权威字段（`provided_by_role`）时只对齐了**枚举映射**，没对齐**显示文案**，导致同屏两套字面值。 |
| 修复 | 把 `cases.detail.providers.*` 的字面值三语对齐到 `documents.providers.*` 的更具体口径（保持 i18n key 不变 → 不影响任何 `labelKey` 引用）：<br>① zh-CN：`applicant "申请人" → "主申请人"`、`office "事务所" → "事务所内部"`、`employer "雇主" → "受入机构/企业担当"`<br>② ja-JP：`applicant "申請者" → "主申請者"`、`supporter "扶養者/保証人" → "扶養者・保証人"`、`office "事務所" → "事務所内部"`、`employer "雇用主" → "受入機関・企業担当"`<br>③ en-US：`applicant "Applicant" → "Main applicant"`、`supporter "Supporter / Guarantor" → "Dependent / guarantor"`、`office "Office" → "Office internal"`、`employer "Employer" → "Employer / organization contact"`<br><br>不动 `applicant / supporter / office / employer / agent / unknown / unspecified` 七个 key 名（兼容所有现有 `labelKey: "cases.detail.providers.*"` 引用）；不动 `cases.list.columns.applicant`（案件列表表头「申请人」是另一个语义：**列名 / 客户姓名列**，不是 provider 角色）。 |
| 测试 | **新增** `packages/admin/src/views/cases/providersI18n.consistency.focused.test.ts`：<br>① 三语 × 4 个角色对（`applicant ↔ mainApplicant`、`supporter ↔ dependentGuarantor`、`office ↔ officeInternal`、`employer ↔ employerOrg`），共 12 个 it 用例，断言两套 namespace 的同义角色字面值**严格相等**。<br>② 该测试单独跑通，且与现有 `i18n-regression.focused.test.ts` / `CaseDocumentsTab.bug-r31-g.test.ts` / `CaseDocumentsTab.bug169.test.ts` / `useCaseDocumentsTab.refresh-propagation.test.ts` 共 79 个用例全部通过，无回归。<br><br>这条测试是**永久哨兵**：以后任何一边新增 / 改名 / 扩展角色，必须同步另一边，否则 CI 红灯。 |
| 落地说明 | i18n 字面值类纯文案改动，零运行时副作用、零类型变更、零接口变更。生效路径：<br>① 案件 ▶ 概览 ▶「按提供方完成率」卡（`CaseProviderProgress.vue`）<br>② 案件 ▶ 资料清单 ▶ 顶部「按提供方完成率」卡（`CaseDocumentsTab.vue` 内嵌）<br>③ 历史上任何使用 `cases.detail.providers.*` 的兜底文案。<br><br>详情列表分组标题（`documents.providers.*`）字面值不变，但与卡片标签现已严格对齐。 |

---

## 2. 字体 / Japanese 模板字符渲染回归

| 项 | 状态 | 备注 |
|---|---|---|
| 渲染字体栈 | ✅ 正常 | body `font-family: "Plus Jakarta Sans", -apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`；CJK 字形通过浏览器/系统级 fallback 解析（macOS 经 PingFang SC → Hiragino Sans）。 |
| Japanese 模板名 | ✅ 正常 | `在留カードコピー / パスポートコピー / 婚姻証明書（戸籍謄本）/ 証明写真（4cm×3cm）/ 申請理由書 / 在留資格認定/変更許可申請書 / 扶養者の在職証明書 / 身元保証書 / 扶養者の納税証明書 / 扶養者の在留カードコピー` 全部正常显示，无豆腐字、无字形错配。 |
| `lang="zh"` 全局属性 | ⚠️ 可观察项（非 P0） | `<html lang="zh">`，混排 Japanese 模板名时由浏览器 CJK fallback 解析；macOS 下 OK，未观察明显 stroke 差异。后续若客户反馈日文字形不够"日系"（如 `留 / 書 / 体`），可考虑给资料项 `<span lang="ja">` 包裹。当前不做。 |
| 概览页 / 资料清单 / 文书 Tab 整体排版 | ✅ 正常 | 列宽 / 行高 / 状态 chip / 操作链接 / 分组小计 全部正常。 |

---

## 3. V11 / V10 / V9 / V7 已修问题回归

| 来源 | ID | 修复方向 | V12 回归结果 |
|---|---|---|---|
| V11 | NEW-V11-1 写后顶部卡 + Tab 计数器 stale | `useCaseDocumentsTab.onWriteSuccess` + `CaseDocumentsTab` `refresh` 事件 + 父级 refetch | ✅ 写路径未触发回归（本轮纯 i18n 字面值改动） |
| V10 | NEW-V10-1 supporter 项错并入主申请人组 | `provided_by_role` 单一权威字段 | ✅ 三组数依然 4/2/4 正确分布 |
| V10 | NEW-V10-2 详情列表分组顺序与顶部卡错位 | `PROVIDER_GROUP_ORDER` 固定优先级 | ✅ 主申请人 → 事务所内部 → 扶养者/保证人 顺序稳定 |
| V9 | NEW-V9-1 PDF 导出 worker 硬抛 | `buildMinimalPdf` PDF 1.4 stub | ✅ 本轮未触发 |
| V7 | NEW-V7-1 「未知 0/N」进度卡 | blueprint 三方位补 `providedByRole` + 058 backfill | ✅ 顶部卡显示三组真实角色（4/2/4），无「未知」 |
| V7 | NEW-V7-7 完成度文案口径 | 「N / M 已通过审核」+ 子注 | ✅ 「1 / 10 已通过审核（10%） · 共 10 项 · 0 项待审核 · 9 项待提交」 |

---

## 4. 截图索引

| # | 文件 | 内容 |
|---|---|---|
| 01 | `01-initial-state.png` | 资料清单 Tab 起点（修复前 zh-CN 全页） |
| 02 | `02-top-card-vs-list-labels.png` | NEW-V12-1：顶部卡 `申请人 / 事务所` vs 列表组 `主申请人` 对比（修复前） |
| 03 | `03-overview-tab-providers.png` | 概览页同源问题（顶部卡同样显示 `申请人 / 事务所` 旧字面值） |
| 04 | `04-after-fix-aligned-labels.png` | 修复后 zh-CN：顶部卡与列表组同 `主申请人 / 事务所内部 / 扶养者/保证人` |
| 05 | `05-overview-after-fix.png` | 修复后概览页：`主申请人 / 事务所内部 / 扶养者/保证人` 同步 |
| 06 | `06-after-fix-ja-locale.png` | 修复后 ja-JP：`主申請者 / 事務所内部 / 扶養者・保証人` 同源一致 |
| 07 | `07-after-fix-en-locale.png` | 修复后 en-US：`Main applicant / Office internal / Dependent / guarantor` 同源一致 |
| 08 | `08-after-fix-zh-full.png` | 修复后 zh-CN 全页：顶部卡 + 列表所有 3 个分组标题一致 |
| 09 | `09-forms-tab.png` | 文书 Tab 健康度回归（与资料清单同案件） |

---

## 5. 待回灌（file-back 候选）

### 5.1 「provider 角色单一权威表述」契约

可入库一条 i18n 规约：「**同一业务概念在不同 i18n namespace 出现时，字面值必须严格一致**」。具体落地：
- 任何在 UI 中出现 ≥ 2 个 namespace 命中的业务枚举（provider 角色 / 状态 / 阶段 / 分类等）必须有一条**同义字面值哨兵测试**。
- 哨兵测试形态参考 `providersI18n.consistency.focused.test.ts`：定义 `ROLE_PAIRS` 角色对照表，遍历三语断言 `===`。
- 严禁通过组件层 `t()` 切换或 mapping 函数解决；必须从 i18n 源头对齐。

### 5.2 资料清单 Tab 已遵守的契约

V12 之后，资料清单 Tab 的 provider 标签已是「单一字面值、双 namespace 同义」。可作为模板向其他**双 namespace 同义业务概念**扩展（例如 `cases.detail.status.*` vs `documents.status.*` 中潜在的同义状态字面值，需后续审计）。

### 5.3 走查会话引用

- 本轮：[资料清单 i18n 一致性走查 chrome-devtools-mcp 第十二轮](current-session)
- V11 第十一轮：[82-MCP-docs-walkthrough-2026-05-09-v11.md](./82-MCP-docs-walkthrough-2026-05-09-v11.md)
- V10 第十轮：[81-MCP-docs-walkthrough-2026-05-09-v10.md](./81-MCP-docs-walkthrough-2026-05-09-v10.md)
- V9 第九轮：[79-MCP-docs-forms-walkthrough-2026-05-09-v9.md](./79-MCP-docs-forms-walkthrough-2026-05-09-v9.md)
