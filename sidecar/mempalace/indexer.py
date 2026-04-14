"""
B1-B5 批次索引器：按 index-baseline-plan.md 定义的顺序执行 L1 首轮索引。

每个批次：
  1. 加载 manifest 中对应 source_id 的条目
  2. 枚举文件 → 切块（含 wing/room metadata）
  3. 写入 Chroma collection
  4. 记录批次基线统计（wing/room 覆盖、文件数、chunk 数等）
"""

from __future__ import annotations

import json
import uuid
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import chromadb

from mempalace.chunker import Chunk, chunk_file
from mempalace.config import CHROMA_COLLECTION, SidecarConfig, SidecarPaths
from mempalace.enumerator import EnumeratedFile, enumerate_sources


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _short_uuid() -> str:
    return uuid.uuid4().hex[:8]


BATCH_DEFINITIONS: list[dict[str, Any]] = [
    {
        "batch_id": "B1-p0-core",
        "batch_order": 1,
        "source_ids": ["p0-core-md", "p0-navigation-md"],
        "authority_layer": "L1",
    },
    {
        "batch_id": "B2-p0-artifacts",
        "batch_order": 2,
        "source_ids": ["p0-gate-artifacts"],
        "authority_layer": "L1",
    },
    {
        "batch_id": "B3-p1-core",
        "batch_order": 3,
        "source_ids": ["p1-core-md"],
        "authority_layer": "L1",
    },
    {
        "batch_id": "B4-p1-artifacts",
        "batch_order": 4,
        "source_ids": ["p1-gate-artifacts"],
        "authority_layer": "L1",
    },
    {
        "batch_id": "B5-office-process",
        "batch_order": 5,
        "source_ids": [
            "office-process-md",
            "office-process-scenarios",
            "office-process-config",
        ],
        "authority_layer": "L1",
    },
]


@dataclass
class BatchResult:
    """单批次索引结果。"""

    batch_id: str
    batch_order: int
    source_ids: list[str]
    authority_layer: str
    source_roots: list[str] = field(default_factory=list)
    candidate_file_count: int = 0
    indexed_file_count: int = 0
    blocked_file_count: int = 0
    skipped_file_count: int = 0
    chunk_count: int = 0
    wing_coverage: dict[str, int] = field(default_factory=dict)
    room_coverage: dict[str, int] = field(default_factory=dict)
    quality_gate: str = "pending"
    retry_count: int = 0
    retry_of: str | None = None
    error_class: str | None = None
    pre_batch_snapshot_id: str = ""
    post_batch_snapshot_id: str = ""
    started_at: str = ""
    finished_at: str = ""
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class IndexRunResult:
    """整轮索引运行结果。"""

    run_id: str
    release_id: str
    manifest_version: str
    data_snapshot_id: str
    baseline_plan_version: str = "w11-v1"
    started_at: str = ""
    finished_at: str = ""
    status: str = "running"
    batches: list[BatchResult] = field(default_factory=list)
    total_files: int = 0
    total_chunks: int = 0
    candidate_file_count: int = 0
    indexed_file_count: int = 0
    blocked_file_count: int = 0
    skipped_file_count: int = 0
    wing_coverage: dict[str, int] = field(default_factory=dict)
    room_coverage: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["batches"] = [b.to_dict() for b in self.batches]
        return d

    def aggregate_baselines(self) -> None:
        """从各批次汇总 run 级基线统计。"""
        self.candidate_file_count = 0
        self.indexed_file_count = 0
        self.blocked_file_count = 0
        self.skipped_file_count = 0
        wing_agg: Counter[str] = Counter()
        room_agg: Counter[str] = Counter()

        for b in self.batches:
            self.candidate_file_count += b.candidate_file_count
            self.indexed_file_count += b.indexed_file_count
            self.blocked_file_count += b.blocked_file_count
            self.skipped_file_count += b.skipped_file_count
            wing_agg.update(b.wing_coverage)
            room_agg.update(b.room_coverage)

        self.wing_coverage = dict(wing_agg)
        self.room_coverage = dict(room_agg)


def _filter_files_for_batch(
    all_files: list[EnumeratedFile],
    source_ids: set[str],
) -> list[EnumeratedFile]:
    """只保留属于当前批次 source_id 的文件。"""
    return [f for f in all_files if f.source_id in source_ids]


