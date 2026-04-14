"""indexer 测试 — B1-B5 批次索引、Chroma 写入和基线记录。"""

from __future__ import annotations

import json
from pathlib import Path

import chromadb
import pytest

from mempalace.config import CHROMA_COLLECTION, SidecarConfig, SidecarPaths
from mempalace.enumerator import EnumeratedFile
from mempalace.indexer import (
    BATCH_DEFINITIONS,
    BatchResult,
    IndexRunResult,
    _filter_files_for_batch,
    _ingest_batch,
    _write_to_chroma,
    run_l1_indexing,
    save_run_result,
)


def _write(path: Path, content: str = "") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


MANIFEST_WITH_SOURCES = {
    "manifest_version": "v0.1.0",
    "phase": "phase1_internal_knowledge_only",
    "default_policy": "deny_by_default",
    "enabled_scope": [],
    "reserved_scope": [],
    "source_entries": [
        {
            "source_id": "p0-core-md",
            "phase1_mode": "enabled",
            "authority_layer": "L1",
            "classification": "C1-Direct-Allow",
            "include_globs": ["docs/P0/*.md", "docs/P0/**/*.md"],
            "include_ext": [".md"],
            "exclude_globs": [],
            "retrieval_weight": 1.0,
            "usage_rule": "P0 权威正文",
            "wing": "gyoseishoshi-p0",
        },
        {
            "source_id": "p0-navigation-md",
            "phase1_mode": "enabled",
            "authority_layer": "L1",
            "classification": "C2-Scoped-Allow",
            "include_globs": ["docs/P0/nav.md"],
            "include_ext": [".md"],
            "exclude_globs": [],
            "retrieval_weight": 0.70,
            "usage_rule": "导航",
            "wing": "gyoseishoshi-p0",
        },
        {
            "source_id": "compiled-output-buffer",
            "phase1_mode": "disabled_reserved",
            "authority_layer": "L2",
            "classification": "C2-Scoped-Allow",
            "include_globs": ["docs/_output/**/*.md"],
            "include_ext": [".md"],
            "exclude_globs": [],
            "retrieval_weight": 0.60,
            "usage_rule": "reserved",
            "wing": None,
        },
    ],
}


def _setup_repo(tmp_path: Path) -> tuple[SidecarConfig, SidecarPaths]:
    """创建带测试文档的模拟仓库。"""
    _write(
        tmp_path / "docs" / "P0" / "01-overview.md",
        "# 概述\n\n案件阶段 Case.stage 从 S1 推进到 S9 的状态流转。",
    )
    _write(
        tmp_path / "docs" / "P0" / "02-fields.md",
        "# 字段归属\n\nCustomer 实体与 Case 的 extra_fields 字段归属。",
    )
    _write(
        tmp_path / "docs" / "P0" / "nav.md",
        "# 导航\n\n[概述](01-overview.md) | [字段](02-fields.md)",
    )
    _write(
        tmp_path / "docs" / "_output" / "notes.md",
        "# Reserved\n\n不应进入 B1-B5。",
    )

    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(
        json.dumps(MANIFEST_WITH_SOURCES), encoding="utf-8"
    )

    cfg = SidecarConfig(
        repo_root=tmp_path,
        manifest_path=manifest_path,
        data_dir=tmp_path / "data",
        logs_dir=tmp_path / "logs",
        backups_dir=tmp_path / "backups",
        runtime_dir=tmp_path / "runtime",
        pid_file=tmp_path / "runtime" / "mempalace.pid",
    )
    paths = SidecarPaths(root=tmp_path)
    paths.chroma.mkdir(parents=True, exist_ok=True)
    paths.baselines.mkdir(parents=True, exist_ok=True)
    paths.logs.mkdir(parents=True, exist_ok=True)
    return cfg, paths


