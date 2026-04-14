"""
基线记录器 — 按 index-baseline-plan.md §8.2 汇总并落盘索引基线。

从 IndexRunResult 汇总出 run 级别的聚合字段：
  candidate_file_count、indexed_file_count、blocked_file_count、
  skipped_file_count、chunk_count、wing_coverage、room_coverage。
"""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from mempalace.indexer import IndexRunResult


@dataclass
class BaselineRecord:
    """run 级别的聚合基线，面向"能否继续下一批"和"失败后如何恢复"。"""

    run_id: str
    release_id: str
    manifest_version: str
    data_snapshot_id: str
    baseline_plan_version: str

    started_at: str
    finished_at: str
    status: str

    candidate_file_count: int = 0
    indexed_file_count: int = 0
    blocked_file_count: int = 0
    skipped_file_count: int = 0
    chunk_count: int = 0

    wing_coverage: dict[str, int] = field(default_factory=dict)
    room_coverage: dict[str, int] = field(default_factory=dict)

    batch_count: int = 0
    passed_batch_count: int = 0
    failed_batch_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def aggregate_baseline(run_result: IndexRunResult) -> BaselineRecord:
    """从 IndexRunResult 汇总出 BaselineRecord。"""
    wing_agg: Counter[str] = Counter()
    room_agg: Counter[str] = Counter()
    candidate = 0
    indexed = 0
    blocked = 0
    skipped = 0
    chunks = 0
    passed = 0
    failed = 0

    for batch in run_result.batches:
        candidate += batch.candidate_file_count
        indexed += batch.indexed_file_count
        blocked += batch.blocked_file_count
        skipped += batch.skipped_file_count
        chunks += batch.chunk_count
        wing_agg.update(batch.wing_coverage)
        room_agg.update(batch.room_coverage)
        if batch.quality_gate == "passed":
            passed += 1
        else:
            failed += 1

    return BaselineRecord(
        run_id=run_result.run_id,
        release_id=run_result.release_id,
        manifest_version=run_result.manifest_version,
        data_snapshot_id=run_result.data_snapshot_id,
        baseline_plan_version=run_result.baseline_plan_version,
        started_at=run_result.started_at,
        finished_at=run_result.finished_at,
        status=run_result.status,
        candidate_file_count=candidate,
        indexed_file_count=indexed,
        blocked_file_count=blocked,
        skipped_file_count=skipped,
        chunk_count=chunks,
        wing_coverage=dict(wing_agg),
        room_coverage=dict(room_agg),
        batch_count=len(run_result.batches),
        passed_batch_count=passed,
        failed_batch_count=failed,
    )


def save_baseline(record: BaselineRecord, baselines_dir: Path) -> Path:
    """将基线记录落盘到 baselines 目录，返回文件路径。"""
    baselines_dir.mkdir(parents=True, exist_ok=True)
    filename = f"baseline-{record.run_id}.json"
    out = baselines_dir / filename
    out.write_text(
        json.dumps(record.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return out
