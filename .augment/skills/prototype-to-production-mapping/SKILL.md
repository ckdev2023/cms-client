---
name: prototype-to-production-mapping
description: Map prototype split artifacts to production layers (domain/data/features/shared). Use when creating MIGRATION-MAPPING.md, planning production landing, or designing domain/data/model/ui structure.
---

# Prototype to Production Mapping

## Purpose

把已拆分的原型模块（sections / scripts / data）映射到仓库的四层生产架构。

产出：
1. `MIGRATION-MAPPING.md` — 原型到生产代码的逐层映射文档
2. `split-manifest.json` 中 `productionMapping` 部分的补全或校验

优先级：
1. 类型与接口正确性（domain 层）
2. 仓库接口完备性（domain + data 层）
3. ViewModel 与 UI 的职责划分（features 层）
4. 共享组件的复用判定（shared 层）

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户要求为一个已拆分的原型模块创建 `MIGRATION-MAPPING.md`
- 用户要求把原型的 section/script/data 映射到 domain/data/features/shared 生产架构
- 用户要求设计某模块的生产代码文件结构
- 用户要求补全 `split-manifest.json` 的 `productionMapping` 部分

示例请求：
- 帮我把 billing 原型映射到生产代码架构
- 为 documents 模块写 MIGRATION-MAPPING.md
- 把案件详情页的原型脚本映射到 ViewModel Hook
- 补全 billing 的 split-manifest 里的 productionMapping
- 设计 leads-message 模块的 domain/data/features 文件结构

## Required Inputs

执行前必须读取：

- `packages/prototype/admin/{module}/SPLIT-ARCHITECTURE.md` — 当前模块的拆分目录与职责
- `packages/prototype/admin/{module}/P0-CONTRACT.md` — P0 约束清单
- `packages/prototype/admin/{module}/split-manifest.json` — 机器可读拆分清单
- `packages/prototype/admin/{module}/data/*.js` — 声明式配置（提取类型与常量）
- `packages/prototype/admin/{module}/scripts/*.js` — 行为脚本（推导 ViewModel）
- `AGENTS.md` — 仓库架构边界（来源：仓库门禁）

金样本（必读）：

- `packages/prototype/admin/customers/MIGRATION-MAPPING.md` — 客户模块生产映射（标杆）
- `packages/prototype/admin/customers/split-manifest.json` — 客户模块 manifest（标杆）

需要更多上下文时，再读取：

- `docs/gyoseishoshi_saas_md/P0/06-页面规格/{module}.md` — 页面规格（字段、交互、权限）
- `docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md` — 数据模型（实体与关系）
- `docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md` — 规则与状态机
- `packages/prototype/admin/{module}/sections/*.html` — HTML 区块结构

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. `MIGRATION-MAPPING.md` — 原型到生产代码的完整映射文档
2. `split-manifest.json` 更新 — 补全 `productionMapping` 部分

### MIGRATION-MAPPING.md 必须章节

| # | 章节 | 内容 |
|---|------|------|
| 1 | Domain 层映射 | 实体类型、值类型、仓库接口、常量与配置 |
| 2 | Data 层映射 | API 调用、仓库实现、容器注册 |
| 3 | Features/model 层映射 | ViewModel Hook 总览 + 每个 Hook 的详细函数对照 |
| 4 | Features/ui 层映射 | 页面组件总览 + Props 对照 |
| 5 | Shared 层映射 | 共享 UI 组件、共享 Hook、共享样式 |
| 6 | 完整文件树 | 生产代码目录结构一览 |
| 7 | 迁移顺序建议 | 分阶段依赖链（M1 → M2 → ...） |
| 8 | 原型 → 生产差异备忘 | 原型行为与生产变化对照表 |

### split-manifest.json productionMapping 最小结构

```json
{
  "productionMapping": {
    "domain": ["path/to/domain/Entity.ts", "..."],
    "data": ["path/to/data/Api.ts", "..."],
    "model": ["path/to/features/module/model/useXxxViewModel.ts", "..."],
    "ui": ["path/to/features/module/ui/XxxScreen.tsx", "..."],
    "shared": ["path/to/shared/ui/Component.tsx", "..."]
  }
}
```

## Workflow

