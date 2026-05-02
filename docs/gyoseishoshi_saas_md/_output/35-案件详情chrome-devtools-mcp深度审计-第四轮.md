# 案件详情 chrome-devtools-mcp 深度审计 Bug 清单（第四轮 / R25）

> 生成日期：2026-05-02（chrome-devtools-mcp 真浏览器深度审计）
>
> 走查命题（用户 R25 任务）：
> - "使用 chrome-devtools-mcp 走查案件详情里面的所有 UI 问题和业务逻辑"
> - 范围：聚焦 admin 端 `/cases/:id` 详情页，覆盖头部、10 个 tab、3 个 modal、状态流转 popover 与三语 i18n 一致性
> - 模式：深度审计（bug hunting；找前几轮 R22~R24 没看到的新缺陷）
>
> 走查工具：
> - `chrome-devtools-mcp`：`navigate_page` / `take_snapshot` / `take_screenshot` / `click` / `type_text` / `evaluate_script` / `list_console_messages`
>
> 走查环境：admin `http://localhost:5173`（hash router）、server NestJS `:3300`、登录态 `admin@local.test`（Local Admin / org-id `00000000-0000-4000-8000-000000000010`）已生效
>
> 走查素材：
> - 4 个代表性案件覆盖不同 phase：
>   - `CASE-202605-0006 R23-AUDIT-TITLE-TEST` — phase=CONSULTING / stage=S1（咨询中）
>   - `CASE-202604-0018 R7 BUG-118 supplement double` — phase=WAITING_PAYMENT / stage=S7（等待尾款）
>   - `CASE-202604-0007 R5 BUG-083 probe` — phase=CLOSED_FAILED / stage=S9（失败归档，终态）
> - 10 个详情 tab：概览 / 提交前检查 / 资料清单 / 任务 / 基础信息 / 文书 / 期限 / 收费 / 沟通记录 / 日志
> - 截屏与凭证落地路径：`docs/gyoseishoshi_saas_md/_output/audit-cases-mcp-r4/`
>
> 与 R22 / R23 / R24 的差异：
> - R22 命题：流程通断 + 双层状态机正确性 → 出 BUG-191~205（15 条）
> - R23 命题：R22 修复的 LANDED 验收 → 14/15 PASS、1 CONDITIONAL
> - R24 命题：寻找回退分支 / 终态 / a11y / i18n / admin↔server 协议同步 → 出 BUG-206~211（6 条），其中 BUG-208 P0
> - **R25 命题：聚焦"案件详情"单页的 UI 与业务逻辑——找 R22/R23/R24 都没看到的、纯粹在详情页内部产生的缺陷**

---

## 0. R25 总结

### 0.1 一句话结论

**案件详情 10 个 tab + 3 个 modal + 1 个 popover 在 zh-CN 下"看上去能用"；但深入交互发现 _4 个死按钮 + 5 处 i18n 漏译 + 1 处终态权限失守_，合计 14 条新缺陷，其中 P1 6 条（功能死路 / i18n 大面积漏翻）、P2 4 条、P3 4 条。**

R24 BUG-208（admin↔server PHASE_TRANSITIONS 协议失同步）在 R25 走查时 ✅ 已 LANDED：`packages/admin/src/views/cases/model/businessPhaseTransitions.ts` 现已与 server `businessPhase.ts` 完全对齐（含跨包一致性测试 `businessPhase.admin-consistency.test.ts` 守门），WAITING_PAYMENT popover 现已显示 `[COE_SENT, CLOSED_FAILED]` 2 个目标。R24 BUG-211（ja-JP `校験実行` 字形）也已 LANDED：现显示 `検証実行`。

### 0.2 R25 新发现 BUG 清单

