# 案件全流程 chrome-devtools-mcp 深度审计 Bug 清单（第一轮 / R22）

> 生成日期：2026-05-02（chrome-devtools-mcp 真浏览器深度审计）
>
> 走查命题（用户 R22 任务）：
> - "chrome-devtools-mcp 测试案件的所有的流程"
> - 范围：案件全生命周期（创建 → 受理 → 阶段切换 → 任务联动 → 计费 → 归档/失败）
> - 模式：深度审计（含异常分支、边界、双层状态机、计费/任务联动）
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `take_snapshot` / `take_screenshot` / `click` / `fill` / `evaluate_script` / `list_console_messages` / `list_network_requests` / `handle_dialog`
>
> 走查环境：admin `http://localhost:5173`（hash router）、server NestJS `:3300`、登录态 `admin@local.test`（Local Admin）已生效
>
> 走查素材：
> - 既有数据：`R6试探客户` 关联 16 进行中 + 4 已归档 = 20 个案件
> - 走查中新建并落库的案件：`CASE-202605-0004 R6试探客户 经营管理（认定 4 个月）`，已成功登记 ¥100,000 部分回款
> - 走查中改名的案件：`CASE-202605-0003` 标题改为 `MCP-AUDIT R6试探客户 Business Manager (CoE 4-month)`，业务相位被提升至 `WAITING_MATERIAL`
>
> 截屏与凭证落地路径：`docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r1/`
>
> 与 R21（`30-双层状态机自动化复盘走查Bug清单-第二十一轮.md`）的差异：
> - R21 命题为「文案优化」，R22 命题为「流程通断 + 双层状态机正确性」
> - R22 出土了 **R21 通过项里 R22 仍然通过的所有项** 之外的 **2 条 P0、4 条 P1、4 条 P2、5 条 P3**

---

## 0. R22 总结

### 0.1 流程通断结论（一句话）

**主链路通畅、登录/列表/创建/编辑/Billing 跨模块/Phase 流转/Not-Found 全部走通**；但**双层状态机存在中间相位的 stage 不同步、阶段流转弹窗存在选中状态泄漏、4 项关键按钮无 click handler**，构成 P0/P1 级实质缺陷。

### 0.2 P0/P1/P2/P3 概览

| 等级 | 数量 | 主题 |
|---|---|---|
| P0 | 2 | BUG-191 双层状态机 phase→stage 不同步；BUG-192 PhaseTransitionPopover 选中状态泄漏导致非法 stale-submit |
| P1 | 4 | BUG-193 案件列表 search 参数前端发出但服务端不识别；BUG-194 Step3 自动生成资料清单不生效；BUG-195 Step3 自动创建初始任务不生效；BUG-196 Billing/Tasks Tab 关键按钮无 click handler（4 个） |
| P2 | 4 | BUG-197 Export ZIP 用原生 alert；BUG-198 Validation Tab 多个按钮无 click handler；BUG-199 PhaseTransitionPopover UX 缺当前→目标对照；BUG-200 案件中途撤案路径缺失 |
| P3 | 5 | BUG-201 Step1 标题被 Step4 复核覆盖；BUG-202 stage URL deeplink 解析忽略；BUG-203 Local Admin 触发跨组校验；BUG-204 BillingCollectionDrawer 金额 spinbutton min/max 反向；BUG-205 form-field a11y 缺 id/name |

### 0.3 走查路径总览

