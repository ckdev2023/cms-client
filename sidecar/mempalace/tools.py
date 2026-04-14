"""
MCP 检索工具 — mcp-readonly-scope.md §3 中的四个检索/回链子集。

search_knowledge     : 语义检索，返回 source_path / source_layer / snippet
get_document         : 按 source_path 读取完整文档或指定 section
get_citation_context : 按 chunk_id 读取前后相邻 chunk 构成引用上下文
list_indexed_sources : 查看已索引来源根、来源层级、最后刷新时间、状态

`route_query` / `ground_query` / `prepare_grounded_answer` 定义在 grounding.py。
所有工具只访问已建索引的 Chroma collection，不直接读取仓库文件。
"""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import chromadb

from mempalace.config import CHROMA_COLLECTION


# ---------------------------------------------------------------------------
# 公共返回结构
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SearchHit:
    """search_knowledge 单条命中。"""

    source_path: str
    source_layer: str
    snippet: str
    chunk_id: str
    title: str
    section_heading: str
    wing: str
    room: str
    score: float
    source_id: str = ""
    classification: str = ""
    retrieval_weight: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SearchResult:
    """search_knowledge 完整返回。"""

    query: str
    hits: list[SearchHit] = field(default_factory=list)
    total: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "query": self.query,
            "total": self.total,
            "hits": [h.to_dict() for h in self.hits],
        }


@dataclass(frozen=True)
class DocumentChunk:
    """get_document 返回的单个 chunk。"""

    chunk_id: str
    source_path: str
    source_layer: str
    title: str
    section_heading: str
    text: str
    chunk_index: int
    total_chunks: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DocumentResult:
    """get_document 完整返回。"""

    source_path: str
    chunks: list[DocumentChunk] = field(default_factory=list)
    total_chunks: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_path": self.source_path,
            "total_chunks": self.total_chunks,
            "chunks": [c.to_dict() for c in self.chunks],
        }


@dataclass
class CitationContext:
    """get_citation_context 完整返回。"""

    anchor_chunk_id: str
    source_path: str
    chunks: list[DocumentChunk] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "anchor_chunk_id": self.anchor_chunk_id,
            "source_path": self.source_path,
            "chunks": [c.to_dict() for c in self.chunks],
        }


# ---------------------------------------------------------------------------
# search_knowledge
# ---------------------------------------------------------------------------

def search_knowledge(
    client: chromadb.ClientAPI,
    query: str,
    *,
    n_results: int = 5,
    wing_filter: str | None = None,
    room_filter: str | None = None,
    collection_name: str = CHROMA_COLLECTION,
) -> SearchResult:
    """
    在已索引集合中执行语义检索。

    返回结果必须包含 source_path、source_layer（authority_layer）、snippet，
    满足 mcp-readonly-scope.md §3.2 第 3 条。
    """
    collection = client.get_or_create_collection(name=collection_name)

    where: dict[str, Any] | None = None
    if wing_filter and room_filter:
        where = {
            "$and": [
                {"wing": {"$eq": wing_filter}},
                {"room": {"$eq": room_filter}},
            ]
        }
    elif wing_filter:
        where = {"wing": {"$eq": wing_filter}}
    elif room_filter:
        where = {"room": {"$eq": room_filter}}

    kwargs: dict[str, Any] = {
        "query_texts": [query],
        "n_results": min(n_results, collection.count() or 1),
        "include": ["documents", "metadatas", "distances"],
    }
    if where is not None:
        kwargs["where"] = where

    if collection.count() == 0:
        return SearchResult(query=query, total=0)

    results = collection.query(**kwargs)

    hits: list[SearchHit] = []
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    ids = results.get("ids", [[]])[0]

    for doc, meta, dist, cid in zip(documents, metadatas, distances, ids):
        hits.append(
            SearchHit(
                source_path=meta.get("source_path", ""),
                source_layer=meta.get("authority_layer", ""),
                snippet=doc[:500] if doc else "",
                chunk_id=cid,
                title=meta.get("title", ""),
                section_heading=meta.get("section_heading", ""),
                wing=meta.get("wing", ""),
                room=meta.get("room", ""),
                score=max(0.0, 1.0 - dist) if dist is not None else 0.0,
                source_id=meta.get("source_id", ""),
                classification=meta.get("classification", ""),
                retrieval_weight=float(meta.get("retrieval_weight", 0.0) or 0.0),
            )
        )

    return SearchResult(query=query, hits=hits, total=len(hits))


