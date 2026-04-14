"""
按 manifest 白名单枚举 L1 文档的采集器。

核心逻辑：
1. 读取 manifest.json
2. 只保留 phase1_mode=enabled 的 source_entries
3. 按 include_globs 在 repo_root 下枚举文件
4. 按 include_ext 过滤后缀
5. 按 exclude_globs 排除
6. 按 global_exclude_rules 做全局黑名单过滤
"""

from __future__ import annotations

import fnmatch
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

from mempalace.config import SidecarConfig


@dataclass(frozen=True)
class SourceEntry:
    """manifest.json 中单条 source_entry 的精简映射。"""

    source_id: str
    phase1_mode: str
    authority_layer: str
    classification: str
    include_globs: list[str]
    include_ext: list[str]
    exclude_globs: list[str]
    retrieval_weight: float
    usage_rule: str
    wing: str | None

    @property
    def enabled(self) -> bool:
        return self.phase1_mode == "enabled"


@dataclass(frozen=True)
class EnumeratedFile:
    """一个通过白名单的候选文件。"""

    path: Path
    relative: str
    source_id: str
    authority_layer: str
    classification: str
    retrieval_weight: float
    wing: str | None


@dataclass
class EnumerationResult:
    """枚举结果汇总。"""

    files: list[EnumeratedFile] = field(default_factory=list)
    skipped_by_ext: int = 0
    skipped_by_exclude: int = 0
    skipped_by_global: int = 0
    skipped_disabled: int = 0


_GLOBAL_EXCLUDE_EXTS: frozenset[str] = frozenset(
    {
        ".xlsx", ".xls", ".docx", ".pdf",
        ".png", ".jpg", ".jpeg", ".gif", ".webp",
        ".zip", ".7z", ".tar", ".gz",
        ".csv", ".sql", ".dump", ".bak", ".log", ".jsonl",
    }
)


def load_manifest(manifest_path: Path) -> dict:
    """加载并返回 manifest.json 内容。"""
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def parse_source_entries(manifest: dict) -> list[SourceEntry]:
    """将 manifest JSON 转换为 SourceEntry 列表。"""
    return [
        SourceEntry(
            source_id=e["source_id"],
            phase1_mode=e["phase1_mode"],
            authority_layer=e["authority_layer"],
            classification=e["classification"],
            include_globs=e["include_globs"],
            include_ext=e["include_ext"],
            exclude_globs=e.get("exclude_globs", []),
            retrieval_weight=e["retrieval_weight"],
            usage_rule=e["usage_rule"],
            wing=e.get("wing"),
        )
        for e in manifest["source_entries"]
    ]


def _match_glob(rel_path: str, pattern: str) -> bool:
    """支持 ** 通配符的路径匹配。"""
    from pathlib import PurePosixPath

    return PurePosixPath(rel_path).match(pattern)


def _is_globally_excluded(rel_path: str) -> bool:
    """全局后缀黑名单检查。"""
    suffix = Path(rel_path).suffix.lower()
    return suffix in _GLOBAL_EXCLUDE_EXTS


def _enumerate_by_glob(repo_root: Path, pattern: str) -> Iterator[Path]:
    """用 pathlib.glob 展开 include_globs 中的单条模式。"""
    try:
        yield from sorted(repo_root.glob(pattern))
    except (OSError, ValueError):
        return


def enumerate_sources(
    cfg: SidecarConfig | None = None,
) -> EnumerationResult:
    """按 manifest 白名单枚举所有 phase1 enabled 的 L1 文档。"""
    cfg = cfg or SidecarConfig()
    manifest = load_manifest(cfg.manifest_path)
    entries = parse_source_entries(manifest)
    result = EnumerationResult()
    seen: set[str] = set()

    for entry in entries:
        if not entry.enabled:
            result.skipped_disabled += 1
            continue

        for pattern in entry.include_globs:
            for abs_path in _enumerate_by_glob(cfg.repo_root, pattern):
                if not abs_path.is_file():
                    continue

                rel = str(abs_path.relative_to(cfg.repo_root))
                if rel in seen:
                    continue

                if _is_globally_excluded(rel):
                    result.skipped_by_global += 1
                    seen.add(rel)
                    continue

                suffix = abs_path.suffix.lower()
                if suffix not in entry.include_ext:
                    result.skipped_by_ext += 1
                    seen.add(rel)
                    continue

                excluded = any(
                    _match_glob(rel, ex) for ex in entry.exclude_globs
                )
                if excluded:
                    result.skipped_by_exclude += 1
                    seen.add(rel)
                    continue

                seen.add(rel)
                result.files.append(
                    EnumeratedFile(
                        path=abs_path,
                        relative=rel,
                        source_id=entry.source_id,
                        authority_layer=entry.authority_layer,
                        classification=entry.classification,
                        retrieval_weight=entry.retrieval_weight,
                        wing=entry.wing,
                    )
                )

    return result