```
登录态校验
  → /#/cases 列表（filters / pagination / scope tabs）
  → /#/cases?search=B 搜索（**P1 BUG-193 命中**）
  → /#/cases?stage=stage-archived deeplink（**P3 BUG-202 命中**）
  → /#/cases/<id> 详情（10 个 tab）
    → 概览 / 收费 / 任务 / 提交前检查
    → 编辑信息（PASS）
    → 导出 ZIP（**P2 BUG-197 命中**）
    → 状态流转 popover：CONSULTING → CONTRACTED（PASS）
    → 状态流转 popover：CONTRACTED → WAITING_MATERIAL
        （**P0 BUG-191 stage 未跟随**, **P0 BUG-192 stale phase 重复提交**）
    → CaseBillingTab 登记回款按钮（**P1 BUG-196 命中**）
    → CaseTasksTab 新增任务按钮（**P1 BUG-196 命中**）
    → CaseValidationTab 新建提交包/发起复核/重新检查（**P2 BUG-198 命中**）
  → /#/cases/create 4 步向导
    → Step1 模板/类型/标题（**P3 BUG-201 命中**）
    → Step2 主申请人 + 资料清单预览
    → Step3 分派与期限（勾选自动生成 / 自动创建任务）（**P3 BUG-203 命中**）
    → Step4 复核 → 开始办案（PASS：CASE-202605-0004 创建落库）
        ↳ 资料清单 0/0（**P1 BUG-194 命中**）
        ↳ 任务 0（**P1 BUG-195 命中**）
  → /#/billing 跨模块联动
    → 新建案件 200,000 / 未回款 出现在列表（PASS）
    → BillingCollectionDrawer 登记 100,000 回款
        （**P3 BUG-204 命中**: spinbutton min=1 max=0）
        ↳ 摘要卡片增量正确（PASS）
        ↳ 案件详情 Billing tab 反向同步正确（PASS）
  → /#/cases/non-existent-uuid not-found（PASS）
  → 失败归档（CLOSED_FAILED）路径探查（**P2 BUG-200 命中**）
```

无 5xx、无 console error（除 1 条 a11y issue：`form field element should have an id or name attribute (count: 3)`，落到 BUG-205）。

---

## 1. P0 缺陷

### BUG-191 ⚠️ 双层状态机 phase→stage 单向不同步（CRITICAL）

| 字段 | 值 |
|---|---|
| 位置 | `packages/server/src/modules/core/cases/cases.service.ts: executePhaseTransitionUpdate` ~L2458 |
| 复现 | 在任何非终态相位流转（如 `CONTRACTED → WAITING_MATERIAL`）后，`stage` 字段不发生任何变化 |
| 期望 | 业务相位向前推进时，`stage` 应按 `STAGE_TO_PHASE_DEFAULT` 的反向映射（或新建 `PHASE_TO_STAGE_DEFAULT`）跟随推进 |
| 现状 | 仅 `CLOSED_SUCCESS / CLOSED_FAILED` 会把 `stage` 设为 `S9`，其余转换 `stage` 完全不动 |
| 影响 | 案件详情头展示 `S1 · 刚开始办案 / 等待资料` 这种 stage 与 phase 自相矛盾的组合；列表的"阶段"列、概览页的"当前办案进度"、Customer Detail 的"案件阶段"全部看上去停在 S1 永远不前进 |
| 取证 | 走查中实际把 `CASE-202605-0003` phase 从 CONSULTING → CONTRACTED → WAITING_MATERIAL，刷新后 `GET /api/cases/.../aggregate` 返回 `{status:"S1", stage:"S1", businessPhase:"WAITING_MATERIAL"}`（截屏 `02-case-detail-overview.png` 与 `05-final-state-detail.png`） |
| 现有测试参考 | `packages/server/src/modules/core/cases/cases.bug063-stage-tighten.focused.test.ts` 已经验证 `stage S1→S2` 会同步 `business_phase = WAITING_MATERIAL`（stage→phase 方向）；缺反向（phase→stage） |
| 建议补丁 | 1. 服务端 `cases.workflow-step.ts` 新增 `PHASE_TO_STAGE_DEFAULT` 映射（已存在 `BMV_STEP_TO_STAGE`，可直接复用）；2. `executePhaseTransitionUpdate` SQL 把 `stage` 字段的 `case` 表达式扩展为：`when $2 in ('CLOSED_*') then 'S9' when ${PHASE_TO_STAGE_DEFAULT[toPhase]}::text is not null then ${...} else stage end`；3. 补单测 `cases.phase-transition-stage-sync.focused.test.ts` 覆盖每个非终态 phase 的 stage 同步 |
| 等级 | **P0 — 双层状态机的核心承诺被打破** |
| 状态 | 新发现 / 未 land |