class TestBatchDefinitions:
    def test_five_batches(self):
        assert len(BATCH_DEFINITIONS) == 5

    def test_all_l1(self):
        for b in BATCH_DEFINITIONS:
            assert b["authority_layer"] == "L1"

    def test_no_output_or_raw(self):
        all_ids = {sid for b in BATCH_DEFINITIONS for sid in b["source_ids"]}
        assert "compiled-output-buffer" not in all_ids
        assert "raw-input-buffer" not in all_ids

    def test_ordered(self):
        orders = [b["batch_order"] for b in BATCH_DEFINITIONS]
        assert orders == sorted(orders)


class TestFilterFiles:
    def test_filters_by_source_id(self, tmp_path: Path):
        f1 = EnumeratedFile(
            path=tmp_path / "a.md", relative="a.md",
            source_id="p0-core-md", authority_layer="L1",
            classification="C1-Direct-Allow", retrieval_weight=1.0,
            wing="gyoseishoshi-p0",
        )
        f2 = EnumeratedFile(
            path=tmp_path / "b.md", relative="b.md",
            source_id="p1-core-md", authority_layer="L1",
            classification="C1-Direct-Allow", retrieval_weight=0.98,
            wing="gyoseishoshi-p1",
        )
        result = _filter_files_for_batch([f1, f2], {"p0-core-md"})
        assert len(result) == 1
        assert result[0].source_id == "p0-core-md"


class TestWriteToChroma:
    def test_upserts_chunks(self, tmp_path: Path):
        from mempalace.chunker import Chunk, ChunkMetadata

        client = chromadb.PersistentClient(path=str(tmp_path / "chroma"))
        col = client.get_or_create_collection(name="test")

        chunks = [
            Chunk(
                text="案件阶段 S1 到 S9",
                metadata=ChunkMetadata(
                    chunk_id="abc123",
                    source_id="p0-core-md",
                    source_path="test.md",
                    authority_layer="L1",
                    classification="C1-Direct-Allow",
                    retrieval_weight=1.0,
                    wing="gyoseishoshi-p0",
                    room="state-machine",
                    title="Test",
                    section_heading="概述",
                    chunk_index=0,
                    total_chunks=1,
                ),
            )
        ]
        _write_to_chroma(col, chunks)
        assert col.count() == 1

        result = col.get(ids=["abc123"], include=["metadatas", "documents"])
        assert result["documents"][0] == "案件阶段 S1 到 S9"
        assert result["metadatas"][0]["wing"] == "gyoseishoshi-p0"


class TestIngestBatch:
    def test_b1_indexes_p0_files(self, tmp_path: Path):
        cfg, paths = _setup_repo(tmp_path)
        from mempalace.enumerator import enumerate_sources

        all_files = enumerate_sources(cfg).files
        client = chromadb.PersistentClient(path=str(paths.chroma))
        col = client.get_or_create_collection(name=CHROMA_COLLECTION)

        batch_result = _ingest_batch(BATCH_DEFINITIONS[0], all_files, col)
        assert batch_result.batch_id == "B1-p0-core"
        assert batch_result.indexed_file_count > 0
        assert batch_result.chunk_count > 0
        assert batch_result.quality_gate == "passed"
        assert col.count() > 0

    def test_b1_records_source_roots(self, tmp_path: Path):
        cfg, paths = _setup_repo(tmp_path)
        from mempalace.enumerator import enumerate_sources

        all_files = enumerate_sources(cfg).files
        client = chromadb.PersistentClient(path=str(paths.chroma))
        col = client.get_or_create_collection(name=CHROMA_COLLECTION)

        batch_result = _ingest_batch(BATCH_DEFINITIONS[0], all_files, col)
        assert isinstance(batch_result.source_roots, list)
        assert len(batch_result.source_roots) > 0
        assert "docs" in batch_result.source_roots

    def test_empty_batch_passes(self, tmp_path: Path):
        client = chromadb.PersistentClient(path=str(tmp_path / "chroma"))
        col = client.get_or_create_collection(name="test")
        batch_result = _ingest_batch(
            {"batch_id": "B4-p1-artifacts", "batch_order": 4,
             "source_ids": ["p1-gate-artifacts"], "authority_layer": "L1"},
            [],
            col,
        )
        assert batch_result.quality_gate == "passed"
        assert batch_result.indexed_file_count == 0
        assert batch_result.source_roots == []