1. 读取目标模块的 `SPLIT-ARCHITECTURE.md`、`P0-CONTRACT.md`、`split-manifest.json`。
2. 读取金样本 `customers/MIGRATION-MAPPING.md` 和 `customers/split-manifest.json`。
3. 读取目标模块的 `data/*.js`，提取隐式类型、常量、配置 schema。
4. 读取目标模块的 `scripts/*.js`，推导每个脚本的 ViewModel 职责和函数映射。
5. 读取目标模块的 `sections/*.html`，确认 UI 区块与组件对应关系。
6. 编写 Domain 层映射：
   - 从 `data/*.js` 提取实体类型（export type）
   - 定义仓库接口（Repository type）
   - 梳理常量与配置 schema
7. 编写 Data 层映射：
   - 设计 API 调用函数
   - 设计仓库实现（implements domain interface）
   - 确定 AppContainer 注册项
8. 编写 Features/model 层映射：
   - 对每个原型脚本，编写 `原型函数 → Hook 暴露` 对照表
   - 定义 ViewState 类型（idle / loading / success / error）
9. 编写 Features/ui 层映射：
   - 对每个原型 section，确定组件名和核心 Props
   - 编写 `原型 DOM 钩子 → 组件 Props` 对照表
10. 编写 Shared 层映射：判定哪些组件/Hook/样式升入 shared。
11. 编写完整文件树总览。
12. 编写迁移顺序建议（分阶段 + 前置条件）。
13. 编写原型 → 生产差异备忘。
14. 更新 `split-manifest.json` 的 `productionMapping` 部分。
15. 对照金样本和协议检查：每层映射是否完整，类型代码片段是否给出，迁移顺序是否有环。

## Rules

- Domain 层只放纯 TypeScript：类型、实体、接口、常量。不依赖 UI 框架。（来源：AGENTS.md）
- Data 层实现 domain 接口（`createXxxRepository`）。infra 只提供通用能力。（来源：AGENTS.md）
- Features/model 放 ViewModel Hook（`useXxxViewModel`），Features/ui 放页面组件。
- Feature 不直接引用 `data` / `infra`，通过 AppContainer + domain 协作。（来源：AGENTS.md）
- Feature 不直接引用 `tamagui` / `@tamagui/*`，通过 `shared/ui` 封装。（来源：AGENTS.md）
- Feature 之间不互相依赖，跨 feature 走 `domain` / `shared`。（来源：AGENTS.md）
- `domain` / `data` 不依赖 `shared/ui`。（来源：AGENTS.md）
- 映射文档中的类型代码片段使用 TypeScript，给出 export 签名和必要字段。
- 每个原型脚本至少映射到一个 ViewModel Hook，不允许一对多映射模糊为"同一个 Hook"。
- 共享判定规则：删掉模块名仍然成立 → `shared/`；依赖模块字段/状态机 → 留在模块页层。
- demo-only 行为必须在差异备忘中标注，不混入生产规格。

## Anti-Patterns

- 不读金样本就开写映射 → 命名、结构、粒度全部跑偏，返工成本极高
- 在 domain 层放 React Hook 或 UI 框架依赖 → 违反仓库分层，build 可能通过但 review 必拒
- 把多个原型脚本合并映射到同一个 ViewModel → 职责模糊，后续拆分困难
- 映射文档只列文件名不给类型签名 → 下游开发者无法直接对照实现，沦为目录索引
- 迁移顺序有循环依赖（M3 依赖 M4 且 M4 依赖 M3）→ 无法增量落地
- 把 P1/P2 能力偷偷带进映射 → 违反 P0-CONTRACT 约束

## References

- [mapping-rules.md](references/mapping-rules.md) — 逐层映射判断规则与命名约定
- [layer-schema.json](data/layer-schema.json) — 四层架构目录结构 schema，用于验证映射路径合规性
- `packages/prototype/admin/customers/MIGRATION-MAPPING.md` — 金样本（客户模块映射）
- `packages/prototype/admin/customers/split-manifest.json` — 金样本（客户模块 manifest）
- [example-walkthrough.md](references/example-walkthrough.md) — 客户模块映射逐步演练
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认：

1. MIGRATION-MAPPING.md 包含全部 8 个必须章节
2. Domain 层映射给出了实体类型的 TypeScript 代码片段
3. Domain 层仓库接口给出了方法签名
4. 每个原型脚本都有对应的 ViewModel Hook 映射
5. 每个原型 section 都有对应的 UI 组件映射
6. 共享判定有明确依据
7. 迁移顺序无循环依赖
8. 差异备忘覆盖了所有 demo-only 行为
9. `split-manifest.json` 的 `productionMapping` 已更新且五层（domain/data/model/ui/shared）齐全
10. 映射遵守 AGENTS.md 架构边界