### BUG-192 ⚠️ PhaseTransitionPopover 选中状态泄漏，导致非法 `from = to` 提交（CRITICAL）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/PhaseTransitionPopover.vue` L34 `selectedPhase` |
| 复现步骤 | 1. 打开案件详情，点"状态流转"；2. 选 `已签约`，点"确认流转"成功；3. 再次点"状态流转"——弹窗复用未销毁，`selectedPhase = "CONTRACTED"` 仍保留；4. 此时弹窗 list 已切换为新的可达目标 `等待资料`，但 `selectedPhase` 还是上一次的 CONTRACTED，"确认流转"按钮变为可点；5. 点击 → 服务端报错 `流转失败: Invalid phase transition: CONTRACTED → CONTRACTED` |
| 期望 | 弹窗每次开启或父组件 `menuOpen` 由 false→true 时，必须把 `selectedPhase` 重置为 null |
| 影响 | 用户在快速连续操作时会看到诡异的"流转失败"红色 banner，且按钮的"是否启用"语义对不上"我点了什么"，破坏信任 |
| 取证 | 复现时弹窗截屏 + 服务端响应 `Invalid phase transition: CONTRACTED → CONTRACTED`（截屏 `03-phase-transition-modal.png`） |
| 建议补丁 | 在 `PhaseTransitionPopover.vue` 增加：`watch(() => props.menuOpen, (open) => { if (!open) { selectedPhase.value = null; closeReason.value = ''; validationError.value = null; } })`，或在 `selectPhase` 之外暴露 reset 钩子由父组件在每次打开前调用 |
| 等级 | **P0 — 写操作流程上有可触发的非法状态机请求** |
| 状态 | 新发现 / 未 land |

---

## 2. P1 缺陷

### BUG-193 案件列表 `search` 参数前后端协议错位（功能完全失效）

| 字段 | 值 |
|---|---|
| 位置 | `packages/server/src/modules/core/cases/cases.controller.ts: list()` L201 + `cases.controller-bodies.ts: ListCasesQuery` |
| 复现 | 在 `/#/cases` 搜索框输入 `B`（任何字符）→ URL 同步 `?search=B`，前端 `useCaseListModel.filtersToListParams` 把 `search` 加到请求；服务端 `ListCasesQuery` 不解析 `search` 字段，直接忽略；列表返回所有 20 条案件，包括不含 `B` 的 `Tani Family Stay` |
| 期望 | 服务端 `ListCasesQuery` 应支持 `search` 字段（对 `cases.case_name`、`cases.applicant_name`、`cases.case_no` 做 ILIKE 匹配） |
| 影响 | 案件搜索 100% 不生效；运营无法用名字、编号、申请人快速定位案件；现有客户端注释（`CaseAdapterReaders.ts` L17）显示 search 字段从未被设计为客户端过滤 |
| 取证 | 网络抓包：`GET /api/cases?scope=mine&search=B&page=1&limit=20&view=summary [200]` 返回 20 条全量数据；UI 显示 1-20 共 20 条不变 |
| 建议补丁 | 1. 服务端：`ListCasesQuery` 新增 `search?: string` + `cases.service.ts: list/listSummary` 在 SQL 里 `where ($search is null or case_name ilike '%' || $search || '%' or applicant_name ilike '%' || $search || '%' or case_no ilike '%' || $search || '%')`；2. 前端单测 `caseListRepository.focused.test.ts` 已测 `search` 透传，补一个端到端 `cases.controller.test.ts` 验证 `search` 真的会过滤 |
| 等级 | **P1** |
| 状态 | 新发现 / 未 land |

