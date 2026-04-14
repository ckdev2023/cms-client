"""
Sidecar 主入口：初始化目录、启动 PersistentClient、执行健康检查。

用法:
  python -m mempalace start
  python -m mempalace stop
  python -m mempalace health
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import chromadb

from mempalace.config import (
    MANIFEST_PATH,
    MEMPALACE_VERSION,
    SidecarConfig,
    SidecarPaths,
    load_release_manifest,
    resolve_paths,
)
from mempalace.healthcheck import (
    HealthResult,
    HealthStatus,
    read_pid,
    run_health_checks,
    run_healthcheck,
    stop_sidecar,
    write_pid,
)
from mempalace import log as slog

logger = logging.getLogger("mempalace")

_USAGE = "Usage: python -m mempalace <start|stop|health|b0|index|search|doc|cite|sources|route|ground|mcp>"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _setup_logging(logs_dir: Path) -> None:
    logs_dir.mkdir(parents=True, exist_ok=True)
    handler = logging.FileHandler(logs_dir / "mempalace.log", encoding="utf-8")
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    logging.basicConfig(level=logging.INFO, handlers=[handler, logging.StreamHandler()])


def ensure_directories(cfg: SidecarConfig) -> None:
    """创建运行所需目录，不在仓库内落任何运行产物。"""
    for d in (cfg.data_dir, cfg.logs_dir, cfg.runtime_dir, cfg.backups_dir):
        d.mkdir(parents=True, exist_ok=True)
    chroma_dir = cfg.data_dir / "chroma"
    chroma_dir.mkdir(parents=True, exist_ok=True)


def create_client(cfg: SidecarConfig) -> chromadb.ClientAPI:
    """创建 PersistentClient 并返回。"""
    chroma_path = cfg.data_dir / "chroma"
    return chromadb.PersistentClient(path=str(chroma_path))


# ---------------------------------------------------------------------------
# 契约兼容 CLI 命令（healthcheck-contract.md §4–§7）
# ---------------------------------------------------------------------------

def cmd_health(paths: SidecarPaths) -> int:
    """健康检查入口，输出契约定义的 JSON 格式。"""
    result = run_health_checks(paths)
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
    slog.append(
        paths,
        level="INFO",
        event="health_check",
        release_id=result.release_id,
        status=result.status,
    )
    return 0 if result.status == "healthy" else 1


def cmd_start(paths: SidecarPaths) -> int:
    """启动入口：验证环境、初始化 PersistentClient、输出 JSON。"""
    health = run_health_checks(paths)
    if health.status != "healthy":
        result: dict[str, Any] = {
            "command": "start",
            "status": "error",
            "error": health.error or "健康检查未通过",
            "release_id": health.release_id,
        }
        slog.append(
            paths,
            level="ERROR",
            event="start",
            release_id=health.release_id,
            error=str(health.error),
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 1

    client = chromadb.PersistentClient(path=str(paths.chroma))
    collections = client.list_collections()

    result = {
        "command": "start",
        "status": "ok",
        "release_id": health.release_id,
        "chroma_version": chromadb.__version__,
        "data_path": str(paths.chroma),
        "collections_count": len(collections),
        "started_at": _now_iso(),
    }
    slog.append(paths, level="INFO", event="start", release_id=health.release_id, status="ok")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


def cmd_stop(paths: SidecarPaths) -> int:
    """停止入口：第一期仅记录事件后退出。"""
    release_id = "unknown"
    try:
        manifest = load_release_manifest(paths)
        release_id = manifest.get("release_id", release_id)
    except Exception:
        pass

    result: dict[str, Any] = {
        "command": "stop",
        "status": "ok",
        "stopped_at": _now_iso(),
    }
    slog.append(paths, level="INFO", event="stop", release_id=release_id, status="ok")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


def cmd_b0(paths: SidecarPaths) -> int:
    """B0 预检：核对 manifest、taxonomy、环境和目录，记录运行标识。"""
    from mempalace.b0_readiness import run_b0_readiness, save_b0_report

    manifest_path = MANIFEST_PATH
    report = run_b0_readiness(manifest_path, paths)
    out_file = save_b0_report(report, paths.baselines)

    print(json.dumps(report.to_dict(), indent=2, ensure_ascii=False))

    slog.append(
        paths,
        level="INFO" if report.all_passed else "WARN",
        event="b0_readiness",
        release_id=report.release_id,
        run_id=report.run_id,
        status=report.status,
        report_path=str(out_file),
    )
    return 0 if report.all_passed else 1


def cmd_index(paths: SidecarPaths) -> int:
    """L1 首轮索引：B0 预检 → B1-B5 批次索引 → 基线记录落盘。"""
    from mempalace.b0_readiness import run_b0_readiness, save_b0_report
    from mempalace.baseline import aggregate_baseline, save_baseline
    from mempalace.indexer import run_l1_indexing, save_run_result

    manifest_path = MANIFEST_PATH
    b0 = run_b0_readiness(manifest_path, paths)
    save_b0_report(b0, paths.baselines)

    if not b0.all_passed:
        result: dict[str, Any] = {
            "command": "index",
            "status": "b0_failed",
            "b0_errors": b0.errors,
        }
        slog.append(
            paths,
            level="ERROR",
            event="index",
            release_id=b0.release_id,
            status="b0_failed",
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 1

    cfg = SidecarConfig(manifest_path=manifest_path)
    run_result = run_l1_indexing(
        cfg,
        paths,
        run_id=b0.run_id,
        release_id=b0.release_id,
        manifest_version=b0.manifest_version,
        data_snapshot_id=b0.data_snapshot_id,
    )
    save_run_result(run_result, paths.baselines)

    baseline = aggregate_baseline(run_result)
    baseline_path = save_baseline(baseline, paths.baselines)

    output: dict[str, Any] = {
        "command": "index",
        "status": run_result.status,
        "run_id": run_result.run_id,
        "release_id": run_result.release_id,
        "manifest_version": run_result.manifest_version,
        "candidate_file_count": baseline.candidate_file_count,
        "indexed_file_count": baseline.indexed_file_count,
        "blocked_file_count": baseline.blocked_file_count,
        "skipped_file_count": baseline.skipped_file_count,
        "total_chunks": baseline.chunk_count,
        "wing_coverage": baseline.wing_coverage,
        "room_coverage": baseline.room_coverage,
        "baseline_path": str(baseline_path),
        "batch_count": baseline.batch_count,
    }

    slog.append(
        paths,
        level="INFO" if run_result.status == "completed" else "WARN",
        event="index",
        release_id=run_result.release_id,
        run_id=run_result.run_id,
        status=run_result.status,
        baseline_path=str(baseline_path),
    )
    print(json.dumps(output, indent=2, ensure_ascii=False))
    return 0 if run_result.status == "completed" else 1


def cmd_search(paths: SidecarPaths) -> int:
    """search_knowledge 检索入口（mcp-readonly-scope.md §3.1）。"""
    from mempalace.tools import search_knowledge

    query = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
    if not query:
        print('{"error": "请提供搜索关键词"}', file=sys.stderr)
        return 1

    client = chromadb.PersistentClient(path=str(paths.chroma))
    result = search_knowledge(client, query)
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
    return 0


def cmd_doc(paths: SidecarPaths) -> int:
    """get_document 文档定位入口（mcp-readonly-scope.md §3.1）。"""
    from mempalace.tools import get_document

    source_path = sys.argv[2] if len(sys.argv) > 2 else ""
    if not source_path:
        print('{"error": "请提供 source_path"}', file=sys.stderr)
        return 1

    section = sys.argv[3] if len(sys.argv) > 3 else None
    client = chromadb.PersistentClient(path=str(paths.chroma))
    result = get_document(client, source_path, section=section)
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
    return 0


def cmd_cite(paths: SidecarPaths) -> int:
    """get_citation_context 引用上下文入口（mcp-readonly-scope.md §3.1）。"""
    from mempalace.tools import get_citation_context

    chunk_id = sys.argv[2] if len(sys.argv) > 2 else ""
    if not chunk_id:
        print('{"error": "请提供 chunk_id"}', file=sys.stderr)
        return 1

    client = chromadb.PersistentClient(path=str(paths.chroma))
    result = get_citation_context(client, chunk_id)
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
    return 0


def _cmd_mcp() -> int:
    """启动 MCP stdio 服务端（mcp-readonly-scope.md §3 的 4 个只读工具）。"""
    from mempalace.mcp_server import main as mcp_main
    mcp_main()
    return 0


def cmd_sources(paths: SidecarPaths) -> int:
    """list_indexed_sources 白名单来源总览入口（mcp-readonly-scope.md §3.1）。"""
    from mempalace.tools import list_indexed_sources

    client = chromadb.PersistentClient(path=str(paths.chroma))
    result = list_indexed_sources(
        client,
        MANIFEST_PATH,
        baselines_dir=paths.baselines,
    )
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
    return 0


def cmd_route(paths: SidecarPaths) -> int:
    """查询路由入口：输出 wing / room / authority gate 计划。"""
    from mempalace.grounding import route_query

    del paths
    query = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
    if not query:
        print('{"error": "请提供查询问题"}', file=sys.stderr)
        return 1

    result = route_query(query)
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
    return 0


def cmd_ground(paths: SidecarPaths) -> int:
    """查询门禁入口：输出可否回答与最小引用集合。"""
    from mempalace.grounding import ground_query

    query = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
    if not query:
        print('{"error": "请提供查询问题"}', file=sys.stderr)
        return 1

    client = chromadb.PersistentClient(path=str(paths.chroma))
    result = ground_query(client, query)
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
    return 0 if result.status == "grounded" else 1


# ---------------------------------------------------------------------------
# 旧版命令（保留向后兼容）
# ---------------------------------------------------------------------------

def cmd_healthcheck_legacy(cfg: SidecarConfig) -> int:
    status = run_healthcheck(cfg)
    print(json.dumps(status.to_dict(), indent=2, ensure_ascii=False))
    return 0 if status.healthy else 1


def cmd_start_legacy(cfg: SidecarConfig) -> int:
    """旧版启动流程：确保目录 → 写 PID → 验证 PersistentClient → 健康检查。"""
    existing_pid = read_pid(cfg.pid_file)
    if existing_pid is not None:
        logger.error("sidecar 已在运行 (pid=%d)，请先停止", existing_pid)
        return 1

    _setup_logging(cfg.logs_dir)
    ensure_directories(cfg)
    write_pid(cfg.pid_file)

    logger.info("mempalace %s 启动中…", MEMPALACE_VERSION)

    client = create_client(cfg)
    col = client.get_or_create_collection(name=cfg.collection_name)
    logger.info("collection '%s' 就绪，文档数=%d", cfg.collection_name, col.count())

    status = run_healthcheck(cfg)
    if not status.healthy:
        logger.error("启动后健康检查失败: %s", status.errors)
        cfg.pid_file.unlink(missing_ok=True)
        return 1

    _write_release_record(cfg)
    logger.info("sidecar 启动完成，健康检查通过")
    print(json.dumps(status.to_dict(), indent=2, ensure_ascii=False))
    return 0


def cmd_stop_legacy(cfg: SidecarConfig) -> int:
    if stop_sidecar(cfg.pid_file):
        print("sidecar 已停止")
        return 0
    print("sidecar 未在运行或停止失败")
    return 1


def _write_release_record(cfg: SidecarConfig) -> None:
    """写入最小版本记录到 runtime/，方便回溯。"""
    try:
        chroma_ver = getattr(chromadb, "__version__", "unknown")
    except Exception:
        chroma_ver = "unknown"

    record = {
        "mempalace_version": MEMPALACE_VERSION,
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "chroma_version": chroma_ver,
        "release_id": f"mempalace-{MEMPALACE_VERSION}-py{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "installed_at": datetime.now(timezone.utc).isoformat(),
    }
    out = cfg.runtime_dir / "release-record.json"
    out.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")


# ---------------------------------------------------------------------------
# CLI 入口
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    """python -m mempalace <command> 入口。"""
    args = argv if argv is not None else sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(_USAGE)
        return 0

    command = args[0]
    paths = resolve_paths()

    dispatch = {
        "health": cmd_health,
        "start": cmd_start,
        "stop": cmd_stop,
        "b0": cmd_b0,
        "index": cmd_index,
        "search": cmd_search,
        "doc": cmd_doc,
        "cite": cmd_cite,
        "sources": cmd_sources,
        "route": cmd_route,
        "ground": cmd_ground,
        "mcp": lambda _paths: _cmd_mcp(),
    }
    handler = dispatch.get(command)
    if handler is None:
        print(f"未知命令: {command}\n{_USAGE}", file=sys.stderr)
        return 1
    return handler(paths)


if __name__ == "__main__":
    raise SystemExit(main())
