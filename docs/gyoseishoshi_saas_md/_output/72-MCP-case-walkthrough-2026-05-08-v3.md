# 72 — 案件全流程走查（2026-05-08 第三轮 / chrome-devtools-mcp）

> 日期：2026-05-08（第三轮 / 案件流程专项）
>
> 走查路径：案件列表 → 案件详情各 Tab（概览 / 提交前检查 / 资料清单 / 任务 / 基础信息 / 文书 / 期限 / 收费 / 沟通记录 / 日志）→ 状态流转 → 新建案件向导（4 步）
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
> 截图目录：`tmp/walkthrough-2026-05-08-v3/`
>
> 上游权威：
>
> - [70-MCP-walkthrough-2026-05-08-v2.md](./70-MCP-walkthrough-2026-05-08-v2.md)（第二轮，全链路 LEAD→CUSTOMER→CASE）
> - [71-R-GUARD-收尾门禁回归-2026-05-08.md](./71-R-GUARD-收尾门禁回归-2026-05-08.md)（第二轮 4 个问题点的代码层回归）
> - [P0/04-核心流程与状态流转.md §5.1 数据契约口径](../P0/04-核心流程与状态流转.md#51)

---

## 0. 总结

本轮专项走查覆盖案件流程 13 张截图（含 3 语对照 + 4 步向导）。

- **P0-2 真正修复确认**：第二轮记录的「提交前检查只见摘要无明细」在重新执行检查后已显示具体阻断条目（带 i18n title + message）。三语（zh-CN / ja-JP / en-US）均通过。
- **新增 P1 × 2**：均与提交前检查 / 基础信息 Tab 的 i18n 收尾遗漏有关，建议合并修复。
- **新增 P2 × 1**：新建向导预览的资料项与实际生成的资料清单字段名命名不一致。
- **回归确认**：71 报告的 4/4 修复全部 PASS（含三语切换）。
- **数据陈旧**：CASE-DEV-002 类型列仍是「家族滞在」，需 `npm run seed` 后才会变更为「技人国」。

---

## 1. 新发现问题

### P1 — i18n 收尾遗漏

#### NEW-V3-1 提交前检查 — info 区块条目标题/正文未走 i18n

| 项 | 内容 |
|---|------|
| 现象 | 案件 CASE-202605-0010「提交前检查」Tab 在执行「重新检查」后，section 标头「补充说明 / 仅提示」（zh）、「補足 / 参考のみ」（ja）、「Additional info / FYI」（en）正确显示；但下方 info 条目卡片为**空白**（标题/正文均未渲染） |
| 截图 | `03b-case-validation-after-recheck.png` / `03c-case-validation-ja.png` / `03d-case-validation-en.png` |
| 实际数据 | `GET /api/validation-runs?caseId=…` 最新一条 `report_payload.info = [{ code: "generated_documents_finalized", titleKey, messageKey, passed: true, … }]`，**仅含 `titleKey`/`messageKey`**，无 `title`/`message` 字符串字段 |
| 关键文件 | `packages/admin/src/views/cases/components/CaseValidationTab.vue` L225-234（info 区块渲染分支） |
| 代码片段 | 当前实现：<br>`<div class="vt__item-title">{{ item.title }}</div>`<br>`<div v-if="item.note" class="vt__item-desc">{{ item.note }}</div>`<br>**不识别 `titleKey` / `noteKey`**，与 blocking（L131-154）/warnings（L196-212）不一致 |
| 根因 | A2 修复批次只覆盖了 blocking + warnings 走 `t(item.titleKey, item.titleParams ?? {})` 兜底；info 分支未同步迁移 |
| 修复方案 | 把 info 分支也改为：<br>`{{ item.titleKey ? t(item.titleKey, item.titleParams ?? {}) : item.title }}`<br>`{{ item.noteKey ? t(item.noteKey, item.noteParams ?? {}) : item.note }}`<br>建议直接抽 `<GateItem>` 子组件，三个分支共用渲染逻辑，杜绝再次漂移 |
| 修复模块 | `cases/components` — `CaseValidationTab.vue` |
| 优先级 | **P1**（用户看到空白卡片，体感强；但不阻断主流程） |

#### NEW-V3-2 基础信息 — 关联主体 角色显示原始 i18n key

| 项 | 内容 |
|---|------|
| 现象 | CASE-202605-0010「基础信息」Tab — 关联主体侧栏显示「R-FLOW-05 山田太郎」名字下方的「角色」位置渲染为原始 i18n key：`cases.detail.info.relatedParties.rolePrimary` |
| 截图 | `06-case-info.png` |
| 关键文件 | `packages/admin/src/views/cases/components/CaseInfoTab.vue` L228（直接 `{{ party.role }}`，未做 `t()`）；<br>`packages/admin/src/views/cases/model/CaseAdapterRelatedParties.ts` L4（adapter 把 i18n key 写入 `role`）；<br>`packages/admin/src/i18n/messages/cases/{zh-CN,ja-JP,en-US}.ts`（**`relatedParties.rolePrimary` 不在三语 messages 任一文件**） |
| 根因 | 双重缺失：<br>1) View 模板未 `t()` 包装；<br>2) i18n catalog 没定义该 key |
| 修复方案 | 1) `CaseInfoTab.vue` L228 改为 `{{ t(party.role) }}`；<br>2) 三语 messages 的 `cases.detail.info.relatedParties` 节点下补 `rolePrimary` key（zh: 主申请人 / ja: 主申請者 / en: Primary applicant）；<br>3) 建议补 `CaseInfoTab.bug-rolePrimary.test.ts` + i18n contract test，对齐 §5.1 第 3 条「前端状态键必须经 i18n 转换层」 |
| 修复模块 | `cases/components` + `i18n/messages/cases` + 单测 |
| 优先级 | **P1**（i18n key 直接外泄给用户，体感强） |