class TestRunL1Indexing:
    def test_full_run(self, tmp_path: Path):
        cfg, paths = _setup_repo(tmp_path)
        result = run_l1_indexing(
            cfg, paths,
            run_id="run-test-001",
            release_id="mempalace-0.1.0-py3.14.3",
            manifest_version="v0.1.0",
            data_snapshot_id="snap-test",
        )
        assert result.status == "completed"
        assert len(result.batches) == 5
        assert result.total_chunks > 0
        assert result.total_files > 0

        b1 = result.batches[0]
        assert b1.batch_id == "B1-p0-core"
        assert b1.indexed_file_count > 0

    def test_run_aggregates_baselines(self, tmp_path: Path):
        cfg, paths = _setup_repo(tmp_path)
        result = run_l1_indexing(
            cfg, paths,
            run_id="run-test-agg",
            release_id="mempalace-0.1.0-py3.14.3",
            manifest_version="v0.1.0",
            data_snapshot_id="snap-test",
        )
        assert result.candidate_file_count >= result.indexed_file_count
        assert result.indexed_file_count == result.total_files
        assert isinstance(result.wing_coverage, dict)
        assert isinstance(result.room_coverage, dict)
        assert len(result.wing_coverage) > 0

    def test_excludes_reserved(self, tmp_path: Path):
        cfg, paths = _setup_repo(tmp_path)
        result = run_l1_indexing(
            cfg, paths,
            run_id="run-test-002",
            release_id="test",
            manifest_version="v0.1.0",
            data_snapshot_id="snap-test",
        )
        all_source_ids = set()
        for b in result.batches:
            all_source_ids.update(b.source_ids)
        assert "compiled-output-buffer" not in all_source_ids
        assert "raw-input-buffer" not in all_source_ids


class TestAggregateBaselines:
    def test_sums_file_counts(self):
        b1 = BatchResult(
            batch_id="B1", batch_order=1,
            source_ids=["s1"], authority_layer="L1",
            candidate_file_count=10, indexed_file_count=8,
            blocked_file_count=1, skipped_file_count=1,
            wing_coverage={"w-a": 5}, room_coverage={"r-x": 3, "r-y": 2},
        )
        b2 = BatchResult(
            batch_id="B2", batch_order=2,
            source_ids=["s2"], authority_layer="L1",
            candidate_file_count=6, indexed_file_count=4,
            blocked_file_count=0, skipped_file_count=2,
            wing_coverage={"w-a": 2, "w-b": 3},
            room_coverage={"r-x": 1, "r-z": 4},
        )
        run = IndexRunResult(
            run_id="r", release_id="rel",
            manifest_version="v1", data_snapshot_id="snap",
            batches=[b1, b2],
        )
        run.aggregate_baselines()

        assert run.candidate_file_count == 16
        assert run.indexed_file_count == 12
        assert run.blocked_file_count == 1
        assert run.skipped_file_count == 3
        assert run.wing_coverage == {"w-a": 7, "w-b": 3}
        assert run.room_coverage == {"r-x": 4, "r-y": 2, "r-z": 4}

    def test_empty_batches(self):
        run = IndexRunResult(
            run_id="r", release_id="rel",
            manifest_version="v1", data_snapshot_id="snap",
        )
        run.aggregate_baselines()
        assert run.candidate_file_count == 0
        assert run.wing_coverage == {}
        assert run.room_coverage == {}


class TestBaselineFieldsSerialization:
    def test_batch_result_includes_source_roots_and_retry_of(self):
        b = BatchResult(
            batch_id="B1", batch_order=1,
            source_ids=["s1"], authority_layer="L1",
            source_roots=["docs"],
            retry_of="run-prev-001",
        )
        d = b.to_dict()
        assert d["source_roots"] == ["docs"]
        assert d["retry_of"] == "run-prev-001"

    def test_run_result_includes_aggregated_baselines(self):
        run = IndexRunResult(
            run_id="r", release_id="rel",
            manifest_version="v1", data_snapshot_id="snap",
            candidate_file_count=5, indexed_file_count=3,
            wing_coverage={"w-a": 2},
            room_coverage={"r-x": 1},
        )
        d = run.to_dict()
        assert d["candidate_file_count"] == 5
        assert d["indexed_file_count"] == 3
        assert d["wing_coverage"] == {"w-a": 2}
        assert d["room_coverage"] == {"r-x": 1}