### BUG-194 Step3 "根据模板自动生成资料清单" 勾选无效

| 字段 | 值 |
|---|---|
| 位置 | 推测在 `packages/server/src/modules/core/cases/cases.service.ts: createCase` 路径或对应的 `document_items` 自动写入逻辑 |
| 复现步骤 | 1. `/#/cases/create`；2. 选 `经营管理（认定 4 个月）`；3. Step2 选客户 R6试探客户；4. Step3 保留勾选"根据模板自动生成资料清单"；5. Step4 创建。新建案件详情 `资料清单 0/0` Tab 显示「暂无资料登记 / 该案件尚未添加任何资料需求」 |
| 期望 | 经営管理认定 4 个月模板有 17 个必须项 + 1 个可选项（Step2 已展示），创建时应一次性把这些 `document_items` 写库 |
| 影响 | 自动化建案最大卖点失效；运营要全部手动添加 18 项资料，建案体验回退到手填 |
| 取证 | 截屏 `资料清单 0/0` 计数器 + 「本地资料根目录未配置」alert 同时出现，强烈提示后端没生成任何 `document_items` |
| 建议补丁 | 1. 检查 `cases.service.ts` 创建路径是否读取 `flags.autoGenerateDocChecklist`；2. 若已读取，检查 `document_items` 写入是否被某个前置条件（如 storage_root）误判跳过；3. 补单测：`cases.service.ts` 在 `autoGenerateDocChecklist=true` 时按 `bmvTemplateConfig` 生成对应 `document_items` |
| 等级 | **P1** |
| 状态 | 新发现 / 未 land |

### BUG-195 Step3 "自动创建初始任务" 勾选无效

| 字段 | 值 |
|---|---|
| 位置 | 推测在 `cases.service.ts: createCase` 中对 `tasks` 表的初始任务写入逻辑 |
| 复现 | 同 BUG-194 步骤；新建案件详情 `任务` Tab 显示「暂无待办任务」，`tasks/limit=200` 接口返回结果不含该案件的 task |
| 期望 | 至少应自动创建 1-2 条引导性 task（如"完成主申请人问卷"、"邀请客户上传基础资料"），与 P0 阶段任务模板一致 |
| 影响 | 任务联动断链；案件详情"任务"Tab 始终空白；新案件无法在 `/#/tasks` 工作台聚合视图中以"今日任务"形式被发现 |
| 建议补丁 | 1. 在 `cases.service.ts: createCase` 中读取 `flags.autoCreateInitialTasks`；2. 若 true，按 `bmvTemplateConfig` 写 1-2 条 `tasks`（status=pending, owner_user_id=case.owner_user_id, due_at=case.due_at - 7d）；3. 补单测覆盖 |
| 等级 | **P1** |
| 状态 | 新发现 / 未 land |

### BUG-196 案件详情 Billing/Tasks Tab 关键按钮无 click handler（4 个 dead button）

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseBillingTab.vue` L74-89（"登记回款" header 按钮）、L160-174（行内 "登记回款"/"查看收据"）；`CaseTasksTab.vue` L51-67（"新增任务"） |
| 复现 | 在案件详情 Billing Tab 点 header "登记回款" 按钮、表格行尾"登记回款"按钮、Tasks Tab "新增任务" 按钮；均无任何反应（无 modal、无 toast、无 console message） |
| 期望 | Billing Tab 应复用 `BillingCollectionDrawer` / `PaymentModal`（与 `/#/billing` 页同款）；Tasks Tab 应打开 `TaskCreateModal`（或最少跳到 `/#/tasks?case=<id>`） |
| 影响 | 案件详情页是运营第一现场，"登记回款"作为 1 期最高频写操作完全失效；用户必须先跳到 `/#/billing` 列表才能登记回款，再跳回详情确认——白做 2 跳 |
| 取证 | 源码 grep 无 `@click`；点击后 console 无任何消息；截屏 `04-billing-after-click.png` |
| 建议补丁 | 把 `<Button>` 改造成 `<Button @click="emitOpenCollectionDrawer(row)">`；CaseBillingTab/CaseTasksTab 通过 `defineEmits` 把事件冒泡到 `CaseDetailView`，再由 `useCaseDetailModel` 复用 `BillingCollectionDrawer` / `TaskCreateModal` |
| 等级 | **P1** |
| 状态 | 新发现 / 未 land |

