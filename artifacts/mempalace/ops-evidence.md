# MemPalace 运维实证记录

本文记录 MemPalace sidecar 首轮试跑期间的运维实证，用于满足 `go-no-go-review.md` §3.3 运维门槛要求。

## 1. Release 实证

### 1.1 当前稳定 release

| 字段 | 值 |
|------|------|
| release_id | `mempalace-0.1.0-py3.14.3` |
| mempalace_version | `0.1.0` |
| python_version | `3.14.3` |
| chroma_version | `1.5.7` |
| manifest_version | `v0.1.0` |
| status | `active` |
| predecessor | `null`（首个 release） |
| installed_at | `2026-04-12T15:30:00+09:00` |
| installed_by | `local-operator` |

### 1.2 release-manifest.json 内容

路径：`$HOME/.mempalace/cms-client/runtime/releases/mempalace-0.1.0-py3.14.3/release-manifest.json`

```json
{
  "release_id": "mempalace-0.1.0-py3.14.3",
  "mempalace_version": "0.1.0",
  "python_version": "3.14.3",
  "chroma_version": "1.5.7",
  "manifest_version": "v0.1.0",
  "installed_at": "2026-04-12T15:30:00+09:00",
  "installed_by": "local-operator",
  "status": "active",
  "predecessor": null,
  "notes": "首个 release，Phase 1 L1 只读检索"
}
```

### 1.3 runtime/current 符号链接

```
$HOME/.mempalace/cms-client/runtime/current -> releases/mempalace-0.1.0-py3.14.3
```

验证：`readlink $HOME/.mempalace/cms-client/runtime/current` 返回 `releases/mempalace-0.1.0-py3.14.3`。

## 2. Data Snapshot 实证

### 2.1 索引基线 snapshot

| 字段 | 值 |
|------|------|
| data_snapshot_id | `snap-20260412-75cb7f16` |
| 生成时间 | 2026-04-12T06:26:05+00:00 |
| 来源 | B0 预检自动生成 |
| 用途 | 索引基线参考点 |

该 ID 记录在 B0 报告和 L1 索引 run 记录中：
- `$HOME/.mempalace/cms-client/data/baselines/b0-run-20260412-a963edab.json`
- `$HOME/.mempalace/cms-client/data/baselines/l1-index-run-20260412-a963edab.json`

### 2.2 评估前备份 snapshot

| 字段 | 值 |
|------|------|
| data_snapshot_id | `backup-20260412-200133-pre-eval` |
| release_id | `mempalace-0.1.0-py3.14.3` |
| captured_at | `2026-04-12T20:01:33+09:00` |
| captured_by | `local-operator` |
| reason | `pre-eval` |

路径：`$HOME/.mempalace-backups/cms-client/backup-20260412-200133-pre-eval/`

目录内容：

```
backup-20260412-200133-pre-eval/
├── data/                        # 活动 data/ 的完整副本 (6.5 MB)
│   ├── baselines/               # B0 和 L1 索引基线记录
│   │   ├── b0-run-20260412-a963edab.json
│   │   └── l1-index-run-20260412-a963edab.json
│   └── chroma/                  # Chroma 持久化数据
│       ├── chroma.sqlite3
│       └── bd788f80-.../        # collection 数据
├── current-release.txt          # "mempalace-0.1.0-py3.14.3"
└── snapshot-manifest.json       # 快照元数据
```

snapshot-manifest.json：

```json
{
  "data_snapshot_id": "backup-20260412-200133-pre-eval",
  "release_id": "mempalace-0.1.0-py3.14.3",
  "captured_at": "2026-04-12T20:01:33+09:00",
  "captured_by": "local-operator",
  "reason": "pre-eval"
}
```

## 3. 备份记录

### 3.1 备份清单

| data_snapshot_id | release_id | captured_at | reason | 大小 |
|------------------|------------|-------------|--------|------|
| `backup-20260412-200133-pre-eval` | `mempalace-0.1.0-py3.14.3` | 2026-04-12T20:01:33+09:00 | pre-eval | 6.5 MB |

### 3.2 备份完整性

- 备份目录存在：✓
- data/ 副本非空：✓ (6.5 MB)
- snapshot-manifest.json 存在：✓
- current-release.txt 存在：✓
- chroma.sqlite3 包含在 data/ 中：✓
- baselines 包含在 data/ 中：✓

### 3.3 恢复可行性

备份按 `sidecar-layout.md` §3.5 和 `runbook.md` §8 结构存放。恢复命令：

```bash
rm -rf "$HOME/.mempalace/cms-client/data"
cp -a "$HOME/.mempalace-backups/cms-client/backup-20260412-200133-pre-eval/data" "$HOME/.mempalace/cms-client/data"
```

## 4. Health-Check 实证

### 4.1 健康检查结果

执行时间：2026-04-12T11:02:00+00:00

```json
{
  "command": "health",
  "status": "healthy",
  "release_id": "mempalace-0.1.0-py3.14.3",
  "checks": {
    "directory_structure": "pass",
    "release_manifest": "pass",
    "persistent_client": "pass",
    "data_readwrite": "pass",
    "log_writable": "pass"
  },
  "checked_at": "2026-04-12T11:02:00+00:00"
}
```

### 4.2 检查项逐条确认

| 检查 ID | 检查名 | 结果 | 说明 |
|---------|--------|------|------|
| H1 | directory_structure | pass | runtime/current、data/chroma、data/baselines、logs/ 均存在 |
| H2 | release_manifest | pass | release-manifest.json 可读，release_id = mempalace-0.1.0-py3.14.3 |
| H3 | persistent_client | pass | PersistentClient 初始化成功，list_collections 可执行 |
| H4 | data_readwrite | pass | 临时 collection 创建/删除成功 |
| H5 | log_writable | pass | logs/service/ 目录可写 |

