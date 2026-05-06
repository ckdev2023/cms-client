# ADR: Admin Convert 拆两步、Portal Convert 暂保留一步

> **状态**：已决策
> **日期**：2026-05-06
> **决策者**：研发团队
> **触发源**：R-CONSULT-01 走查 B-1' 缺陷 + [06-页面规格/咨询线索.md §4](../P0/06-页面规格/咨询线索.md)

---

## 背景

规格 §4 明确将"转客户"与"转案件"定义为两个独立动作（各有独立权限、前置条件与结果）：

| 动作 | 触发条件 | 结果 | 权限 |
|------|---------|------|------|
| 转客户 | 已签约或需正式建档 | 创建 Customer，默认继承 Lead.group | 主办人、助理 |
| 转案件 | 已签约且信息足够 | 创建 Case，回填 converted_case_id | 主办人、助理 |

但 portal 端（`portal/leads/leads.controller.ts @Post(":id/convert")`）实现为**一步合并**：在单次请求中同时创建 Customer + Case，状态直接跳到 `converted_case`。

admin 端走查时发现 server 完全缺少 convert 端点（B-1' 404）。在补齐时需决定：沿用 portal 一步模式，还是拆为两步对齐规格。

---

## 决策

**Admin 端拆为两步**：

1. `POST /admin/leads/:id/convert-customer` — 创建 Customer + 回填 `converted_customer_id`（状态不变）
2. `POST /admin/leads/:id/convert-case` — 前置要求 `converted_customer_id` 已存在；创建 Case + 回填 `converted_case_id` + 状态 → `converted_case`

**Portal 端暂保留一步**：

- `POST /portal/leads/:id/convert` — 现有逻辑不动，一次性完成 Customer + Case 创建
- 客户端已在生产使用中，拆分需协调 portal 前端 + 移动端发版，风险/收益比不合适在本次修复中处理

---

## 取舍分析

| 维度 | Admin 拆两步 | Portal 一步 |
|------|-------------|-------------|
| 对齐规格 | ✅ 完全对齐 §4 两个独立动作 | ⚠️ 偏离规格，但功能等价 |
| 前置校验 | ✅ 每步独立校验，错误定位精确 | 混合校验，单点失败无法部分回滚 |
| 灵活性 | ✅ 支持"先转客户、再决定是否建案"场景 | 强制一步到底 |
| 去重处理 | ✅ convert-customer 可独立做 dedup 预检 + 409 | dedup 与 case 创建耦合 |
| BMV 路径 | ✅ convert-case 内按 caseTypeCode 分支初始化 bmvProfile | 同上但混在一个事务内 |
| 改动范围 | 中（新增两端点 + 前端两 dialog） | 无（保持现状） |
| 兼容风险 | 低（admin 全新端点，不影响 portal） | 无 |

---

## 前置条件与状态约束

```
convert-customer 前置：
  - lead.status ∈ {following, pending_sign, signed}
  - lead.converted_customer_id IS NULL

convert-case 前置：
  - lead.converted_customer_id IS NOT NULL（必须先完成 convert-customer）
  - lead.status ≠ "converted_case"（幂等 guard）
```

---

## 迁移路径与统一时间窗口

### 短期（本次修复）

- Admin：实现拆两步端点，前端对应两个 dialog
- Portal：不动，保持 `@Post(":id/convert")` 兼容

### 中期（P1 统一 ticket）

- Portal 前端拆分 convert 为两步 UI（对齐 admin 体验）
- Portal API 新增 `convert-customer` / `convert-case` 端点，标记旧 `convert` 为 deprecated
- 协调移动端发版切换到新端点

### 长期（P2 清理）

- 移除 `portal/leads @Post(":id/convert")` deprecated 端点
- 共享 `LeadsConvertService` 层统一 admin / portal 两端的 convert 逻辑

---

## 遗留项

| 遗留项 | 计划 | Ticket |
|--------|------|--------|
| RBAC 细化：转客户/转案件限定"主办人、助理"（排除销售） | P1 独立 ticket | 待建 |
| Portal convert 拆两步 | P1 统一 ticket | 待建 |
| Customer 搜索 select（convert-customer dialog 中 customerId 选择） | P1 独立 ticket | 待建 |

---

## 引用

- [06-页面规格/咨询线索.md §4](../P0/06-页面规格/咨询线索.md)
- [04-核心流程与状态流转.md §4.1 咨询转案件](../P0/04-核心流程与状态流转.md)
- [56-咨询模块chrome-devtools-mcp走查-第一轮.md](./56-咨询模块chrome-devtools-mcp走查-第一轮.md)
- [consult-module-fix-plan §1.2](../../.cursor/plans/consult-module-fix-plan_c28504ae.plan.md)（server convert 拆两步实施细节）
- portal 现有实现：`packages/server/src/modules/portal/leads/leads.controller.ts @Post(":id/convert")`