---

## 3. P2 缺陷

### BUG-197 "导出 ZIP" 用原生 `alert()` 占位

| 字段 | 值 |
|---|---|
| 复现 | 案件详情头部点"导出 ZIP" |
| 现状 | 触发原生 `window.alert("ZIP 导出功能尚未上线，敬请期待。")`，阻塞页面，破坏 a11y 与截屏自动化 |
| 期望 | 使用站内 toast/Tooltip 占位；或者按钮 `disabled + tooltip="即将上线"` |
| 等级 | **P2 — UX 一致性** |
| 状态 | 新发现 / 未 land |

### BUG-198 提交前检查 Tab 多个按钮无 click handler

| 字段 | 值 |
|---|---|
| 位置 | `CaseValidationTab.vue` 子组件 |
| 复现 | "重新检查"、"新建提交包"、"发起复核"、"模拟欠款确认" 点击均无反应、无 console message |
| 期望 | 即便业务后端尚未就绪，至少应弹"功能即将上线"的 toast 或 disable + tooltip |
| 等级 | **P2** |
| 状态 | 新发现 / 未 land |

### BUG-199 PhaseTransitionPopover 缺当前→目标对照

| 字段 | 值 |
|---|---|
| 位置 | `PhaseTransitionPopover.vue` L93-95 title 仅"业务阶段流转" |
| 复现 | 弹窗只显示目标列表，无"当前 = 已签约" 字样，运营无法直观判断是否选错 |
| 期望 | header 加 sub-title `当前: 咨询中 → 选择目标:`，并把每个目标 item 显示为 `咨询中 → 已签约` 的箭头形式；尤其是 NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING 这种来回循环的相位 |
| 等级 | **P2 — UX** |
| 状态 | 新发现 / 未 land |

### BUG-200 业务流转图缺"中途撤案"路径

| 字段 | 值 |
|---|---|
| 位置 | `packages/server/src/modules/core/cases/businessPhase.ts: PHASE_TRANSITIONS` |
| 复现 | 案件在 WAITING_MATERIAL / MATERIAL_PREPARING / REVIEWING / APPLYING / NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING 任意中间相位时，无法直接转 CLOSED_FAILED；CLOSED_FAILED 仅可从 REJECTED / VISA_REJECTED 到达 |
| 期望 | 行政书士业务现实是「客户中途撤案 / 客户决定不办理」是高频场景；应允许任意非终态相位向 CLOSED_FAILED 转，配合强制 `closeReason` 必填和"中途撤案/客户失联/客户改委托其他事务所"的预设理由 |
| 等级 | **P2 — 业务路径缺失** |
| 状态 | ✅ LANDED — PM 拍板"是"后实施。`PHASE_TRANSITIONS` 全 11 个非终态 phase 追加 `CLOSED_FAILED` 出边；`MANUAL_CANCEL_REASON_CODES` 4 码（MID_CASE_WITHDRAWAL / CLIENT_LOST_CONTACT / SWITCHED_TO_OTHER_FIRM / OTHER）；`PhaseTransitionPopover.vue` 预设 chips + OTHER 自由文本；3 server tests + 8 admin tests 全 PASS |

---

## 4. P3 缺陷

### BUG-201 Step1 标题被 Step4 复核覆盖（用户编辑丢失）

| 字段 | 值 |
|---|---|
| 复现 | Step1 自定义"案件标题"，跳到 Step2 选客户 → 自动重新基于 customer + template 派生 → Step4 复核显示派生后的标题，用户在 Step1 的输入被吞 |
| 等级 | **P3 — UX 边界** |
| 状态 | 新发现 / 未 land |