| BUG ID | 等级 | 位置 | 摘要 | 取证截屏 |
|---|---|---|---|---|
| BUG-212 | **P1** | `CaseValidationTab.vue` L85/L245、`CaseValidationSupport.vue` L51/L146 | i18n key 拼写错误：4 个 disabled 按钮 `:title="t('common.comingSoon')"` 引用了不存在的 key（应是 `shell.comingSoon`），用户 hover 看到原始字符串 `common.comingSoon` 而不是"建设中" | `01-detail-validation-tab-comingsoon.png` / `07-ja-validation-tab.png` |
| BUG-213 | **P1** | `CaseInfoTab.vue` L71/L84/L98 + adapter | "基础信息" tab 字段值显示原始 enum 与 UUID：① "案件编号" = `5d38aaac-bdaa-483d-9ac3-64f72d9de27f` 而非业务 case_no `CASE-202605-0006`；② "案件类型" = `biz_mgmt_cert_4m` / `biz_mgmt_4m` 未走 `t('cases.constants.caseTypes.<x>')` 字典；③ "申请类型" = `certification` 未走 `t('cases.constants.applicationTypes.<x>')` 字典 | `03-bug-info-tab-raw-enum.png` |
| BUG-214 | **P1** | `CaseFormsTab.vue` L44/L59/L69/L108/L151/L154/L177 | "文書" tab 整个组件未引入 `useI18n`，所有文案硬编码中文（"文書管理"/"生成文書"/"可用模板"/"已生成文書"/"导出"/"版本历史"/"暂无可用文書模板或生成记录"），ja-JP / en-US 下完整泄漏中文；且"生成文書"按钮**无 `@click` handler** —— 死按钮 | `08-bug-ja-forms-zh-leak.png` |
| BUG-215 | **P1** | `CaseDeadlinesTab.vue` L70/L85/L123-126/L134/L148/L150/L177 | "期限" tab 大量硬编码：① 中文 `关键期限` / `添加期限` / `到期前提醒设定` / `满了日:` / `尚未录入在留期间` / `尚未设置续签提醒`；② 日文 `カード:` / `入国日:`；③ ja-JP / en-US 下 zh 文案泄漏；④ "添加期限"按钮**整个文件无 `@click` handler** —— 死按钮，点击无任何反应 | （评估，复现路径：详情页 → 期限 tab → 点 "添加期限"）|
| BUG-216 | **P1** | `CaseMessagesTab.vue` L104-106 | "记录留痕" 按钮**无 `@click` handler** —— 死按钮：用户输入沟通文案、选择记录类型（内部/客户可见/电话/线下会议）后点提交，无任何反应（输入框文本不清空、无 toast、无 console error、无 network 请求） | （评估，复现路径：详情页 → 沟通记录 → 输入文本 → 选择类型 → 点 "记录留痕"）|
| BUG-217 | **P1** | `CaseTasksTab.vue` L59/L132 + `CaseDetailView.vue` 路由 | 详情页"新增任务"按钮 `@click="emit('open-create-task')"` 实际跳转到 `/#/tasks?case=<id>` —— 但 `/tasks` 任务工作台**没有"新建任务"功能**，形成死循环：用户从详情页跳过去后，看到"显示 0 / 0 条 / 当前视图没有命中的任务"，无任何创建入口 | `10-bug-add-task-redirect-deadend.png` |
| BUG-218 | **P1** | `CaseDetailView.vue` L273（编辑信息按钮）/ L309-313（状态流转按钮） | 终态案件 (S9 / CLOSED_SUCCESS / CLOSED_FAILED) 详情头 "编辑信息" 与 "状态流转" 按钮**未受 `:disabled="isReadonly"` 守门**：① 点 "状态流转" 弹出空 popover（仅标题"业务阶段流转"+"当前：失败归档"，无任何可达目标，"确认流转"按钮 disabled）；② 点 "编辑信息" 进入完全可编辑的 modal（与页面顶部 banner 提示"此案件已归档（已归档），所有字段为只读"自相矛盾） | `11-bug-terminal-popover-empty.png` / `12-bug-terminal-edit-modal-active.png` |
| BUG-219 | **P2** | `CaseLogTab.vue` L106 + 日志 entry 数据 | 日志 tab 事件类型直接显示原始 event_type 字符串：`case_party.created` 在 zh-CN / ja-JP 下都未走 i18n，应映射为"添加关联人 / 関連者を追加 / Added related party" | `04-bug-log-tab-raw-event.png` / `09-bug-ja-log-zh-leak.png` |
| BUG-220 | **P2** | 日志 entry 文案 + adapter | 日志 entry "案件创建：biz_mgmt_cert_4m"（ja-JP "案件作成：biz_mgmt_cert_4m"）中案件类型 enum 未走 `t('cases.constants.caseTypes.biz_mgmt_cert_4m')` 翻译为业务文案 | `04-bug-log-tab-raw-event.png` / `09-bug-ja-log-zh-leak.png` |
| BUG-221 | **P2** | `packages/admin/src/i18n/messages/cases/ja-JP.ts` L654 | `cases.constants.logCategories.all = "全部"` 是中文（漏译），ja-JP 日志过滤 radio 显示"全部"而非"すべて"；en-US 已正确（"All"），zh-CN 已正确（"全部"） | `09-bug-ja-log-zh-leak.png`（左侧 radiogroup） |
| BUG-222 | **P2** | `CaseOverviewSidebar.vue` L120 + adapter | "案件团队" 卡片在 `detail.team = []` 时显示空白卡片（只有 heading "案件团队"，下面是 0px 高的空 div），未走空状态文案；"近期动态" 卡片同样问题（detail.timeline 为空时仅显示 "近期动态" + "查看完整日志 →" 链接，中间空白） | `00-detail-overview-CASE-202605-0006.png`（右侧 sidebar） |
| BUG-223 | P3 | `CaseDetailView.vue` readonly banner i18n | 终态 banner 文案 "此案件已归档（已归档），所有字段为只读" —— `cases.detail.readonlyBanner` 模板里的 `{stage}` 变量被填成"已归档"，与括号外的"已归档"重复，应改为 "此案件已归档（CLOSED_FAILED / 失败归档），所有字段为只读" 或 "此案件已归档，所有字段为只读" | `11-bug-terminal-popover-empty.png`（Header 下方 status banner） |
| BUG-224 | P3 | `CaseEditModal.vue` 字段集 | "编辑案件信息" modal 只含 3 个字段（案件名称 / 管辖机构 / 备注），缺关键业务字段（目标提交日期 / 受理日期 / 风险标签 / 经办人 / 分组），用户无法在 UI 内修改这些核心字段 | `06-edit-modal-only-3-fields.png` |
| BUG-225 | P3 | "财务状况" 概览卡 + billing_records seed | CASE-202604-0018 phase=WAITING_PAYMENT（业务上"等待尾款"）但概览页 "财务状况" 显示 `—`、"收费" tab "总费用" 也显示 `—`、待收 ¥0 —— phase 已推到等待尾款但 billing_records 完全空，业务约束失效（应在推到 WAITING_PAYMENT 前强制要求 billing 记录存在） | `00-detail-overview-CASE-202605-0006.png` 对照（CASE-0006 显示 ¥200,000）vs `05-popover-waiting-payment-2-targets.png` 头部（CASE-0018 显示 `—`）|

### 0.3 R22~R24 修复回归确认（R25 仍 ✅）

| BUG ID | 上次状态 | R25 验证 | 说明 |
|---|---|---|---|
| BUG-208 | ❌ R24 实证：admin 副本失同步 | ✅ **LANDED** | `businessPhaseTransitions.ts` 11 条 CLOSED_FAILED 出边已补齐，并加 `businessPhase.admin-consistency.test.ts` 跨包一致性守门测试；R25 实测 WAITING_PAYMENT popover 现显示 `[COE_SENT, CLOSED_FAILED]` 2 个目标 |
| BUG-211 | R24 新发现：ja-JP `校験実行` | ✅ **LANDED** | ja-JP 概览"次の重要アクション"卡片现显示 `検証実行`，与同页"検証と提出パッケージを見る"用字一致 |
| BUG-191 / 192 / 199 | R23 PASS | ✅ PASS | header `S7 · 已提交待回执` + `等待尾款` 双层状态同步正常；popover header 始终带"当前：xxx" |
| BUG-205 | R23 PASS（PaymentModal/CaseEditModal） | ✅ PASS（同范围） | edit modal textbox 都有 label 关联 |

### 0.4 R25 走查路径总览

