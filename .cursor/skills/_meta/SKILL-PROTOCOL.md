# Skill 统一协议

> 权威协议文件。所有 skill 的 SKILL.md 必须遵循本文件定义的结构和规范。
>
> 前置审计：[baseline-audit.md](baseline-audit.md)
> 历史参考：[SKILL-TEMPLATE.md](SKILL-TEMPLATE.md)

---

## 1. SKILL.md 固定章节

每个 skill 的 `SKILL.md` 由以下 **10 个固定章节** 组成。
顺序固定，命名固定，不允许新增同级章节或重命名。
允许在章节内添加子节（`### 3.1 ...`）。

```
SKILL.md
├── Frontmatter (YAML)
├── § Purpose
├── § Triggers
├── § Required Inputs
├── § Deliverables
├── § Workflow
├── § Rules
├── § Anti-Patterns
├── § References
└── § Completion
```

---

## 2. 各章节规范

### 2.1 Frontmatter

```yaml
---
name: <skill-id>
description: <一句话，≤200 字符。必须包含触发关键词和核心产出物。>
---
```

| 字段 | 要求 |
|------|------|
| `name` | kebab-case，与目录名一致 |
| `description` | ≤200 字符；包含典型触发词 + 产出物名词；供 agent 自动匹配 |
| 其他字段 | 禁止。版本、作者等元数据如有需要放 References 附属文件 |

### 2.2 Purpose

回答三个问题：
1. 解决什么问题？
2. 做完后产出什么？
3. 优先级排序（如有多个目标）

约束：
- ≤10 行
- 不重复 frontmatter description
- 如有优先级排序，用编号列表给出

### 2.3 Triggers

列出触发条件 + 示例请求。

格式：

```markdown
## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- <条件 1>
- <条件 2>

示例请求：
- <示例 1>
- <示例 2>
- <示例 3>
```

约束：
- ≥2 个条件，≥3 个示例请求
- 条件精确，禁止"当用户想做 XXX 相关的事"这种模糊描述
- 如有意图路由（"想 A → 分支 X；想 B → 分支 Y"），用编号子列表给出

### 2.4 Required Inputs

执行前必须读取的文件和上下文，分"必读"和"按需"两级。

如有金样本，在必读列表之后用"金样本（必读）："子节标注。

格式：

```markdown
## Required Inputs

执行前必须读取：

- `path/to/file-1` — 用途说明
- `path/to/file-2` — 用途说明

金样本（必读）：

- `path/to/gold-sample/` — 用途说明

需要更多上下文时，再读取：

- `path/to/optional-1` — 用途说明
```

约束：
- 路径使用仓库相对路径
- 金样本 / 参考实现必须出现在必读列表或金样本子节中
- 禁止"读一下相关文件"这种模糊指引

### 2.5 Deliverables

全部输出物及其最小结构。

格式：

```markdown
## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. `<文件名>` — 用途
2. `<文件名>` — 用途

### <文件名> 最小结构

<用 schema、字段表或代码块说明最小必须内容>
```

约束：
- 每个产出物必须注明用途 + 最小结构
- 机器可读产出（JSON 等）必须给出 required keys 或 JSON schema
- 文档类产出必须给出必须包含的章节列表

### 2.6 Workflow

编号步骤的强制执行序列。

约束：
- 步骤用阿拉伯数字编号
- 每步一个明确动作，不合并不相关动作
- 条件分支用缩进子列表
- 最后一步必须是验证或门禁检查

### 2.7 Rules

边界、约束、层级规则的集合。

约束：
- 每条用 `-` 列表
- 只放硬规则，不放建议或偏好
- 涉及仓库分层（domain / data / features / shared）的规则，显式注明"（来源：AGENTS.md）"
- 涉及仓库门禁（fix / guard / 测试）的规则，显式注明"（来源：AGENTS.md）"
- 涉及其他权威文档的规则，注明"（来源：文件名 §章节）"

### 2.8 Anti-Patterns

禁止做的事。

约束：
- 每条用 `-` 列表，格式为"做了什么 → 为什么不行"
- ≥3 条
- 优先从实际踩过的坑或 review 反馈中提炼

### 2.9 References

辅助文件集中索引。

格式：

```markdown
## References

- [reference-name.md](references/reference-name.md) — 用途
- [blueprint.json](data/blueprint.json) — 用途
- [scaffold.mjs](scripts/scaffold.mjs) — 用途
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议
```

约束：
- 所有辅助文件在此节集中索引，使用相对路径
- 每个文件注明用途
- 辅助文件不得脱离 SKILL.md 独立使用
- 最后一条必须索引本协议文件

### 2.10 Completion

完成检查清单。

格式：

```markdown
## Completion

完成后逐项确认：

1. <检查项 1>
2. <检查项 2>

仓库门禁（适用于产生代码改动的 skill）：

1. 运行 `npm run fix`
2. 运行 `npm run guard`
3. 新增/修改逻辑已补单测（覆盖 model / domain / data）
```