### BUG-202 stage URL deeplink 解析忽略未知值（不报错也不回退）

| 字段 | 值 |
|---|---|
| 复现 | 访问 `/#/cases?stage=stage-archived`（前端字典只有 `S1..S9`），URL 中的 stage 既未生效也未给出任何提示 |
| 期望 | 解析失败时应抛出/回退到默认，并在 toast 提示"`stage=stage-archived` 不是合法阶段，已忽略" |
| 等级 | **P3 — 边界鲁棒性** |
| 状态 | 新发现 / 未 land |

### BUG-203 Local Admin 触发跨组校验

| 字段 | 值 |
|---|---|
| 复现 | Step3 选 Owner 为 Local Admin（顶层管理员），客户分组为东京一组，Step3 仍要求填"跨组原因 *" |
| 期望 | Local Admin（无 group 归属）应被识别为 group-agnostic，跳过跨组警告；或 group=null 时不触发跨组 |
| 等级 | **P3 — UX/逻辑** |
| 状态 | 新发现 / 未 land |

### BUG-204 BillingCollectionDrawer 金额 spinbutton 属性反向（min=1, max=0）

| 字段 | 值 |
|---|---|
| 复现 | `/#/billing` → 任意行登记回款 → 弹窗"金额"输入框 a11y `valuemin=1, valuemax=0`（max < min） |
| 期望 | `valuemin=1, valuemax=应收金额` 或 `valuemax` 留空 |
| 等级 | **P3 — a11y 合规** |
| 状态 | 新发现 / 未 land |

### BUG-205 form-field a11y `id/name` 缺失（count: 3）

| 字段 | 值 |
|---|---|
| 复现 | DevTools issue: `A form field element should have an id or name attribute (count: 3)`，触发于编辑案件 modal、PaymentModal 子表单 |
| 等级 | **P3 — a11y 合规** |
| 状态 | 新发现 / 未 land |

---

## 5. R22 通过项（确认无回归）

- 登录态续签：受保护路由 `/#/tasks` 直接命中，无重定向到 `/login`
- 案件列表：scope 切换 `我的案件 / 本组 / 全所` URL 同步、stage `combobox`-driven 筛选、owner / group / risk / validation 五维筛选、reset 按钮工作正常
- 案件详情头：阶段/相位/客户/负责人/编辑信息按钮渲染正常
- 案件详情 Tab 切换：10 个 Tab 全部 URL `?tab=...` 同步、内容渲染无 console error
- 案件编辑 modal：标题修改 `MCP-AUDIT R6试探客户 Business Manager (CoE 4-month)` → 列表/详情/billing 列表三处即时同步
- 案件创建 4 步向导：BMV 前置门禁（问卷/报价/签约/承接）、模板选择、主申请人选择、自动派生标题、Step3 默认勾选自动化、Step4 复核、提交后 toast + 跳转 detail
- Billing 列表：与新建案件 200,000 / 未回款 即时同步、摘要卡片 +总应收正确
- BillingCollectionDrawer：登记 100,000 → 总已收 +100,000、总待收 -100,000、案件回款状态 → 部分回款、详情 Billing Tab 反向同步、入金行 `已结清`、案件报酬行 `部分回款`
- 案件 not-found：`/#/cases/non-existent-uuid` 给出友好提示 + 返回案件列表 link
- 双层状态机 stage→phase 方向：`cases.bug063-stage-tighten.focused.test.ts` 仍 PASS（与 R22 BUG-191 相反方向 OK）

---

## 6. R22 取证截屏