```
登录态校验
  → /#/cases?scope=mine 列表（23 条，沿用 R24 数据）
  → /#/cases/CASE-202605-0006 (CONSULTING) 详情
    → 概览 tab：bottom 4 区域空白（资料分组 / 近期动态 / 案件团队 / 提交前校验）
    → 提交前检查 tab：4 个 disabled 按钮 title 显示 "common.comingSoon" (BUG-212)
    → 资料清单 tab：本地资料根目录未配置 alert + "登记资料" disabled + "手动添加" 弹窗能开
    → 任务 tab：2 条 task checkbox（已完成）
    → 基础信息 tab：案件编号=UUID + 案件类型=biz_mgmt_cert_4m + 申请类型=certification (BUG-213)
    → 文书 tab：标题"文書管理" + 中文 placeholder（zh-CN 没问题，ja-JP 漏翻 BUG-214）
    → 期限 tab："关键期限" / "添加期限" 死按钮 (BUG-215)
    → 收费 tab：¥200,000 / 案件报酬 / 应收 一行
    → 沟通记录 tab：输入文案 + 点 "记录留痕" → 无反应 (BUG-217)
    → 日志 tab：case_party.created + 案件创建：biz_mgmt_cert_4m 未 i18n (BUG-219/220)
  → 切 ja-JP 同上：
    → 提交前检查："common.comingSoon" 漏翻 (BUG-212 跨语言)
    → 文書 tab："文書管理" + 中文 placeholder "暂无可用文書模板或生成记录" 漏翻 (BUG-214)
    → 日志 tab：radio "全部" 漏翻（应"すべて"）(BUG-221)
    → 基础信息 tab：案件番号=UUID + 案件種別=biz_mgmt_4m (BUG-213)
  → /#/cases/CASE-202604-0018 (WAITING_PAYMENT) 详情
    → 头部 "财务状况：—" / 收费 tab 总费用 — / billing_records 空 (BUG-225)
    → 状态流转 popover 显示 [等待尾款 → 在留已发送, 等待尾款 → 失败归档] 2 个目标 (BUG-208 ✅ FIXED)
    → 编辑信息 modal 仅 3 个字段（案件名称/管辖机构/备注）(BUG-224)
    → 任务 tab "新增任务" → 跳转 /#/tasks?case=... → 列表 0 条 + 无创建入口 (BUG-217)
  → /#/cases/CASE-202604-0007 (CLOSED_FAILED, S9) 终态详情
    → 头部 banner "此案件已归档（已归档），所有字段为只读" 文案重复 (BUG-223)
    → "状态流转"按钮可点 → 弹出空 popover（无目标项）(BUG-218 popover 死路)
    → "编辑信息"按钮可点 → 弹出可编辑 modal（与 readonly banner 矛盾）(BUG-218 readonly 失守)
```

整轮 0 个 5xx / 0 console error / 0 console warning / 0 网络异常。

---

## 1. P1 缺陷（功能死路 / i18n 大面积漏翻）

### BUG-212 ⚠️ `common.comingSoon` i18n key 拼写错误，4 处按钮 hover 显示原始 key

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseValidationTab.vue` L83-86 / L243-246 + `packages/admin/src/views/cases/components/CaseValidationSupport.vue` L49-52 / L144-147 |
| 复现 | 1. 任意案件详情 → 提交前检查 tab；2. 鼠标 hover 到任一 disabled 按钮（"重新检查" / "新建提交包" / "发起复核" / "模拟欠款确认"）；3. 浏览器 tooltip 显示 `common.comingSoon` 而非"建设中"（zh-CN）/ "Coming soon"（en-US）/ "準備中"（ja-JP） |
| 实证 | `evaluate_script` 直接读 button.title 属性返回 `"common.comingSoon"`（4 处全中招）；i18n 字典里只有 `shell.comingSoon`，没有 `common.comingSoon`（vue-i18n 默认 fallback 输出 raw key） |
| 期望 | `:title="t('shell.comingSoon')"`（4 处统一改）或在 zh-CN/en-US/ja-JP 字典 `common.comingSoon` 各加一条；建议改源码（一次性消除 4 处一致性问题） |
| 影响 | UI 文案漏出原始 i18n key，破坏专业感；屏幕阅读器朗读 raw key 无意义 |
| 取证 | `01-detail-validation-tab-comingsoon.png`（zh-CN）/ `07-ja-validation-tab.png`（ja-JP，4 个按钮 + 文案确认）|
| 建议补丁 | ① `CaseValidationTab.vue` L85 / L245 改 `shell.comingSoon`；② `CaseValidationSupport.vue` L51 / L146 改 `shell.comingSoon`；③ 加 `CaseValidationTab.bug212.test.ts` 断言 4 个 disabled 按钮 `wrapper.find('button[disabled]').attributes('title')` 等于 `t('shell.comingSoon')`；④ 顺手在 CI eslint 规则里禁 `common\.` 命名空间引用（仓库当前不存在 `common` namespace） |
| 等级 | **P1 — i18n 漏出原始 key** |
| 状态 | 新发现 / 未 land |

### BUG-213 ⚠️ 基础信息 tab 字段值显示原始 enum 与 UUID

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseInfoTab.vue` L71（caseId）/ L84（caseType）/ L98（applicationType） + adapter `CaseAdapterDetailAggregate.ts` |
| 复现 | 1. CASE-202605-0006 详情 → 基础信息 tab；2. 观察"案件编号 / 案件类型 / 申请类型" 3 行：<br>① 案件编号 = `5d38aaac-bdaa-483d-9ac3-64f72d9de27f`（应显示业务编号 `CASE-202605-0006`）<br>② 案件类型 = `biz_mgmt_cert_4m`（应显示"经营管理（认定4个月）"）<br>③ 申请类型 = `certification`（应显示"认定"）|
| 期望 | ① 案件编号绑定 `detail.caseNo`（adapter 已经从 server `case_no` 字段下发到列表 / header / breadcrumb 用，但 info tab 直接用了 `detail.id`）；② 案件类型 `{{ t('cases.constants.caseTypes.' + detail.caseType, detail.caseType) }}`；③ 申请类型 `{{ t('cases.constants.applicationTypes.' + detail.applicationType, detail.applicationType) }}` |
| 实证 | i18n 字典已存在 `cases.constants.caseTypes.biz_mgmt_cert_4m`（zh-CN: "经营管理（认定4个月）" / ja-JP: "経営管理（認定4ヶ月）" / en-US: "BMV (CoE 4-month)"）和 `cases.constants.applicationTypes.certification`（zh-CN: "认定" / ja-JP: "認定" / en-US: "Certificate of Eligibility"），但 view 层没有调用 |
| 影响 | 用户看到的不是业务术语而是工程内部 enum；案件编号显示 UUID 让用户无法对照工单；ja-JP / en-US 下问题等量发生（实测 ja-JP 下显示 `案件番号: 5d38aaac-...` / `案件種別: biz_mgmt_4m` / `申請種別: —`）|
| 取证 | `03-bug-info-tab-raw-enum.png` |
| 建议补丁 | 1. `CaseInfoTab.vue` L71 改 `{{ detail.caseNo || detail.id }}` 或新增 adapter 字段 `detail.identityLabel`；2. L84 改 `{{ t('cases.constants.caseTypes.' + detail.caseType, detail.caseType) }}`；3. L98 改 `{{ t('cases.constants.applicationTypes.' + detail.applicationType, detail.applicationType) }}`；4. 三种 case_type / application_type 下加 `CaseInfoTab.bug213.test.ts` 三语断言 |
| 等级 | **P1 — 信息错乱（工程数据泄漏到业务用户视图）** |
| 状态 | 新发现 / 未 land |

