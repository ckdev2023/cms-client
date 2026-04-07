# Runbook Template

## 前提
- 已有 manifest.json
- 已有 tasks/*.md
- 仓库可创建 worktree
- 本地已安装 cursor-agent 或等价执行入口

## 建议目录
- tasks/
- artifacts/
- review/
- .worktrees/

## 执行流程
1. 读取 manifest.json
2. 找出无依赖任务
3. 为每个任务创建独立 worktree
4. 在各自 worktree 运行 agent
5. 写回 artifacts/Txx.result.json
6. 继续调度后续依赖满足的任务
7. 最后运行 merge_review

## 失败重试
- 只重试 failed 或 blocked 任务
- 保留原 artifacts 以便比对
- 若失败原因来自共享热点冲突，先调整计划再重试

## 最终回归
- 运行全量 lint / typecheck / test / build
- 生成 review/merge-plan.md
