"""baseline 测试 — 验证 run 级别聚合和落盘。"""

from __future__ import annotations

import json
from pathlib import Path

from mempalace.baseline import BaselineRecord, aggregate_baseline, save_baseline
from mempalace.indexer import BatchResult, IndexRunResult


def _make_batch(
    batch_id: str,
    candidate: int = 3,
    indexed: int = 2,
    blocked: int = 0,
    skipped: int = 1,
    chunks: int = 5,
    wing_cov: dict[str, int] | None = None,
    room_cov: dict[str, int] | None = None,
    gate: str = "passed",
) -> BatchResult:
    return BatchResult(
        batch_id=batch_id,
        batch_order=1,
        source_ids=["src-a"],
        authority_layer="L1",
        candidate_file_count=candidate,
        indexed_file_count=indexed,
        blocked_file_count=blocked,
        skipped_file_count=skipped,
        chunk_count=chunks,
        wing_coverage=wing_cov or {},
        room_coverage=room_cov or {},
        quality_gate=gate,
        started_at="2026-01-01T00:00:00+00:00",
        finished_at="2026-01-01T00:01:00+00:00",
    )


def _make_run(*batches: BatchResult) -> IndexRunResult:
    return IndexRunResult(
        run_id="run-test-agg",
        release_id="mempalace-0.1.0-py3.14.3",
        manifest_version="v0.1.0",
        data_snapshot_id="snap-test",
        started_at="2026-01-01T00:00:00+00:00",
        finished_at="2026-01-01T00:05:00+00:00",
        status="completed",
        batches=list(batches),
        total_files=sum(b.indexed_file_count for b in batches),
        total_chunks=sum(b.chunk_count for b in batches),
    )


class TestAggregateBaseline:
    def test_sums_counts(self):
        b1 = _make_batch("B1", candidate=4, indexed=3, blocked=1, skipped=0, chunks=8)
        b2 = _make_batch("B2", candidate=2, indexed=1, blocked=0, skipped=1, chunks=3)
        run = _make_run(b1, b2)

        record = aggregate_baseline(run)

        assert record.candidate_file_count == 6
        assert record.indexed_file_count == 4
        assert record.blocked_file_count == 1
        assert record.skipped_file_count == 1
        assert record.chunk_count == 11

    def test_merges_wing_coverage(self):
        b1 = _make_batch("B1", wing_cov={"gyoseishoshi-p0": 5, "gyoseishoshi-p1": 2})
        b2 = _make_batch("B2", wing_cov={"gyoseishoshi-p0": 3, "office-process": 1})
        run = _make_run(b1, b2)

        record = aggregate_baseline(run)

        assert record.wing_coverage["gyoseishoshi-p0"] == 8
        assert record.wing_coverage["gyoseishoshi-p1"] == 2
        assert record.wing_coverage["office-process"] == 1

    def test_merges_room_coverage(self):
        b1 = _make_batch("B1", room_cov={"state-machine": 3, "field-ownership": 2})
        b2 = _make_batch("B2", room_cov={"state-machine": 1, "biz-mgmt": 4})
        run = _make_run(b1, b2)

        record = aggregate_baseline(run)

        assert record.room_coverage["state-machine"] == 4
        assert record.room_coverage["field-ownership"] == 2
        assert record.room_coverage["biz-mgmt"] == 4

    def test_counts_passed_failed_batches(self):
        b1 = _make_batch("B1", gate="passed")
        b2 = _make_batch("B2", gate="failed")
        b3 = _make_batch("B3", gate="passed")
        run = _make_run(b1, b2, b3)

        record = aggregate_baseline(run)

        assert record.batch_count == 3
        assert record.passed_batch_count == 2
        assert record.failed_batch_count == 1

    def test_preserves_run_metadata(self):
        run = _make_run(_make_batch("B1"))
        record = aggregate_baseline(run)

        assert record.run_id == "run-test-agg"
        assert record.release_id == "mempalace-0.1.0-py3.14.3"
        assert record.manifest_version == "v0.1.0"
        assert record.baseline_plan_version == "w11-v1"
        assert record.status == "completed"

    def test_empty_run(self):
        run = _make_run()
        record = aggregate_baseline(run)

        assert record.candidate_file_count == 0
        assert record.chunk_count == 0
        assert record.wing_coverage == {}
        assert record.room_coverage == {}
        assert record.batch_count == 0


class TestSaveBaseline:
    def test_saves_and_roundtrips(self, tmp_path: Path):
        run = _make_run(
            _make_batch("B1", wing_cov={"gyoseishoshi-p0": 5},
                        room_cov={"state-machine": 3}),
        )
        record = aggregate_baseline(run)
        out = save_baseline(record, tmp_path / "baselines")

        assert out.exists()
        assert out.name == "baseline-run-test-agg.json"

        data = json.loads(out.read_text(encoding="utf-8"))
        assert data["run_id"] == "run-test-agg"
        assert data["candidate_file_count"] == 3
        assert data["indexed_file_count"] == 2
        assert data["room_coverage"]["state-machine"] == 3
        assert data["wing_coverage"]["gyoseishoshi-p0"] == 5
        assert data["batch_count"] == 1
        assert data["passed_batch_count"] == 1

    def test_to_dict_matches_json(self):
        run = _make_run(_make_batch("B1"))
        record = aggregate_baseline(run)
        d = record.to_dict()
        assert d["run_id"] == record.run_id
        assert d["candidate_file_count"] == record.candidate_file_count
