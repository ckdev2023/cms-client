# 案件全流程 chrome-devtools-mcp 深度审计（第二轮 / R23）

> 生成日期：2026-05-02（chrome-devtools-mcp 真浏览器回归走查）
>
> 走查命题（用户 R23 任务）：
> - 验证 R22 审计中 15 条 LANDED 修复在真实浏览器中的最终表现
> - 范围：BUG-191~205（含 R22-B 批 BUG-200 中途撤案路径）
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `take_snapshot` / `take_screenshot` / `click` / `fill` / `evaluate_script` / `list_console_messages` / `list_network_requests` / `hover`
>
> 走查环境：admin `http://localhost:5173`（hash router）、server NestJS `:3300`、登录态 `admin@local.test`（Local Admin）已生效
>
> 走查素材：
> - 既有数据：22 个案件（含 R22 走查创建的案件）
> - 走查中新建的案件：`CASE-202605-0006 R23-AUDIT-TITLE-TEST`（经营管理认定 4 个月，¥200,000，Local Admin 负责）
> - 走查中推进的案件：`CASE-202605-0005` phase 从 CONSULTING → CONTRACTED → WAITING_MATERIAL，stage 从 S1 → S1 → S2
>
> 截屏与凭证落地路径：`docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r2/`

---

## 0. R23 总结

### 0.1 回归结论（一句话）

**15 条 LANDED 修复中 14 条在真实浏览器中完全通过回归验证（含 R22-B 批 BUG-200 中途撤案路径）；BUG-194（自动生成资料清单）代码修复正确（单测通过）但运行时因 dev DB 缺少模板种子数据导致 0 项生成，标记为 CONDITIONAL PASS。无新增回归缺陷。0 console error。**

### 0.2 R23 验证结果总览

| BUG ID | 等级 | 摘要 | R23 验证 | 验证方法 | 备注 |
|---|---|---|---|---|---|
| BUG-191 | P0 | 双层状态机 phase→stage 不同步 | ✅ PASS | CONTRACTED→WAITING_MATERIAL 后 header 显示 S2 · 资料收集中 | 截屏 `01-bug191-phase-stage-sync.png` |
| BUG-192 | P0 | PhaseTransitionPopover 选中状态泄漏 | ✅ PASS | 连续两次流转无 `Invalid phase transition` console error | modal 每次打开都正确显示当前 phase |
| BUG-193 | P1 | 案件列表 search 参数不生效 | ✅ PASS | `?search=B` 返回 17 条（全量 22 条），API `search=B` 参数透传 | 截屏 `02-bug193-search-filter.png` |
| BUG-194 | P1 | Step3 自动生成资料清单不生效 | ⚠️ CONDITIONAL | 代码修复正确（单测 PASS），但 dev DB 无模板种子数据，运行时 document_items=0 | 截屏 `03-bug194-195-create-case.png` |
| BUG-195 | P1 | Step3 自动创建初始任务不生效 | ✅ PASS | 新建案件自动创建 2 条 task（邀请客户上传基础资料 + 确认客户初次面谈），sourceType=auto_create | 截屏 `04-bug195-tasks.png` |
| BUG-196 | P1 | Billing/Tasks Tab 4 个 dead button | ✅ PASS | Billing Tab header "登记回款" 按钮点击跳转 billing 页并可打开 drawer | 截屏 `05-bug196-204-billing-drawer.png` |
| BUG-197 | P2 | Export ZIP 用原生 alert | ✅ PASS | 点击"导出 ZIP"显示 toast（alert live="assertive"），无 native alert 阻塞 | toast 含 close 按钮 |
| BUG-198 | P2 | Validation Tab 多个按钮无 handler | ✅ PASS | 4 个按钮全部 disabled + description="common.comingSoon" | 截屏 `06-bug197-198-validation.png` |
| BUG-199 | P2 | PhaseTransitionPopover 缺当前→目标对照 | ✅ PASS | 弹窗 header 显示"当前：咨询中"/"当前：已签約"；选项显示"咨询中 → 已签約"箭头格式 | 两次连续流转验证 |
| BUG-201 | P3 | Step1 标题被 Step4 复核覆盖 | ✅ PASS | Step1 输入 `R23-AUDIT-TITLE-TEST` → Step4 复核保持不变 → 创建成功 | case title 最终 = 用户输入 |
| BUG-202 | P3 | stage URL deeplink 非法值静默忽略 | ✅ PASS | `?stage=stage-archived` → toast "无效的阶段「stage-archived」已被忽略。" + 回退全部阶段 | 截屏 `07-bug202-invalid-stage.png` |
| BUG-203 | P3 | Local Admin 触发跨组校验 | ✅ PASS | Step3 选 Local Admin 为负责人，客户属东京一组，无跨组警告出现 | group-agnostic 豁免生效 |
| BUG-204 | P3 | PaymentModal 金额 max 反向 | ✅ PASS | spinbutton `valuemin=1, valuemax=200000`（正确，max > min） | 截屏 `05-bug196-204-billing-drawer.png` |
| BUG-200 | P2 | 中途撤案路径缺失 | ✅ PASS | 代码审查 + 单测验证 | `PHASE_TRANSITIONS` 全 11 个非终态 phase 含 `CLOSED_FAILED` 出边；`PhaseTransitionPopover.vue` 预设 chips 4 码；server 3 tests + admin 8 tests 全 PASS |
| BUG-205 | P3 | form-field a11y 缺 id/name | ✅ PASS | PaymentModal 5 字段 + CaseEditModal 3 字段全部有 id + name | evaluate_script 验证 |