---

### P2 — UX / 数据一致性

#### NEW-V3-3 新建向导预览资料字段与实际生成的资料清单命名不一致

| 项 | 内容 |
|---|------|
| 现象 | 新建案件向导 step 2「资料清单预览」展示简体中文字段名（如「护照首页」「证件照」「在留卡」「课税/纳税证明」），但实际创建后案件「资料清单」Tab 显示的是日文官方名（如「扶養者の納税証明書」「在留カードコピー」） |
| 截图 | `09b-case-create-step2.png`（向导预览） vs. `04-case-documents.png`（实际清单） |
| 关键文件 | 推测：向导走 `documentBlueprint`（含简化 zh 描述）；案件创建后走 `caseTemplateBlueprints/family-stay.ts`（含日文官方名） |
| 影响 | 用户在向导预览看到的"承诺"与开案后看到的实际清单字面差异较大（虽然语义对应），降低对功能的信任 |
| 修复方案 | 统一两侧的命名来源，或在向导预览侧旁注「实际生成时使用日文官方名（行政书士标准）」 |
| 优先级 | P2（不阻断流程，但建议在 P1 收尾后处理） |

---

### 数据陈旧（不是代码缺陷）

#### CASE-DEV-002 类型列仍是「家族滞在」

| 项 | 内容 |
|---|------|
| 现象 | 案件列表 CASE-DEV-002 行：标题「技人国 — 田中太郎」✓，类型列「家族滞在」⚠️ |
| 状态 | **DATA-STALE**，与 71 报告 §2.5 一致 |
| 处置 | 下次 `npm run seed` 后自动修正（seed 代码已改为 `engineer_humanities_intl_visa`，i18n 三语映射已就位） |

---

## 2. 截图索引

| 编号 | 文件 | 内容 | 关联结论 |
|------|------|------|----------|
| 01 | `01-cases-list.png` | 案件列表（zh-CN，30 条） | 阶段 / 类型 / 检查列 i18n PASS；CASE-DEV-002 stale |
| 02 | `02-case-overview.png` | 案件详情 — 概览 Tab | 关联客户卡 / KPI / 团队 / 提交前校验摘要 PASS |
| 03a | `03a-case-validation-before.png` | 提交前检查 Tab — 旧 run（fallback 摘要） | 旧数据走摘要路径 |
| 03b | `03b-case-validation-after-recheck.png` | 提交前检查 Tab — 重新检查后（zh） | **P0-2 真正修复**：blocking 项含本地化 title + message |
| 03c | `03c-case-validation-ja.png` | 提交前检查 Tab — ja-JP | 三语回归 PASS；NEW-V3-1 暴露：info 卡片空白 |
| 03d | `03d-case-validation-en.png` | 提交前检查 Tab — en-US | 同上；info 卡片空白 |
| 04 | `04-case-documents.png` | 资料清单 Tab | 「前往『系统设置』」链接（P0-1）PASS；日文官方名 |
| 05 | `05-case-tasks.png` | 任务 Tab | 任务列表 i18n PASS |
| 06 | `06-case-info.png` | 基础信息 Tab | **NEW-V3-2** 关联主体角色显示 raw i18n key |
| 07 | `07-case-status-flow.png` | 状态流转 Modal | 「咨询中 → 已签约 / 失败归档」选项 i18n PASS |
| 08 | `08-case-billing.png` | 收费 Tab（CASE-202605-0006，¥200,000） | 总费用 / 已收 / 待收金额 + 案件报酬 行 PASS |
| 09a | `09a-case-create-step1.png` | 新建案件 step 1（业务信息） | 模板列表 / 申请类型 / 自动生成案件标题 PASS |
| 09b | `09b-case-create-step2.png` | 新建案件 step 2（关联人 + 资料预览） | 客户选择 + 预览；**NEW-V3-3** 命名不一致 |
| 09c | `09c-case-create-step3.png` | 新建案件 step 3（分派 + 期限） | 负责人 / 截止日期 / 收费金额 i18n PASS |
| 09d | `09d-case-create-step4.png` | 新建案件 step 4（创建复核） | 复核摘要 PASS；未点开始办案以避免数据污染 |

