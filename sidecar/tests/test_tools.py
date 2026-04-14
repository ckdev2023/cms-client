"""tools 测试 — search_knowledge / get_document / get_citation_context / list_indexed_sources。"""

from __future__ import annotations

import json
from pathlib import Path

import chromadb
import pytest

from mempalace.tools import (
    CitationContext,
    DocumentResult,
    IndexedSourcesResult,
    SearchResult,
    SourceInfo,
    get_citation_context,
    get_document,
    list_indexed_sources,
    search_knowledge,
)

COLLECTION = "test_tools"


def _seed_collection(tmp_path: Path) -> chromadb.ClientAPI:
    """创建并填充测试用 Chroma collection。"""
    client = chromadb.PersistentClient(path=str(tmp_path / "chroma"))
    col = client.get_or_create_collection(name=COLLECTION)

    col.upsert(
        ids=["chunk-a0", "chunk-a1", "chunk-a2"],
        documents=[
            "案件阶段 Case.stage 从 S1 推进到 S9 的状态流转规则。",
            "S1 受理阶段的前置校验：Gate-A 必须满足客户信息完整性。",
            "S9 完了阶段的后置清理：归档并发送完了通知。",
        ],
        metadatas=[
            {
                "source_path": "docs/P0/01-state-machine.md",
                "authority_layer": "L1",
                "wing": "gyoseishoshi-p0",
                "room": "state-machine",
                "title": "状态机",
                "section_heading": "概述",
                "chunk_index": 0,
                "total_chunks": 3,
                "source_id": "p0-core-md",
                "classification": "C1-Direct-Allow",
                "retrieval_weight": 1.0,
            },
            {
                "source_path": "docs/P0/01-state-machine.md",
                "authority_layer": "L1",
                "wing": "gyoseishoshi-p0",
                "room": "state-machine",
                "title": "状态机",
                "section_heading": "S1 受理",
                "chunk_index": 1,
                "total_chunks": 3,
                "source_id": "p0-core-md",
                "classification": "C1-Direct-Allow",
                "retrieval_weight": 1.0,
            },
            {
                "source_path": "docs/P0/01-state-machine.md",
                "authority_layer": "L1",
                "wing": "gyoseishoshi-p0",
                "room": "state-machine",
                "title": "状态机",
                "section_heading": "S9 完了",
                "chunk_index": 2,
                "total_chunks": 3,
                "source_id": "p0-core-md",
                "classification": "C1-Direct-Allow",
                "retrieval_weight": 1.0,
            },
        ],
    )

    col.upsert(
        ids=["chunk-b0"],
        documents=["经营管理签证 Step 1 到 Step 10 的完整流程。"],
        metadatas=[
            {
                "source_path": "docs/P1/01-biz-mgmt.md",
                "authority_layer": "L1",
                "wing": "gyoseishoshi-p1",
                "room": "biz-mgmt",
                "title": "经营管理签",
                "section_heading": "流程",
                "chunk_index": 0,
                "total_chunks": 1,
                "source_id": "p1-core-md",
                "classification": "C1-Direct-Allow",
                "retrieval_weight": 0.98,
            },
        ],
    )
    return client


# ── search_knowledge ─────────────────────────────────────────────────────


