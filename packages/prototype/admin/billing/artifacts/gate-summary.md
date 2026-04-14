# Billing 原型门禁摘要

> 生成时间: 2026-04-13
> 门禁状态: **PASSED**
> 原型入口: `packages/prototype/admin/billing/index.html`
> 权威规格: `docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md`

---

## 产物清单

| # | 文件 | 状态 |
|---|------|------|
| 1 | `prototype_structure.json` | ✓ 13 regions, 5 repeat patterns |
| 2 | `component_candidates.json` | ✓ 16 candidates (page + 15 子组件) |
| 3 | `interaction_map.json` | ✓ 27 interactions |
| 4 | `style_contract.json` | ✓ 30 source classes, 7 mapping rules |
| 5 | `ui_patch_plan.json` | ✓ vue target, 18 new files, 5 modify files, 6 states |
| 6 | `validation_report.json` | ✓ passed, 0 blocking, 3 warnings |

---

## P0 范围冻结

### 进入真实 admin 页面的 UI 区块

| # | 区块 | 原型 section | 生产组件 |
|---|------|-------------|---------|
| 1 | 页面标题 + 登记回款 CTA | `page-header.html` | `BillingListHeader` |
| 2 | 4 张统计摘要卡（全局维度） | `summary-cards.html` | `BillingSummaryCards` |
| 3 | 分段视图 + 搜索 + 3 筛选 + 重置 | `filters-toolbar.html` | `BillingListFilters` |
| 4 | 案件收费表格（8 列 + checkbox + 排序） | `billing-table.html` | `BillingTable` |
| 5 | 批量操作栏 | `billing-table.html #bulkActionBar` | `BillingBulkActionBar` |
| 6 | 回款流水表格（8 列 + 作废/冲正） | `payment-log-table.html` | `PaymentLogTable` |
| 7 | 收费计划面板（节点列表 + 空状态 + 已结清） | `billing-plan-panel.html` | `BillingPlanPanel` |
| 8 | 登记回款弹窗（5 字段 + 校验） | `payment-modal.html` | `PaymentModal` |
| 9 | 欠款风险确认面板（只读展示） | `risk-ack-panel.html` | `RiskAckPanel` |
| 10 | 批量催款结果面板 + Toast | `collection-result-toast.html` | `CollectionResultPanel` + `AppToast` |

### 进入真实 admin 页面的状态

| # | 状态 | 说明 |
|---|------|------|
| 1 | loading | 数据加载中 |
| 2 | ready | 正常展示 |
| 3 | empty | 无收费计划，引导配置 |
| 4 | filter_empty | 筛选无结果 |
| 5 | error | 加载失败 |
| 6 | all_settled | 全部结清 |

### P0 明确排除（不得进入真实 admin 页面）

| # | 排除项 | 后置到 |
|---|--------|-------|
| 1 | 发票管理（开票/发票状态） | P1 |
| 2 | 财务报表 | P1 |
| 3 | 自动对账 | P1 |
| 4 | 批量导出收费报表 | P1 |
| 5 | 对客户欠款提醒（门户触达） | P1 |
| 6 | 收费硬阻断模式 `block` | P1 |
| 7 | 按金额范围筛选 | P1 |

### 跨模块边界（本页不落地）

| 边界 | 说明 |
|------|------|
| 案件详情收费 Tab | 收费计划配置/编辑、风险确认操作入口——案件模块职责 |
| Gate-C 欠款风险检查 | 提交前检查 `billing_risk_acknowledged_at`——案件提交流程职责 |
| 仪表盘待回款入口 | `dashboard/index.html` → billing 联动——T08 独立任务 |
| 催款任务写入 | 写入 Task 实体 `source_type=billing`——催款任务模块职责 |
| AuditLog 写入 | 风险确认/回款登记审计事件——审计模块职责，billing 仅调用接口 |

---

## 数据策略

本轮采用 **fixtures-first**：使用本地 fixtures + composables 构建真实页面结构与交互，不接真实 API。后续通过替换 repository 实现切换为真实数据源。

## 关键差异备忘

| 原型行为 | 生产变化 |
|---------|---------|
| 摘要卡金额硬编码 | API 聚合查询或 viewModel 派生 |
| 静态 5 条收费行 / 4 条流水行 | API 动态数据 + 分页 |
| JS DOM 操作切换视图 | Vue reactive state 驱动 |
| data-action / data-filter 事件 | Vue 事件 prop + composable |
| 无权限控制 | 基于角色的 canEdit/canView |
| 分段视图 2 段（无发票管理） | 保持 2 段，P1 不引入第 3 段 |

---

## 后续任务可引用本产物

后续 T02–T09 任务应以本 artifacts 目录为唯一原型结构输入，不再自由解读 HTML。
