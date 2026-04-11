# Example Walkthrough: Billing Module Split Orchestration

> Real repo example showing how the cursor-task-orchestrator skill produces execution plans.
> Module: `packages/prototype/admin/billing/`

---

## Scenario

User request: "把 billing 模块原型拆分为 sections/scripts/data 结构，并生成 P0-CONTRACT、SPLIT-ARCHITECTURE、MIGRATION-MAPPING、REGRESSION-GATE。"

## Step 1 — Filled manifest.json (excerpt)

Based on `references/manifest-template.json`, the orchestrator produces:

```json
{
  "planId": "billing-module-split-2026-04",
  "goal": "将 billing.html 单文件原型拆分为模块化结构",
  "repo": "cms-client",
  "guardrail": "npm run fix && npm run guard",
  "tasks": [
    {
      "id": "T01",
      "title": "盘点 billing.html 现有内容",
      "assignee": "agent-1",
      "dependsOn": [],
      "allowedPaths": ["packages/prototype/admin/billing/INVENTORY.md"],
      "forbiddenPaths": ["packages/prototype/admin/customers/"],
      "resultArtifact": "packages/prototype/admin/billing/INVENTORY.md"
    },
    {
      "id": "T02",
      "title": "抽取共享样式到 shared/",
      "assignee": "agent-2",
      "dependsOn": ["T01"],
      "allowedPaths": [
        "packages/prototype/admin/shared/styles/",
        "packages/prototype/admin/billing/"
      ],
      "forbiddenPaths": ["packages/prototype/admin/customers/scripts/"]
    },
    {
      "id": "T03",
      "title": "拆分 billing 页面区块和脚本",
      "assignee": "agent-1",
      "dependsOn": ["T02"],
      "allowedPaths": ["packages/prototype/admin/billing/"],
      "forbiddenPaths": []
    },
    {
      "id": "T04",
      "title": "生成 P0-CONTRACT + SPLIT-ARCHITECTURE",
      "assignee": "agent-2",
      "dependsOn": ["T03"],
      "allowedPaths": ["packages/prototype/admin/billing/"],
      "forbiddenPaths": [],
      "resultArtifact": "packages/prototype/admin/billing/P0-CONTRACT.md"
    },
    {
      "id": "T05",
      "title": "生成 MIGRATION-MAPPING + split-manifest.json",
      "assignee": "agent-1",
      "dependsOn": ["T04"],
      "allowedPaths": ["packages/prototype/admin/billing/"],
      "forbiddenPaths": []
    },
    {
      "id": "T06",
      "title": "生成 REGRESSION-GATE",
      "assignee": "agent-2",
      "dependsOn": ["T04"],
      "allowedPaths": ["packages/prototype/admin/billing/"],
      "forbiddenPaths": []
    },
    {
      "id": "T07",
      "title": "最终回归与门禁",
      "assignee": "agent-1",
      "dependsOn": ["T05", "T06"],
      "allowedPaths": ["packages/prototype/admin/billing/"],
      "forbiddenPaths": []
    }
  ],
  "parallelGroups": [
    { "group": "inventory", "tasks": ["T01"] },
    { "group": "shared-extract", "tasks": ["T02"] },
    { "group": "split-core", "tasks": ["T03", "T04"] },
    { "group": "mapping-gate", "tasks": ["T05", "T06"] },
    { "group": "final", "tasks": ["T07"] }
  ]
}
```

## Step 2 — Task doc example (T04)

Based on `references/task-template.md`:

```markdown
# T04 — 生成 P0-CONTRACT + SPLIT-ARCHITECTURE

## Goal
为 billing 模块生成 P0 约束清单和拆分架构说明。

## Context
- 金样本: `packages/prototype/admin/customers/P0-CONTRACT.md`
- 金样本: `packages/prototype/admin/customers/SPLIT-ARCHITECTURE.md`
- 规格: `docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md`
- 依赖: T03 已完成 sections/scripts/data 拆分

## Must Read Before Starting
1. `packages/prototype/admin/customers/P0-CONTRACT.md` — 格式和粒度标杆
2. `packages/prototype/admin/billing/INVENTORY.md` — T01 产出的盘点报告
3. `docs/gyoseishoshi_saas_md/P0/06-页面规格/收费与财务.md` — 规格基线

## Allowed Paths
- `packages/prototype/admin/billing/`

## Forbidden Paths
- `packages/prototype/admin/customers/scripts/` (只读参考，不可修改)

## Deliverables
1. `packages/prototype/admin/billing/P0-CONTRACT.md`
2. `packages/prototype/admin/billing/SPLIT-ARCHITECTURE.md`

## Acceptance Criteria
- P0-CONTRACT 覆盖页面规格所有必保留字段和交互
- SPLIT-ARCHITECTURE 目录树与实际文件一致
- 两份文档互相交叉引用正确

## Guardrail
npm run fix && npm run guard
```

## Step 3 — Dependency graph

```
T01 ──→ T02 ──→ T03 ──→ T04 ──→ T05
                              └──→ T06
                                    │
                         T05 + T06 ──→ T07
```

T05 和 T06 可并行（属于 `mapping-gate` 组）。

## Actual repo outcome

Billing module split was executed and produced the following files (all present in repo):

```
packages/prototype/admin/billing/
├── index.html
├── P0-CONTRACT.md          ← T04 产出
├── SPLIT-ARCHITECTURE.md   ← T04 产出
├── MIGRATION-MAPPING.md    ← T05 产出
├── REGRESSION-GATE.md      ← T06 产出
├── INVENTORY.md            ← T01 产出
├── split-manifest.json     ← T05 产出
├── sections/               ← T03 产出
│   ├── billing-plan-panel.html
│   ├── billing-table.html
│   ├── collection-result-toast.html
│   ├── filters-toolbar.html
│   ├── page-header.html
│   ├── payment-log-table.html
│   ├── payment-modal.html
│   ├── risk-ack-panel.html
│   └── summary-cards.html
├── scripts/                ← T03 产出
│   ├── billing-page.js
│   ├── billing-filters.js
│   ├── billing-bulk-actions.js
│   ├── billing-payment-modal.js
│   └── billing-risk-log.js
└── data/                   ← T03 产出
    ├── billing-config.js
    └── billing-demo-data.js
```
