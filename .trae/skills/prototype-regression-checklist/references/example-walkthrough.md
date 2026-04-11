# Example Walkthrough: Billing Module Regression Gate

> Real repo example demonstrating the prototype-regression-checklist skill.
> Gold sample: `packages/prototype/admin/billing/REGRESSION-GATE.md`

---

## Scenario

User request: "为收费模块生成回归验收门槛清单。"

Input artifacts:
- `packages/prototype/admin/billing/P0-CONTRACT.md`
- `docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md`
- `packages/prototype/admin/billing/split-manifest.json`

## Step 1 — Identify risk scenarios from P0-CONTRACT

From P0-CONTRACT §16 (状态与异常态), extract the 6 key states:

| # | State | Risk level | Gate candidate? |
|---|-------|------------|-----------------|
| 1 | 无收费计划 (empty) | High — users see blank page | Yes |
| 2 | 全部结清 (paid) | Medium — disabled states must be correct | Yes |
| 3 | 逾期 (overdue) | High — visual emphasis + collection rules | Yes |
| 4 | 权限不足 | High — security boundary | Yes |
| 5 | 并发修改 | Medium — production constraint | Yes |
| 6 | 返回规则 | Medium — navigation context loss | Yes |

## Step 2 — Design Gates

Apply the design rules from `references/gate-design-guide.md`:

1. **One scenario per Gate** — each Gate focuses on one risk state
2. **Tag each item** — `[原型]`, `[生产约束]`, or `[跨模块]`
3. **Include pass criteria** — what must be true for the Gate to pass
4. **Reference P0-CONTRACT §** — traceability to the source

Result: 6 Gates matching the 6 states above.

## Step 3 — Write verification items

Example from **Gate 3 — 逾期** (14 items):

```markdown
## Gate 3 — 逾期

验收场景：存在收费节点到期日已过且未结清。

| # | 验收项 | 标记 | P0-CONTRACT 引用 |
|---|--------|------|-----------------|
| 3.1 | 逾期行回款状态列展示 tag-red「逾期」 | [原型] | §3.2, §12.2 |
| 3.2 | 逾期行背景使用红色高亮 | [原型] | §3.2 |
| 3.3 | 逾期行下一收款节点列展示"逾期 X 天" | [原型] | §3.2 |
| ...
| 3.12 | [生产约束] 催款任务去重 | [生产约束] | §13.2 |
| 3.13 | [生产约束] 催款任务指派优先级 | [生产约束] | §13.1 |
| 3.14 | [跨模块] 仪表盘包含逾期案件 | [跨模块] | §1.1 |
```

**Key patterns used:**
- Items 3.1–3.11 are `[原型]` — verifiable in the prototype
- Items 3.12–3.13 are `[生产约束]` — documented but deferred to production
- Item 3.14 is `[跨模块]` — requires coordination with dashboard module

## Step 4 — Add verification workflow

```markdown
## 验收流程

### 每轮实现提交前
1. 自检：开发者按 Gate 1–6 逐项确认
2. 回归：至少覆盖当前范围涉及的 Gate 项
3. 标记：通过项标 [x]，未通过必须修复

### Gate 失败处理
- [原型] 项未通过 → 不可合入
- [生产约束] 项 → 可标 [deferred]，但 MIGRATION-MAPPING 须有实现说明
- [跨模块] 项 → 可标 [blocked: 模块名]，待对方就绪后补验
```

## Actual repo outcome

The billing REGRESSION-GATE.md has:
- **6 Gates** covering empty state, paid, overdue, permissions, concurrency, navigation
- **~70 verification items** across all Gates
- **Clear tag system**: `[原型]` / `[生产约束]` / `[跨模块]`
- **Pass criteria** per Gate
- **Traceability** to P0-CONTRACT section numbers

## Comparison with documents module

`packages/prototype/admin/documents/REGRESSION-GATE.md` uses **7 Gates** because it has a unique "shared version linkage" scenario not present in billing. This demonstrates that Gate count varies by module complexity.

| Module | Gate count | Unique Gates |
|--------|-----------|--------------|
| billing | 6 | 并发修改, 返回规则 |
| documents | 7 | 共享版本联动, 资料项状态级联 |

The Gate design is driven by the module's risk profile, not a fixed template.
