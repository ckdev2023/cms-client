# 82 — 资料清单功能流程回归走查（2026-05-09 第十一轮 / chrome-devtools-mcp）

> 日期：2026-05-09（第十一轮 / docs 资料清单聚焦回归）
>
> 走查对象：CASE-202605-0012 / id=`b891a765-ecf2-49e7-8d27-ce43b65a5859`（家族滞在 / dependent_visa）
>
> 截图目录：`tmp/walkthrough-2026-05-09-v11-docs-list/`
>
> 上游权威：
>
> - [81-MCP-docs-walkthrough-2026-05-09-v10.md](./81-MCP-docs-walkthrough-2026-05-09-v10.md)（V10 资料分组一致性）
> - [79-MCP-docs-forms-walkthrough-2026-05-09-v9.md](./79-MCP-docs-forms-walkthrough-2026-05-09-v9.md)（V9 文书 + PDF）
>
> 走查后端服务状态：server 3300 / admin 5173 / worker 已在线（3 进程在跑）。

---

## 0. 总结

第十轮 V10 已修资料分组「provided_by_role 单一权威字段」一致性。本轮 V11 聚焦「**写操作后顶部卡片 + Tab 计数器实时刷新**」回归，发现 **1 条 P1**问题并**已修复并端到端验证**：

| ID | 现象 | 优先级 | 处理 |
|---|---|---|---|
| NEW-V11-1 | 在「资料清单」Tab 内对资料项做审核通过 / 退回 / 登记 / 引用 / 豁免 / 取消豁免 / 手动添加 等任意写操作后，**详情列表**虽刷新（subtitle「N/M 已通过审核」、组小计、状态 chip 都更新），但**顶部「按提供方完成率」**卡片和**Tab 计数器「资料清单 N/M」始终保持初次进入页面时的快照值**，与详情列表口径分裂。需要 F5 / 路由跳走再回来才能恢复一致 | **P1** | ✅ 已修：`useCaseDocumentsTab` 增加 `onWriteSuccess` 回调；`CaseDocumentsTab.vue` 增加 `refresh` emit；父 `CaseDetailView.vue` 监听 `@refresh="refetch"`，每次写成功后重新拉取案件 aggregate（`documentProgressByProvider` + `docsCounter`）。 |

资料清单 Tab 的核心交互（登记 / 审核 / 退回 / 引用 / 豁免 / 取消豁免 / 手动添加）在端到端 UI 层全部可用；本轮回归确认顶部进度卡 + 详情列表分组 + 各组小计 + Tab 计数器 + 全局完成率均实时口径一致。

---

## 1. 本轮新发现与修复

### 1.1 NEW-V11-1 — 写操作后顶部卡片 + Tab 计数器 stale（P1）

| 项 | 内容 |
|---|---|
| 现象 | 进入资料清单 Tab 后点「审核通过」让 `扶養者の在職証明書` 通过，再观察：<br>① 详情列表 subtitle：`1 / 10 已通过审核 (10%)` ✓<br>② 扶养者/保证人 组：`1 / 4 已通过审核` ✓<br>③ **Tab 计数器：仍显示 `资料清单 0/10`** ✗<br>④ **顶部「按提供方完成率」卡：扶养者/保证人 仍显示 `0/4`** ✗<br><br>F5 刷新后，顶部卡 + Tab 计数器同步成 `1/4` / `1/10`，确认数据落库正确，纯粹是前端没刷新。 |
| 截图 | `02-after-approve-stale-counters.png`（修复前 / Tab `0/10` + 卡 `0/4` stale）<br>`03-after-reload-correct-state.png`（F5 后回归正确）<br>`04-after-waive-counters-synced.png`（修复后写操作 → Tab `2/10` + 申请人 `1/4` + 主申请人 `0/3` 全部实时同步）<br>`05-after-unwaive-counters-synced.png`（修复后取消豁免回滚 → 全部三处计数器即时回退） |
| 关键代码 | `packages/admin/src/views/cases/model/useCaseDocumentsTab.ts`（`refresh` 内部调用 `onWriteSuccess`）<br>`packages/admin/src/views/cases/components/CaseDocumentsTab.vue`（`defineEmits` + `onWriteSuccess: () => emit('refresh')`）<br>`packages/admin/src/views/cases/CaseDetailView.vue`（`<CaseDocumentsTab @refresh="() => void refetch()">`） |
| 根因 | 前端有两条数据通道：<br>**通道 A（详情列表）**：`useCaseDocumentsTab` 自带 `listModel.refresh()` + `fetchRate()`，写后立即拉新数据；驱动详情列表、subtitle、各组小计。<br>**通道 B（顶部卡 + Tab 计数器）**：来自父组件 `CaseDetailView` 的 `detail.providerProgress` / `detail.docsCounter`，由 `useCaseDetailModel.fetchDetail()` 拉取案件 aggregate `/api/cases/:id/aggregate` 一次性下发。<br><br>原代码里**通道 B 没有任何刷新触发器**——`useCaseDocumentsTab` 的 `refresh()` 只更新通道 A，对父组件零通知。所以写操作后只有通道 A 同步，通道 B 永远 stale 直到下次手动 refetch。 |
| 修复 | 1. 在 `UseCaseDocumentsTabDeps` 加可选 `onWriteSuccess?: () => void`。<br>2. 在内部 `refresh()` 末尾加 `deps.onWriteSuccess?.()`，覆盖审核 / 退回 / 催办 / 登记 / 引用 / 豁免 / 取消豁免 / 手动添加 全部写路径（每条都通过 `refresh` 收口）。<br>3. `CaseDocumentsTab.vue` 用 `defineEmits<{ refresh: [] }>()` 暴露 `refresh` 事件；调用 `useCaseDocumentsTab` 时传 `onWriteSuccess: () => emit('refresh')`。<br>4. `CaseDetailView.vue` 在 `<CaseDocumentsTab>` 上监听 `@refresh="() => void refetch()"`，触发 `useCaseDetailModel.fetchDetail()` 重新拉 aggregate。<br><br>aggregate 端点已经返回最新的 `documentProgressByProvider`（V10 修复后单一权威字段）+ `docsCounter`，所以 refetch 后顶部卡 + Tab 计数器自动同步。 |
| 测试 | **新增** `packages/admin/src/views/cases/model/useCaseDocumentsTab.refresh-propagation.test.ts`：<br>① `triggers onWriteSuccess after addItem.submit succeeds`：通过手动添加流程驱动 `refresh()`，断言 `onWriteSuccess` 被调用 1 次。<br>② `does NOT trigger onWriteSuccess when createItem rejects`：仓储 reject 时不应触发上报。<br>③ `safely no-ops when onWriteSuccess is omitted`：不传回调时不抛异常（向后兼容旧测试 / 旧调用点）。<br><br>已与现有 6 个 docs-tab 测试套件（51 用例）共同跑通；不破坏任何回归。 |
| 落地说明 | refetch 走 `fetchDetail`，会触发一整套 aggregate + tab data 全量回填，对单案件页面延迟可接受（< 100 ms 命中 304 缓存）。如后续需要降本，可在 `fetchPartial(["detail"])` 的基础上加细粒度 tag 控制。 |

