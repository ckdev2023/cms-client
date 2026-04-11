# Example Walkthrough: Compile Cycle for Knowledge Base Entry

> Real repo example demonstrating the business-doc-compiler skill.
> Files: `_raw/00-inbox.md` → authoritative docs → `_output/00-outputs.md`

---

## Scenario

User request: "把 inbox 中关于编译式知识库的条目编译进权威文档。"

## Step 1 — Ingest (read inbox)

From `docs/gyoseishoshi_saas_md/_raw/00-inbox.md`:

```text
- 时间：2026-04-10
  来源：仓库变更
  主题：启用编译式知识库入口（raw/output）
  要点：
  - 新增原始输入入口：docs/gyoseishoshi_saas_md/_raw/00-inbox.md
  - 新增产出归档入口：docs/gyoseishoshi_saas_md/_output/00-outputs.md
  - 将编译式工作流写入文档维护规范
  需要编译到：
  - 99-文档维护与版本记录.md（编译式知识库工作流段落）
  - README.md（维护约定：增加 raw/output 入口）
  Owner：产品/研发
  状态：待编译
```

## Step 2 — Compile (write to authoritative docs)

### Target 1: `99-文档维护与版本记录.md`

Add a new section "编译式知识库工作流":

```markdown
## 编译式知识库工作流

采用 Karpathy 编译式方法，原始材料经四步闭环沉淀为可复用资产：

| 步骤 | 动作 | 入口文件 |
|------|------|---------|
| Ingest | 把会议纪要/讨论串/链接要点先追加进 inbox | _raw/00-inbox.md |
| Compile | 将 Top3 条目编译为结构化页面 | 权威文档目录 |
| File-back | 把问答/分析结论写入 outputs | _output/00-outputs.md |
| Lint | 每周检查矛盾、过期、缺口 | 三张清单 |
```

### Target 2: `README.md`

Add raw/output entry points to the navigation section:

```markdown
## 原始输入与产出归档

- 原始输入（append-only）：[_raw/00-inbox.md](_raw/00-inbox.md)
- 产出归档（可回灌）：[_output/00-outputs.md](_output/00-outputs.md)
```

## Step 3 — Update inbox status

Change the inbox entry status from `待编译` to `已编译`:

```text
  状态：已编译
```

## Step 4 — File-back (record the compilation result)

Write to `docs/gyoseishoshi_saas_md/_output/00-outputs.md`:

```text
- 时间：2026-04-10
  问题：如何在 P0 阶段把编译式知识库落地到本仓库？
  结论（TL;DR）：以 AGENTS.md 作为跨编辑器入口；在 docs 下新增 _raw 和 _output，
    形成 raw → compile → file-back → lint 的最小闭环。
  关键依据：
  - docs/gyoseishoshi_saas_md/99-文档维护与版本记录.md
  - docs/gyoseishoshi_saas_md/README.md
  影响面：
  - 文档体系维护方式
  - AI 协作者默认行为
  回灌计划：
  - 目标文档：README.md
    位置：原始输入与产出归档
    Owner：产品/研发
    状态：已回灌
```

## Step 5 — Lint (weekly check)

The weekly lint produces three actionable lists:

### 矛盾清单（需收敛权威源）

```markdown
| # | 矛盾描述 | 文件 A | 文件 B | 建议 |
|---|---------|--------|--------|------|
| 1 | 状态枚举命名："欠款逾期" vs "逾期" | billing/INVENTORY.md | 06-页面规格/收费与财务.md | 以规格为准 |
```

### 过期清单（需降级/替代入口）

```markdown
| # | 过期内容 | 文件 | 建议 |
|---|---------|------|------|
| 1 | 旧路径 billing.html | shared/shell/side-nav.html | 已更新为 billing/index.html |
```

### 缺口清单（需新增权威定义）

```markdown
| # | 缺口描述 | 建议目标文档 | 优先级 |
|---|---------|------------|--------|
| 1 | 催款任务去重策略未在术语表定义 | 08-术语表.md | P0 |
```

## Actual repo state

The compile cycle has been executed at least once, as evidenced by:
- `_raw/00-inbox.md` has entries with `状态：已编译`
- `_output/00-outputs.md` has entries with `状态：已回灌`
- `99-文档维护与版本记录.md` contains the compiled workflow section
- `README.md` contains the raw/output entry points

## Key rules from AGENTS.md

- Ingest: **append-only** to inbox, never rewrite existing entries
- Compile: edit authoritative docs following existing templates
- File-back: only write "可入库版本" to outputs
- Lint: check for 矛盾 / 过期 / 缺口; mark expired content with replacement link