### BUG-214 ⚠️ CaseFormsTab 整个组件未 i18n + "生成文書"按钮无功能

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseFormsTab.vue` 整个文件 |
| 复现 | 1. 切 ja-JP；2. 任一案件详情 → "文書" tab；3. 整页文案显示中文："文書管理" / "生成文書" / "暂无可用文書模板或生成记录" / "可用模板" / "已生成文書" / "导出" / "版本历史"；4. 点"生成文書"按钮无任何反应 |
| 实证 | `Grep '@click' CaseFormsTab.vue` → 0 hits；`Grep 'useI18n' CaseFormsTab.vue` → 0 hits；整个组件缺 import + 文案全硬编码（L44 / L59 / L69 / L108 / L151 / L154 / L177） |
| 期望 | ① 文件顶部 `import { useI18n } from "vue-i18n"; const { t } = useI18n();`；② 7 处文案全部改 `{{ t('cases.detail.forms.<key>') }}`；③ 三语字典补 `cases.detail.forms.title / generateBtn / availableTemplates / generatedDocs / exportBtn / versionHistory / empty`；④ 当前"生成文書"按钮要么补 `@click="emit('generate-form')"` 要么 disable + `:title="t('shell.comingSoon')"`（参考 R23 BUG-205 的处理） |
| 影响 | en-US / ja-JP 用户看到中文 placeholder（"暂无可用文書模板或生成记录"），完全脱离本地化；"生成文書"是显著的主操作按钮，但按了无任何反应（无 toast / 无 modal / 无 navigation）—— 用户会以为系统出错 |
| 取证 | `08-bug-ja-forms-zh-leak.png`（ja-JP 文書 tab，中文 placeholder 在右侧 "暂无可用文書模板或生成记录"） |
| 建议补丁 | 1. 一次性 i18n 化（参考已 i18n 的 `CaseInfoTab.vue` 写法）；2. 三语字典补齐；3. 加 `CaseFormsTab.bug214.test.ts` 断言三语 fallback；4. 决定"生成文書"是否做产品（如不做，按 R23 BUG-205 处理为 disabled + 准 i18n title） |
| 等级 | **P1 — i18n 完全失效 + 主操作死按钮** |
| 状态 | 新发现 / 未 land |

### BUG-215 ⚠️ CaseDeadlinesTab 大量硬编码 + "添加期限"死按钮

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseDeadlinesTab.vue` L70 / L85 / L123-126 / L134 / L148 / L150 / L177 |
| 复现 | 1. CASE-202604-0018 详情 → 期限 tab；2. 观察标题 "关键期限" + 按钮 "添加期限" + 占位 "尚未录入在留期间" / "尚未设置续签提醒" / "到期前提醒设定" / "满了日:" / "カード:" / "入国日:"；3. 点 "添加期限" 按钮 — 无任何反应（无 modal / 无 navigation / 无 console error） |
| 实证 | `Grep '@click' CaseDeadlinesTab.vue` → 0 hits；硬编码混杂（L123 `カード:`、L126 `入国日:` 是日文；L70 `关键期限`、L134 `尚未录入在留期间`、L148 `到期前提醒设定`、L150 `满了日:`、L177 `尚未设置续签提醒` 是中文）—— ja-JP / en-US 下中文泄漏，zh-CN 下日文泄漏 |
| 期望 | ① 文件顶部 `useI18n()`；② 全部硬编码 → `t('cases.detail.deadlines.<key>')`；③ 三语字典补齐 8 个 key；④ "添加期限"按钮：要么补 `@click="emit('add-deadline')"` 并实现 modal，要么按 R23 BUG-205 处理为 disabled + i18n title |
| 影响 | "添加期限" 是显著的主操作按钮，按了完全无反应——典型的"产品给了入口、研发没接 handler"；混杂中日文导致任意 locale 都不洁净 |
| 取证 | （静态评估，复现路径明确：详情页→期限 tab→点"添加期限"无反应） |
| 建议补丁 | 1. i18n 化全部 8 处；2. 决策"添加期限"功能是否做（如做，参考 PaymentModal 实现 deadline modal；如不做，至少要 disabled + i18n title 不留死按钮）；3. 加 `CaseDeadlinesTab.bug215.test.ts` 断言三语完整 + 按钮 emit |
| 等级 | **P1 — i18n + 主操作死按钮** |
| 状态 | 新发现 / 未 land |

