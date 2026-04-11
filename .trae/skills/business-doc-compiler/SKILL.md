---
name: business-doc-compiler
description: Compile raw materials, meeting notes, and analysis conclusions into authoritative docs. Use when ingesting inbox, compiling to authoritative docs, filing back outputs, or running weekly doc lint.
---

# Business Doc Compiler

## Purpose

把碎片信息（会议纪要、讨论结论、流程文档、需求变更）编译进仓库的权威文档体系，保持"原始材料只追加、权威文档可引用可审阅可维护"的分层。

产出（按意图路由）：
1. **Ingest** — 格式化的 inbox 条目追加到 `_raw/00-inbox.md`
2. **Compile** — 权威文档的结构化增量（按模板 A/B/C 写入目标文档）
3. **File-back** — 可复用结论追加到 `_output/00-outputs.md`，附回灌计划
4. **Lint** — 矛盾/过期/缺口三张可执行清单

优先级：
1. 内容归属正确（变更定位规则）
2. 权威文档不双写
3. 术语与编号一致
4. 格式遵守文档模板

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- 用户提供会议纪要、讨论结论、需求变更等碎片信息，要求归入文档体系
- 用户要求把 inbox 条目编译进权威文档
- 用户要求把分析/问答结论记录为可回灌产出
- 用户要求做周度文档 lint（矛盾/过期/缺口扫描）
- 用户要求新增或修改权威文档内容

意图路由：
1. 用户给出原始素材 → **Ingest** 分支
2. 用户要求编译 inbox 条目 → **Compile** 分支
3. 用户要求归档分析结论 → **File-back** 分支
4. 用户要求检查文档健康度 → **Lint** 分支
5. 用户直接指定修改某权威文档 → **Compile** 分支（跳过 ingest）

示例请求：
- 把这段会议纪要录入知识库
- 把 inbox 里关于收费规则的条目编译进 03-业务规则
- 把刚才的分析结论存入 outputs
- 做一次文档 lint，看有没有矛盾或缺口
- 在页面规格里新增资料中心的详情页说明

## Required Inputs

执行前必须读取：

- `docs/gyoseishoshi_saas_md/README.md` — 文档导航中心与变更定位规则
- `docs/gyoseishoshi_saas_md/99-文档维护与版本记录.md` — 编译式工作流、文档模板、编号规则、固定检查表
- `docs/gyoseishoshi_saas_md/_raw/00-inbox.md` — 当前 inbox 内容（判断是否已存在）
- `docs/gyoseishoshi_saas_md/_output/00-outputs.md` — 当前 outputs 内容（判断是否已存在）

需要更多上下文时，再读取：

- `docs/gyoseishoshi_saas_md/P0/README.md` — P0 治理规则（判断内容是否属于首版范围）
- `docs/gyoseishoshi_saas_md/08-术语表.md` — 术语一致性检查
- `docs/gyoseishoshi_saas_md/P0/03-业务规则与不变量.md` — 规则编译目标
- `docs/gyoseishoshi_saas_md/P0/04-核心流程与状态流转.md` — 流程编译目标
- `docs/gyoseishoshi_saas_md/P0/06-页面规格/{module}.md` — 页面规格编译目标
- `docs/gyoseishoshi_saas_md/P0/07-数据模型设计.md` — 数据模型编译目标
- `AGENTS.md` — 知识库工作方式（来源：仓库门禁）

## Deliverables

按意图路由产出不同交付物：

### Ingest 分支

1. `_raw/00-inbox.md` 追加条目 — 格式化的原始素材

#### Inbox 条目最小结构

```text
- 时间：YYYY-MM-DD
  来源：{会议/IM/PRD/链接/口头}
  主题：{一句话}
  要点：
  - ...
  需要编译到：
  - {建议目标文档名/章节}
  Owner：{负责人}
  状态：待编译
```

### Compile 分支

1. 目标权威文档的增量修改 — 结构化段落（遵守对应模板 A/B/C）
2. `_raw/00-inbox.md` 对应条目状态更新为"已编译"

#### 权威文档增量最小要求

- 入口层文档 → 遵守模板 A（必须包含"适合谁看"、"阅读后你会知道什么"）
- 规则/流程/数据文档 → 遵守模板 B（必须包含统一头部表六字段）
- 页面规格文档 → 遵守模板 C（必须包含模块元信息表、典型任务、关键动作、状态与异常、权限、规则引用）

### File-back 分支

1. `_output/00-outputs.md` 追加条目 — 可复用结论及回灌计划

#### Output 条目最小结构

```text
- 时间：YYYY-MM-DD
  问题：{提出的问题}
  结论（TL;DR）：{一句话}
  关键依据：
  - {指向 docs 内的权威文档/章节，或 raw 条目}
  影响面：
  - {模块/页面/接口/流程}
  回灌计划：
  - 目标文档：{文件名}
    位置：{章节}
    Owner：{负责人}
    状态：待回灌
```

### Lint 分支

1. 矛盾清单 — 同一概念/口径出现冲突定义
2. 过期清单 — 超周期未更新且仍被引用的内容
3. 缺口清单 — 高频被问到但无权威定义的内容

#### Lint 清单条目最小结构

```text
| # | 类型 | 位置（文件/章节） | 严重性 | 描述 | 建议动作 |
```