---

## 3. 71 报告修复回归确认

> 回归方法：UI 行为复测（chrome-devtools-mcp）+ API 响应抽查 + 三语切换

| 71 报告项 | 上轮结论 | 本轮回归 | 备注 |
|-----------|----------|----------|------|
| §2.1 提交前检查阻断条目 i18n | ✅ PASS（旧 run 走 fallback） | **PASS（真正落地）** | 重新检查后阻断条目带本地化 title + message；三语全通 |
| §2.2 客户摘要案件名称 | ✅ PASS | 未复测（本轮聚焦案件） | 沿用上轮 |
| §2.3 客户关联案件 Tab 案件列 | ✅ PASS | 未复测（本轮聚焦案件） | 沿用上轮 |
| §2.4 案件列表「检查」列三语 i18n | ✅ PASS | **PASS** | zh「待检查」/ ja「未検査」均确认；en 由 contract test 覆盖 |
| §2.5 CASE-DEV-002 类型列 | ⚠️ DATA-STALE | DATA-STALE 持续 | 下次 seed 后自动修正 |

---

## 4. 不在本轮范围

- LEAD / CUSTOMER 全链路（70 报告已覆盖）
- 已签约 / 已提交回执 / 已归档 case 的下游流程（COE 发送、海外贴签、回执登记）
- 多用户协作 / 双人复核（事务所未启用）
- ZIP 导出、风险标签、自动邮件（明确「未上线」）

---

## 5. 待回灌（file-back 候选）

> 与 `AGENTS.md` Karpathy 编译式沉淀闭环对齐。

### 5.1 可入库口径（待回灌至 P0/04 §5.1）

- **第 7 条（建议追加）**：「`*Tab.vue` 中重复出现的 list 渲染分支（blocking / warnings / info）必须抽组件复用，避免一个分支补 i18n 而其他分支漂移。」 — 来源 NEW-V3-1
- **第 8 条（建议追加）**：「凡是 adapter 输出 `*Key`（i18n key）字段的，view 必须强制经 `t(key, params)` 渲染；不得直接 `{{ key }}`。建议加 lint：disallow `{{ \w+(\.\w+)+ }}` 直渲（启发式）。」 — 来源 NEW-V3-2
- **第 9 条（建议追加）**：「i18n contract test 必须覆盖『adapter 的所有 *Key 都对应至少一种语言中存在的 message key』，避免 catalog 缺 key。」 — 来源 NEW-V3-2

### 5.2 后续修复优先级建议

- **P1 批量**：NEW-V3-1（CaseValidationTab info 分支补 i18n）+ NEW-V3-2（CaseInfoTab role 补 t() + catalog 补 key）。两者均小改动，建议合并到一个 PR：
  - `CaseValidationTab.vue`：info 分支用 `titleKey/noteKey`；可顺手抽 `GateItem.vue` 子组件
  - `CaseInfoTab.vue` L228：`{{ t(party.role) }}`
  - 三语 messages：`cases.detail.info.relatedParties.rolePrimary` 补 zh/ja/en
  - 单测：`CaseValidationTab.info-i18n.test.ts` + `CaseInfoTab.role-i18n.test.ts`
- **P2**：NEW-V3-3（向导预览 vs 实际清单命名一致性）— 在 P1 收尾后再统一处理

### 5.3 走查会话引用

- 本轮专项走查会话：[案件全流程 chrome-devtools-mcp 第三轮](current-session)
- 第二轮全链路：[70-MCP-walkthrough-2026-05-08-v2.md](./70-MCP-walkthrough-2026-05-08-v2.md)
- 第二轮收尾门禁：[71-R-GUARD-收尾门禁回归-2026-05-08.md](./71-R-GUARD-收尾门禁回归-2026-05-08.md)
