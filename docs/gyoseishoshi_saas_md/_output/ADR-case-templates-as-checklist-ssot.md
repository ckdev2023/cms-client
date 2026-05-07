# ADR: `case_templates` 替代 `template_versions` 作为资料清单真源

> **状态**：已决策
> **日期**：2026-05-07
> **决策者**：研发团队
> **触发源**：R-FLOW-01 走查 R-FLOW-E-1 缺陷 + [62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md](./62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md)

---

## 背景

P0 §1.2 明确首版必须支持的签证类型包括**家族滞在**与**技术·人文知识·国际业务（技人国）**。然而建案时 `resolveChecklistItems` 仅通过 `TemplatesService.resolve(kind, key)` 读取 `template_versions` / `template_releases` 表。dev seed 仅写入了 `kind=document_checklist / key=business_manager_visa`（经营管理签证），导致非 BMV 案件的 `document_items` 始终为空。

migration `023_case_templates.up.sql` 已创建 `case_templates` 表，其 `requirement_blueprint` JSONB 列天然支持按签证类型存储结构化资料蓝图，但一直未被建案流程消费。

---

## 决策

**`case_templates.requirement_blueprint` 设为建案资料清单的唯一真源（Single Source of Truth）**。

1. 建案流程首先查 `case_templates`（按 `case_type` + `active_flag = true`）。
2. 命中 → 将 `requirement_blueprint.items[]` 映射为 `ChecklistItem[]` 展开进 `document_items`。
3. 未命中 → 回退现有 `TemplatesService.resolve` 路径（保留 BMV 旧数据兼容）。
4. 都未命中 → 返回 `[]`，日志 warn `templateMissing`，前端渲染模板缺失提示。

---

## `requirement_blueprint` 数据契约

```ts
type CaseTemplateRequirementBlueprint = {
  version: 1;
  items: Array<{
    code: string;
    name: string;
    ownerSide: "applicant" | "supporter" | "office";
    category?: string;
    requiredFlag: boolean;
    providedByRole?: "applicant" | "supporter" | "office" | "shared";
  }>;
};
```

`version` 字段预留 schema 演进空间；当前 parser 仅理解 `version: 1`。

---

## 取舍分析

| 维度 | `case_templates`（新路径） | `template_versions`（旧路径） |
|------|---------------------------|-------------------------------|
| 多签证类型支持 | ✅ 按 `case_type` 一一对应，天然多签证 | ⚠️ 需逐条手写 `kind + key` 组合，scale 差 |
| 数据可审计 | ✅ JSONB + `active_flag` + `created_at` 完整审计链 | ⚠️ `template_releases` 无 `active_flag`，需 version diff |
| schema 就绪 | ✅ migration 023 已上线 | ✅ 已在使用 |
| 种子维护成本 | 中（需维护蓝图 fixture 文件） | 中（需维护 release 内容） |
| BMV 兼容 | ✅ 回退路径保留，不破坏 | ✅ 现状 |
| P0 阻断修复 | ✅ 直接解锁 family-stay / work | ❌ 需额外为每种签证写 `template_versions` 行 |

---

## 实施要点

### 后端

- 新增 `packages/server/src/modules/core/cases/cases.template.repository.ts`：
  - `findActiveCaseTemplateByCaseType(pool, ctx, caseTypeCode, applicationType?)`
  - 返回 `{ found: true, items: ChecklistItem[] } | { found: false }`
- `cases.service.create-flow.ts` 重写 `resolveChecklistItems`：新路径优先 → 旧路径回退 → 空数组 + warn
- 新增 `packages/server/src/scripts/seedCaseTemplates.ts`：插入 family-stay + work 两条模板种子

### 前端

- `CaseDocumentsTab` 引入 `viewState`（`templateMissing | storageGateBlocked | empty | ready`）取代并列 alert
- 模板缺失时展示专用提示文案，不再同时渲染空态和目录未配置 alert

---

## BMV 兼容性窗口

| 阶段 | 时间窗口 | 动作 |
|------|----------|------|
| 当前（PR2） | 立即 | BMV 仍走 `TemplatesService.resolve` 旧路径，`case_templates` 不含 BMV 行 |
| 下一迭代 | PR2 合并后 1–2 sprint | 为 BMV 写入 `case_templates` 行（`case_type = "business_manager"`），验证等价后切换 |
| 清理 | BMV 切换验证通过后 | 删除 `template_versions` 中 `kind=document_checklist / key=business_manager_visa` 行；`TemplatesService.resolve` 保留但标记 deprecated |

期间 `TemplatesService.resolve` 不删除、不重构，仅作为 BMV 独占回退路径。

---

## 测试守门

- `cases.template.repository.test.ts`：命中 / 未命中 / `active_flag=false` 排除
- `cases.service.create-flow.case-templates.focused.test.ts`：work 蓝图 → N 项 document_items 展开
- 现有 BMV 测试保留不变：验证 `template_versions` 回退路径
- 前端 `useCaseDocumentsTab.viewState.test.ts`：四态派生覆盖

---

## 遗留项

| 遗留项 | 计划 | Ticket |
|--------|------|--------|
| BMV 迁移到 `case_templates` | 下一迭代独立 PR | 待建 |
| 清理 `template_versions` 中 BMV document_checklist 行 | BMV 迁移验证后 | 待建 |
| `default_tasks_blueprint` / `reminder_schedule_blueprint` 消费 | P1 | 待建 |

---

## 引用

- [62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md §R-FLOW-E-1](./62-咨询客户案件全链路chrome-devtools-mcp走查-第一轮.md)
- [P0/04-核心流程与状态流转.md §4.2 资料收集与审核](../P0/04-核心流程与状态流转.md#42-资料收集与审核)
- [P0/06-页面规格/案件.md](../P0/06-页面规格/案件.md)
- migration: `packages/server/src/infra/db/migrations/023_case_templates.up.sql`
- 修复计划: `.cursor/plans/咨询客户案件全链路-第一轮修复_091853f3.plan.md` PR2