## Workflow

### Ingest

1. 确认素材来源（会议/IM/PRD/链接/口头）。
2. 读取 `_raw/00-inbox.md`，检查是否已有类似条目。
3. 提取要点，判断需要编译到的目标文档（使用变更定位规则）。
4. 按 inbox 条目格式追加到 `_raw/00-inbox.md`。
5. 验证：条目格式完整，目标文档路径正确。

### Compile

1. 读取 `_raw/00-inbox.md`，找到状态为"待编译"的条目。
2. 读取 `README.md` 中的变更定位规则，确定编译目标文档和章节。
3. 读取目标文档当前内容。
4. 读取 `99-文档维护与版本记录.md` 中对应模板（A/B/C）。
5. 判断是增量修改还是新增章节：
   - 增量修改 → 在目标章节中补充或更正内容
   - 新增章节 → 按模板骨架创建
6. 检查术语一致性（对照 08-术语表）。
7. 检查是否引入了双写（同一定义不得出现在两个文档中）。
8. 执行修改。
9. 将 inbox 条目状态更新为"已编译"。
10. 运行 99-文档维护与版本记录 中的固定检查表。

### File-back

1. 确认结论内容和来源。
2. 读取 `_output/00-outputs.md`，检查是否已有相同结论。
3. 判断影响面和回灌目标。
4. 按 output 条目格式追加到 `_output/00-outputs.md`。
5. 验证：回灌计划中的目标文档路径正确，状态为"待回灌"。

### Lint

1. 读取全部权威文档目录（使用 README 中的文档列表）。
2. 扫描矛盾：同一术语/口径是否在不同文档中有冲突定义。
3. 扫描过期：文档变更日志中最后更新时间是否超过约定周期。
4. 扫描缺口：检查 inbox 中重复出现但未编译的主题、outputs 中待回灌超期的条目。
5. 输出三张清单（矛盾/过期/缺口），每条注明位置、严重性、建议动作。
6. 验证：清单中每条建议都指向具体文件和章节。

## Rules

- Inbox 只追加、不重写。已有条目只允许更改状态字段。
- 权威文档同一概念只在一处定义（一处定义、多处引用原则）。
- 编译前必须先做变更定位：判断改动属于规则/流程/页面/数据/术语中的哪一层，再定位入口文档。（来源：README §变更定位规则）
- P0 目录文档只接受"首版试点必须做"的内容。P1/P2 需求回主目录维护。（来源：P0/README §R-2、R-3）
- 新增概念先在 08-术语表定义，再在对应层文档中使用。
- 新增文档按层级选用模板：入口 → A、规则/流程/数据 → B、页面规格 → C。（来源：99-文档维护 §文档模板规范）
- 文件名编号 = H1 标题编号，站内引用使用物理文件名。（来源：99-文档维护 §编号体系规则 N-1/N-2/N-3）
- 页面规格只写界面职责（字段、Tab、交互、聚合口径），不重新定义业务规则。规则用链接引用。
- 跨层变更先改上游（03 规则），再改下游（04 流程 → 06 页面 → 07 数据），最后检查引用一致性。
- Outputs 中"待回灌"条目在稳定后必须回灌到权威文档，不得长期停留。

## Anti-Patterns

- 跳过变更定位直接改文档 → 改错层级，导致双写或权威源错位
- 在页面规格中完整定义业务规则 → 规则双写，后续修改时必遗漏一处
- 在 inbox 中修改已有条目的正文（而非状态字段）→ 破坏 append-only 约定，丢失原始记录
- 新增概念不先在术语表定义 → 同义词漂移，不同文档用不同名称指同一概念
- Compile 后不更新 inbox 条目状态 → 下次 compile 重复处理，无法追踪编译进度
- 把 P1/P2 需求编译进 P0 文档 → 范围膨胀，违反 P0 治理规则 R-2
- Lint 清单只列问题不给定位 → 无法执行，沦为泛泛的"需要优化"

## References

- [compile-checklist.md](references/compile-checklist.md) — 编译流程检查清单与变更定位速查
- `docs/gyoseishoshi_saas_md/README.md` — 文档导航中心与变更定位规则
- `docs/gyoseishoshi_saas_md/99-文档维护与版本记录.md` — 文档模板、编号规则、固定检查表
- `docs/gyoseishoshi_saas_md/_raw/00-inbox.md` — 原始输入入口
- `docs/gyoseishoshi_saas_md/_output/00-outputs.md` — 产出归档入口
- [example-walkthrough.md](references/example-walkthrough.md) — inbox→compile→file-back 完整循环演练
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认：

1. Ingest：条目格式完整（时间、来源、主题、要点、目标、Owner、状态）
2. Compile：目标文档遵守对应模板（A/B/C）
3. Compile：无双写（同一定义只出现在权威源）
4. Compile：术语与 08-术语表一致
5. Compile：inbox 条目状态已更新为"已编译"
6. File-back：output 条目包含回灌计划（目标文档、位置、Owner、状态）
7. Lint：三张清单每条有具体文件/章节定位
8. 所有修改通过 99-文档维护与版本记录的固定检查表
9. 如涉及新增/重命名文档：编号对照表已更新，文件名 = H1 编号