class TestSaveRunResult:
    def test_saves_json(self, tmp_path: Path):
        result = IndexRunResult(
            run_id="run-test",
            release_id="r-test",
            manifest_version="v0.1.0",
            data_snapshot_id="snap-test",
            status="completed",
        )
        out = save_run_result(result, tmp_path / "baselines")
        assert out.exists()
        data = json.loads(out.read_text())
        assert data["run_id"] == "run-test"
        assert data["status"] == "completed"

    def test_baseline_contains_all_required_run_fields(self, tmp_path: Path):
        """index-baseline-plan.md §8.2 run 级最小字段集合。"""
        cfg, paths = _setup_repo(tmp_path)
        result = run_l1_indexing(
            cfg, paths,
            run_id="run-fields-check",
            release_id="mempalace-0.1.0-py3.14.3",
            manifest_version="v0.1.0",
            data_snapshot_id="snap-fields",
        )
        out = save_run_result(result, tmp_path / "baselines")
        data = json.loads(out.read_text())

        run_required = [
            "run_id", "baseline_plan_version", "manifest_version",
            "release_id", "data_snapshot_id",
            "started_at", "finished_at", "status",
            "candidate_file_count", "indexed_file_count",
            "blocked_file_count", "skipped_file_count",
            "wing_coverage", "room_coverage",
        ]
        for key in run_required:
            assert key in data, f"run 级基线缺少 {key}"

    def test_baseline_contains_all_required_batch_fields(self, tmp_path: Path):
        """index-baseline-plan.md §8.2 batch 级最小字段集合。"""
        cfg, paths = _setup_repo(tmp_path)
        result = run_l1_indexing(
            cfg, paths,
            run_id="run-batch-fields",
            release_id="mempalace-0.1.0-py3.14.3",
            manifest_version="v0.1.0",
            data_snapshot_id="snap-batch",
        )
        out = save_run_result(result, tmp_path / "baselines")
        data = json.loads(out.read_text())

        batch_required = [
            "batch_id", "batch_order", "source_ids", "authority_layer",
            "source_roots",
            "candidate_file_count", "indexed_file_count",
            "blocked_file_count", "skipped_file_count",
            "chunk_count", "wing_coverage", "room_coverage",
            "quality_gate", "retry_count", "retry_of",
            "error_class",
            "pre_batch_snapshot_id", "post_batch_snapshot_id",
        ]
        for batch in data["batches"]:
            for key in batch_required:
                assert key in batch, f"batch 级基线缺少 {key}"

    def test_saves_aggregated_baselines(self, tmp_path: Path):
        b = BatchResult(
            batch_id="B1", batch_order=1,
            source_ids=["s1"], authority_layer="L1",
            source_roots=["docs"],
            candidate_file_count=4, indexed_file_count=3,
            wing_coverage={"w-a": 2}, room_coverage={"r-x": 1},
        )
        result = IndexRunResult(
            run_id="run-baseline",
            release_id="r-test",
            manifest_version="v0.1.0",
            data_snapshot_id="snap-test",
            status="completed",
            batches=[b],
        )
        result.aggregate_baselines()
        out = save_run_result(result, tmp_path / "baselines")
        data = json.loads(out.read_text())
        assert data["candidate_file_count"] == 4
        assert data["indexed_file_count"] == 3
        assert data["wing_coverage"] == {"w-a": 2}
        assert data["room_coverage"] == {"r-x": 1}
        assert data["batches"][0]["source_roots"] == ["docs"]
        assert data["batches"][0]["retry_of"] is None