def _ingest_batch(
    batch_def: dict[str, Any],
    all_files: list[EnumeratedFile],
    collection: chromadb.Collection,
) -> BatchResult:
    """执行单批次：筛选文件 → 切块 → 写入 Chroma → 统计。"""
    result = BatchResult(
        batch_id=batch_def["batch_id"],
        batch_order=batch_def["batch_order"],
        source_ids=batch_def["source_ids"],
        authority_layer=batch_def["authority_layer"],
        pre_batch_snapshot_id=f"snap-pre-{batch_def['batch_id']}-{_short_uuid()}",
        started_at=_now_iso(),
    )

    source_id_set = set(batch_def["source_ids"])
    batch_files = _filter_files_for_batch(all_files, source_id_set)
    result.candidate_file_count = len(batch_files)
    result.source_roots = sorted(
        {str(Path(f.relative).parts[0]) for f in batch_files if f.relative}
    )

    if not batch_files:
        result.quality_gate = "passed"
        result.finished_at = _now_iso()
        result.post_batch_snapshot_id = f"snap-post-{batch_def['batch_id']}-{_short_uuid()}"
        return result

    wing_counter: Counter[str] = Counter()
    room_counter: Counter[str] = Counter()
    all_chunks: list[Chunk] = []
    indexed_files = 0

    for ef in batch_files:
        chunks = chunk_file(ef)
        if not chunks:
            result.skipped_file_count += 1
            continue

        indexed_files += 1
        all_chunks.extend(chunks)

        for c in chunks:
            w = c.metadata.wing or "(none)"
            wing_counter[w] += 1
            r = c.metadata.room or "(unclassified)"
            room_counter[r] += 1

    result.indexed_file_count = indexed_files
    result.chunk_count = len(all_chunks)
    result.wing_coverage = dict(wing_counter)
    result.room_coverage = dict(room_counter)

    if all_chunks:
        _write_to_chroma(collection, all_chunks)

    result.quality_gate = "passed"
    result.finished_at = _now_iso()
    result.post_batch_snapshot_id = f"snap-post-{batch_def['batch_id']}-{_short_uuid()}"
    return result


def _write_to_chroma(
    collection: chromadb.Collection,
    chunks: list[Chunk],
) -> None:
    """批量写入 chunks 到 Chroma collection。"""
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        ids = [c.metadata.chunk_id for c in batch]
        documents = [c.text for c in batch]
        metadatas = [c.metadata.to_dict() for c in batch]
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)


def run_l1_indexing(
    cfg: SidecarConfig,
    paths: SidecarPaths,
    run_id: str,
    release_id: str,
    manifest_version: str,
    data_snapshot_id: str,
) -> IndexRunResult:
    """执行 B1-B5 首轮 L1 索引全流程。"""
    run_result = IndexRunResult(
        run_id=run_id,
        release_id=release_id,
        manifest_version=manifest_version,
        data_snapshot_id=data_snapshot_id,
        started_at=_now_iso(),
    )

    enum_result = enumerate_sources(cfg)
    all_files = enum_result.files

    client = chromadb.PersistentClient(path=str(paths.chroma))
    collection = client.get_or_create_collection(name=CHROMA_COLLECTION)

    for batch_def in BATCH_DEFINITIONS:
        batch_result = _ingest_batch(batch_def, all_files, collection)
        run_result.batches.append(batch_result)
        run_result.total_files += batch_result.indexed_file_count
        run_result.total_chunks += batch_result.chunk_count

        if batch_result.quality_gate != "passed":
            run_result.status = "failed"
            run_result.finished_at = _now_iso()
            run_result.aggregate_baselines()
            return run_result

    run_result.status = "completed"
    run_result.finished_at = _now_iso()
    run_result.aggregate_baselines()
    return run_result


def save_run_result(result: IndexRunResult, baselines_dir: Path) -> Path:
    """将索引运行结果落盘到 baselines 目录。"""
    baselines_dir.mkdir(parents=True, exist_ok=True)
    filename = f"l1-index-{result.run_id}.json"
    out = baselines_dir / filename
    out.write_text(
        json.dumps(result.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return out