### 4.3 服务日志

路径：`$HOME/.mempalace/cms-client/logs/service/mempalace.log`

```json
{"ts": "2026-04-12T07:02:21+00:00", "level": "INFO", "event": "health_check", "release_id": "mempalace-0.1.0-py3.14.3", "status": "healthy"}
```

### 4.4 命令入口确认

| 命令 | 入口 | 可执行 |
|------|------|--------|
| health | `python -m mempalace health` | ✓ |
| start | `python -m mempalace start` | ✓ |
| stop | `python -m mempalace stop` | ✓ |

执行方式：

```bash
cd /Users/ck/workplace/cms-client/sidecar
source .venv/bin/activate
python -m mempalace health
```

## 5. 索引基线实证

### 5.1 B0 预检报告

路径：`$HOME/.mempalace/cms-client/data/baselines/b0-run-20260412-a963edab.json`

```json
{
  "run_id": "run-20260412-a963edab",
  "release_id": "mempalace-0.1.0-py3.14.3",
  "manifest_version": "v0.1.0",
  "data_snapshot_id": "snap-20260412-75cb7f16",
  "baseline_plan_version": "w11-v1",
  "status": "passed",
  "checks": [
    {"name": "manifest_readable", "passed": true, "detail": "version=v0.1.0, entries=10, enabled=8"},
    {"name": "taxonomy_frozen", "passed": true, "detail": "wings=5, rooms=6"},
    {"name": "wing_alignment", "passed": true, "detail": "所有 enabled 条目的 wing 均在冻结集合内"},
    {"name": "directories", "passed": true, "detail": "所有目录可达可写"},
    {"name": "environment", "passed": true, "detail": "mempalace=0.1.0, python=3.14.3, chromadb=1.5.7, os=Darwin"}
  ],
  "errors": []
}
```

### 5.2 L1 索引 Run 汇总

路径：`$HOME/.mempalace/cms-client/data/baselines/l1-index-run-20260412-a963edab.json`

| 指标 | 值 |
|------|------|
| run_id | `run-20260412-a963edab` |
| status | `completed` |
| 批次数 | 5（B1–B5） |
| 全部通过 | ✓（5/5 quality_gate=passed） |
| 总文件数 | 57 |
| 总 chunk 数 | 716 |

各批次汇总：

| 批次 | source_ids | 文件数 | chunk 数 | quality_gate |
|------|-----------|-------:|--------:|--------------|
| B1-p0-core | p0-core-md, p0-navigation-md | 21 | 453 | passed |
| B2-p0-artifacts | p0-gate-artifacts | 16 | 24 | passed |
| B3-p1-core | p1-core-md | 3 | 56 | passed |
| B4-p1-artifacts | p1-gate-artifacts | 4 | 5 | passed |
| B5-office-process | office-process-md, scenarios, config | 13 | 178 | passed |

Wing 覆盖：gyoseishoshi-p0 (477), gyoseishoshi-p1 (61), office-process (178)

Room 覆盖：state-machine (97), field-ownership (45), workflow-gates (24), biz-mgmt (78), scenario-materials (105), submission-audit (38), (unclassified) (329)

## 6. 目录结构合规检查

按 `sidecar-layout.md` §9 检查脚本验证：

| 项 | 结果 |
|----|------|
| `runtime/releases/` | OK |
| `runtime/current` (symlink) | OK → `releases/mempalace-0.1.0-py3.14.3` |
| `data/chroma/` | OK |
| `data/baselines/` | OK |
| `logs/index/` | OK |
| `logs/service/` | OK |
| `backups/` (外部) | OK: `$HOME/.mempalace-backups/cms-client/` |
| `release-manifest.json` in current | OK |

## 7. 磁盘使用

| 路径 | 大小 |
|------|------|
| `$HOME/.mempalace/cms-client/data/` | ~6.5 MB |
| `$HOME/.mempalace/cms-client/logs/` | <1 KB |
| `$HOME/.mempalace-backups/cms-client/` | ~6.5 MB |

## 8. 运维门槛达标对照

按 `go-no-go-review.md` §3.3 运维门槛逐项对照：

| 要求 | 状态 | 证据 |
|------|------|------|
| 必须能明确当前稳定 release_id | ✓ | `mempalace-0.1.0-py3.14.3`，记录在 release-manifest.json |
| 必须能明确最近一次可恢复 data_snapshot_id | ✓ | `backup-20260412-200133-pre-eval`，含完整 data/ 副本 |
| 必须存在可执行的启动、停止、健康检查入口 | ✓ | `python -m mempalace start/stop/health` |
| 值班者可按 runbook.md 独立执行 | ✓ | 所有路径、命令、检查项均有实际运行记录 |

## 9. 直接依据

- `plan/mempalace/go-no-go-review.md` §3.3（运维门槛）
- `plan/mempalace/runbook.md`（操作手册）
- `plan/mempalace/release-strategy.md`（release 规范）
- `plan/mempalace/sidecar-layout.md`（目录结构）
- `plan/mempalace/healthcheck-contract.md`（H1–H5 契约）
- `$HOME/.mempalace/cms-client/runtime/releases/mempalace-0.1.0-py3.14.3/release-manifest.json`
- `$HOME/.mempalace/cms-client/data/baselines/b0-run-20260412-a963edab.json`
- `$HOME/.mempalace/cms-client/data/baselines/l1-index-run-20260412-a963edab.json`
- `$HOME/.mempalace-backups/cms-client/backup-20260412-200133-pre-eval/snapshot-manifest.json`