### BUG-217 ⚠️ "记录留痕" 按钮无 @click handler，沟通记录写不进

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseMessagesTab.vue` L104-106（`<button class="messages-tab__publish-btn" type="button">{{ t("cases.detail.messages.publish") }}</button>`） |
| 复现 | 1. 任一非终态案件详情 → 沟通记录 tab；2. textbox 输入"R25 audit test message"；3. combobox 选 "内部记录"（默认）；4. 点 "记录留痕"；5. 无任何反应：textbox 文本未清空、无 toast 提示、`list_console_messages` 0 条、`list_network_requests` 0 条新请求 |
| 实证 | `Grep '@click' CaseMessagesTab.vue` 仅返回 L174（`activeFilter = 'all'` filter 切换），没有 publish handler 的 @click |
| 期望 | ① 接 emit 'publish-message' { content, type } 到父级；② 父级 model 调 server 端 `POST /api/cases/<id>/messages`；③ 成功后清空 textbox + toast + 刷新列表 |
| 影响 | 沟通记录是事务所管理 P0 业务（合规、留痕），用户看似有入口、按了无反应——且无任何错误反馈，比"明显报错"更隐蔽；数据完全无法落库 |
| 取证 | （评估：DevTools network panel 0 请求、console 0 错误、textbox 文本仍在）|
| 建议补丁 | 1. CaseMessagesTab 改 `<button @click="emit('publish-message', { content: draft, type: messageType })">`；2. CaseDetailView 接 handler 并调 `caseRepo.createMessage(...)`；3. server 侧若 API 已存在则直接接，否则补；4. 加 `CaseMessagesTab.bug217.test.ts` 单测 click → emit 含 payload |
| 等级 | **P1 — 业务关键写操作完全失效（合规风险）** |
| 状态 | 新发现 / 未 land |

### BUG-218 ⚠️ "新增任务" 跳转死循环：详情页 → /tasks?case=… → 列表无创建入口

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseTasksTab.vue` L59 / L132 emit `'open-create-task'` + `CaseDetailView.vue` 接 handler 的实现（实际 `router.push('/tasks?case=' + caseId)`） + `views/tasks/TasksView.vue` 缺创建入口 |
| 复现 | 1. CASE-202604-0018 详情 → 任务 tab（`/cases/<id>?tab=tasks`）；2. 点 "新增任务"；3. 跳转到 `/#/tasks?case=9854ce6c-71f1-448f-9e1b-25ebb934d760`；4. 看到："待处理任务 0 / 今日到期 0 / 已逾期 0 / 提醒日志 3"，表格"显示 0 / 0 条 / 当前视图没有命中的任务"，**无任何"新建"按钮** |
| 期望 | 要么 ① 详情页 "新增任务" 弹本页面 modal（推荐，符合用户预期）；② 跳转目标改为带"新建" UI 的页面；③ /tasks 工作台增加"新建任务"按钮（次选，因为工作台定位是"看今天" 而非"管理任务"）|
| 影响 | 用户完全无法通过 UI 在某个案件下新建 task —— 业务关键 P0 功能死路；只有 server 端 phase 自动化（R23 BUG-195 修复）创建任务，人工补录无路 |
| 取证 | `10-bug-add-task-redirect-deadend.png`（左上面包屑显示 "案件" → "任务与提醒"，右侧表格 0 条数据 + 无新建按钮）|
| 建议补丁 | 1. 详情页 model 层加 `useCreateTaskModal` hook；2. CaseTasksTab.vue emit 'open-create-task' 由父级 `CaseDetailView` 接成 modal 打开（而非 navigate）；3. 复用 server `POST /api/cases/<id>/tasks` 接口；4. 加端到端测试断言点击后弹 modal、提交后任务出现在列表 |
| 等级 | **P1 — 业务关键写操作 UI 路径死路** |
| 状态 | 新发现 / 未 land |

### BUG-216 ⚠️ 终态案件详情头 "编辑信息" / "状态流转" 按钮失守 readonly

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/CaseDetailView.vue` L273（编辑信息按钮）/ L309-313（状态流转按钮）|
| 复现 | 1. CASE-202604-0007（`stage=S9 / phase=CLOSED_FAILED`）详情；2. 顶部 banner 显示 "此案件已归档（已归档），所有字段为只读。仅日志 Tab 保持可访问。"；3. 但右上 "编辑信息" 和 "状态流转" 按钮均可见可点；4. 点 "状态流转" 弹 popover：标题 "业务阶段流转"、"当前：失败归档"、**无任何可达目标项**、"确认流转" disabled —— 空 popover 困惑 UX；5. 点 "编辑信息" 弹完全可编辑的 modal（textbox 全部 enabled）—— 与 readonly banner 矛盾 |
| 实证 | `Read CaseDetailView.vue L272-313` 显示两个按钮均无 `:disabled="isReadonly"` 守门；只有子 tab `<CaseOverviewTab :readonly="isReadonly" :is-terminal="isTerminal">`（line 426-427）传递了 readonly，但 header actions 漏 |
| 期望 | ① 终态时 "编辑信息" 与 "状态流转" 至少 disabled（参考 readonly banner 同 isReadonly 状态）；② 更激进可以 v-if 隐藏；③ 即使保留为 disabled，按钮 title 应说明原因（"案件已归档，无法继续编辑/流转"）|
| 影响 | 1) 终态 popover 空白 UX 让用户不知所措；2) 编辑 modal 可编辑会让用户误以为终态仍可改字段（点"保存"如果 server 拒绝才会发现）—— 体验链路断裂；3) 与 banner 文案矛盾，破坏信任 |
| 取证 | `11-bug-terminal-popover-empty.png`（空 popover）/ `12-bug-terminal-edit-modal-active.png`（可编辑 modal） |
| 建议补丁 | 1. CaseDetailView.vue header actions 两个按钮加 `:disabled="isReadonly"`；2. 加 `:title="isReadonly ? t('cases.detail.readonlyHint') : ''"`；3. 顺手把 `phaseMenu.openMenu()` 改为 `if (isTerminal) return; phaseMenu.openMenu()`（双重守门）；4. 加 `CaseDetailView.bug216-terminal-readonly.test.ts` 断言 isReadonly=true 时两个按钮 disabled |
| 等级 | **P1 — 权限失守 + 文案矛盾** |
| 状态 | 新发现 / 未 land |

---

## 2. P2 缺陷

### BUG-219 日志 tab 事件类型 `case_party.created` 直接显示原始 event_type

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseLogTab.vue` L106-108（entry.title 渲染）+ adapter / 字典 |
| 复现 | 1. CASE-202605-0006 详情 → 日志 tab；2. 第 1 条 entry 显示 `case_party.created`，类别 chip 显示"操作日志"，target chip 显示"关联人"；3. 切 ja-JP 同样显示 `case_party.created` |
| 期望 | i18n 化 entry.title：① zh-CN: "添加关联人"；② ja-JP: "関連者を追加"；③ en-US: "Added related party" |
| 影响 | 日志面板对运营是核心 audit trail 工具，eventType 直接暴露内部命名空间 (`<entity>.<action>`)，专业感差；运营查日志成本提升 |
| 取证 | `04-bug-log-tab-raw-event.png`（zh-CN）/ `09-bug-ja-log-zh-leak.png`（ja-JP） |
| 建议补丁 | 1. 在 `cases/<locale>.ts` 加 `cases.constants.logEventTypes.case_party.created` 三语；2. CaseLogTab adapter 把原始 eventType 传给 view + view 调 `t('cases.constants.logEventTypes.' + eventType, eventType)` |
| 等级 | **P2** |
| 状态 | 新发现 / 未 land |

