# 73 — 案件全流程走查（2026-05-08 第四轮 / chrome-devtools-mcp）

> 日期：2026-05-08（第四轮 / 案件流程回归）
>
> 走查路径：案件列表 → 案件详情各 Tab（概览 / 提交前检查 / 资料清单 / 任务 / 基础信息 / 文书 / 期限 / 沟通记录 / 日志 / 收费）→ 状态流转 Modal → 新建案件向导（4 步）
>
> 登录账号：admin@local.test / Admin123!（Local Demo Office）
>
> 主样本：CASE-202605-0010 / `73f54c49-3793-4aba-999c-e0dcdf76c60b`（R-FLOW-05 山田太郎 / 家族滞在 / 已建档）
>
> 辅助样本：
>
> - CASE-202605-0006 / `5d38aaac-bdaa-483d-9ac3-64f72d9de27f`（R23-AUDIT / 经营管理 / 文书制作中 / 总费用 ¥200,000）— 用于收费 Tab 走查
> - 新建案件向导走到 step 4 复核页（不点「开始办案」，避免污染数据）
>
> 截图目录：`tmp/walkthrough-2026-05-08-v4/`
>
> 上游权威：
>
> - [72-MCP-case-walkthrough-2026-05-08-v3.md](./72-MCP-case-walkthrough-2026-05-08-v3.md)（第三轮，发现 NEW-V3-1/2/3）
> - [70-MCP-walkthrough-2026-05-08-v2.md](./70-MCP-walkthrough-2026-05-08-v2.md)（第二轮全链路）
> - [P0/04-核心流程与状态流转.md §5.1 数据契约口径](../P0/04-核心流程与状态流转.md#51)

---

## 0. 总结

本轮专项走查覆盖案件流程 **17 张截图**（含 zh/ja/en 三语对照 + 4 步新建向导）。

- **NEW-V3-1（P1）→ CLOSED**：提交前检查 info 区块抽出 `GateItem.vue` 子组件后，三语下条目卡片均正确渲染本地化 title + message。
- **NEW-V3-2（P1）→ CLOSED**：基础信息 Tab 关联主体角色三语正确显示「主申请人 / 主申請者 / Primary applicant」，原始 i18n key `cases.detail.info.relatedParties.rolePrimary` 不再泄漏。
- **NEW-V3-3（P2）→ CLOSED**：新建向导 step 2 资料清单预览旁注「依据所选模板自动生成 · 用于预审与提交检查；正式建档后以日文官方名（行政书士标准）登记」，三语全覆盖。
- **回归确认**：71 报告的 4/4 修复 + 72 报告的 3/3 修复全部 PASS。
- **本轮无新发现 P0/P1**；仅 2 项 P2-UX 微小观察（动态合并 + 检查时间精度）。
- **数据陈旧（沿用）**：CASE-DEV-002 类型列仍是「家族滞在」，需 `npm run seed` 后变更为「技人国」。

---

## 1. 上轮（V3）问题回归

> 回归方法：UI 行为复测（chrome-devtools-mcp）+ 三语切换（zh-CN ↔ ja-JP ↔ en-US）+ 单测/契约测试核对

### 1.1 NEW-V3-1 提交前检查 info 区块 i18n — CLOSED

| 项 | 内容 |
|---|------|
| 上轮现象 | info 卡片为空白（不识别 `titleKey` / `noteKey`） |
| 本轮回归 | **PASS（三语）** |
| zh 截图 | `03b-case-validation-after-recheck-zh.png` — 显示「所有文书需定稿 / 所有生成的文书必须为定稿或已导出状态」 |
| ja 截图 | `03c-case-validation-ja.png` — 显示「全文書の確定が必要 / 生成されたすべての文書が確定済みまたはエクスポート済みである必要があります」 |
| en 截图 | `03d-case-validation-en.png` — 显示「All documents must be finalized / All generated documents must be final or exported before submission」 |
| 落地代码 | `packages/admin/src/views/cases/components/GateItem.vue`（新增子组件，blocking / warnings / info 三类共用）<br>`packages/admin/src/views/cases/components/CaseValidationTab.vue` L132/156/178（三处使用 `<GateItemVue>`） |
| 单测 | `CaseValidationTab.info-i18n.test.ts`（12 tests，zh/ja/en × 3 个 i18n + 3 个 legacy 兼容） |
| 备注 | 完全按 V3 §5.1 第 7 条建议落地：「重复出现的 list 渲染分支必须抽组件复用，避免一个分支补 i18n 而其他分支漂移」 |

### 1.2 NEW-V3-2 基础信息 — 关联主体角色 i18n — CLOSED

| 项 | 内容 |
|---|------|
| 上轮现象 | 角色显示原始 i18n key `cases.detail.info.relatedParties.rolePrimary` |
| 本轮回归 | **PASS（三语）** |
| zh 截图 | `06-case-info-zh.png` — 显示「主申请人」 |
| ja 截图 | `06-case-info-ja.png` — 显示「主申請者」 |
| en 截图 | `06-case-info-en.png` — 显示「Primary applicant」 |
| 落地代码 | `packages/admin/src/views/cases/components/CaseInfoTab.vue`（`{{ t(party.role) }}` + `te(...)` 兜底，纯文本 role 透传不翻译）<br>`packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts` 三语补 `detail.info.relatedParties.rolePrimary` |
| 单测 | `CaseInfoTab.role-i18n.test.ts`（8 tests：3 语 i18n key 翻译 + 3 语 raw key 不外泄 + 2 plain text passthrough）<br>`relatedParties-rolePrimary.contract.test.ts`（3 tests：三语 catalog 必须存在该 key） |
| 备注 | 完全按 V3 §5.1 第 8/9 条建议落地：view 强制 `t()` + i18n contract test 兜底缺 key |

### 1.3 NEW-V3-3 新建向导预览 vs 实际清单命名口径 — CLOSED

| 项 | 内容 |
|---|------|
| 上轮现象 | 向导预览简体中文字段名 vs 案件创建后日文官方名落差大，降低信任 |
| 本轮回归 | **PASS（三语）** |
| 截图 | `13b-create-step2.png` — 资料清单预览顶部已增 hint：「依据所选模板自动生成 · 用于预审与提交检查；正式建档后以日文官方名（行政书士标准）登记」 |
| 落地代码 | `packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts` 三语补 `cases.create.step2.documentPreviewHint`<br>`CaseCreateStep2.vue`（`.preview__hint` slot） |
| 单测 | `CaseCreateStep2.documentPreviewHint-i18n.test.ts`（4 tests：三语关键词 + raw key 不外泄） |
| 备注 | 选择了 V3 §1 P2 中第二方案（旁注），未统一命名源；保留日文官方名作为正式建档口径，符合行政书士业务习惯 |

### 1.4 71 报告残留项

| 71 报告项 | V3 结论 | V4 回归 | 备注 |
|-----------|---------|---------|------|
| §2.1 提交前检查阻断条目 i18n | ✅ PASS | **PASS** | 三语阻断 + info 都带本地化 title/message |
| §2.2 客户摘要案件名称 | ✅ PASS | 未复测（本轮聚焦案件） | 沿用 |
| §2.3 客户关联案件 Tab 案件列 | ✅ PASS | 未复测（本轮聚焦案件） | 沿用 |
| §2.4 案件列表「检查」列三语 | ✅ PASS | **PASS** | zh「待检查」/ ja「未検査」/ en 由 contract test 覆盖 |
| §2.5 CASE-DEV-002 类型列 | ⚠️ DATA-STALE | DATA-STALE 持续 | 下次 `npm run seed` 后自动修正 |

---

## 2. 本轮新发现

### 2.1 P0 / P1

**无**。

### 2.2 P2 — 微小 UX 观察（不阻断）

#### NEW-V4-1 案件概览「近期动态」同日同类条目密度过高

| 项 | 内容 |
|---|------|
| 现象 | CASE-202605-0010 概览页「近期动态」5 条全部为「提交前检查未通过」且都是 2026/05/08，仅时间不同 |
| 截图 | `02-case-overview.png` |
| 根因 | 用户多次点「重新检查」（无文书改动），每次都生成一条 validation_runs 记录，UI 直接全量渲染 |
| 建议 | 同日同 event_type 折叠为「× N 次（最早 hh:mm — 最近 hh:mm）」；展开仍可看明细。或者：限制同类事件 24h 内合并 |
| 优先级 | P2（不阻断；纯 UX 信息密度优化） |

#### NEW-V4-2 提交前检查页时间戳缺少时分

| 项 | 内容 |
|---|------|
| 现象 | 提交前检查页 run 头部时间显示「2026/05/08」（仅日期）；但日志 Tab 有完整「2026/05/08 16:46」格式 |
| 截图 | `03a-case-validation-zh.png` / `03b-case-validation-after-recheck-zh.png` |
| 影响 | 用户连续多次重新检查时无法从 UI 区分到底是哪次 run |
| 建议 | 统一使用 `formatDateTime` 而非 `formatDate`，或在同日多 run 场景下额外显示时分 |
| 优先级 | P2（不阻断；与 NEW-V4-1 配合处理更好） |

### 2.3 数据陈旧（不是代码缺陷）

#### CASE-DEV-002 类型列仍是「家族滞在」

| 项 | 内容 |
|---|------|
| 现象 | 案件列表 CASE-DEV-002 行：标题「技人国 — 田中太郎」✓，类型列「家族滞在」⚠️ |
| 状态 | **DATA-STALE**，与 71/72 报告一致 |
| 处置 | 下次 `npm run seed` 后自动修正（seed 代码已改为 `engineer_humanities_intl_visa`） |

---

## 3. 截图索引

| 编号 | 文件 | 内容 | 关联结论 |
|------|------|------|----------|
| 01 | `01-cases-list.png` | 案件列表（zh-CN，30 条 / 我的：18） | 阶段 / 类型 / 检查列 i18n PASS；CASE-DEV-002 stale |
| 02 | `02-case-overview.png` | 案件详情 — 概览 Tab | KPI / 团队 / 提交前校验摘要 PASS；NEW-V4-1（动态密度） |
| 03a | `03a-case-validation-zh.png` | 提交前检查 Tab — 初始 run（zh） | blocking + info 三语 PASS |
| 03b | `03b-case-validation-after-recheck-zh.png` | 提交前检查 Tab — 重新检查后（zh） | **V3-1 PASS** |
| 03c | `03c-case-validation-ja.png` | 提交前检查 Tab — ja-JP | **V3-1 PASS** |
| 03d | `03d-case-validation-en.png` | 提交前检查 Tab — en-US | **V3-1 PASS** |
| 04 | `04-case-documents.png` | 资料清单 Tab | 「前往『系统设置』」链接（P0-1）PASS；日文官方名 |
| 05 | `05-case-tasks.png` | 任务 Tab | 任务列表 i18n PASS |
| 06-zh | `06-case-info-zh.png` | 基础信息 Tab — zh-CN | **V3-2 PASS**：角色「主申请人」 |
| 06-ja | `06-case-info-ja.png` | 基础信息 Tab — ja-JP | **V3-2 PASS**：角色「主申請者」 |
| 06-en | `06-case-info-en.png` | 基础信息 Tab — en-US | **V3-2 PASS**：角色「Primary applicant」 |
| 07 | `07-case-forms.png` | 文书 Tab | 空状态 + 「生成文书」按钮 PASS |
| 08 | `08-case-deadlines.png` | 期限 Tab | 空状态 + 「添加期限」按钮 PASS |
| 09 | `09-case-messages.png` | 沟通记录 Tab | 内部记录 / 客户可见记录 / 电话 / 线下会议 / 自动邮件 多类型 PASS |
| 10 | `10-case-log.png` | 日志 Tab | 操作 / 审核 / 状态变更 三类筛选 PASS；多次 validation 记录 |
| 11 | `11-case-status-flow.png` | 状态流转 Modal | 「咨询中 → 已签约 / 失败归档」选项 i18n PASS |
| 12 | `12-case-billing.png` | 收费 Tab（CASE-202605-0006） | 总费用 ¥200,000 / 已收 ¥0 / 待收 ¥200,000 + 案件报酬行 PASS |
| 13a | `13a-create-step1.png` | 新建案件 step 1（业务信息） | 10 个模板 / 申请类型 / 自动标题 PASS |
| 13b | `13b-create-step2.png` | 新建案件 step 2（关联人 + 资料预览） | **V3-3 PASS**（hint 已落地） |
| 13c | `13c-create-step3.png` | 新建案件 step 3（分派 + 期限） | 负责人 / 截止日期 / 收费金额 PASS |
| 13d | `13d-create-step4.png` | 新建案件 step 4（创建复核） | 复核摘要 PASS；未点开始办案 |

---

## 4. 不在本轮范围

- LEAD / CUSTOMER 全链路（70 报告已覆盖）
- 已签约 / 已提交回执 / 已归档 case 的下游流程（COE 发送、海外贴签、回执登记）
- 多用户协作 / 双人复核（事务所未启用）
- ZIP 导出、风险标签、自动邮件（明确「未上线」）

---

## 5. 待回灌（file-back 候选）

> 与 `AGENTS.md` Karpathy 编译式沉淀闭环对齐。

### 5.1 已落地确认（72 报告 §5.1 → 已生效）

- ✅ **第 7 条**：「`*Tab.vue` 中重复出现的 list 渲染分支必须抽组件复用」 — 通过新增 `GateItem.vue` 落地
- ✅ **第 8 条**：「凡是 adapter 输出 `*Key` 字段的，view 必须强制经 `t(key, params)` 渲染」 — 通过 `CaseInfoTab` `t(party.role)` 落地
- ✅ **第 9 条**：「i18n contract test 必须覆盖 adapter 的所有 *Key 至少在一种语言中存在」 — 通过 `relatedParties-rolePrimary.contract.test.ts` 落地

> 建议把上述 3 条编入 P0/04 §5.1 正式条目（当前位于 72 报告 §5.1 候选区）。

### 5.2 P2-UX 后续优化（非阻断） → CLOSED

- **NEW-V4-1** 案件概览「近期动态」同日同类条目折叠 → CLOSED
- **NEW-V4-2** 提交前检查时间戳精度统一到 `YYYY/MM/DD HH:mm` → CLOSED

两者已合并到同一 PR：聚焦「时间相关 UX 微调」（概览时间线同日同事件折叠 + lastTime 精度统一）。

### 5.3 走查会话引用

- 本轮：[案件全流程 chrome-devtools-mcp 第四轮](current-session)
- 第三轮：[72-MCP-case-walkthrough-2026-05-08-v3.md](./72-MCP-case-walkthrough-2026-05-08-v3.md)
- 第二轮全链路：[70-MCP-walkthrough-2026-05-08-v2.md](./70-MCP-walkthrough-2026-05-08-v2.md)
- 第二轮收尾门禁：[71-R-GUARD-收尾门禁回归-2026-05-08.md](./71-R-GUARD-收尾门禁回归-2026-05-08.md)