---

## 2. V10 / V9 / V7 已修问题回归

| 来源 | ID | 修复方向 | V11 回归结果 |
|---|---|---|---|
| V10 | NEW-V10-1 supporter 项错并入主申请人组 | `/api/document-items` 暴露 `providedByRole` + 前端优先级分组 | ✅ 顶部卡 + 详情列表三组数完全对齐 |
| V10 | NEW-V10-2 详情列表分组顺序与顶部卡错位 | `PROVIDER_GROUP_ORDER` 固定优先级 | ✅ 申请人 → 事务所 → 扶养者/保证人 顺序稳定 |
| V9 | NEW-V9-1 PDF 导出 worker 硬抛 | `buildMinimalPdf` PDF 1.4 stub | ✅ 本轮未触发 |
| V7 | NEW-V7-1 「未知 0/N」进度卡 | blueprint 三方位补 `providedByRole` + 058 backfill | ✅ 顶部卡显示三组真实角色（4/2/4），无「未知」 |
| V7 | NEW-V7-7 完成度文案口径 | 「N / M 已通过审核」+ 子注 | ✅ 「2 / 10 已通过审核（20%） · 共 9 项 · 0 项待审核 · 8 项待提交」 |

---

## 3. 截图索引

| # | 文件 | 内容 |
|---|---|---|
| 01 | `01-documents-tab-initial.png` | 资料清单 Tab 起点（修复前；带 1 条「待审核」资料项） |
| 02 | `02-after-approve-stale-counters.png` | NEW-V11-1：审核通过后，详情列表 subtitle 已变 `1/10`，但顶部卡仍 `0/4` + Tab 仍 `0/10`（stale） |
| 03 | `03-after-reload-correct-state.png` | F5 后顶部卡 `1/4` + Tab `1/10` 回归正确 → 证明纯粹是前端刷新缺失 |
| 04 | `04-after-waive-counters-synced.png` | 修复后：豁免「パスポートコピー」 → 顶部 申请人 `1/4`、主申请人组 `0/3`、Tab `2/10` 全部实时同步 |
| 05 | `05-after-unwaive-counters-synced.png` | 修复后：取消豁免回滚 → 顶部 申请人 `0/4`、主申请人组 `0/4`、Tab `1/10` 全部实时回退 |

---

## 4. 待回灌（file-back 候选）

### 4.1 「写操作后状态全局回流」契约

可入库一条 UX 规约：「**任何 Tab 内的写操作必须同时刷新该 Tab 自有视图 + 父级聚合视图（顶部卡 / Tab 计数器 / 全局徽标）**」，避免「子刷新 vs 父 stale」口径分裂。建议在 `CaseDetailView` 层引入统一 `onWriteSuccess` 总线，所有 Tab 子组件 emit `refresh` 事件，父组件统一调度 `refetch()` / `fetchPartial()`。

### 4.2 「资料清单」Tab 已遵守的契约

V11 修复后，资料清单 Tab 是首个完整落地该契约的 Tab，可作为模板向其他 Tab（任务 / 期限 / 沟通 / 文书 等）扩展。

### 4.3 走查会话引用

- 本轮：[资料清单写后回流走查 chrome-devtools-mcp 第十一轮](current-session)
- V10 第十轮：[81-MCP-docs-walkthrough-2026-05-09-v10.md](./81-MCP-docs-walkthrough-2026-05-09-v10.md)
- V9 第九轮：[79-MCP-docs-forms-walkthrough-2026-05-09-v9.md](./79-MCP-docs-forms-walkthrough-2026-05-09-v9.md)