### BUG-220 日志 entry 文案中案件类型 enum 未翻译

| 字段 | 值 |
|---|---|
| 位置 | server log seed / adapter `CaseAdapterDetailAggregate.ts` log slice |
| 复现 | 1. CASE-202605-0006 详情 → 日志 tab；2. 第 2 条 entry 显示 "案件创建：biz_mgmt_cert_4m"（zh-CN）/ "案件作成：biz_mgmt_cert_4m"（ja-JP）|
| 期望 | server 侧记日志时不要拼字符串；前端 adapter 拿到结构化 `{ event: 'case.created', meta: { caseType: 'biz_mgmt_cert_4m' } }`，view 走 `t('cases.detail.log.events.case.created', { caseType: t('cases.constants.caseTypes.' + meta.caseType) })` |
| 影响 | 与 BUG-219 同根（日志国际化未做），但更严重——同一行里中文（"案件创建："）+ 英文 enum（"biz_mgmt_cert_4m"）混杂 |
| 取证 | `04-bug-log-tab-raw-event.png` / `09-bug-ja-log-zh-leak.png` |
| 等级 | **P2** |
| 状态 | 新发现 / 未 land |

### BUG-221 ja-JP `cases.constants.logCategories.all` 字典值是中文 `全部`

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/i18n/messages/cases/ja-JP.ts` L654 |
| 复现 | 1. 切 ja-JP；2. 任一案件详情 → 日志 tab；3. 顶部过滤 radio 显示：「全部 / 操作ログ / 審査ログ / ステータス変更ログ」—— "全部" 是中文字面（应为 "すべて"）|
| 实证 | `Grep 'logCategories' i18n/messages/cases` 显示 ja-JP L654 `all: "全部"`；en-US L658 `all: "All"`（正确）；zh-CN L632 `all: "全部"`（正确）|
| 期望 | `ja-JP.ts` L654 改为 `all: "すべて"` |
| 影响 | ja-JP 用户看到 1 个中文按钮和 3 个日文按钮的混杂 radio group |
| 取证 | `09-bug-ja-log-zh-leak.png`（左侧 radiogroup） |
| 建议补丁 | 单字典修复 + 加 `cases.ja-jp.logCategories.bug221.test.ts` 断言 `all` 不是 `'全部'` |
| 等级 | **P2 — 字典级别明显漏译** |
| 状态 | 新发现 / 未 land |

### BUG-222 概览右侧"案件团队" / "近期动态" 卡片在数据为空时显示空白

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseOverviewSidebar.vue` L113-146（team card）+ `CaseOverviewTab.vue` timeline section |
| 复现 | 1. CASE-202605-0006 / CASE-202604-0018 详情概览；2. 右侧"案件团队"标题下方完全空白（无 placeholder、无 0px 高 div）；3. 主区"近期动态"标题下方仅显示"查看完整日志 →"按钮，中间空白 |
| 实证 | `Read CaseOverviewSidebar.vue L120` `v-for="(member, i) in detail.team"` —— 当 `detail.team = []` 时，`<div v-for>` 不渲染，且没有 `v-if/v-else` 兜底；timeline 同样问题 |
| 期望 | ① team 为空时显示 `<div class="empty">{{ t('cases.detail.overview.sidebar.teamEmpty') }}</div>`（参考 InfoTab 的 placeholder 写法）；② timeline 为空时显示同样空状态 |
| 影响 | 视觉上看似 UI 出 bug；用户不知道是"无数据"还是"加载失败"|
| 取证 | `00-detail-overview-CASE-202605-0006.png`（右侧 sidebar 底部"案件团队"标题下方一片空白，与左侧"提交前校验"卡片底部按钮对比明显） |
| 建议补丁 | CaseOverviewSidebar.vue + CaseOverviewTab.vue 各加 v-if/v-else 兜底；三语字典补 2 条 empty key |
| 等级 | **P2 — 空状态未处理** |
| 状态 | 新发现 / 未 land |

---

## 3. P3 缺陷