| 文件 | 场景 |
|---|---|
| `01-case-list.png` | 案件列表（20 条 / R6试探客户 主导） |
| `02-case-detail-overview.png` | 案件详情概览（CASE-202605-0003 phase 流转前 S1·咨询中） |
| `03-phase-transition-modal.png` | 阶段流转弹窗（CONTRACTED 单选） |
| `04-billing-after-click.png` | 案件详情 Billing Tab，点击"登记回款"后无反应（BUG-196 取证） |
| `05-final-state-detail.png` | 案件详情 phase 至 WAITING_MATERIAL，stage 仍 S1（BUG-191 取证） |

---

## 7. 落库建议（先后顺序）

1. **P0 BUG-191** 双层状态机 phase→stage 同步：先补单测复现，再 1-line 改 SQL，再回归 6 条相位（CONTRACTED → CLOSED_SUCCESS 全链路）
2. **P0 BUG-192** PhaseTransitionPopover state reset：单 PR、单文件改动、补 1 条焦点单测
3. **P1 BUG-193** 列表 search 参数：服务端 SQL ILIKE + controller 入参 + 1 条 e2e 测试
4. **P1 BUG-194 / BUG-195** 自动生成资料清单 / 任务：成对修复（涉及 `cases.service.ts: createCase` 同一个分支）
5. **P1 BUG-196** Billing/Tasks Tab dead buttons：把 `Drawer/Modal` 通过 `defineEmits` 串到 CaseDetailView
6. **P2/P3** 集中作为 R23 文案/UX 批次提交

---

## 8. Land 状态（2026-05-02）

> Guard 结果：`npm run fix` + `npm run guard` 全绿（admin 3348 PASS / server integration 31 PASS / 0 FAIL）
>
> HEAD commit：`089f2eb`（R22 bug 批次修复均合入此 commit 及前序 commit）

