#!/usr/bin/env python3
import json
from collections import defaultdict
from pathlib import Path


def load_results():
    results = []
    for path in sorted(Path("artifacts").glob("*.result.json")):
        results.append(json.loads(path.read_text()))
    return results


def main() -> int:
    results = load_results()
    overlap = defaultdict(list)
    status_map = defaultdict(list)

    for item in results:
        status_map[item.get("status", "unknown")].append(item.get("task_id", "unknown"))
        for path in item.get("changed_files", []):
            overlap[path].append(item.get("task_id", "unknown"))

    lines = ["# 汇总合并评审", "", "## 1. 总体状态"]
    for status, task_ids in sorted(status_map.items()):
        lines.append(f"- {status}: {', '.join(task_ids)}")

    lines.extend(["", "## 2. 文件重叠与冲突风险"])
    found = False
    for path, task_ids in sorted(overlap.items()):
        if len(task_ids) > 1:
            lines.append(f"- {path}: {', '.join(task_ids)}")
            found = True
    if not found:
        lines.append("- 未发现结果工件中声明的重叠文件")

    lines.extend([
        "",
        "## 3. 建议",
        "- 检查 failed 或 blocked 任务",
        "- 对重叠文件做人工冲突审查",
        "- 运行全量 lint / typecheck / test / build",
    ])

    Path("review").mkdir(exist_ok=True)
    Path("review/merge-plan.md").write_text("\n".join(lines))
    print("wrote review/merge-plan.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