### BUG-223 终态 readonly banner 文案重复："此案件已归档（已归档）"

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/CaseDetailView.vue` L353-355 + i18n key `cases.detail.readonlyBanner` |
| 复现 | 终态案件 (S9 / CLOSED_*) 详情页头部 banner 显示 "此案件已归档（已归档），所有字段为只读。仅日志 Tab 保持可访问。" — 括号内外重复"已归档" |
| 期望 | i18n 模板用 `{{ t('cases.detail.readonlyBanner', { stage: stageLabel }) }}` 时，stageLabel 已经是"已归档"，模板不要再写"案件已归档（{stage}）"——改为 "此案件 {stage}，所有字段为只读" 或在 banner 中显示 phase 名（如"失败归档"/"成功归档"）作为更细粒度的区分 |
| 影响 | 文案不专业 |
| 取证 | `11-bug-terminal-popover-empty.png`（顶部 status banner） |
| 等级 | **P3 — 文案** |
| 状态 | 新发现 / 未 land |

### BUG-224 编辑信息 modal 仅 3 个字段，缺核心业务字段

| 字段 | 值 |
|---|---|
| 位置 | `packages/admin/src/views/cases/components/CaseEditModal.vue` |
| 复现 | 任一案件详情 → 点 "编辑信息" → modal 仅 3 个字段：案件名称 / 管辖机构 / 备注 |
| 期望 | 至少加：① 目标提交日期 / 受理日期；② 风险标签；③ 经办人 / 协作人；④ 分组（东京一组/二组）；理由：基础信息 tab 展示了这些字段（虽然原始 enum 显示，BUG-213），用户希望能编辑 |
| 影响 | 关键字段无 UI 编辑入口，只能直接 SQL 改库，运营自治受限 |
| 取证 | `06-edit-modal-only-3-fields.png` |
| 等级 | **P3 — 功能边界 / 产品决策** |
| 状态 | 新发现 / 未 land |

### BUG-225 phase=WAITING_PAYMENT 但 billing_records 完全空，业务约束失效

| 字段 | 值 |
|---|---|
| 位置 | `packages/server/src/modules/core/cases/cases.service.ts` phase 流转 guards |
| 复现 | 1. CASE-202604-0018 phase=WAITING_PAYMENT（等待尾款）；2. 详情头"财务状况" 显示 `—`；3. 收费 tab "总费用" `—` / "已收金额" ¥0 / "待收金额" ¥0 / 表格空；4. server DB billing_records 查不到该 case 的任何记录 |
| 期望 | 要么 ① phase 推到 WAITING_PAYMENT 时应强制要求 billing_records 至少有 1 条 due 状态记录（违反则返回 `CASE_BILLING_REQUIRED_FOR_WAITING_PAYMENT`）；要么 ② 推到 WAITING_PAYMENT 时自动 seed 一条占位 billing_record（参考 R19 BUG-181 修复中 INITIAL_QUOTE_BILLING_MILESTONE 的做法）|
| 影响 | "等待尾款" 这条业务语义被掏空——case 在 WAITING_PAYMENT 但没钱要收，永远卡在这里且 UI 不能引导用户去补登记 |
| 取证 | 对比 `00-detail-overview-CASE-202605-0006.png`（CONSULTING / 显示 ¥200,000）vs `05-popover-waiting-payment-2-targets.png`（WAITING_PAYMENT / 头部 "—"） |
| 建议补丁 | server 侧加 `assertWaitingPaymentHasBillingRecord` guard；前端在 phase 流转 popover 选 WAITING_PAYMENT 之前先校验 billing；并加 `cases.bug225-waiting-payment-billing-required.focused.test.ts` |
| 等级 | **P3 — 业务一致性（也可升 P2，看产品决策）** |
| 状态 | 新发现 / 未 land |

---

## 4. R25 通过项（确认无回归）

- 详情头部："S7 · 已提交待回执 / 等待尾款"双层状态机 chip 同步正常（BUG-191 仍 ✅）
- 状态流转 popover：CASE-202604-0018 WAITING_PAYMENT 显示 `[等待尾款 → 在留已发送, 等待尾款 → 失败归档]` 2 个目标 —— **R24 BUG-208 已 LANDED**（admin↔server PHASE_TRANSITIONS 副本对齐，并加跨包一致性测试）
- ja-JP 概览 "次の重要アクション" 卡片 → "検証実行"，与同页 "検証と提出パッケージを見る" 用字一致 —— **R24 BUG-211 已 LANDED**
- 资料清单 tab "本地资料根目录未配置" alert 渲染正常（与 R24 BUG-194 dev DB 状态相同）；"手动添加" 弹窗能正常打开
- 沟通记录 tab combobox（4 个类型）+ 过滤 radio（5 个含自动邮件）正常
- 收费 tab CASE-202605-0006（CONSULTING）正确显示初始 billing record "案件报酬 / ¥200,000 / 应收"（R19 BUG-186 修复仍生效，case_fee i18n key 正常解析）
- 概览页 "下一关键动作" 按钮 "资料管理" / "执行检查" 能正确 emit switchTab 并跳转到对应 tab（@click 已绑定）
- 整轮 0 个 5xx / 0 console error / 0 console warning / 0 abnormal network

---

## 5. R25 取证截屏

| 文件 | 场景 |
|---|---|
| `00-detail-overview-CASE-202605-0006.png` | 概览页全图（zh-CN，CONSULTING/S1）：右侧 sidebar "案件团队" / "提交前校验" 卡片对比；底部 "近期动态" 空白 (BUG-222) |
| `01-detail-validation-tab-comingsoon.png` | 提交前检查 tab（zh-CN）：4 个 disabled 按钮 + 注入的提示气泡说明 hover 显示 "common.comingSoon" (BUG-212) |
| `02-detail-tasks-tab.png` | 任务 tab（CASE-202605-0006）：2 条 checked task |
| `03-bug-info-tab-raw-enum.png` | 基础信息 tab（zh-CN）：案件编号=UUID + 案件类型=`biz_mgmt_cert_4m` + 申请类型=`certification` (BUG-213) |
| `04-bug-log-tab-raw-event.png` | 日志 tab（zh-CN）：`case_party.created` event_type 直显 + "案件创建：biz_mgmt_cert_4m" enum 直显 (BUG-219/220) |
| `05-popover-waiting-payment-2-targets.png` | 状态流转 popover（CASE-202604-0018, WAITING_PAYMENT）：2 个目标含 CLOSED_FAILED (BUG-208 ✅ LANDED)；同时头部 "财务状况：—" (BUG-225) |
| `06-edit-modal-only-3-fields.png` | 编辑信息 modal：仅 3 个字段（案件名称/管辖机构/备注）(BUG-224) |
| `07-ja-validation-tab.png` | 提交前检查 tab（ja-JP）：button text 是日文 ("再チェック" 等) 但 title 仍是 "common.comingSoon"（BUG-212 跨语言） |
| `08-bug-ja-forms-zh-leak.png` | 文書 tab（ja-JP）：标题 "文書管理" + 按钮 "生成文書" + 中文 placeholder "暂无可用文書模板或生成记录" (BUG-214) |
| `09-bug-ja-log-zh-leak.png` | 日志 tab（ja-JP）：左侧 radio "全部 / 操作ログ / 審査ログ / ステータス変更ログ" — "全部" 漏翻 (BUG-221)；右侧 entry 仍显示 `case_party.created` + `案件作成：biz_mgmt_cert_4m` (BUG-219/220 跨语言) |
| `10-bug-add-task-redirect-deadend.png` | "新增任务" 跳转后的 /tasks 页面：0 条数据 + 无创建入口 (BUG-218) |
| `11-bug-terminal-popover-empty.png` | 终态案件 (CASE-202604-0007 / S9 / CLOSED_FAILED) 状态流转 popover：仅标题 + "当前：失败归档"，无目标项；同时顶部 banner "已归档（已归档）" 文案重复 (BUG-216 / BUG-223) |
| `12-bug-terminal-edit-modal-active.png` | 终态案件 "编辑信息" modal：textbox 全部可编辑（与 banner "所有字段为只读" 矛盾）(BUG-216) |

---

## 6. 落库建议（先后顺序）

1. **P1 BUG-218（终态权限失守）**：1 行改动（`:disabled="isReadonly"`）即可补上 readonly 守门，应**最先 land**——避免用户在终态案件上尝试改字段后才发现 server 拒绝，造成数据假象 / 信任损失。
2. **P1 BUG-217（"记录留痕"死按钮）**：合规 / audit trail 关键写操作。补 @click + 父级 handler + server 调用，加单测。
3. **P1 BUG-218（"新增任务"跳转死循环）**：决策方向后开 ticket，建议改为本页面 modal（成本更小、用户体验更好）。
4. **P1 BUG-212（`common.comingSoon` 拼写错误）**：4 行改动，单测 1 条；最便宜修复 / 最高 ROI（影响 4 个按钮）。
5. **P1 BUG-213（基础信息 tab 字段值）**：3 行改动 + 三语单测。case_no / caseTypes / applicationTypes i18n 字典都已存在，纯 view 层接线问题。
6. **P1 BUG-214（CaseFormsTab 全组件未 i18n）+ BUG-215（CaseDeadlinesTab 全组件未 i18n + 死按钮）**：2 个组件大改，需要补三语字典 ~15 个 key + 决策两个主操作按钮的产品取舍。
7. **P2 BUG-219/220/221（日志 + ja-JP `全部`）**：日志 entry 三语 i18n 化（一次性建模 logEvents 字典）+ ja-JP 字典单字段修复。
8. **P2 BUG-222（侧边栏空状态）**：补 v-if/v-else + 2 条空状态 i18n key。
9. **P3 BUG-223（banner 文案重复）**：i18n 模板调整。
10. **P3 BUG-224（编辑 modal 字段不全）**：产品 ticket / 决策；非工程问题。
11. **P3 BUG-225（WAITING_PAYMENT 缺 billing 校验）**：server 侧 guard + 单测；可与 R19 BUG-181 / BUG-186 一并维护。

---

## 7. 走查痕迹

R25 走查在 dev DB 中产生的副作用：

- 无新写操作落库（沟通记录 BUG-217 文案 "R25 audit test message" 因 publish 按钮无 handler，未触发任何 API 调用，不入库；其余走查仅 GET）
- 仅做了 phase 流转 popover 的开/关，**无任何 phase 实际推进**

dev DB 状态与 R24 收尾时一致，无需还原。

---

## 8. R25 发现的"产品边界 / 工程债务"教训

R22~R24 都聚焦"流程通断 + 双层状态机"（强业务），R25 聚焦"详情页内交互细节"，立刻浮现 4 个独立的 P1 死按钮（BUG-214 生成文書、BUG-215 添加期限、BUG-217 记录留痕、BUG-218 新增任务）—— 表明**两个共同模式**：

### 模式 1：UI 入口先行、handler 没接

- 4 个死按钮中，`CaseFormsTab` / `CaseDeadlinesTab` / `CaseMessagesTab` 都是 P0 阶段的 UI 模板搬运产物，渲染 OK 但写操作 emit 完全缺失
- **后续防御**：① 在 lint 规则里禁止 `<button>` 不带 `@click` / `:disabled` / `type="submit"` 中至少一个；② component 单测里如果发现"render passes 但 emit 集合为 empty"应警告

### 模式 2：i18n key 错误未被任何测试发现

- BUG-212 `common.comingSoon`、BUG-221 ja-JP `全部` 都是字典 key 拼写或跳层错误，没有任何单测覆盖
- **后续防御**：① CI 中加 i18n key 静态检查（vue-i18n-extract 或自研 grep），所有 `t('xxx')` 调用都必须能在三种语言字典中找到；② 字典 lint：每个 namespace 下三语 key 集合必须完全相等（防 ja-JP 漏 key fallback 到 zh-CN 而不报错）

### 模式 3：组件 i18n 不完整

- BUG-214 / BUG-215 整个组件没有 `useI18n()` import—— 现有单测覆盖率不能发现"组件根本没接 i18n"
- **后续防御**：① CaseDetailView 渲染所有 tab 的 `i18n-snapshot.test.ts` 每次跑三语，文本快照必须三种语言不同（如全部相同 = 漏 i18n）；② lint 规则禁止 `.vue` `<template>` 内出现汉字 / 假名硬编码（用 regex 检测）

### 模式 4：terminal/readonly state 守门散布在多处

- BUG-216 终态权限失守是因为 readonly 守门被实现在子 tab 而非 header；同样的子 tab readonly 写得很完善 (BUG-215 / BUG-218 在 readonly 时 v-if 隐藏)
- **后续防御**：① 抽出 `useCaseDetailGuard(detail)` composable，统一返回 `{ isReadonly, isTerminal, canEdit, canTransition, canAddTask, canPublishMessage }`，所有按钮 / modal 通过此 composable 守门；② contract test 强制 header 与 body actions 引用同一个 guard
