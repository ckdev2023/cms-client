# 最终全量回归 Runbook 片段

> 用于拆分包内 `docs/plans/<plan-id>/runbook.md` § 阶段三：最终全量回归。
> 由本 skill 在 **agent 模式**落盘；plan 模式不复制本片段全文，只在 chat 中提示"最终回归固定为 fix → guard"。
> 任务级阶段只跑 typecheck + lint；最终交付门禁仅在此处执行。

## 前置条件

- 所有原子任务的 `per_task_checks_result` 全部为 `pass`。
- 所有任务分支已经按 `manifest.json` 中的 `depends_on` 顺序合并到目标集成分支。
- 工作区无未提交改动（`git status` 干净）。

## 执行顺序（不可调换）

```bash
npm run fix
npm run guard
```

来源：AGENTS.md "收尾顺序：先 `npm run fix`，再 `npm run guard`"。

### 步骤 1：fix

```bash
npm run fix
```

聚合命令（root `package.json`）：

```text
npm run mobile:fix && npm run admin:fix && npm --workspace server run fix
```

行为：

- 各 workspace 跑 `prettier --write` + `eslint --fix`。
- 自动修复格式与可修复的 lint 问题。
- 若有自动修复，必须 `git add` 并提交，**不允许丢弃**。

### 步骤 2：guard

```bash
npm run guard
```

聚合命令（root `package.json`）：

```text
npm run lint:i18n
  && npm run lint:a11y
  && npm run mobile:guard
  && npm run admin:guard
  && npm run server:guard
```

每个 workspace `guard` 实际包含（节选）：

| Workspace | guard 子命令 |
|-----------|--------------|
| @cms/admin | check:deps → typecheck → lint → test → build |
| server | lint → typecheck → arch:check → db:migrations:check → db:migrations:drift → db:drizzle:check → lock:check → secrets:check → test → test:integration-pg:ci |
| mobile | lint → typecheck → arch:check → feature:check → lock:check → secrets:check → test |

通过条件：`npm run guard` 退出码 0，全部子命令零报错。

## 失败定位与修复路径

| 失败类型 | 定位方式 | 修复指引 |
|----------|----------|----------|
| lint 失败 | 终端报错行 | 手动修复或追加 `lint:fix` 后重跑 `fix` + `guard` |
| typecheck 失败 | tsc / vue-tsc 报错 | 修复类型定义 / 导入；优先回到引入错误的原子任务 |
| arch:check 失败 | depcruise 输出 | 按 AGENTS.md 架构分层消除违规依赖 |
| feature:check 失败 | checkFeatureBoundaries 输出 | 消除跨 feature 直接 import |
| db checks 失败 | drizzle / migration | 检查 migration 与 drizzle 配置一致性 |
| lock:check 失败 | 多锁文件 | 删除 yarn.lock / pnpm-lock.yaml；保留 package-lock.json |
| secrets:check 失败 | 敏感串扫描 | 移除并改用环境变量 |
| 测试失败 | vitest / node:test 输出 | 定位失败用例，修复逻辑或更新断言 |

定位到根因所在的原子任务后，按照对应任务文档的"回滚方案"恢复，修复后重新合入并重跑 `npm run fix && npm run guard`。

## 通过判定

- `npm run fix` 退出码 0，且新增的格式化改动已纳入提交。
- `npm run guard` 退出码 0。
- `git status` 干净。

满足以上三条 → 进入交付清单核对（见 `runbook.md` § 5）。