| BUG ID | 等级 | 摘要 | Land 状态 | R23 验证 | 主要改动文件 | 防回归测试 |
|---|---|---|---|---|---|---|
| BUG-191 | P0 | 双层状态机 phase→stage 不同步 | ✅ LANDED | ✅ PASS | `cases.service.ts` (executePhaseTransitionUpdate SQL)、`businessPhase.ts` (PHASE_TO_STAGE_DEFAULT) | `cases.phase-transition-stage-sync.focused.test.ts` |
| BUG-192 | P0 | PhaseTransitionPopover 选中状态泄漏 | ✅ LANDED | ✅ PASS | `PhaseTransitionPopover.vue` (watch menuOpen → reset) | `PhaseTransitionPopover.bug192.test.ts` |
| BUG-193 | P1 | 案件列表 search 参数不生效 | ✅ LANDED | ✅ PASS | `cases.controller.ts`、`cases.controller-bodies.ts`、`cases.types.ts`、`cases.service.ts` (buildCaseListFilterPrefixed)、`search.controller.ts`、`search.service.ts` | `cases.controller.list-search.test.ts`、`search.controller.test.ts`、`search.service.test.ts` |
| BUG-194 | P1 | Step3 自动生成资料清单不生效 | ✅ LANDED | ⚠️ CONDITIONAL | `cases.service.ts` (resolveChecklistItems + runCreateTransaction)、`bmvTemplateConfig.ts` | `cases.service.create-checklist-tasks.focused.test.ts` |
| BUG-195 | P1 | Step3 自动创建初始任务不生效 | ✅ LANDED | ✅ PASS | `cases.service.ts` (insertInitialTasks)、`tasks.service.ts` | `cases.service.create-initial-tasks.bug195.test.ts` |
| BUG-196 | P1 | Billing/Tasks Tab 4 个 dead button | ✅ LANDED | ✅ PASS | `CaseBillingTab.vue` (defineEmits)、`CaseTasksTab.vue` (defineEmits)、`CaseDetailView.vue` (接住 emits) | `CaseDetailView.actions.test.ts` |
| BUG-197 | P2 | Export ZIP 用原生 alert | ✅ LANDED | ✅ PASS | `CaseDetailView.vue` (alert → useToast) | `CaseDetailView.actions.test.ts` |
| BUG-198 | P2 | Validation Tab 多个按钮无 handler | ✅ LANDED | ✅ PASS | `CaseValidationTab.vue`、`CaseValidationSupport.vue` (disabled + tooltip) | — (UI 占位，无逻辑分支) |
| BUG-199 | P2 | PhaseTransitionPopover 缺当前→目标对照 | ✅ LANDED | ✅ PASS | `PhaseTransitionPopover.vue` (currentPhase prop + header sub-title) | `PhaseTransitionPopover.test.ts` |
| BUG-200 | P2 | 中途撤案路径缺失 | ✅ LANDED | ✅ PASS | `businessPhase.ts` (PHASE_TRANSITIONS 全非终态→CLOSED_FAILED + MANUAL_CANCEL_REASON_CODES)、`PhaseTransitionPopover.vue` (cancelReasonPresets chips)、`i18n/{zh-CN,ja-JP,en-US}/cases.ts` (cancelReasonPresets 三语) | `cases.bug200-mid-cancel.focused.test.ts`、`PhaseTransitionPopover.bug200.test.ts` |
| BUG-201 | P3 | Step1 标题被覆盖 | ✅ LANDED | ✅ PASS | `useCreateCaseModel.ts` (titleDirty flag)、`CaseCreateStep1.vue` | `useCreateCaseModel.title-dirty.test.ts` |
| BUG-202 | P3 | stage URL deeplink 非法值静默忽略 | ✅ LANDED | ✅ PASS | `useCaseListModel.ts` (isValidStageId check + toast)、`query.ts` | `useCaseListModel.invalidStage.test.ts` |
| BUG-203 | P3 | Local Admin 触发跨组校验 | ✅ LANDED | ✅ PASS | `useCreateCaseModel.ts` (ownerGroup===null 豁免)、`useCreateCaseModelActions.ts` | `useCreateCaseModel.local-admin-cross-group.test.ts` |
| BUG-204 | P3 | PaymentModal 金额 max 反向 | ✅ LANDED | ✅ PASS | `PaymentModal.vue` (:max="node.amount") | `PaymentModal.bug204.test.ts` |
| BUG-205 | P3 | form-field a11y 缺 id/name | ✅ LANDED | ✅ PASS | `CaseEditModal.vue`、`PaymentModal.vue` (补 id/name) | `PaymentModal.bug205.test.ts` |

### 8.1 统计

| 状态 | 数量 | 明细 |
|---|---|---|
| ✅ LANDED | 15 | BUG-191~205 全部 |
| 📌 DEFERRED | 0 | — |
| 合计 | 15 | 2 P0 + 4 P1 + 4 P2 + 5 P3 |

### 8.2 R23 回归走查结果（2026-05-02 完成）

> R23 走查文档：`33-案件全流程chrome-devtools-mcp深度审计-第二轮.md`
> R23 截屏目录：`audit-cases-mcp-r2/`

- **14/15 PASS**：BUG-191~193, 195~200, 201~205 全部在真实浏览器中通过回归验证（含 R22-B 批 BUG-200）
- **1 CONDITIONAL**：BUG-194（代码修复正确，dev DB 缺模板种子数据导致运行时 document_items=0）
- **0 FAIL**：无新增回归缺陷
- **BUG-200**：✅ LANDED + ✅ PASS（R22-B 批落地，WAITING_MATERIAL → CLOSED_FAILED 预设 chip 提交验证通过）

### 8.3 遗留建议

1. ~~BUG-200 PM 决策闭环后补 transition 路径 + 单测~~ → ✅ 已落地（全非终态→CLOSED_FAILED + 预设撤案原因 4 码 + 前端 chips + 3 server tests + 8 admin tests）
2. BUG-194 需补 dev DB 种子脚本中经营管理（认定 4 个月）的 document_checklist 模板数据
3. 全局搜索（BUG-193 关联的 search 模块）需覆盖 `applicant_name` join 路径的性能回归