class TestSearchKnowledge:
    def test_returns_hits_with_required_fields(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = search_knowledge(client, "案件阶段", collection_name=COLLECTION)

        assert isinstance(result, SearchResult)
        assert result.total > 0

        hit = result.hits[0]
        assert hit.source_path != ""
        assert hit.source_layer != ""
        assert hit.snippet != ""
        assert hit.chunk_id != ""

    def test_snippet_is_truncated(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = search_knowledge(client, "案件", collection_name=COLLECTION)
        for hit in result.hits:
            assert len(hit.snippet) <= 500

    def test_wing_filter(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = search_knowledge(
            client, "流程",
            wing_filter="gyoseishoshi-p1",
            collection_name=COLLECTION,
        )
        assert result.total > 0
        for hit in result.hits:
            assert hit.wing == "gyoseishoshi-p1"

    def test_room_filter(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = search_knowledge(
            client, "案件状态",
            room_filter="state-machine",
            collection_name=COLLECTION,
        )
        assert result.total > 0
        for hit in result.hits:
            assert hit.room == "state-machine"

    def test_combined_filter(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = search_knowledge(
            client, "签证",
            wing_filter="gyoseishoshi-p1",
            room_filter="biz-mgmt",
            collection_name=COLLECTION,
        )
        assert result.total > 0
        for hit in result.hits:
            assert hit.wing == "gyoseishoshi-p1"
            assert hit.room == "biz-mgmt"

    def test_empty_collection(self, tmp_path: Path):
        client = chromadb.PersistentClient(path=str(tmp_path / "empty"))
        result = search_knowledge(
            client, "anything", collection_name="empty_col"
        )
        assert result.total == 0
        assert result.hits == []

    def test_n_results_limit(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = search_knowledge(
            client, "阶段", n_results=2, collection_name=COLLECTION
        )
        assert len(result.hits) <= 2

    def test_to_dict(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = search_knowledge(client, "案件", collection_name=COLLECTION)
        d = result.to_dict()
        assert "query" in d
        assert "total" in d
        assert "hits" in d
        assert isinstance(d["hits"], list)
        if d["hits"]:
            h = d["hits"][0]
            assert "source_path" in h
            assert "source_layer" in h
            assert "snippet" in h

    def test_score_non_negative(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = search_knowledge(client, "案件阶段", collection_name=COLLECTION)
        for hit in result.hits:
            assert hit.score >= 0.0


# ── get_document ─────────────────────────────────────────────────────────


class TestGetDocument:
    def test_returns_all_chunks_for_path(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_document(
            client, "docs/P0/01-state-machine.md", collection_name=COLLECTION
        )

        assert isinstance(result, DocumentResult)
        assert result.source_path == "docs/P0/01-state-machine.md"
        assert result.total_chunks == 3
        assert len(result.chunks) == 3

    def test_chunks_ordered_by_index(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_document(
            client, "docs/P0/01-state-machine.md", collection_name=COLLECTION
        )
        indices = [c.chunk_index for c in result.chunks]
        assert indices == sorted(indices)

    def test_section_filter(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_document(
            client, "docs/P0/01-state-machine.md",
            section="S1 受理",
            collection_name=COLLECTION,
        )
        assert result.total_chunks == 1
        assert result.chunks[0].section_heading == "S1 受理"

    def test_nonexistent_path_returns_empty(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_document(
            client, "does/not/exist.md", collection_name=COLLECTION
        )
        assert result.total_chunks == 0
        assert result.chunks == []

    def test_chunk_fields(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_document(
            client, "docs/P1/01-biz-mgmt.md", collection_name=COLLECTION
        )
        assert result.total_chunks == 1
        chunk = result.chunks[0]
        assert chunk.source_layer == "L1"
        assert chunk.title == "经营管理签"
        assert "经营管理签证" in chunk.text

    def test_to_dict(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_document(
            client, "docs/P0/01-state-machine.md", collection_name=COLLECTION
        )
        d = result.to_dict()
        assert d["source_path"] == "docs/P0/01-state-machine.md"
        assert d["total_chunks"] == 3
        assert len(d["chunks"]) == 3


# ── get_citation_context ─────────────────────────────────────────────────


class TestGetCitationContext:
    def test_returns_anchor_and_neighbors(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_citation_context(
            client, "chunk-a1", context_window=1, collection_name=COLLECTION
        )

        assert isinstance(result, CitationContext)
        assert result.anchor_chunk_id == "chunk-a1"
        assert result.source_path == "docs/P0/01-state-machine.md"
        assert len(result.chunks) == 3

        ids = [c.chunk_id for c in result.chunks]
        assert "chunk-a0" in ids
        assert "chunk-a1" in ids
        assert "chunk-a2" in ids

    def test_first_chunk_has_no_previous(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_citation_context(
            client, "chunk-a0", context_window=1, collection_name=COLLECTION
        )
        indices = [c.chunk_index for c in result.chunks]
        assert 0 in indices
        assert 1 in indices
        assert min(indices) == 0

    def test_last_chunk_has_no_next(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_citation_context(
            client, "chunk-a2", context_window=1, collection_name=COLLECTION
        )
        indices = [c.chunk_index for c in result.chunks]
        assert 1 in indices
        assert 2 in indices
        assert max(indices) == 2

    def test_wider_window(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_citation_context(
            client, "chunk-a1", context_window=5, collection_name=COLLECTION
        )
        assert len(result.chunks) == 3

    def test_nonexistent_chunk(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_citation_context(
            client, "nonexistent", collection_name=COLLECTION
        )
        assert result.source_path == ""
        assert result.chunks == []

    def test_chunks_ordered(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_citation_context(
            client, "chunk-a1", context_window=1, collection_name=COLLECTION
        )
        indices = [c.chunk_index for c in result.chunks]
        assert indices == sorted(indices)

    def test_to_dict(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_citation_context(
            client, "chunk-a1", collection_name=COLLECTION
        )
        d = result.to_dict()
        assert d["anchor_chunk_id"] == "chunk-a1"
        assert d["source_path"] == "docs/P0/01-state-machine.md"
        assert isinstance(d["chunks"], list)

    def test_single_chunk_document(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        result = get_citation_context(
            client, "chunk-b0", context_window=1, collection_name=COLLECTION
        )
        assert result.anchor_chunk_id == "chunk-b0"
        assert len(result.chunks) == 1
        assert result.chunks[0].chunk_id == "chunk-b0"


# ── list_indexed_sources ─────────────────────────────────────────────────

_MINI_MANIFEST = {
    "manifest_version": "v0.1.0-test",
    "source_entries": [
        {
            "source_id": "p0-core-md",
            "phase1_mode": "enabled",
            "authority_layer": "L1",
            "classification": "C1-Direct-Allow",
            "include_globs": ["docs/P0/*.md"],
            "include_ext": [".md"],
            "refresh_policy": "incremental_on_merge_plus_weekly_full",
            "retrieval_weight": 1.0,
            "usage_rule": "test",
            "wing": "gyoseishoshi-p0",
        },
        {
            "source_id": "p1-core-md",
            "phase1_mode": "enabled",
            "authority_layer": "L1",
            "classification": "C1-Direct-Allow",
            "include_globs": ["docs/P1/*.md"],
            "include_ext": [".md"],
            "refresh_policy": "incremental_on_merge_plus_weekly_full",
            "retrieval_weight": 0.98,
            "usage_rule": "test",
            "wing": "gyoseishoshi-p1",
        },
        {
            "source_id": "raw-input-buffer",
            "phase1_mode": "disabled_reserved",
            "authority_layer": "L3",
            "classification": "C3-Desensitize-Candidate",
            "include_globs": ["docs/_raw/**/*.md"],
            "include_ext": [".md"],
            "refresh_policy": "reserved_manual_only",
            "retrieval_weight": 0.20,
            "usage_rule": "test",
            "wing": None,
        },
    ],
}


def _write_manifest(tmp_path: Path) -> Path:
    manifest_file = tmp_path / "manifest.json"
    manifest_file.write_text(json.dumps(_MINI_MANIFEST), encoding="utf-8")
    return manifest_file


def _write_baseline(baselines_dir: Path, *, run_id: str = "run-001") -> Path:
    baselines_dir.mkdir(parents=True, exist_ok=True)
    baseline = {
        "run_id": run_id,
        "release_id": "test-release",
        "manifest_version": "v0.1.0-test",
        "data_snapshot_id": "snap-test",
        "started_at": "2026-04-12T00:00:00+00:00",
        "finished_at": "2026-04-12T01:00:00+00:00",
        "status": "completed",
    }
    out = baselines_dir / f"baseline-{run_id}.json"
    out.write_text(json.dumps(baseline), encoding="utf-8")
    return out


class TestListIndexedSources:
    def test_returns_all_manifest_entries(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        manifest_file = _write_manifest(tmp_path)
        baselines_dir = tmp_path / "baselines"
        _write_baseline(baselines_dir)

        result = list_indexed_sources(
            client, manifest_file, baselines_dir, collection_name=COLLECTION
        )

        assert isinstance(result, IndexedSourcesResult)
        assert result.manifest_version == "v0.1.0-test"
        assert result.total_sources == 3

    def test_indexed_source_has_chunk_count(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        manifest_file = _write_manifest(tmp_path)
        baselines_dir = tmp_path / "baselines"
        _write_baseline(baselines_dir)

        result = list_indexed_sources(
            client, manifest_file, baselines_dir, collection_name=COLLECTION
        )

        by_id = {s.source_id: s for s in result.sources}
        assert by_id["p0-core-md"].chunk_count == 3
        assert by_id["p1-core-md"].chunk_count == 1

    def test_enabled_with_chunks_is_indexed(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        manifest_file = _write_manifest(tmp_path)
        baselines_dir = tmp_path / "baselines"
        _write_baseline(baselines_dir)

        result = list_indexed_sources(
            client, manifest_file, baselines_dir, collection_name=COLLECTION
        )

        by_id = {s.source_id: s for s in result.sources}
        assert by_id["p0-core-md"].status == "indexed"
        assert by_id["p1-core-md"].status == "indexed"

    def test_disabled_source_status(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        manifest_file = _write_manifest(tmp_path)
        baselines_dir = tmp_path / "baselines"

        result = list_indexed_sources(
            client, manifest_file, baselines_dir, collection_name=COLLECTION
        )

        by_id = {s.source_id: s for s in result.sources}
        assert by_id["raw-input-buffer"].status == "disabled"
        assert by_id["raw-input-buffer"].chunk_count == 0

    def test_last_refreshed_at_from_baseline(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        manifest_file = _write_manifest(tmp_path)
        baselines_dir = tmp_path / "baselines"
        _write_baseline(baselines_dir)

        result = list_indexed_sources(
            client, manifest_file, baselines_dir, collection_name=COLLECTION
        )

        by_id = {s.source_id: s for s in result.sources}
        assert by_id["p0-core-md"].last_refreshed_at == "2026-04-12T01:00:00+00:00"
        assert by_id["raw-input-buffer"].last_refreshed_at == ""

    def test_no_baseline_dir(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        manifest_file = _write_manifest(tmp_path)
        missing_baselines = tmp_path / "no-such-dir"

        result = list_indexed_sources(
            client, manifest_file, missing_baselines, collection_name=COLLECTION
        )

        assert result.total_sources == 3
        by_id = {s.source_id: s for s in result.sources}
        assert by_id["p0-core-md"].last_refreshed_at == ""

    def test_missing_manifest(self, tmp_path: Path):
        client = chromadb.PersistentClient(path=str(tmp_path / "chroma"))
        missing = tmp_path / "nonexistent.json"
        baselines = tmp_path / "baselines"

        result = list_indexed_sources(
            client, missing, baselines, collection_name=COLLECTION
        )

        assert result.manifest_version == "unknown"
        assert result.total_sources == 0

    def test_empty_collection(self, tmp_path: Path):
        client = chromadb.PersistentClient(path=str(tmp_path / "empty-chroma"))
        manifest_file = _write_manifest(tmp_path)
        baselines_dir = tmp_path / "baselines"

        result = list_indexed_sources(
            client, manifest_file, baselines_dir, collection_name="empty_col"
        )

        assert result.total_sources == 3
        for s in result.sources:
            if s.phase1_mode == "enabled":
                assert s.status == "pending"
            else:
                assert s.status == "disabled"

    def test_source_fields(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        manifest_file = _write_manifest(tmp_path)
        baselines_dir = tmp_path / "baselines"
        _write_baseline(baselines_dir)

        result = list_indexed_sources(
            client, manifest_file, baselines_dir, collection_name=COLLECTION
        )

        src = result.sources[0]
        assert isinstance(src, SourceInfo)
        assert src.authority_layer == "L1"
        assert src.classification == "C1-Direct-Allow"
        assert src.wing != ""
        assert src.refresh_policy != ""
        assert src.retrieval_weight > 0

    def test_to_dict(self, tmp_path: Path):
        client = _seed_collection(tmp_path)
        manifest_file = _write_manifest(tmp_path)
        baselines_dir = tmp_path / "baselines"
        _write_baseline(baselines_dir)

        result = list_indexed_sources(
            client, manifest_file, baselines_dir, collection_name=COLLECTION
        )
        d = result.to_dict()

        assert "manifest_version" in d
        assert "total_sources" in d
        assert "sources" in d
        assert isinstance(d["sources"], list)
        if d["sources"]:
            s = d["sources"][0]
            assert "source_id" in s
            assert "authority_layer" in s
            assert "status" in s
            assert "chunk_count" in s
            assert "last_refreshed_at" in s

    def test_picks_latest_baseline(self, tmp_path: Path):
        """多个 baseline 文件时选用排序最后的（最新的）。"""
        client = _seed_collection(tmp_path)
        manifest_file = _write_manifest(tmp_path)
        baselines_dir = tmp_path / "baselines"
        _write_baseline(baselines_dir, run_id="run-001")
        _write_baseline(baselines_dir, run_id="run-002")

        result = list_indexed_sources(
            client, manifest_file, baselines_dir, collection_name=COLLECTION
        )

        by_id = {s.source_id: s for s in result.sources}
        assert by_id["p0-core-md"].last_refreshed_at != ""
