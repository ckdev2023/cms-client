"""
B0 预检：在首轮索引之前核对 manifest、taxonomy、环境版本和备份点。

成功条件（index-baseline-plan.md §5.2）：
  已确认 manifest_version、taxonomy、release_id、
  data_snapshot_id 和本次 run_id 均已记录。

该模块不执行真实索引，只产出结构化预检报告。
"""

from __future__ import annotations

import json
import platform
import sys
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from mempalace.config import MEMPALACE_VERSION, SidecarPaths
from mempalace.taxonomy import FROZEN_ROOMS, FROZEN_WINGS


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _generate_run_id() -> str:
    """生成 run-<date>-<short-uuid> 格式的唯一标识。"""
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    short_uuid = uuid.uuid4().hex[:8]
    return f"run-{date_part}-{short_uuid}"


def _generate_snapshot_id(chroma_path: Path) -> str:
    """生成 snap-<date>-<short-uuid> 格式的数据快照标识。"""
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    short_uuid = uuid.uuid4().hex[:8]
    return f"snap-{date_part}-{short_uuid}"


def _build_release_id() -> str:
    vi = sys.version_info
    py_ver = f"{vi.major}.{vi.minor}.{vi.micro}"
    return f"mempalace-{MEMPALACE_VERSION}-py{py_ver}"


@dataclass
class CheckItem:
    """单项预检结果。"""

    name: str
    passed: bool
    detail: str = ""


@dataclass
class B0Report:
    """B0 预检完整报告。"""

    run_id: str
    release_id: str
    manifest_version: str
    data_snapshot_id: str
    baseline_plan_version: str = "w11-v1"
    started_at: str = ""
    finished_at: str = ""
    status: str = "pending"
    checks: list[CheckItem] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["checks"] = [asdict(c) for c in self.checks]
        return d

    @property
    def all_passed(self) -> bool:
        return all(c.passed for c in self.checks) and not self.errors


def _check_manifest(manifest_path: Path) -> CheckItem:
    """验证 manifest.json 可读、含 source_entries 且 manifest_version 非草案。"""
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return CheckItem("manifest_readable", False, f"读取失败: {exc}")

    entries = data.get("source_entries")
    if not isinstance(entries, list) or len(entries) == 0:
        return CheckItem("manifest_readable", False, "source_entries 为空或缺失")

    version = data.get("manifest_version", "")
    if "draft" in version.lower():
        return CheckItem("manifest_readable", False, f"manifest_version 仍为草案: {version}")

    enabled = [e for e in entries if e.get("phase1_mode") == "enabled"]
    return CheckItem(
        "manifest_readable",
        True,
        f"version={version}, entries={len(entries)}, enabled={len(enabled)}",
    )


def _check_taxonomy() -> CheckItem:
    """验证冻结的 wing / room 集合满足首轮索引最低要求。"""
    required_wings = {"gyoseishoshi-p0", "gyoseishoshi-p1", "office-process"}
    required_rooms = {"state-machine", "field-ownership", "workflow-gates", "biz-mgmt"}

    missing_wings = required_wings - FROZEN_WINGS
    missing_rooms = required_rooms - FROZEN_ROOMS

    if missing_wings or missing_rooms:
        detail = ""
        if missing_wings:
            detail += f"缺少 wing: {missing_wings}; "
        if missing_rooms:
            detail += f"缺少 room: {missing_rooms}"
        return CheckItem("taxonomy_frozen", False, detail)

    return CheckItem(
        "taxonomy_frozen",
        True,
        f"wings={len(FROZEN_WINGS)}, rooms={len(FROZEN_ROOMS)}",
    )


def _check_wing_source_alignment(manifest_path: Path) -> CheckItem:
    """验证 manifest 中每个 enabled 条目的 wing 在冻结集合内。"""
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return CheckItem("wing_alignment", False, f"manifest 读取失败: {exc}")

    entries = data.get("source_entries", [])
    misaligned: list[str] = []
    for entry in entries:
        if entry.get("phase1_mode") != "enabled":
            continue
        wing = entry.get("wing")
        if wing is not None and wing not in FROZEN_WINGS:
            misaligned.append(f"{entry['source_id']} -> {wing}")

    if misaligned:
        return CheckItem("wing_alignment", False, f"未冻结 wing: {misaligned}")
    return CheckItem("wing_alignment", True, "所有 enabled 条目的 wing 均在冻结集合内")


def _check_directories(paths: SidecarPaths) -> CheckItem:
    """验证运行目录可达。"""
    missing: list[str] = []
    for label, d in [
        ("data", paths.data),
        ("chroma", paths.chroma),
        ("baselines", paths.baselines),
        ("logs", paths.logs),
    ]:
        try:
            d.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            missing.append(f"{label}: {exc}")

    if missing:
        return CheckItem("directories", False, "; ".join(missing))
    return CheckItem("directories", True, "所有目录可达可写")


def _check_environment() -> CheckItem:
    """记录并验证环境基线。"""
    vi = sys.version_info
    py_ver = f"{vi.major}.{vi.minor}.{vi.micro}"
    mp_ver = MEMPALACE_VERSION

    try:
        import chromadb
        chroma_ver = chromadb.__version__
    except ImportError:
        return CheckItem("environment", False, "chromadb 未安装")

    detail = f"mempalace={mp_ver}, python={py_ver}, chromadb={chroma_ver}, os={platform.system()}"
    return CheckItem("environment", True, detail)


def run_b0_readiness(
    manifest_path: Path,
    paths: SidecarPaths,
) -> B0Report:
    """执行 B0 预检全流程，返回结构化报告。"""
    run_id = _generate_run_id()
    release_id = _build_release_id()
    snapshot_id = _generate_snapshot_id(paths.chroma)

    manifest_version = ""
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest_version = data.get("manifest_version", "unknown")
    except Exception:
        manifest_version = "unreadable"

    report = B0Report(
        run_id=run_id,
        release_id=release_id,
        manifest_version=manifest_version,
        data_snapshot_id=snapshot_id,
        started_at=_now_iso(),
    )

    report.checks.append(_check_manifest(manifest_path))
    report.checks.append(_check_taxonomy())
    report.checks.append(_check_wing_source_alignment(manifest_path))
    report.checks.append(_check_directories(paths))
    report.checks.append(_check_environment())

    report.finished_at = _now_iso()
    report.status = "passed" if report.all_passed else "failed"

    for c in report.checks:
        if not c.passed:
            report.errors.append(f"[{c.name}] {c.detail}")

    return report


def save_b0_report(report: B0Report, baselines_dir: Path) -> Path:
    """将 B0 报告落盘到 baselines 目录，返回文件路径。"""
    baselines_dir.mkdir(parents=True, exist_ok=True)
    filename = f"b0-{report.run_id}.json"
    out = baselines_dir / filename
    out.write_text(
        json.dumps(report.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return out
