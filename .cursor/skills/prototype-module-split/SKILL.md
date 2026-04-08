---
name: prototype-module-split
description: Standardize splitting large prototype modules into sections, scripts, data, shared assets, and migration references for later production implementation. Use when the user asks to annotate a prototype, split an admin/business module, extract script/data/reference boundaries, generate P0-CONTRACT.md, SPLIT-ARCHITECTURE.md, MIGRATION-MAPPING.md, or prepare a prototype module for real code landing.
---

# Prototype Module Split

## Purpose

把单文件或高耦合原型模块拆成一组可持续维护的实现工件，为后续真实代码落地做准备。

默认目标不是“只拆文件”，而是同时产出：

1. 当前原型的边界说明
2. 回归验收基线
3. 原型到生产代码的映射
4. 可复用的 `sections` / `scripts` / `data` 结构
5. 机器可读的拆分清单

## Gold Reference

优先把 `packages/prototype/admin/customers/` 视为金样本。

至少读取这些文件：

- `packages/prototype/admin/customers/P0-CONTRACT.md`
- `packages/prototype/admin/customers/SPLIT-ARCHITECTURE.md`
- `packages/prototype/admin/customers/MIGRATION-MAPPING.md`
- `packages/prototype/admin/customers/split-manifest.json`
- `data/customers-annotated-example.json`

需要更细规则时，再读：

- [reference.md](reference.md)
- [examples.md](examples.md)

## Required Deliverables

除非用户明确要求轻量化输出，否则至少产出：

1. `P0-CONTRACT.md`
2. `SPLIT-ARCHITECTURE.md`
3. `MIGRATION-MAPPING.md`
4. `split-manifest.json`
5. 模块目录下的 `sections/`、`scripts/`、`data/`

如果页面存在可复用壳层或样式，还要补齐共享层拆分建议：

- `shared/styles/*`
- `shared/shell/*`
- `shared/scripts/*`

## Mandatory Workflow

1. 找出模块入口文件、规格文档、相关原型页。
2. 盘点 UI section、声明式配置、行为脚本、共享候选。
3. 明确哪些属于 `shared/`，哪些属于模块页层。
4. 为模块建立 `sections` / `scripts` / `data` 结构。
5. 写 `P0-CONTRACT.md`，固化当前必须保留的交互和字段。
6. 写 `SPLIT-ARCHITECTURE.md`，定义目录、职责、边界和拆分顺序。
7. 写 `MIGRATION-MAPPING.md`，把原型块映射到仓库真实架构。
8. 生成 `split-manifest.json`，把 section、script、data、reference 显式化。
9. 校验 demo-only 能力、非范围项、回归清单是否完整。

## Boundary Rules

- `shared/` 不承载业务概念，不出现“客户”“案件”“线索”等模块词。
- `sections/*.html` 只承载结构分块，不放业务脚本。
- `scripts/*.js` 按能力拆分，一个文件只负责一种行为域。
- `data/*.js` 放声明式配置、静态演示数据、label map、schema，不放 DOM 编排逻辑。
- `reference` 文档负责说明“为什么这样拆”和“未来怎么落地”，不要把这些说明塞进 section 文件。
- 所有 demo-only 行为必须单独标注，不能伪装成生产规格。
- 所有未来生产映射必须遵守仓库分层：`domain -> data -> features/{model,ui} -> shared`。

## Script, Data, Reference Usage

- 用 `scripts/scaffold-split.mjs` 快速创建标准骨架与 `split-manifest.json`。
- 用 `scripts/validate-manifest.mjs` 校验 manifest 是否完整。
- 用 `data/module-split-blueprint.json` 作为通用结构模板。
- 用 `data/customers-annotated-example.json` 作为客户模块标注样例。
- 用 [reference.md](reference.md) 获取拆分判断规则。
- 用 [examples.md](examples.md) 对照客户模块的实际命名和映射方式。

## Output Rules

每次拆分都要显式回答这些问题：

- 原型入口文件是什么
- section 边界如何划分
- 哪些配置应进入 `data/`
- 哪些交互应进入 `scripts/`
- 哪些样式、导航、脚本应提升到 `shared/`
- 哪些能力只是 demo 演示
- 未来生产代码分别落到哪个层级和文件族

`split-manifest.json` 中至少要覆盖：

- `sections`
- `dataFiles`
- `scripts`
- `sharedCandidates`
- `referenceDocs`
- `productionMapping`
- `regressionChecklist`

## Anti-Patterns

- 按行数机械切文件，不按职责拆
- 把 DOM 操作塞进 `data` 文件
- 共享壳层留在页面入口里继续复制
- 只有拆分说明，没有生产映射
- 把 P1/P2 能力偷偷带进 P0 契约
- 直接复用客户模块命名，不替换为当前模块语义

## Completion

完成技能或模块拆分后：

1. 检查新文件命名是否一致
2. 检查 `SKILL.md` 是否仍然简洁
3. 检查 reference 和 data 文件是否能独立支撑后续模块复用
4. 按仓库规则运行 `npm run fix`
5. 再运行 `npm run guard`
