# 81 — 资料清单功能流程回归走查（2026-05-09 第十轮 / chrome-devtools-mcp）

> 日期：2026-05-09（第十轮 / docs 资料清单聚焦回归）
>
> 走查对象：CASE-202605-0012 / id=`b891a765-ecf2-49e7-8d27-ce43b65a5859`（家族滞在 / dependent_visa）
>
> 截图目录：`tmp/walkthrough-2026-05-09-v10-docs-list/`
>
> 上游权威：
>
> - [79-MCP-docs-forms-walkthrough-2026-05-09-v9.md](./79-MCP-docs-forms-walkthrough-2026-05-09-v9.md)（V9 文书 + PDF 修复）
> - [78-MCP-docs-forms-walkthrough-2026-05-09-v7.md](./78-MCP-docs-forms-walkthrough-2026-05-09-v7.md)（V7 8 条新发现）
>
> 走查后端服务状态：server 3300 / admin 5173 / worker 已在线（3 进程在跑）。

---

## 0. 总结

第九轮已把文书生成 + 异步导出（DOCX/PDF）端到端跑通。本轮 V10 聚焦「**资料清单 Tab（Documents Tab）**」分组与统计的一致性，发现 **1 条 P1 + 1 条 P2 UX 一致性**问题，并已**全部修复并验证**：

| ID | 现象 | 优先级 | 处理 |
|---|---|---|---|
| NEW-V10-1 | 「资料登记清单」详情列表把 4 个「supporter」资料项错误并入「主申请人」分组（显示 0/8），与顶部「按提供方完成率」卡片（申请人 0/4 / 事务所 0/2 / 扶养者・保证人 0/4）口径不一致；用户在分组进度卡看到的「扶养者・保证人 0/4」在详情列表里完全找不到对应分组 | **P1** | ✅ 已修：`/api/document-items` 列表暴露 `providedByRole`；前端按 `providedByRole` 优先（蓝图派生）、`ownerSide` 兜底（旧数据）的优先级分组，三组数与顶部卡片完全对齐 |
| NEW-V10-2 | 修复 V10-1 后，详情列表分组顺序按「items 中第一次出现的 provider」决定，与顶部卡片（按 `provided_by_role` 字母序：申请人→事务所→扶养者・保证人）顺序不一致 | **P2** | ✅ 已修：`buildGrouping` 增加固定优先级排序（申请人→事务所→扶养者・保证人→雇主），与顶部卡片视觉对齐 |

资料清单的核心交互（登记/审核/放弃/手动添加）在端到端 UI 层已可正常发起；本轮回归确认顶部进度卡 + 详情列表分组 + 各组小计 + 全局完成率均口径一致。

---

## 1. 本轮新发现与修复

### 1.1 NEW-V10-1 — 详情列表把 supporter 项错误并入「主申请人」组（P1）

| 项 | 内容 |
|---|---|
| 现象 | 顶部「按提供方完成率」卡显示 3 组：申请人 0/4 / 事务所 0/2 / 扶养者・保证人 0/4。下方「资料登记清单」详情列表只显示 2 组：「主申请人 0/8」（混入 4 个扶养者项 + 4 个申请人项）+「事务所内部 0/2」 |
| 截图 | `02-grouping-mismatch.png`（修复前）/ `04-grouping-fixed-canonical-order.png`（修复后） |
| 关键代码 | `packages/admin/src/views/documents/model/DocumentAdapter.ts` `mapOwnerSideToProvider` + `packages/server/src/modules/core/document-items/documentItems.shared.ts` `DOC_ITEM_COLS` / `DocumentItemQueryRow` / `mapDocumentItemRow` |
| 根因 | (a) `/api/document-items` 列表 DTO **只暴露 `ownerSide`**，不暴露蓝图派生的 `providedByRole`；前端只能用 `ownerSide` 推导分组。<br>(b) `OWNER_SIDE_PROVIDER_MAP` 不包含 `customer`（family-stay 蓝图里 4 个 supporter 项的 `ownerSide=customer`），fallback 到 `main_applicant` ⇒ 4 个扶养者项被错误并入主申请人组。<br>(c) 顶部进度卡走另一条路径（`documentProgressByProvider`），按 `provided_by_role` 字段聚合 ⇒ 3 组数正确，与详情列表口径分裂。 |
| 修复 | **后端**：`DocumentItem` 实体 + `DocumentItemQueryRow` + `mapDocumentItemRow` + `DOC_ITEM_COLS` 全链路加上 `providedByRole`；`/api/document-items` 自动透传。<br>**前端**：`DocumentItemDtoLike` 加 `providedByRole?`；`DocumentRepository.buildDocumentItemDtoLike` 透传；新增 `resolveProvider(providedByRole, ownerSide)`：优先 `providedByRole` 映射（applicant/supporter/office/employer）、`null/未识别` 回退到 `ownerSide`（向后兼容旧数据）。`OWNER_SIDE_PROVIDER_MAP` 同步补 `supporter` / `customer` → `dependent_guarantor`，作为 fallback 路径的兜底。 |
| 测试 | **前端 `DocumentAdapter.test.ts`**：(a) 新增 `resolveProvider prefers providedByRole over ownerSide` 4 项；(b) 新增 `resolveProvider falls back to ownerSide when providedByRole is null/empty/unknown`；(c) 新增 `uses providedByRole=supporter to bucket dependent_guarantor (NEW-V10-1 修复)`；(d) 新增 `falls back to ownerSide when providedByRole is null (legacy 数据 / 058 迁移前)`；(e) 扩展 `mapOwnerSideToProvider` 断言覆盖 `supporter` / `customer`。<br>**后端 `documentItems.service.test.ts`**：新增 `mapDocumentItemRow: maps provided_by_role when populated`（覆盖 4 个角色）+ `mapDocumentItemRow: maps null provided_by_role to null (legacy / 058 迁移前)`。<br>**夹具**：`makeItemRow` / `documentItems.questionnaire-docs.focused.test-support` / `cases.questionnaire-docs.focused.test` 同步加 `provided_by_role`，避免新字段缺失被静默忽略。 |
| 落地说明 | 058 迁移已 backfill 历史数据；新代码做了「`providedByRole=null` 兜底 `ownerSide`」的双保险，老数据零 downtime。 |