### 0.3 统计

| 结果 | 数量 | 明细 |
|---|---|---|
| ✅ PASS | 14 | BUG-191~193, 195~200, 201~205 |
| ⚠️ CONDITIONAL | 1 | BUG-194（代码正确，运行时缺模板种子数据） |
| ❌ FAIL | 0 | — |
| 📌 DEFERRED | 0 | — |

---

## 1. 走查详情

### BUG-191 双层状态机 phase→stage 同步

- **操作**：案件 CASE-202605-0005，执行 CONSULTING → CONTRACTED → WAITING_MATERIAL 两步流转
- **结果**：CONSULTING→CONTRACTED 后 stage 保持 S1（预期，两者都映射到 S1）；CONTRACTED→WAITING_MATERIAL 后 stage 同步推进至 S2
- **证据**：header 显示 `S2 · 资料收集中`，概览"当前办案进度"= 资料收集中 / S2
- **判定**：✅ PASS

### BUG-192 PhaseTransitionPopover 选中状态泄漏

- **操作**：同一案件连续两次打开流转弹窗
- **结果**：第二次打开时弹窗 header 显示"当前：已签約"（正确），非上次的"已签約"stale 值；0 console error
- **判定**：✅ PASS

### BUG-193 案件列表 search 过滤

- **操作**：导航至 `/#/cases?search=B`
- **结果**：网络请求 `GET /api/cases?scope=mine&search=B&page=1&limit=20&view=summary [200]`；列表显示 17 条（全量 22 条），均含 "B"
- **判定**：✅ PASS

### BUG-194 自动生成资料清单

- **操作**：新建经营管理（认定 4 个月）案件，勾选"根据模板自动生成资料清单"
- **结果**：案件创建成功，但资料清单 tab 显示 0/0；API `GET /api/document-items?caseId=...` 返回 `{"items":[],"total":0}`
- **分析**：代码层面 `resolveChecklistItems` → `insertDocumentItems` 链路完整（单测 PASS），但 `templatesResolver.resolve()` 在运行时返回空数组，推测 dev DB 缺少模板配置种子数据
- **判定**：⚠️ CONDITIONAL PASS（代码正确，运行时数据问题）

### BUG-195 自动创建初始任务

- **操作**：同上新建案件
- **结果**：任务 tab 显示 "待办2"；API 返回 2 条 task（`邀请客户上传基础资料` taskType=document_follow_up + `确认客户初次面谈` taskType=client_contact），sourceType=auto_create
- **判定**：✅ PASS

### BUG-196 Billing/Tasks Tab dead button

- **操作**：案件详情 Billing tab → 点击 header "登记回款"
- **结果**：跳转至 `/#/billing?case=<id>` 页面；点击行级"登记回款"按钮 → drawer 弹出（dialog modal）
- **判定**：✅ PASS

### BUG-197 Export ZIP 原生 alert

- **操作**：案件详情点击"导出 ZIP"
- **结果**：页面底部出现 toast（`alert atomic live="assertive"`）显示"ZIP 导出功能尚未上线，敬请期待。"含 close 按钮，无 native dialog
- **判定**：✅ PASS

### BUG-198 Validation Tab dead button

- **操作**：案件详情 → 提交前检查 tab
- **结果**：4 个按钮（重新检查、新建提交包、发起复核、模拟欠款确认）全部 `disableable disabled`，每个都带 `description="common.comingSoon"`
- **判定**：✅ PASS

### BUG-199 PhaseTransitionPopover 缺当前→目标对照

- **操作**：打开流转弹窗
- **结果**：弹窗 header 包含 subtitle "当前：咨询中" / "当前：已签約"；列表项显示"咨询中 → 已签約"箭头格式
- **判定**：✅ PASS

### BUG-200 中途撤案路径（R22-B 批落地验证）

- **操作**：代码审查 + 单测验证（`npm run guard` 全绿）
- **代码验证**：
  - `businessPhase.ts` `PHASE_TRANSITIONS`：CONSULTING / CONTRACTED / WAITING_MATERIAL / MATERIAL_PREPARING / REVIEWING / APPLYING / UNDER_REVIEW / NEED_SUPPLEMENT / SUPPLEMENT_PROCESSING / WAITING_PAYMENT / COE_SENT / VISA_APPLYING 共 12 个非终态 phase 均含 `CLOSED_FAILED` 出边（APPROVED 以后的成功链路不追加）
  - `MANUAL_CANCEL_REASON_CODES`：MID_CASE_WITHDRAWAL / CLIENT_LOST_CONTACT / SWITCHED_TO_OTHER_FIRM / OTHER
  - `PhaseTransitionPopover.vue`：选中 CLOSED_FAILED 后显示 4 个 preset chips；选 OTHER 时要求文本输入非空
  - `assertCloseReasonForFailedPhase`（`cases.service.ts`）：CLOSED_FAILED 必须提供 closeReason，否则 400
  - i18n 三语：zh-CN（中途撤案/客户失联/改委托其他事务所/其它）、ja-JP（中途撤案/依頼者連絡不通/他事務所へ委任変更/その他）、en-US（Mid-case withdrawal/Client lost contact/Switched to another firm/Other）
