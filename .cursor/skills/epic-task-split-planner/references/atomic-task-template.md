# 原子任务文档模板

> 用于 `docs/plans/<plan-id>/epics/E<NN>/tasks/T<NN>-<slug>.md`。
> 由本 skill 在 **agent 模式**落盘；plan 模式仅在 chat 内以"原子任务总览表"形式预览（详见 SKILL.md § Deliverables.A.3）。
> 任务必须能在新会话中独立执行。

```markdown
# T<NN>-<slug>

## 1. 所属 Epic
- E<NN> <Epic Title>

## 2. 任务目标
- <一句话，描述本任务唯一要完成的结果>

## 3. 背景上下文
- 仅写本任务执行所必需的背景，不复制项目背景。
- 若依赖前置任务，只写"前置任务产出的关键接口/类型/路由项"。

## 4. 输入材料
- 需求 / 设计摘要：<...>
- 相关接口 / 表 / 页面：<...>
- 依赖前置任务：<T0X>（如无写"无"）

## 5. 修改范围（allowed_paths）
- packages/<workspace>/<具体目录或文件 1>
- packages/<workspace>/<具体目录或文件 2>

> 范围必须缩小到具体子目录或文件级；禁止写 `packages/admin/src/` 这种大范围。

## 6. 禁止改动（forbidden_paths）
- packages/*/router.ts 等共享热点（除非本任务就是热点串行任务）
- 其它 workspace 的代码
- i18n 聚合入口、生成代码、schema 主文件
- package.json / lockfile

## 7. 共享热点检查
- 本任务可能竞争的共享文件：<列出 / 写"无">
- 若有，是否已拆为独立串行前置任务：是 / 否

## 8. 实施步骤
1. <步骤 1：可直接执行的具体动作>
2. <步骤 2>
3. <步骤 3>
4. （如适用）补单测：在 `<测试文件路径>` 增加用例覆盖 <场景>

## 9. 验收标准
- [ ] <可客观验证的完成条件 1：接口返回 / 页面行为 / 文件存在 / 类型正确等>
- [ ] <可客观验证的完成条件 2>

## 10. 任务级验证命令（仅 typecheck + lint）
> 本任务**只跑**所属 workspace 的 `typecheck` 和 `lint`，**不跑** `npm run guard`、`npm test`、`npm run build`。
> 全量回归在所有任务完成后由 `runbook.md` § 最终全量回归 阶段统一执行。

```bash
# 示例（按所属 workspace 替换）：
npm --workspace @cms/admin run typecheck
npm --workspace @cms/admin run lint

# 或：
npm --workspace server run typecheck
npm --workspace server run lint

# 或：
npm --workspace mobile run typecheck
npm --workspace mobile run lint
```

通过条件：两条命令均退出码 0。

## 11. 结果工件
- `artifacts/T<NN>.result.json`：包含 `status`、`changed_files`、`per_task_checks_result`
- `artifacts/T<NN>.summary.md`：1 屏内的执行摘要 + 风险点

## 12. 停止条件
- 需要修改本任务 allowed_paths 之外的文件。
- 需要新增依赖或修改 `package.json` / lockfile。
- 需要修改 schema / migration / 鉴权 / 路由聚合入口。
- 任务级 typecheck 或 lint 持续不通过且根因超出本任务范围。

## 13. 回滚方案
- 撤销本任务相关 commit；如新增了文件，需删除新增文件并恢复任何被引用的导出。
- 若已合入主线，使用 `git revert <commit>` 单点回滚，不影响其它 Epic。
```

## 关键不变量

- "任务级验证命令"章节标题、固定声明文本、命令格式三者不可改写。
- `allowed_paths` 与 `forbidden_paths` 必须与 `manifest.json` 中对应任务字段完全一致。
- 不允许在任务文档里出现 `npm run guard`、`npm test`、`npm run build` 作为任务级验证。