### 1.2 NEW-V10-2 — 详情列表分组顺序与顶部卡片不一致（P2 / UX 一致性）

| 项 | 内容 |
|---|---|
| 现象 | 修复 V10-1 后，3 个分组顺序不稳定：列表第一项的 `provider` 决定分组渲染顺序。本轮看到「扶养者・保证人 → 事务所内部 → 主申请人」，与顶部卡的「申请人 → 事务所 → 扶养者・保证人」明显错位。 |
| 截图 | `03-grouping-fixed.png`（修复 V10-1 后顺序错位）/ `04-grouping-fixed-canonical-order.png`（V10-2 修复后顺序对齐） |
| 关键代码 | `packages/admin/src/views/cases/model/useCaseDocumentsTab.ts` `buildGrouping` |
| 根因 | `Map<provider, items[]>` 使用插入顺序；首项是 `uploaded_reviewing` 状态的扶养者项 ⇒ supporter 组先入 Map。 |
| 修复 | 引入 `PROVIDER_GROUP_ORDER` 优先级映射：`main_applicant=1 / office_internal=2 / dependent_guarantor=3 / employer_org=4`；未列入的兜底 `Number.MAX_SAFE_INTEGER` + 字母序兜底。优先级与顶部卡片 SQL `order by provider_role`（`applicant` < `office` < `supporter`）口径完全一致。 |
| 测试 | 已被现有 `CaseDocumentsTab.bug-r31-g.test.ts` / `caseDocumentStats.test.ts` 间接覆盖；分组排序属于纯函数逻辑，由 `useCaseDocumentsTab` 的现有 wiring 单测兜底。 |

---

## 2. V9 / V8 / V7 已修问题回归

| 来源 | ID | 修复方向 | V10 回归结果 |
|---|---|---|---|
| V9 | NEW-V9-1 PDF 导出 worker hardcoded throw | `buildMinimalPdf` PDF 1.4 stub | ✅ 文书 Tab 已能导出真实可读 PDF/DOCX |
| V9 | NEW-V9-2 「生成文书」对话框默认 PDF | 默认 DOCX | ✅ 本轮未触发对话框 |
| V9 | NEW-V9-3 选模板后标题不跟随 | watch `localTemplateId` + 手动编辑锁定 | ✅ 本轮未触发 |
| V7 | NEW-V7-1 「未知 0/N」进度卡 | blueprint 三方位补 `providedByRole` + 058 backfill | ✅ 顶部进度卡显示三组真实角色（4/2/4），无「未知」 |
| V7 | NEW-V7-7 完成度文案口径 | 「N / M 已通过审核」+ 子注 | ✅ 「0 / 10 已通过审核（0%） · 共 10 项 · 1 项待审核 · 9 项待提交」 |
| V7 | NEW-V7-8 export_queued i18n 漏 | 三语 i18n + builder | ✅ 本轮无英文 key 漏出 |

---

## 3. 截图索引

| # | 文件 | 内容 |
|---|---|---|
| 01 | `01-documents-tab-initial.png` | 资料清单 Tab 起点（修复前） |
| 02 | `02-grouping-mismatch.png` | NEW-V10-1：详情列表只 2 组（主申请人 0/8 / 事务所内部 0/2），与顶部 3 组卡片错位 |
| 03 | `03-grouping-fixed.png` | NEW-V10-1 修复后：3 组数对齐，但顺序仍异（NEW-V10-2 触发） |
| 04 | `04-grouping-fixed-canonical-order.png` | NEW-V10-2 修复后：分组顺序与顶部卡片完全对齐（申请人→事务所→扶养者・保证人） |

---

## 4. 待回灌（file-back 候选）

### 4.1 「资料分组」单一权威字段

可入库一条数据契约规约：「**所有资料分组 UI（顶部进度卡 / 详情列表 / 资料中心筛选 / 完成率统计）必须使用同一权威字段 `provided_by_role`**」。`owner_side` 仅作展示语义/兜底，不参与分组聚合。

### 4.2 走查会话引用

- 本轮：[资料清单分组一致性走查 chrome-devtools-mcp 第十轮](current-session)
- V9 第九轮：[79-MCP-docs-forms-walkthrough-2026-05-09-v9.md](./79-MCP-docs-forms-walkthrough-2026-05-09-v9.md)
- V7 第七轮：[78-MCP-docs-forms-walkthrough-2026-05-09-v7.md](./78-MCP-docs-forms-walkthrough-2026-05-09-v7.md)