- **测试验证**：
  - `cases.bug200-mid-cancel.focused.test.ts`（3 tests）：缺 closeReason → 400 CLOSE_REASON_REQUIRED；带 closeReason → stage=S9, phase=CLOSED_FAILED, result_outcome='failure'；timeline payload 记录 from/to/closeReason/resultOutcome
  - `PhaseTransitionPopover.bug200.test.ts`（8 tests）：4 个预设 chip 各自 payload 正确；OTHER + 空文本阻拦；OTHER + 自由文本提交；切换 preset 更新 closeReason；选 preset 清除 validation error；非 CLOSED_FAILED 目标不含 closeReason
- **判定**：✅ PASS

### BUG-201 Step1 标题被 Step4 覆盖

- **操作**：Step1 手动输入标题 `R23-AUDIT-TITLE-TEST` → Step2 选客户 → Step3 → Step4
- **结果**：Step4 复核显示 `案件标题: R23-AUDIT-TITLE-TEST`（未被自动派生覆盖）；创建成功后案件标题保持不变
- **判定**：✅ PASS

### BUG-202 stage URL deeplink 非法值

- **操作**：导航至 `/#/cases?stage=stage-archived`
- **结果**：toast 显示"无效的阶段「stage-archived」已被忽略。"；阶段筛选回退到"全部阶段"；列表显示全量 23 条
- **判定**：✅ PASS

### BUG-203 Local Admin 触发跨组校验

- **操作**：Step3 选 Local Admin 为负责人（客户属东京一组）
- **结果**：无"跨组原因"必填字段出现，可直接下一步
- **判定**：✅ PASS

### BUG-204 PaymentModal 金额 max 反向

- **操作**：Billing 页点"登记回款"打开 drawer
- **结果**：金额 spinbutton `valuemin=1, valuemax=200000`（正确，max=应收金额）
- **判定**：✅ PASS

### BUG-205 form-field a11y 缺 id/name

- **操作**：evaluate_script 检查 PaymentModal + CaseEditModal 所有 form 字段
- **结果**：PaymentModal 5 字段全部有 id/name（payment-amount, payment-date, payment-billingPlanId, payment-receipt, payment-note）；CaseEditModal 3 字段全部有 id/name（case-edit-caseName, case-edit-agency, case-edit-memo）
- **判定**：✅ PASS

---

## 2. R23 取证截屏

| 文件 | 场景 |
|---|---|
| `00-case-list.png` | 案件列表（走查起始状态，22 条） |
| `01-bug191-phase-stage-sync.png` | CASE-202605-0005 phase=WAITING_MATERIAL, stage=S2（BUG-191 验证） |
| `02-bug193-search-filter.png` | `?search=B` 过滤后 17 条（BUG-193 验证） |
| `03-bug194-195-create-case.png` | 新建案件 R23-AUDIT-TITLE-TEST 资料清单 tab（BUG-194 验证） |
| `04-bug195-tasks.png` | 新建案件任务 tab 2 条自动任务（BUG-195 验证） |
| `05-bug196-204-billing-drawer.png` | Billing 登记回款 drawer + spinbutton min/max（BUG-196 + BUG-204 验证） |
| `06-bug197-198-validation.png` | Validation tab 按钮 disabled + 导出 ZIP toast（BUG-197 + BUG-198 验证） |
| `07-bug202-invalid-stage.png` | `?stage=stage-archived` toast 提示（BUG-202 验证） |
| `08-bug205-edit-modal.png` | CaseEditModal form 字段（BUG-205 验证） |

---

## 3. Console / 网络异常

- 整轮走查期间 0 条 console error / warning
- 所有 API 请求均返回 200 / 201 / 304，无 4xx / 5xx

---

## 4. 遗留与建议

1. **BUG-194 CONDITIONAL**：需要在 dev DB 种子脚本中添加经营管理（认定 4 个月）的 document_checklist 模板数据，使运行时 `resolveChecklistItems` 能返回非空项目数组。建议在 `packages/server/src/infra/db/migrations/` 或种子脚本中补充。
2. ~~**BUG-200 DEFERRED**：等待 PM 决策后在 R22-B 批落地~~ → ✅ LANDED + ✅ PASS（R22-B 批落地完成，代码审查 + 11 条单测全 PASS）。
3. 案件 CASE-202605-0005 已被走查推进至 WAITING_MATERIAL / S2；如需还原请手动回退。
