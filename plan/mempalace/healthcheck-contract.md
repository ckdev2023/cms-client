# MemPalace Sidecar 健康检查契约

## 1. 目标

定义 sidecar 启动、停止、健康检查的最小可执行入口，明确每个命令的输入、输出和成功/失败判定条件。

## 2. 命令入口

| 命令 | 用法 | 说明 |
|---|---|---|
| `health` | `python -m mempalace health` | 执行 H1–H5 健康检查，输出 JSON |
| `start` | `python -m mempalace start` | 先执行健康检查，通过后初始化 PersistentClient 并确认就绪 |
| `stop` | `python -m mempalace stop` | 记录停止事件后退出 |

所有命令的退出码：`0` = 成功，`1` = 失败，`2` = 用法错误。

## 3. 环境前提

- `MEMPALACE_ROOT` 环境变量指向 sidecar 根目录（默认 `$HOME/.mempalace/cms-client/`）
- sidecar 根目录下需存在 `runtime/current` 符号链接指向当前 release
- 当前 release 目录下需存在 `release-manifest.json`

## 4. 健康检查项（H1–H5）

按以下顺序执行，前项失败则后项 skip：

| 检查 ID | 检查名 | 验证内容 | 失败影响 |
|---|---|---|---|
| H1 | `directory_structure` | `runtime/current`、`data/chroma`、`data/baselines`、`logs/` 存在 | H2–H5 skip |
| H2 | `release_manifest` | `runtime/current/release-manifest.json` 可读且含 `release_id` | H3–H4 skip |
| H3 | `persistent_client` | `PersistentClient(path=data/chroma)` 初始化成功，`list_collections` 可执行 | H4 skip |
| H4 | `data_readwrite` | 创建并删除临时 collection 成功 | — |
| H5 | `log_writable` | `logs/service/` 目录可写 | — |

## 5. health 命令输出格式

```json
{
  "command": "health",
  "status": "healthy",
  "release_id": "mempalace-0.1.0-py3.11.11",
  "checks": {
    "directory_structure": "pass",
    "release_manifest": "pass",
    "persistent_client": "pass",
    "data_readwrite": "pass",
    "log_writable": "pass"
  },
  "checked_at": "2026-04-12T10:30:00+00:00"
}
```

`status` 取值：`"healthy"` 或 `"unhealthy"`。不健康时附加 `first_failure` 和 `error` 字段。

## 6. start 命令输出格式

```json
{
  "command": "start",
  "status": "ok",
  "release_id": "mempalace-0.1.0-py3.11.11",
  "chroma_version": "1.5.7",
  "data_path": "/Users/ck/.mempalace/cms-client/data/chroma",
  "collections_count": 1,
  "started_at": "2026-04-12T10:30:00+00:00"
}
```

## 7. stop 命令输出格式

```json
{
  "command": "stop",
  "status": "ok",
  "stopped_at": "2026-04-12T10:30:00+00:00"
}
```

## 8. 目录结构

延续 `deployment-topology.md` 的仓库外布局：

```
$HOME/.mempalace/cms-client/
  runtime/
    releases/
      mempalace-0.1.0-py3.11.11/
        release-manifest.json
    current -> releases/mempalace-0.1.0-py3.11.11
  data/
    chroma/
    baselines/
  logs/
    service/
      mempalace.log
    index/
  backups/
```

## 9. 日志协议

所有命令执行后向 `logs/service/mempalace.log` 追加单行 JSON 日志：

```json
{"ts": "2026-04-12T10:30:00+00:00", "level": "INFO", "event": "health_check", "release_id": "mempalace-0.1.0-py3.11.11", "status": "healthy"}
```

## 10. 实现对应

| 契约项 | 实现文件 | 入口 |
|---|---|---|
| H1–H5 | `mempalace/healthcheck.py` | `run_health_checks(paths)` |
| health 命令 | `mempalace/app.py` | `cmd_health(paths)` |
| start 命令 | `mempalace/app.py` | `cmd_start(paths)` |
| stop 命令 | `mempalace/app.py` | `cmd_stop(paths)` |
| 日志追加 | `mempalace/log.py` | `append(paths, ...)` |
| 路径解析 | `mempalace/config.py` | `resolve_paths()` / `SidecarPaths` |
| CLI 入口 | `mempalace/__main__.py` | `python -m mempalace <cmd>` |

## 11. 直接依据

- `plan/mempalace/deployment-topology.md`
- `plan/mempalace/environment-strategy.md`