# ---------------------------------------------------------------------------
# get_document
# ---------------------------------------------------------------------------

def get_document(
    client: chromadb.ClientAPI,
    source_path: str,
    *,
    section: str | None = None,
    collection_name: str = CHROMA_COLLECTION,
) -> DocumentResult:
    """
    按 source_path 定位文档的所有 chunk，可选按 section_heading 过滤。

    满足 mcp-readonly-scope.md §3.1 get_document 定义：
    "按已知 source_id / document_id 读取单个文档正文或指定 section"。
    """
    collection = client.get_or_create_collection(name=collection_name)

    where: dict[str, Any] = {"source_path": {"$eq": source_path}}
    if section:
        where = {
            "$and": [
                {"source_path": {"$eq": source_path}},
                {"section_heading": {"$eq": section}},
            ]
        }

    results = collection.get(
        where=where,
        include=["documents", "metadatas"],
    )

    chunks: list[DocumentChunk] = []
    ids = results.get("ids", [])
    documents = results.get("documents", [])
    metadatas = results.get("metadatas", [])

    raw: list[tuple[int, DocumentChunk]] = []
    for cid, doc, meta in zip(ids, documents, metadatas):
        raw.append((
            int(meta.get("chunk_index", 0)),
            DocumentChunk(
                chunk_id=cid,
                source_path=meta.get("source_path", ""),
                source_layer=meta.get("authority_layer", ""),
                title=meta.get("title", ""),
                section_heading=meta.get("section_heading", ""),
                text=doc or "",
                chunk_index=int(meta.get("chunk_index", 0)),
                total_chunks=int(meta.get("total_chunks", 0)),
            ),
        ))

    raw.sort(key=lambda t: t[0])
    chunks = [dc for _, dc in raw]

    return DocumentResult(
        source_path=source_path,
        chunks=chunks,
        total_chunks=len(chunks),
    )


# ---------------------------------------------------------------------------
# get_citation_context
# ---------------------------------------------------------------------------

def get_citation_context(
    client: chromadb.ClientAPI,
    chunk_id: str,
    *,
    context_window: int = 1,
    collection_name: str = CHROMA_COLLECTION,
) -> CitationContext:
    """
    按 chunk_id 读取锚点 chunk 及前后 context_window 个相邻 chunk。

    满足 mcp-readonly-scope.md §3.1 get_citation_context 定义：
    "读取某条命中前后相邻段落或 chunk，帮助客户端展示上下文"。
    """
    collection = client.get_or_create_collection(name=collection_name)

    anchor_result = collection.get(
        ids=[chunk_id],
        include=["documents", "metadatas"],
    )

    if not anchor_result["ids"]:
        return CitationContext(anchor_chunk_id=chunk_id, source_path="")

    anchor_meta = anchor_result["metadatas"][0]
    source_path = anchor_meta.get("source_path", "")
    anchor_index = int(anchor_meta.get("chunk_index", 0))

    doc_result = collection.get(
        where={"source_path": {"$eq": source_path}},
        include=["documents", "metadatas"],
    )

    lo = max(0, anchor_index - context_window)
    hi = anchor_index + context_window

    raw: list[tuple[int, DocumentChunk]] = []
    for cid, doc, meta in zip(
        doc_result["ids"], doc_result["documents"], doc_result["metadatas"]
    ):
        idx = int(meta.get("chunk_index", 0))
        if lo <= idx <= hi:
            raw.append((
                idx,
                DocumentChunk(
                    chunk_id=cid,
                    source_path=meta.get("source_path", ""),
                    source_layer=meta.get("authority_layer", ""),
                    title=meta.get("title", ""),
                    section_heading=meta.get("section_heading", ""),
                    text=doc or "",
                    chunk_index=idx,
                    total_chunks=int(meta.get("total_chunks", 0)),
                ),
            ))

    raw.sort(key=lambda t: t[0])
    chunks = [dc for _, dc in raw]

    return CitationContext(
        anchor_chunk_id=chunk_id,
        source_path=source_path,
        chunks=chunks,
    )