约束：
- 检查项针对当前 skill 的产出物
- 产生代码改动的 skill 必须包含仓库门禁子节
- 只产生文档的 skill 可省略仓库门禁子节

---

## 3. 辅助文件目录规范

```
<skill-name>/
├── SKILL.md                  ← 唯一入口文档
├── references/               ← 补充规则、模板、判断标准
│   └── *.md / *.json
├── data/                     ← 蓝图、schema、标注样例、金样本数据
│   └── *.json
└── scripts/                  ← 脚手架、校验、辅助脚本
    └── *.mjs / *.py
```

- 目录名固定：`references/`、`data/`、`scripts/`
- 不是每个 skill 都需要全部三个子目录，按需创建
- SKILL.md 中通过 § References 节索引所有辅助文件
- 辅助文件不得独立于 SKILL.md 使用；SKILL.md 是唯一入口

---

## 4. 命名规范

| 对象 | 规则 | 示例 |
|------|------|------|
| skill 目录名 | kebab-case | `prototype-module-split` |
| SKILL.md | 固定大写 | `SKILL.md` |
| reference 文件 | kebab-case + `.md` 或 `.json` | `mapping-rules.md` |
| data 文件 | kebab-case + `.json` | `module-split-blueprint.json` |
| script 文件 | kebab-case + `.mjs` 或 `.py` | `scaffold-split.mjs` |
| frontmatter name | 与目录名一致 | `prototype-module-split` |

---

## 5. 质量门禁

新建或修改 skill 时，逐项检查：

| # | 检查项 | 适用 |
|---|--------|------|
| 1 | frontmatter `name` 与目录名一致 | 全部 |
| 2 | frontmatter `description` ≤200 字符，包含触发词 | 全部 |
| 3 | 10 个章节齐全、顺序正确、命名正确 | 全部 |
| 4 | Triggers ≥2 条件 + ≥3 示例 | 全部 |
| 5 | Required Inputs 必读列表非空 | 全部 |
| 6 | Deliverables 每项有用途 + 最小结构 | 全部 |
| 7 | Workflow 最后一步是验证 | 全部 |
| 8 | Anti-Patterns ≥3 条 | 全部 |
| 9 | Completion 针对本 skill 产出物 | 全部 |
| 10 | 代码类 skill 包含仓库门禁子节 | 产生代码改动时 |
| 11 | 所有辅助文件已在 References 节索引 | 有辅助文件时 |
| 12 | 辅助文件按 `references/` `data/` `scripts/` 归目录 | 有辅助文件时 |
| 13 | References 最后一条索引 SKILL-PROTOCOL.md | 全部 |
| 14 | Rules 中引用 AGENTS.md 的规则标注了"（来源：AGENTS.md）" | 有仓库规则引用时 |

---

## 6. SKILL.md 空白骨架

新建 skill 时可直接复制后填充：

````markdown
---
name: <skill-id>
description: <一句话，包含触发关键词和核心产出物>
---

# <Skill Title>

## Purpose

<解决什么问题？产出什么？优先级？>

## Triggers

当用户请求符合以下任一条件时，触发此 skill：

- <条件>
- <条件>

示例请求：
- <请求>
- <请求>
- <请求>

## Required Inputs

执行前必须读取：

- `<path>` — <用途>

需要更多上下文时，再读取：

- `<path>` — <用途>

## Deliverables

除非用户明确要求轻量输出，否则至少产出：

1. `<文件>` — <用途>

### <文件> 最小结构

<schema 或字段表>

## Workflow

1. <步骤>

## Rules

- <规则>

## Anti-Patterns

- <做了什么 → 为什么不行>

## References

- [<name>](<path>) — <用途>
- [SKILL-PROTOCOL.md](../_meta/SKILL-PROTOCOL.md) — 本 skill 遵循的统一协议

## Completion

完成后逐项确认：

1. <检查项>
````

---

## 7. 协议变更记录

现有 skill 在下次实质性修改时对齐新版协议，不要求立即全量迁移。

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-04-10 | 从 T01 草案定稿为正式协议（T02） |
| v1.1 | 2026-04-10 | T12 统一：创建 SKILL-PROTOCOL.md 为权威文件；迁移 prototype-module-split 和 cursor-task-orchestrator；统一术语、金样本标注、规则来源归因、References 索引格式；新增质量门禁 #13（协议索引）和 #14（规则归因）|
| v1.2 | 2026-04-10 | T14 试运行评审：迁移 prototype-module-split 的 reference.md/examples.md 到 references/ 目录；补充 example-walkthrough.md；page-spec-generator 增加双入口规则；delivery-guardrail 增加原型文件场景指引；shared-shell-extractor 增加模块专属 CSS 提取路径；test-case-suggester 注明适用阶段；delivery-guardrail 与 test-case-suggester 互相索引 |
| v1.2.1 | 2026-04-10 | T15 镜像决定：决定暂不镜像到 .augment/skills 和 .trae/skills；.cursor/skills 维持唯一权威源；在 .augment 和 .trae 添加 DEPRECATED.md；详见 mirror-decision.md |