# ---------------------------------------------------------------------------
# list_indexed_sources
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SourceInfo:
    """单条已索引来源的摘要信息。"""

    source_id: str
    authority_layer: str
    classification: str
    phase1_mode: str
    include_globs: list[str]
    wing: str
    refresh_policy: str
    retrieval_weight: float
    chunk_count: int
    last_refreshed_at: str
    status: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class IndexedSourcesResult:
    """list_indexed_sources 完整返回。"""

    manifest_version: str
    total_sources: int = 0
    sources: list[SourceInfo] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "manifest_version": self.manifest_version,
            "total_sources": self.total_sources,
            "sources": [s.to_dict() for s in self.sources],
        }


def _find_latest_baseline(baselines_dir: Path) -> dict[str, Any] | None:
    """在 baselines 目录中找到最新的 baseline JSON 并返回其内容。"""
    if not baselines_dir.is_dir():
        return None

    candidates = sorted(baselines_dir.glob("baseline-*.json"), reverse=True)
    if not candidates:
        return None

    return json.loads(candidates[0].read_text(encoding="utf-8"))


def _count_chunks_per_source(
    client: chromadb.ClientAPI,
    collection_name: str,
) -> dict[str, int]:
    """统计 collection 中每个 source_id 的 chunk 数量。"""
    collection = client.get_or_create_collection(name=collection_name)
    if collection.count() == 0:
        return {}

    results = collection.get(include=["metadatas"])
    counter: Counter[str] = Counter()
    for meta in results.get("metadatas", []):
        sid = meta.get("source_id", "")
        if sid:
            counter[sid] += 1
    return dict(counter)


def list_indexed_sources(
    client: chromadb.ClientAPI,
    manifest_path: Path,
    baselines_dir: Path,
    *,
    collection_name: str = CHROMA_COLLECTION,
) -> IndexedSourcesResult:
    """
    查看已纳入索引的来源白名单、最后刷新时间与状态。

    满足 mcp-readonly-scope.md §3.1 list_indexed_sources 定义：
    "查看当前已纳入索引的来源根、来源层级、最后刷新时间、状态"。
    便于客户端自检只读范围是否符合 W01/W02/W03。
    """
    if not manifest_path.is_file():
        return IndexedSourcesResult(manifest_version="unknown")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest_version = manifest.get("manifest_version", "unknown")
    entries = manifest.get("source_entries", [])

    baseline = _find_latest_baseline(baselines_dir)
    baseline_finished = baseline.get("finished_at", "") if baseline else ""

    chunk_counts = _count_chunks_per_source(client, collection_name)

    sources: list[SourceInfo] = []
    for entry in entries:
        sid = entry["source_id"]
        mode = entry.get("phase1_mode", "disabled_reserved")
        chunks = chunk_counts.get(sid, 0)

        if mode == "enabled" and chunks > 0:
            status = "indexed"
        elif mode == "enabled" and chunks == 0:
            status = "pending"
        else:
            status = "disabled"

        sources.append(
            SourceInfo(
                source_id=sid,
                authority_layer=entry.get("authority_layer", ""),
                classification=entry.get("classification", ""),
                phase1_mode=mode,
                include_globs=entry.get("include_globs", []),
                wing=entry.get("wing") or "",
                refresh_policy=entry.get("refresh_policy", ""),
                retrieval_weight=entry.get("retrieval_weight", 0.0),
                chunk_count=chunks,
                last_refreshed_at=baseline_finished if chunks > 0 else "",
                status=status,
            )
        )

    return IndexedSourcesResult(
        manifest_version=manifest_version,
        total_sources=len(sources),
        sources=sources,
    )
